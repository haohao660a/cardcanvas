import { BaseDrawItem } from './DrawItem';

export class SvgItem extends BaseDrawItem {
  type = 'svg';
  private svgString: string = '';
  private img: HTMLImageElement | null = null;
  private loaded = false;

  constructor(opts: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; anchorX?: number | string; anchorY?: number | string; anchorXMode?: 'pixel' | 'percent'; anchorYMode?: 'pixel' | 'percent' }) {
    super();
    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;
    if (opts.width !== undefined) this.width = opts.width;
    if (opts.height !== undefined) this.height = opts.height;
    if (opts.anchorX !== undefined) this.anchorX = opts.anchorX;
    if (opts.anchorY !== undefined) this.anchorY = opts.anchorY;
    if (opts.anchorXMode !== undefined) this.anchorXMode = opts.anchorXMode;
    if (opts.anchorYMode !== undefined) this.anchorYMode = opts.anchorYMode;
  }

  // 设置SVG内容，并触发加载
  setSvg(svg: string) {
    this.svgString = this.normalizeSvg(svg);
    this.loadSvg();
  }

  /**
   * 规范化 SVG：若缺少 width/height，则从 viewBox 提取尺寸补全。
   * 浏览器对无 width/height 的 SVG 会赋予默认固有尺寸 300×150，
   * 导致 viewBox 内容被压扁到 300×150，再被 drawImage 拉伸后变形。
   */
  private normalizeSvg(svg: string): string {
    if (!svg) return svg;
    // 已有 width 和 height 则不处理
    if (/width\s*=/.test(svg) && /height\s*=/.test(svg)) return svg;
    const m = svg.match(/viewBox\s*=\s*["']\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/);
    if (!m) return svg;
    const w = parseFloat(m[3]);
    const h = parseFloat(m[4]);
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return svg;
    // 在 <svg ...> 起始标签内插入 width/height
    return svg.replace(/<svg\b/, `<svg width="${w}" height="${h}"`);
  }

  private loadSvg() {
    if (!this.svgString) return;
    const svgBlob = new Blob([this.svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    this.img = new Image();
    this.img.onload = () => {
      this.loaded = true;
      URL.revokeObjectURL(url);
      window.dispatchEvent(new CustomEvent('image-loaded', { detail: { src: 'svg' } }));
    };
    this.img.onerror = (e) => {
      console.error('SVG加载失败', e);
    };
    this.img.src = url;
  }

  draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number) {
    if (!this.loaded || !this.img) return;
    const { x, y, w, h } = this.resolveRect(parentWidth, parentHeight);
    ctx.drawImage(this.img, x, y, w, h);
  }

  // 辅助生成SVG元素的静态方法
  static rect(x: number, y: number, w: number, h: number, attrs: Record<string, string> = {}): string {
    const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${attrStr}/>`;
  }

  static circle(cx: number, cy: number, r: number, attrs: Record<string, string> = {}): string {
    const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<circle cx="${cx}" cy="${cy}" r="${r}" ${attrStr}/>`;
  }

  static line(x1: number, y1: number, x2: number, y2: number, attrs: Record<string, string> = {}): string {
    const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrStr}/>`;
  }

  static path(d: string, attrs: Record<string, string> = {}): string {
    const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<path d="${d}" ${attrStr}/>`;
  }

  static text(text: string, x: number, y: number, attrs: Record<string, string> = {}): string {
    const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<text x="${x}" y="${y}" ${attrStr}>${text}</text>`;
  }

  // 构建完整SVG文档
  static buildSvg(width: number, height: number, content: string, extraAttrs: Record<string, string> = {}): string {
    const attrStr = Object.entries(extraAttrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ${attrStr}>${content}</svg>`;
  }
}