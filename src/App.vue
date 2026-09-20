<template>
  <div class="app">
    <div class="header">
      <div class="header-left">
        <button @click="runScript">▶ 运行脚本 <span class="shortcut-hint">Shift+Enter</span></button>
        <label class="auto-render-toggle" title="开启后，参数面板内容变动时自动重新渲染">
          <input type="checkbox" v-model="autoRender" />
          <span>自动渲染</span>
        </label>
      </div>
    </div>
    <div class="main" ref="mainRef">
      <!-- 左侧面板：选项卡切换 -->
      <div class="editor-pane" ref="editorPane">
        <div class="tabs">
          <button class="tab" :class="{ active: activeTab === 'params' }" @click="activeTab = 'params'">参数面板</button>
          <button class="tab" :class="{ active: activeTab === 'code' }" @click="activeTab = 'code'">代码编辑</button>
        </div>
        <div class="tab-content">
          <div v-show="activeTab === 'code'" class="editor-tab">
            <!-- 代码选项卡工具栏 -->
            <div class="code-tabs-bar">
              <div class="code-tabs">
                <span
                  v-for="(tab, idx) in codeTabs"
                  :key="idx"
                  class="code-tab"
                  :class="{ active: activeCodeTab === idx, main: idx === 0, 'drag-over': dragOverIdx === idx }"
                  :draggable="idx > 0"
                  @click="activeCodeTab = idx"
                  @dblclick="idx > 0 && startRenameCodeTab(idx)"
                  @dragstart="onCodeTabDragStart(idx, $event)"
                  @dragover.prevent="onCodeTabDragOver(idx, $event)"
                  @dragleave="dragOverIdx = -1"
                  @drop="onCodeTabDrop(idx, $event)"
                  @dragend="dragOverIdx = -1"
                >
                  <span v-if="renamingCodeIdx !== idx" class="tab-name">{{ tab.name }}</span>
                  <input
                    v-else
                    class="tab-rename-input"
                    :value="tab.name"
                    @keydown.enter="commitRenameCodeTab"
                    @keydown.esc="cancelRenameCodeTab"
                    @blur="commitRenameCodeTab"
                    ref="renameInputRef"
                  />
                  <button
                    v-if="idx > 0"
                    class="tab-close"
                    title="删除选项卡"
                    @click.stop="removeCodeTab(idx)"
                  >×</button>
                </span>
                <button class="tab-add" title="新建代码选项卡" @click="addCodeTab">+</button>
              </div>
              <div class="code-tabs-hint">拖拽排序 · main 固定不可移动 · 双击重命名</div>
            </div>
            <Editor :model-value="script" language="javascript" @update:model-value="updateActiveCode" />
          </div>
          <div v-show="activeTab === 'params'" class="params-tab">
            <ParameterPanel @reset="runScript" />
          </div>
        </div>
        <div class="status">{{ status }}</div>
      </div>

      <!-- 拖拽分隔线 -->
      <div class="divider" @mousedown="startDrag"></div>

      <!-- 预览面板 -->
      <div class="preview-pane" ref="previewPane">
        <Preview ref="previewRef" :pages="pages" :cards="cards" :show-gap="true" />
      </div>
    </div>
    <div class="actions">
      <button @click="downloadPNG">⬇️ 下载 PNG</button>
      <button @click="exportAllPages">📦 导出全部图片</button>
      <button @click="print">🖨️ 打印</button>
      <button @click="exportHTML">🌐 导出 HTML</button>  <!-- 新增按钮 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import Editor from './components/Editor.vue'
import Preview from './components/Preview.vue'
import ParameterPanel from './components/ParameterPanel.vue'
import { Workspace, TextItem, RectItem, ImageItem, ContainerItem, RelativeContainerItem, WaterfallItem, SvgItem, BoardItem, GridContainerItem, SpriteClipItem, TileBoardItem, waitForImages } from './api'
import type { PageConfig, Card, ReadOnlyPageInfo } from './api'
import { UIManager, RowLayout, ColumnLayout, LabelUI, EditBoxUI, TextAreaUI, DropdownUI, NumberEditUI, ColorPickerUI, SwitchUI, CheckboxUI, PathPickerUI, FilePickerUI, FileWrapper, BoardDisplayUI, ListUI, TableUI, CodeEditorUI, ButtonUI, SliderUI } from './api/ui'
import loader from '@monaco-editor/loader'

/*
  说明：
  - 默认代码占位符：__(这里要去除,用于防识别)DEFAULT_CODE_PLACEHOLDER__
  - 保存模板占位符：__(这里要去除,用于防识别)SAVE_TEMPLATE_PLACEHOLDER__
  - 用户数据占位符：__(这里要去除,用于防识别)USER_DATA_PLACEHOLDER__
  - 用户脚本和用户数据(UI输入)会被 base64 编码后替换到保存模板中
*/

const PLACEHOLDERS = {
  DEFAULT_CODE: ['__', 'DEFAULT_CODE_PLACEHOLDER__'].join(''),
  SAVE_TEMPLATE: ['__', 'SAVE_TEMPLATE_PLACEHOLDER__'].join(''),
  USER_DATA: ['__', 'USER_DATA_PLACEHOLDER__'].join(''),
};

let user_script_base64 = "__DEFAULT_CODE_PLACEHOLDER__";
if(user_script_base64 === PLACEHOLDERS.DEFAULT_CODE){
  user_script_base64 = "";
}
// 注意：user_script_base64 可能是多段 base64 以 \n 拼接的新格式，
// 不能提前整体 atob（会把源码的 \n 当成段分隔符），交给 parseCodeTabs 按段解码

// 用户数据（UI 输入）：从保存文件中恢复
let user_data_base64 = "__USER_DATA_PLACEHOLDER__";
if (user_data_base64 === PLACEHOLDERS.USER_DATA) {
  user_data_base64 = "";
}
let user_data = user_data_base64 ? decodeURIComponent(escape(atob(user_data_base64))) : "";


