// src/api/Card.ts
import type { DrawItem } from './draw-items';

/**
 * 只读页面信息（计算后的实际值）
 * 绘制函数的第一个参数直接就是该对象，所有属性均为只读，不可修改。
 */
export interface ReadOnlyPageInfo {
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
  /** 页面索引名称（用于截取图块/砖块画板按名称引用，未指定时为 ''） */
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

export interface Card {
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
  /** 获取指定 tag 的值，不存在时返回 defaultValue 或 undefined */
  getTag(key: string, defaultValue?: string): string | undefined;
  /** 获取所有 tags 的键值对副本 */
  getTags(): Record<string, string>;
}
