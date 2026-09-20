// src/api/draw-items/PageRenderRegistry.ts
import type { Card } from '../Card';

/** 单页已渲染信息（供 SpriteClipItem / TileBoardItem 取材使用） */
export interface PageRenderInfo {
  /** 该页绘制后的原生分辨率 canvas（含背景、整页项、所有卡牌） */
  canvas: HTMLCanvasElement;
  /** 该页所有卡牌（按生成顺序） */
  cards: Card[];
  /** 原始页面配置（含 width/height/background/indexName/isBackground 等） */
  pageConfig: any;
  /** 页面索引（workspace 统一分配） */
  pageIndex: number;
}

/**
 * 页面渲染注册表（单例）。
 *
 * 由 Preview.vue 在构建缓冲前填充：先把所有页面（后台页优先）预渲染到离屏 canvas，
 * 注册到本表；之后 SpriteClipItem / TileBoardItem 的 draw() 即可通过 pageRef / cardId
 * 解析到源页面/源卡牌，截取指定区域并拉伸绘制。
 *
 * 解析规则（用户要求）：
 *  - pageRef 为字符串时按 indexName 查找；为数字时按 pageIndex 查找
 *  - 存在多个同名 indexName 页面时，按添加顺序取第一个含指定卡牌 id 的页面
 *  - cardId 为 -1 / null 时引用整张页面
 */
class PageRenderRegistryImpl {
  private pages = new Map<number, PageRenderInfo>();
  /** indexName → pageIndex 列表（按添加顺序） */
  private nameMap = new Map<string, number[]>();

  clear(): void {
    this.pages.clear();
    this.nameMap.clear();
  }

  /** 注册一页（pageIndex 必须唯一） */
  set(info: PageRenderInfo): void {
    this.pages.set(info.pageIndex, info);
    const name = info.pageConfig?.indexName;
    if (name) {
      if (!this.nameMap.has(name)) this.nameMap.set(name, []);
      const arr = this.nameMap.get(name)!;
      if (!arr.includes(info.pageIndex)) arr.push(info.pageIndex);
    }
  }

  /** 按 pageIndex 直接获取 */
  getByIndex(pageIndex: number): PageRenderInfo | undefined {
    return this.pages.get(pageIndex);
  }

  /** 按 indexName 获取第一页 */
  getByName(name: string): PageRenderInfo | undefined {
    const arr = this.nameMap.get(name);
    if (!arr || arr.length === 0) return undefined;
    return this.pages.get(arr[0]);
  }

  /**
   * 解析 (pageRef, cardId) 引用。
   *  - pageRef: 字符串(indexName) 或 数字(pageIndex)
   *  - cardId: null/-1 时引用整页；否则取该页含此 id 的卡牌
   *
   * 多同名页面规则：按添加顺序，取第一个含指定 cardId 的页面；
   * cardId 为 null/-1 时取第一个同名页面。
   */
  resolveReference(pageRef: string | number, cardId: number | null | undefined): {
    info: PageRenderInfo;
    card: Card | undefined;
  } | undefined {
    let indices: number[];
    if (typeof pageRef === 'string') {
      indices = this.nameMap.get(pageRef) || [];
    } else {
      indices = [pageRef];
    }
    for (const pi of indices) {
      const info = this.pages.get(pi);
      if (!info) continue;
      if (cardId === null || cardId === undefined || cardId === -1) {
        // 整页引用：取第一个同名页面
        return { info, card: undefined };
      }
      const card = info.cards.find(c => c.id === cardId);
      if (card) return { info, card };
      // 该页不含此卡牌，继续查下一个同名页面
    }
    return undefined;
  }

  /**
   * 收集多个页面引用下的全部卡牌（按页面顺序、页内顺序），用作砖块素材。
   * 用于 TileBoardItem.setTile(id) —— 在指定页面集合中按 id 查找卡牌。
   */
  findCardById(refs: (string | number)[], cardId: number): {
    info: PageRenderInfo;
    card: Card;
  } | undefined {
    for (const ref of refs) {
      const r = this.resolveReference(ref, cardId);
      if (r && r.card) return { info: r.info, card: r.card };
    }
    return undefined;
  }

  /**
   * 解析页面引用列表为 PageRenderInfo 列表（去重，保持顺序）。
   * 用于 TileBoardItem 自动布局（按页面卡牌划分素材）。
   */
  resolvePages(refs: (string | number)[]): PageRenderInfo[] {
    const out: PageRenderInfo[] = [];
    const seen = new Set<number>();
    for (const ref of refs) {
      let indices: number[];
      if (typeof ref === 'string') {
        indices = this.nameMap.get(ref) || [];
      } else {
        indices = [ref];
      }
      for (const pi of indices) {
        if (seen.has(pi)) continue;
        seen.add(pi);
        const info = this.pages.get(pi);
        if (info) out.push(info);
      }
    }
    return out;
  }
}

/** 全局单例：Preview.vue 填充，SpriteClipItem / TileBoardItem 读取 */
export const pageRenderRegistry = new PageRenderRegistryImpl();
