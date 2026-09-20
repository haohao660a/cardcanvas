// src/api/draw-items/RelativeContainerItem.ts
import { BaseDrawItem } from './DrawItem';
import type { Color } from './DrawItem';
import type { DrawItem } from './DrawItem';

export interface FilterOptions {
  /** 模糊半径（像素） */
  blur?: number;
  /** 亮度（0-2，1为原始） */
  brightness?: number;
  /** 对比度（0-2，1为原始） */
  contrast?: number;
  /** 灰度（0-1，0为彩色，1为完全灰度） */
  grayscale?: number;
  /** 色相旋转（度） */
  hueRotate?: number;
  /** 反转（0-1） */
  invert?: number;
  /** 饱和度（0-2，1为原始） */
  saturate?: number;
  /** 棕褐色（0-1） */
  sepia?: number;
  /** 透明度（0-1，1为不透明） */
  opacity?: number;
  /** 自定义 CSS filter 字符串（会覆盖其他设置） */
  customFilter?: string;
}

export class RelativeContainerItem extends BaseDrawItem {
  type = 'relative-container';
  backgroundColor: Color;
  borderColor: Color;
  borderWidth: number;
  borderRadius: number;
  clip: boolean;
  children: DrawItem[] = [];

  // 变换属性
  rotation: number = 0;
  scaleX: number = 1;
  scaleY: number = 1;
  centerX: number = 0.5;
  centerY: number = 0.5;

  // 滤镜属性
  filter: FilterOptions = {};

  constructor(opts: {
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
    /** 锚点X（像素或字符串百分比，默认0左边缘） */
    anchorX?: number | string;
    /** 锚点Y（像素或字符串百分比，默认0上边缘） */
    anchorY?: number | string;
    /** 锚点X单位模式 */
    anchorXMode?: 'pixel' | 'percent';
    /** 锚点Y单位模式 */
    anchorYMode?: 'pixel' | 'percent';
    /** 滤镜选项 */
    filter?: FilterOptions;
  }) {
    super();
    this.backgroundColor = opts.backgroundColor ?? 'transparent';
    this.borderColor = opts.borderColor ?? '#000000';
    this.borderWidth = opts.borderWidth ?? 0;
    this.borderRadius = opts.borderRadius ?? 0;
    this.clip = opts.clip ?? false;
    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;
    if (opts.width !== undefined) this.width = opts.width;
    if (opts.height !== undefined) this.height = opts.height;
    if (opts.rotation !== undefined) this.rotation = opts.rotation;
    if (opts.scaleX !== undefined) this.scaleX = opts.scaleX;
    if (opts.scaleY !== undefined) this.scaleY = opts.scaleY;
    if (opts.centerX !== undefined) this.centerX = opts.centerX;
    if (opts.centerY !== undefined) this.centerY = opts.centerY;
    if (opts.anchorX !== undefined) this.anchorX = opts.anchorX;
    if (opts.anchorY !== undefined) this.anchorY = opts.anchorY;
    if (opts.anchorXMode !== undefined) this.anchorXMode = opts.anchorXMode;
    if (opts.anchorYMode !== undefined) this.anchorYMode = opts.anchorYMode;
    if (opts.filter !== undefined) this.filter = opts.filter;
  }

  addChild(item: DrawItem) {
    this.children.push(item);
  }

  setRotation(rad: number) { this.rotation = rad; }
  setScale(sx: number, sy: number = sx) { this.scaleX = sx; this.scaleY = sy; }
  setCenter(cx: number, cy: number) { this.centerX = cx; this.centerY = cy; }

  /**
   * 设置滤镜
   */
  setFilter(filter: FilterOptions) {
    this.filter = { ...this.filter, ...filter };
  }

  /**
   * 构建 CSS 滤镜字符串
   */
  protected buildFilterString(): string {
    const f = this.filter;
    
    // 如果有自定义滤镜，直接使用
    if (f.customFilter) {
      return f.customFilter;
    }

    const parts: string[] = [];
    
    if (f.blur !== undefined && f.blur > 0) {
      parts.push(`blur(${f.blur}px)`);
    }
    if (f.brightness !== undefined) {
      parts.push(`brightness(${f.brightness})`);
    }
    if (f.contrast !== undefined) {
      parts.push(`contrast(${f.contrast})`);
    }
    if (f.grayscale !== undefined && f.grayscale > 0) {
      parts.push(`grayscale(${f.grayscale})`);
    }
    if (f.hueRotate !== undefined) {
      parts.push(`hue-rotate(${f.hueRotate}deg)`);
    }
    if (f.invert !== undefined && f.invert > 0) {
      parts.push(`invert(${f.invert})`);
    }
    if (f.saturate !== undefined) {
      parts.push(`saturate(${f.saturate})`);
    }
    if (f.sepia !== undefined && f.sepia > 0) {
      parts.push(`sepia(${f.sepia})`);
    }
    if (f.opacity !== undefined && f.opacity < 1) {
      parts.push(`opacity(${f.opacity})`);
    }

    return parts.join(' ') || 'none';
  }

