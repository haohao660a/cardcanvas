/**
 * 卡牌生成器 API 智能提示文件
 *
 * 使用方法：
 *   在用户脚本顶部添加引用即可获得完整 IntelliSense：
 *   /// <reference path="./api-hints.js" />
 *
 * 或在 jsconfig.json 中配置 "include": ["api-hints.js"] 自动生效。
 *
 * 本文件仅提供类型声明与 JSDoc 提示，不包含运行时实现。
 * 运行时所有类由卡牌生成器应用注入到全局作用域。
 */




// ========== 通用类型 ==========

/**
 * @typedef {Object} FilterOptions
 * @property {number} [blur] - 模糊半径（像素），如 4
 * @property {number} [brightness] - 亮度（0-2，1为原始），如 1.2
 * @property {number} [contrast] - 对比度（0-2，1为原始），如 1.5
 * @property {number} [grayscale] - 灰度（0-1，0为彩色，1为完全灰度），如 0.8
 * @property {number} [hueRotate] - 色相旋转（度），如 90
 * @property {number} [invert] - 反转（0-1），如 0.5
 * @property {number} [saturate] - 饱和度（0-2，1为原始），如 0.5
 * @property {number} [sepia] - 棕褐色（0-1），如 0.8
 * @property {number} [opacity] - 透明度（0-1，1为不透明），如 0.7
 * @property {string} [customFilter] - 自定义 CSS 滤镜字符串，如 'drop-shadow(4px 4px 4px rgba(0,0,0,0.5))'
 */

/**
 * @typedef {'pixel' | 'percent'} UnitMode
 * 单位模式：像素 或 百分比（相对于父容器）
 */

/**
 * @typedef {string} Color
 * 颜色字符串，如 '#ff0000'、'rgba(0,0,0,0.5)'、'transparent'
 */

/**
 * @typedef {'start' | 'center' | 'end'} Align
 * 基础对齐方式
 */

/**
 * @typedef {'start' | 'center' | 'end' | 'space-between' | 'space-around'} AlignType
 * 扩展对齐方式（WaterfallItem 专用）
 */

/**
 * @typedef {'row' | 'column'} FlowDirection
 * 排列方向：row（水平） | column（垂直）
 */

// ========== PageConfig ==========

/**
 * @typedef {Object} PageConfig
 * @property {number} width - 页面宽度（像素）
 * @property {number} height - 页面高度（像素）
 * @property {{top: number, bottom: number, left: number, right: number}} margin - 页面边距
 * @property {{width: number, height: number}} cardSize - 卡牌尺寸（width/height 为 0 时自动计算）
 * @property {number | null} cardCount - 卡牌总数限制（null 表示不限制）
 * @property {{cols: number | null, rows: number | null}} grid - 网格行列数（null 表示自动计算）
 * @property {string} background - 页面背景色
 * @property {number | null} [cardHGap] - 卡牌水平间距（null 表示自动计算）
 * @property {number | null} [cardVGap] - 卡牌垂直间距（null 表示自动计算）
 * @property {boolean} [hGapEdges] - 是否在水平方向两端也添加间距
 * @property {boolean} [vGapEdges] - 是否在垂直方向两端也添加间距
 * @property {string} [draw] - 该页卡牌使用的绘制函数名（脚本中定义的顶层 function），省略时使用 main
 * @property {string} [drawFullPage] - 整页绘制函数名。提供时对整个页面区域（含边距）绘制，在卡牌之前
 * @property {string} [indexName] - 索引名称：通过名称可定位页面（允许同名，按添加顺序取第一个含指定卡牌的页面）
 * @property {boolean} [isBackground] - 是否为后台页（不参与预览/导出/打印，独立 id，总在普通页前绘制）
 * @property {'ltr'|'rtl'} [hDirection] - 水平排列方向：'ltr' 从左到右（默认）| 'rtl' 从右到左。决定 col=0 在左还是右
 * @property {'ttb'|'btt'} [vDirection] - 垂直排列方向：'ttb' 从上到下（默认）| 'btt' 从下到上。决定 row=0 在上还是下
 * @property {'row-first'|'col-first'} [cardOrder] - 卡牌排列顺序：'row-first' 行优先（默认）| 'col-first' 列优先。决定 id 按行还是按列分配
 * @property {'left'|'center'|'right'} [alignX] - 整个网格块在页面内容区（边距内）的水平对齐：'left'左对齐（默认）|'center'居中|'right'右对齐。牌背双面打印长边翻转时背面页可设为'right'；卡牌自动撑满时无效果
 * @property {'top'|'middle'|'bottom'} [alignY] - 整个网格块在页面内容区（边距内）的垂直对齐：'top'顶部（默认）|'middle'居中|'bottom'底部。卡牌自动撑满时无效果
 * @property {boolean} [useGrid] - 是否启用网格划分生成卡牌（默认 true）。设为 false 时仅生成自定义卡牌
 * @property {Array<{x: number|string, y: number|string, w: number|string, h: number|string, id?: number|null}>} [customCards] - 自定义卡牌区域列表（与网格划分独立，可在网格开启时使用，允许重叠）。指定 id 时直接使用；id 为 null/省略时按添加顺序自动分配（跳过已占用 id）
 * @property {Record<string, string>} [tags] - 键值对，用于存储和传递信息
 */

// ========== ReadOnlyPageInfo ==========

/**
 * 只读页面信息（计算后的实际值）
 *
 * 绘制函数的第一个参数直接就是该对象：function main(page, card) {...}
 * 所有属性均为只读，运行时已冻结（Object.freeze），不可修改。
 *
 * @typedef {Object} ReadOnlyPageInfo
 * @property {number} width - 页面宽度（像素）
 * @property {number} height - 页面高度（像素）
 * @property {{top: number, bottom: number, left: number, right: number}} margin - 页面边距（只读）
 * @property {{width: number, height: number}} cardSize - 实际计算后的卡牌尺寸（即使配置为 0，这里也是计算后的真实值）
 * @property {number} cardHGap - 实际计算后的水平间距
 * @property {number} cardVGap - 实际计算后的垂直间距
 * @property {{cols: number, rows: number}} grid - 实际计算后的行列数（即使配置为 null，这里也是计算后的真实值）
 * @property {string} background - 页面背景色
 * @property {boolean} hGapEdges - 是否在水平方向两端添加间距
 * @property {boolean} vGapEdges - 是否在垂直方向两端添加间距
 * @property {Record<string, string>} tags - 页面的 tags 键值对（只读）
 * @property {number | null} cardCount - 卡牌总数限制
 * @property {number} index - 页面索引（前台+后台统一计数，后台页在前）
 * @property {string} draw - 该页使用的绘制函数名（页面 draw 属性，未指定时为 'main'）
 * @property {string} drawFullPage - 整页绘制函数名（页面 drawFullPage 属性，未指定时为 ''）
 * @property {string} indexName - 页面索引名称（未指定时为 ''）
 * @property {boolean} isBackground - 是否为后台页
 * @property {'ltr'|'rtl'} hDirection - 水平排列方向：'ltr' 从左到右（默认）| 'rtl' 从右到左。决定 col=0 在左还是右
 * @property {'ttb'|'btt'} vDirection - 垂直排列方向：'ttb' 从上到下（默认）| 'btt' 从下到上。决定 row=0 在上还是下
 * @property {'row-first'|'col-first'} cardOrder - 卡牌排列顺序：'row-first' 行优先（默认）| 'col-first' 列优先。决定 id 按行还是按列分配
 * @property {'left'|'center'|'right'} alignX - 网格块水平对齐：'left'（默认）|'center'|'right'
 * @property {'top'|'middle'|'bottom'} alignY - 网格块垂直对齐：'top'（默认）|'middle'|'bottom'
 * @property {boolean} useGrid - 是否启用网格划分（false 时该页仅包含自定义卡牌）
 */

// ========== Card ==========

/**
 * @typedef {Object} Card
 * @property {number} id - 卡牌全局唯一 ID（从 0 开始递增）
 * @property {number} row - 当前行号
 * @property {number} col - 当前列号
 * @property {number} pageIndex - 所属页面索引
 * @property {number} x - 卡牌左上角 X 坐标（像素）
 * @property {number} y - 卡牌左上角 Y 坐标（像素）
 * @property {number} width - 卡牌宽度（像素）
 * @property {number} height - 卡牌高度（像素）
 * @property {number} pct_x - 卡牌在页面中的水平比例位置
 * @property {number} pct_y - 卡牌在页面中的垂直比例位置
 * @property {DrawItem[]} items - 卡牌内绘制项数组
 * @property {string} [backgroundColor] - 卡牌背景色
 * @property {number} [borderRadius] - 卡牌圆角半径
 * @property {string} [borderColor] - 卡牌边框颜色
 * @property {number} [borderWidth] - 卡牌边框宽度
 * @property {(key: string) => boolean} hasTag - 判断指定 tag 是否存在
 * @property {(key: string, defaultValue?: string) => (string | undefined)} getTag - 获取指定 tag 的值，不存在时返回 defaultValue 或 undefined
 * @property {() => Record<string, string>} getTags - 获取所有 tags 的键值对副本
 */

/**
 * 卡牌绘制函数：签名 (page, card)。
 *
 * - page: ReadOnlyPageInfo 页面只读对象（含计算后的实际值、tags 和 draw）
 * - card: Card 当前卡牌对象
 *
 * 多绘制函数分发：脚本中定义的所有顶层 function 会被自动注册。
 * init 中通过页面 draw 属性指定该页使用的绘制函数：
 *   workspace.addPage(workspace.createPage({ ..., draw: 'back' }))
 * 未指定 draw 的页面使用 main 绘制。
 *
 * @example
 * function main(page, card) {
 *   // page.width / page.cardSize.width / page.grid.rows / page.tags / page.draw ...
 *   card.addItem(new TextItem({ text: '正面', x: 10, y: 10 }));
 * }
 * function back(page, card) {
 *   card.backgroundColor = '#1e4a8a';
 * }
 * @typedef {(page: ReadOnlyPageInfo, card: Card) => void} DrawFunction
 */

// ========== DrawItem（基础接口） ==========

/**
 * @typedef {Object} DrawItem
 * @property {string} type - 绘制项类型
 * @property {number | string} x - X坐标（数字=像素；字符串如"50%"=百分比）
 * @property {number | string} y - Y坐标（数字=像素；字符串如"50%"=百分比）
 * @property {number | string} width - 宽度（数字=像素；字符串如"100%"=百分比）
 * @property {number | string} height - 高度（数字=像素；字符串如"100%"=百分比）
 * @property {UnitMode} xMode - X 坐标单位模式
 * @property {UnitMode} yMode - Y 坐标单位模式
 * @property {UnitMode} wMode - 宽度单位模式
 * @property {UnitMode} hMode - 高度单位模式
 * @property {number | string} anchorX - 锚点X（对齐中心，默认0=左边缘；0.5+percent模式=中心；1+percent模式=右边缘）
 * @property {number | string} anchorY - 锚点Y（对齐中心，默认0=上边缘；0.5+percent模式=中心；1+percent模式=下边缘）
 * @property {'pixel'|'percent'} anchorXMode - 锚点X单位模式
 * @property {'pixel'|'percent'} anchorYMode - 锚点Y单位模式
 * @method setAnchor - 设置锚点（像素坐标，默认{0,0}左上角）
 * @method setAnchorPercent - 设置锚点（百分比，0=左/上, 0.5=中心, 1=右/下）
 */

// ========== 构造选项 typedef ==========

/**
 * @typedef {Object} TextItemOptions
 * @property {string} text - 文本内容
 * @property {number | string} [x] - X坐标（数字=像素；字符串如"50%"=百分比）
 * @property {number | string} [y] - Y坐标
 * @property {number | string} [width] - 宽度
 * @property {number | string} [height] - 高度
 * @property {number | string} [anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
 * @property {number | string} [anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
 * @property {'pixel'|'percent'} [anchorXMode] - 锚点X单位模式（默认'pixel'）
 * @property {'pixel'|'percent'} [anchorYMode] - 锚点Y单位模式（默认'pixel')
 * @property {number} [fontSize] - 字号（像素，默认 16）
 * @property {Color} [color] - 文字颜色（默认 '#000000'）
 * @property {Color} [backgroundColor] - 背景颜色（默认 'transparent'）
 * @property {number} [borderRadius] - 背景圆角半径（默认 0）
 * @property {boolean} [bold] - 是否加粗（默认 false）
 * @property {boolean} [italic] - 是否斜体（默认 false）
 * @property {boolean} [underline] - 是否下划线（默认 false）
 * @property {boolean} [strikethrough] - 是否删除线（默认 false）
 * @property {string} [fontFamily] - 字体族（默认 'sans-serif'）
 * @property {'left' | 'center' | 'right'} [textAlign] - 水平对齐（默认 'left'）
 * @property {'top' | 'middle' | 'bottom'} [textBaseline] - 垂直基线（默认 'top'）
 * @property {number} [maxWidth] - 最大宽度（像素），超出自动换行，默认 0 表示不换行
 * @property {number} [lineHeight] - 行高（倍数，相对于 fontSize），默认 1
 */

