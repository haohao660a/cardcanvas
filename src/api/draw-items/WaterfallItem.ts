// src/api/draw-items/WaterfallItem.ts
import { BaseDrawItem } from './DrawItem';
import type { Color } from './DrawItem';
import type { DrawItem } from './DrawItem';

export type FlowDirection = 'row' | 'column';
export type AlignType = 'start' | 'center' | 'end' | 'space-between' | 'space-around';

export class WaterfallItem extends BaseDrawItem {
  type = 'waterfall';
  direction: FlowDirection;
  rowGap: number;
  colGap: number;
  align: AlignType;          // 主轴对齐
  justify: AlignType;        // 交叉轴对齐
  backgroundColor: Color;
  borderColor: Color;
  borderWidth: number;
  borderRadius: number;
  clip: boolean;
  children: DrawItem[] = [];

  constructor(opts: { direction?: FlowDirection; rowGap?: number; colGap?: number; align?: AlignType; justify?: AlignType; backgroundColor?: Color; borderColor?: Color; borderWidth?: number; borderRadius?: number; clip?: boolean; x?: number | string; y?: number | string; width?: number | string; height?: number | string; anchorX?: number | string; anchorY?: number | string; anchorXMode?: 'pixel' | 'percent'; anchorYMode?: 'pixel' | 'percent' }) {
    super();
    this.direction = opts.direction ?? 'row';
    this.rowGap = opts.rowGap ?? 0;
    this.colGap = opts.colGap ?? 0;
    this.align = opts.align ?? 'start';
    this.justify = opts.justify ?? 'start';
    this.backgroundColor = opts.backgroundColor ?? 'transparent';
    this.borderColor = opts.borderColor ?? '#000000';
    this.borderWidth = opts.borderWidth ?? 0;
    this.borderRadius = opts.borderRadius ?? 0;
    this.clip = opts.clip ?? false;
    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;
    if (opts.width !== undefined) this.width = opts.width;
    if (opts.height !== undefined) this.height = opts.height;
    if (opts.anchorX !== undefined) this.anchorX = opts.anchorX;
    if (opts.anchorY !== undefined) this.anchorY = opts.anchorY;
    if (opts.anchorXMode !== undefined) this.anchorXMode = opts.anchorXMode;
    if (opts.anchorYMode !== undefined) this.anchorYMode = opts.anchorYMode;
  }

  addChild(item: DrawItem) {
    this.children.push(item);
  }

  draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number) {
    const { x, y, w, h } = this.resolveRect(parentWidth, parentHeight);

    ctx.save();
    ctx.translate(x, y);

    this._drawWithCache(ctx, w, h, (cctx, cw, ch) => {
      // 背景边框
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
      if (this.clip) {
        cctx.beginPath();
        cctx.roundRect(0, 0, cw, ch, this.borderRadius);
        cctx.clip();
      }

      // 瀑布流布局（相对坐标）
      const childSizes = this.children.map(child => {
        const cW = child.resolveSize(child.width, child.wMode, cw);
        const cH = child.resolveSize(child.height, child.hMode, ch);
        return { w: cW, h: cH };
      });

      if (this.direction === 'row') {
        let curX = 0;
        let curY = 0;
        let maxRowHeight = 0;
        for (let i = 0; i < this.children.length; i++) {
          const size = childSizes[i];
          if (curX + size.w > cw) {
            curX = 0;
            curY += maxRowHeight + this.rowGap;
            maxRowHeight = 0;
          }
          this.children[i].x = curX;
          this.children[i].y = curY;
          if ('draw' in this.children[i]) {
            (this.children[i] as any).draw(cctx, cw, ch);
          }
          curX += size.w + this.colGap;
          maxRowHeight = Math.max(maxRowHeight, size.h);
        }
      }
    });

    ctx.restore();
  }
}