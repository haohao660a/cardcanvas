// src/api/draw-items/SpriteClipItem.ts
import { RelativeContainerItem } from './RelativeContainerItem';
import type { UnitMode } from './DrawItem';
import { pageRenderRegistry } from './PageRenderRegistry';

/**
 * 截取图块：从指定页面（或该页指定卡牌）的已渲染内容中截取一块区域，
 * 拉伸到本容器尺寸后绘制。继承 RelativeContainerItem，支持 scaleX/scaleY 负值镜像、
 * 缓存、滤镜、子项等全部容器能力。
 *
 * - pageRef: 页面索引(数字，合并数组下标) 或 索引名称(字符串)
 * - cardId: 卡牌 id；-1/null 时引用整张页面，否则引用该页含此 id 的卡牌
 *   （多同名页面时，按添加顺序取第一个含此 id 的页面）
 * - clipX/Y/W/H: 截取区域。引用整页时相对页面尺寸；引用卡牌时相对卡牌尺寸。
 *   支持像素与百分比，默认 (0,0,'100%','100%') 即截取整个引用区域。
 *
 * 当引用的页面尚未绘制（不在注册表中）时，回退用该页面背景色填充；
 * 后台页默认透明背景，故默认回退为透明（即不绘制）。
 */
export class SpriteClipItem extends RelativeContainerItem {
  type = 'sprite-clip';

  /** 页面引用：数字=合并数组下标；字符串=indexName */
  pageRef: string | number;
  /** 卡牌 id；-1/null 时引用整张页面 */
  cardId: number | null;

  // 截取区域（默认截取整个引用区域）；支持数字(像素)或字符串('50%'百分比)
  clipX: number | string = 0;
  clipY: number | string = 0;
  clipW: number | string = '100%';
  clipH: number | string = '100%';
  clipXMode: UnitMode = 'percent';
  clipYMode: UnitMode = 'percent';
  clipWMode: UnitMode = 'percent';
  clipHMode: UnitMode = 'percent';

  constructor(opts: {
    pageRef: string | number;
    cardId?: number | null;
    clipX?: number | string;
    clipY?: number | string;
    clipW?: number | string;
    clipH?: number | string;
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
    this.pageRef = opts.pageRef;
    this.cardId = opts.cardId ?? null;
    this._setClip('clipX', opts.clipX, 'clipXMode');
    this._setClip('clipY', opts.clipY, 'clipYMode');
    this._setClip('clipW', opts.clipW, 'clipWMode');
    this._setClip('clipH', opts.clipH, 'clipHMode');
  }

  private _setClip(prop: 'clipX'|'clipY'|'clipW'|'clipH', val: number | string | undefined, modeProp: 'clipXMode'|'clipYMode'|'clipWMode'|'clipHMode') {
    if (val === undefined) return;
    if (typeof val === 'string') {
      const t = val.trim();
      if (t.endsWith('%')) {
        (this as any)[prop] = parseFloat(t) / 100;
        (this as any)[modeProp] = 'percent';
        return;
      }
      const n = parseFloat(t);
      (this as any)[prop] = isNaN(n) ? 0 : n;
      (this as any)[modeProp] = 'pixel';
      return;
    }
    (this as any)[prop] = val;
    // 数字默认像素（保持与 BaseDrawItem 行为一致）
    (this as any)[modeProp] = 'pixel';
  }

  /** 设置截取区域（像素） */
  setClipPixel(x: number, y: number, w: number | string, h: number | string) {
    this._setClip('clipX', x, 'clipXMode');
    this._setClip('clipY', y, 'clipYMode');
    this._setClip('clipW', w, 'clipWMode');
    this._setClip('clipH', h, 'clipHMode');
    this.refreshCache();
    return this;
  }

  /** 设置截取区域（百分比，相对引用对象尺寸） */
  setClipPercent(x: number, y: number, w: number, h: number) {
    this.clipX = x; this.clipY = y; this.clipW = w; this.clipH = h;
    this.clipXMode = this.clipYMode = this.clipWMode = this.clipHMode = 'percent';
    this.refreshCache();
    return this;
  }

  protected _drawContent(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // 先绘制截取内容（置于子项之下）
    this._drawClippedSource(ctx, w, h);
    // 再绘制子项
    super._drawContent(ctx, w, h);
  }

  private _drawClippedSource(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (w <= 0 || h <= 0) return;
    const ref = pageRenderRegistry.resolveReference(this.pageRef, this.cardId);
    if (!ref) {
      // 引用未注册：无内容可截取，留空（透明）
      return;
    }
    const src = ref.info.canvas;
    // 计算截取区域（相对源 canvas 的像素坐标）
    let sx: number, sy: number, sw: number, sh: number;
    if (ref.card) {
      // 引用卡牌：截取区域相对卡牌左上角
      const cw = ref.card.width;
      const ch = ref.card.height;
      sx = ref.card.x + this.resolveSize(this.clipX, this.clipXMode, cw);
      sy = ref.card.y + this.resolveSize(this.clipY, this.clipYMode, ch);
      sw = this.resolveSize(this.clipW, this.clipWMode, cw);
      sh = this.resolveSize(this.clipH, this.clipHMode, ch);
    } else {
      // 引用整页：截取区域相对页面左上角
      const pw = ref.info.pageConfig.width;
      const ph = ref.info.pageConfig.height;
      sx = this.resolveSize(this.clipX, this.clipXMode, pw);
      sy = this.resolveSize(this.clipY, this.clipYMode, ph);
      sw = this.resolveSize(this.clipW, this.clipWMode, pw);
      sh = this.resolveSize(this.clipH, this.clipHMode, ph);
    }
    if (sw <= 0 || sh <= 0) return;
    // 拉伸绘制到容器区域 (0,0)~(w,h)
    try {
      ctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
    } catch {
      // 源 canvas 被本地图片污染时 drawImage 不受影响（仅 toDataURL 受限），此处兜底
    }
  }
}
