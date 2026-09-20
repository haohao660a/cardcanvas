// src/api/draw-items/TileBoardItem.ts
import { RelativeContainerItem } from './RelativeContainerItem';
import type { UnitMode } from './DrawItem';
import { pageRenderRegistry } from './PageRenderRegistry';

/**
 * 砖块画板：截取图块的网格版本（类似游戏引擎的 tile map）。
 *
 * 指定一个或多个页面作为素材页（不能指定具体卡牌——素材页的所有卡牌按 id 作为砖块素材，
 * 由页面卡牌划分决定单个素材的尺寸）。本组件将绘制区域划分为网格：
 *   - gridSize: 单个网格大小 {w,h}。null=自动（按网格数量填满容器）。
 *     支持像素与百分比（百分比相对本组件尺寸）。
 *   - gridCount: 网格数量 {r,c}。null=自动（按网格大小取不超出容器的最大数量）。
 *     超出 gridCount 范围的位置为透明（无网格）。
 *   - gap: 网格间距（像素）。
 *
 * API：
 *   setTile(x, y, id)        —— 把指定 id 的素材卡牌（拉伸）填入网格 (x,y)
 *   setRegion(x, y, r, c, ids) —— 用 id 列表填充从 (x,y) 起 r×c 的区域（id 列表循环复用）
 *
 * 继承 RelativeContainerItem，支持 scaleX/scaleY 负值镜像、缓存、滤镜、子项等。
 */
export class TileBoardItem extends RelativeContainerItem {
  type = 'tile-board';

  /** 素材页面引用列表（数字=下标；字符串=indexName） */
  pageRefs: (string | number)[];

  /** 单个网格大小（数字=像素；字符串'50%'=百分比相对组件；null=自动） */
  gridSize: { w: number | string | null; h: number | string | null };
  gridSizeWMode: UnitMode = 'pixel';
  gridSizeHMode: UnitMode = 'pixel';

  /** 网格数量 {r,c}；null=自动（按网格大小取最大数量） */
  gridCount: { r: number | null; c: number | null };

  /** 网格间距（像素） */
  gap: number;

  /** 已设置的砖块：key="gx,gy" → 素材卡牌 id */
  private tiles = new Map<string, number>();

  constructor(opts: {
    pageRefs: (string | number)[];
    gridSize?: { w: number | string | null; h: number | string | null };
    gridCount?: { r: number | null; c: number | null };
    gap?: number;
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    clip?: boolean;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    centerX?: number;
    centerY?: number;
    anchorX?: number | string;
    anchorY?: number | string;
    anchorXMode?: 'pixel' | 'percent';
    anchorYMode?: 'pixel' | 'percent';
    filter?: any;
  }) {
    super({
      backgroundColor: opts.backgroundColor,
      borderColor: opts.borderColor,
      borderWidth: opts.borderWidth,
      borderRadius: opts.borderRadius,
      clip: opts.clip,
      x: opts.x, y: opts.y, width: opts.width, height: opts.height,
      rotation: opts.rotation, scaleX: opts.scaleX, scaleY: opts.scaleY,
      centerX: opts.centerX, centerY: opts.centerY,
      anchorX: opts.anchorX, anchorY: opts.anchorY,
      anchorXMode: opts.anchorXMode, anchorYMode: opts.anchorYMode,
      filter: opts.filter,
    });
    this.pageRefs = opts.pageRefs ?? [];
    this.gridSize = opts.gridSize ?? { w: null, h: null };
    this.gridCount = opts.gridCount ?? { r: null, c: null };
    this.gap = opts.gap ?? 0;
    this._syncGridMode();
  }

  private _syncGridMode() {
    const w = this.gridSize.w;
    const h = this.gridSize.h;
    this.gridSizeWMode = (typeof w === 'string' && w.trim().endsWith('%')) ? 'percent' : 'pixel';
    this.gridSizeHMode = (typeof h === 'string' && h.trim().endsWith('%')) ? 'percent' : 'pixel';
  }

  /** 设置网格大小（数字=像素；字符串'50%'=百分比） */
  setGridSize(w: number | string | null, h: number | string | null) {
    this.gridSize = { w, h };
    this._syncGridMode();
    this.refreshCache();
    return this;
  }

