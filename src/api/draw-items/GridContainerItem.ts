// src/api/draw-items/GridContainerItem.ts
import { RelativeContainerItem } from './RelativeContainerItem';
import type { Color } from './DrawItem';
import type { DrawItem } from './DrawItem';

/** 单元格样式 */
export interface GridCellStyle {
  backgroundColor?: Color;
  borderColor?: Color;
  borderWidth?: number;
  borderRadius?: number;
  /** 单元格内边距 */
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
}

/** 列宽/行高规格：数字=权重(占剩余空间比例)；{px:N}=固定像素 */
export type GridSizeSpec = number | { px: number };

/** 合并区域 */
export interface GridMerge {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

interface CellChild {
  child: DrawItem;
  col: number;
  row: number;
}

interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_CELL_STYLE: Required<Omit<GridCellStyle, 'padding'>> & {
  padding: { top: number; bottom: number; left: number; right: number };
} = {
  backgroundColor: 'transparent',
  borderColor: '#000000',
  borderWidth: 0,
  borderRadius: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

/**
 * 表格容器：n×m 网格子容器，支持合并单元格、独立样式、行列宽高/间隔调节。
 *
 * 性能优化：不使用嵌套 RelativeContainerItem 实例（避免每格 ctx.save/restore + clip 开销），
 * 而是用数据模型描述单元格，在一次 draw 中批量绘制所有背景/边框，子项直接定位到单元格内绘制。
 */
export class GridContainerItem extends RelativeContainerItem {
  type = 'grid-container';

  rows: number;
  cols: number;
  colWidths: GridSizeSpec[];
  rowHeights: GridSizeSpec[];
  colGap: number;
  rowGap: number;
  padding: { top: number; bottom: number; left: number; right: number };

  /** 默认单元格样式 */
  cellStyle: GridCellStyle;
  /** 逐格样式覆盖 [row][col] */
  cellStyles: (GridCellStyle | null)[][] = [];

  /** 合并区域列表 */
  merges: GridMerge[] = [];

  /** 子项及其所在单元格 */
  private cellChildren: CellChild[] = [];

  constructor(opts: {
    rows: number;
    cols: number;
    colWidths?: GridSizeSpec[];
    rowHeights?: GridSizeSpec[];
    colGap?: number;
    rowGap?: number;
    padding?: { top?: number; bottom?: number; left?: number; right?: number };
    cellStyle?: GridCellStyle;
    cellStyles?: (GridCellStyle | null)[][];
    merges?: GridMerge[];
    // RelativeContainerItem 选项
    backgroundColor?: Color;
    borderColor?: Color;
    borderWidth?: number;
    borderRadius?: number;
    clip?: boolean;
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    centerX?: number;
    centerY?: number;
    anchorX?: number | string;
    anchorY?: number | string;
    anchorXMode?: 'pixel' | 'percent';
    anchorYMode?: 'pixel' | 'percent';
    filter?: import('./RelativeContainerItem').FilterOptions;
  }) {
    super(opts);
    this.rows = opts.rows;
    this.cols = opts.cols;
    this.colWidths = opts.colWidths ?? [];
    this.rowHeights = opts.rowHeights ?? [];
    this.colGap = opts.colGap ?? 0;
    this.rowGap = opts.rowGap ?? 0;
    this.padding = { top: 0, bottom: 0, left: 0, right: 0, ...opts.padding };
    this.cellStyle = opts.cellStyle ?? {};
    this.merges = opts.merges ? [...opts.merges] : [];

    if (opts.cellStyles) {
      this.cellStyles = opts.cellStyles.map(row => row.map(s => (s ? { ...s } : null)));
    } else {
      this.cellStyles = [];
      for (let r = 0; r < this.rows; r++) {
        const row: (GridCellStyle | null)[] = [];
        for (let c = 0; c < this.cols; c++) row.push(null);
        this.cellStyles.push(row);
      }
    }
  }

  /** 添加子项到指定单元格 (col, row) */
  addToCell(col: number, row: number, item: DrawItem): this {
    this.cellChildren.push({ child: item, col, row });
    return this;
  }

  /** 设置单个单元格样式 */
  setCellStyle(col: number, row: number, style: GridCellStyle): this {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      this.cellStyles[row][col] = { ...style };
    }
    return this;
  }

  /** 设置列宽 */
  setColWidth(col: number, width: GridSizeSpec): this {
    while (this.colWidths.length <= col) this.colWidths.push(1);
    this.colWidths[col] = width;
    return this;
  }

  /** 设置行高 */
  setRowHeight(row: number, height: GridSizeSpec): this {
    while (this.rowHeights.length <= row) this.rowHeights.push(1);
    this.rowHeights[row] = height;
    return this;
  }

  /** 合并单元格 */
  merge(col: number, row: number, colSpan: number, rowSpan: number): this {
    this.merges.push({ col, row, colSpan, rowSpan });
    return this;
  }

  /** 清空所有合并 */
  clearMerges(): this {
    this.merges = [];
    return this;
  }

  // ===================== 布局计算 =====================

  /** 解析尺寸规格数组为像素尺寸数组 */
  private resolveSizes(specs: GridSizeSpec[], total: number, gap: number, count: number): number[] {
    const sizes: number[] = new Array(count).fill(0);
    if (count === 0) return sizes;

    let fixedTotal = 0;
    let weightTotal = 0;
    const weights: number[] = [];

    for (let i = 0; i < count; i++) {
      const spec = i < specs.length ? specs[i] : 1;
      if (typeof spec === 'object' && spec !== null && 'px' in spec) {
        sizes[i] = spec.px;
        fixedTotal += spec.px;
        weights.push(0);
      } else {
        const w = typeof spec === 'number' ? spec : 1;
        weights.push(w);
        weightTotal += w;
      }
    }

    const gapTotal = gap * Math.max(0, count - 1);
    const remaining = Math.max(0, total - fixedTotal - gapTotal);

    if (weightTotal > 0) {
      for (let i = 0; i < count; i++) {
        if (weights[i] > 0) {
          sizes[i] = (remaining * weights[i]) / weightTotal;
        }
      }
    }
    return sizes;
  }

  /** 计算每个网格线位置（colX[0..cols], rowY[0..rows]） */
  private computeGrid(innerW: number, innerH: number): { colX: number[]; rowY: number[]; colW: number[]; rowH: number[] } {
    const colW = this.resolveSizes(this.colWidths, innerW, this.colGap, this.cols);
    const rowH = this.resolveSizes(this.rowHeights, innerH, this.rowGap, this.rows);

    const colX: number[] = [0];
    for (let i = 0; i < this.cols; i++) {
      colX.push(colX[i] + colW[i] + (i < this.cols - 1 ? this.colGap : 0));
    }
    const rowY: number[] = [0];
    for (let i = 0; i < this.rows; i++) {
      rowY.push(rowY[i] + rowH[i] + (i < this.rows - 1 ? this.rowGap : 0));
    }
    return { colX, rowY, colW, rowH };
  }

  /** 获取某单元格（或合并区域）的矩形 */
  private getCellRect(col: number, row: number, colX: number[], rowY: number[], colW: number[], rowH: number[]): CellRect {
    // 检查是否属于某个合并区域
    for (const m of this.merges) {
      if (col >= m.col && col < m.col + m.colSpan && row >= m.row && row < m.row + m.rowSpan) {
        const c0 = m.col;
        const r0 = m.row;
        const c1 = m.col + m.colSpan - 1;
        const r1 = m.row + m.rowSpan - 1;
        return {
          x: colX[c0],
          y: rowY[r0],
          w: colX[c1 + 1] - colX[c0] - (c1 >= this.cols - 1 ? 0 : 0),
          h: rowY[r1 + 1] - rowY[r0],
        };
      }
    }
    return { x: colX[col], y: rowY[row], w: colW[col], h: rowH[row] };
  }

  /** 判断某单元格是否被合并区域覆盖（非起点） */
  private isMergedAway(col: number, row: number): boolean {
    for (const m of this.merges) {
      if (col >= m.col && col < m.col + m.colSpan && row >= m.row && row < m.row + m.rowSpan) {
        if (col !== m.col || row !== m.row) return true;
      }
    }
    return false;
  }

  /** 获取合并后的有效样式 */
  private getCellStyle(col: number, row: number): Required<Omit<GridCellStyle, 'padding'>> & {
    padding: { top: number; bottom: number; left: number; right: number };
  } {
    const s = this.cellStyles[row]?.[col] ?? null;
    const base = s ?? this.cellStyle;
    return {
      backgroundColor: base.backgroundColor ?? DEFAULT_CELL_STYLE.backgroundColor,
      borderColor: base.borderColor ?? DEFAULT_CELL_STYLE.borderColor,
      borderWidth: base.borderWidth ?? DEFAULT_CELL_STYLE.borderWidth,
      borderRadius: base.borderRadius ?? DEFAULT_CELL_STYLE.borderRadius,
      padding: { ...DEFAULT_CELL_STYLE.padding, ...base.padding },
    };
  }

  // ===================== 绘制 =====================

  draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number) {
    const { x, y, w, h } = this.resolveRect(parentWidth, parentHeight);

    ctx.save();
    ctx.translate(x, y);

    // drawContent：在容器局部坐标系下应用变换 + 背景/边框/裁剪 + 网格内容
    this._drawWithCache(ctx, w, h, (cctx, cw, ch) => {
      cctx.save();

      // 变换
      const cx = cw * this.centerX;
      const cy = ch * this.centerY;
      cctx.translate(cx, cy);
      cctx.rotate(this.rotation);
      cctx.scale(this.scaleX, this.scaleY);
      cctx.translate(-cx, -cy);

      // 滤镜
      const filterStr = this.buildFilterString();
      if (filterStr !== 'none') cctx.filter = filterStr;

      // 容器背景
      if (this.backgroundColor !== 'transparent') {
        cctx.fillStyle = this.backgroundColor;
        cctx.beginPath();
        cctx.roundRect(0, 0, cw, ch, this.borderRadius);
        cctx.fill();
      }
      if (this.borderWidth > 0) {
        cctx.strokeStyle = this.borderColor;
        cctx.lineWidth = this.borderWidth;
        cctx.beginPath();
        cctx.roundRect(0, 0, cw, ch, this.borderRadius);
        cctx.stroke();
      }

      // 内部可用区域
      const innerX = this.padding.left;
      const innerY = this.padding.top;
      const innerW = cw - this.padding.left - this.padding.right;
      const innerH = ch - this.padding.top - this.padding.bottom;

      // 裁剪
      if (this.clip) {
        cctx.beginPath();
        cctx.roundRect(innerX, innerY, innerW, innerH, this.borderRadius);
        cctx.clip();
      }

      cctx.translate(innerX, innerY);

      // 网格内容
      const { colX, rowY, colW, rowH } = this.computeGrid(innerW, innerH);

      // 单元格背景
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.isMergedAway(c, r)) continue;
          const style = this.getCellStyle(c, r);
          if (style.backgroundColor === 'transparent') continue;
          const rect = this.getCellRect(c, r, colX, rowY, colW, rowH);
          cctx.fillStyle = style.backgroundColor;
          cctx.beginPath();
          cctx.roundRect(rect.x, rect.y, rect.w, rect.h, style.borderRadius);
          cctx.fill();
        }
      }