/**
 * @typedef {Object} RectItemOptions
 * @property {number | string} [x] - X坐标（数字=像素；字符串如"50%"=百分比）
 * @property {number | string} [y] - Y坐标
 * @property {number | string} [width] - 宽度
 * @property {number | string} [height] - 高度
 * @property {number | string} [anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
 * @property {number | string} [anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
 * @property {'pixel'|'percent'} [anchorXMode] - 锚点X单位模式（默认'pixel'）
 * @property {'pixel'|'percent'} [anchorYMode] - 锚点Y单位模式（默认'pixel')
 * @property {Color} [fillColor] - 填充颜色（默认 'transparent'）
 * @property {Color} [strokeColor] - 描边颜色（默认 'transparent'）
 * @property {number} [lineWidth] - 描边线宽（默认 0）
 * @property {number} [borderRadius] - 圆角半径（默认 0）
 */

/**
 * @typedef {Object} ImageItemOptions
 * @property {string} src - 图片路径，如 './a/b/img.jpg'
 * @property {number | string} [x] - X坐标（数字=像素；字符串如"50%"=百分比）
 * @property {number | string} [y] - Y坐标
 * @property {number | string} [width] - 宽度（默认按图片原始尺寸）
 * @property {number | string} [height] - 高度（默认按图片原始尺寸）
 * @property {number | string} [anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
 * @property {number | string} [anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
 * @property {'pixel'|'percent'} [anchorXMode] - 锚点X单位模式（默认'pixel'）
 * @property {'pixel'|'percent'} [anchorYMode] - 锚点Y单位模式（默认'pixel')
 * @property {Color} [strokeColor] - 边框颜色（默认 'transparent'）
 * @property {number} [lineWidth] - 边框宽度（默认 0）
 * @property {number} [borderRadius] - 圆角半径（默认 0）
 */

/**
 * @typedef {Object} ContainerItemOptions
 * @property {FlowDirection} [direction] - 排列方向（默认 'row'）
 * @property {Align} [align] - 主轴对齐（默认 'start'）
 * @property {Align} [justify] - 交叉轴对齐（默认 'start'）
 * @property {number} [gap] - 子项间距（默认 0）
 * @property {{top?: number, bottom?: number, left?: number, right?: number}} [padding] - 内边距
 * @property {{top?: number, bottom?: number, left?: number, right?: number}} [margin] - 外边距
 * @property {Color} [backgroundColor] - 背景颜色（默认 'transparent'）
 * @property {Color} [borderColor] - 边框颜色（默认 'transparent'）
 * @property {number} [borderWidth] - 边框宽度（默认 0）
 * @property {number} [borderRadius] - 圆角半径（默认 0）
 * @property {boolean} [clip] - 是否裁剪溢出内容（默认 false）
 * @property {number} [maxDepth] - 最大嵌套深度（默认 10）
 * @property {number | string} [x] - X坐标（数字=像素；字符串如"50%"=百分比）
 * @property {number | string} [y] - Y坐标
 * @property {number | string} [width] - 宽度
 * @property {number | string} [height] - 高度
 * @property {number | string} [anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
 * @property {number | string} [anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
 * @property {'pixel'|'percent'} [anchorXMode] - 锚点X单位模式（默认'pixel'）
 * @property {'pixel'|'percent'} [anchorYMode] - 锚点Y单位模式（默认'pixel')
 */


/**
 * @typedef {Object} RelativeContainerItemOptions
 * @property {Color} [backgroundColor] - 背景颜色（默认 'transparent'）
 * @property {Color} [borderColor] - 边框颜色（默认 'transparent'）
 * @property {number} [borderWidth] - 边框宽度（默认 0）
 * @property {number} [borderRadius] - 圆角半径（默认 0）
 * @property {boolean} [clip] - 是否裁剪溢出内容（默认 false）
 * @property {number | string} [x] - X坐标（数字=像素；字符串如"50%"=百分比）
 * @property {number | string} [y] - Y坐标
 * @property {number | string} [width] - 宽度
 * @property {number | string} [height] - 高度
 * @property {number | string} [anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
 * @property {number | string} [anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
 * @property {'pixel'|'percent'} [anchorXMode] - 锚点X单位模式（默认'pixel'）
 * @property {'pixel'|'percent'} [anchorYMode] - 锚点Y单位模式（默认'pixel')
 * @property {number} [rotation] - 旋转角度（弧度，默认 0）
 * @property {number} [scaleX] - 水平缩放（默认 1）
 * @property {number} [scaleY] - 垂直缩放（默认 1）
 * @property {number} [centerX] - 变换中心 X（比例，0.5 为中心，1.5 为右侧外部）
 * @property {number} [centerY] - 变换中心 Y（比例）
 * @property {FilterOptions} [filter] - 滤镜选项
 */

/**
 * @typedef {Object} WaterfallItemOptions
 * @property {FlowDirection} [direction] - 排列方向（默认 'row'）
 * @property {number} [rowGap] - 行间距（默认 0）
 * @property {number} [colGap] - 列间距（默认 0）
 * @property {AlignType} [align] - 主轴对齐（默认 'start'）
 * @property {AlignType} [justify] - 交叉轴对齐（默认 'start'）
 * @property {Color} [backgroundColor] - 背景颜色（默认 'transparent'）
 * @property {Color} [borderColor] - 边框颜色（默认 'transparent'）
 * @property {number} [borderWidth] - 边框宽度（默认 0）
 * @property {number} [borderRadius] - 圆角半径（默认 0）
 * @property {boolean} [clip] - 是否裁剪溢出内容（默认 false）
 * @property {number | string} [x] - X坐标（数字=像素；字符串如"50%"=百分比）
 * @property {number | string} [y] - Y坐标
 * @property {number | string} [width] - 宽度
 * @property {number | string} [height] - 高度
 * @property {number | string} [anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
 * @property {number | string} [anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
 * @property {'pixel'|'percent'} [anchorXMode] - 锚点X单位模式（默认'pixel'）
 * @property {'pixel'|'percent'} [anchorYMode] - 锚点Y单位模式（默认'pixel')
 */

/**
 * @typedef {Object} SvgItemOptions
 * @property {number | string} [x] - X坐标（数字=像素；字符串如"50%"=百分比）
 * @property {number | string} [y] - Y坐标
 * @property {number | string} [width] - 宽度
 * @property {number | string} [height] - 高度
 * @property {number | string} [anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
 * @property {number | string} [anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
 * @property {'pixel'|'percent'} [anchorXMode] - 锚点X单位模式（默认'pixel'）
 * @property {'pixel'|'percent'} [anchorYMode] - 锚点Y单位模式（默认'pixel')
 */

// ========== 类声明 ==========

/**
 * 工作区，用于管理页面配置。
 *
 * 在 `init(workspace)` 函数中使用，通过 `createPage` 创建页面并 `addPage` 添加到工作区。
 * 支持通过 `resetId()` / `resetPage()` 重置计数器，实现分段的 id 和页号。
 *
 * @example
 * function init(workspace) {
 *   workspace.addPage(workspace.createPage({ tags: { type: 'front' } }));
 *   workspace.addPage(workspace.createPage({ tags: { type: 'back' } }));
 *   // 重置 id，下一页的卡牌 id 从 0 开始
 *   workspace.resetId();
 *   workspace.addPage(workspace.createPage({ tags: { type: 'extra' } }));
 *   // workspace.totalPages === 3
 * }
 */
class Workspace {
  /** 总页数（前台 + 后台） */
  get totalPages() {}

  /** 前台页数 */
  get totalFrontPages() {}

  /** 后台页数 */
  get totalBackgroundPages() {}

  /** 前台 id 计数器值（已分配的最大 id + 1，卡牌生成后更新） */
  get idCounter() {}

  /** 后台 id 计数器值（与前台独立） */
  get bgIdCounter() {}

  /** 当前页计数器值（下一个页面的页号，前后台共用） */
  get pageCounter() {}

  /**
   * 创建前台页面配置（使用默认值填充未指定字段）。
   * 返回的对象带有 addCard(x, y, w, h, id?) 方法，可在 addPage 之前追加自定义卡牌区域
   * （位置/大小支持像素数字或百分比字符串如 "50%"；id 省略/null 时自动分配并跳过已占用 id）。
   * @param {Partial<PageConfig>} config - 页面配置（部分字段可省略）
   * @returns {PageConfig} 完整的页面配置对象
   */
  createPage(config) {}

  /**
   * 创建后台页面配置（默认透明背景，isBackground=true）。
   * 后台页不参与预览/导出/打印，但可被截取图块/砖块画板引用作为素材。
   * @param {Partial<PageConfig>} config - 页面配置
   * @returns {PageConfig} 完整的页面配置对象
   */
  createBackgroundPage(config) {}

  /**
   * 添加前台页面到工作区。
   * 页面会被分配当前 pageCounter 作为页号，然后 pageCounter 递增。
   * @param {PageConfig} pageConfig - 页面配置
   * @returns {void}
   */
  addPage(pageConfig) {}

  /**
   * 添加后台页面。后台页无论加入顺序，总在普通页之前绘制；
   * 其卡牌使用独立 id 分配（与前台分开，由 resetBackgroundId 重置）。
   * @param {PageConfig} pageConfig - 后台页面配置
   * @returns {void}
   */
  addBackgroundPage(pageConfig) {}

  /** 获取合并页面列表（后台页在前，前台页在后） */
  getPages() {}

  /** 仅获取前台页面 */
  getFrontPages() {}

  /** 仅获取后台页面 */
  getBackgroundPages() {}

  /**
   * 在指定上下文中执行用户代码字符串并返回结果。
   * 支持表达式形式（自动返回值）和函数体形式（支持 return）。
   * @param {string} code - 用户代码字符串
   * @param {Object} [context] - 代码可访问的变量上下文
   * @returns {*} 代码返回值
   */
  run(code, context) {}

  /**
   * 重置前台 id 计数器。下一个添加的前台页面中，卡牌 id 从 0 开始。
   * @returns {void}
   */
  resetId() {}

  /**
   * 重置后台 id 计数器。下一个添加的后台页面中，卡牌 id 从 0 开始。
   * 注意：后台页与前台页的 id 分配完全独立。
   * @returns {void}
   */
  resetBackgroundId() {}

  /**
   * 重置页计数器。下一个添加的页面索引从 0 开始。
   * @returns {void}
   */
  resetPage() {}

  /**
   * 同时重置前台 id 计数器和页计数器。
   * @returns {void}
   */
  reset() {}

  /**
   * 获取所有页面配置。
   * @returns {PageConfig[]}
   */
  getPages() {}
}

/**
 * 文本绘制项。
 *
 * 用于在卡牌上绘制文字，支持字体样式、对齐、自动换行等。
 *
 * @example
 * const txt = new TextItem({
 *   text: 'Hello',
 *   fontSize: 32,
 *   color: '#ff0000',
 *   bold: true,
 *   textAlign: 'center'
 * });
 * txt.setPositionPercent(0.5, 0.5);
 * card.addItem(txt);
 */
class TextItem {
  /**
   * @param {TextItemOptions} options - 文本配置
   */
  constructor(options) {}

  /**
   * 设置位置（百分比，相对于父容器）。
   * @param {number} x - X 比例（0~1）
   * @param {number} y - Y 比例（0~1）
   * @returns {void}
   */
  setPositionPercent(x, y) {}

  /**
   * 设置位置（像素）。
   * @param {number} x - X 坐标（像素）
   * @param {number} y - Y 坐标（像素）
   * @returns {void}
   */
  setPositionPixel(x, y) {}

  /**
   * 设置尺寸（百分比，相对于父容器）。
   * @param {number} w - 宽度比例（0~1）
   * @param {number} h - 高度比例（0~1）
   * @returns {void}
   */
  setSizePercent(w, h) {}

  /**
   * 设置尺寸（像素）。
   * @param {number} w - 宽度（像素）
   * @param {number} h - 高度（像素）
   * @returns {void}
   */
  setSizePixel(w, h) {}

