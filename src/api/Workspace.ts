/** 自定义卡牌区域定义（位置/大小支持像素数字或百分比字符串如 "50%"） */
export interface CustomCardDef {
  x: number | string;
  y: number | string;
  w: number | string;
  h: number | string;
  /** 指定 id 时直接使用该 id（不参与分配）；null 时按添加顺序自动分配 */
  id?: number | null;
}

export interface PageConfig {
  width: number
  height: number
  margin: { top: number; bottom: number; left: number; right: number }
  cardSize: { width: number; height: number }
  cardCount: number | null
  grid: { cols: number | null; rows: number | null }
  cardHGap?: number | null; // 水平间距
  cardVGap?: number | null; // 垂直间距
  background: string;
  hGapEdges?: boolean; // 是否在水平方向两端也添加间隙
  vGapEdges?: boolean; // 是否在垂直方向两端也添加间隙
  /** 该页卡牌使用的绘制函数名（脚本中定义的顶层 function），省略时使用 main */
  draw?: string;
  /** 整页绘制函数名（脚本中定义的顶层 function）。提供时对整个页面区域（含边距）绘制 */
  drawFullPage?: string;
  /** 索引名称：通过该名称可定位页面（允许同名，按添加顺序取第一个含指定卡牌的页面） */
  indexName?: string;
  /** 是否为后台页（后台页不参与预览/导出/打印，独立 id 分配，总在普通页之前绘制） */
  isBackground?: boolean;
  /** 水平排列方向：'ltr' 从左到右（默认）| 'rtl' 从右到左。决定 col=0 在左还是右 */
  hDirection?: 'ltr' | 'rtl';
  /** 垂直排列方向：'ttb' 从上到下（默认）| 'btt' 从下到上。决定 row=0 在上还是下 */
  vDirection?: 'ttb' | 'btt';
  /** 卡牌排列顺序：'row-first' 行优先（默认）| 'col-first' 列优先。决定 id 按行还是按列分配 */
  cardOrder?: 'row-first' | 'col-first';
  /**
   * 整个网格块在页面内容区（边距内）中的水平对齐：
   * 'left' 左对齐（默认）| 'center' 居中 | 'right' 右对齐。
   * 牌背双面打印长边翻转时，背面页可设为 'right' 使卡牌靠右对齐。
   * 卡牌尺寸自动撑满时无可见效果（无剩余空间）。
   */
  alignX?: 'left' | 'center' | 'right';
  /**
   * 整个网格块在页面内容区（边距内）中的垂直对齐：
   * 'top' 顶部对齐（默认）| 'middle' 居中 | 'bottom' 底部对齐。
   * 卡牌尺寸自动撑满时无可见效果（无剩余空间）。
   */
  alignY?: 'top' | 'middle' | 'bottom';
  /** 是否启用网格划分生成卡牌（默认 true）。设为 false 时仅生成自定义卡牌 */
  useGrid?: boolean;
  /** 自定义卡牌区域列表（与网格划分独立，可在网格开启时使用，允许重叠） */
  customCards?: CustomCardDef[];
  /**
   * 添加一个自定义卡牌区域（等效于向 customCards 追加，可在网格划分开启时使用）。
   * 位置/大小支持像素数字或百分比字符串。应在 addPage 之前调用。
   */
  addCard?: (x: number | string, y: number | string, w: number | string, h: number | string, id?: number | null) => void;
  tags?: Record<string, string>; // 键值对，用于存储和传递信息
  /**
   * 整页绘制函数添加的 DrawItem 列表（内部使用，由 App.vue 在调用 drawFullPage 后填充）。
   * 这些项在卡牌之前绘制，覆盖整个页面区域 (0,0)~(width,height)。
   * @internal
   */
  pageItems?: any[];
}

