// src/api/ui/index.ts
// UI 参数面板系统：布局容器、控件、文件处理、画板显示
// 核心特性：状态持久化（跨代码执行保留用户输入），流式布局，自动排版

import { reactive, markRaw, ref } from 'vue'
import { BoardItem } from '../draw-items/BoardItem'

// ===================== 核心管理器 =====================

/** 持久化值存储（跨 runScript 调用保留） */
const store = reactive<Record<string, any>>({})

/** UI 选项卡 */
export interface UiTab { name: string; children: any[] }

/** 所有 UI 选项卡（默认仅一个"主要设置"，用于兼容老代码） */
export const uiTabs = reactive<UiTab[]>([{ name: '主要设置', children: [] }])

/** 当前激活的 UI 选项卡索引 */
export const activeUiTab = ref(0)

/** 当前布局树根节点（其 children 始终指向激活选项卡的 children，兼容老代码 root.children.push） */
export const root = reactive<{ children: any[] }>({ children: uiTabs[0].children })

/** 根目录句柄（用于路径选择） */
let _rootDirHandle: any = null

let _uidCounter = 0
function genId(): string {
  return `_auto_${++_uidCounter}`
}

/** UI 管理器（单例，全局共享） */
export const UIManager = {
  /** 持久化值存储 */
  store,
  /** 当前布局树根节点 */
  root,
  /** 所有 UI 选项卡 */
  uiTabs,
  /** 当前激活的 UI 选项卡索引 */
  activeUiTab,
  /** 根目录句柄 */
  get rootDirHandle() { return _rootDirHandle },
  set rootDirHandle(v: any) { _rootDirHandle = v },

  /** 开始新的运行：清空所有选项卡的布局树，保留值；激活选项卡重置为主要设置(index 0)，
   *  保证代码中未显式 setActiveUiTab 时创建的 UI 归入主要设置 */
  beginRun() {
    for (const tab of uiTabs) {
      tab.children.splice(0, tab.children.length)
    }
    activeUiTab.value = 0
    root.children = uiTabs[0].children
  },

  /** 获取持久化值（不存在时用默认值初始化） */
  getState(id: string, defaultValue: any): any {
    if (!(id in store)) {
      store[id] = defaultValue
    }
    return store[id]
  },

  /** 设置持久化值 */
  setState(id: string, value: any) {
    store[id] = value
  },

  /** 检查ID是否已存在 */
  has(id: string): boolean {
    return id in store
  },

  /** 清空所有持久化值 */
  clearStore() {
    for (const k of Object.keys(store)) {
      delete store[k]
    }
  },

  /** 重置全部：清空持久化值（所有控件恢复为代码中定义的默认值）并清空布局树。
   *  注意：项目标题 __projectTitle__ 由用户在顶部输入框编辑，不属于代码定义的控件，
   *  重置时保留，避免用户误点重置丢失标题。 */
  resetAll() {
    const savedTitle = store['__projectTitle__']
    this.clearStore()
    if (savedTitle !== undefined) store['__projectTitle__'] = savedTitle
    for (const tab of uiTabs) {
      tab.children.splice(0, tab.children.length)
    }
  },

  // ===================== UI 选项卡管理 =====================

  /** 当前选项卡数量 */
  get uiTabCount(): number { return uiTabs.length },

  /** 添加新的 UI 选项卡，返回其索引；若同名则返回已有索引 */
  addUiTab(name: string): number {
    const idx = uiTabs.findIndex(t => t.name === name)
    if (idx >= 0) return idx
    uiTabs.push({ name, children: [] })
    return uiTabs.length - 1
  },

  /** 按名称或索引激活 UI 选项卡，后续创建的 UI 归入该选项卡 */
  setActiveUiTab(target: string | number) {
    let idx: number
    if (typeof target === 'number') {
      idx = Math.max(0, Math.min(target, uiTabs.length - 1))
    } else {
      idx = uiTabs.findIndex(t => t.name === target)
      if (idx < 0) idx = this.addUiTab(target)
    }
    activeUiTab.value = idx
    root.children = uiTabs[idx].children
    return idx
  },

  /** 重命名指定 UI 选项卡（索引 0 的"主要设置"不可改名） */
  renameUiTab(idx: number, name: string) {
    if (idx <= 0 || idx >= uiTabs.length) return
    uiTabs[idx].name = name
  },

  /** 删除指定 UI 选项卡（索引 0 不可删）；删除后激活前一个 */
  removeUiTab(idx: number) {
    if (idx <= 0 || idx >= uiTabs.length) return
    uiTabs.splice(idx, 1)
    const newActive = Math.min(activeUiTab.value, uiTabs.length - 1)
    this.setActiveUiTab(newActive)
  },

  /** 设置根目录 */
  async setRootDirectory(): Promise<boolean> {
    if (!('showDirectoryPicker' in window)) return false
    try {
      _rootDirHandle = await (window as any).showDirectoryPicker()
      return true
    } catch {
      return false
    }
  },

  /** 检查 File System Access API 是否可用 */
  get hasFileSystemAPI(): boolean {
    return 'showOpenFilePicker' in window
  },

  /**
   * 序列化所有持久化值为 JSON 字符串（用于保存到文件）。
   * 会自动过滤不可序列化的值（File、Blob、函数等）。
   */
  serialize(): string {
    const clean: Record<string, any> = {}
    for (const key of Object.keys(store)) {
      const val = store[key]
      if (val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        clean[key] = val
      } else if (typeof val === 'object' && !Array.isArray(val)) {
        // 普通对象（ListUI/TableUI 结构等），深拷贝并过滤
        try {
          clean[key] = JSON.parse(JSON.stringify(val))
        } catch {
          // 不可序列化则跳过
        }
      } else if (Array.isArray(val)) {
        try {
          clean[key] = JSON.parse(JSON.stringify(val))
        } catch {
          // 跳过
        }
      }
      // 其他类型（File、Blob、函数等）不保存
    }
    // 持久化 UI 选项卡名称（手动添加的选项卡跨运行保留）
    clean['__uiTabs__'] = uiTabs.map(t => t.name)
    return JSON.stringify(clean)
  },

  /**
   * 从 JSON 字符串反序列化并恢复持久化值（覆盖现有同名键）。
   * 用于从保存的文件中恢复用户输入。
   */
  deserialize(json: string): void {
    if (!json) return
    try {
      const data = JSON.parse(json)
      if (data && typeof data === 'object') {
        // 恢复 UI 选项卡名称
        if (Array.isArray(data['__uiTabs__']) && data['__uiTabs__'].length > 0) {
          uiTabs.splice(0, uiTabs.length)
          for (const name of data['__uiTabs__']) {
            uiTabs.push({ name: String(name), children: [] })
          }
          activeUiTab.value = 0
          root.children = uiTabs[0].children
          delete data['__uiTabs__']
        }
        for (const key of Object.keys(data)) {
          store[key] = data[key]
        }
      }
    } catch {
      // 解析失败则忽略
    }
  },
}

