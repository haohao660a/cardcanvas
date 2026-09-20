// src/api/draw-items/BoardItem.ts
import { RelativeContainerItem } from './RelativeContainerItem';
import type { FilterOptions } from './RelativeContainerItem';
import type { Color } from './DrawItem';
import {
  generateNoiseCanvas,
  applyFilterToImageData,
  type NoiseOptions,
  type FilterType,
  type BlurOptions,
  type HslOptions,
  type RgbOptions,
  type DisplaceOptions,
  type PinchOptions,
  type DesaturateOptions,
} from './BoardEffects';

type Pt = [number, number];

// ===================== 选项类型 =====================

/** 描边线设置 */
export interface BoardStrokeOptions {
  /** 线颜色，支持 #rgb / #rrggbb / #rgba / #rrggbbaa */
  color?: string;
  /** 线宽（画板内部坐标单位） */
  lineWidth?: number;
  /** 线形（虚线模式），如 [5,1,2,1] 表示 5长画线、1空白、2长画线、1空白；奇数长度自动补0；空数组为实线 */
  dash?: number[];
  /** 端点/拐点是否圆角（虚线的端头也受影响），默认 true */
  roundCap?: boolean;
}

/** 渐变停点（用于描边渐变，position 为 0~1） */
export interface StrokeGradientStop {
  color: string;
  position: number;
}

/** 循环线颜色停点（color 持续 length 长度后切换到下一个，循环往复） */
export interface StrokeCycleStop {
  color: string;
  length: number;
}

/** 平面渐变点（用于填充渐变，平面上每个点一个颜色，其余位置按距离反比混色） */
export interface FillGradientPoint {
  x: number;
  y: number;
  color: string;
}

/** 填充图案/图像的变换选项 */
export interface BoardFillTransformOptions {
  /** stretch = 拉伸(默认)，tile = 平铺重复 */
  mode?: 'stretch' | 'tile';
  /** 偏移 X（画板内部坐标，默认画板中心） */
  offsetX?: number;
  /** 偏移 Y（画板内部坐标，默认画板中心） */
  offsetY?: number;
  /** 旋转（弧度，默认 0） */
  rotation?: number;
  /** 横向缩放（负数为水平镜像；null 时自动缩放覆盖整个图形，仅 stretch 模式有效） */
  scaleX?: number | null;
  /** 纵向缩放（负数为垂直镜像；null 时自动缩放覆盖整个图形，仅 stretch 模式有效） */
  scaleY?: number | null;
  /** tile 模式横向重复次数（null = 自动铺满） */
  repeatX?: number | null;
  /** tile 模式纵向重复次数（null = 自动铺满） */
  repeatY?: number | null;
}

// ===================== 内部类型 =====================

interface StrokeSnap {
  color: string;
  lineWidth: number;
  dash: number[];
  dashTotal: number;
  roundCap: boolean;
  gradient: StrokeGradientStop[] | null;
  cycle: StrokeCycleStop[] | null;
  cycleTotal: number;
}

/** 归一化后的填充变换参数 */
interface NormFillTransform {
  mode: 'stretch' | 'tile';
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleX: number | null;
  scaleY: number | null;
  repeatX: number | null;
  repeatY: number | null;
}

type FillState =
  | { kind: 'none' }
  | { kind: 'color'; color: string }
  | { kind: 'gradient'; points: FillGradientPoint[] }
  | { kind: 'pattern'; source: BoardItem; transform: NormFillTransform }
  | { kind: 'image'; src: string; transform: NormFillTransform }
  | { kind: 'noise'; opts: NoiseOptions };

/** 绘制命令联合类型：图形、遮罩、文字、滤镜 */
type DrawCommand =
  | { type: 'shape'; points: Pt[]; closed: boolean; stroke: StrokeSnap; fill: FillState }
  | { type: 'maskPush'; points: Pt[]; closed: boolean }
  | { type: 'maskPop' }
  | { type: 'text'; text: string; x: number; y: number; fontSize: number; font: string; align: CanvasTextAlign; baseline: CanvasTextBaseline; fill: FillState; stroke: StrokeSnap | null; lineHeight: number }
  | { type: 'filter'; filterType: FilterType; opts: any };

// ===================== 颜色工具 =====================

function hexToRgba(hex: string): [number, number, number, number] {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3 || h.length === 4) {
    h = h.split('').map(c => c + c).join('');
  }
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const a = h.length >= 8 ? (parseInt(h.slice(6, 8), 16) || 0) / 255 : 1;
  return [r, g, b, a];
}

function mixRgba(a: [number, number, number, number], b: [number, number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  const al = a[3] + (b[3] - a[3]) * t;
  return `rgba(${r},${g},${bl},${al})`;
}

function mixHex(a: string, b: string, t: number): string {
  return mixRgba(hexToRgba(a), hexToRgba(b), t);
}

/** 渐变取色（stops 需已按 position 排序，pos 自动裁剪到 0~1） */
function gradientColor(stops: StrokeGradientStop[], pos: number): string {
  if (stops.length === 0) return '#000000';
  const t = Math.max(0, Math.min(1, pos));
  for (let i = 0; i < stops.length - 1; i++) {
    const s0 = stops[i], s1 = stops[i + 1];
    if (t >= s0.position && t <= s1.position) {
      const span = s1.position - s0.position;
      const k = span > 0 ? (t - s0.position) / span : 0;
      return mixHex(s0.color, s1.color, k);
    }
  }
  return t <= stops[0].position ? stops[0].color : stops[stops.length - 1].color;
}

// ===================== 图片缓存 =====================

const imageCache = new Map<string, HTMLImageElement>();
let imageVersion = 0;

function getCachedImage(src: string): HTMLImageElement | null {
  const cached = imageCache.get(src);
  if (cached) {
    return cached.complete && cached.naturalWidth > 0 ? cached : null;
  }
  const img = new Image();
  img.onload = () => {
    imageVersion++;
    window.dispatchEvent(new CustomEvent('image-loaded', { detail: { src: 'board:' + src } }));
  };
  img.onerror = () => console.warn('[BoardItem] 填充图片加载失败:', src);
  img.src = src;
  imageCache.set(src, img);
  return null;
}

// ===================== 几何采样 =====================

function sampleCircle(cx: number, cy: number, r: number, n = 96): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function sampleEllipse(cx: number, cy: number, rx: number, ry: number, rot: number, n = 96): Pt[] {
  const pts: Pt[] = [];
  const cos = Math.cos(rot), sin = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    pts.push([cx + ex * cos - ey * sin, cy + ex * sin + ey * cos]);
  }
  return pts;
}