// ===================== 代码选项卡 =====================
// 存储格式（以 \n 分割多段 base64）：
//   第1段: main 代码内容的 base64
//   第2段: 第2个选项卡名称的 base64
//   第3段: 第2个选项卡内容的 base64
//   第4段: 第3个选项卡名称的 base64
//   ...以此类推
// 兼容老代码：仅一段时即为 main 代码
interface CodeTab { name: string; content: string }
const DEFAULT_MAIN_NAME = 'main'

function decodeB64(s: string): string {
  if (!s) return ''
  try { return decodeURIComponent(escape(atob(s))) } catch { return '' }
}
function encodeB64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
}

/** 从存储字符串解析代码选项卡 */
function parseCodeTabs(stored: string): CodeTab[] {
  if (!stored) return [{ name: DEFAULT_MAIN_NAME, content: '' }]
  // 新格式：多段 base64 以 \n 分隔
  // 老格式：单段 base64（不含 \n）直接作为 main 代码
  const parts = stored.split('\n')
  const tabs: CodeTab[] = [{ name: DEFAULT_MAIN_NAME, content: decodeB64(parts[0]) }]
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const name = decodeB64(parts[i]) || `tab${Math.floor(i / 2) + 1}`
    const content = decodeB64(parts[i + 1])
    tabs.push({ name, content })
  }
  return tabs
}

/** 序列化代码选项卡为存储字符串 */
function serializeCodeTabs(tabs: CodeTab[]): string {
  if (!tabs.length) return ''
  const parts = [encodeB64(tabs[0].content)]
  for (let i = 1; i < tabs.length; i++) {
    parts.push(encodeB64(tabs[i].name))
    parts.push(encodeB64(tabs[i].content))
  }
  return parts.join('\n')
}

const codeTabs = ref<CodeTab[]>(parseCodeTabs(user_script_base64))
const activeCodeTab = ref(0)

const script = computed(() => codeTabs.value[activeCodeTab.value]?.content ?? '')
// 双向：编辑器修改时写回当前选项卡
function updateActiveCode(val: string) {
  if (codeTabs.value[activeCodeTab.value]) {
    codeTabs.value[activeCodeTab.value].content = val
  }
}

const status = ref('就绪')
const pages = ref<PageConfig[]>([])
const cards = ref<Card[]>([])
const previewRef = ref<InstanceType<typeof Preview>>()
const mainRef = ref<HTMLDivElement>()
const editorPane = ref<HTMLDivElement>()
const previewPane = ref<HTMLDivElement>()
const activeTab = ref<'code' | 'params'>('code')

// ===================== 代码选项卡管理 =====================
const renamingCodeIdx = ref<number | null>(null)
const renameInputRef = ref<HTMLInputElement>()
const dragOverIdx = ref<number>(-1)
let dragSrcIdx = -1

function addCodeTab() {
  let i = 1
  while (codeTabs.value.some(t => t.name === `tab${i}`)) i++
  codeTabs.value.push({ name: `tab${i}`, content: '' })
  activeCodeTab.value = codeTabs.value.length - 1
}

function removeCodeTab(idx: number) {
  if (idx <= 0 || idx >= codeTabs.value.length) return
  codeTabs.value.splice(idx, 1)
  if (activeCodeTab.value >= codeTabs.value.length) {
    activeCodeTab.value = codeTabs.value.length - 1
  }
}

function startRenameCodeTab(idx: number) {
  if (idx <= 0) return
  renamingCodeIdx.value = idx
  nextTick(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  })
}

function commitRenameCodeTab(e: Event) {
  const idx = renamingCodeIdx.value
  if (idx == null) return
  const newName = (e.target as HTMLInputElement).value.trim()
  if (newName && !codeTabs.value.some((t, i) => i !== idx && t.name === newName)) {
    codeTabs.value[idx].name = newName
  }
  renamingCodeIdx.value = null
}

function cancelRenameCodeTab() {
  renamingCodeIdx.value = null
}

/** 根据名称获取代码选项卡内容（供 include 接口使用） */
function getCodeTabContent(name: string): string {
  const t = codeTabs.value.find(t => t.name === name)
  return t ? t.content : ''
}

// 代码选项卡拖拽排序（main 即 index 0 固定不动）
function onCodeTabDragStart(idx: number, e: DragEvent) {
  if (idx <= 0) return
  dragSrcIdx = idx
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', String(idx))
}
function onCodeTabDragOver(idx: number, e: DragEvent) {
  if (idx <= 0) return // main 不可作为放置目标
  e.dataTransfer!.dropEffect = 'move'
  dragOverIdx.value = idx
}
function onCodeTabDrop(idx: number, e: DragEvent) {
  e.preventDefault()
  const src = dragSrcIdx
  dragSrcIdx = -1
  dragOverIdx.value = -1
  if (src <= 0 || idx <= 0 || src === idx) return
  const tabs = codeTabs.value
  const [moved] = tabs.splice(src, 1)
  tabs.splice(idx, 0, moved)
  // 保持当前激活选项卡指向同一内容
  activeCodeTab.value = tabs.indexOf(moved)
}

// 文件选择和画板渲染的事件处理
let filePickerMap: Map<string, FilePickerUI> = new Map()
let boardDisplayMap: Map<string, BoardDisplayUI> = new Map()

// ---- 自动渲染 ----
const autoRender = ref(false)
let isRunningScript = false
let autoRenderTimer: number | null = null
let suppressAutoUntil = 0  // runScript 结束后的短暂抑制窗口，防止布局重建引发的连锁触发

/**
 * 深度监听 UI 持久化值：任何控件值变动（开关/数值/颜色/下拉/文本等）都触发
 */