  /**
   * 开启缓存：将子项内容渲染到离屏 canvas，后续 draw 时直接 drawImage 输出，加速重复绘制。
   * 适用于包含大量复杂子项（如网状线、图形）的容器，在多张卡牌间重复绘制时显著提升性能。
   * 子项属性变更后需调用 refreshCache() 刷新缓存。
   * @returns {this}
   */
  enableCache() {}

  /** 关闭缓存。@returns {this} */
  disableCache() {}

  /**
   * 刷新缓存：标记缓存为脏，下次 draw 时重新渲染。
   * 子项属性变更后需手动调用此方法更新缓存。
   * @returns {this}
   */
  refreshCache() {}

  /** 缓存是否已就绪（已开启、已渲染、未脏）。@type {boolean} */
  get isCacheReady() { return false; }
}

/**
 * 矩形绘制项。
 *
 * 用于绘制填充矩形、描边矩形或圆角矩形。
 *
 * @example
 * const rect = new RectItem({
 *   width: 100,
 *   height: 50,
 *   fillColor: '#4a90d9',
 *   borderRadius: 10
 * });
 * rect.setPositionPercent(0.5, 0.5);
 * card.addItem(rect);
 */
class RectItem {
  /**
   * @param {RectItemOptions} options - 矩形配置
   */
  constructor(options) {}

  /**
   * 设置位置（百分比，相对于父容器）。
   * @param {number} x - X 比例（0~1）
   * @param {number} y - Y 比例（0~1）
   * @returns {void}
   */
  setPositionPercent(x, y) {}

  /**
   * 设置位置（像素）。
   * @param {number} x - X 坐标（像素）
   * @param {number} y - Y 坐标（像素）
   * @returns {void}
   */
  setPositionPixel(x, y) {}

  /**
   * 设置尺寸（百分比，相对于父容器）。
   * @param {number} w - 宽度比例（0~1）
   * @param {number} h - 高度比例（0~1）
   * @returns {void}
   */
  setSizePercent(w, h) {}

  /**
   * 设置尺寸（像素）。
   * @param {number} w - 宽度（像素）
   * @param {number} h - 高度（像素）
   * @returns {void}
   */
  setSizePixel(w, h) {}

  /**
   * 开启缓存：将子项内容渲染到离屏 canvas，后续 draw 时直接 drawImage 输出，加速重复绘制。
   * 适用于包含大量复杂子项（如网状线、图形）的容器，在多张卡牌间重复绘制时显著提升性能。
   * 子项属性变更后需调用 refreshCache() 刷新缓存。
   * @returns {this}
   */
  enableCache() {}

  /** 关闭缓存。@returns {this} */
  disableCache() {}

  /**
   * 刷新缓存：标记缓存为脏，下次 draw 时重新渲染。
   * 子项属性变更后需手动调用此方法更新缓存。
   * @returns {this}
   */
  refreshCache() {}

  /** 缓存是否已就绪（已开启、已渲染、未脏）。@type {boolean} */
  get isCacheReady() { return false; }
}

/**
 * 图片绘制项。
 *
 * 加载并绘制图片，支持边框和圆角。图片异步加载，加载完成后自动触发重绘。
 *
 * @example
 * const img = new ImageItem({
 *   src: './images/icon.png',
 *   width: 200,
 *   height: 200,
 *   borderRadius: 20
 * });
 * img.setPositionPercent(0.5, 0.5);
 * card.addItem(img);
 */
class ImageItem {
  /**
   * @param {ImageItemOptions} options - 图片配置
   */
  constructor(options) {}

  /**
   * 设置位置（百分比，相对于父容器）。
   * @param {number} x - X 比例（0~1）
   * @param {number} y - Y 比例（0~1）
   * @returns {void}
   */
  setPositionPercent(x, y) {}

  /**
   * 设置位置（像素）。
   * @param {number} x - X 坐标（像素）
   * @param {number} y - Y 坐标（像素）
   * @returns {void}
   */
  setPositionPixel(x, y) {}

  /**
   * 设置尺寸（百分比，相对于父容器）。
   * @param {number} w - 宽度比例（0~1）
   * @param {number} h - 高度比例（0~1）
   * @returns {void}
   */
  setSizePercent(w, h) {}

  /**
   * 设置尺寸（像素）。
   * @param {number} w - 宽度（像素）
   * @param {number} h - 高度（像素）
   * @returns {void}
   */
  setSizePixel(w, h) {}

  /**
   * 开启缓存：将子项内容渲染到离屏 canvas，后续 draw 时直接 drawImage 输出，加速重复绘制。
   * 适用于包含大量复杂子项（如网状线、图形）的容器，在多张卡牌间重复绘制时显著提升性能。
   * 子项属性变更后需调用 refreshCache() 刷新缓存。
   * @returns {this}
   */
  enableCache() {}

  /** 关闭缓存。@returns {this} */
  disableCache() {}

  /**
   * 刷新缓存：标记缓存为脏，下次 draw 时重新渲染。
   * 子项属性变更后需手动调用此方法更新缓存。
   * @returns {this}
   */
  refreshCache() {}

  /** 缓存是否已就绪（已开启、已渲染、未脏）。@type {boolean} */
  get isCacheReady() { return false; }
}

/**
 * Flex 布局容器。
 *
 * 类似 CSS Flexbox，子项按 direction 方向排列，支持 align/justify 对齐、gap 间距、padding/margin。
 *
 * @example
 * const container = new ContainerItem({
 *   direction: 'row',
 *   gap: 10,
 *   align: 'center',
 *   justify: 'center'
 * });
 * container.addChild(new TextItem({ text: 'A' }));
 * container.addChild(new TextItem({ text: 'B' }));
 * card.addItem(container);
 */
class ContainerItem {
  /**
   * @param {ContainerItemOptions} options - 容器配置
   */
  constructor(options) {}

  /**
   * 添加子绘制项。
   * @param {DrawItem} item - 子绘制项
   * @returns {void}
   */
  addChild(item) {}

  /**
   * 设置位置（百分比，相对于父容器）。
   * @param {number} x - X 比例（0~1）
   * @param {number} y - Y 比例（0~1）
   * @returns {void}
   */
  setPositionPercent(x, y) {}

  /**
   * 设置位置（像素）。
   * @param {number} x - X 坐标（像素）
   * @param {number} y - Y 坐标（像素）
   * @returns {void}
   */
  setPositionPixel(x, y) {}

  /**
   * 设置尺寸（百分比，相对于父容器）。
   * @param {number} w - 宽度比例（0~1）
   * @param {number} h - 高度比例（0~1）
   * @returns {void}
   */
  setSizePercent(w, h) {}

  /**
   * 设置尺寸（像素）。
   * @param {number} w - 宽度（像素）
   * @param {number} h - 高度（像素）
   * @returns {void}
   */
  setSizePixel(w, h) {}

  /**
   * 开启缓存：将子项内容渲染到离屏 canvas，后续 draw 时直接 drawImage 输出，加速重复绘制。
   * 适用于包含大量复杂子项（如网状线、图形）的容器，在多张卡牌间重复绘制时显著提升性能。
   * 子项属性变更后需调用 refreshCache() 刷新缓存。
   * @returns {this}
   */
  enableCache() {}

  /** 关闭缓存。@returns {this} */
  disableCache() {}

  /**
   * 刷新缓存：标记缓存为脏，下次 draw 时重新渲染。
   * 子项属性变更后需手动调用此方法更新缓存。
   * @returns {this}
   */
  refreshCache() {}

  /** 缓存是否已就绪（已开启、已渲染、未脏）。@type {boolean} */
  get isCacheReady() { return false; }
}

/**
 * 相对定位容器。
 *
 * 支持旋转、缩放、变换中心设置。子项以容器左上角为原点定位。
 *
 * @example
 * // 旋转 180° 的容器
 * const rot = new RelativeContainerItem({
 *   width: card.width,
 *   height: card.height,
 *   rotation: Math.PI,
 *   centerX: 0.5,
 *   centerY: 0.5
 * });
 * rot.addChild(new TextItem({ text: '倒置文字' }));
 * card.addItem(rot);
 */
class RelativeContainerItem {
  /**
   * @param {RelativeContainerItemOptions} options - 容器配置
   */
  constructor(options) {}

  /**
   * 添加子绘制项。
   * @param {DrawItem} item - 子绘制项
   * @returns {void}
   */
  addChild(item) {}

  /**
   * 设置旋转角度。
   * @param {number} rad - 旋转角度（弧度），如 Math.PI 表示 180°
   * @returns {void}
   */
  setRotation(rad) {}

  /**
   * 设置缩放比例。
   * @param {number} sx - 水平缩放（1 = 原始大小）
   * @param {number} [sy] - 垂直缩放（省略时等于 sx）
   * @returns {void}
   */
  setScale(sx, sy) {}

  /**
   * 设置变换中心（比例坐标）。
   * @param {number} cx - 中心 X 比例（0.5 = 中心，1.5 = 右侧外部）
   * @param {number} cy - 中心 Y 比例
   * @returns {void}
   */
  setCenter(cx, cy) {}

  /**
   * 设置位置（百分比，相对于父容器）。
   * @param {number} x - X 比例（0~1）
   * @param {number} y - Y 比例（0~1）
   * @returns {void}
   */
  setPositionPercent(x, y) {}

  /**
   * 设置位置（像素）。
   * @param {number} x - X 坐标（像素）
   * @param {number} y - Y 坐标（像素）
   * @returns {void}
   */
  setPositionPixel(x, y) {}

  /**
   * 设置尺寸（百分比，相对于父容器）。
   * @param {number} w - 宽度比例（0~1）
   * @param {number} h - 高度比例（0~1）
   * @returns {void}
   */
  setSizePercent(w, h) {}

  /**
   * 设置尺寸（像素）。
   * @param {number} w - 宽度（像素）
   * @param {number} h - 高度（像素）
   * @returns {void}
   */
  setSizePixel(w, h) {}

  /**
 * 设置滤镜效果。
 * @param {FilterOptions} filter - 滤镜选项
 * @returns {void}
 *
 * @example
 * container.setFilter({
 *   grayscale: 0.8,
 *   brightness: 1.1
 * });
 */
  setFilter(filter) {}
}

/**
 * 瀑布流布局容器。
 *
 * 类似 CSS 多列瀑布流，支持行间距、列间距、主轴/交叉轴对齐（含 space-between、space-around）。
 *
 * @example
 * const waterfall = new WaterfallItem({
 *   direction: 'row',
 *   rowGap: 10,
 *   colGap: 10,
 *   align: 'space-between'
 * });
 * waterfall.addChild(new TextItem({ text: '1' }));
 * waterfall.addChild(new TextItem({ text: '2' }));
 * card.addItem(waterfall);
 */
class WaterfallItem {
  /**
   * @param {WaterfallItemOptions} options - 瀑布流配置
   */
  constructor(options) {}

  /**
   * 添加子绘制项。
   * @param {DrawItem} item - 子绘制项
   * @returns {void}
   */
  addChild(item) {}

  /**
   * 设置位置（百分比，相对于父容器）。
   * @param {number} x - X 比例（0~1）
   * @param {number} y - Y 比例（0~1）
   * @returns {void}
   */
  setPositionPercent(x, y) {}

  /**
   * 设置位置（像素）。
   * @param {number} x - X 坐标（像素）
   * @param {number} y - Y 坐标（像素）
   * @returns {void}
   */
  setPositionPixel(x, y) {}

  /**
   * 设置尺寸（百分比，相对于父容器）。
   * @param {number} w - 宽度比例（0~1）
   * @param {number} h - 高度比例（0~1）
   * @returns {void}
   */
  setSizePercent(w, h) {}

  /**
   * 设置尺寸（像素）。
   * @param {number} w - 宽度（像素）
   * @param {number} h - 高度（像素）
   * @returns {void}
   */
  setSizePixel(w, h) {}

  /**
   * 开启缓存：将子项内容渲染到离屏 canvas，后续 draw 时直接 drawImage 输出，加速重复绘制。
   * 适用于包含大量复杂子项（如网状线、图形）的容器，在多张卡牌间重复绘制时显著提升性能。
   * 子项属性变更后需调用 refreshCache() 刷新缓存。
   * @returns {this}
   */
  enableCache() {}

  /** 关闭缓存。@returns {this} */
  disableCache() {}

  /**
   * 刷新缓存：标记缓存为脏，下次 draw 时重新渲染。
   * 子项属性变更后需手动调用此方法更新缓存。
   * @returns {this}
   */
  refreshCache() {}

  /** 缓存是否已就绪（已开启、已渲染、未脏）。@type {boolean} */
  get isCacheReady() { return false; }
}