function rectCorners(x1: number, y1: number, x2: number, y2: number): Pt[] {
  return [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ];
}

function centerRectCorners(cx: number, cy: number, w: number, h: number, rot: number): Pt[] {
  const hw = w / 2, hh = h / 2;
  const local: Pt[] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
  const cos = Math.cos(rot), sin = Math.sin(rot);
  return local.map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]);
}

/**
 * 圆角矩形采样点：四角为四分之一圆弧，圆弧半径 r 会被裁剪到 min(w,h)/2。
 * 点顺序：左上圆弧 → 顶边 → 右上圆弧 → 右边 → 右下圆弧 → 底边 → 左下圆弧 → 左边（闭合）
 */
function roundedRectCorners(x1: number, y1: number, x2: number, y2: number, r: number, n = 24): Pt[] {
  const left = Math.min(x1, x2), right = Math.max(x1, x2);
  const top = Math.min(y1, y2), bottom = Math.max(y1, y2);
  const w = right - left, h = bottom - top;
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  const pts: Pt[] = [];
  // 左上（从 180° 扫到 270°）
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI / 2) * (i / n);
    pts.push([left + radius + Math.cos(a) * radius, top + radius + Math.sin(a) * radius]);
  }
  // 顶边右端点（右上圆弧起点）→ 右上（270° 扫到 360°）
  for (let i = 1; i <= n; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / n);
    pts.push([right - radius + Math.cos(a) * radius, top + radius + Math.sin(a) * radius]);
  }
  // 右边下端点 → 右下（0° 扫到 90°）
  for (let i = 1; i <= n; i++) {
    const a = (Math.PI / 2) * (i / n);
    pts.push([right - radius + Math.cos(a) * radius, bottom - radius + Math.sin(a) * radius]);
  }
  // 底边左端点 → 左下（90° 扫到 180°）
  for (let i = 1; i <= n; i++) {
    const a = Math.PI / 2 + (Math.PI / 2) * (i / n);
    pts.push([left + radius + Math.cos(a) * radius, bottom - radius + Math.sin(a) * radius]);
  }
  return pts;
}

/** Catmull-Rom 插值曲线采样（开放曲线） */
function sampleCatmullRom(points: Pt[], perSeg = 24): Pt[] {
  if (points.length < 3) return points.map(p => [...p] as Pt);
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    for (let t = 0; t < perSeg; t++) {
      const s = t / perSeg;
      const s2 = s * s, s3 = s2 * s;
      const x = 0.5 * (
        2 * p1[0] +
        (-p0[0] + p2[0]) * s +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3
      );
      const y = 0.5 * (
        2 * p1[1] +
        (-p0[1] + p2[1]) * s +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3
      );
      out.push([x, y]);
    }
  }
  out.push([...points[points.length - 1]] as Pt);
  return out;
}

/** Catmull-Rom 插值曲线采样（闭合曲线：控制点环形环绕，首尾光滑相接，闭合边同样带曲率） */
function sampleCatmullRomClosed(points: Pt[], perSeg = 24): Pt[] {
  const n = points.length;
  if (n < 3) return points.map(p => [...p] as Pt);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let t = 0; t < perSeg; t++) {
      const s = t / perSeg;
      const s2 = s * s, s3 = s2 * s;
      const x = 0.5 * (
        2 * p1[0] +
        (-p0[0] + p2[0]) * s +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3
      );
      const y = 0.5 * (
        2 * p1[1] +
        (-p0[1] + p2[1]) * s +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3
      );
      out.push([x, y]);
    }
  }
  return out;
}

// ===================== 画板主体 =====================

/**
 * 画板绘制项
 *
 * 继承 RelativeContainerItem，复用旋转/缩放/滤镜/裁剪/边框/子项能力。
 * 拥有独立的内部坐标系：通过 innerWidth/innerHeight 定义内部大小，
 * 所有 drawXxx() 方法均使用内部坐标（支持负数和超出范围，配合 clip 裁剪）。
 * drawXxx() 仅记录绘制命令，在实际渲染时统一绘制。
 */
export class BoardItem extends RelativeContainerItem {
  type = 'board';

  /** 内部坐标宽度 */
  innerWidth: number;
  /** 内部坐标高度 */
  innerHeight: number;

  /** 像素级操作（滤镜/蒙版）读取缓存位图时内容区域的原点（位图坐标；缓存扩展时为 -offsetX/Y，其余为 0） */
  private pixelOriginX = 0;
  private pixelOriginY = 0;

  // ---- 当前描边状态 ----
  private strokeColor: string = '#000000';
  private strokeLineWidth: number = 1;
  private strokeDash: number[] = [];
  private strokeRoundCap: boolean = true;
  private strokeGradient: StrokeGradientStop[] | null = null;
  private strokeCycle: StrokeCycleStop[] | null = null;

  // ---- 当前填充状态（最后设置的生效） ----
  private fillState: FillState = { kind: 'none' };

  // ---- 当前文字状态 ----
  private textFontSize: number = 16;
  private textFontFamily: string = 'sans-serif';
  private textBold: boolean = false;
  private textItalic: boolean = false;
  private textAlign: CanvasTextAlign = 'left';
  private textBaseline: CanvasTextBaseline = 'alphabetic';
  private textLineHeight: number = 1.2;

  // ---- 画板蒙版（用另一个画板的亮度控制本画板透明度） ----
  private maskBoard: BoardItem | null = null;
  private maskChannel: 'luminance' | 'alpha' | 'red' | 'green' | 'blue' = 'luminance';
  private maskInvert: boolean = false;

  // ---- 绘制命令队列 ----
  private commands: DrawCommand[] = [];

  // ---- 图案预渲染缓存 ----
  private patternCache: { w: number; h: number; version: number; canvas: HTMLCanvasElement } | null = null;

  // ---- 多点渐变填充缓存 ----
  private gradientFillCache = new Map<string, HTMLCanvasElement>();

  constructor(opts: {
    innerWidth?: number;
    innerHeight?: number;
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
    filter?: FilterOptions;
  }) {
    super(opts);
    this.innerWidth = opts.innerWidth ?? 100;
    this.innerHeight = opts.innerHeight ?? 100;
    // 默认启用缓存：滤镜功能依赖离屏 canvas 进行像素操作
    this.enableCache();
  }