watch(
  () => UIManager.store,
  () => {
    if (!autoRender.value || isRunningScript) return
    if (Date.now() < suppressAutoUntil) return
    if (autoRenderTimer != null) clearTimeout(autoRenderTimer)
    autoRenderTimer = window.setTimeout(() => {
      autoRenderTimer = null
      runAuto()
    }, 400)  // 防抖：连续调节只触发一次渲染
  },
  { deep: true }
)

/** 自动渲染：保留焦点后重跑脚本 */
function runAuto() {
  // 记录当前焦点控件（用户可能正在输入/调节）
  const active = document.activeElement as HTMLElement | null
  const wrapper = active?.closest('[data-ui-id]') as HTMLElement | null
  const focusId = wrapper?.getAttribute('data-ui-id') ?? null
  const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
  const selStart = isInput ? (active as HTMLInputElement).selectionStart : null

  runScript()

  // 恢复焦点到同 ID 的新控件（布局树重建后 DOM 已更换）
  nextTick(() => {
    if (!focusId) return
    const w = document.querySelector(`[data-ui-id="${focusId}"]`)
    const target = w?.querySelector('input, textarea, select') as HTMLElement | null
    if (target) {
      target.focus()
      if (selStart != null && target instanceof HTMLInputElement && (target.type === 'text' || target.type === '')) {
        try { target.setSelectionRange(selStart, selStart) } catch { /* 非文本输入忽略 */ }
      }
    }
  })
}

// ---- 拖拽逻辑 ----
let isDragging = false
let startX = 0
let startLeftWidth = 0

function startDrag(e: MouseEvent) {
  isDragging = true
  startX = e.clientX
  if (mainRef.value) {
    const rect = mainRef.value.getBoundingClientRect()
    startLeftWidth = editorPane.value?.getBoundingClientRect().width || rect.width / 2
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!isDragging || !mainRef.value) return
  const delta = e.clientX - startX
  const mainWidth = mainRef.value.getBoundingClientRect().width
  let newLeftWidth = startLeftWidth + delta
  // 限制最小宽度 200px
  if (newLeftWidth < 200) newLeftWidth = 200
  if (newLeftWidth > mainWidth - 200) newLeftWidth = mainWidth - 200
  if (editorPane.value && previewPane.value) {
    editorPane.value.style.flex = `0 0 ${newLeftWidth}px`
    previewPane.value.style.flex = '1'
  }
}

function stopDrag() {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 窗口大小变化时重置 flex（可选）
onMounted(() => {
  // 默认各占一半
  if (editorPane.value && previewPane.value) {
    const mainWidth = mainRef.value?.getBoundingClientRect().width || window.innerWidth
    editorPane.value.style.flex = `0 0 ${mainWidth / 2}px`
    previewPane.value.style.flex = '1'
  }

  // ---- 全局快捷键 ----
  window.addEventListener('keydown', onGlobalKeydown, true)

  // ---- 文件选择事件 ----
  window.addEventListener('ui-file-selected', onFileSelected)
  // ---- 画板渲染事件 ----
  window.addEventListener('ui-board-render', onBoardRender)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown, true)
  window.removeEventListener('ui-file-selected', onFileSelected)
  window.removeEventListener('ui-board-render', onBoardRender)
})

function onGlobalKeydown(e: KeyboardEvent) {
  // Ctrl/Cmd+S → 导出 HTML
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault()
    e.stopPropagation()
    exportHTML()
  }
  // Shift+Enter → 运行脚本
  if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    runScript()
  }
}

function onFileSelected(e: Event) {
  const detail = (e as CustomEvent).detail
  const picker = filePickerMap.get(detail.id)
  if (picker) {
    ;(picker as any)._setFile(detail.file)
  }
}

function onBoardRender(e: Event) {
  const detail = (e as CustomEvent).detail
  const display = boardDisplayMap.get(detail.id)
  if (display) {
    ;(display as any)._renderToCanvas(detail.canvas)
  }
}
// ---- 脚本执行 ----