/**
 * SVG 绘制项。
 *
 * 通过设置完整 SVG 文档字符串来绘制矢量图形。提供静态辅助方法快速生成 SVG 元素字符串。
 *
 * @example
 * const svgContent =
 *   SvgItem.rect(10, 10, 100, 100, { fill: 'red' }) +
 *   SvgItem.circle(60, 60, 30, { fill: 'blue' });
 * const svgStr = SvgItem.buildSvg(200, 200, svgContent);
 * const svgItem = new SvgItem({ width: 200, height: 200 });
 * svgItem.setSvg(svgStr);
 * card.addItem(svgItem);
 */
class SvgItem {
  /**
   * @param {SvgItemOptions} options - SVG 配置
   */
  constructor(options) {}

  /**
   * 设置完整的 SVG 文档字符串。
   * @param {string} svg - SVG 文档字符串（建议用 buildSvg 生成）
   * @returns {void}
   */
  setSvg(svg) {}

  /**
   * 设置位置（百分比，相对于父容器）。
   * @param {number} x - X 比例（0~1）
   * @param {number} y - Y 比例（0~1）
   * @returns {void}
   */
  setPositionPercent(x, y) {}

  /**
   * 设置位置（像素）。
   * @param {number} x - X 坐标（像素）
   * @param {number} y - Y 坐标（像素）
   * @returns {void}
   */
  setPositionPixel(x, y) {}

  /**
   * 设置尺寸（百分比，相对于父容器）。
   * @param {number} w - 宽度比例（0~1）
   * @param {number} h - 高度比例（0~1）
   * @returns {void}
   */
  setSizePercent(w, h) {}

  /**
   * 设置尺寸（像素）。
   * @param {number} w - 宽度（像素）
   * @param {number} h - 高度（像素）
   * @returns {void}
   */
  setSizePixel(w, h) {}

  // ===== 静态辅助方法 =====

  /**
   * 生成 `<rect>` 元素字符串。
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {number} w - 宽度
   * @param {number} h - 高度
   * @param {Record<string, string>} [attrs] - 额外属性，如 { fill: 'red', stroke: 'blue' }
   * @returns {string} SVG rect 元素字符串
   */
  static rect(x, y, w, h, attrs) {}

  /**
   * 生成 `<circle>` 元素字符串。
   * @param {number} cx - 圆心 X
   * @param {number} cy - 圆心 Y
   * @param {number} r - 半径
   * @param {Record<string, string>} [attrs] - 额外属性
   * @returns {string} SVG circle 元素字符串
   */
  static circle(cx, cy, r, attrs) {}

  /**
   * 生成 `<ellipse>` 元素字符串。
   * @param {number} cx - 椭圆中心 X
   * @param {number} cy - 椭圆中心 Y
   * @param {number} rx - 水平半径
   * @param {number} ry - 垂直半径
   * @param {Record<string, string>} [attrs] - 额外属性
   * @returns {string} SVG ellipse 元素字符串
   */
  static ellipse(cx, cy, rx, ry, attrs) {}

  /**
   * 生成 `<line>` 元素字符串。
   * @param {number} x1 - 起点 X
   * @param {number} y1 - 起点 Y
   * @param {number} x2 - 终点 X
   * @param {number} y2 - 终点 Y
   * @param {Record<string, string>} [attrs] - 额外属性，如 { stroke: 'black', 'stroke-width': '2' }
   * @returns {string} SVG line 元素字符串
   */
  static line(x1, y1, x2, y2, attrs) {}

  /**
   * 生成 `<polygon>` 元素字符串（闭合多边形）。
   * @param {[number, number][]} points - 顶点数组，如 [[0,0], [100,0], [50,100]]
   * @param {Record<string, string>} [attrs] - 额外属性
   * @returns {string} SVG polygon 元素字符串
   */
  static polygon(points, attrs) {}

  /**
   * 生成 `<polyline>` 元素字符串（开放折线）。
   * @param {[number, number][]} points - 顶点数组
   * @param {Record<string, string>} [attrs] - 额外属性
   * @returns {string} SVG polyline 元素字符串
   */
  static polyline(points, attrs) {}

  /**
   * 生成 `<path>` 元素字符串。
   * @param {string} d - 路径数据，如 'M 10 10 L 100 100'
   * @param {Record<string, string>} [attrs] - 额外属性
   * @returns {string} SVG path 元素字符串
   */
  static path(d, attrs) {}

  /**
   * 生成 `<text>` 元素字符串。
   * @param {string} text - 文本内容
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @param {Record<string, string>} [attrs] - 额外属性，如 { 'font-size': '24', fill: 'red' }
   * @returns {string} SVG text 元素字符串
   */
  static text(text, x, y, attrs) {}

  /**
   * 构建完整的 SVG 文档字符串。
   * @param {number} width - SVG 宽度
   * @param {number} height - SVG 高度
   * @param {string} content - SVG 内容（由 rect/circle/path 等拼接）
   * @param {Record<string, string>} [extraAttrs] - 额外根属性，如 { xmlns: 'http://www.w3.org/2000/svg' }
   * @returns {string} 完整的 SVG 文档字符串
   */
  static buildSvg(width, height, content, extraAttrs) {}
}

// ========== BoardItem（画板）选项 ==========

/**
 * @typedef {Object} BoardStrokeOptions
 * @property {string} [color] - 线颜色，支持 #rgb / #rrggbb / #rgba / #rrggbbaa
 * @property {number} [lineWidth] - 线宽（画板内部坐标单位）
 * @property {number[]} [dash] - 线形，如 [5,1,2,1] = 5长画线/1空白/2长画线/1空白；空数组为实线；奇数长度自动补0
 * @property {boolean} [roundCap] - 端点/拐点是否圆角（虚线端头也受影响），默认 true
 */

/**
 * @typedef {Object} StrokeGradientStop
 * @property {string} color - 颜色
 * @property {number} position - 位置（0~1）
 */

/**
 * @typedef {Object} StrokeCycleStop
 * @property {string} color - 颜色
 * @property {number} length - 持续长度（内部坐标单位），之后切换到下一个颜色
 */

/**
 * @typedef {Object} FillGradientPoint
 * @property {number} x - X 坐标（内部坐标）
 * @property {number} y - Y 坐标（内部坐标）
 * @property {string} color - 该点颜色，其余位置按距离反比混色
 */

/**
 * @typedef {Object} BoardFillTransformOptions
 * @property {'stretch' | 'tile'} [mode] - stretch=拉伸(默认)，tile=平铺重复
 * @property {number} [offsetX] - 偏移 X（内部坐标，默认画板中心）
 * @property {number} [offsetY] - 偏移 Y（内部坐标，默认画板中心）
 * @property {number} [rotation] - 旋转（弧度，默认 0）
 * @property {number | null} [scaleX] - 横向缩放（负数=水平镜像；null=自动缩放覆盖图形，仅 stretch 模式）
 * @property {number | null} [scaleY] - 纵向缩放（负数=垂直镜像；null=自动缩放覆盖图形，仅 stretch 模式）
 * @property {number | null} [repeatX] - tile 模式横向重复次数（null=自动铺满）
 * @property {number | null} [repeatY] - tile 模式纵向重复次数（null=自动铺满）
 */

/**
 * 噪点填充选项：在填充区域上叠加随机噪点纹理，可模拟纸张/颗粒感。
 * @typedef {Object} NoiseOptions
 * @property {'value'|'fractal'|'turbulence'} [type] - 噪波类型：value 值噪波(默认), fractal 分形布朗运动, turbulence 湍流
 * @property {number} [seed] - 随机种子（相同种子产生相同噪波）
 * @property {number} [scale] - 缩放（越小越细密），默认 10
 * @property {number} [octaves] - 分形层数（仅 fractal/turbulence），默认 4
 * @property {number} [persistence] - 分形振幅衰减系数，默认 0.5
 * @property {number} [lacunarity] - 分形频率倍增系数，默认 2
 * @property {string} [color1] - 起始颜色（噪波值 0 时），默认 #000000
 * @property {string} [color2] - 结束颜色（噪波值 1 时），默认 #ffffff
 * @property {number} [contrast] - 对比度（0~2），默认 1
 * @property {number} [brightness] - 亮度偏移（-1~1），默认 0
 */

/**
 * 像素模糊滤镜选项。
 * @typedef {Object} BlurOptions
 * @property {number} [radius] - 模糊半径（像素，默认 5），值越大越模糊
 */

/**
 * 像素 HSL 调整滤镜选项：对每个像素的色相/饱和度/亮度进行偏移。
 * @typedef {Object} HslOptions
 * @property {number} [hue] - 色相偏移（度，-360~360，默认 0）
 * @property {number} [saturation] - 饱和度调整（-1~1，默认 0；正值增加饱和，负值降低）
 * @property {number} [lightness] - 亮度调整（-1~1，默认 0；正值提亮，负值压暗）
 */

/**
 * 像素 RGB 调整滤镜选项：对每个像素的红/绿/蓝通道分别进行加法与乘法调整。
 * @typedef {Object} RgbOptions
 * @property {number} [r] - 红色通道加法偏移（-255~255，默认 0）
 * @property {number} [g] - 绿色通道加法偏移（-255~255，默认 0）
 * @property {number} [b] - 蓝色通道加法偏移（-255~255，默认 0）
 * @property {number} [rScale] - 红色通道乘数（0~2，默认 1）
 * @property {number} [gScale] - 绿色通道乘数（0~2，默认 1）
 * @property {number} [bScale] - 蓝色通道乘数（0~2，默认 1）
 */

/**
 * 像素置换滤镜选项：按噪波对像素进行水平/垂直位移，产生扭曲效果。
 * @typedef {Object} DisplaceOptions
 * @property {number} [amountX] - 水平位移幅度（像素，默认 10），负值反向
 * @property {number} [amountY] - 垂直位移幅度（像素，默认 10），负值反向
 * @property {number} [scale] - 噪波缩放（越小越细密），默认 20
 * @property {number} [seed] - 随机种子
 */

/**
 * 像素挤压/膨胀滤镜选项：以中心点为基准对像素进行径向挤压或膨胀。
 * @typedef {Object} PinchOptions
 * @property {number} [strength] - 挤压强度（-1~1，默认 0.5；正值=向中心挤压，负值=从中心膨胀）
 * @property {number} [cx] - 挤压中心 X（0~1，默认 0.5）
 * @property {number} [cy] - 挤压中心 Y（0~1，默认 0.5）
 * @property {number} [radius] - 影响半径比例（0~1，默认 1）
 */

/**
 * 像素去色滤镜选项：将彩色像素转为灰度（保留亮度）。
 * @typedef {Object} DesaturateOptions
 * @property {number} [amount] - 去色程度（0~1，默认 1；0=原色，1=完全灰度）
 */

/**
 * @typedef {Object} BoardItemOptions
 * @property {number} [innerWidth] - 内部坐标宽度（默认 100，50 即水平中心）
 * @property {number} [innerHeight] - 内部坐标高度（默认 100）
 * @property {number | string} [x] - X坐标（数字=像素；字符串如"50%"=百分比）
 * @property {number | string} [y] - Y坐标
 * @property {number | string} [width] - 宽度
 * @property {number | string} [height] - 高度
 * @property {number | string} [anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
 * @property {number | string} [anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
 * @property {'pixel'|'percent'} [anchorXMode] - 锚点X单位模式（默认'pixel'）
 * @property {'pixel'|'percent'} [anchorYMode] - 锚点Y单位模式（默认'pixel')
 * @property {Color} [backgroundColor] - 背景颜色（默认 transparent）
 * @property {Color} [borderColor] - 边框颜色
 * @property {number} [borderWidth] - 边框宽度（默认 0，即无边线）
 * @property {number} [borderRadius] - 圆角半径
 * @property {boolean} [clip] - 是否裁剪超出画板范围的内容（默认 false，支持负数/超出坐标）
 * @property {number} [rotation] - 整体旋转（弧度）
 * @property {number} [scaleX] - 整体水平缩放（默认 1）
 * @property {number} [scaleY] - 整体垂直缩放（默认 1）
 * @property {number} [centerX] - 变换中心 X（比例，0.5 为中心）
 * @property {number} [centerY] - 变换中心 Y（比例）
 * @property {FilterOptions} [filter] - 滤镜选项
 */