  /** 设置内部坐标大小 */
  setInnerSize(w: number, h: number): this {
    this.innerWidth = w;
    this.innerHeight = h;
    return this;
  }

  // ===================== 描边设置 =====================

  /**
   * 设置描边线（对后续绘制的线段/图形边线生效）
   * 所有参数均可省略，省略则保持原值
   */
  setStroke(opts: BoardStrokeOptions): this {
    if (opts.color !== undefined) this.strokeColor = opts.color;
    if (opts.lineWidth !== undefined) this.strokeLineWidth = opts.lineWidth;
    if (opts.dash !== undefined) this.strokeDash = [...opts.dash];
    if (opts.roundCap !== undefined) this.strokeRoundCap = opts.roundCap;
    return this;
  }

  /**
   * 设置渐变描边颜色
   * @param stops 颜色停点列表，position 为 0~1，沿整条路径（或闭合图形周长）渐变
   */
  setStrokeGradient(stops: StrokeGradientStop[]): this {
    this.strokeGradient = [...stops].sort((a, b) => a.position - b.position);
    this.strokeCycle = null;
    return this;
  }

  /**
   * 设置循环描边颜色
   * @param stops 颜色与持续长度列表，沿路径不断循环切换
   */
  setStrokeColorCycle(stops: StrokeCycleStop[]): this {
    this.strokeCycle = stops.filter(s => s.length > 0);
    this.strokeGradient = null;
    return this;
  }

  // ===================== 填充设置（最后一个生效） =====================

  /** 设置填充色（设置后将覆盖之前的填充设置） */
  setFillColor(color: string): this {
    this.fillState = { kind: 'color', color };
    return this;
  }

  /**
   * 设置多点平面渐变填充
   * @param points 平面上的颜色点，其余位置按距离反比混色
   */
  setFillGradient(points: FillGradientPoint[]): this {
    this.fillState = { kind: 'gradient', points: points.map(p => ({ ...p })) };
    return this;
  }

  /**
   * 设置填充图案（另一个画板的内容，会预渲染缓存，避免重复递归绘制）
   */
  setFillPattern(source: BoardItem, opts?: BoardFillTransformOptions): this {
    this.fillState = { kind: 'pattern', source, transform: this.normFillTransform(opts) };
    return this;
  }

  /**
   * 设置填充图像（外部图片，自动缓存；加载完成后自动重绘）
   */
  setFillImage(src: string, opts?: BoardFillTransformOptions): this {
    getCachedImage(src); // 触发加载
    this.fillState = { kind: 'image', src, transform: this.normFillTransform(opts) };
    return this;
  }

  /** 清除填充（后续图形只描边不填充） */
  setFillNone(): this {
    this.fillState = { kind: 'none' };
    return this;
  }

  /**
   * 设置噪波填充（对后续闭合图形生效）。
   * 噪波值在 color1 和 color2 之间插值，支持 value/fractal/turbulence 三种类型。
   */
  setFillNoise(opts: NoiseOptions): this {
    this.fillState = { kind: 'noise', opts: { ...opts } };
    return this;
  }

  private normFillTransform(opts?: BoardFillTransformOptions) {
    return {
      mode: (opts?.mode ?? 'stretch') as 'stretch' | 'tile',
      offsetX: opts?.offsetX ?? this.innerWidth / 2,
      offsetY: opts?.offsetY ?? this.innerHeight / 2,
      rotation: opts?.rotation ?? 0,
      scaleX: opts?.scaleX === undefined ? 1 : opts.scaleX,
      scaleY: opts?.scaleY === undefined ? 1 : opts.scaleY,
      repeatX: opts?.repeatX === undefined ? null : opts.repeatX,
      repeatY: opts?.repeatY === undefined ? null : opts.repeatY,
    };
  }

  // ===================== 图形绘制命令 =====================

  /** 直线：在两点之间绘制 */
  drawLine(x1: number, y1: number, x2: number, y2: number): this {
    this.queue([[x1, y1], [x2, y2]], false);
    return this;
  }

  /**
   * 路径：经过多个点的折线。
   * 注意：线型(虚线相位)、循环颜色等状态在折线段之间连续延续；
   * 渐变色按整条路径长度 0~1 整体渐变。
   * @param points 坐标点列表
   * @param closed 是否闭合（闭合即多边形，首尾相连且闭合区域内才会填充；开放路径不填充）
   */
  drawPath(points: Pt[], closed: boolean = false): this {
    if (points.length < 2) return this;
    this.queue(points.map(p => [p[0], p[1]] as Pt), closed);
    return this;
  }

  /**
   * 插值曲线：经过多个点的平滑曲线（Catmull-Rom 插值）。
   * 状态延续规则同 drawPath。
   * @param points 曲线经过的坐标点
   * @param closed 是否闭合；闭合时首尾光滑相接（闭合边同样带曲率，非直线封闭），闭合区域内填充
   */
  drawCurve(points: Pt[], closed: boolean = false): this {
    if (points.length < 2) return this;
    const pts = points.map(p => [p[0], p[1]] as Pt);
    const sampled = closed ? sampleCatmullRomClosed(pts) : sampleCatmullRom(pts);
    this.queue(sampled, closed);
    return this;
  }

  /** 两点矩形：由两个角点确定 */
  drawRect(x1: number, y1: number, x2: number, y2: number): this {
    this.queue(rectCorners(x1, y1, x2, y2), true);
    return this;
  }

  /** 中心矩形：中心坐标 + 宽高 + 可选旋转（弧度） */
  drawRectCenter(cx: number, cy: number, w: number, h: number, rotation: number = 0): this {
    this.queue(centerRectCorners(cx, cy, w, h, rotation), true);
    return this;
  }

  /**
   * 圆角矩形：由两个角点确定，radius 为圆角半径（自动裁剪到 min(宽,高)/2，支持 0 = 直角矩形）
   */
  drawRectRadius(x1: number, y1: number, x2: number, y2: number, radius: number): this {
    this.queue(roundedRectCorners(x1, y1, x2, y2, radius), true);
    return this;
  }