  /** 设置网格数量 {r,c}（null=自动） */
  setGridCount(r: number | null, c: number | null) {
    this.gridCount = { r, c };
    this.refreshCache();
    return this;
  }

  /** 设置网格间距 */
  setGap(g: number) {
    this.gap = g;
    this.refreshCache();
    return this;
  }

  /** 在网格 (gx,gy) 放置素材卡牌（id），拉伸填满该网格 */
  setTile(gx: number, gy: number, id: number) {
    this.tiles.set(`${gx},${gy}`, id);
    this.refreshCache();
    return this;
  }

  /**
   * 用 id 列表填充从 (gx,gy) 起 r×c 的区域。
   * id 列表按行优先循环复用（列表用尽后从头开始）。
   * 列表中 -1 / null 表示清空该格。
   */
  setRegion(gx: number, gy: number, r: number, c: number, ids: (number | null)[]) {
    if (!ids || ids.length === 0) return this;
    let idx = 0;
    for (let dy = 0; dy < r; dy++) {
      for (let dx = 0; dx < c; dx++) {
        const id = ids[idx % ids.length];
        idx++;
        const key = `${gx + dx},${gy + dy}`;
        if (id === null || id === -1 || id === undefined) {
          this.tiles.delete(key);
        } else {
          this.tiles.set(key, id);
        }
      }
    }
    this.refreshCache();
    return this;
  }

  /** 清空所有砖块 */
  clearTiles() {
    this.tiles.clear();
    this.refreshCache();
    return this;
  }

  private _resolveVal(v: number | string | null, mode: UnitMode, parent: number, fallback: number): number {
    if (v === null || v === undefined) return fallback;
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.endsWith('%')) {
        const p = parseFloat(t) / 100;
        return isNaN(p) ? fallback : p * parent;
      }
      const n = parseFloat(t);
      return isNaN(n) ? fallback : n;
    }
    return mode === 'percent' ? v * parent : v;
  }

  protected _drawContent(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (w <= 0 || h <= 0) {
      super._drawContent(ctx, w, h);
      return;
    }
    const gap = this.gap;

    // 1. 解析网格数量 r,c（null=自动）
    let r = this.gridCount.r;
    let c = this.gridCount.c;

    // 2. 解析单个网格大小 cellW, cellH（null=自动填满）
    let cellW = this._resolveVal(this.gridSize.w, this.gridSizeWMode, w, 0);
    let cellH = this._resolveVal(this.gridSize.h, this.gridSizeHMode, h, 0);

    // 自动数量（按固定网格大小取不超出的最大数量）
    if (c === null) {
      if (cellW > 0) {
        c = Math.floor((w + gap) / (cellW + gap));
      } else {
        c = 1;
      }
      if (c < 1) c = 1;
    }
    if (r === null) {
      if (cellH > 0) {
        r = Math.floor((h + gap) / (cellH + gap));
      } else {
        r = 1;
      }
      if (r < 1) r = 1;
    }

    // 自动网格大小（填满容器）
    if (cellW <= 0) {
      cellW = (w - (c - 1) * gap) / c;
      if (cellW < 0) cellW = 0;
    }
    if (cellH <= 0) {
      cellH = (h - (r - 1) * gap) / r;
      if (cellH < 0) cellH = 0;
    }

    // 3. 绘制每个有砖块的网格
    for (const [key, id] of this.tiles) {
      const [gxStr, gyStr] = key.split(',');
      const gx = parseInt(gxStr, 10);
      const gy = parseInt(gyStr, 10);
      if (gx < 0 || gx >= c || gy < 0 || gy >= r) continue;
      const ref = pageRenderRegistry.findCardById(this.pageRefs, id);
      if (!ref) continue;
      const card = ref.card;
      const src = ref.info.canvas;
      const dx = gx * (cellW + gap);
      const dy = gy * (cellH + gap);
      // 截取整张卡牌区域，拉伸到网格
      try {
        ctx.drawImage(src, card.x, card.y, card.width, card.height, dx, dy, cellW, cellH);
      } catch { /* 污染 canvas 的 drawImage 不受限，兜底 */ }
    }

    // 4. 再绘制子项（覆盖在砖块之上）
    super._drawContent(ctx, w, h);
  }
}