/** 解析长度值：数字为像素，字符串支持百分比（如 "50%"）或纯数字文本 */
function resolveLength(v: number | string | undefined | null, total: number): number {
  if (v === undefined || v === null) return 0
  if (typeof v === 'number') return v
  const s = String(v).trim()
  if (s.endsWith('%')) {
    const pct = parseFloat(s)
    return isNaN(pct) ? 0 : (pct / 100) * total
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

/**
 * 将主代码内容注入 Monaco 作为全局 extra lib，
 * 使 CodeEditorUI（代码编辑框）能提示主代码中定义的顶层 function/var。
 */
let mainCodeHintUri: any = null
async function injectMainCodeHints(mainCode: string) {
  try {
    const monaco = await loader.init()
    if (mainCodeHintUri) {
      monaco.languages.typescript.javascriptDefaults.removeExtraLib(mainCodeHintUri)
    }
    mainCodeHintUri = monaco.languages.typescript.javascriptDefaults.addExtraLib(
      mainCode,
      'ts:user-main-code.js'
    )
  } catch (e) {
    // Monaco 未就绪时忽略，不影响功能
  }
}

function runScript() {
  isRunningScript = true
  status.value = '执行中...'
  // 保存运行前激活的 UI 选项卡，运行后恢复
  let savedUiTab = 0
  try {
    // 暴露全局类 - 绘制项
    (window as any).TextItem = TextItem;
    (window as any).RectItem = RectItem;
    (window as any).ImageItem = ImageItem;
    (window as any).ContainerItem = ContainerItem;
    (window as any).RelativeContainerItem = RelativeContainerItem;
    (window as any).WaterfallItem = WaterfallItem;
    (window as any).SvgItem = SvgItem;
    (window as any).BoardItem = BoardItem;
    (window as any).GridContainerItem = GridContainerItem;
    (window as any).SpriteClipItem = SpriteClipItem;
    (window as any).TileBoardItem = TileBoardItem;

    // 暴露全局类 - UI 系统
    ;(window as any).UIManager = UIManager
    ;(window as any).RowLayout = RowLayout
    ;(window as any).ColumnLayout = ColumnLayout
    ;(window as any).LabelUI = LabelUI
    ;(window as any).EditBoxUI = EditBoxUI
    ;(window as any).TextAreaUI = TextAreaUI
    ;(window as any).CodeEditorUI = CodeEditorUI
    ;(window as any).ButtonUI = ButtonUI
    ;(window as any).SliderUI = SliderUI
    ;(window as any).DropdownUI = DropdownUI
    ;(window as any).NumberEditUI = NumberEditUI
    ;(window as any).ColorPickerUI = ColorPickerUI
    ;(window as any).SwitchUI = SwitchUI
    ;(window as any).CheckboxUI = CheckboxUI
    ;(window as any).PathPickerUI = PathPickerUI
    ;(window as any).FilePickerUI = FilePickerUI
    ;(window as any).FileWrapper = FileWrapper
    ;(window as any).BoardDisplayUI = BoardDisplayUI
    ;(window as any).ListUI = ListUI
    ;(window as any).TableUI = TableUI

    // 跨代码选项卡引用接口
    // include(name): 执行指定代码选项卡的内容（其 function/var 声明进入全局作用域，可供主代码调用）
    // getCode(name): 返回指定代码选项卡的原始文本内容
    ;(window as any).include = (name: string) => {
      const code = getCodeTabContent(name)
      if (!code) throw new Error(`include: 代码选项卡 "${name}" 不存在或为空`)
      // 间接 eval 在全局作用域执行，使被引入代码的 function/var 成为全局成员
      ;(0, eval)(code)
    }
    ;(window as any).getCode = (name: string) => getCodeTabContent(name)

    // 清空文件/画板映射（每次运行重建）
    filePickerMap = new Map()
    boardDisplayMap = new Map()

    // 拦截 FilePickerUI / BoardDisplayUI 的创建，注册到映射表
    // 通过包装构造函数实现
    const OrigFilePickerUI = FilePickerUI
    const OrigBoardDisplayUI = BoardDisplayUI
    ;(window as any).FilePickerUI = function() {
      const args = arguments as any
      const instance = new OrigFilePickerUI(args[0], args[1])
      filePickerMap.set(args[0], instance)
      return instance
    }
    ;(window as any).FilePickerUI.prototype = OrigFilePickerUI.prototype
    ;(window as any).BoardDisplayUI = function() {
      const args = arguments as any
      const instance = new OrigBoardDisplayUI(args[0], args[1])
      boardDisplayMap.set(args[0], instance)
      return instance
    }
    ;(window as any).BoardDisplayUI.prototype = OrigBoardDisplayUI.prototype

    // 开始新的 UI 运行：清空布局树（保留值）
    savedUiTab = UIManager.activeUiTab.value
    UIManager.beginRun()

    // ===== 关键设计：用户脚本只执行一次 =====
    // 沙箱接收 init 及脚本中所有顶层函数，实现多绘制函数分发：
    // 页面通过 draw: '函数名' 属性指定该页卡牌的绘制函数，默认使用 main
    const mainCode = codeTabs.value[0]?.content ?? ''
    const sandbox: { init?: (ws: any) => void; fns: Record<string, Function> } = { fns: {} }
    // 扫描所有代码选项卡中的函数名（含通过 include 引入的绘制函数）
    const allCode = codeTabs.value.map(t => t.content).join('\n')
    const fnNames = [...new Set(
      Array.from(allCode.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g), m => m[1])
    )]
    const fnEval = new Function(
      'workspace', 'card', '__sandbox',
      `\n${mainCode}\n` +
      `if(typeof init === 'function') __sandbox.init = init;\n` +
      fnNames.map(n => `try { if (typeof ${n} === 'function') __sandbox.fns[${JSON.stringify(n)}] = ${n}; } catch(e) {}`).join('\n')
    )
    // 先传入 workspace 执行一次，让顶层代码（UI创建）仅运行一遍
    // 同时注册 init/main 到 sandbox
    const workspace = new Workspace()
    // 暴露 workspace 为全局，便于绘制函数中调用 workspace.run(...) 等
    ;(window as any).workspace = workspace
    // 全局便捷函数 run(code, context)：等价于 workspace.run(code, context)
    ;(window as any).run = (code: string, context: Record<string, any> = {}) => workspace.run(code, context)
    fnEval(workspace, undefined, sandbox)

    // 将主代码内容注入 Monaco 作为代码编辑框(CodeEditorUI)的智能提示来源
    // （主代码中定义的顶层 function/var 可在 CodeEditorUI 中获得补全提示）
    injectMainCodeHints(mainCode)

    // 执行 init
    if (typeof sandbox.init === 'function') {
      sandbox.init(workspace)
    }

    const pageConfigs = workspace.getPages()
    // 注意：pages.value 延迟到卡牌全部生成后再更新（与 cards.value 原子提交），
    // 避免脚本中途报错时出现"新页面 + 旧卡牌"的残留渲染

    const generatedCards: Card[] = []
    let currentId = 0       // 前台 id 计数器（可能被 resetId 重置）
    let currentBgId = 0     // 后台 id 计数器（与前台独立，可能被 resetBackgroundId 重置）

    // ----- 预扫描：收集每个 id 重置窗口内被自定义卡牌占用的 id -----
    // 自定义卡牌的指定 id 仅在两次重置之间生效（resetId/resetBackgroundId 划分窗口）
    // 窗口内所有页面（含后续页面）的指定 id 都会跳过
    const frontOccupied: Set<number>[] = [new Set()]
    const bgOccupied: Set<number>[] = [new Set()]
    {
      let fw = 0, bw = 0
      for (let i = 0; i < pageConfigs.length; i++) {
        const pg = pageConfigs[i]
        const meta = workspace.getPageMeta(i)
        const customs = pg.customCards ?? []
        if (meta.isBackground) {
          if (meta.bgIdResetBefore) { bw++; bgOccupied[bw] = new Set() }
          for (const cc of customs) if (cc.id !== null && cc.id !== undefined) bgOccupied[bw].add(cc.id)
        } else {
          if (meta.idResetBefore) { fw++; frontOccupied[fw] = new Set() }
          for (const cc of customs) if (cc.id !== null && cc.id !== undefined) frontOccupied[fw].add(cc.id)
        }
      }
    }
    let curFrontWin = 0  // 当前前台窗口索引
    let curBgWin = 0     // 当前后台窗口索引

    // id 分配：顺序取号，跳过被本窗口内自定义卡牌占用的 id
    const allocFrontId = (): number => {
      let id = currentId
      const occ = frontOccupied[curFrontWin]
      while (occ && occ.has(id)) id++
      currentId = id + 1
      return id
    }
    const allocBgId = (): number => {
      let id = currentBgId
      const occ = bgOccupied[curBgWin]
      while (occ && occ.has(id)) id++
      currentBgId = id + 1
      return id
    }

    for (let i = 0; i < pageConfigs.length; i++) {
      const pg = pageConfigs[i];
      const pageMeta = workspace.getPageMeta(i)
      const pIdx = pageMeta.pageIndex  // 使用 workspace 分配的页号
      const isBg = pageMeta.isBackground

      // id 重置：前台用 resetId，后台用 resetBackgroundId（两者独立）
      // 同时切换到对应的占用集合窗口
      if (isBg) {
        if (pageMeta.bgIdResetBefore) { currentBgId = 0; curBgWin++ }
      } else {
        if (pageMeta.idResetBefore) { currentId = 0; curFrontWin++ }
      }
      const availW = pg.width - pg.margin.left - pg.margin.right;
      const availH = pg.height - pg.margin.top - pg.margin.bottom;

      let cardW = pg.cardSize.width;
      let cardH = pg.cardSize.height;
      const autoSizeW = cardW === 0;
      const autoSizeH = cardH === 0;

      // ----- 1. 先确定列数和行数 -----
      let cols = pg.grid.cols;
      let rows = pg.grid.rows;

      if (cols === null || cols === undefined) {
        if (autoSizeW) {
          cols = 4;
        } else {
          cols = Math.floor(availW / cardW);
          if (cols < 1) cols = 1;
        }
      } else {
        cols = Math.max(1, cols);
      }

      if (rows === null || rows === undefined) {
        if (autoSizeH) {
          rows = 3;
        } else {
          rows = Math.floor(availH / cardH);
          if (rows < 1) rows = 1;
        }
      } else {
        rows = Math.max(1, rows);
      }

      // ----- 2. 计算间隙 -----
      const hGapEdges = pg.hGapEdges ?? false;
      const vGapEdges = pg.vGapEdges ?? false;

      let hGap = (pg.cardHGap !== undefined && pg.cardHGap !== null) ? pg.cardHGap : null;
      let vGap = (pg.cardVGap !== undefined && pg.cardVGap !== null) ? pg.cardVGap : null;

      if (hGap === null) {
        if (autoSizeW) {
          hGap = 0;
        } else {
          if (cols === 1) {
            hGap = 0;
          } else {
            const totalCardWidth = cardW * cols;
            const remaining = availW - totalCardWidth;
            if (hGapEdges) {
              hGap = remaining / (cols + 1);
            } else {
              hGap = remaining / (cols - 1);
            }
            if (hGap < 0) hGap = 0;
          }
        }
      }

      if (vGap === null) {
        if (autoSizeH) {
          vGap = 0;
        } else {
          if (rows === 1) {
            vGap = 0;
          } else {
            const totalCardHeight = cardH * rows;
            const remaining = availH - totalCardHeight;
            if (vGapEdges) {
              vGap = remaining / (rows + 1);
            } else {
              vGap = remaining / (rows - 1);
            }
            if (vGap < 0) vGap = 0;
          }
        }
      }

      // ----- 3. 如果卡片尺寸自动，重新计算 -----
      if (autoSizeW) {
        if (hGapEdges) {
          cardW = (availW - (cols + 1) * hGap) / cols;
        } else {
          cardW = (availW - (cols - 1) * hGap) / cols;
        }
        if (cardW < 1) cardW = 1;
      }
      if (autoSizeH) {
        if (vGapEdges) {
          cardH = (availH - (rows + 1) * vGap) / rows;
        } else {
          cardH = (availH - (rows - 1) * vGap) / rows;
        }
        if (cardH < 1) cardH = 1;
      }

      // ----- 4. 生成卡牌（修复：每页独立计算 cardCount） -----
      // 整个网格块（含边缘间隙时含两端间隙）在内容区中的实际尺寸
      const gridW = cols * cardW + (cols - 1) * hGap + (hGapEdges ? 2 * hGap : 0)
      const gridH = rows * cardH + (rows - 1) * vGap + (vGapEdges ? 2 * vGap : 0)
      // 内容区剩余空间：网格块未填满时按对齐方式分配
      const leftoverW = Math.max(0, availW - gridW)
      const leftoverH = Math.max(0, availH - gridH)
      const alignX = pg.alignX ?? 'left'
      const alignY = pg.alignY ?? 'top'
      const offsetX = alignX === 'right' ? leftoverW : (alignX === 'center' ? leftoverW / 2 : 0)
      const offsetY = alignY === 'bottom' ? leftoverH : (alignY === 'middle' ? leftoverH / 2 : 0)

      const startX = pg.margin.left + offsetX + (hGapEdges ? hGap : 0);
      const startY = pg.margin.top + offsetY + (vGapEdges ? vGap : 0);
      
      const cardCountLimit = pg.cardCount !== null && pg.cardCount !== undefined ? pg.cardCount : Infinity;
      
      // 计算该页实际要生成的卡牌数量（最多为 cols * rows）
      const maxCardsPerPage = cols * rows;
      const cardsToGenerate = Math.min(cardCountLimit, maxCardsPerPage);

      // ----- 创建只读页面信息（含计算后的实际值、tags 和解析后的 draw） -----
      const hDirection = pg.hDirection ?? 'ltr';
      const vDirection = pg.vDirection ?? 'ttb';
      const cardOrder = pg.cardOrder ?? 'row-first';
      const pageInfo: ReadOnlyPageInfo = Object.freeze({
        width: pg.width,
        height: pg.height,
        margin: Object.freeze({ ...pg.margin }),
        cardSize: Object.freeze({ width: cardW, height: cardH }),
        cardHGap: hGap,
        cardVGap: vGap,
        grid: Object.freeze({ cols, rows }),
        background: pg.background,
        hGapEdges,
        vGapEdges,
        tags: Object.freeze({ ...(pg.tags || {}) }),
        cardCount: pg.cardCount,
        index: pIdx,
        draw: pg.draw || 'main',
        drawFullPage: pg.drawFullPage || '',
        indexName: pg.indexName || '',
        isBackground: isBg,
        hDirection,
        vDirection,
        cardOrder,
        alignX: alignX as 'left' | 'center' | 'right',
        alignY: alignY as 'top' | 'middle' | 'bottom',
        useGrid: pg.useGrid !== false,
      });

      // ----- 整页绘制函数 drawFullPage：对整个页面区域（含边距）绘制 -----
      // 签名为 (page, pageCtx)，pageCtx.addItem 添加的项在卡牌之前绘制，覆盖整页
      const fullDrawerName = pg.drawFullPage || ''
      const fullDrawer = fullDrawerName ? (sandbox.fns[fullDrawerName] ?? (window as any)[fullDrawerName] ?? null) : null
      if (typeof fullDrawer === 'function') {
        const pageCtx: { items: any[]; addItem(item: any): void } = {
          items: [],
          addItem(item: any) { this.items.push(item); },
        }
        fullDrawer(pageInfo, pageCtx)
        pg.pageItems = pageCtx.items
      } else {
        pg.pageItems = undefined
      }

      // ----- 该页绘制函数：由页面 draw 属性指定，默认 main；绘制函数签名为 (page, card) -----
      const drawerName = pg.draw || 'main'
      const drawer = sandbox.fns[drawerName] ?? (window as any)[drawerName] ?? sandbox.fns['main']

      // 卡牌工厂：创建卡牌对象并调用绘制函数（自定义卡牌与网格卡牌共用）
      const makeCard = (cardId: number, row: number, col: number, x: number, y: number, w: number, h: number): Card => {
        const cardObj: Card = {
          id: cardId,
          row,
          col,
          pageIndex: pIdx,
          x,
          y,
          width: w,
          height: h,
          pct_x: x / pg.width,
          pct_y: y / pg.height,
          items: [],
          addItem(item) { this.items.push(item); },
          hasTag(key: string) { return key in pageInfo.tags; },
          getTag(key: string, defaultValue?: string) { return key in pageInfo.tags ? pageInfo.tags[key] : defaultValue; },
          getTags() { return { ...pageInfo.tags }; },
        };
        // 调用该页的绘制函数：page 为页面对象（只读），card 为卡牌对象
        if (typeof drawer === 'function') {
          drawer(pageInfo, cardObj)
        }
        return cardObj;
      };

      const pageCards: Card[] = [];

      // ----- 1. 网格划分卡牌（useGrid=false 时跳过） -----
      if (pg.useGrid !== false) {
        // 构建卡牌位置的迭代顺序列表（决定 id 分配顺序）
        // row-first: 逐行填充 (0,0)→(0,1)→...→(1,0)→...
        // col-first: 逐列填充 (0,0)→(1,0)→...→(0,1)→...
        const positions: { r: number; c: number }[] = [];
        if (cardOrder === 'col-first') {
          for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              positions.push({ r, c });
            }
          }
        } else {
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              positions.push({ r, c });
            }
          }
        }

        for (let i = 0; i < positions.length; i++) {
          if (i >= cardsToGenerate) break;
          const { r, c } = positions[i];
          // 物理位置：hDirection/vDirection 决定 row=0/col=0 在哪一侧
          // 'rtl': col=0 在最右 → physicalCol = cols-1-c
          // 'btt': row=0 在最下 → physicalRow = rows-1-r
          const physicalCol = hDirection === 'rtl' ? (cols - 1 - c) : c;
          const physicalRow = vDirection === 'btt' ? (rows - 1 - r) : r;
          const x = startX + physicalCol * (cardW + hGap);
          const y = startY + physicalRow * (cardH + vGap);
          // 后台页使用独立 id 计数器，前台页使用前台 id 计数器（跳过被占用的 id）
          const cardId = isBg ? allocBgId() : allocFrontId();
          pageCards.push(makeCard(cardId, r, c, x, y, cardW, cardH));
        }
      }

      // ----- 2. 自定义卡牌（与网格独立，允许重叠；指定 id 直接使用，null 按添加顺序分配并跳过占用 id） -----
      const customs = pg.customCards ?? [];
      for (const cc of customs) {
        const x = resolveLength(cc.x, pg.width);
        const y = resolveLength(cc.y, pg.height);
        const w = resolveLength(cc.w, pg.width);
        const h = resolveLength(cc.h, pg.height);
        const hasSpecifiedId = cc.id !== null && cc.id !== undefined;
        const cardId = hasSpecifiedId ? (cc.id as number) : (isBg ? allocBgId() : allocFrontId());
        pageCards.push(makeCard(cardId, -1, -1, x, y, w, h));
      }

      // ----- 3. 按 id 顺序绘制（稳定排序：相同 id 保持加入顺序） -----
      pageCards.sort((a, b) => a.id - b.id);
      generatedCards.push(...pageCards);
    }

    // 更新 workspace 的 id 计数器为最终值（前台/后台各自）
    workspace.idCounter = currentId
    workspace.bgIdCounter = currentBgId

    // 原子提交：页面与卡牌同时更新，保证预览的一致性
    pages.value = pageConfigs
    cards.value = generatedCards
    status.value = `✅ 生成 ${generatedCards.length} 张卡牌`
  } catch (err: any) {
    status.value = `❌ 错误: ${err.message}`
    // 出错时清空预览，避免旧卡牌渲染到新页面上产生残留
    pages.value = []
    cards.value = []
    console.error(err)
  } finally {
    isRunningScript = false
    // 恢复运行前的 UI 选项卡（若代码运行后选项卡数量变化则夹取到有效范围）
    const maxIdx = UIManager.uiTabCount - 1
    UIManager.setActiveUiTab(Math.min(savedUiTab, maxIdx))
    // 短暂抑制窗口：脚本执行/布局重建可能触碰 store，避免自动渲染连锁自触发
    suppressAutoUntil = Date.now() + 100
  }
}