// ===================== 基础包装器 =====================

/** UI 节点包装器基类 */
export class UINodeWrapper {
  node: any
  constructor(node?: any) {
    this.node = node
  }
}

// ===================== 布局容器 =====================

/** 行布局（水平排列） */
export class RowLayout extends UINodeWrapper {
  constructor(opts: { gap?: number; align?: 'start' | 'center' | 'end'; wrap?: boolean } = {}) {
    super(reactive({
      type: 'row',
      id: genId(),
      children: [],
      gap: opts.gap ?? 8,
      align: opts.align ?? 'center',
      wrap: opts.wrap ?? false,
    }))
    // 先挂到 root.children 顶层；若之后被父布局 add() 则会被移走
    root.children.push(this.node)
  }

  add(item: UINodeWrapper): this {
    if (item && item.node) {
      // 如果该子项之前在顶层（被构造函数加入），将其从 root.children 移除
      // 避免同一个节点被渲染两次（顶层一次 + 父容器内一次）
      const topIdx = root.children.indexOf(item.node)
      if (topIdx >= 0) root.children.splice(topIdx, 1)
      this.node.children.push(item.node)
    }
    return this
  }
}

/** 列布局（垂直排列） */
export class ColumnLayout extends UINodeWrapper {
  constructor(opts: { gap?: number; align?: 'start' | 'center' | 'end' } = {}) {
    super(reactive({
      type: 'column',
      id: genId(),
      children: [],
      gap: opts.gap ?? 8,
      align: opts.align ?? 'start',
    }))
    root.children.push(this.node)
  }

