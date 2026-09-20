// src/api/draw-items/ImageItem.ts
import { BaseDrawItem } from './DrawItem';
import type { Color } from './DrawItem';

export interface ImageOptions {
  src: string;
  strokeColor?: Color;
  lineWidth?: number;
  borderRadius?: number;
}

/** 全局待加载图片集合（供导出前等待） */
const pendingImages = new Set<string>();

/** 等待所有图片加载完成（带超时） */
export function waitForImages(timeoutMs = 5000): Promise<void> {
  if (pendingImages.size === 0) return Promise.resolve();
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (pendingImages.size === 0 || Date.now() - start > timeoutMs) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

export class ImageItem extends BaseDrawItem {
  type = 'image';
  src: string;
  strokeColor: Color;
  lineWidth: number;
  borderRadius: number;
  private img: HTMLImageElement | null = null;
  private loaded = false;
  /** 由 fetch+blob 路径创建的 Blob URL；加载完成后需调用 revokeObjectURL 释放 */
  private _createdBlobUrl: string | null = null;

  constructor(opts: ImageOptions & { x?: number | string; y?: number | string; width?: number | string; height?: number | string; anchorX?: number | string; anchorY?: number | string; anchorXMode?: 'pixel' | 'percent'; anchorYMode?: 'pixel' | 'percent' }) {
    super();
    // 兼容 Windows 反斜杠路径：统一转为正斜杠，否则浏览器无法正确解析相对路径
    this.src = opts.src.replace(/\\/g, '/');
    this.strokeColor = opts.strokeColor ?? '#000000';
    this.lineWidth = opts.lineWidth ?? 0;
    this.borderRadius = opts.borderRadius ?? 0;
    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;
    if (opts.width !== undefined) this.width = opts.width;
    if (opts.height !== undefined) this.height = opts.height;
    if (opts.anchorX !== undefined) this.anchorX = opts.anchorX;
    if (opts.anchorY !== undefined) this.anchorY = opts.anchorY;
    if (opts.anchorXMode !== undefined) this.anchorXMode = opts.anchorXMode;
    if (opts.anchorYMode !== undefined) this.anchorYMode = opts.anchorYMode;

    this.loadImage();
  }

  private loadImage() {
    this.img = new Image();
    pendingImages.add(this.src);
    this.img.onload = () => {
      this.loaded = true;
      pendingImages.delete(this.src);
      // 释放 fetch 路径创建的 Blob URL（图片已解码到内部位图，URL 不再需要）
      if (this._createdBlobUrl) {
        URL.revokeObjectURL(this._createdBlobUrl);
        this._createdBlobUrl = null;
      }
      window.dispatchEvent(new CustomEvent('image-loaded', { detail: { src: this.src } }));
    };
    this.img.onerror = () => {
      pendingImages.delete(this.src);
      // 出错时也释放 Blob URL
      if (this._createdBlobUrl) {
        URL.revokeObjectURL(this._createdBlobUrl);
        this._createdBlobUrl = null;
      }
      console.warn('Failed to load image:', this.src);
    };

    // data URL / blob URL：直接加载，不会污染 canvas
    if (this.src.startsWith('data:') || this.src.startsWith('blob:')) {
      this.img.src = this.src;
      return;
    }

    this.loadImageAsync();
  }

  /**
   * 异步加载图片，按优先级尝试三种策略：
   * 1. fetch → blob URL（http:// 开发模式，同源不污染 canvas）
   * 2. File System Access API → data URL（file:// 单文件模式，需设置根目录）
   * 3. 直接 img.src（回退：可显示但导出可能失败）
   */
  private async loadImageAsync() {
    // 策略1：fetch（http:// 模式）
    try {
      const r = await fetch(this.src);
      if (r.ok) {
        const blob = await r.blob();
        const blobUrl = URL.createObjectURL(blob);
        this._createdBlobUrl = blobUrl;
        this.img!.src = blobUrl;
        return;
      }
    } catch {
      // file:// 模式下 fetch 会抛异常（CORS 请求不是 http），继续尝试其他策略
    }

    // 策略2：File System Access API（若已通过路径选择器获得目录句柄）
    const dirHandle = (window as any).UIManager?.rootDirHandle;
    if (dirHandle) {
      try {
        const dataUrl = await this.readFileViaDirHandle(dirHandle);
        // data URL 是同源的，绘制到 canvas 不会污染
        this.img!.src = dataUrl;
        return;
      } catch (err) {
        console.warn('File System Access API failed for', this.src, err);
      }
    }

    if (location.protocol === 'file:') {
      // file:// 模式：直接加载可正常显示与打印/右键另存，
      // 但 JS 读取像素（toDataURL）会因 canvas 污染被浏览器禁止，导出按钮会自动改走浏览器通道
      console.info(`[ImageItem] file:// 模式直接加载: ${this.src}`);
    }

    // 策略3：回退直接加载（与预览显示相同的加载方式）
    this.img!.src = this.src;
  }

  /**
   * 通过 File System Access API 的目录句柄读取文件，返回 base64 data URL。
   * 导航路径中的子目录，最后用 getFileHandle 获取文件句柄。
   */
  private async readFileViaDirHandle(dirHandle: any): Promise<string> {
    const parts = this.src.replace(/\\/g, '/').split('/').filter(Boolean);
    let current = dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i]);
    }
    const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
    const file = await fileHandle.getFile();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number) {
    if (!this.loaded || !this.img) return;
    const { x, y, w, h } = this.resolveRect(parentWidth, parentHeight);

    ctx.save();
    const r = Math.min(this.borderRadius, w / 2, h / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.clip();

    ctx.drawImage(this.img, x, y, w, h);

    if (this.lineWidth > 0) {
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = this.lineWidth;
      ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
  }
}