  /**
   * 计算缓存画布需覆盖的区域（局部坐标系）。
   * 旋转/缩放时内容会超出原始 (0,0)~(w,h) 矩形，缓存画布若不随之扩展，
   * 超出部分会被缓存画布位图边界裁剪（与 clip 属性无关的硬裁剪）。
   * 覆盖范围：变换后自身矩形包围盒 ∪ 变换后子项包围盒 ∪ 滤镜模糊外扩。
   */
  protected computeCacheExpansion(w: number, h: number): { offsetX: number; offsetY: number; width: number; height: number } {
    const hasTransform = this.rotation !== 0 || this.scaleX !== 1 || this.scaleY !== 1;
    const blur = this.filter?.blur ?? 0;
    if (!hasTransform && !(blur > 0)) {
      return { offsetX: 0, offsetY: 0, width: w, height: h };
    }
    // 变换：围绕中心 (cx,cy) 旋转+缩放，点 p → c + R·S·(p-c)
    const cx = w * this.centerX;
    const cy = h * this.centerY;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const tf = (px: number, py: number): [number, number] => {
      const dx = (px - cx) * this.scaleX;
      const dy = (py - cy) * this.scaleY;
      return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
    };
    // 至少覆盖原始区域
    let minX = 0, minY = 0, maxX = w, maxY = h;
    const grow = (x: number, y: number) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };
    // 自身矩形四角变换后
    for (const [px, py] of [[0, 0], [w, 0], [w, h], [0, h]] as const) {
      const [x, y] = tf(px, py);
      grow(x, y);
    }
    // 滤镜模糊外扩（CSS blur(r) 的 σ=r/2，取 2r 覆盖绝大部分能量）
    if (blur > 0) {
      const pad = blur * 2;
      minX -= pad;
      minY -= pad;
      maxX += pad;
      maxY += pad;
    }
    // 取整对齐：位图像素与局部坐标 1:1，便于像素级操作（getImageData）按整数偏移定位内容区域
    const x0 = Math.floor(minX);
    const y0 = Math.floor(minY);
    return { offsetX: x0, offsetY: y0, width: Math.ceil(maxX) - x0, height: Math.ceil(maxY) - y0 };
  }

  draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number) {
    const { x, y, w, h } = this.resolveRect(parentWidth, parentHeight);

    ctx.save();
    ctx.translate(x, y);

    // drawContent：在容器局部坐标系 (0,0)~(w,h) 下应用变换并绘制完整内容
    // 开启缓存时 drawContent 在缓存 canvas 上执行，变换也会正确应用，保证内容一致
    this._drawWithCache(ctx, w, h, (cctx, cw, ch) => {
      cctx.save();
      // 变换（相对于容器左上角）
      const cx = cw * this.centerX;
      const cy = ch * this.centerY;
      cctx.translate(cx, cy);
      cctx.rotate(this.rotation);
      // 负值缩放（镜像）兼容：center 为基准的 scale，负值即上下/左右镜像
      cctx.scale(this.scaleX, this.scaleY);
      cctx.translate(-cx, -cy);

      // 滤镜
      const filterStr = this.buildFilterString();
      if (filterStr !== 'none') {
        cctx.filter = filterStr;
      }

      // 背景
      if (this.backgroundColor !== 'transparent') {
        cctx.fillStyle = this.backgroundColor;
        cctx.beginPath();
        cctx.roundRect(0, 0, cw, ch, this.borderRadius);
        cctx.fill();
      }

      // 边框
      if (this.borderWidth > 0) {
        cctx.strokeStyle = this.borderColor;
        cctx.lineWidth = this.borderWidth;
        cctx.beginPath();
        cctx.roundRect(0, 0, cw, ch, this.borderRadius);
        cctx.stroke();
      }

      // 裁剪
      if (this.clip) {
        cctx.beginPath();
        cctx.roundRect(0, 0, cw, ch, this.borderRadius);
        cctx.clip();
      }

      // 内容（子类可覆盖注入额外内容，如截取图块/砖块）
      this._drawContent(cctx, cw, ch);

      cctx.restore();
    }, this.computeCacheExpansion(w, h));

    ctx.restore();
  }

  /**
   * 绘制内容（在变换/滤镜/背景/边框/裁剪已应用之后，缓存回调内）。
   * 子类覆盖此方法以注入额外内容（先于/后于子项均可）。
   * 默认实现：依次绘制所有子项。
   */
  protected _drawContent(ctx: CanvasRenderingContext2D, w: number, h: number) {
    for (const child of this.children) {
      if (typeof (child as any).draw === 'function') {
        (child as any).draw(ctx, w, h);
      }
    }
  }
}