      // 单元格边框
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.isMergedAway(c, r)) continue;
          const style = this.getCellStyle(c, r);
          if (style.borderWidth <= 0) continue;
          const rect = this.getCellRect(c, r, colX, rowY, colW, rowH);
          cctx.strokeStyle = style.borderColor;
          cctx.lineWidth = style.borderWidth;
          cctx.beginPath();
          cctx.roundRect(rect.x, rect.y, rect.w, rect.h, style.borderRadius);
          cctx.stroke();
        }
      }

      // 子项
      for (const { child, col, row } of this.cellChildren) {
        if (typeof (child as any).draw !== 'function') continue;
        const rect = this.getCellRect(col, row, colX, rowY, colW, rowH);
        const style = this.getCellStyle(col, row);
        const pad = style.padding;
        const cellInnerX = rect.x + pad.left;
        const cellInnerY = rect.y + pad.top;
        const cellInnerW = rect.w - pad.left - pad.right;
        const cellInnerH = rect.h - pad.top - pad.bottom;

        cctx.save();
        cctx.translate(cellInnerX, cellInnerY);
        (child as any).draw(cctx, cellInnerW, cellInnerH);
        cctx.restore();
      }

      cctx.restore();
    }, this.computeCacheExpansion(w, h));

    ctx.restore();
  }
}
