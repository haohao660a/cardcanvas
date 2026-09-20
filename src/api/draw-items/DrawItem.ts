// src/api/draw-items/DrawItem.ts

/** 位置/尺寸单位模式 */
export type UnitMode = 'pixel' | 'percent';

/** 颜色支持透明度（#RRGGBBAA 或 #RGBA） */
export type Color = string;

/** 对齐方式 */
export type Align = 'start' | 'center' | 'end';

/** 基础绘制项接口 */
export interface DrawItem {
  type: string;
  // 位置（相对于父容器），支持数字或字符串百分比（如 "50%"）
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  // 单位模式
  xMode: UnitMode;
  yMode: UnitMode;
  wMode: UnitMode;
  hMode: UnitMode;
  // 锚点（对齐中心），默认 {0,0} 即左上角；支持数字或字符串百分比
  anchorX: number | string;
  anchorY: number | string;
  anchorXMode: UnitMode;
  anchorYMode: UnitMode;
  // 设置百分比（内部会切换模式）
  setPositionPercent(x: number, y: number): void;
  setSizePercent(w: number, h: number): void;
  // 设置像素
  setPositionPixel(x: number, y: number): void;
  setSizePixel(w: number, h: number): void;
  resolveSize(value: number | string, mode: UnitMode, parentSize: number): number;
  // 绘制方法（由子类实现）
  draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number): void;
}

/** 基础抽象类，实现通用逻辑 */
export abstract class BaseDrawItem implements DrawItem {
  type: string = 'base';
  x: number | string = 0;
  y: number | string = 0;
  width: number | string = 0;
  height: number | string = 0;
  xMode: UnitMode = 'pixel';
  yMode: UnitMode = 'pixel';
  wMode: UnitMode = 'pixel';
  hMode: UnitMode = 'pixel';
  // 锚点（对齐中心）：默认 {0,0} 左上角，即物体从位置向右下延伸
  // 设为 {0.5,0.5} + percent 模式时，物体中心对齐到位置（向四周延伸）
  anchorX: number | string = 0;
  anchorY: number | string = 0;
  anchorXMode: UnitMode = 'pixel';
  anchorYMode: UnitMode = 'pixel';

  // ===================== 容器缓存 =====================
  /** 是否开启缓存 */
  protected _cacheEnabled = false;
  /** 离屏缓存画布 */
  protected _cacheCanvas: HTMLCanvasElement | null = null;
  /** 缓存是否需要重新渲染（脏标记） */
  protected _cacheDirty = true;

  /** 开启缓存：后续 draw 时将子项渲染到离屏 canvas，再 drawImage 输出，加速复杂图形重复绘制 */
  enableCache(): this {
    this._cacheEnabled = true;
    this._cacheDirty = true;
    return this;
  }

  /** 关闭缓存 */
  disableCache(): this {
    this._cacheEnabled = false;
    this._cacheCanvas = null;
    this._cacheDirty = true;
    return this;
  }

  /** 刷新缓存：标记缓存为脏，下次 draw 时重新渲染（子项属性变更后调用） */
  refreshCache(): this {
    if (this._cacheEnabled) this._cacheDirty = true;
    return this;
  }

  /** 缓存是否已就绪（已开启、已渲染、未脏） */
  get isCacheReady(): boolean {
    return this._cacheEnabled && this._cacheCanvas !== null && !this._cacheDirty;
  }