/**
 * 画板绘制项。
 *
 * 继承 RelativeContainerItem（复用旋转/缩放/滤镜/裁剪/边框/子项），
 * 拥有独立内部坐标系：通过 innerWidth/innerHeight 定义内部大小，
 * 所有 drawXxx() 均使用内部坐标（支持负数和超出范围，配合 clip 裁剪）。
 * drawXxx() 仅记录绘制命令，在渲染时统一绘制。
 *
 * 状态机：setStroke / setStrokeGradient / setStrokeColorCycle 设置后续图形的描边；
 * setFillColor / setFillGradient / setFillPattern / setFillImage 设置后续图形的填充
 * （填充只有最后设置的一个生效）。
 *
 * @example
 * const board = new BoardItem({
 *   innerWidth: 100, innerHeight: 100,
 *   width: card.width, height: card.height,
 *   clip: true
 * });
 * board.setStroke({ color: '#ff0000', lineWidth: 2, dash: [5, 2] });
 * board.setFillColor('#00ff0088');
 * board.drawCircle(50, 50, 30);
 * board.setFillNone();
 * board.drawLine(0, 0, 100, 100);
 * card.addItem(board);
 */

/**
 * 表格容器：n×m 网格子容器，支持合并单元格、独立样式、行列宽高/间隔调节。
 *
 * 性能优化：不使用嵌套 RelativeContainerItem 实例（避免每格 ctx.save/restore + clip 开销），
 * 而是用数据模型描述单元格，在一次 draw 中批量绘制所有背景/边框，子项直接定位到单元格内绘制。
 *
 * @example
 * const grid = new GridContainerItem({
 *   x: 10, y: 10, width: 480, height: 380,
 *   rows: 4, cols: 3,
 *   colWidths: [1, 2, 1],              // 列宽权重（1:2:1）
 *   rowHeights: [60, {px:80}, 1, 1],   // 行高：权重60、固定80px、其余权重1
 *   colGap: 4, rowGap: 4,
 *   padding: {top:6,bottom:6,left:6,right:6},
 *   backgroundColor: '#f0f0f0', borderColor: '#999', borderWidth: 2,
 *   cellStyle: { borderColor: '#ccc', borderWidth: 1, padding: {top:4,left:4} },
 *   merges: [{ col: 0, row: 0, colSpan: 3, rowSpan: 1 }],
 * });
 * grid.setCellStyle(0, 0, { backgroundColor: '#d4b87a', borderColor: '#1a1a2e', borderWidth: 2 });
 * grid.addToCell(0, 0, new TextItem({ text: '标题', x: 0, y: 0, fontSize: 22 }));
 * grid.addToCell(1, 2, new RectItem({ x:0,y:0,width:'100%',height:'100%', backgroundColor:'#a8d8a8' }));
 * card.addItem(grid);
 */
class GridContainerItem {
  /**
   * @param {Object} options
   * @param {number} options.rows - 行数
   * @param {number} options.cols - 列数
   * @param {(number|{px:number})[]} [options.colWidths] - 列宽规格：数字=权重，{px:N}=固定像素
   * @param {(number|{px:number})[]} [options.rowHeights] - 行高规格
   * @param {number} [options.colGap=0] - 列间距
   * @param {number} [options.rowGap=0] - 行间距
   * @param {Object} [options.padding] - 容器内边距 {top,bottom,left,right}
   * @param {Object} [options.cellStyle] - 默认单元格样式 {backgroundColor,borderColor,borderWidth,borderRadius,padding}
   * @param {Array} [options.cellStyles] - 逐格样式覆盖 [row][col]
   * @param {Array} [options.merges] - 合并区域 [{col,row,colSpan,rowSpan}]
   * @param {string} [options.backgroundColor] - 容器背景色
   * @param {string} [options.borderColor] - 容器边框色
   * @param {number} [options.borderWidth] - 容器边框宽
   * @param {number} [options.borderRadius] - 容器圆角
   * @param {boolean} [options.clip] - 是否裁剪
   * @param {number | string} [options.x] - X坐标（数字=像素；字符串如"50%"=百分比）
   * @param {number | string} [options.y] - Y坐标
   * @param {number | string} [options.width] - 宽度
   * @param {number | string} [options.height] - 高度
   * @param {number | string} [options.anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
   * @param {number | string} [options.anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
   * @param {'pixel'|'percent'} [options.anchorXMode] - 锚点X单位模式（默认'pixel'）
   * @param {'pixel'|'percent'} [options.anchorYMode] - 锚点Y单位模式（默认'pixel')
   * @param {number} [options.rotation] - 旋转（弧度）
   * @param {number} [options.scaleX] - 横向缩放
   * @param {number} [options.scaleY] - 纵向缩放
   * @param {number} [options.centerX] - 变换中心 X 比例
   * @param {number} [options.centerY] - 变换中心 Y 比例
   * @param {Object} [options.filter] - 滤镜选项
   */
  constructor(options) {}
  /** @type {number} 行数 */
  rows;
  /** @type {number} 列数 */
  cols;
  /**
   * 添加子项到指定单元格
   * @param {number} col - 列索引
   * @param {number} row - 行索引
   * @param {DrawItem} item - 绘制项
   * @returns {GridContainerItem}
   */
  addToCell(col, row, item) {}
  /**
   * 设置单个单元格样式
   * @param {number} col
   * @param {number} row
   * @param {Object} style - {backgroundColor,borderColor,borderWidth,borderRadius,padding}
   * @returns {GridContainerItem}
   */
  setCellStyle(col, row, style) {}
  /**
   * 设置列宽（数字=权重占剩余空间，{px:N}=固定像素）
   * @param {number} col
   * @param {number|{px:number}} width
   * @returns {GridContainerItem}
   */
  setColWidth(col, width) {}
  /**
   * 设置行高
   * @param {number} row
   * @param {number|{px:number}} height
   * @returns {GridContainerItem}
   */
  setRowHeight(row, height) {}
  /**
   * 合并单元格
   * @param {number} col - 起始列
   * @param {number} row - 起始行
   * @param {number} colSpan - 跨列数
   * @param {number} rowSpan - 跨行数
   * @returns {GridContainerItem}
   */
  merge(col, row, colSpan, rowSpan) {}
  /** 清空所有合并 */
  clearMerges() {}

  /**
   * 开启缓存：将网格内容渲染到离屏 canvas，后续 draw 时直接 drawImage 输出，加速重复绘制。
   * 子项属性变更后需调用 refreshCache() 刷新缓存。
   * @returns {this}
   */
  enableCache() {}

  /** 关闭缓存。@returns {this} */
  disableCache() {}

  /**
   * 刷新缓存：标记缓存为脏，下次 draw 时重新渲染。
   * @returns {this}
   */
  refreshCache() {}

  /** 缓存是否已就绪。@type {boolean} */
  get isCacheReady() { return false; }
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
 *
 * @example
 * // 截取后台页 'chess' 的卡牌 0（左半棋盘），上下镜像绘制
 * card.addItem(new SpriteClipItem({
 *   pageRef: 'chess', cardId: 0,
 *   width: '100%', height: '100%',
 *   scaleY: -1  // 上下镜像
 * }));
 */
class SpriteClipItem {
  /**
   * @param {Object} options
   * @param {string | number} options.pageRef - 页面引用：数字=页面索引；字符串=indexName
   * @param {number | null} [options.cardId] - 卡牌 id；-1/null 时引用整张页面
   * @param {number | string} [options.clipX] - 截取区域 x（像素或'50%'百分比，默认 0）
   * @param {number | string} [options.clipY] - 截取区域 y
   * @param {number | string} [options.clipW='100%'] - 截取区域宽（默认整个引用对象）
   * @param {number | string} [options.clipH='100%'] - 截取区域高
   * @param {number | string} [options.x] - X坐标（数字=像素；字符串如"50%"=百分比）
   * @param {number | string} [options.y] - Y坐标
   * @param {number | string} [options.width] - 宽度
   * @param {number | string} [options.height] - 高度
   * @param {number | string} [options.anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
   * @param {number | string} [options.anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
   * @param {'pixel'|'percent'} [options.anchorXMode] - 锚点X单位模式（默认'pixel'）
   * @param {'pixel'|'percent'} [options.anchorYMode] - 锚点Y单位模式（默认'pixel')
   * @param {string} [options.backgroundColor] [options.borderColor] [options.borderWidth] [options.borderRadius]
   * @param {boolean} [options.clip]
   * @param {number} [options.rotation] [options.scaleX] [options.scaleY] [options.centerX] [options.centerY]
   * @param {FilterOptions} [options.filter]
   */
  constructor(options) {}

  /** 设置截取区域（像素） */
  setClipPixel(x, y, w, h) {}
  /** 设置截取区域（百分比，相对引用对象尺寸） */
  setClipPercent(x, y, w, h) {}
  addChild(item) {}
  setRotation(rad) {}
  setScale(sx, sy) {}
  setCenter(cx, cy) {}
  setFilter(filter) {}
  setPositionPercent(x, y) {}
  setPositionPixel(x, y) {}
  setSizePercent(w, h) {}
  setSizePixel(w, h) {}
  enableCache() {}
  disableCache() {}
  refreshCache() {}
}

// ========== TileBoardItem 砖块画板 ==========

/**
 * 砖块画板：截取图块的网格版本（类似游戏引擎 tile map）。
 * 指定一个或多个页面作为素材页（其卡牌按 id 作为砖块素材）；将绘制区域划分为网格，
 * 通过 setTile/setRegion 把指定 id 的素材卡牌（拉伸）填入网格。
 *
 * @example
 * // 用后台页 'tiles' 的卡牌 0/1/2 作为砖块，2×3 网格
 * const board = new TileBoardItem({
 *   pageRefs: ['tiles'],
 *   gridSize: { w: 100, h: 100 }, gridCount: { r: 3, c: 2 }, gap: 4,
 *   width: '100%', height: '100%'
 * });
 * board.setTile(0, 0, 0);                  // (0,0) 放卡牌 0
 * board.setRegion(1, 0, 2, 2, [1, 2, 0]);   // 1×0 起 2×2 区域循环填 1,2,0
 * card.addItem(board);
 */
class TileBoardItem {
  /**
   * @param {Object} options
   * @param {(string | number)[]} options.pageRefs - 素材页面引用列表（数字=下标；字符串=indexName）
   * @param {{w: number | string | null, h: number | string | null}} [options.gridSize] - 单个网格大小（数字=像素；'50%'=百分比；null=自动）
   * @param {{r: number | null, c: number | null}} [options.gridCount] - 网格数量（null=自动）
   * @param {number} [options.gap] - 网格间距
   * @param {number | string} [options.x] - X坐标（数字=像素；字符串如"50%"=百分比）
   * @param {number | string} [options.y] - Y坐标
   * @param {number | string} [options.width] - 宽度
   * @param {number | string} [options.height] - 高度
   * @param {number | string} [options.anchorX] - 锚点X（默认0=左边缘；"50%"=中心；"100%"=右边缘）
   * @param {number | string} [options.anchorY] - 锚点Y（默认0=上边缘；"50%"=中心；"100%"=下边缘）
   * @param {'pixel'|'percent'} [options.anchorXMode] - 锚点X单位模式（默认'pixel'）
   * @param {'pixel'|'percent'} [options.anchorYMode] - 锚点Y单位模式（默认'pixel')
   * @param {string} [options.backgroundColor] [options.borderColor] [options.borderWidth] [options.borderRadius]
   * @param {boolean} [options.clip]
   * @param {number} [options.rotation] [options.scaleX] [options.scaleY] [options.centerX] [options.centerY]
   * @param {FilterOptions} [options.filter]
   */
  constructor(options) {}

  /** 设置网格大小（数字=像素；'50%'=百分比） */
  setGridSize(w, h) {}
  /** 设置网格数量 {r,c}（null=自动） */
  setGridCount(r, c) {}
  /** 设置网格间距 */
  setGap(g) {}
  /** 在网格 (gx,gy) 放置素材卡牌（id），拉伸填满该网格 */
  setTile(gx, gy, id) {}
  /** 用 id 列表填充从 (gx,gy) 起 r×c 区域（行优先循环复用；-1/null 清空） */
  setRegion(gx, gy, r, c, ids) {}
  /** 清空所有砖块 */
  clearTiles() {}
  addChild(item) {}
  setRotation(rad) {}
  setScale(sx, sy) {}
  setCenter(cx, cy) {}
  setFilter(filter) {}
  setPositionPercent(x, y) {}
  setPositionPixel(x, y) {}
  setSizePercent(w, h) {}
  setSizePixel(w, h) {}
  enableCache() {}
  disableCache() {}
  refreshCache() {}
}

class BoardItem {
  /**
   * @param {BoardItemOptions} options - 画板配置
   */
  constructor(options) {}

  /**
   * 设置内部坐标大小。
   * @param {number} w - 内部宽度（如 100，则 50 为水平中心）
   * @param {number} h - 内部高度
   * @returns {BoardItem}
   */
  setInnerSize(w, h) {}

  /**
   * 设置描边线（对后续绘制的线段/图形边线生效）。参数均可省略，省略保持原值。
   * @param {BoardStrokeOptions} opts
   * @returns {BoardItem}
   */
  setStroke(opts) {}

