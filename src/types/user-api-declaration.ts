export const userApiDeclaration = `
// ========== 核心 API ==========
/** 滤镜选项（RelativeContainerItem / BoardItem 使用） */
interface FilterOptions {
    blur?: number;
    brightness?: number;
    contrast?: number;
    grayscale?: number;
    hueRotate?: number;
    invert?: number;
    saturate?: number;
    sepia?: number;
    opacity?: number;
    customFilter?: string;
}

declare class Workspace {
    createPage(config: Partial<PageConfig>): PageConfig;
    /** 创建后台页面配置（默认透明背景，isBackground=true） */
    createBackgroundPage(config: Partial<PageConfig>): PageConfig;
    addPage(pageConfig: PageConfig): void;
    /** 添加后台页面（绘制顺序总在普通页之前，独立 id 分配） */
    addBackgroundPage(pageConfig: PageConfig): void;
    getPages(): PageConfig[];
    /** 仅获取前台页面 */
    getFrontPages(): PageConfig[];
    /** 仅获取后台页面 */
    getBackgroundPages(): PageConfig[];

    /**
     * 在指定上下文中执行一段用户代码字符串并返回其结果。
     * 支持表达式形式（自动返回值）和函数体形式（支持 return / 多语句）。
     * context 中的键会作为代码可访问的局部变量。
     * @param code 用户代码字符串（通常来自 CodeEditorUI 等控件的 value）
     * @param context 代码可访问的变量上下文，如 { page, card, W, H, board }
     */
    run<T = any>(code: string, context?: Record<string, any>): T;

    /** 总页数（前台 + 后台） */
    readonly totalPages: number;
    /** 前台页数 */
    readonly totalFrontPages: number;
    /** 后台页数 */
    readonly totalBackgroundPages: number;
    /** 前台 id 计数器值（已分配的最大 id + 1） */
    idCounter: number;
    /** 后台 id 计数器值（与前台独立） */
    readonly bgIdCounter: number;
    /** 当前页计数器值（下一个页面的页号，前后台共用） */
    readonly pageCounter: number;

    /** 重置前台 id 计数器，下一个添加的前台页面中卡牌 id 从 0 开始 */
    resetId(): void;
    /** 重置后台 id 计数器，下一个添加的后台页面中卡牌 id 从 0 开始（与前台独立） */
    resetBackgroundId(): void;
    /** 重置页计数器，下一个添加的页面索引从 0 开始 */
    resetPage(): void;
    /** 同时重置前台 id 计数器和页计数器 */
    reset(): void;
}

/** 自定义卡牌区域定义（位置/大小支持像素数字或百分比字符串如 "50%"） */
interface CustomCardDef {
    x: number | string;
    y: number | string;
    w: number | string;
    h: number | string;
    /** 指定 id 时直接使用该 id（不参与分配）；null 时按添加顺序自动分配 */
    id?: number | null;
}

interface PageConfig {
    width: number;
    height: number;
    margin: { top: number; bottom: number; left: number; right: number };
    cardSize: { width: number; height: number };
    cardCount: number | null;
    grid: { cols: number | null; rows: number | null };
    background: string;
    cardHGap?: number | null;
    cardVGap?: number | null;
    hGapEdges?: boolean; // 是否在水平方向两端也添加间隙
    vGapEdges?: boolean; // 是否在垂直方向两端也添加间隙
    /** 该页卡牌使用的绘制函数名（脚本中定义的顶层 function），省略时使用 main */
    draw?: string;
    /** 整页绘制函数名。提供时对整个页面区域（含边距）绘制，在卡牌之前 */
    drawFullPage?: string;
    /** 索引名称：通过名称可定位页面（允许同名，按添加顺序取第一个含指定卡牌的页面） */
    indexName?: string;
    /** 是否为后台页（不参与预览/导出/打印，独立 id，总在普通页前绘制） */
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
     * 牌背双面打印长边翻转时，背面页可设为 'right' 使卡牌靠右对齐。卡牌自动撑满时无效果。
     */
    alignX?: 'left' | 'center' | 'right';
    /**
     * 整个网格块在页面内容区（边距内）中的垂直对齐：
     * 'top' 顶部对齐（默认）| 'middle' 居中 | 'bottom' 底部对齐。卡牌自动撑满时无效果。
     */
    alignY?: 'top' | 'middle' | 'bottom';
    /** 是否启用网格划分生成卡牌（默认 true）。设为 false 时仅生成自定义卡牌 */
    useGrid?: boolean;
    /** 自定义卡牌区域列表（与网格划分独立，可在网格开启时使用，允许重叠） */
    customCards?: CustomCardDef[];
    /** 添加自定义卡牌区域（等效于 customCards 追加，可在网格开启时使用；应在 addPage 之前调用） */
    addCard?(x: number | string, y: number | string, w: number | string, h: number | string, id?: number | null): void;
    tags?: Record<string, string>; // 键值对，用于存储和传递信息
}

// 只读页面信息（计算后的实际值），绘制函数的第一个参数直接就是该对象
interface ReadOnlyPageInfo {
    readonly width: number;
    readonly height: number;
    readonly margin: { readonly top: number; readonly bottom: number; readonly left: number; readonly right: number };
    /** 实际计算后的卡牌尺寸（即使 PageConfig.cardSize 为 0，这里也是计算后的真实值） */
    readonly cardSize: { readonly width: number; readonly height: number };
    /** 实际计算后的水平间距 */
    readonly cardHGap: number;
    /** 实际计算后的垂直间距 */
    readonly cardVGap: number;
    /** 实际计算后的行列数（即使 PageConfig.grid 为 null，这里也是计算后的真实值） */
    readonly grid: { readonly cols: number; readonly rows: number };
    readonly background: string;
    readonly hGapEdges: boolean;
    readonly vGapEdges: boolean;
    /** 页面的 tags 键值对 */
    readonly tags: Record<string, string>;
    readonly cardCount: number | null;
    /** 页面索引（前台+后台统一计数，后台页在前） */
    readonly index: number;
    /** 该页使用的绘制函数名（页面 draw 属性，未指定时为 'main'） */
    readonly draw: string;
    /** 整页绘制函数名（页面 drawFullPage 属性，未指定时为 ''） */
    readonly drawFullPage: string;
    /** 页面索引名称（未指定时为 ''） */
    readonly indexName: string;
    /** 是否为后台页 */
    readonly isBackground: boolean;
    /** 水平排列方向：'ltr' 从左到右（默认）| 'rtl' 从右到左。决定 col=0 在左还是右 */
    readonly hDirection: 'ltr' | 'rtl';
    /** 垂直排列方向：'ttb' 从上到下（默认）| 'btt' 从下到上。决定 row=0 在上还是下 */
    readonly vDirection: 'ttb' | 'btt';
    /** 卡牌排列顺序：'row-first' 行优先（默认）| 'col-first' 列优先。决定 id 按行还是按列分配 */
    readonly cardOrder: 'row-first' | 'col-first';
    /** 网格块水平对齐：'left'（默认）| 'center' | 'right' */
    readonly alignX: 'left' | 'center' | 'right';
    /** 网格块垂直对齐：'top'（默认）| 'middle' | 'bottom' */
    readonly alignY: 'top' | 'middle' | 'bottom';
    /** 是否启用网格划分（false 时该页仅包含自定义卡牌） */
    readonly useGrid: boolean;
}

/** 整页绘制上下文（drawFullPage 函数第二个参数） */
interface PageDrawContext {
    /** 添加整页绘制项（在卡牌之前绘制，覆盖整个页面区域 0,0~width,height） */
    addItem(item: DrawItem): void;
}

interface Card {
    id: number;
    row: number;
    col: number;
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    pct_x: number;
    pct_y: number;
    items: DrawItem[];
    addItem(item: DrawItem): void;
    backgroundColor?: string;
    borderRadius?: number;
    borderColor?: string;
    borderWidth?: number;
    /** 判断指定 tag 是否存在 */
    hasTag(key: string): boolean;
    /** 获取指定 tag 的值，不存在返回 undefined 或指定的默认值 */
    getTag(key: string, defaultValue?: string): string | undefined;
    /** 获取所有 tags 的键值对副本 */
    getTags(): Record<string, string>;
}

// ========== 绘制函数 ==========
/**
 * 卡牌绘制函数：签名 (page, card)。
 * - page: ReadOnlyPageInfo 页面只读对象（含 width/height/cardSize/grid/tags/draw 等计算后实际值）
 * - card: Card 当前卡牌对象
 *
 * 多绘制函数分发：脚本中定义的所有顶层 function 会被自动注册（如 main、back 等）。
 * init 中通过页面 draw 属性指定该页使用的绘制函数：
 *   workspace.addPage(workspace.createPage({ ..., draw: 'back' }))
 * 未指定 draw 的页面使用 main。page.draw 可读取该页解析后的绘制函数名。
 */
type DrawFunction = (page: ReadOnlyPageInfo, card: Card) => void;

/**
 * 整页绘制函数：签名 (page, pageCtx)。
 * 通过页面 drawFullPage 属性指定：workspace.addPage(workspace.createPage({ ..., drawFullPage: 'chess' }))
 * pageCtx.addItem(item) 添加的项在卡牌之前绘制，覆盖整个页面区域 (0,0)~(width,height)（含边距）。
 * 适合绘制跨多卡牌的整页内容（如棋盘、地图），再用卡牌划分区域供截取图块取材。
 */
type FullPageDrawFunction = (page: ReadOnlyPageInfo, pageCtx: PageDrawContext) => void;

// ========== 基础绘制项 ==========
interface DrawItem {
    type: 'text' | 'rect' | 'image' | 'container' | 'relative-container' | 'waterfall' | 'svg' | 'sprite-clip' | 'tile-board' | 'grid' | 'board';
    // 位置/尺寸（支持数字像素或字符串百分比如 "50%"）
    x: number | string;
    y: number | string;
    width: number | string;
    height: number | string;
    // 锚点（对齐中心）：默认 {0,0} 左上角；设为 {0.5,0.5} + percent 时中心对齐到位置
    anchorX: number | string;
    anchorY: number | string;
    anchorXMode: 'pixel' | 'percent';
    anchorYMode: 'pixel' | 'percent';
    // 通用位置/尺寸方法（所有绘制项都有）
    setPositionPercent(x: number, y: number): void;
    setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void;
    setSizePixel(w: number, h: number): void;
    /** 设置锚点（像素坐标，默认 {0,0} 左上角） */
    setAnchor(x: number, y?: number): any;
    /** 设置锚点（百分比，0=左/上, 0.5=中心, 1=右/下） */
    setAnchorPercent(x: number, y?: number): any;
    // 容器缓存（容器类有效，叶子节点调用无效果）
    /** 开启缓存：将子项内容渲染到离屏 canvas，后续 draw 时直接 drawImage 输出，加速重复绘制 */
    enableCache(): any;
    /** 关闭缓存 */
    disableCache(): any;
    /** 刷新缓存：标记缓存为脏，下次 draw 时重新渲染（子项属性变更后调用） */
    refreshCache(): any;
    /** 缓存是否已就绪（已开启、已渲染、未脏） */
    readonly isCacheReady: boolean;
}

// ========== TextItem ==========
declare class TextItem implements DrawItem {
    type: 'text';
    constructor(options: {
        text: string;
        x?: number | string;
        y?: number | string;
        width?: number | string;
        height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
        fontSize?: number;
        color?: string;
        backgroundColor?: string;
        borderRadius?: number;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        strikethrough?: boolean;
        fontFamily?: string;
        textAlign?: 'left' | 'center' | 'right';
        textBaseline?: 'top' | 'middle' | 'bottom';
        maxWidth?: number;          // 最大宽度（像素），超出自动换行，默认 0 表示不换行
        lineHeight?: number;        // 行高（倍数，相对于 fontSize），默认 1
    });
    setPositionPercent(x: number, y: number): void;
    setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void;
    setSizePixel(w: number, h: number): void;
}

// ========== RectItem ==========
declare class RectItem implements DrawItem {
    type: 'rect';
    constructor(options: {
        x?: number | string;
        y?: number | string;
        width?: number | string;
        height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
        fillColor?: string;
        strokeColor?: string;
        lineWidth?: number;
        borderRadius?: number;
    });
    setPositionPercent(x: number, y: number): void;
    setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void;
    setSizePixel(w: number, h: number): void;
}

// ========== ImageItem ==========
declare class ImageItem implements DrawItem {
    type: 'image';
    constructor(options: {
        src: string;                // 图片路径，如 "./a/b/img.jpg"
        x?: number | string;
        y?: number | string;
        width?: number | string;
        height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
        strokeColor?: string;       // 边框颜色
        lineWidth?: number;         // 边框宽度
        borderRadius?: number;      // 圆角
    });
    setPositionPercent(x: number, y: number): void;
    setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void;
    setSizePixel(w: number, h: number): void;
}

// ========== ContainerItem (Flex容器) ==========
declare class ContainerItem implements DrawItem {
    type: 'container';
    constructor(options: {
        direction?: 'row' | 'column';
        align?: 'start' | 'center' | 'end';
        justify?: 'start' | 'center' | 'end';
        gap?: number;
        padding?: { top?: number; bottom?: number; left?: number; right?: number };
        margin?: { top?: number; bottom?: number; left?: number; right?: number };
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: number;
        borderRadius?: number;
        clip?: boolean;
        maxDepth?: number;
        x?: number | string;
        y?: number | string;
        width?: number | string;
        height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
    });
    addChild(item: DrawItem): void;
    setPositionPercent(x: number, y: number): void;
    setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void;
    setSizePixel(w: number, h: number): void;
}
    // ========== RelativeContainerItem ==========
declare class RelativeContainerItem implements DrawItem {
    type: 'relative-container';
    constructor(options: {
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: number;
        borderRadius?: number;
        clip?: boolean;
        x?: number | string;
        y?: number | string;
        width?: number | string;
        height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
        rotation?: number;
        scaleX?: number;
        scaleY?: number;
        centerX?: number;
        centerY?: number;
        filter?: {
            blur?: number;
            brightness?: number;
            contrast?: number;
            grayscale?: number;
            hueRotate?: number;
            invert?: number;
            saturate?: number;
            sepia?: number;
            opacity?: number;
            customFilter?: string;
        };
    });
    addChild(item: DrawItem): void;
    setRotation(rad: number): void;
    setScale(sx: number, sy?: number): void;
    setCenter(cx: number, cy: number): void;
    setFilter(filter: FilterOptions): void;
    setPositionPercent(x: number, y: number): void;
    setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void;
    setSizePixel(w: number, h: number): void;
}
    
// ========== WaterfallItem ==========
declare class WaterfallItem implements DrawItem {
    type: 'waterfall';
    constructor(options: {
        direction?: 'row' | 'column';
        rowGap?: number;
        colGap?: number;
        align?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
        justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: number;
        borderRadius?: number;
        clip?: boolean;
        x?: number | string;
        y?: number | string;
        width?: number | string;
        height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
    });
    addChild(item: DrawItem): void;
    setPositionPercent(x: number, y: number): void;
    setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void;
    setSizePixel(w: number, h: number): void;
}

// ========== SvgItem ==========
declare class SvgItem implements DrawItem {
    type: 'svg';
    constructor(options: {
        x?: number | string;
        y?: number | string;
        width?: number | string;
        height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
    });
    /**
     * 设置完整的 SVG 文档字符串
     * @example
     * const svg = SvgItem.buildSvg(200, 200, \`<rect x="10" y="10" width="100" height="100" fill="red"/>\`);
     * svgItem.setSvg(svg);
     */
    setSvg(svg: string): void;
    setPositionPercent(x: number, y: number): void;
    setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void;
    setSizePixel(w: number, h: number): void;

    // 静态辅助方法
    static rect(x: number, y: number, w: number, h: number, attrs?: Record<string, string>): string;
    static circle(cx: number, cy: number, r: number, attrs?: Record<string, string>): string;
    static ellipse(cx: number, cy: number, rx: number, ry: number, attrs?: Record<string, string>): string;
    static line(x1: number, y1: number, x2: number, y2: number, attrs?: Record<string, string>): string;
    static polygon(points: [number, number][], attrs?: Record<string, string>): string;
    static polyline(points: [number, number][], attrs?: Record<string, string>): string;
    static path(d: string, attrs?: Record<string, string>): string;
    static text(text: string, x: number, y: number, attrs?: Record<string, string>): string;
    static buildSvg(width: number, height: number, content: string, extraAttrs?: Record<string, string>): string;
}

// ========== BoardItem（画板） ==========
/** 画板描边设置 */
interface BoardStrokeOptions {
    color?: string;          // 线颜色，#rgb/#rrggbb/#rgba/#rrggbbaa
    lineWidth?: number;      // 线宽（内部坐标单位）
    dash?: number[];         // 线形，如 [5,1,2,1]；空数组为实线；奇数长度自动补0
    roundCap?: boolean;      // 端点/拐点圆角，默认 true
}
/** 描边渐变停点 */
interface StrokeGradientStop { color: string; position: number; }
/** 循环描边颜色停点 */
interface StrokeCycleStop { color: string; length: number; }
/** 填充渐变点（平面多点混色） */
interface FillGradientPoint { x: number; y: number; color: string; }
/** 图案/图像填充变换 */
interface BoardFillTransformOptions {
    mode?: 'stretch' | 'tile';   // 拉伸(默认) | 平铺
    offsetX?: number;            // 偏移X（内部坐标，默认画板中心）
    offsetY?: number;            // 偏移Y（内部坐标，默认画板中心）
    rotation?: number;           // 旋转（弧度）
    scaleX?: number | null;      // 横向缩放，负数镜像；null自动覆盖(stretch)
    scaleY?: number | null;      // 纵向缩放，负数镜像；null自动覆盖(stretch)
    repeatX?: number | null;     // tile 横向重复次数，null自动铺满
    repeatY?: number | null;     // tile 纵向重复次数，null自动铺满
}

/** 噪波生成选项 */
interface NoiseOptions {
    type?: 'value' | 'fractal' | 'turbulence';  // 噪波类型，默认 value
    seed?: number;                               // 随机种子
    scale?: number;                              // 缩放（越小越细密），默认 10
    octaves?: number;                            // 分形层数，默认 4
    persistence?: number;                        // 分形振幅衰减，默认 0.5
    lacunarity?: number;                         // 分形频率倍增，默认 2
    color1?: string;                             // 起始颜色（噪波值0）
    color2?: string;                             // 结束颜色（噪波值1）
    contrast?: number;                           // 对比度 0~2，默认 1
    brightness?: number;                         // 亮度偏移 -1~1，默认 0
}

/** 滤镜类型 */
type BoardFilterType = 'blur' | 'hsl' | 'rgb' | 'displace' | 'pinch' | 'desaturate';
/** 模糊滤镜选项 */
interface BlurOptions { radius?: number; }
/** HSL 调色选项 */
interface HslOptions { hue?: number; saturation?: number; lightness?: number; }
/** RGB 调色选项 */
interface RgbOptions { r?: number; g?: number; b?: number; rScale?: number; gScale?: number; bScale?: number; }
/** 置换滤镜选项 */
interface DisplaceOptions { amountX?: number; amountY?: number; scale?: number; seed?: number; }
/** 挤压滤镜选项 */
interface PinchOptions { strength?: number; cx?: number; cy?: number; radius?: number; }
/** 去色选项 */
interface DesaturateOptions { amount?: number; }

/** 表格单元格样式 */
interface GridCellStyle {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    padding?: { top?: number; bottom?: number; left?: number; right?: number };
}

/** 列宽/行高规格：数字=权重(占剩余空间比例)；{px:N}=固定像素 */
type GridSizeSpec = number | { px: number };

/** 合并区域 */
interface GridMerge {
    col: number;
    row: number;
    colSpan: number;
    rowSpan: number;
}

/**
 * 表格容器：n×m 网格子容器，支持合并单元格、独立样式、行列宽高/间隔调节。
 * 性能优化：不使用嵌套容器实例，批量绘制背景/边框，子项直接定位到单元格内。
 */
declare class GridContainerItem extends RelativeContainerItem {
    constructor(options: {
        rows: number;
        cols: number;
        colWidths?: GridSizeSpec[];
        rowHeights?: GridSizeSpec[];
        colGap?: number;
        rowGap?: number;
        padding?: { top?: number; bottom?: number; left?: number; right?: number };
        cellStyle?: GridCellStyle;
        cellStyles?: (GridCellStyle | null)[][];
        merges?: GridMerge[];
        // RelativeContainerItem 选项
        backgroundColor?: string; borderColor?: string; borderWidth?: number; borderRadius?: number;
        clip?: boolean; x?: number | string; y?: number | string; width?: number | string; height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
        rotation?: number; scaleX?: number; scaleY?: number; centerX?: number; centerY?: number;
        filter?: FilterOptions;
    });
    rows: number;
    cols: number;
    /** 添加子项到指定单元格 (col, row) */
    addToCell(col: number, row: number, item: DrawItem): this;
    /** 设置单个单元格样式 */
    setCellStyle(col: number, row: number, style: GridCellStyle): this;
    /** 设置列宽（数字=权重，{px:N}=固定像素） */
    setColWidth(col: number, width: GridSizeSpec): this;
    /** 设置行高 */
    setRowHeight(row: number, height: GridSizeSpec): this;
    /** 合并单元格 */
    merge(col: number, row: number, colSpan: number, rowSpan: number): this;
    /** 清空所有合并 */
    clearMerges(): this;
}

// ========== SpriteClipItem 截取图块 ==========
/**
 * 截取图块：从指定页面（或该页指定卡牌）的已渲染内容中截取一块区域，
 * 拉伸到本容器尺寸后绘制。继承 RelativeContainerItem，支持 scaleX/scaleY 负值镜像、缓存、滤镜、子项。
 *
 * 解析规则：
 *  - pageRef 为字符串时按 indexName 查找；为数字时按页面索引查找
 *  - 存在多个同名 indexName 页面时，按添加顺序取第一个含指定 cardId 的页面
 *  - cardId 为 -1/null 时引用整张页面；否则引用该页含此 id 的卡牌
 *  - 截取区域：引用整页时相对页面尺寸；引用卡牌时相对卡牌尺寸
 */
declare class SpriteClipItem extends RelativeContainerItem {
    type: 'sprite-clip';
    constructor(options: {
        /** 页面引用：数字=页面索引；字符串=indexName */
        pageRef: string | number;
        /** 卡牌 id；-1/null 时引用整张页面 */
        cardId?: number | null;
        /** 截取区域 x（像素或百分比字符串，默认 0） */
        clipX?: number | string;
        clipY?: number | string;
        /** 截取区域宽（默认 '100%'，即整个引用对象） */
        clipW?: number | string;
        clipH?: number | string;
        x?: number | string; y?: number | string; width?: number | string; height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
        backgroundColor?: string; borderColor?: string; borderWidth?: number; borderRadius?: number;
        clip?: boolean; rotation?: number; scaleX?: number; scaleY?: number; centerX?: number; centerY?: number;
        filter?: FilterOptions;
    });
    /** 设置截取区域（像素） */
    setClipPixel(x: number, y: number, w: number | string, h: number | string): this;
    /** 设置截取区域（百分比，相对引用对象尺寸） */
    setClipPercent(x: number, y: number, w: number, h: number): this;
    addChild(item: DrawItem): void;
    setRotation(rad: number): void; setScale(sx: number, sy?: number): void;
    setCenter(cx: number, cy: number): void; setFilter(filter: FilterOptions): void;
    setPositionPercent(x: number, y: number): void; setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void; setSizePixel(w: number, h: number): void;
}

// ========== TileBoardItem 砖块画板 ==========
/**
 * 砖块画板：截取图块的网格版本（类似游戏引擎 tile map）。
 * 指定一个或多个页面作为素材页（其卡牌按 id 作为砖块素材）；将绘制区域划分为网格，
 * 通过 setTile/setRegion 把指定 id 的素材卡牌（拉伸）填入网格。
 *
 * - gridSize: 单个网格大小 {w,h}（数字=像素；字符串'50%'=百分比相对组件；null=自动填满）
 * - gridCount: 网格数量 {r,c}（null=自动，按网格大小取不超出容器的最大数量；超出范围透明）
 * - gap: 网格间距（像素）
 * 继承 RelativeContainerItem，支持 scaleX/scaleY 负值镜像、缓存、滤镜、子项。
 */
declare class TileBoardItem extends RelativeContainerItem {
    type: 'tile-board';
    constructor(options: {
        /** 素材页面引用列表（数字=下标；字符串=indexName） */
        pageRefs: (string | number)[];
        /** 单个网格大小（数字=像素；'50%'=百分比；null=自动） */
        gridSize?: { w: number | string | null; h: number | string | null };
        /** 网格数量（null=自动） */
        gridCount?: { r: number | null; c: number | null };
        /** 网格间距 */
        gap?: number;
        x?: number | string; y?: number | string; width?: number | string; height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
        backgroundColor?: string; borderColor?: string; borderWidth?: number; borderRadius?: number;
        clip?: boolean; rotation?: number; scaleX?: number; scaleY?: number; centerX?: number; centerY?: number;
        filter?: FilterOptions;
    });
    /** 设置网格大小（数字=像素；'50%'=百分比） */
    setGridSize(w: number | string | null, h: number | string | null): this;
    /** 设置网格数量 {r,c}（null=自动） */
    setGridCount(r: number | null, c: number | null): this;
    /** 设置网格间距 */
    setGap(g: number): this;
    /** 在网格 (gx,gy) 放置素材卡牌（id），拉伸填满该网格 */
    setTile(gx: number, gy: number, id: number): this;
    /** 用 id 列表填充从 (gx,gy) 起 r×c 区域（行优先循环复用；-1/null 清空） */
    setRegion(gx: number, gy: number, r: number, c: number, ids: (number | null)[]): this;
    /** 清空所有砖块 */
    clearTiles(): this;
    addChild(item: DrawItem): void;
    setRotation(rad: number): void; setScale(sx: number, sy?: number): void;
    setCenter(cx: number, cy: number): void; setFilter(filter: FilterOptions): void;
    setPositionPercent(x: number, y: number): void; setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void; setSizePixel(w: number, h: number): void;
}

declare class BoardItem implements DrawItem {
    type: 'board';
    constructor(options: {
        innerWidth?: number;    // 内部坐标宽度，默认 100
        innerHeight?: number;   // 内部坐标高度，默认 100
        x?: number | string; y?: number | string; width?: number | string; height?: number | string;
        anchorX?: number | string;
        anchorY?: number | string;
        anchorXMode?: 'pixel' | 'percent';
        anchorYMode?: 'pixel' | 'percent';
        backgroundColor?: string; borderColor?: string; borderWidth?: number; borderRadius?: number;
        clip?: boolean;         // 裁剪到画板范围，默认 false
        rotation?: number; scaleX?: number; scaleY?: number; centerX?: number; centerY?: number;
        filter?: FilterOptions;
    });
    /** 设置内部坐标大小 */
    setInnerSize(w: number, h: number): BoardItem;
    /** 设置描边线（参数可省略，省略保持原值） */
    setStroke(opts: BoardStrokeOptions): BoardItem;
    /** 设置渐变描边（沿整条路径/周长 0~1 渐变） */
    setStrokeGradient(stops: StrokeGradientStop[]): BoardItem;
    /** 设置循环描边颜色（按长度循环切换） */
    setStrokeColorCycle(stops: StrokeCycleStop[]): BoardItem;
    /** 设置填充色（最后设置的填充生效） */
    setFillColor(color: string): BoardItem;
    /** 设置多点平面渐变填充（距离反比混色） */
    setFillGradient(points: FillGradientPoint[]): BoardItem;
    /** 设置填充图案（另一个画板内容，自动预渲染缓存） */
    setFillPattern(source: BoardItem, opts?: BoardFillTransformOptions): BoardItem;
    /** 设置填充图像（外部图片路径，自动缓存） */
    setFillImage(src: string, opts?: BoardFillTransformOptions): BoardItem;
    /** 清除填充 */
    setFillNone(): BoardItem;
    /** 设置噪波填充（对后续闭合图形生效），噪波值在 color1~color2 间插值 */
    setFillNoise(opts: NoiseOptions): BoardItem;

    /** 直线（开放图形，不填充） */
    drawLine(x1: number, y1: number, x2: number, y2: number): BoardItem;
    /** 路径（折线）；closed=true 时闭合（即多边形），只有闭合路径才填充；虚线相位/循环颜色在段间延续，渐变按整条路径 */
    drawPath(points: [number, number][], closed?: boolean): BoardItem;
    /** 插值曲线（Catmull-Rom 平滑经过各点）；closed=true 时首尾光滑相接（闭合边同样带曲率）并填充闭合区域 */
    drawCurve(points: [number, number][], closed?: boolean): BoardItem;
    /** 两点矩形 */
    drawRect(x1: number, y1: number, x2: number, y2: number): BoardItem;
    /** 中心矩形（中心坐标+宽高+可选旋转弧度） */
    drawRectCenter(cx: number, cy: number, w: number, h: number, rotation?: number): BoardItem;
    /** 圆角矩形（两角点+圆角半径，半径自动裁剪到 min(宽,高)/2，0 表示直角） */
    drawRectRadius(x1: number, y1: number, x2: number, y2: number, radius: number): BoardItem;
    /** 中心圆角矩形（中心+宽高+圆角半径+可选旋转弧度） */
    drawRectRadiusCenter(cx: number, cy: number, w: number, h: number, radius: number, rotation?: number): BoardItem;
    /** 圆形 */
    drawCircle(cx: number, cy: number, r: number): BoardItem;
    /** 椭圆（可选旋转弧度） */
    drawEllipse(cx: number, cy: number, rx: number, ry: number, rotation?: number): BoardItem;
    /** 封闭多边形（等价于 drawPath(points, true)，兼容保留） */
    drawPolygon(points: [number, number][]): BoardItem;
    /** 设置文字字体（size/family/bold/italic/align/baseline/lineHeight），后续 drawText 生效 */
    setFont(opts: {
      fontSize?: number; fontFamily?: string; bold?: boolean; italic?: boolean;
      align?: CanvasTextAlign; baseline?: CanvasTextBaseline; lineHeight?: number;
    }): BoardItem;
    /** 绘制文字（使用当前填充+描边样式），支持 \\n 多行 */
    drawText(text: string, x: number, y: number): BoardItem;
    /** 清空已记录的绘制命令 */
    clearDraws(): BoardItem;

    // ===== 遮罩 =====
    /** 推入路径遮罩：后续绘制只在该路径区域内可见，可嵌套，需用 popMask 还原 */
    pushMask(points: [number, number][], closed?: boolean): BoardItem;
    /** 推入圆形遮罩 */
    pushMaskCircle(cx: number, cy: number, r: number): BoardItem;
    /** 推入矩形遮罩（两角点） */
    pushMaskRect(x1: number, y1: number, x2: number, y2: number): BoardItem;
    /** 推入椭圆遮罩 */
    pushMaskEllipse(cx: number, cy: number, rx: number, ry: number, rotation?: number): BoardItem;
    /** 推入圆角矩形遮罩 */
    pushMaskRectRadius(x1: number, y1: number, x2: number, y2: number, radius: number): BoardItem;
    /** 弹出遮罩：恢复到上一个 pushMask 之前的可见区域 */
    popMask(): BoardItem;

    // ===== 滤镜（对已绘制内容生效） =====
    /** 应用像素级滤镜 */
    applyFilter(type: BoardFilterType, opts?: any): BoardItem;
    /** 模糊滤镜 */
    blur(opts?: BlurOptions): BoardItem;
    /** HSL 调色（色相偏移/饱和度/亮度） */
    hslAdjust(opts?: HslOptions): BoardItem;
    /** RGB 调色（各通道加法/乘法调整） */
    rgbAdjust(opts?: RgbOptions): BoardItem;
    /** 置换滤镜（按噪波扭曲像素） */
    displace(opts?: DisplaceOptions): BoardItem;
    /** 挤压滤镜（径向挤压/膨胀，strength>0 挤压，<0 膨胀） */
    pinch(opts?: PinchOptions): BoardItem;
    /** 去色（灰度化） */
    desaturate(opts?: DesaturateOptions): BoardItem;

    // ===== 画板蒙版（用另一个画板的亮度控制本画板透明度） =====
    /** 设置蒙版画板：board 越亮处本画板越不透明，黑色处完全透明 */
    setMaskBoard(board: BoardItem, opts?: {
      /** 亮度通道：luminance(默认)/alpha/red/green/blue */
      channel?: 'luminance' | 'alpha' | 'red' | 'green' | 'blue';
      /** 反转：亮处变透明、暗处变不透明 */
      invert?: boolean;
    }): BoardItem;
    /** 清除蒙版画板 */
    clearMaskBoard(): BoardItem;

    // 容器能力（继承 RelativeContainerItem）
    addChild(item: DrawItem): void;
    setRotation(rad: number): void;
    setScale(sx: number, sy?: number): void;
    setCenter(cx: number, cy: number): void;
    setFilter(filter: FilterOptions): void;
    setPositionPercent(x: number, y: number): void;
    setPositionPixel(x: number, y: number): void;
    setSizePercent(w: number, h: number): void;
    setSizePixel(w: number, h: number): void;
}

// ========== 函数参数类型推断 ==========
declare function init(workspace: Workspace): void;
declare function main(card: Card): void;

// ========== UI 参数面板系统 ==========
/** UI 管理器单例 */
declare const UIManager: {
  /** 持久化值存储（跨代码执行保留） */
  readonly store: Record<string, any>;
  /** 当前布局树根节点 */
  readonly root: { children: any[] };
  /** 根目录句柄（路径选择器使用） */
  rootDirHandle: any;
  /** 开始新的运行：清空布局树，保留值 */
  beginRun(): void;
  /** 获取持久化值 */
  getState(id: string, defaultValue: any): any;
  /** 设置持久化值 */
  setState(id: string, value: any): void;
  /** 检查ID是否已存在 */
  has(id: string): boolean;
  /** 清空所有持久化值 */
  clearStore(): void;
  /** 重置全部：清空持久化值并清空布局树 */
  resetAll(): void;
  /** 序列化所有持久化值为 JSON 字符串（自动过滤 File/Blob/函数等不可序列化值） */
  serialize(): string;
  /** 从 JSON 字符串反序列化并恢复持久化值（覆盖现有同名键） */
  deserialize(json: string): void;
  /** 设置根目录（用于路径选择） */
  setRootDirectory(): Promise<boolean>;
  /** File System Access API 是否可用 */
  readonly hasFileSystemAPI: boolean;
  /** 当前 UI 选项卡数量 */
  readonly uiTabCount: number;
  /** 添加新的 UI 选项卡，返回其索引；若同名则返回已有索引 */
  addUiTab(name: string): number;
  /** 按名称或索引激活 UI 选项卡，后续创建的 UI 归入该选项卡 */
  setActiveUiTab(target: string | number): number;
  /** 重命名指定 UI 选项卡（索引 0 的"主要设置"不可改名） */
  renameUiTab(idx: number, name: string): void;
  /** 删除指定 UI 选项卡（索引 0 不可删）；删除后激活前一个 */
  removeUiTab(idx: number): void;
};

/**
 * 跨代码选项卡引用：执行指定名称的代码选项卡内容。
 * 被引入代码中的 function/var 声明会进入全局作用域，可供当前代码调用。
 * @param name 代码选项卡名称
 */
declare function include(name: string): void;

/**
 * 获取指定代码选项卡的原始文本内容。
 * @param name 代码选项卡名称
 */
declare function getCode(name: string): string;

/**
 * 在指定上下文中执行用户代码字符串并返回结果（等价于 workspace.run）。
 * 支持表达式形式（自动返回值）和函数体形式（支持 return）。
 * @param code 用户代码字符串
 * @param context 代码可访问的变量上下文
 */
declare function run<T = any>(code: string, context?: Record<string, any>): T;

/** UI 节点包装器基类（所有布局/控件的共同基类） */
declare class UINodeWrapper {
  readonly node: any;
}

/** 行布局（水平排列子项） */
declare class RowLayout extends UINodeWrapper {
  constructor(opts?: { gap?: number; align?: 'start' | 'center' | 'end'; wrap?: boolean });
  /** 添加子项 */
  add(item: UINodeWrapper): this;
}

/** 列布局（垂直排列子项） */
declare class ColumnLayout extends UINodeWrapper {
  constructor(opts?: { gap?: number; align?: 'start' | 'center' | 'end' });
  /** 添加子项 */
  add(item: UINodeWrapper): this;
}

/** 标签（显示文字，无状态） */
declare class LabelUI extends UINodeWrapper {
  constructor(text: string);
  get text(): string;
  set text(v: string);
}

/** 编辑框（单行文本，需唯一ID用于状态持久化） */
declare class EditBoxUI extends UINodeWrapper {
  constructor(id: string, defaultValue?: string);
  get text(): string;
  set text(v: string);
}

/**
 * 多行编辑框
 * @param opts.width 宽度（像素），省略时由布局自动决定
 * @param opts.rows  文本行数（高度），默认 4
 */
declare class TextAreaUI extends UINodeWrapper {
  constructor(id: string, defaultValue?: string, opts?: { width?: number; rows?: number });
  get text(): string;
  set text(v: string);
  get width(): number | null;
  set width(v: number | null);
  get rows(): number;
  set rows(v: number);
}

/** 代码编辑框（Monaco 高亮 + 智能提示），仅编辑不产生效果，value 可通过 workspace.run 执行 */
declare class CodeEditorUI extends UINodeWrapper {
  constructor(id: string, defaultValue?: string, opts?: { height?: number; language?: string });
  get value(): string;
  set value(v: string);
  get text(): string;
  set text(v: string);
  get code(): string;
  set code(v: string);
  get height(): number;
  set height(v: number);
}

/** 按钮（用于事件操作），点击时执行传入的回调；每次运行脚本时回调重新注册 */
declare class ButtonUI extends UINodeWrapper {
  constructor(id: string, label?: string, onClick?: (() => void) | null);
  get label(): string;
  set label(v: string);
  /** 设置/替换点击回调 */
  setOnClick(cb: (() => void) | null): void;
}

/** 滑块条（数值拖动选择），值按 step 对齐并自动夹取到 [min, max] 范围 */
declare class SliderUI extends UINodeWrapper {
  constructor(id: string, defaultValue?: number, opts?: { min?: number; max?: number; step?: number; label?: string; showValue?: boolean });
  get value(): number;
  set value(v: number);
  get min(): number;
  set min(v: number);
  get max(): number;
  set max(v: number);
  get step(): number;
  set step(v: number);
  get label(): string;
  set label(v: string);
  /** 是否显示当前数值 */
  get showValue(): boolean;
  set showValue(v: boolean);
}

/** 下拉框 */
declare class DropdownUI extends UINodeWrapper {
  /**
   * @param id 唯一 ID（相同 ID 的控件跨运行保留用户输入，默认值仅首次创建生效）
   * @param options 选项列表
   * @param defaultValue 默认选中值（仅首次创建生效，省略则取第一个选项）
   * @param opts.editable 是否允许编辑：true 时为可编辑下拉框（可自由输入，也可从列表选择）；默认 false 与普通下拉框一致
   */
  constructor(id: string, options: string[], defaultValue?: string, opts?: { editable?: boolean });
  get selected(): string;
  set selected(v: string);
}

/** 数值编辑框（带 +/- 调节按钮） */
declare class NumberEditUI extends UINodeWrapper {
  /**
   * @param id 唯一 ID（相同 ID 的控件跨运行保留用户输入，默认值仅首次创建生效）
   * @param defaultValue 默认值（仅首次创建生效）
   * @param opts.min 最小值
   * @param opts.max 最大值
   * @param opts.step 步长（+/- 按钮每次增减量，默认 1）
   * @param opts.precision 显示精度（小数位数）：0 为整数；未指定时按 step 的小数位数自动推断（如 step=0.1 → 1 位小数），调节时自动四舍五入消除浮点误差
   */
  constructor(id: string, defaultValue?: number, opts?: { min?: number; max?: number; step?: number; precision?: number });
  get value(): number;
  set value(v: number);
}

/** 颜色选择框 */
declare class ColorPickerUI extends UINodeWrapper {
  constructor(id: string, defaultValue?: string);
  get color(): string;
  set color(v: string);
}

/** 开关（布尔值） */
declare class SwitchUI extends UINodeWrapper {
  constructor(id: string, defaultValue?: boolean);
  get on(): boolean;
  set on(v: boolean);
}

/** 复选框（功能和开关类似，形式不同） */
declare class CheckboxUI extends UINodeWrapper {
  constructor(id: string, defaultValue?: boolean);
  get checked(): boolean;
  set checked(v: boolean);
}

/**
 * 列表：可动态增删行，每行可包含任意 UI 对象（由 factory 返回）。
 *
 * ===== 核心机制：稳定 key =====
 * 每行有一个稳定 key（r0, r1, r2, ...），删除中间行时其余行的 key 不变。
 * 因此 factory 内行内控件的 ID 必须拼上 key（不能用 index），
 * 否则删除中间行会导致数据错位。
 *
 * ===== 数据存储结构 =====
 * 列表的结构（行数 + keys 数组）持久化在 store[id]，形如：
 *   { count: 2, keys: ['r0', 'r1'] }
 * 行内控件的值单独存在各自的 ID 下（如 'players.r0.name'），
 * 与列表结构分离存储。
 *
 * ===== 读取各行内容 =====
 * 推荐：保留 ListUI 实例引用，用 list.keys 拿到稳定 key，
 *       再按 key 读取行内控件值：
 *   var names = list.keys.map(function(k){ return UIManager.getState('players.' + k + '.name', ''); });
 *
 * 不保留引用时，从 store 取结构：
 *   var saved = UIManager.has('players') ? UIManager.getState('players', null) : null;
 *   var keys = (saved && saved.keys) || [];
 *
 * ===== 完整示例 =====
 *   var playerList;
 *   function init(workspace) {
 *     var col = new ColumnLayout({ gap: 8 });
 *     playerList = new ListUI('players', 2, function(index, key) {
 *       var row = new RowLayout({ gap: 6 });
 *       row.add(new LabelUI('玩家 ' + (index + 1) + ':'));
 *       row.add(new EditBoxUI('players.' + key + '.name', ''));
 *       row.add(new NumberEditUI('players.' + key + '.score', 0));
 *       return row;
 *     });
 *     col.add(playerList);
 *   }
 *   // 读取所有玩家：
 *   function getPlayers() {
 *     return playerList.keys.map(function(k){
 *       return {
 *         name: UIManager.getState('players.' + k + '.name', ''),
 *         score: UIManager.getState('players.' + k + '.score', 0),
 *       };
 *     });
 *   }
 *
 * @example
 * var list = new ListUI('players', 2, function(idx, key) {
 *   var row = new RowLayout({ gap: 6 });
 *   row.add(new EditBoxUI('players.' + key + '.name', ''));
 *   row.add(new NumberEditUI('players.' + key + '.score', 0));
 *   return row;
 * });
 * // 运行时增删：
 * list.addRow();          // 末尾新增一行，返回新行 key
 * list.removeRow('r1');   // 删除 key 为 r1 的行
 * list.clear();           // 清空所有行
 */
declare class ListUI {
  constructor(id: string, initialCount: number, factory: (index: number, key: string) => UINodeWrapper);
  /** 当前行数 */
  readonly count: number;
  /** 所有行的稳定 key 列表，如 ['r0','r1','r3']（删除 r2 后 r3 不变） */
  readonly keys: string[];
  /** 获取指定 key 所在的行索引，不存在返回 -1 */
  indexOf(key: string): number;
  /** 新增一行（末尾），返回新行的 key（自动取下一个未用编号） */
  addRow(): string;
  /** 删除指定 key 的行 */
  removeRow(key: string): void;
  /** 清空所有行 */
  clear(): void;
}

/**
 * 表格：可动态增删行和列，每个单元格可包含任意 UI 对象。
 * 每个单元格有稳定 key，内部控件建议用含 key 的 ID 存储值。
 */
declare class TableUI {
  constructor(id: string, initialRows: number, initialCols: number, factory: (r: number, c: number, key: string) => UINodeWrapper);
  readonly rowCount: number;
  readonly colCount: number;
  readonly rowKeys: string[];
  readonly colKeys: string[];
  /** 新增一行（末尾），返回新行 key */
  addRow(): string;
  /** 删除指定 key 的行 */
  removeRow(key: string): void;
  /** 新增一列（末尾），返回新列 key */
  addCol(): string;
  /** 删除指定 key 的列 */
  removeCol(key: string): void;
  /** 清空所有行列 */
  clear(): void;
}

/** 路径选择框（选择根目录下的文件，返回相对路径） */
declare class PathPickerUI extends UINodeWrapper {
  constructor(id: string, opts?: { accept?: string });
  get path(): string;
  set path(v: string);
  pick(): Promise<string | null>;
}

/** 文件包装器：提供文本/JSON/CSV/图像处理 */
declare class FileWrapper {
  /** 文件名 */
  readonly name: string;
  /** 文件大小（字节） */
  readonly size: number;
  /** MIME 类型 */
  readonly type: string;
  /** Blob URL（可用于 ImageItem.src 等） */
  readonly url: string;
  /** 读取文本 */
  text(): Promise<string>;
  /** 解析为 JSON */
  json(): Promise<any>;
  /** 解析为 CSV */
  csv(opts?: { delimiter?: string; header?: boolean }): Promise<any[]>;
  /** 加载为 HTMLImageElement */
  image(): Promise<HTMLImageElement>;
  /** 释放资源 */
  dispose(): void;
}

/** 文件选择框（上传任意文件，返回 FileWrapper） */
declare class FilePickerUI extends UINodeWrapper {
  constructor(id: string, opts?: { accept?: string });
  /** 获取当前文件包装器 */
  readonly file: FileWrapper | null;
  /** 是否已选择文件 */
  readonly hasFile: boolean;
}

/** 画板显示区域（在参数面板中显示 BoardItem 内容） */
declare class BoardDisplayUI extends UINodeWrapper {
  constructor(id: string, opts?: { width?: number; height?: number });
  /** 设置要显示的画板 */
  board: BoardItem | null;
  /** 重绘 */
  redraw(): void;
}
`;