  /**
   * 缓存包裹的绘制方法（容器类内部调用）。
   *
   * drawContent 回调负责在传入的 ctx 上应用所有变换并绘制完整内容
   * （背景、边框、裁剪、子项等），坐标系相对于 ctx 原点 (0,0)~(w,h)。
   *
   * - 未开启缓存：直接调用 drawContent(ctx) —— 与普通容器完全一致
   * - 开启缓存首次/脏：创建离屏 canvas（w×h），在 cctx 上调用 drawContent 渲染，
   *   然后 drawImage 输出到原始 ctx
   * - 开启缓存已就绪：直接 drawImage 输出缓存
   *
   * @param ctx         目标绘制上下文（已 translate 到容器位置）
   * @param w           缓存画布宽度
   * @param h           缓存画布高度
   * @param drawContent 回调：在传入的 ctx 上应用变换并绘制内容
   */
  protected _drawWithCache(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    drawContent: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    expansion?: { offsetX: number; offsetY: number; width: number; height: number },
  ) {
    if (!this._cacheEnabled || w <= 0 || h <= 0) {
      drawContent(ctx, w, h);
      return;
    }
    // 缓存区域：默认覆盖 (0,0)~(w,h)；传入 expansion 时扩展到变换后包围盒等更大区域，
    // 避免旋转/缩放后的内容被缓存画布位图边界裁剪（与 clip 属性无关的硬裁剪）
    const ex = expansion ?? { offsetX: 0, offsetY: 0, width: w, height: h };
    const W = Math.max(1, Math.round(ex.width));
    const H = Math.max(1, Math.round(ex.height));
    const needRender =
      this._cacheDirty ||
      !this._cacheCanvas ||
      this._cacheCanvas.width !== W ||
      this._cacheCanvas.height !== H;
    if (needRender) {
      if (!this._cacheCanvas) this._cacheCanvas = document.createElement('canvas');
      this._cacheCanvas.width = W;
      this._cacheCanvas.height = H;
      const cctx = this._cacheCanvas.getContext('2d')!;
      cctx.clearRect(0, 0, W, H);
      // 内容仍按局部坐标 (0,0)~(w,h) 绘制，先平移映射到扩展缓存中的对应位置
      cctx.translate(-ex.offsetX, -ex.offsetY);
      drawContent(cctx, w, h);
      this._cacheDirty = false;
    }
    // 按扩展区域的局部尺寸回贴（补偿缓存像素取整）
    ctx.drawImage(this._cacheCanvas!, ex.offsetX, ex.offsetY, ex.width, ex.height);
  }

  setPositionPercent(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.xMode = 'percent';
    this.yMode = 'percent';
  }

  setPositionPixel(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.xMode = 'pixel';
    this.yMode = 'pixel';
  }

  setSizePercent(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.wMode = 'percent';
    this.hMode = 'percent';
  }

  setSizePixel(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.wMode = 'pixel';
    this.hMode = 'pixel';
  }

  /**
   * 将位置/尺寸转换为像素值（相对于父容器尺寸）。
   * 支持数字（pixel 或 percent 模式）和字符串百分比（如 '100%'、'50%'）。
   */
  public resolveSize(value: number | string, mode: UnitMode, parentSize: number): number {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.endsWith('%')) {
        const pct = parseFloat(trimmed) / 100;
        if (!isNaN(pct)) return pct * parentSize;
      }
      const num = parseFloat(trimmed);
      return isNaN(num) ? 0 : num;
    }
    return mode === 'percent' ? value * parentSize : value;
  }

  /**
   * 解析位置/尺寸并应用锚点偏移，返回最终绘制矩形。
   * 锚点偏移相对于物体自身宽高（0=左/上, 0.5=中心, 1=右/下, 允许超出范围）。
   */
  public resolveRect(parentWidth: number, parentHeight: number): { x: number; y: number; w: number; h: number } {
    const px = this.resolveSize(this.x, this.xMode, parentWidth);
    const py = this.resolveSize(this.y, this.yMode, parentHeight);
    const w = this.resolveSize(this.width, this.wMode, parentWidth);
    const h = this.resolveSize(this.height, this.hMode, parentHeight);
    // 锚点偏移：相对于物体自身宽高
    const ax = this.resolveSize(this.anchorX, this.anchorXMode, w);
    const ay = this.resolveSize(this.anchorY, this.anchorYMode, h);
    return { x: px - ax, y: py - ay, w, h };
  }

  /** 设置锚点（像素坐标，默认 {0,0} 左上角） */
  setAnchor(x: number, y: number = x): this {
    this.anchorX = x;
    this.anchorY = y;
    this.anchorXMode = 'pixel';
    this.anchorYMode = 'pixel';
    return this;
  }

  /** 设置锚点（百分比，0=左/上, 0.5=中心, 1=右/下） */
  setAnchorPercent(x: number, y: number = x): this {
    this.anchorX = x;
    this.anchorY = y;
    this.anchorXMode = 'percent';
    this.anchorYMode = 'percent';
    return this;
  }

  /** 子类实现具体绘制 */
  abstract draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number): void;
}