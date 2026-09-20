<template>
  <div class="preview-wrapper" ref="wrapperRef">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { PageConfig, Card } from '../api'
import { pageRenderRegistry } from '../api'

const props = defineProps<{
  pages: PageConfig[]
  cards: Card[]
  showGap?: boolean
}>()

const canvasRef = ref<HTMLCanvasElement>()
const wrapperRef = ref<HTMLDivElement>()

// ---------- 离屏缓冲：原生分辨率场景只在 pages/cards 变化时重绘一次 ----------
let buffer: HTMLCanvasElement | null = null
// 渐进降采样 mipmap 链（构建缓冲时预计算，缩放时直接选用最接近的一级）
let mipChain: HTMLCanvasElement[] = []
// 各页预渲染 canvas（与 props.pages 同序），供截取图块/砖块画板取材
let pageCanvases: HTMLCanvasElement[] = []

// ---------- 绘制单个页面（不包含偏移） ----------
function drawPage(ctx: CanvasRenderingContext2D, pageIndex: number) {
  const pg = props.pages[pageIndex]
  if (!pg) return
  ctx.clearRect(0, 0, pg.width, pg.height)
  ctx.fillStyle = pg.background || '#ffffff'
  ctx.fillRect(0, 0, pg.width, pg.height)

  // 整页绘制项（drawFullPage 添加的内容，覆盖整个页面区域含边距）
  if (pg.pageItems && pg.pageItems.length > 0) {
    for (const item of pg.pageItems) {
      if (item && typeof (item as any).draw === 'function') {
        ctx.save()
        ;(item as any).draw(ctx, pg.width, pg.height)
        ctx.restore()
      }
    }
  }

  const pageCards = props.cards.filter(c => c.pageIndex === pageIndex)
  for (const card of pageCards) {
    // 卡片背景
    if (card.backgroundColor) {
      ctx.fillStyle = card.backgroundColor
      ctx.beginPath()
      ctx.roundRect(card.x, card.y, card.width, card.height, card.borderRadius || 0)
      ctx.fill()
    }
    if (card.borderWidth && card.borderWidth > 0) {
      ctx.strokeStyle = card.borderColor || '#000'
      ctx.lineWidth = card.borderWidth
      ctx.beginPath()
      ctx.roundRect(card.x, card.y, card.width, card.height, card.borderRadius || 0)
      ctx.stroke()
    }
    // 绘制子项
    for (const item of card.items) {
      if (typeof (item as any).draw === 'function') {
        ctx.save()
        ctx.translate(card.x, card.y)
        ;(item as any).draw(ctx, card.width, card.height)
        ctx.restore()
      }
    }
  }
}

// ---------- 第零步：预渲染所有页面（后台页优先），填充注册表 ----------
// 截取图块/砖块画板通过 pageRenderRegistry 引用其他页面的已渲染内容。
// 后台页总在前台页之前（getPages 已保证），故按数组顺序预渲染即可让前台引用后台。
function preRenderAll() {
  pageRenderRegistry.clear()
  pageCanvases = []
  if (props.pages.length === 0) return

  for (let i = 0; i < props.pages.length; i++) {
    const pg = props.pages[i]
    const canvas = document.createElement('canvas')
    canvas.width = pg.width
    canvas.height = pg.height
    const ctx = canvas.getContext('2d')!
    drawPage(ctx, i)
    pageCanvases.push(canvas)
    // 注册本页（供 SpriteClipItem / TileBoardItem 取材）
    pageRenderRegistry.set({
      canvas,
      cards: props.cards.filter(c => c.pageIndex === i),
      pageConfig: pg,
      pageIndex: i,
    })
  }
}

// ---------- 第一步：构建原生分辨率离屏缓冲（重，仅内容变化时执行） ----------
// 仅合成前台页面（后台页不参与预览/导出/打印）。
function buildBuffer() {
  // 先预渲染所有页面（填充注册表，供截取图块取材）
  preRenderAll()

  const frontPages: number[] = []
  for (let i = 0; i < props.pages.length; i++) {
    if (!props.pages[i].isBackground) frontPages.push(i)
  }

  if (frontPages.length === 0) {
    buffer = null
    mipChain = []
    return
  }

  const gap = props.showGap ? 20 : 0
  const pageWidth = props.pages[frontPages[0]].width
  const totalHeight = frontPages.reduce((sum, i) => sum + props.pages[i].height + gap, 0) - (gap > 0 ? gap : 0)

  if (!buffer) buffer = document.createElement('canvas')
  const buf: HTMLCanvasElement = buffer
  buf.width = pageWidth
  buf.height = totalHeight

  const bctx = buf.getContext('2d')!
  bctx.clearRect(0, 0, pageWidth, totalHeight)

  let yOffset = 0
  for (const i of frontPages) {
    const src = pageCanvases[i]
    bctx.drawImage(src, 0, yOffset)
    yOffset += props.pages[i].height + gap
  }

  // 预计算渐进降采样 mipmap 链
  mipChain = [buf]
  let cw = pageWidth
  let ch = totalHeight
  let src: HTMLCanvasElement = buf
  while (cw > 200) {
    const nw = Math.max(1, Math.round(cw * 0.5))
    const nh = Math.max(1, Math.round(ch * 0.5))
    const mip = document.createElement('canvas')
    mip.width = nw
    mip.height = nh
    const mctx = mip.getContext('2d')!
    mctx.imageSmoothingEnabled = true
    mctx.imageSmoothingQuality = 'high'
    mctx.drawImage(src, 0, 0, nw, nh)
    mipChain.push(mip)
    src = mip
    cw = nw
    ch = nh
  }
}