// ---- 下载/打印 ----

/**
 * 打开导出窗口：每页一张原生分辨率 canvas（与预览完全相同的绘制逻辑）。
 *
 * 浏览器安全策略只限制 JS 读取被本地图片污染的 canvas 像素（toDataURL/getImageData），
 * 不限制浏览器内部操作（打印、右键另存为）。本窗口正是利用这一点提供导出能力：
 *  - 右键各页画面 → 图片另存为（原生分辨率 PNG）
 *  - 打印 → 另存为 PDF
 * 纸张尺寸：优先使用页面 tags.printSize（如 '297mm 210mm'，可精确物理尺寸），
 * 否则按首页宽高比自动选择 A4 横向/纵向。
 */
function openExportWindow(mode: 'print' | 'export'): Window | null {
  const preview = previewRef.value
  const first = pages.value[0]
  if (!preview || !first) return null
  const tagSize = first.tags?.printSize
  const pageSize = tagSize && tagSize.trim()
    ? tagSize.trim()
    : (first.width >= first.height ? 'A4 landscape' : 'A4 portrait')
  const win = window.open('', '_blank')
  if (!win) {
    alert('请允许弹出窗口')
    return null
  }
  const doc = win.document
  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8" /><title>导出</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      @page { margin: 0; size: ${pageSize}; }
      body { background:#fff; padding:12px; }
      .hint { position:fixed; top:10px; right:14px; z-index:9; max-width:340px; font:13px/1.7 sans-serif; color:#333; background:rgba(255,255,255,.96); border:1px solid #ccc; border-radius:6px; padding:8px 12px; box-shadow:0 2px 8px rgba(0,0,0,.15); }
      .hint button { margin-top:6px; width:100%; padding:5px 10px; cursor:pointer; }
      /* 每页强制等于一个页面盒（打印时 100vh = 页面高度），canvas 等比 contain 适配。
         减 2px 安全余量：@page 毫米尺寸换算成 CSS px 是小数（如 A4 高 793.7px），
         100vh 取整后可能比页面盒高零点几像素，盒子自身溢出会产生空白页 */
      .page { width:100%; height:calc(100vh - 2px); display:flex; align-items:center; justify-content:center; overflow:hidden; page-break-after: always; break-after: page; }
      .page:last-child { page-break-after: auto; break-after: auto; }
      canvas { display:block; max-width:100%; max-height:100%; }
      @media print { body { padding:0; } .hint { display:none; } }
    </style>
    </head>
    <body>
      <div class="hint" id="hint"></div>
    </body>
    </html>
  `)
  doc.close()
  // 每页原生分辨率 canvas 直接绘制到导出窗口（不经过 toDataURL，不受污染限制）
  const canvases = preview.getPageCanvases(doc)
  for (const c of canvases) {
    const div = doc.createElement('div')
    div.className = 'page'
    div.appendChild(c)
    doc.body.appendChild(div)
  }
  const hint = doc.getElementById('hint')!
  if (mode === 'export') {
    hint.innerHTML = '浏览器安全策略禁止脚本读取本地图片像素，已改用浏览器通道导出：<br>① 右键各页画面 → 「图片另存为…」（原生分辨率 PNG）<br>② 或点击下方按钮打印 / 另存为 PDF'
    const btn = doc.createElement('button')
    btn.textContent = '🖨️ 打印 / 保存为 PDF'
    btn.onclick = () => { win.focus(); win.print() }
    hint.appendChild(btn)
  } else {
    hint.textContent = '如未自动弹出打印对话框，请按 Ctrl+P'
  }
  return win
}

async function downloadPNG() {
  await waitForImages()
  try {
    const dataUrl = previewRef.value?.getDataURL()
    if (dataUrl) {
      const link = document.createElement('a')
      link.download = 'card_back_pattern.png'
      link.href = dataUrl
      link.click()
    }
  } catch {
    // canvas 被本地/跨域图片污染，JS 无法读取像素 → 走浏览器内部通道导出
    openExportWindow('export')
    status.value = '⚠️ 已打开导出窗口：右键画面「图片另存为」或打印为 PDF'
  }
}

async function print() {
  await waitForImages()
  if (!pages.value.length) return
  const win = openExportWindow('print')
  if (!win) return
  // canvas 绘制是同步的，稍等布局稳定后触发浏览器打印（内部渲染不受污染限制）
  setTimeout(() => {
    win.focus()
    win.print()
  }, 300)
}

// ----- 导出全部页面 -----
async function exportAllPages() {
  await waitForImages()
  if (!pages.value.length) {
    status.value = '⚠️ 没有页面可导出'
    return
  }
  let urls: string[] | undefined
  try {
    urls = previewRef.value?.getPageDataURLs()
  } catch {
    // canvas 被本地/跨域图片污染，JS 无法读取像素 → 走浏览器内部通道导出
    openExportWindow('export')
    status.value = '⚠️ 已打开导出窗口：右键各页画面「图片另存为」或打印为 PDF'
    return
  }
  if (!urls || urls.length === 0) {
    status.value = '⚠️ 没有页面可导出'
    return
  }
  status.value = `⏳ 正在导出 ${urls.length} 张图片...`
  for (let i = 0; i < urls.length; i++) {
    const link = document.createElement('a')
    link.download = `page_${i+1}.png`
    link.href = urls[i]
    link.click()
    await new Promise(r => setTimeout(r, 100)) // 避免浏览器拦截
  }
  status.value = `✅ 已导出 ${urls.length} 张图片`
  setTimeout(() => status.value = '就绪', 2000)
}

function exportHTML() {
  
  const SAVE_TEMPLATE_PLACEHOLDER = "__SAVE_TEMPLATE_PLACEHOLDER__";
  // 序列化所有代码选项卡（新格式：main_b64\\nname_b64\\ncontent_b64...，兼容老格式单段）
  const scriptBase64 = serializeCodeTabs(codeTabs.value);
  // 序列化 UI 用户数据并 base64 编码
  const userDataJson = UIManager.serialize();
  const userDataBase64 = btoa(unescape(encodeURIComponent(userDataJson)));
  let template = decodeURIComponent(escape(atob(SAVE_TEMPLATE_PLACEHOLDER)));
  template = template.replace(PLACEHOLDERS.DEFAULT_CODE, scriptBase64);
  template = template.replace(PLACEHOLDERS.USER_DATA, userDataBase64);
  template = template.replace(PLACEHOLDERS.SAVE_TEMPLATE, SAVE_TEMPLATE_PLACEHOLDER);
  // 6. 下载
  const blob = new Blob([template], { type: 'text/html;charset=utf-8' });
  const link = document.createElement('a');
  link.download = 'index.html';
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
  status.value = '✅ 自保存 HTML 导出成功';
  setTimeout(() => status.value = '就绪', 2000);
}

// 页面加载：先恢复用户数据(UI输入)，再自动运行
if (user_data) {
  UIManager.deserialize(user_data)
}
runScript()
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  font-family: 'Segoe UI', 'PingFang SC', Roboto, sans-serif;
  background: #f0f2f5;
  color: #1a1a2e;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 0;
  box-shadow: none;
  border: none;
  max-width: none;
  margin: 0;
  padding: 0;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 12px 16px;
  background: #ffffff;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #2c3e50, #d4b87a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header button {
  padding: 6px 20px;
  background: #d4b87a;
  border: none;
  border-radius: 40px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  cursor: pointer;
  transition: all 0.2s;
}

.header button:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(212, 184, 122, 0.3);
}

.shortcut-hint {
  font-size: 11px;
  opacity: 0.6;
  margin-left: 4px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.auto-render-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  user-select: none;
}

.auto-render-toggle input {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: #d4b87a;
}

.auto-render-toggle input:checked + span {
  color: #1a1a2e;
  font-weight: 600;
}

/* 选项卡 */
.tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  flex-shrink: 0;
}

.tab {
  padding: 8px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  color: #333;
}

.tab.active {
  color: #d4b87a;
  border-bottom-color: #d4b87a;
  font-weight: 600;
}

.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-tab {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.code-tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.code-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.code-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  color: #999;
  background: #2d2d2d;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}

.code-tab:hover {
  background: #3a3a3a;
  color: #ccc;
}

.code-tab.active {
  background: #0e639c;
  color: #fff;
  border-color: #1177bb;
}

.code-tab.main {
  font-weight: 600;
}

.code-tab.drag-over {
  border-color: #4fc3f7;
  background: #1a4a6e;
}

.tab-name {
  white-space: nowrap;
}

.tab-rename-input {
  width: 80px;
  padding: 1px 4px;
  font-size: 12px;
  border: 1px solid #1177bb;
  border-radius: 3px;
  background: #1e1e1e;
  color: #fff;
  outline: none;
}

.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 14px;
  line-height: 1;
  color: #888;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  padding: 0;
}

.tab-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.tab-add {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #888;
  background: #2d2d2d;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  cursor: pointer;
}

.tab-add:hover {
  background: #0e639c;
  color: #fff;
  border-color: #1177bb;
}

.code-tabs-hint {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
}

.params-tab {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border-radius: 0 0 8px 8px;
}

.main {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
  gap: 0;
}

.editor-pane {
  display: flex;
  flex-direction: column;
  min-width: 200px;
  overflow: hidden;
}

.divider {
  width: 6px;
  background: #d0d0d0;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.2s;
  position: relative;
  z-index: 10;
}

.divider:hover,
.divider:active {
  background: #b0b0b0;
}

.preview-pane {
  flex: 1;
  overflow: auto;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  padding: 8px;
  min-width: 200px;
}

.status {
  margin-top: 6px;
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

.actions {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.actions button {
  padding: 8px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: #f0f0f0;
  color: #333;
  transition: all 0.2s;
}

.actions button:hover {
  background: #e6e6e6;
  transform: translateY(-2px);
}

.actions button:first-child {
  background: #d4b87a;
  color: #1a1a2e;
}

.actions button:last-child {
  background: #b8d9c0;
  color: #1a2e1a;
}

/* 打印样式：隐藏非必要元素，预览页无间距 */
@media print {

  body,
  #app,
  .app {
    background: #fff !important;
    padding: 0 !important;
    margin: 0 !important;
    height: auto !important;
    border: none !important;
    border-radius: 0 !important;
  }

  .header,
  .divider,
  .actions,
  .status,
  .tabs {
    display: none !important;
  }

  .main {
    display: block !important;
    height: auto !important;
  }

  .editor-pane {
    display: none !important;
  }

  .preview-pane {
    border: none !important;
    padding: 0 !important;
    background: #fff !important;
    overflow: visible !important;
  }
}
</style>