  /**
   * 设置渐变描边颜色。沿整条路径（或闭合图形周长）0~1 整体渐变。
   * @param {StrokeGradientStop[]} stops - 如 [{color:'#ff0000',position:0},{color:'#00ff00',position:1}]
   * @returns {BoardItem}
   */
  setStrokeGradient(stops) {}

  /**
   * 设置循环描边颜色。颜色按各自长度持续后切换，列表循环往复。
   * @param {StrokeCycleStop[]} stops - 如 [{color:'#ff0000',length:10},{color:'#00ff00',length:10}]
   * @returns {BoardItem}
   */
  setStrokeColorCycle(stops) {}

  /**
   * 设置填充色（覆盖之前的填充设置）。
   * @param {string} color - 颜色（支持 8 位十六进制透明色）
   * @returns {BoardItem}
   */
  setFillColor(color) {}

  /**
   * 设置多点平面渐变填充。平面上每个点一个颜色，其余位置按距离反比混色。
   * @param {FillGradientPoint[]} points
   * @returns {BoardItem}
   */
  setFillGradient(points) {}

  /**
   * 设置填充图案（另一个画板的内容）。图案会预渲染缓存，不会重复递归绘制。
   * @param {BoardItem} source - 作为图案的源画板
   * @param {BoardFillTransformOptions} [opts] - 变换选项
   * @returns {BoardItem}
   */
  setFillPattern(source, opts) {}

  /**
   * 设置填充图像（外部图片，相对路径，自动缓存；加载完成后自动重绘）。
   * @param {string} src - 图片路径，如 './img/bg.png'
   * @param {BoardFillTransformOptions} [opts] - 变换选项
   * @returns {BoardItem}
   */
  setFillImage(src, opts) {}

  /**
   * 清除填充（后续图形只描边不填充）。
   * @returns {BoardItem}
   */
  setFillNone() {}

  /**
   * 设置噪点填充：在填充区域上叠加随机噪点纹理，可模拟纸张/颗粒感。
   * 与其他填充方式互斥，最后设置的填充生效。
   * @param {NoiseOptions} [opts] - 噪点选项；省略时使用默认参数（白色、密度 0.5）
   * @returns {BoardItem}
   */
  setFillNoise(opts) {}

  /**
   * 直线：在两点之间绘制。开放图形，不参与填充。
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @returns {BoardItem}
   */
  drawLine(x1, y1, x2, y2) {}

  /**
   * 路径（折线）。
   * 注意：虚线相位、循环颜色等状态在折线段之间连续延续（转向不重置）；
   * 渐变色按整条路径长度 0~1 整体渐变。
   * 只有 closed=true（闭合，即多边形）时才会填充；开放路径不填充。
   * @param {[number, number][]} points - 坐标点列表
   * @param {boolean} [closed=false] - 是否闭合：true 时首尾相连形成多边形，闭合区域内填充（支持非凸多边形）
   * @returns {BoardItem}
   */
  drawPath(points, closed) {}

  /**
   * 插值曲线（Catmull-Rom 平滑经过各点）。状态延续规则同 drawPath。
   * 只有 closed=true 时才会填充；闭合时首尾光滑相接——
   * 闭合边同样带曲率（控制点环形环绕计算），不是直线封闭。
   * @param {[number, number][]} points - 曲线经过的坐标点
   * @param {boolean} [closed=false] - 是否闭合：true 时形成光滑闭合曲线并填充闭合区域
   * @returns {BoardItem}
   */
  drawCurve(points, closed) {}

  /**
   * 两点矩形：由两个角点确定。
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @returns {BoardItem}
   */
  drawRect(x1, y1, x2, y2) {}

  /**
   * 中心矩形：中心坐标 + 宽高 + 可选旋转。
   * @param {number} cx - 中心 X
   * @param {number} cy - 中心 Y
   * @param {number} w - 宽度
   * @param {number} h - 高度
   * @param {number} [rotation] - 旋转（弧度，默认 0）
   * @returns {BoardItem}
   */
  drawRectCenter(cx, cy, w, h, rotation) {}

  /**
   * 圆角矩形：由两个角点确定，四角为平滑圆弧。
   * 圆角半径会自动裁剪到 min(宽,高)/2，传入 0 等价于 drawRect（直角矩形）。
   * 闭合图形，会进行填充。
   * @param {number} x1 - 角点1 X
   * @param {number} y1 - 角点1 Y
   * @param {number} x2 - 角点2 X
   * @param {number} y2 - 角点2 Y
   * @param {number} radius - 圆角半径（画板内部坐标单位）
   * @returns {BoardItem}
   */
  drawRectRadius(x1, y1, x2, y2, radius) {}

  /**
   * 中心圆角矩形：中心坐标 + 宽高 + 圆角半径 + 可选旋转。
   * @param {number} cx - 中心 X
   * @param {number} cy - 中心 Y
   * @param {number} w - 宽度
   * @param {number} h - 高度
   * @param {number} radius - 圆角半径（自动裁剪到 min(宽,高)/2）
   * @param {number} [rotation] - 旋转（弧度，默认 0）
   * @returns {BoardItem}
   */
  drawRectRadiusCenter(cx, cy, w, h, radius, rotation) {}

  /**
   * 圆形。
   * @param {number} cx - 圆心 X
   * @param {number} cy - 圆心 Y
   * @param {number} r - 半径
   * @returns {BoardItem}
   */
  drawCircle(cx, cy, r) {}

  /**
   * 椭圆。
   * @param {number} cx - 中心 X
   * @param {number} cy - 中心 Y
   * @param {number} rx - 水平半径
   * @param {number} ry - 垂直半径
   * @param {number} [rotation] - 旋转（弧度，默认 0）
   * @returns {BoardItem}
   */
  drawEllipse(cx, cy, rx, ry, rotation) {}

  /**
   * 封闭多边形（等价于 drawPath(points, true)，兼容保留）。
   * 首尾自动闭合，闭合区域内填充（支持非凸多边形）。
   * @param {[number, number][]} points - 顶点坐标
   * @returns {BoardItem}
   */
  drawPolygon(points) {}

  /**
   * 设置文字字体样式，后续 drawText 生效。
   * @param {Object} opts - 字体选项
   * @param {number} [opts.fontSize] - 字号（画板内部坐标单位）
   * @param {string} [opts.fontFamily] - 字体族，如 'sans-serif'
   * @param {boolean} [opts.bold] - 是否粗体
   * @param {boolean} [opts.italic] - 是否斜体
   * @param {CanvasTextAlign} [opts.align] - 水平对齐：left/center/right
   * @param {CanvasTextBaseline} [opts.baseline] - 垂直对齐：top/middle/bottom...
   * @param {number} [opts.lineHeight] - 行高倍数，默认 1.2
   * @returns {BoardItem}
   */
  setFont(opts) {}

  /**
   * 绘制文字，使用当前填充（颜色/渐变/图案/噪波）和描边样式。
   * 支持 \\n 多行，按 textAlign/textBaseline 对齐。
   * @param {string} text - 文字内容
   * @param {number} x - X 坐标
   * @param {number} y - Y 坐标
   * @returns {BoardItem}
   */
  drawText(text, x, y) {}

  /**
   * 清空所有已记录的绘制命令。
   * @returns {BoardItem}
   */
  clearDraws() {}

  // ---- 遮罩（Mask） ----

  /**
   * 推入路径遮罩：后续绘制只在该路径区域内可见，可嵌套使用，需用 popMask 还原。
   * @param {Array<[number, number]>} points - 遮罩路径点列表
   * @param {boolean} [closed] - 是否闭合，默认 true
   * @returns {BoardItem}
   */
  pushMask(points, closed) {}

  /**
   * 推入圆形遮罩。
   * @param {number} cx - 圆心 X
   * @param {number} cy - 圆心 Y
   * @param {number} r - 半径
   * @returns {BoardItem}
   */
  pushMaskCircle(cx, cy, r) {}

  /**
   * 推入矩形遮罩（两角点）。
   * @param {number} x1 - 左上角 X
   * @param {number} y1 - 左上角 Y
   * @param {number} x2 - 右下角 X
   * @param {number} y2 - 右下角 Y
   * @returns {BoardItem}
   */
  pushMaskRect(x1, y1, x2, y2) {}

  /**
   * 推入椭圆遮罩。
   * @param {number} cx - 中心 X
   * @param {number} cy - 中心 Y
   * @param {number} rx - 水平半径
   * @param {number} ry - 垂直半径
   * @param {number} [rotation] - 旋转（弧度）
   * @returns {BoardItem}
   */
  pushMaskEllipse(cx, cy, rx, ry, rotation) {}

  /**
   * 推入圆角矩形遮罩。
   * @param {number} x1 - 左上角 X
   * @param {number} y1 - 左上角 Y
   * @param {number} x2 - 右下角 X
   * @param {number} y2 - 右下角 Y
   * @param {number} radius - 圆角半径
   * @returns {BoardItem}
   */
  pushMaskRectRadius(x1, y1, x2, y2, radius) {}

  /**
   * 弹出遮罩：恢复到上一个 pushMask 之前的可见区域。
   * @returns {BoardItem}
   */
  popMask() {}

  // ---- 像素级滤镜（对已绘制内容生效） ----

  /**
   * 对画板已绘制内容应用像素级滤镜。
   * @param {'blur'|'hsl'|'rgb'|'displace'|'pinch'|'desaturate'} type - 滤镜类型
   * @param {Object} [opts] - 滤镜选项
   * @returns {BoardItem}
   */
  applyFilter(type, opts) {}

  /**
   * 模糊滤镜。
   * @param {BlurOptions} [opts] - 模糊选项 { radius }
   * @returns {BoardItem}
   */
  blur(opts) {}

  /**
   * HSL 调色（色相偏移/饱和度/亮度调整）。
   * @param {HslOptions} [opts] - HSL 选项 { hue, saturation, lightness }
   * @returns {BoardItem}
   */
  hslAdjust(opts) {}

  /**
   * RGB 调色（各通道加法与乘法调整）。
   * @param {RgbOptions} [opts] - RGB 选项 { r, g, b, rScale, gScale, bScale }
   * @returns {BoardItem}
   */
  rgbAdjust(opts) {}

  /**
   * 置换滤镜（按噪波偏移像素，产生扭曲效果）。
   * @param {DisplaceOptions} [opts] - 置换选项 { amountX, amountY, scale, seed }
   * @returns {BoardItem}
   */
  displace(opts) {}

  /**
   * 挤压滤镜（径向挤压/膨胀，strength>0 挤压，<0 膨胀）。
   * @param {PinchOptions} [opts] - 挤压选项 { strength, cx, cy, radius }
   * @returns {BoardItem}
   */
  pinch(opts) {}

  /**
   * 去色（灰度化）。
   * @param {DesaturateOptions} [opts] - 去色选项 { amount }
   * @returns {BoardItem}
   */
  desaturate(opts) {}

  // ---- 画板蒙版（用另一个画板的亮度控制本画板透明度） ----

  /**
   * 设置蒙版画板：将另一个 BoardItem 作为本画板的亮度蒙版。
   * 蒙版越亮处，本画板越不透明；黑色处完全透明。
   * 常用于文字蒙版、渐变蒙版、自定义形状蒙版等。
   * @param {BoardItem} board - 作为蒙版的画板（可正常绘制任意内容）
   * @param {Object} [opts] - 蒙版选项
   * @param {'luminance'|'alpha'|'red'|'green'|'blue'} [opts.channel] - 取哪个通道作为亮度，默认 luminance
   * @param {boolean} [opts.invert] - 反转蒙版：亮处透明、暗处不透明，默认 false
   * @returns {BoardItem}
   * @example
   * const mask = new BoardItem({ innerWidth: W, innerHeight: H });
   * mask.setFillColor('#fff').setFont({ fontSize: 80, bold: true, align: 'center', baseline: 'middle' })
   *     .drawText('MASK', W/2, H/2);
   * content.setMaskBoard(mask); // 只有文字形状区域可见
   */
  setMaskBoard(board, opts) {}

  /**
   * 清除已设置的蒙版画板。
   * @returns {BoardItem}
   */
  clearMaskBoard() {}

  // ---- 继承自 RelativeContainerItem 的容器能力 ----

  /**
   * 添加子绘制项（子项在内部坐标系中绘制，百分比相对于内部大小）。
   * @param {DrawItem} item
   */
  addChild(item) {}

  /**
   * 设置整体旋转。
   * @param {number} rad - 弧度
   */
  setRotation(rad) {}

  /**
   * 设置整体缩放。
   * @param {number} sx - 水平缩放
   * @param {number} [sy] - 垂直缩放（省略等于 sx）
   */
  setScale(sx, sy) {}