/** 页面元数据（内部使用） */
interface PageMeta {
  /** 分配给该页面的页号（统一计数器，前后台共享以避免冲突） */
  pageIndex: number;
  /** 该前台页之前是否调用了 resetId */
  idResetBefore: boolean;
  /** 是否为后台页 */
  isBackground: boolean;
  /** 该后台页之前是否调用了 resetBackgroundId */
  bgIdResetBefore: boolean;
}

export class Workspace {
  /** 前台页面 */
  private frontPages: PageConfig[] = []
  /** 后台页面（绘制顺序总在普通页之前） */
  private bgPages: PageConfig[] = []
  /** 统一页号计数器（前台+后台共用，保证 pageIndex 全局唯一） */
  private _pageCounter = 0
  /** 前台 id 计数器 */
  private _idCounter = 0
  /** 后台 id 计数器（独立于前台） */
  private _bgIdCounter = 0
  /** 前台 id 重置标志：置位后下一个 addPage 消费 */
  private _idResetFlag = false
  /** 后台 id 重置标志：置位后下一个 addBackgroundPage 消费 */
  private _bgIdResetFlag = false
  /** 每个前台页对应的 idResetBefore 标志（与 frontPages 对齐） */
  private _frontIdResetFlags: boolean[] = []
  /** 每个后台页对应的 bgIdResetBefore 标志（与 bgPages 对齐） */
  private _bgIdResetFlags: boolean[] = []

  /** 总页数（前台 + 后台） */
  get totalPages(): number { return this.frontPages.length + this.bgPages.length }

  /** 前台页数 */
  get totalFrontPages(): number { return this.frontPages.length }

  /** 后台页数 */
  get totalBackgroundPages(): number { return this.bgPages.length }

  /** 前台 id 计数器值（已分配的最大 id + 1） */
  get idCounter(): number { return this._idCounter }
  set idCounter(value: number) { this._idCounter = value }

  /** 后台 id 计数器值 */
  get bgIdCounter(): number { return this._bgIdCounter }
  set bgIdCounter(value: number) { this._bgIdCounter = value }

  /** 当前页计数器值（下一个页面的页号，前后台共用） */
  get pageCounter(): number { return this._pageCounter }

  createPage(config: Partial<PageConfig>): PageConfig {
    const pg: PageConfig = {
      width: 2480,
      height: 3508,
      margin: { top: 30, bottom: 30, left: 30, right: 30 },
      cardSize: { width: 0, height: 0 },
      cardCount: null,
      grid: { cols: null, rows: null },
      background: '#0a1e3a',
      cardHGap: 20,
      cardVGap: 20,
      hGapEdges: false,
      vGapEdges: false,
      useGrid: true,
      customCards: [],
      tags: {},
      ...config,
    }
    // 挂载 addCard 方法：向本页配置追加自定义卡牌区域（addPage 时会克隆数据并剥离该方法）
    pg.addCard = (x, y, w, h, id = null) => {
      if (!pg.customCards) pg.customCards = []
      pg.customCards.push({ x, y, w, h, id })
    }
    return pg
  }

  /**
   * 创建一个后台页面配置（默认透明背景，参与独立 id 分配）。
   * 后台页不参与预览/导出/打印，但可被截取图块/砖块画板引用作为素材。
   */
  createBackgroundPage(config: Partial<PageConfig>): PageConfig {
    return this.createPage({
      background: 'transparent',
      isBackground: true,
      ...config,
    })
  }

  /** 添加普通（前台）页面 */
  addPage(pageConfig: PageConfig): void {
    // addCard 是运行时方法，无法 structuredClone；数据（customCards）已在配置对象中
    const { addCard: _fn, ...data } = pageConfig as PageConfig & Record<string, unknown>
    const pg = structuredClone(data) as PageConfig
    pg.isBackground = false
    this.frontPages.push(pg)
    this._frontIdResetFlags.push(this._idResetFlag)
    this._idResetFlag = false
    this._pageCounter++
  }

