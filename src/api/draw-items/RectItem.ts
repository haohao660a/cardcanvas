// src/api/draw-items/RectItem.ts
import { BaseDrawItem } from './DrawItem';
import type { Color } from './DrawItem';

export interface RectOptions {
  fillColor?: Color;
  strokeColor?: Color;
  lineWidth?: number;
  borderRadius?: number;
}

export class RectItem extends BaseDrawItem {
  type = 'rect';
  fillColor: Color;
  strokeColor: Color;
  lineWidth: number;
  borderRadius: number;

  constructor(opts: RectOptions & { x?: number | string; y?: number | string; width?: number | string; height?: number | string; anchorX?: number | string; anchorY?: number | string; anchorXMode?: 'pixel' | 'percent'; anchorYMode?: 'pixel' | 'percent' }) {
    super();
    this.fillColor = opts.fillColor ?? 'transparent';
    this.strokeColor = opts.strokeColor ?? '#000000';
    this.lineWidth = opts.lineWidth ?? 1;
    this.borderRadius = opts.borderRadius ?? 0;
    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;
    if (opts.width !== undefined) this.width = opts.width;
    if (opts.height !== undefined) this.height = opts.height;
    if (opts.anchorX !== undefined) this.anchorX = opts.anchorX;
    if (opts.anchorY !== undefined) this.anchorY = opts.anchorY;
    if (opts.anchorXMode !== undefined) this.anchorXMode = opts.anchorXMode;
    if (opts.anchorYMode !== undefined) this.anchorYMode = opts.anchorYMode;
  }

  draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number) {
    const { x, y, w, h } = this.resolveRect(parentWidth, parentHeight);

    ctx.save();
    const r = Math.min(this.borderRadius, w / 2, h / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (this.fillColor !== 'transparent') {
      ctx.fillStyle = this.fillColor;
      ctx.fill();
    }
    if (this.lineWidth > 0) {
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  }
}