  /**
   * 设置变换中心（比例）。
   * @param {number} cx - 0.5 为中心
   * @param {number} cy
   */
  setCenter(cx, cy) {}

  /**
   * 设置滤镜。
   * @param {FilterOptions} filter
   */
  setFilter(filter) {}

  /**
   * 设置画板位置（百分比，相对于父容器）。
   * @param {number} x
   * @param {number} y
   */
  setPositionPercent(x, y) {}

  /**
   * 设置画板位置（像素）。
   * @param {number} x
   * @param {number} y
   */
  setPositionPixel(x, y) {}

  /**
   * 设置画板尺寸（百分比）。
   * @param {number} w
   * @param {number} h
   */
  setSizePercent(w, h) {}

  /**
   * 设置画板尺寸（像素）。
   * @param {number} w
   * @param {number} h
   */
  setSizePixel(w, h) {}

  /**
   * 开启缓存：将子项内容渲染到离屏 canvas，后续 draw 时直接 drawImage 输出，加速重复绘制。
   * 适用于包含大量复杂子项（如网状线、图形）的容器，在多张卡牌间重复绘制时显著提升性能。
   * 子项属性变更后需调用 refreshCache() 刷新缓存。
   * @returns {this}
   */
  enableCache() {}

  /** 关闭缓存。@returns {this} */
  disableCache() {}

  /**
   * 刷新缓存：标记缓存为脏，下次 draw 时重新渲染。
   * 子项属性变更后需手动调用此方法更新缓存。
   * @returns {this}
   */
  refreshCache() {}

  /** 缓存是否已就绪（已开启、已渲染、未脏）。@type {boolean} */
  get isCacheReady() { return false; }
}

// ========== 用户入口函数声明 ==========

/**
 * 初始化函数（应用启动时调用一次）。
 *
 * 在此函数中创建页面配置并添加到工作区。
 * 页面通过 `draw` 属性指定该页使用的绘制函数名（省略时使用 main），
 * 可通过 `tags` 属性附加键值对信息，在绘制函数中通过 `page.tags` 或 `card.getTag()` 读取。
 *
 * @param {Workspace} workspace - 工作区实例
 * @returns {void}
 *
 * @example
 * function init(workspace) {
 *   const page = workspace.createPage({
 *     width: 2480,
 *     height: 3508,
 *     margin: { top: 40, bottom: 40, left: 40, right: 40 },
 *     cardSize: { width: 0, height: 0 },
 *     grid: { cols: 5, rows: 4 },
 *     background: '#1a2a3a',
 *     tags: { type: 'front', theme: 'dark' }   // draw 未指定 → 默认使用 main
 *   });
 *   workspace.addPage(page);
 *
 *   // 牌背页：通过 draw 属性分发到 back 绘制函数
 *   const backPage = workspace.createPage({ ...page, draw: 'back' });
 *   workspace.addPage(backPage);
 * }
 */
function init(workspace) {}

/**
 * 卡牌绘制函数（每张卡牌调用一次），签名 (page, card)。
 *
 * 通过 `card.id` 区分不同卡牌，使用 `card.addItem()` 添加绘制项。
 * 第一个参数 page 直接就是所属页面的只读对象（含计算后的实际尺寸、行列数、tags、draw）。
 * 通过 `card.hasTag()` / `card.getTag()` 可方便地读取页面 tags。
 * 页面通过 draw 属性指定使用哪个绘制函数（默认 main）。
 *
 * @param {ReadOnlyPageInfo} page - 所属页面的只读对象
 * @param {Card} card - 当前卡牌对象
 * @returns {void | boolean} 返回 false 可跳过该卡牌
 *
 * @example
 * function main(page, card) {
 *   // 直接使用 page 获取页面信息（只读）
 *   const pageWidth = page.width;
 *   const actualCardSize = page.cardSize;       // 计算后的实际卡牌尺寸
 *   const cols = page.grid.cols;                // 实际列数
 *   const drawerName = page.draw;               // 该页使用的绘制函数名
 *
 *   // 通过 tag 判断页面类型
 *   if (page.tags.type === 'front') {
 *     card.backgroundColor = '#f5f0e8';
 *   } else {
 *     card.backgroundColor = '#1a1a2e';
 *   }
 *
 *   const txt = new TextItem({
 *     text: 'A',
 *     fontSize: card.width * 0.3,
 *     color: '#cc2233',
 *     textAlign: 'center'
 *   });
 *   txt.setPositionPercent(0.5, 0.5);
 *   card.addItem(txt);
 * }
 */
function main(page, card) {}

// ========== UI 参数面板系统 ==========

/**
 * UI 管理器单例。
 * 持久化值存储（store）在多次代码执行间保留用户输入。
 * 每次运行代码前调用 beginRun() 清空布局树（保留值）。
 */
const UIManager = {
  /** 持久化值存储 */
  store: {},
  /** 当前布局树根节点 */
  root: { children: [] },
  /** 根目录句柄 */
  rootDirHandle: null,
  /** 开始新的运行：清空布局树，保留值 */
  beginRun() {},
  /** 获取持久化值 */
  getState(id, defaultValue) {},
  /** 设置持久化值 */
  setState(id, value) {},
  /** 检查 ID 是否已存在 */
  has(id) {},
  /** 清空所有持久化值 */
  clearStore() {},
  /** 重置全部：清空持久化值（恢复代码默认值）并清空布局树 */
  resetAll() {},
  /**
   * 序列化所有持久化值为 JSON 字符串（用于保存到文件）。
   * 自动过滤 File、Blob、函数等不可序列化值。
   * @returns {string} JSON 字符串
   */
  serialize() {},
  /**
   * 从 JSON 字符串反序列化并恢复持久化值（覆盖现有同名键）。
   * 用于从保存的文件中恢复用户输入。
   * @param {string} json - JSON 字符串
   */
  deserialize(json) {},
  /** 设置根目录（用于路径选择） */
  setRootDirectory() {},
  /** File System Access API 是否可用 */
  hasFileSystemAPI: false,
  /** 当前 UI 选项卡数量 */
  uiTabCount: 1,
  /** 添加新的 UI 选项卡，返回其索引；若同名则返回已有索引 */
  addUiTab(name) {},
  /** 按名称或索引激活 UI 选项卡，后续创建的 UI 归入该选项卡 */
  setActiveUiTab(target) {},
  /** 重命名指定 UI 选项卡（索引 0 的"主要设置"不可改名） */
  renameUiTab(idx, name) {},
  /** 删除指定 UI 选项卡（索引 0 不可删）；删除后激活前一个 */
  removeUiTab(idx) {},
};

/**
 * 跨代码选项卡引用：执行指定名称的代码选项卡内容。
 * 被引入代码中的 function/var 声明会进入全局作用域，可供当前代码调用。
 * @param {string} name - 代码选项卡名称
 */
function include(name) {}

/**
 * 获取指定代码选项卡的原始文本内容。
 * @param {string} name - 代码选项卡名称
 * @returns {string} 该选项卡的代码文本
 */
function getCode(name) {}

/**
 * 在指定上下文中执行用户代码字符串并返回结果（等价于 workspace.run）。
 * @param {string} code - 用户代码字符串
 * @param {Object} [context] - 代码可访问的变量上下文
 * @returns {*} 代码返回值
 */
function run(code, context) {}

/**
 * 行布局（水平排列子项）。
 * 创建后自动添加到参数面板根布局。
 *
 * @example
 * const row = new RowLayout({ gap: 10 });
 * row.add(new LabelUI('名称:'));
 * row.add(new EditBoxUI('name', '默认值'));
 */
class RowLayout {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.gap=8] - 子项间距（像素）
   * @param {'start'|'center'|'end'} [opts.align='center'] - 垂直对齐
   * @param {boolean} [opts.wrap=false] - 是否允许换行
   */
  constructor(opts) {}
  /**
   * 添加子项到布局。
   * @param {*} item - UI 控件或子布局
   * @returns {RowLayout} this（链式调用）
   */
  add(item) {}
}

/**
 * 列布局（垂直排列子项）。
 * 创建后自动添加到参数面板根布局。
 *
 * @example
 * const col = new ColumnLayout({ gap: 10 });
 * col.add(new LabelUI('标题'));
 * col.add(new EditBoxUI('title', '标题文字'));
 */
class ColumnLayout {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.gap=8] - 子项间距（像素）
   * @param {'start'|'center'|'end'} [opts.align='start'] - 水平对齐
   */
  constructor(opts) {}
  /**
   * 添加子项到布局。
   * @param {*} item - UI 控件或子布局
   * @returns {ColumnLayout} this（链式调用）
   */
  add(item) {}
}

/**
 * 标签（显示文字，无状态，不需要 ID）。
 *
 * @example
 * const label = new LabelUI('输入名称:');
 * label.text = '新文字';  // 可修改
 */
class LabelUI {
  /**
   * @param {string} [text=''] - 显示文字
   */
  constructor(text) {}
  /** @type {string} 显示文字 */
  get text() {}
  set text(v) {}
}

/**
 * 编辑框（单行文本输入）。
 * 需要 ID 用于状态持久化：首次创建使用默认值，后续运行保留用户输入。
 *
 * @example
 * const edit = new EditBoxUI('cardTitle', '默认标题');
 * const title = edit.text;  // 读取当前值
 * edit.text = '新标题';      // 设置值
 */
class EditBoxUI {
  /**
   * @param {string} id - 唯一标识（用于状态持久化）
   * @param {string} [defaultValue=''] - 首次创建时的默认值
   */
  constructor(id, defaultValue) {}
  /** @type {string} 当前文本 */
  get text() {}
  set text(v) {}
}

/**
 * 多行编辑框。
 *
 * 可通过 opts 指定宽度（像素）和行数（高度），均支持运行时读写修改。
 * 省略 width 时宽度由布局自动决定。
 *
 * @example
 * const ta = new TextAreaUI('description', '多行\n文字', { width: 300, rows: 6 });
 * ta.width = 400;   // 运行时修改宽度
 * ta.rows = 3;      // 运行时修改行数
 */
class TextAreaUI {
  /**
   * @param {string} id - 唯一标识
   * @param {string} [defaultValue=''] - 默认值
   * @param {Object} [opts] - 配置选项
   * @param {number} [opts.width] - 宽度（像素），省略时由布局自动决定
   * @param {number} [opts.rows=4] - 文本行数（高度）
   */
  constructor(id, defaultValue, opts) {}
  /** @type {string} 当前文本 */
  get text() {}
  set text(v) {}
  /** @type {number | null} 宽度（像素），null 表示由布局决定 */
  get width() {}
  set width(v) {}
  /** @type {number} 文本行数（高度） */
  get rows() {}
  set rows(v) {}
}

/**
 * 代码编辑框（Monaco 高亮 + 智能提示）。
 * 仅用于编辑代码文本，不自动产生任何效果；其 value 可通过 workspace.run(code, context) 在绘制函数中执行。
 * 主代码中定义的顶层 function/var 会作为补全提示注入。
 *
 * @example
 * const ce = new CodeEditorUI('myexpr', 'card.width + 20', { height: 120 });
 * // 在绘制函数中：
 * // const val = workspace.run(ce.value, { card });
 */
class CodeEditorUI {
  /**
   * @param {string} id - 唯一标识
   * @param {string} [defaultValue=''] - 默认代码文本
   * @param {Object} [opts] - 配置选项
   * @param {number} [opts.height=160] - 编辑器高度（像素）
   * @param {string} [opts.language='javascript'] - 语言
   */
  constructor(id, defaultValue, opts) {}
  /** @type {string} 当前代码文本 */
  get value() {}
  set value(v) {}
  /** @type {string} 当前代码文本（同 value） */
  get text() {}
  set text(v) {}
  /** @type {string} 当前代码文本（同 value） */
  get code() {}
  set code(v) {}
  /** @type {number} 编辑器高度（像素） */
  get height() {}
  set height(v) {}
}

/**
 * 按钮（用于事件操作）。
 * 点击时执行传入的回调；每次运行脚本时节点重建，回调随之重新注册。
 *
 * @example
 * new ButtonUI('roll', '随机重排', () => {
 *   UIManager.setState('seed', Math.floor(Math.random() * 10000));
 * });
 */
class ButtonUI {
  /**
   * @param {string} id - 唯一标识
   * @param {string} [label='按钮'] - 按钮文字
   * @param {Function} [onClick=null] - 点击回调
   */
  constructor(id, label, onClick) {}
  /** @type {string} 按钮文字 */
  get label() {}
  set label(v) {}
  /** 设置/替换点击回调 */
  setOnClick(cb) {}
}

