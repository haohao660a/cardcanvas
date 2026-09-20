// src/api/draw-items/ContainerItem.ts
import { BaseDrawItem } from './DrawItem';
import type { Color, Align } from './DrawItem';
import type { DrawItem } from './DrawItem';

export interface ContainerOptions {
  direction?: 'row' | 'column';
  align?: Align;
  justify?: Align;
  gap?: number;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  margin?: { top?: number; bottom?: number; left?: number; right?: number };
  backgroundColor?: Color;
  borderColor?: Color;
  borderWidth?: number;
  borderRadius?: number;
  clip?: boolean;
  maxDepth?: number;
}

export class ContainerItem extends BaseDrawItem {
  type = 'container';
  direction: 'row' | 'column';
  align: Align;
  justify: Align;
  gap: number;
  padding: { top: number; bottom: number; left: number; right: number };
  margin: { top: number; bottom: number; left: number; right: number };
  backgroundColor: Color;
  borderColor: Color;
  borderWidth: number;
  borderRadius: number;
  clip: boolean;
  maxDepth: number;
  children: DrawItem[] = [];

  constructor(opts: ContainerOptions & { x?: number | string; y?: number | string; width?: number | string; height?: number | string; anchorX?: number | string; anchorY?: number | string; anchorXMode?: 'pixel' | 'percent'; anchorYMode?: 'pixel' | 'percent' }) {
    super();
    this.direction = opts.direction ?? 'row';
    this.align = opts.align ?? 'start';
    this.justify = opts.justify ?? 'start';
    this.gap = opts.gap ?? 0;
    this.padding = { top: 0, bottom: 0, left: 0, right: 0, ...opts.padding };
    this.margin = { top: 0, bottom: 0, left: 0, right: 0, ...opts.margin };
    this.backgroundColor = opts.backgroundColor ?? 'transparent';
    this.borderColor = opts.borderColor ?? '#000000';
    this.borderWidth = opts.borderWidth ?? 0;
    this.borderRadius = opts.borderRadius ?? 0;
    this.clip = opts.clip ?? false;
    this.maxDepth = opts.maxDepth ?? 100;
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

  draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number, depth: number = 0) {
    if (depth > this.maxDepth) {
      console.warn('Container depth exceeded limit');
      return;
    }

    const { x, y, w, h } = this.resolveRect(parentWidth, parentHeight);

    ctx.save();
    ctx.translate(x, y);

    // drawContent：在容器局部坐标系 (0,0)~(w,h) 下绘制完整内容
    this._drawWithCache(ctx, w, h, (cctx, cw, ch) => {
      // margin
      const mx = this.margin.left || 0;
      const my = this.margin.top || 0;
      const mw = cw - mx - (this.margin.right || 0);
      const mh = ch - my - (this.margin.bottom || 0);

      cctx.save();
      cctx.translate(mx, my);

      // 背景边框
      if (this.backgroundColor !== 'transparent') {
        cctx.fillStyle = this.backgroundColor;
        cctx.beginPath();
        cctx.roundRect(0, 0, mw, mh, this.borderRadius);
        cctx.fill();
      }
      if (this.borderWidth > 0) {
        cctx.strokeStyle = this.borderColor;
        cctx.lineWidth = this.borderWidth;
        cctx.beginPath();
        cctx.roundRect(0, 0, mw, mh, this.borderRadius);
        cctx.stroke();
      }

      // 内部区域
      const innerX = this.padding.left || 0;
      const innerY = this.padding.top || 0;
      const innerW = mw - innerX - (this.padding.right || 0);
      const innerH = mh - innerY - (this.padding.bottom || 0);

      if (this.clip) {
        cctx.beginPath();
        cctx.roundRect(innerX, innerY, innerW, innerH, this.borderRadius);
        cctx.clip();
      }

      cctx.translate(innerX, innerY);

      // 测量子项
      const childSizes = this.children.map(child => {
        let cW = child.resolveSize(child.width, child.wMode, innerW);
        let cH = child.resolveSize(child.height, child.hMode, innerH);
        if (child.type === 'text') {
          const textItem = child as any;
          if (cW === 0) {
            cctx.font = `${textItem.fontSize || 16}px ${textItem.fontFamily || 'sans-serif'}`;
            const metrics = cctx.measureText(textItem.text || '');
            cW = metrics.width;
          }
          if (cH === 0) {
            cH = (textItem.fontSize || 16) * 1.2;
          }
        }
        return { w: Math.max(0, cW), h: Math.max(0, cH) };
      });

      const isRow = this.direction === 'row';
      const mainSizes = childSizes.map(s => isRow ? s.w : s.h);
      const crossSizes = childSizes.map(s => isRow ? s.h : s.w);
      const totalMain = mainSizes.reduce((a, b) => a + b, 0) + this.gap * (this.children.length - 1);

      let mainOffset = 0;
      if (this.align === 'center') mainOffset = (isRow ? innerW : innerH) / 2 - totalMain / 2;
      else if (this.align === 'end') mainOffset = (isRow ? innerW : innerH) - totalMain;

      // 放置子项（相对坐标）
      let curMain = mainOffset;
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        const mainSize = mainSizes[i];
        const crossSize = crossSizes[i];

        let childX = isRow ? curMain : 0;
        let childY = isRow ? 0 : curMain;

        if (this.justify === 'center') {
          if (isRow) childY += (innerH - crossSize) / 2;
          else childX += (innerW - crossSize) / 2;
        } else if (this.justify === 'end') {
          if (isRow) childY += (innerH - crossSize);
          else childX += (innerW - crossSize);
        }

        child.x = childX;
        child.y = childY;
        child.xMode = 'pixel';
        child.yMode = 'pixel';

        if (isRow) {
          if (child.width === 0) { child.width = mainSize; child.wMode = 'pixel'; }
          if (child.height === 0) { child.height = crossSize; child.hMode = 'pixel'; }
        } else {
          if (child.height === 0) { child.height = mainSize; child.hMode = 'pixel'; }
          if (child.width === 0) { child.width = crossSize; child.wMode = 'pixel'; }
        }

        if ('draw' in child) {
          (child as any).draw(cctx, innerW, innerH, depth + 1);
        }

        curMain += mainSize + this.gap;
      }

      cctx.restore();
    });

    ctx.restore();
  }
}