// ---------- 第二步：缓冲 → 显示画布（轻，缩放时执行） ----------
function blitScaled(dstCtx: CanvasRenderingContext2D, dw: number, dh: number) {
  dstCtx.imageSmoothingEnabled = true
  dstCtx.imageSmoothingQuality = 'high'

  if (!buffer) return

  if (dw >= buffer.width) {
    dstCtx.drawImage(buffer, 0, 0, dw, dh)
    return
  }

  let src = mipChain[mipChain.length - 1]
  for (let i = 0; i < mipChain.length; i++) {
    if (mipChain[i].width * 0.5 < dw) {
      src = mipChain[i]
      break
    }
  }
  dstCtx.drawImage(src, 0, 0, dw, dh)
}

function renderDisplay() {
  const canvas = canvasRef.value
  const wrapper = wrapperRef.value
  if (!canvas || !wrapper) return

  if (!buffer || props.pages.length === 0) {
    canvas.width = 0
    canvas.height = 0
    return
  }

  const pageWidth = props.pages[0].width
  const totalHeight = buffer.height
  const containerWidth = wrapper.clientWidth || pageWidth

  const cssW = containerWidth
  const cssH = (totalHeight * containerWidth) / pageWidth

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`

  const ctx = canvas.getContext('2d')!
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  blitScaled(ctx, canvas.width, canvas.height)
}

let rafPending = false
function scheduleDisplay() {
  if (rafPending) return
  rafPending = true
  requestAnimationFrame(() => {
    rafPending = false
    renderDisplay()
  })
}

function rebuild() {
  buildBuffer()
  renderDisplay()
}

// ---------- 导出前台页面为 DataURL（原生分辨率；后台页不导出） ----------
function getPageDataURLs(): string[] {
  // 确保注册表已填充（导出前可能未触发 rebuild）
  if (pageCanvases.length !== props.pages.length) buildBuffer()
  const urls: string[] = []
  for (let i = 0; i < props.pages.length; i++) {
    if (props.pages[i].isBackground) continue
    const canvas = pageCanvases[i]
    if (!canvas) continue
    try {
      urls.push(canvas.toDataURL('image/png'))
    } catch {
      // 被本地图片污染时跳过（由调用方走浏览器内部通道）
    }
  }
  return urls
}

// ---------- 导出为原生分辨率 canvas（不经过 toDataURL；后台页不导出） ----------
function getPageCanvases(targetDoc: Document = document): HTMLCanvasElement[] {
  if (pageCanvases.length !== props.pages.length) buildBuffer()
  const canvases: HTMLCanvasElement[] = []
  for (let i = 0; i < props.pages.length; i++) {
    if (props.pages[i].isBackground) continue
    const src = pageCanvases[i]
    if (!src) continue
    // 复制到目标文档（导出窗口），避免污染主文档注册表
    const canvas = targetDoc.createElement('canvas')
    canvas.width = src.width
    canvas.height = src.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(src, 0, 0)
    canvases.push(canvas)
  }
  return canvases
}

// ---------- 监听变化 ----------
watch(() => [props.pages, props.cards, props.showGap], rebuild, { deep: true })

const resizeObserver = new ResizeObserver(() => {
  scheduleDisplay()
})

onMounted(() => {
  rebuild()
  if (wrapperRef.value) {
    resizeObserver.observe(wrapperRef.value)
  }
  window.addEventListener('image-loaded', rebuild)
})

// ---------- 对外暴露 ----------
defineExpose({
  getDataURL: () => {
    return buffer ? buffer.toDataURL('image/png') : ''
  },
  getPageDataURLs,
  getPageCanvases,
})
</script>

<style scoped>
.preview-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  background: #f0f0f0;
}
.preview-wrapper canvas {
  display: block;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: none;
}
</style>