/**
 * 滑块条（数值拖动选择）。
 * 值按 step 对齐并自动夹取到 [min, max] 范围。
 *
 * @example
 * const s = new SliderUI('opacity', 50, { min: 0, max: 100, step: 5, label: '不透明度' });
 * // 绘制函数中读取: s.value
 */
class SliderUI {
  /**
   * @param {string} id - 唯一标识
   * @param {number} [defaultValue=0] - 默认值
   * @param {Object} [opts] - 配置选项
   * @param {number} [opts.min=0] - 最小值
   * @param {number} [opts.max=100] - 最大值
   * @param {number} [opts.step=1] - 步长（小数步长自动推断显示精度）
   * @param {string} [opts.label=''] - 左侧标签文字
   * @param {boolean} [opts.showValue=true] - 是否在右侧显示当前数值
   */
  constructor(id, defaultValue, opts) {}
  /** @type {number} 当前值 */
  get value() {}
  set value(v) {}
  /** @type {number} 最小值 */
  get min() {}
  set min(v) {}
  /** @type {number} 最大值 */
  get max() {}
  set max(v) {}
  /** @type {number} 步长 */
  get step() {}
  set step(v) {}
  /** @type {string} 左侧标签文字 */
  get label() {}
  set label(v) {}
  /** @type {boolean} 是否显示当前数值 */
  get showValue() {}
  set showValue(v) {}
}

/**
 * 下拉框。
 * editable=true 时为可编辑下拉框：可自由输入任意值，也可从列表中选择。
 *
 * @example
 * const dd = new DropdownUI('font', ['Arial', 'Consolas', 'SimSun'], 'Consolas');
 * const font = dd.selected;
 * // 可编辑下拉框：允许输入列表外的自定义字体名
 * const editFont = new DropdownUI('font2', ['Arial', 'Consolas'], 'Consolas', { editable: true });
 */
class DropdownUI {
  /**
   * @param {string} id - 唯一标识（相同 ID 跨运行保留用户输入，默认值仅首次创建生效）
   * @param {string[]} options - 选项列表
   * @param {string} [defaultValue] - 默认值（省略则取第一个选项）
   * @param {Object} [opts]
   * @param {boolean} [opts.editable=false] - 是否允许编辑：true 时可自由输入，也可从列表选择
   */
  constructor(id, options, defaultValue, opts) {}
  /** @type {string} 当前选中值 */
  get selected() {}
  set selected(v) {}
}

/**
 * 数值编辑框（带 +/- 调节按钮）。
 * 调节时自动按精度四舍五入，消除浮点误差（如 0.8+0.1 不会再出现 0.9000000000000001）。
 *
 * @example
 * const num = new NumberEditUI('cardCount', 54, { min: 1, max: 100, step: 1 });
 * const count = num.value;
 * // 指定精度：0 为整数，2 为保留 2 位小数
 * const scale = new NumberEditUI('scale', 1, { step: 0.1, precision: 2 });
 */
class NumberEditUI {
  /**
   * @param {string} id - 唯一标识（相同 ID 跨运行保留用户输入，默认值仅首次创建生效）
   * @param {number} [defaultValue=0] - 默认值
   * @param {Object} [opts]
   * @param {number} [opts.min] - 最小值
   * @param {number} [opts.max] - 最大值
   * @param {number} [opts.step=1] - 步进值（+/- 按钮每次增减量）
   * @param {number} [opts.precision] - 显示精度（小数位数）：0 为整数；未指定时按 step 的小数位数自动推断（如 step=0.1 → 1 位小数）
   */
  constructor(id, defaultValue, opts) {}
  /** @type {number} 当前值 */
  get value() {}
  set value(v) {}
}

/**
 * 颜色选择框。
 *
 * @example
 * const color = new ColorPickerUI('bgColor', '#f5f0e8');
 * const bg = color.color;
 */
class ColorPickerUI {
  /**
   * @param {string} id - 唯一标识
   * @param {string} [defaultValue='#000000'] - 默认颜色（如 '#ff0000'）
   */
  constructor(id, defaultValue) {}
  /** @type {string} 当前颜色 */
  get color() {}
  set color(v) {}
}

/**
 * 开关（布尔值切换）。
 *
 * @example
 * const sw = new SwitchUI('showBorder', true);
 * if (sw.on) { /* 绘制边框 *\/ }
 */
class SwitchUI {
  /**
   * @param {string} id - 唯一标识
   * @param {boolean} [defaultValue=false] - 默认值
   */
  constructor(id, defaultValue) {}
  /** @type {boolean} 当前开关状态 */
  get on() {}
  set on(v) {}
}

/**
 * 复选框（功能和开关类似，形式不同）。
 *
 * @example
 * const cb = new CheckboxUI('enabled', true);
 * if (cb.checked) { /* ... *\/ }
 */
class CheckboxUI {
  /**
   * @param {string} id - 唯一标识
   * @param {boolean} [defaultValue=false] - 默认值
   */
  constructor(id, defaultValue) {}
  /** @type {boolean} 当前选中状态 */
  get checked() {}
  set checked(v) {}
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
 *   const names = list.keys.map(k => UIManager.getState(`players.${k}.name`, ''));
 *
 * 不保留引用时，从 store 取结构：
 *   const saved = UIManager.has('players') ? UIManager.getState('players', null) : null;
 *   const keys = (saved && saved.keys) || [];
 *
 * ===== 完整示例 =====
 *   let playerList;
 *   function init(workspace) {
 *     const col = new ColumnLayout({ gap: 8 });
 *     playerList = new ListUI('players', 2, (index, key) => {
 *       const row = new RowLayout({ gap: 6 });
 *       row.add(new LabelUI(`玩家 ${index + 1}:`));
 *       row.add(new EditBoxUI(`players.${key}.name`, ''));
 *       row.add(new NumberEditUI(`players.${key}.score`, 0));
 *       return row;
 *     });
 *     col.add(playerList);
 *   }
 *   // 读取所有玩家：
 *   function getPlayers() {
 *     return playerList.keys.map(k => ({
 *       name: UIManager.getState(`players.${k}.name`, ''),
 *       score: UIManager.getState(`players.${k}.score`, 0),
 *     }));
 *   }
 *
 * @example
 * const list = new ListUI('players', 2, (idx, key) => {
 *   const row = new RowLayout({ gap: 6 });
 *   row.add(new EditBoxUI(`players.${key}.name`, ''));
 *   row.add(new NumberEditUI(`players.${key}.score`, 0));
 *   return row;
 * });
 * // 运行时增删：
 * list.addRow();          // 末尾新增一行，返回新行 key
 * list.removeRow('r1');   // 删除 key 为 r1 的行
 * list.clear();           // 清空所有行
 */
class ListUI {
  /**
   * @param {string} id - 唯一标识（用于持久化行结构）
   * @param {number} initialCount - 初始行数（已有持久化结构时忽略）
   * @param {(index: number, key: string) => UINodeWrapper} factory - 行工厂，返回该行的 UI 节点；内部控件 ID 必须拼上 key
   */
  constructor(id, initialCount, factory) {}
  /** @type {number} 当前行数 */
  get count() {}
  /** @type {string[]} 所有行的稳定 key 列表，如 ['r0','r1','r3']（删除 r2 后 r3 不变） */
  get keys() {}
  /**
   * 获取指定 key 所在的行索引，不存在返回 -1
   * @param {string} key
   * @returns {number}
   */
  indexOf(key) {}
  /**
   * 新增一行（末尾），自动取下一个未用编号
   * @returns {string} 新行的 key
   */
  addRow() {}
  /**
   * 删除指定 key 的行
   * @param {string} key
   */
  removeRow(key) {}
  /** 清空所有行 */
  clear() {}
}

/**
 * 表格：可动态增删行和列，每个单元格可包含任意 UI 对象（由 factory 返回）。
 *
 * 每个单元格有稳定 key，内部控件建议用含 key 的 ID 存储值。
 * 结构（行数/列数/keys）持久化跨运行保留。
 *
 * @example
 * const table = new TableUI('matrix', 2, 3, (r, c, key) => {
 *   return new EditBoxUI(`matrix.${key}`, '');
 * });
 * // 增删行列：table.addRow(); table.addCol(); table.removeRow('r1'); table.removeCol('c0');
 */
class TableUI {
  /**
   * @param {string} id - 唯一标识
   * @param {number} initialRows - 初始行数
   * @param {number} initialCols - 初始列数
   * @param {(r: number, c: number, key: string) => UINodeWrapper} factory - 单元格工厂，返回该单元格的 UI 节点
   */
  constructor(id, initialRows, initialCols, factory) {}
  /** @type {number} 行数 */
  get rowCount() {}
  /** @type {number} 列数 */
  get colCount() {}
  /** @type {string[]} 行 key 列表 */
  get rowKeys() {}
  /** @type {string[]} 列 key 列表 */
  get colKeys() {}
  /** 新增一行（末尾），返回新行 key */
  addRow() {}
  /** 删除指定 key 的行 */
  removeRow(key) {}
  /** 新增一列（末尾），返回新列 key */
  addCol() {}
  /** 删除指定 key 的列 */
  removeCol(key) {}
  /** 清空所有行列 */
  clear() {}
}

/**
 * 路径选择框（选择根目录下的文件，返回相对路径）。
 * 首次使用时会提示选择根目录。
 *
 * @example
 * const path = new PathPickerUI('imgPath', { accept: 'image/*' });
 * const imgPath = path.path;  // 如 'images/bg.png'
 */
class PathPickerUI {
  /**
   * @param {string} id - 唯一标识
   * @param {Object} [opts]
   * @param {string} [opts.accept='*/*'] - 文件类型过滤
   */
  constructor(id, opts) {}
  /** @type {string} 当前路径 */
  get path() {}
  set path(v) {}
  /** 手动触发文件选择 */
  pick() {}
}

/**
 * 文件包装器。
 * 由 FilePickerUI.file 返回，提供文本/JSON/CSV/图像处理功能。
 */
class FileWrapper {
  /** @type {string} 文件名 */
  get name() {}
  /** @type {number} 文件大小（字节） */
  get size() {}
  /** @type {string} MIME 类型 */
  get type() {}
  /** @type {string} Blob URL（可用于 ImageItem.src 等） */
  get url() {}
  /** 读取文本内容 */
  text() {}
  /** 解析为 JSON */
  json() {}
  /** 解析为 CSV */
  csv(opts) {}
  /** 加载为 HTMLImageElement */
  image() {}
  /** 释放资源 */
  dispose() {}
}

/**
 * 文件选择框（上传任意文件，返回 FileWrapper）。
 *
 * @example
 * const fp = new FilePickerUI('bgImage', { accept: 'image/*' });
 * // 用户选择文件后...
 * if (fp.hasFile) {
 *   const img = new ImageItem({ src: fp.file.url, width: 100, height: 100 });
 *   card.addItem(img);
 * }
 *
 * // 文本文件处理
 * const fp2 = new FilePickerUI('dataFile', { accept: '.csv,.json,.txt' });
 * if (fp2.hasFile) {
 *   const csvData = await fp2.file.csv();  // 解析 CSV
 *   const jsonData = await fp2.file.json();  // 解析 JSON
 *   const text = await fp2.file.text();  // 原始文本
 * }
 */
class FilePickerUI {
  /**
   * @param {string} id - 唯一标识
   * @param {Object} [opts]
   * @param {string} [opts.accept='*/*'] - 文件类型过滤，如 'image/*' 或 '.csv,.json'
   */
  constructor(id, opts) {}
  /** @type {FileWrapper | null} 当前文件包装器 */
  get file() {}
  /** @type {boolean} 是否已选择文件 */
  get hasFile() {}
}

/**
 * 画板显示区域（在参数面板中显示 BoardItem 内容）。
 * 可用于实时预览画板绘制效果。
 *
 * @example
 * const display = new BoardDisplayUI('preview', { width: 200, height: 300 });
 * const board = new BoardItem({
 *   innerWidth: 100, innerHeight: 150,
 *   width: 200, height: 300,
 *   backgroundColor: '#f5f0e8'
 * });
 * board.setFillColor('#cc2233');
 * board.drawCircle(50, 75, 20);
 * display.board = board;
 * display.redraw();
 */
class BoardDisplayUI {
  /**
   * @param {string} id - 唯一标识
   * @param {Object} [opts]
   * @param {number} [opts.width=200] - 显示区域宽度
   * @param {number} [opts.height=200] - 显示区域高度
   */
  constructor(id, opts) {}
  /** @type {BoardItem | null} 要显示的画板 */
  set board(b) {}
  get board() {}
  /** 重绘（修改画板后调用） */
  redraw() {}
}