  /**
   * 中心圆角矩形：中心坐标 + 宽高 + 圆角半径 + 可选旋转（弧度）
   */
  drawRectRadiusCenter(cx: number, cy: number, w: number, h: number, radius: number, rotation: number = 0): this {
    const hw = w / 2, hh = h / 2;
    const pts = roundedRectCorners(-hw, -hh, hw, hh, radius);
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const rotated = pts.map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos] as Pt);
    this.queue(rotated, true);
    return this;
  }

  /** 圆形 */
  drawCircle(cx: number, cy: number, r: number): this {
    this.queue(sampleCircle(cx, cy, r), true);
    return this;
  }

  /** 椭圆（可带旋转，弧度） */
  drawEllipse(cx: number, cy: number, rx: number, ry: number, rotation: number = 0): this {
    this.queue(sampleEllipse(cx, cy, rx, ry, rotation), true);
    return this;
  }

  /**
   * 封闭多边形（等价于 drawPath(points, true)，保留以兼容旧脚本）。
   * 首尾自动闭合，闭合区域内填充，支持非凸多边形。
   */
  drawPolygon(points: Pt[]): this {
    return this.drawPath(points, true);
  }

  /** 清空所有已记录的绘制命令 */
  clearDraws(): this {
    this.commands = [];
    return this;
  }

  // ===================== 文字 =====================

  /**
   * 设置文字样式（对后续 drawText 生效）
   */
  setFont(opts: {
    fontSize?: number;
    fontFamily?: string;
    bold?: boolean;
    italic?: boolean;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
    lineHeight?: number;
  }): this {
    if (opts.fontSize !== undefined) this.textFontSize = opts.fontSize;
    if (opts.fontFamily !== undefined) this.textFontFamily = opts.fontFamily;
    if (opts.bold !== undefined) this.textBold = opts.bold;
    if (opts.italic !== undefined) this.textItalic = opts.italic;
    if (opts.align !== undefined) this.textAlign = opts.align;
    if (opts.baseline !== undefined) this.textBaseline = opts.baseline;
    if (opts.lineHeight !== undefined) this.textLineHeight = opts.lineHeight;
    return this;
  }

  /**
   * 绘制文字。使用当前 fill 填充、stroke 描边（若线宽>0），以及 setFont 设置的样式。
   * 支持 \n 多行，按 lineHeight 倍数换行。
   */
  drawText(text: string, x: number, y: number): this {
    if (!text) return this;
    let font = '';
    if (this.textItalic) font += 'italic ';
    if (this.textBold) font += 'bold ';
    font += `${this.textFontSize}px ${this.textFontFamily}`;
    const strokeSnap = this.strokeLineWidth > 0 ? this.snapshotStroke() : null;
    this.commands.push({
      type: 'text',
      text,
      x,
      y,
      fontSize: this.textFontSize,
      font,
      align: this.textAlign,
      baseline: this.textBaseline,
      fill: this.cloneFill(this.fillState),
      stroke: strokeSnap,
      lineHeight: this.textLineHeight,
    });
    return this;
  }

  // ===================== 遮罩 =====================

  /**
   * 推入路径遮罩：后续绘制只在该路径区域内可见。
   * 可嵌套使用，需用 popMask 还原。
   */
  pushMask(points: Pt[], closed: boolean = true): this {
    this.commands.push({ type: 'maskPush', points: points.map(p => [p[0], p[1]] as Pt), closed });
    return this;
  }

  /** 推入圆形遮罩 */
  pushMaskCircle(cx: number, cy: number, r: number): this {
    return this.pushMask(sampleCircle(cx, cy, r), true);
  }

  /** 推入矩形遮罩（两角点） */
  pushMaskRect(x1: number, y1: number, x2: number, y2: number): this {
    return this.pushMask(rectCorners(x1, y1, x2, y2), true);
  }

  /** 推入椭圆遮罩 */
  pushMaskEllipse(cx: number, cy: number, rx: number, ry: number, rotation: number = 0): this {
    return this.pushMask(sampleEllipse(cx, cy, rx, ry, rotation), true);
  }

  /** 推入圆角矩形遮罩 */
  pushMaskRectRadius(x1: number, y1: number, x2: number, y2: number, radius: number): this {
    return this.pushMask(roundedRectCorners(x1, y1, x2, y2, radius), true);
  }

  /** 弹出遮罩：恢复到上一个 pushMask 之前的可见区域 */
  popMask(): this {
    this.commands.push({ type: 'maskPop' });
    return this;
  }

  // ===================== 画板蒙版（基于另一个画板的亮度） =====================

  /**
   * 设置蒙版画板：用另一个 BoardItem 的绘制内容作为本画板的透明度蒙版。
   * 蒙版越亮的位置，本画板内容越不透明；越暗越透明（黑色=完全透明）。
   *
   * 典型用法：
   *   const mask = new BoardItem({ innerWidth: W, innerHeight: H });
   *   mask.setFillColor('#ffffff').drawText('HELLO', W/2, H/2); // 白色文字作为蒙版
   *   board.setMaskBoard(mask);  // board 只在文字区域可见
   *
   * @param board  作为蒙版的画板（可独立绘制任意内容）
   * @param opts.channel  取哪个通道的亮度：luminance(默认)/alpha/red/green/blue
   * @param opts.invert   是否反转蒙版（亮色变透明、暗色不透明），默认 false
   */
  setMaskBoard(board: BoardItem | null, opts?: { channel?: 'luminance' | 'alpha' | 'red' | 'green' | 'blue'; invert?: boolean }): this {
    this.maskBoard = board;
    if (opts?.channel !== undefined) this.maskChannel = opts.channel;
    if (opts?.invert !== undefined) this.maskInvert = opts.invert;
    this.refreshCache();
    return this;
  }

  /** 清除蒙版画板 */
  clearMaskBoard(): this {
    this.maskBoard = null;
    this.refreshCache();
    return this;
  }

  // ===================== 滤镜 =====================

  /**
   * 对当前画板已绘制的内容应用像素级滤镜。
   * 滤镜作用于 pushMask 之后的所有已绘制内容。
   */
  applyFilter(type: FilterType, opts: any = {}): this {
    this.commands.push({ type: 'filter', filterType: type, opts });
    return this;
  }

  /** 模糊滤镜 */
  blur(opts: BlurOptions = {}): this {
    return this.applyFilter('blur', opts);
  }

  /** HSL 调色（色相偏移/饱和度/亮度调整） */
  hslAdjust(opts: HslOptions = {}): this {
    return this.applyFilter('hsl', opts);
  }

  /** RGB 调色（各通道加法与乘法调整） */
  rgbAdjust(opts: RgbOptions = {}): this {
    return this.applyFilter('rgb', opts);
  }

  /** 置换滤镜（按噪波偏移像素，产生扭曲效果） */
  displace(opts: DisplaceOptions = {}): this {
    return this.applyFilter('displace', opts);
  }

  /** 挤压滤镜（径向挤压/膨胀，strength>0 挤压，<0 膨胀） */
  pinch(opts: PinchOptions = {}): this {
    return this.applyFilter('pinch', opts);
  }

  /** 去色（灰度化，amount 控制强度） */
  desaturate(opts: DesaturateOptions = {}): this {
    return this.applyFilter('desaturate', opts);
  }

  // ===================== 命令快照 =====================

  private queue(points: Pt[], closed: boolean) {
    const dash = this.strokeDash.length % 2 === 1 ? [...this.strokeDash, 0] : [...this.strokeDash];
    const dashTotal = dash.reduce((s, d) => s + d, 0);
    const cycle = this.strokeCycle ? [...this.strokeCycle] : null;
    const cycleTotal = cycle ? cycle.reduce((s, c) => s + c.length, 0) : 0;
    this.commands.push({
      type: 'shape',
      points,
      closed,
      stroke: {
        color: this.strokeColor,
        lineWidth: this.strokeLineWidth,
        dash,
        dashTotal,
        roundCap: this.strokeRoundCap,
        gradient: this.strokeGradient ? this.strokeGradient.map(s => ({ ...s })) : null,
        cycle,
        cycleTotal,
      },
      // 只有闭合图形才填充；开放路径（直线/开放路径/开放曲线）一律不填充
      fill: closed ? this.cloneFill(this.fillState) : { kind: 'none' as const },
    });
  }

  private cloneFill(f: FillState): FillState {
    if (f.kind === 'gradient') return { kind: 'gradient', points: f.points.map(p => ({ ...p })) };
    return { ...f } as FillState;
  }

  /** 快照当前描边状态 */
  private snapshotStroke(): StrokeSnap {
    const dash = this.strokeDash.length % 2 === 1 ? [...this.strokeDash, 0] : [...this.strokeDash];
    const dashTotal = dash.reduce((s, d) => s + d, 0);
    const cycle = this.strokeCycle ? [...this.strokeCycle] : null;
    const cycleTotal = cycle ? cycle.reduce((s, c) => s + c.length, 0) : 0;
    return {
      color: this.strokeColor,
      lineWidth: this.strokeLineWidth,
      dash,
      dashTotal,
      roundCap: this.strokeRoundCap,
      gradient: this.strokeGradient ? this.strokeGradient.map(s => ({ ...s })) : null,
      cycle,
      cycleTotal,
    };
  }

  /** 估算单行文字包围盒（基于字体度量，简化实现） */
  private textBBox(line: string, cmd: { font: string; x: number; y: number; align: CanvasTextAlign; baseline: CanvasTextBaseline; fontSize: number }) {
    // 用临时 canvas 度量
    const tmp = document.createElement('canvas');
    const tctx = tmp.getContext('2d')!;
    tctx.font = cmd.font;
    const m = tctx.measureText(line);
    const w = m.width;
    const h = cmd.fontSize * 1.2;
    let x = cmd.x;
    let y = cmd.y;
    if (cmd.align === 'center') x -= w / 2;
    else if (cmd.align === 'right') x -= w;
    if (cmd.baseline === 'middle') y -= h / 2;
    else if (cmd.baseline === 'bottom') y -= h;
    else if (cmd.baseline === 'top' || cmd.baseline === 'hanging') { /* y 是顶部 */ }
    else y -= h * 0.8; // alphabetic 等，基线以上
    return { minX: x, minY: y, maxX: x + w, maxY: y + h, w, h };
  }

  /** 对文字应用非纯色填充（渐变/图案/噪波），用离屏 canvas + source-atop 合成 */
  private paintTextFill(
    ctx: CanvasRenderingContext2D,
    line: string,
    fill: FillState,
    bbox: { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number },
    sx: number,
    sy: number
  ) {
    const bw = Math.max(1, Math.ceil(bbox.w));
    const bh = Math.max(1, Math.ceil(bbox.h));
    const off = document.createElement('canvas');
    off.width = bw;
    off.height = bh;
    const octx = off.getContext('2d')!;
    octx.font = ctx.font;
    octx.textAlign = 'left';
    octx.textBaseline = 'top';
    // 1. 先画文字形状（白色不透明），作为 alpha 蒙版
    octx.fillStyle = '#ffffff';
    octx.fillText(line, 0, 0);
    // 2. 用 source-atop 在文字形状上绘制填充内容
    octx.globalCompositeOperation = 'source-atop';
    const localBBox = { minX: 0, minY: 0, maxX: bw, maxY: bh, w: bw, h: bh };
    this.paintFill(octx, fill, localBBox, sx, sy, 0);
    octx.globalCompositeOperation = 'source-over';
    ctx.drawImage(off, bbox.minX, bbox.minY);
  }

  // ===================== 渲染 =====================

  draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number) {
    const { x, y, w, h } = this.resolveRect(parentWidth, parentHeight);

    const sx = w / this.innerWidth;
    const sy = h / this.innerHeight;

    const ex = this.computeCacheExpansion(w, h);
    // 像素级操作（滤镜/蒙版）按位图坐标读取内容区域：缓存开启时内容原点为 (-offsetX,-offsetY)
    const cached = this._cacheEnabled && w > 0 && h > 0;
    this.pixelOriginX = cached ? -ex.offsetX : 0;
    this.pixelOriginY = cached ? -ex.offsetY : 0;

    ctx.save();
    ctx.translate(x, y);

    // drawContent：在容器局部坐标系下应用变换 + 背景/边框/裁剪 + 内部坐标空间绘制
    this._drawWithCache(ctx, w, h, (cctx, cw, ch) => {
      cctx.save();

      // 变换（围绕中心）
      const cx = cw * this.centerX;
      const cy = ch * this.centerY;
      cctx.translate(cx, cy);
      cctx.rotate(this.rotation);
      cctx.scale(this.scaleX, this.scaleY);
      cctx.translate(-cx, -cy);

      // 滤镜
      const filterStr = this.buildFilterString();
      if (filterStr !== 'none') cctx.filter = filterStr;

      // 背景/边框
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

      // 裁剪
      if (this.clip) {
        cctx.beginPath();
        cctx.roundRect(0, 0, cw, ch, this.borderRadius);
        cctx.clip();
      }

      // 进入内部坐标空间
      cctx.scale(sx, sy);
      this.drawContent(cctx, sx, sy, 0);

      // 应用画板蒙版：用另一个画板的亮度控制本画板透明度
      if (this.maskBoard) {
        this.applyMaskBoard(cctx, cw, ch);
      }

      cctx.restore();
    }, ex);

    ctx.restore();
  }

  /**
   * 绘制画板内容（内部坐标空间）。
   * 供 draw() 和图案预渲染 renderToCanvas() 复用。
   */
  private drawContent(ctx: CanvasRenderingContext2D, sx: number, sy: number, depth: number) {
    for (const cmd of this.commands) {
      this.renderCommand(ctx, cmd, sx, sy, depth);
    }
    // 子项在内部坐标空间中绘制（百分比相对于内部大小）
    for (const child of this.children) {
      if (typeof (child as any).draw === 'function') {
        (child as any).draw(ctx, this.innerWidth, this.innerHeight);
      }
    }
  }

  private renderCommand(ctx: CanvasRenderingContext2D, cmd: DrawCommand, sx: number, sy: number, depth: number) {
    if (cmd.type === 'shape') {
      const pts = cmd.points;
      if (pts.length < 2) return;

      // 包围盒
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [px, py] of pts) {
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
      const bbox = { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };

      // ---- 填充 ----
      if (cmd.fill.kind !== 'none') {
        ctx.save();
        this.buildPath(ctx, pts, cmd.closed);
        ctx.clip('nonzero');
        this.paintFill(ctx, cmd.fill, bbox, sx, sy, depth);
        ctx.restore();
      }

      // ---- 描边 ----
      this.paintStroke(ctx, pts, cmd.closed, cmd.stroke, sx, sy);
    } else if (cmd.type === 'maskPush') {
      // 推入遮罩：后续绘制只在路径区域内可见
      ctx.save();
      this.buildPath(ctx, cmd.points, cmd.closed);
      ctx.clip('nonzero');
    } else if (cmd.type === 'maskPop') {
      // 弹出遮罩：恢复到遮罩前的状态
      ctx.restore();
    } else if (cmd.type === 'text') {
      // 绘制文字
      ctx.save();
      ctx.font = cmd.font;
      ctx.textAlign = cmd.align;
      ctx.textBaseline = cmd.baseline;

      const lines = cmd.text.split('\n');
      const lineH = cmd.fontSize * cmd.lineHeight;

      for (let i = 0; i < lines.length; i++) {
        const ly = cmd.y + i * lineH;

        // 描边
        if (cmd.stroke) {
          ctx.strokeStyle = cmd.stroke.color;
          ctx.lineWidth = cmd.stroke.lineWidth;
          ctx.lineCap = cmd.stroke.roundCap ? 'round' : 'butt';
          if (cmd.stroke.dash.length > 0) ctx.setLineDash(cmd.stroke.dash);
          else ctx.setLineDash([]);
          ctx.strokeText(lines[i], cmd.x, ly);
        }

        // 填充
        if (cmd.fill.kind !== 'none') {
          const bbox = this.textBBox(lines[i], cmd);
          ctx.save();
          // 用 clip 把文字形状作为填充区域（仅对纯色有效；渐变/图案需要更复杂处理）
          // 简化：纯色直接 fillText；非纯色用路径裁剪
          if (cmd.fill.kind === 'color') {
            ctx.fillStyle = (cmd.fill as any).color;
            ctx.fillText(lines[i], cmd.x, ly);
          } else {
            // 渐变/图案/噪波填充：先画文字到临时 canvas 取 alpha，再合成
            this.paintTextFill(ctx, lines[i], cmd.fill, bbox, sx, sy);
          }
          ctx.restore();
        }
      }
      ctx.restore();
    } else if (cmd.type === 'filter') {
      // 应用滤镜：将当前画板内容渲染到离屏 canvas，处理后再绘制回来
      this.applyFilterCommand(ctx, cmd.filterType, cmd.opts, sx, sy);
    }
  }

  /** 对当前画板内容应用像素级滤镜 */
  private applyFilterCommand(
    ctx: CanvasRenderingContext2D,
    filterType: FilterType,
    opts: any,
    sx: number,
    sy: number
  ) {
    const w = Math.max(1, Math.round(this.innerWidth * Math.abs(sx)));
    const h = Math.max(1, Math.round(this.innerHeight * Math.abs(sy)));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const fctx = canvas.getContext('2d')!;

    // 将当前画板内容复制到离屏 canvas
    // 注意：ctx 在缓存位图空间（getImageData 不受变换影响），内容区域原点为 pixelOrigin
    try {
      const dx = this.pixelOriginX;
      const dy = this.pixelOriginY;
      const imgData = ctx.getImageData(dx, dy, w, h);
      applyFilterToImageData(imgData, filterType, opts);
      fctx.putImageData(imgData, 0, 0);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(canvas, dx, dy);
      ctx.restore();
    } catch (e) {
      // canvas 可能被污染，忽略滤镜
      console.warn('滤镜应用失败:', e);
    }
  }

  /**
   * 应用画板蒙版：将 maskBoard 渲染到离屏 canvas，
   * 用其亮度（按 channel 取）作为本画板内容的 alpha 系数。
   * 在 drawContent 绘制完成后、cctx.restore 之前调用（cctx 处于未缩放的像素空间）。
   */
  private applyMaskBoard(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    if (!this.maskBoard) return;
    const w = Math.max(1, Math.round(cw));
    const h = Math.max(1, Math.round(ch));

    // 渲染蒙版画板到离屏 canvas。
    // 临时将 maskBoard 的位置/尺寸设为铺满父容器，确保蒙版内容覆盖整个画板。
    const mask = this.maskBoard;
    const savedX = mask.x, savedY = mask.y, savedW = mask.width, savedH = mask.height;
    const savedXMode = mask.xMode, savedYMode = mask.yMode, savedWMode = mask.wMode, savedHMode = mask.hMode;
    mask.x = 0; mask.y = 0; mask.width = w; mask.height = h;
    mask.xMode = 'pixel'; mask.yMode = 'pixel'; mask.wMode = 'pixel'; mask.hMode = 'pixel';

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mctx = maskCanvas.getContext('2d')!;
    mask.draw(mctx, w, h);

    // 恢复 maskBoard 原始位置/尺寸
    mask.x = savedX; mask.y = savedY; mask.width = savedW; mask.height = savedH;
    mask.xMode = savedXMode; mask.yMode = savedYMode; mask.wMode = savedWMode; mask.hMode = savedHMode;

    try {
      const dx = this.pixelOriginX;
      const dy = this.pixelOriginY;
      const contentData = ctx.getImageData(dx, dy, w, h);
      const maskData = mctx.getImageData(0, 0, w, h);
      const cd = contentData.data;
      const md = maskData.data;

      for (let i = 0; i < cd.length; i += 4) {
        const mr = md[i], mg = md[i + 1], mb = md[i + 2], ma = md[i + 3];
        let lum: number;
        switch (this.maskChannel) {
          case 'red': lum = mr; break;
          case 'green': lum = mg; break;
          case 'blue': lum = mb; break;
          case 'alpha': lum = ma; break;
          default: lum = (mr * 299 + mg * 587 + mb * 114) / 1000;
        }
        // 用预乘亮度（考虑蒙版自身 alpha），使透明背景等价于黑色蒙版
        const effectiveLum = lum * (ma / 255);
        const maskAlpha = this.maskInvert ? 1 - effectiveLum / 255 : effectiveLum / 255;
        cd[i + 3] = Math.round(cd[i + 3] * maskAlpha);
      }
      ctx.putImageData(contentData, dx, dy);
    } catch (e) {
      console.warn('画板蒙版应用失败:', e);
    }
  }

  private buildPath(ctx: CanvasRenderingContext2D, pts: Pt[], closed: boolean) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    if (closed) ctx.closePath();
  }

  // ===================== 描边渲染 =====================

  private paintStroke(ctx: CanvasRenderingContext2D, pts: Pt[], closed: boolean, snap: StrokeSnap, sx: number, sy: number) {
    // 构造折线（闭合则追加末段）
    const poly: Pt[] = pts.map(p => [p[0], p[1]] as Pt);
    if (closed) poly.push([pts[0][0], pts[0][1]]);

    // 累计长度
    const segLen: number[] = [];
    const segStart: number[] = [];
    let total = 0;
    for (let i = 0; i < poly.length - 1; i++) {
      const l = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]);
      segLen.push(l);
      segStart.push(total);
      total += l;
    }
    if (total <= 0) return;

    const pointAt = (d: number): Pt => {
      if (d <= 0) return [poly[0][0], poly[0][1]];
      if (d >= total) return [poly[poly.length - 1][0], poly[poly.length - 1][1]];
      for (let i = 0; i < segLen.length; i++) {
        if (d <= segStart[i] + segLen[i]) {
          const t = segLen[i] > 0 ? (d - segStart[i]) / segLen[i] : 0;
          return [
            poly[i][0] + (poly[i + 1][0] - poly[i][0]) * t,
            poly[i][1] + (poly[i + 1][1] - poly[i][1]) * t,
          ];
        }
      }
      return [poly[poly.length - 1][0], poly[poly.length - 1][1]];
    };

    // 虚线相位（在折线段之间连续延续）
    const dashAt = (d: number): boolean => {
      if (snap.dash.length === 0 || snap.dashTotal <= 0) return true;
      const m = d % snap.dashTotal;
      let acc = 0;
      for (let i = 0; i < snap.dash.length; i++) {
        if (m < acc + snap.dash[i]) return i % 2 === 0;
        acc += snap.dash[i];
      }
      return true;
    };

    const colorAt = (d: number): string => {
      if (snap.gradient) return gradientColor(snap.gradient, d / total);
      if (snap.cycle && snap.cycleTotal > 0) {
        const m = d % snap.cycleTotal;
        let acc = 0;
        for (const c of snap.cycle) {
          if (m < acc + c.length) return c.color;
          acc += c.length;
        }
        return snap.cycle[snap.cycle.length - 1].color;
      }
      return snap.color;
    };

    ctx.lineWidth = snap.lineWidth;
    ctx.lineCap = snap.roundCap ? 'round' : 'butt';
    ctx.lineJoin = snap.roundCap ? 'round' : 'miter';

    // 分块长度（内部单位，约合 2 设备像素，保证渐变平滑）
    const scale = Math.min(Math.abs(sx), Math.abs(sy));
    const chunk = scale > 0 ? Math.max(0.5, 2 / scale) : 2;

    let d = 0;
    let guard = 0;
    while (d < total && guard++ < 1000000) {
      let end = d + chunk;
      // 对齐虚线边界
      if (snap.dash.length > 0 && snap.dashTotal > 0) {
        const m = d % snap.dashTotal;
        let acc = 0;
        for (let i = 0; i < snap.dash.length; i++) {
          acc += snap.dash[i];
          if (m < acc) {
            end = Math.min(end, d + (acc - m));
            break;
          }
        }
      }
      if (end <= d) end = d + chunk; // 防御死循环
      end = Math.min(end, total);

      if (dashAt(d)) {
        const a = pointAt(d);
        const b = pointAt(end);
        ctx.strokeStyle = colorAt((d + end) / 2);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      d = end;
    }
  }

  // ===================== 填充渲染 =====================

  private paintFill(
    ctx: CanvasRenderingContext2D,
    fill: FillState,
    bbox: { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number },
    sx: number,
    sy: number,
    depth: number
  ) {
    switch (fill.kind) {
      case 'color': {
        ctx.fillStyle = fill.color;
        ctx.fillRect(bbox.minX - 1, bbox.minY - 1, bbox.w + 2, bbox.h + 2);
        break;
      }
      case 'gradient': {
        const canvas = this.getIdwGradientCanvas(fill.points, bbox, sx, sy);
        if (canvas) {
          ctx.drawImage(canvas, bbox.minX, bbox.minY, bbox.w, bbox.h);
        }
        break;
      }
      case 'pattern': {
        if (depth > 8) break; // 防止图案互相引用导致无限递归
        const targetW = Math.max(1, Math.round(this.innerWidth * Math.abs(sx)));
        const targetH = Math.max(1, Math.round(this.innerHeight * Math.abs(sy)));
        const canvas = fill.source.renderToCanvas(targetW, targetH, depth + 1);
        if (canvas) this.paintSourceFill(ctx, canvas, fill.transform);
        break;
      }
      case 'image': {
        const img = getCachedImage(fill.src);
        if (img) this.paintSourceFill(ctx, img, fill.transform);
        break;
      }
      case 'noise': {
        const devW = Math.max(1, Math.round(bbox.w * Math.abs(sx)));
        const devH = Math.max(1, Math.round(bbox.h * Math.abs(sy)));
        const noiseCanvas = generateNoiseCanvas({ ...fill.opts, width: devW, height: devH });
        ctx.drawImage(noiseCanvas, bbox.minX, bbox.minY, bbox.w, bbox.h);
        break;
      }
    }
  }

  /**
   * 图案/图像填充的统一绘制（stretch / tile）
   */
  private paintSourceFill(
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    t: NormFillTransform
  ) {
    const baseW = this.innerWidth;
    const baseH = this.innerHeight;

    let kx = t.scaleX ?? 1;
    let ky = t.scaleY ?? 1;

    ctx.save();
    ctx.translate(t.offsetX, t.offsetY);
    ctx.rotate(t.rotation);

    if (t.mode === 'stretch') {
      // null 缩放：自动覆盖画板
      if (kx === null || ky === null) {
        const cover = Math.SQRT2; // 旋转45°时仍可覆盖
        if (kx === null) kx = cover;
        if (ky === null) ky = cover;
      }
      ctx.scale(kx, ky);
      ctx.drawImage(source, -baseW / 2, -baseH / 2, baseW, baseH);
    } else {
      // tile 平铺
      if (kx === null || ky === null) { kx = 1; ky = 1; }
      const stepX = baseW * kx;
      const stepY = baseH * ky;
      const span = Math.hypot(baseW, baseH) * 1.5;

      let nx = t.repeatX ?? Math.ceil(span / Math.max(Math.abs(stepX), 1e-6)) + 1;
      let ny = t.repeatY ?? Math.ceil(span / Math.max(Math.abs(stepY), 1e-6)) + 1;
      nx = Math.max(1, Math.min(nx, 200));
      ny = Math.max(1, Math.min(ny, 200));
      // 总量安全上限
      if (nx * ny > 10000) {
        const k = Math.sqrt(10000 / (nx * ny));
        nx = Math.max(1, Math.floor(nx * k));
        ny = Math.max(1, Math.floor(ny * k));
      }

      ctx.scale(kx, ky);
      const startX = -Math.floor(nx / 2);
      const startY = -Math.floor(ny / 2);
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const gx = (startX + i) * baseW;
          const gy = (startY + j) * baseH;
          ctx.drawImage(source, gx - baseW / 2, gy - baseH / 2, baseW, baseH);
        }
      }
    }
    ctx.restore();
  }

  /**
   * 多点平面渐变：距离反比加权混色（IDW）
   * 低分辨率计算后平滑放大，结果按尺寸缓存
   */
  private getIdwGradientCanvas(
    points: FillGradientPoint[],
    bbox: { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number },
    sx: number,
    sy: number
  ): HTMLCanvasElement | null {
    const devW = Math.max(1, Math.round(bbox.w * Math.abs(sx)));
    const devH = Math.max(1, Math.round(bbox.h * Math.abs(sy)));
    const key = `${devW}x${devH}|` + points
      .map(p => `${Math.round((p.x - bbox.minX) * sx)},${Math.round((p.y - bbox.minY) * sy)},${p.color}`)
      .join(';');

    const cached = this.gradientFillCache.get(key);
    if (cached) return cached;

    const rgbaPts = points.map(p => ({
      x: (p.x - bbox.minX) * sx,
      y: (p.y - bbox.minY) * sy,
      c: hexToRgba(p.color),
    }));

    // 低分辨率网格
    const step = Math.max(2, Math.round(Math.min(devW, devH) / 72));
    const gw = Math.max(1, Math.ceil(devW / step));
    const gh = Math.max(1, Math.ceil(devH / step));

    const grid = document.createElement('canvas');
    grid.width = gw;
    grid.height = gh;
    const gctx = grid.getContext('2d');
    if (!gctx) return null;
    const imgData = gctx.createImageData(gw, gh);
    const data = imgData.data;

    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const px = x * step + step / 2;
        const py = y * step + step / 2;
        let wr = 0, wg = 0, wb = 0, wa = 0, wsum = 0;
        for (const p of rgbaPts) {
          const dx = px - p.x;
          const dy = py - p.y;
          const d2 = dx * dx + dy * dy + 0.01;
          const w = 1 / (d2 * Math.sqrt(d2)); // d^-3
          wr += w * p.c[0]; wg += w * p.c[1]; wb += w * p.c[2]; wa += w * p.c[3];
          wsum += w;
        }
        const idx = (y * gw + x) * 4;
        data[idx] = Math.round(wr / wsum);
        data[idx + 1] = Math.round(wg / wsum);
        data[idx + 2] = Math.round(wb / wsum);
        data[idx + 3] = Math.round((wa / wsum) * 255);
      }
    }
    gctx.putImageData(imgData, 0, 0);

    // 平滑放大到目标尺寸
    const out = document.createElement('canvas');
    out.width = devW;
    out.height = devH;
    const octx = out.getContext('2d');
    if (!octx) return null;
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(grid, 0, 0, devW, devH);

    this.gradientFillCache.set(key, out);
    return out;
  }

  /**
   * 将画板内容预渲染到离屏画布（用于填充图案）。
   * 画板自身的位置/旋转/边框不参与，仅渲染内部坐标空间的内容。
   * 结果按尺寸和图片缓存版本缓存。
   */
  renderToCanvas(w: number, h: number, depth: number = 0): HTMLCanvasElement | null {
    if (this.patternCache && this.patternCache.w === w && this.patternCache.h === h && this.patternCache.version === imageVersion) {
      return this.patternCache.canvas;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const sx = w / this.innerWidth;
    const sy = h / this.innerHeight;
    // 独立离屏画布：内容原点为 (0,0)
    this.pixelOriginX = 0;
    this.pixelOriginY = 0;
    ctx.save();
    ctx.scale(sx, sy);
    this.drawContent(ctx, sx, sy, depth);
    ctx.restore();

    this.patternCache = { w, h, version: imageVersion, canvas };
    return canvas;
  }
}