  /**
   * 添加后台页面。
   * 后台页无论加入顺序，总在普通页之前绘制；其卡牌使用独立 id 分配（与前台分开）。
   */
  addBackgroundPage(pageConfig: PageConfig): void {
    const { addCard: _fn, ...data } = pageConfig as PageConfig & Record<string, unknown>
    const pg = structuredClone(data) as PageConfig
    pg.isBackground = true
    this.bgPages.push(pg)
    this._bgIdResetFlags.push(this._bgIdResetFlag)
    this._bgIdResetFlag = false
    this._pageCounter++
  }

  /**
   * 重置前台 id 计数器。
   * 下一个添加的【前台】页面中，卡牌 id 从 0 开始计数。
   */
  resetId(): void {
    this._idResetFlag = true
    this._idCounter = 0
  }

  /**
   * 重置后台 id 计数器。
   * 下一个添加的【后台】页面中，卡牌 id 从 0 开始计数。
   * 注意：后台页与前台页的 id 分配完全独立。
   */
  resetBackgroundId(): void {
    this._bgIdResetFlag = true
    this._bgIdCounter = 0
  }

  /** 重置页计数器。下一个添加的页面索引从 0 开始（影响前后台统一计数器）。 */
  resetPage(): void {
    this._pageCounter = 0
  }

  /** 同时重置前台 id 计数器和页计数器。 */
  reset(): void {
    this.resetId()
    this.resetPage()
  }

  /**
   * 获取指定页面（合并数组中按数组索引）的元数据。
   * 合并顺序：后台页在前，前台页在后。
   * @internal 供内部卡牌生成使用
   */
  getPageMeta(arrayIndex: number): PageMeta {
    const bgCount = this.bgPages.length
    if (arrayIndex < bgCount) {
      return {
        pageIndex: arrayIndex,
        idResetBefore: false,
        isBackground: true,
        bgIdResetBefore: this._bgIdResetFlags[arrayIndex] ?? false,
      }
    }
    const frontIdx = arrayIndex - bgCount
    return {
      pageIndex: arrayIndex,
      idResetBefore: this._frontIdResetFlags[frontIdx] ?? false,
      isBackground: false,
      bgIdResetBefore: false,
    }
  }

  /**
   * 获取合并后的页面列表（后台页在前，前台页在后）。
   * 绘制/预览时按此顺序处理；后台页会被 Preview 过滤不显示。
   */
  getPages(): PageConfig[] {
    return [...this.bgPages, ...this.frontPages]
  }

  /** 仅获取前台页面 */
  getFrontPages(): PageConfig[] {
    return this.frontPages
  }

  /** 仅获取后台页面 */
  getBackgroundPages(): PageConfig[] {
    return this.bgPages
  }

  /**
   * 在指定上下文中执行一段用户代码字符串并返回其结果。
   *
   * 支持两种写法：
   *   1. 表达式形式（自动返回值）：`card.width + 20`
   *   2. 函数体形式（支持 return / 多语句）：`var x = card.width; return x * 2;`
   *
   * context 中的键会作为代码可访问的局部变量。
   *
   * @param code 用户代码字符串（通常来自 CodeEditorUI 等 UI 控件的 value）
   * @param context 代码可访问的变量上下文，如 { page, card, W, H, board }
   * @returns 代码的返回值（表达式形式为表达式值；函数体形式为 return 的值）
   */
  run<T = any>(code: string, context: Record<string, any> = {}): T {
    if (code == null) return undefined as T
    const str = String(code)
    if (!str.trim()) return undefined as T
    const keys = Object.keys(context)
    const vals = keys.map(k => context[k])
    // 先尝试当作表达式执行：return (code)
    try {
      const fn = new Function(...keys, `return (${str});`)
      return fn(...vals) as T
    } catch (e) {
      if (e instanceof SyntaxError) {
        // 不是合法表达式，改为函数体执行（支持 return 语句和多语句）
        const fn = new Function(...keys, str)
        return fn(...vals) as T
      }
      throw e
    }
  }
}