  add(item: UINodeWrapper): this {
    if (item && item.node) {
      const topIdx = root.children.indexOf(item.node)
      if (topIdx >= 0) root.children.splice(topIdx, 1)
      this.node.children.push(item.node)
    }
    return this
  }
}

// ===================== 动态列表 / 表格 =====================

/**
 * 生成下一个稳定 key（r0/r1/...，取已有 key 中最大序号+1）
 */
function nextKey(existing: string[], prefix: string): string {
  let max = -1
  for (const k of existing) {
    const m = k.match(/^r(\d+)$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}${max + 1}`
}

/**
 * 列表：可动态增删行，每行可包含任意 UI 对象（由 factory 返回）。
 *
 * 每行有稳定 key（非索引），内部控件建议用含 key 的 ID 存储值，
 * 这样删除中间行不会导致数据错位。结构（行数/keys）持久化跨运行保留。
 *
 * @example
 * const list = new ListUI('players', 2, (idx, key) => {
 *   const row = new RowLayout({ gap: 6 });
 *   row.add(new EditBoxUI(`players.${key}.name`, ''));
 *   row.add(new NumberEditUI(`players.${key}.score`, 0));
 *   return row;
 * });
 * // 读取：UIManager.getState('players.r0.name', '')
 */
export class ListUI extends UINodeWrapper {
  private _id: string
  private _factory: (index: number, key: string) => UINodeWrapper

  constructor(id: string, initialCount: number, factory: (index: number, key: string) => UINodeWrapper) {
    super()
    this._id = id
    this._factory = factory

    // 从持久化存储恢复结构
    let saved = store[id]
    if (!saved || !Array.isArray(saved.keys)) {
      const keys: string[] = []
      for (let i = 0; i < initialCount; i++) keys.push(`r${i}`)
      saved = { count: initialCount, keys }
      store[id] = saved
    }

    const node = reactive({
      type: 'list',
      id,
      rows: [] as { key: string; node: any }[],
    })

    for (let i = 0; i < saved.keys.length; i++) {
      const key = saved.keys[i]
      const item = factory(i, key)
      // 从顶层移走（factory 内的布局会 push 到 root.children）
      if (item && item.node) {
        const topIdx = root.children.indexOf(item.node)
        if (topIdx >= 0) root.children.splice(topIdx, 1)
      }
      node.rows.push({ key, node: item ? item.node : null })
    }

    ;(node as any).instance = markRaw(this)
    this.node = node
    root.children.push(node)
  }

  /** 当前行数 */
  get count(): number { return (this.node as any).rows.length }

  /** 所有行的稳定 key 列表 */
  get keys(): string[] { return (this.node as any).rows.map((r: any) => r.key) }

  /** 获取指定 key 所在的行索引 */
  indexOf(key: string): number {
    return (this.node as any).rows.findIndex((r: any) => r.key === key)
  }

  /** 新增一行（末尾），返回新行的 key */
  addRow(): string {
    const keys = this.keys
    const key = nextKey(keys, 'r')
    const idx = keys.length
    const item = this._factory(idx, key)
    if (item && item.node) {
      const topIdx = root.children.indexOf(item.node)
      if (topIdx >= 0) root.children.splice(topIdx, 1)
    }
    ;(this.node as any).rows.push({ key, node: item ? item.node : null })
    this._save()
    return key
  }

  /** 删除指定 key 的行 */
  removeRow(key: string): void {
    const rows = (this.node as any).rows
    const idx = rows.findIndex((r: any) => r.key === key)
    if (idx >= 0) {
      rows.splice(idx, 1)
      this._save()
    }
  }

  /** 清空所有行 */
  clear(): void {
    ;(this.node as any).rows.splice(0)
    this._save()
  }

  private _save() {
    const keys = this.keys
    store[this._id] = { count: keys.length, keys }
  }
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
 */
export class TableUI extends UINodeWrapper {
  private _id: string
  private _factory: (r: number, c: number, key: string) => UINodeWrapper

  constructor(
    id: string,
    initialRows: number,
    initialCols: number,
    factory: (r: number, c: number, key: string) => UINodeWrapper,
  ) {
    super()
    this._id = id
    this._factory = factory

    let saved = store[id]
    if (!saved || !Array.isArray(saved.rowKeys) || !Array.isArray(saved.colKeys)) {
      const rowKeys: string[] = []
      const colKeys: string[] = []
      for (let i = 0; i < initialRows; i++) rowKeys.push(`r${i}`)
      for (let j = 0; j < initialCols; j++) colKeys.push(`c${j}`)
      saved = { rowKeys, colKeys }
      store[id] = saved
    }

    const node = reactive({
      type: 'table',
      id,
      rowKeys: [...saved.rowKeys],
      colKeys: [...saved.colKeys],
      // cells[r][c] = { key: 'rX_cY', node }
      cells: [] as { key: string; node: any }[][],
    })

    this._rebuildCells(node)
    ;(node as any).instance = markRaw(this)
    this.node = node
    root.children.push(node)
  }

  private _rebuildCells(node: any) {
    node.cells = []
    for (let r = 0; r < node.rowKeys.length; r++) {
      const row: { key: string; node: any }[] = []
      for (let c = 0; c < node.colKeys.length; c++) {
        const key = `${node.rowKeys[r]}_${node.colKeys[c]}`
        const item = this._factory(r, c, key)
        if (item && item.node) {
          const topIdx = root.children.indexOf(item.node)
          if (topIdx >= 0) root.children.splice(topIdx, 1)
        }
        row.push({ key, node: item ? item.node : null })
      }
      node.cells.push(row)
    }
  }

  get rowCount(): number { return (this.node as any).rowKeys.length }
  get colCount(): number { return (this.node as any).colKeys.length }
  get rowKeys(): string[] { return [...(this.node as any).rowKeys] }
  get colKeys(): string[] { return [...(this.node as any).colKeys] }

  /** 新增一行（末尾），返回新行 key */
  addRow(): string {
    const node = this.node as any
    const key = nextKey(node.rowKeys, 'r')
    node.rowKeys.push(key)
    // 新增行的各列单元格
    const row: { key: string; node: any }[] = []
    const r = node.rowKeys.length - 1
    for (let c = 0; c < node.colKeys.length; c++) {
      const ck = `${key}_${node.colKeys[c]}`
      const item = this._factory(r, c, ck)
      if (item && item.node) {
        const topIdx = root.children.indexOf(item.node)
        if (topIdx >= 0) root.children.splice(topIdx, 1)
      }
      row.push({ key: ck, node: item ? item.node : null })
    }
    node.cells.push(row)
    this._save()
    return key
  }

  /** 删除指定 key 的行 */
  removeRow(key: string): void {
    const node = this.node as any
    const idx = node.rowKeys.indexOf(key)
    if (idx >= 0) {
      node.rowKeys.splice(idx, 1)
      node.cells.splice(idx, 1)
      this._save()
    }
  }

  /** 新增一列（末尾），返回新列 key */
  addCol(): string {
    const node = this.node as any
    const key = nextKey(node.colKeys, 'c')
    node.colKeys.push(key)
    const c = node.colKeys.length - 1
    for (let r = 0; r < node.rowKeys.length; r++) {
      const ck = `${node.rowKeys[r]}_${key}`
      const item = this._factory(r, c, ck)
      if (item && item.node) {
        const topIdx = root.children.indexOf(item.node)
        if (topIdx >= 0) root.children.splice(topIdx, 1)
      }
      node.cells[r].push({ key: ck, node: item ? item.node : null })
    }
    this._save()
    return key
  }

  /** 删除指定 key 的列 */
  removeCol(key: string): void {
    const node = this.node as any
    const idx = node.colKeys.indexOf(key)
    if (idx >= 0) {
      node.colKeys.splice(idx, 1)
      for (let r = 0; r < node.rowKeys.length; r++) {
        node.cells[r].splice(idx, 1)
      }
      this._save()
    }
  }

  clear(): void {
    const node = this.node as any
    node.rowKeys.splice(0)
    node.colKeys.splice(0)
    node.cells.splice(0)
    this._save()
  }

  private _save() {
    const node = this.node as any
    store[this._id] = { rowKeys: [...node.rowKeys], colKeys: [...node.colKeys] }
  }
}

// ===================== 控件 =====================

/** 标签（显示文字，无状态） */
export class LabelUI extends UINodeWrapper {
  constructor(text: string = '') {
    super(reactive({
      type: 'label',
      id: genId(),
      text,
    }))
  }
  get text(): string { return this.node.text }
  set text(v: string) { this.node.text = v }
}

/** 编辑框（单行文本输入） */
export class EditBoxUI extends UINodeWrapper {
  constructor(id: string, defaultValue: string = '') {
    if (!(id in store)) store[id] = defaultValue
    const self = { id }
    super(reactive({
      type: 'edit',
      id,
      get value() { return store[self.id] },
      set value(v: string) { store[self.id] = v },
    }))
  }
  get text(): string { return store[(this.node as any).id] }
  set text(v: string) { store[(this.node as any).id] = v }
}

/**
 * 多行编辑框
 * @param opts.width  宽度（像素），省略时由 CSS 自动决定（自适应布局）
 * @param opts.rows   文本行数（高度），默认 4
 */
export class TextAreaUI extends UINodeWrapper {
  constructor(id: string, defaultValue: string = '', opts: { width?: number; rows?: number } = {}) {
    if (!(id in store)) store[id] = defaultValue
    const self = { id }
    const node = reactive({
      type: 'textarea',
      id,
      width: opts.width ?? null,
      rows: opts.rows ?? 4,
      get value() { return store[self.id] },
      set value(v: string) { store[self.id] = v },
    })
    super(node)
  }
  get text(): string { return store[(this.node as any).id] }
  set text(v: string) { store[(this.node as any).id] = v }
  get width(): number | null { return (this.node as any).width }
  set width(v: number | null) { (this.node as any).width = v }
  get rows(): number { return (this.node as any).rows }
  set rows(v: number) { (this.node as any).rows = v }
}

/**
 * 代码编辑框（Monaco 高亮 + 智能提示）。
 * 仅用于编辑代码文本，不自动产生任何效果；其 value 可通过 workspace.run(code, context) 在绘制函数中执行。
 * @param opts.height 编辑器高度（像素），默认 160
 * @param opts.language 语言，默认 javascript
 */
export class CodeEditorUI extends UINodeWrapper {
  constructor(id: string, defaultValue: string = '', opts: { height?: number; language?: string } = {}) {
    if (!(id in store)) store[id] = defaultValue
    const self = { id }
    const node = reactive({
      type: 'codeeditor',
      id,
      height: opts.height ?? 160,
      language: opts.language ?? 'javascript',
      get value() { return store[self.id] },
      set value(v: string) { store[self.id] = v },
    })
    super(node)
  }
  get value(): string { return store[(this.node as any).id] }
  set value(v: string) { store[(this.node as any).id] = v }
  get text(): string { return store[(this.node as any).id] }
  set text(v: string) { store[(this.node as any).id] = v }
  get code(): string { return store[(this.node as any).id] }
  set code(v: string) { store[(this.node as any).id] = v }
  get height(): number { return (this.node as any).height }
  set height(v: number) { (this.node as any).height = v }
}

/** 下拉框 */
export class DropdownUI extends UINodeWrapper {
  /**
   * @param opts.editable 是否允许编辑：true 时为可编辑下拉框（可自由输入，也可从列表选择）；默认 false 与普通下拉框一致
   */
  constructor(id: string, options: string[], defaultValue?: string, opts: { editable?: boolean } = {}) {
    if (!(id in store)) store[id] = defaultValue ?? (options[0] ?? '')
    const self = { id }
    super(reactive({
      type: 'dropdown',
      id,
      options: [...options],
      editable: opts.editable ?? false,
      get value() { return store[self.id] },
      set value(v: string) { store[self.id] = v },
    }))
  }
  get selected(): string { return store[(this.node as any).id] }
  set selected(v: string) { store[(this.node as any).id] = v }
}

/** 数值编辑框（带 +/- 调节按钮） */
export class NumberEditUI extends UINodeWrapper {
  constructor(id: string, defaultValue: number = 0, opts: { min?: number; max?: number; step?: number; precision?: number } = {}) {
    if (!(id in store)) store[id] = defaultValue
    const self = { id }
    // 显示精度：未指定时按 step 的小数位数自动推断（step=0.1 → 1位小数，step=1 → 整数）
    const stepStr = String(opts.step ?? 1)
    const dotIdx = stepStr.indexOf('.')
    const precision = opts.precision ?? (dotIdx < 0 ? 0 : stepStr.length - dotIdx - 1)
    const factor = Math.pow(10, precision)
    super(reactive({
      type: 'number',
      id,
      min: opts.min ?? null,
      max: opts.max ?? null,
      step: opts.step ?? 1,
      precision,
      get value() { return store[self.id] },
      set value(v: number) {
        let val = Number(v)
        // 非法输入（空串/NaN）保持原行为直接存储
        if (!Number.isFinite(val)) { store[self.id] = v as any; return }
        if (opts.min != null && val < opts.min) val = opts.min
        if (opts.max != null && val > opts.max) val = opts.max
        // 按精度四舍五入，消除浮点误差累积（precision=0 时为整数）
        val = Math.round(val * factor) / factor
        store[self.id] = val
      },
    }))
  }
  get value(): number { return store[(this.node as any).id] }
  set value(v: number) { (this.node as any).value = v }
}

/** 颜色选择框 */
export class ColorPickerUI extends UINodeWrapper {
  constructor(id: string, defaultValue: string = '#000000') {
    if (!(id in store)) store[id] = defaultValue
    const self = { id }
    super(reactive({
      type: 'color',
      id,
      get value() { return store[self.id] },
      set value(v: string) { store[self.id] = v },
    }))
  }
  get color(): string { return store[(this.node as any).id] }
  set color(v: string) { store[(this.node as any).id] = v }
}

/**
 * 按钮（用于事件操作）。
 * 点击时执行传入的回调；每次运行脚本时节点重建，回调随之重新注册。
 * @example
 * new ButtonUI('roll', '随机重排', () => {
 *   UIManager.setState('seed', Math.floor(Math.random() * 10000));
 * });
 */
export class ButtonUI extends UINodeWrapper {
  constructor(id: string, label: string = '按钮', onClick: (() => void) | null = null) {
    const self = { onClick }
    const node = reactive({
      type: 'button',
      id,
      label,
      /** 由渲染器在点击时调用 */
      trigger() {
        if (typeof self.onClick === 'function') {
          try { self.onClick() } catch (e) { console.error('[ButtonUI] 回调执行失败:', e) }
        }
      },
      __setOnClick(cb: (() => void) | null) { self.onClick = cb },
    })
    super(node)
  }
  get label(): string { return (this.node as any).label }
  set label(v: string) { (this.node as any).label = v }
  /** 设置/替换点击回调 */
  setOnClick(cb: (() => void) | null) { (this.node as any).__setOnClick(cb) }
}

/**
 * 滑块条（数值拖动选择）。
 * 值按 step 对齐并自动夹取到 [min, max] 范围。
 * @example
 * const s = new SliderUI('opacity', 50, { min: 0, max: 100, step: 5, label: '不透明度' });
 * // 绘制函数中读取: s.value
 */
export class SliderUI extends UINodeWrapper {
  constructor(id: string, defaultValue: number = 0, opts: { min?: number; max?: number; step?: number; label?: string; showValue?: boolean } = {}) {
    if (!(id in store)) store[id] = defaultValue
    const self = { id }
    const min = opts.min ?? 0
    const max = opts.max ?? 100
    const step = opts.step ?? 1
    // 显示精度：按 step 的小数位数推断（step=0.1 → 1位小数）
    const stepStr = String(step)
    const dotIdx = stepStr.indexOf('.')
    const precision = dotIdx < 0 ? 0 : stepStr.length - dotIdx - 1
    const factor = Math.pow(10, precision)
    const node = reactive({
      type: 'slider',
      id,
      label: opts.label ?? '',
      showValue: opts.showValue ?? true,
      min,
      max,
      step,
      get value(): number {
        let v = Number(store[self.id])
        if (!Number.isFinite(v)) v = defaultValue
        if (v < min) v = min
        if (v > max) v = max
        return v
      },
      set value(v: number) {
        let val = Number(v)
        if (!Number.isFinite(val)) val = defaultValue
        if (val < min) val = min
        if (val > max) val = max
        // 按 step 对齐，消除浮点误差累积
        const snapped = min + Math.round((val - min) / step) * step
        store[self.id] = Math.round(snapped * factor) / factor
      },
    })
    super(node)
  }
  get value(): number { return (this.node as any).value }
  set value(v: number) { (this.node as any).value = v }
  get min(): number { return (this.node as any).min }
  set min(v: number) { (this.node as any).min = v }
  get max(): number { return (this.node as any).max }
  set max(v: number) { (this.node as any).max = v }
  get step(): number { return (this.node as any).step }
  set step(v: number) { (this.node as any).step = v }
  get label(): string { return (this.node as any).label }
  set label(v: string) { (this.node as any).label = v }
  /** 是否显示当前数值 */
  get showValue(): boolean { return (this.node as any).showValue }
  set showValue(v: boolean) { (this.node as any).showValue = v }
}

/** 开关（布尔值） */
export class SwitchUI extends UINodeWrapper {
  constructor(id: string, defaultValue: boolean = false) {
    if (!(id in store)) store[id] = defaultValue
    const self = { id }
    super(reactive({
      type: 'switch',
      id,
      get value() { return store[self.id] },
      set value(v: boolean) { store[self.id] = v },
    }))
  }
  get on(): boolean { return store[(this.node as any).id] }
  set on(v: boolean) { store[(this.node as any).id] = v }
}

/** 复选框（功能和开关类似，形式不同） */
export class CheckboxUI extends UINodeWrapper {
  constructor(id: string, defaultValue: boolean = false) {
    if (!(id in store)) store[id] = defaultValue
    const self = { id }
    super(reactive({
      type: 'checkbox',
      id,
      get value() { return store[self.id] },
      set value(v: boolean) { store[self.id] = v },
    }))
  }
  get checked(): boolean { return store[(this.node as any).id] }
  set checked(v: boolean) { store[(this.node as any).id] = v }
}

// ===================== 文件处理 =====================

/** CSV 解析 */
function parseCSV(text: string, opts: { delimiter?: string; header?: boolean } = {}): any[] {
  const delimiter = opts.delimiter ?? ','
  const hasHeader = opts.header ?? true
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return []

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else { inQuotes = !inQuotes }
      } else if (ch === delimiter && !inQuotes) {
        result.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur)
    return result
  }

  if (hasHeader) {
    const headers = parseLine(lines[0])
    return lines.slice(1).map(line => {
      const vals = parseLine(line)
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return obj
    })
  } else {
    return lines.map(line => parseLine(line))
  }
}

/** 文件包装器：提供文本/JSON/CSV/图像处理功能 */
export class FileWrapper {
  private _file: File
  private _url: string | null = null
  private _image: HTMLImageElement | null = null

  constructor(file: File) {
    this._file = file
  }

  /** 文件名 */
  get name(): string { return this._file.name }
  /** 文件大小（字节） */
  get size(): number { return this._file.size }
  /** MIME 类型 */
  get type(): string { return this._file.type }

  /** Blob URL（可用于 ImageItem.src 等） */
  get url(): string {
    if (!this._url) this._url = URL.createObjectURL(this._file)
    return this._url
  }

  /** 读取文本 */
  async text(): Promise<string> {
    return await this._file.text()
  }

  /** 解析为 JSON */
  async json(): Promise<any> {
    return JSON.parse(await this.text())
  }

  /** 解析为 CSV */
  async csv(opts?: { delimiter?: string; header?: boolean }): Promise<any[]> {
    return parseCSV(await this.text(), opts)
  }

  /** 加载为 HTMLImageElement */
  async image(): Promise<HTMLImageElement> {
    if (this._image) return this._image
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => { this._image = img; resolve(img) }
      img.onerror = () => reject(new Error(`无法加载图像: ${this._file.name}`))
      img.src = this.url
    })
  }

  /** 释放资源 */
  dispose() {
    if (this._url) { URL.revokeObjectURL(this._url); this._url = null }
    this._image = null
  }
}

// ===================== 路径/文件选择器 =====================

/** 路径选择框（选择根目录下的文件，返回相对路径） */
export class PathPickerUI extends UINodeWrapper {
  constructor(id: string, opts: { accept?: string } = {}) {
    if (!(id in store)) store[id] = ''
    const self = { id }
    super(reactive({
      type: 'path',
      id,
      accept: opts.accept ?? '*/*',
      hasFSAPI: UIManager.hasFileSystemAPI,
      get value() { return store[self.id] },
      set value(v: string) { store[self.id] = v },
    }))
  }
  get path(): string { return store[(this.node as any).id] }
  set path(v: string) { store[(this.node as any).id] = v }

  /** 触发文件选择（由 Vue 组件调用） */
  async pick(): Promise<string | null> {
    if (!UIManager.hasFileSystemAPI) return null
    try {
      if (!_rootDirHandle) {
        _rootDirHandle = await (window as any).showDirectoryPicker()
      }
      const [handle] = await (window as any).showOpenFilePicker({ startIn: _rootDirHandle })
      // 计算相对路径
      const relativePath = handle.name // 简化：只返回文件名（浏览器API限制无法获取完整相对路径）
      store[(this.node as any).id] = relativePath
      return relativePath
    } catch {
      return null
    }
  }
}

/** 文件选择框（上传任意文件，返回 FileWrapper） */
export class FilePickerUI extends UINodeWrapper {
  private _fileWrapper: FileWrapper | null = null

  constructor(id: string, opts: { accept?: string } = {}) {
    // 文件对象不持久化到 store（File 对象不可序列化），但文件存在状态持久化
    if (!(id in store)) store[id] = null // null 表示未选择文件
    super(reactive({
      type: 'file',
      id,
      accept: opts.accept ?? '*/*',
      fileName: store[id] ?? '',
      // fileWrapper 通过方法访问
    }))
  }

  /** 获取当前文件包装器 */
  get file(): FileWrapper | null {
    return this._fileWrapper
  }

  /** 设置文件（由 Vue 组件调用） */
  _setFile(file: File | null) {
    if (this._fileWrapper) this._fileWrapper.dispose()
    this._fileWrapper = file ? new FileWrapper(file) : null
    ;(this.node as any).fileName = file ? file.name : ''
    store[(this.node as any).id] = file ? file.name : null
  }

  /** 是否已选择文件 */
  get hasFile(): boolean {
    return this._fileWrapper !== null
  }
}

// ===================== 画板显示 =====================

/** 画板显示区域（在参数面板中显示 BoardItem 内容） */
export class BoardDisplayUI extends UINodeWrapper {
  private _board: BoardItem | null = null

  constructor(id: string, opts: { width?: number; height?: number } = {}) {
    super(reactive({
      type: 'board-display',
      id,
      width: opts.width ?? 200,
      height: opts.height ?? 200,
      version: 0, // 递增版本号触发重绘
    }))
  }

  /** 设置要显示的画板 */
  set board(b: BoardItem | null) {
    this._board = b ? markRaw(b) : null
    ;(this.node as any).version++
  }

  get board(): BoardItem | null {
    return this._board
  }

  /** 重绘 */
  redraw() {
    ;(this.node as any).version++
  }

  /** 渲染到 canvas（由 Vue 组件调用） */
  _renderToCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = (this.node as any).width
    const h = (this.node as any).height
    canvas.width = w
    canvas.height = h
    ctx.clearRect(0, 0, w, h)
    if (this._board) {
      // 设置画板尺寸并绘制
      try {
        ;(this._board as any).draw(ctx, w, h)
      } catch (e) {
        console.error('BoardDisplayUI render error:', e)
      }
    }
  }
}
