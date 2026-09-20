<template>
  <!-- display:contents 包装器：不参与布局，仅用于通过 data-ui-id 定位控件（自动渲染后恢复焦点） -->
  <div class="ui-node-wrap" :data-ui-id="node.id">
  <!-- 行布局 -->
  <div v-if="node.type === 'row'" class="ui-row" :style="{ gap: node.gap + 'px', alignItems: node.align, flexWrap: node.wrap ? 'wrap' : 'nowrap' }">
    <UINodeRenderer v-for="child in node.children" :key="child.id" :node="child" />
  </div>

  <!-- 列布局 -->
  <div v-else-if="node.type === 'column'" class="ui-column" :style="{ gap: node.gap + 'px', alignItems: node.align }">
    <UINodeRenderer v-for="child in node.children" :key="child.id" :node="child" />
  </div>

  <!-- 标签 -->
  <span v-else-if="node.type === 'label'" class="ui-label">{{ node.text }}</span>

  <!-- 编辑框 -->
  <input v-else-if="node.type === 'edit'" class="ui-edit" type="text" v-model="node.value" />

  <!-- 多行编辑框 -->
  <textarea v-else-if="node.type === 'textarea'" class="ui-textarea" :rows="node.rows" :style="node.width ? { width: node.width + 'px' } : {}" v-model="node.value"></textarea>

  <!-- 代码编辑框（Monaco 高亮 + 提示） -->
  <CodeEditorField v-else-if="node.type === 'codeeditor'" :model-value="node.value" :language="node.language" :height="node.height" @update:model-value="node.value = $event" />

  <!-- 按钮 -->
  <button v-else-if="node.type === 'button'" class="ui-button" @click="node.trigger && node.trigger()">{{ node.label }}</button>

  <!-- 滑块条 -->
  <div v-else-if="node.type === 'slider'" class="ui-slider-wrap">
    <span v-if="node.label" class="ui-slider-label">{{ node.label }}</span>
    <input type="range" class="ui-slider" :min="node.min" :max="node.max" :step="node.step" v-model.number="node.value" />
    <span v-if="node.showValue" class="ui-slider-value">{{ node.value }}</span>
  </div>

  <!-- 下拉框（不可编辑） -->
  <select v-else-if="node.type === 'dropdown' && !node.editable" class="ui-dropdown" v-model="node.value">
    <option v-for="opt in node.options" :key="opt" :value="opt">{{ opt }}</option>
  </select>

  <!-- 下拉框（可编辑：可自由输入，也可从列表选择） -->
  <input v-else-if="node.type === 'dropdown' && node.editable" class="ui-dropdown ui-dropdown-editable" type="text" v-model="node.value" :list="'ui-dl-' + node.id" />

  <!-- 数值编辑框（输入中只维护本地草稿，失焦/回车才夹取提交，避免输入中途被改写） -->
  <div v-else-if="node.type === 'number'" class="ui-number">
    <button class="ui-number-btn" @click="adjustNumber(node, -node.step)">−</button>
    <input class="ui-number-input" type="number"
      :value="numberDraft[node.id] ?? node.value"
      :min="node.min ?? undefined" :max="node.max ?? undefined" :step="node.step"
      @focus="onNumberFocus(node)"
      @input="onNumberInput(node, $event)"
      @blur="onNumberBlur(node)"
      @keydown.enter="onNumberEnter($event)" />
    <button class="ui-number-btn" @click="adjustNumber(node, node.step)">+</button>
  </div>

  <!-- 颜色选择框 -->
  <div v-else-if="node.type === 'color'" class="ui-color">
    <input class="ui-color-picker" type="color" v-model="node.value" />
    <input class="ui-color-text" type="text" v-model="node.value" />
  </div>

  <!-- 开关 -->
  <label v-else-if="node.type === 'switch'" class="ui-switch">
    <input type="checkbox" v-model="node.value" />
    <span class="ui-switch-slider"></span>
  </label>

  <!-- 复选框 -->
  <label v-else-if="node.type === 'checkbox'" class="ui-checkbox">
    <input type="checkbox" v-model="node.value" />
    <span class="ui-checkbox-box"></span>
  </label>

  <!-- 路径选择框 -->
  <div v-else-if="node.type === 'path'" class="ui-path">
    <input class="ui-path-text" type="text" v-model="node.value" placeholder="相对路径" />
    <button class="ui-path-btn" @click="pickPath(node)">浏览...</button>
  </div>

  <!-- 文件选择框 -->
  <div v-else-if="node.type === 'file'" class="ui-file">
    <span class="ui-file-name">{{ node.fileName || '未选择文件' }}</span>
    <button class="ui-file-btn" @click="triggerFileInput(node)">选择文件</button>
    <input :ref="el => fileInputRefs[node.id] = el" type="file" :accept="node.accept" style="display:none" @change="onFileChange(node, $event)" />
  </div>

  <!-- 画板显示 -->
  <div v-else-if="node.type === 'board-display'" class="ui-board-display">
    <canvas :ref="el => boardCanvasRefs[node.id] = el" class="ui-board-canvas"></canvas>
  </div>

  <!-- 列表（动态行） -->
  <div v-else-if="node.type === 'list'" class="ui-list">
    <div v-for="row in node.rows" :key="row.key" class="ui-list-row">
      <div class="ui-list-row-content">
        <UINodeRenderer v-if="row.node" :node="row.node" />
      </div>
      <button class="ui-list-del" @click="node.instance.removeRow(row.key)" title="删除该行">✕</button>
    </div>
    <button class="ui-list-add" @click="node.instance.addRow()">＋ 添加行</button>
  </div>

  <!-- 表格（动态行/列） -->
  <div v-else-if="node.type === 'table'" class="ui-table">
    <table class="ui-table-inner">
      <tbody>
        <tr v-for="(row, ri) in node.cells" :key="node.rowKeys[ri]">
          <td v-for="cell in row" :key="cell.key" class="ui-table-cell">
            <UINodeRenderer v-if="cell.node" :node="cell.node" />
          </td>
          <td class="ui-table-ctrl">
            <button class="ui-table-del" @click="node.instance.removeRow(node.rowKeys[ri])" title="删除该行">✕</button>
          </td>
        </tr>
        <tr class="ui-table-col-ctrl">
          <td v-for="ck in node.colKeys" :key="'del-'+ck" class="ui-table-ctrl">
            <button class="ui-table-del" @click="node.instance.removeCol(ck)" title="删除该列">✕</button>
          </td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <div class="ui-table-btns">
      <button class="ui-table-add" @click="node.instance.addRow()">＋ 添加行</button>
      <button class="ui-table-add" @click="node.instance.addCol()">＋ 添加列</button>
    </div>
  </div>

  <!-- 未知类型 -->
  <span v-else class="ui-unknown">[未知UI: {{ node.type }}]</span>

  <!-- 可编辑下拉框的选项列表（不参与上方 v-if 链，避免切断条件分支） -->
  <datalist v-if="node.type === 'dropdown' && node.editable" :id="'ui-dl-' + node.id">
    <option v-for="opt in node.options" :key="opt" :value="opt" />
  </datalist>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { UIManager } from '../api/ui'
import CodeEditorField from './CodeEditorField.vue'

const props = defineProps<{ node: any }>()

const fileInputRefs = ref<Record<string, any>>({})
const boardCanvasRefs = ref<Record<string, any>>({})

function adjustNumber(node: any, delta: number) {
  let v = Number(node.value) + delta
  if (node.min != null && v < node.min) v = node.min
  if (node.max != null && v > node.max) v = node.max
  node.value = v
}

// 数值框本地草稿：聚焦期间只改草稿不写 store（不夹取、不触发自动重绘），
// 失焦/回车时才解析、夹取到 min/max、按 precision 取整后一次性提交。
const numberDraft = ref<Record<string, string>>({})

function onNumberFocus(node: any) {
  numberFocused.value = true
  numberDraft.value[node.id] = String(node.value ?? '')
}

function onNumberInput(node: any, e: Event) {
  numberDraft.value[node.id] = (e.target as HTMLInputElement).value
}

function onNumberEnter(e: Event) {
  ;(e.target as HTMLInputElement).blur()
}

function onNumberBlur(node: any) {
  const raw = numberDraft.value[node.id]
  numberFocused.value = false
  delete numberDraft.value[node.id]
  if (raw == null) return
  const trimmed = raw.trim()
  // 空串或非法输入：放弃修改，输入框回退到当前值
  if (trimmed === '') return
  const num = parseFloat(trimmed)
  if (!Number.isFinite(num)) return
  let v = num
  if (node.min != null && v < node.min) v = node.min
  if (node.max != null && v > node.max) v = node.max
  const factor = Math.pow(10, node.precision ?? 0)
  v = Math.round(v * factor) / factor
  // 提交到 store（NumberEditUI setter 会再次夹取，幂等）；值变化即触发自动重绘
  node.value = v
}

// 脚本重跑会重建布局树（组件实例因稳定 key 被复用）；数值框未聚焦时，
// 清除可能残留的草稿，保证输入框回显最新的 store 值
const numberFocused = ref(false)
watch(
  () => [props.node, props.node?.value],
  () => {
    if (!numberFocused.value && props.node?.id != null) {
      delete numberDraft.value[props.node.id]
    }
  }
)

async function pickPath(node: any) {
  // 尝试使用 File System Access API
  if (UIManager.hasFileSystemAPI) {
    try {
      if (!UIManager.rootDirHandle) {
        await UIManager.setRootDirectory()
      }
      if (UIManager.rootDirHandle) {
        const [handle] = await (window as any).showOpenFilePicker({ startIn: UIManager.rootDirHandle })
        node.value = handle.name
      }
    } catch { /* 用户取消 */ }
  } else {
    // 不支持 FS API，使用文件输入作为回退
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = () => {
      if (input.files && input.files[0]) {
        node.value = input.files[0].name
      }
    }
    input.click()
  }
}

function triggerFileInput(node: any) {
  const input = fileInputRefs.value[node.id]
  if (input) input.click()
}

function onFileChange(node: any, event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    // 找到对应的 FilePickerUI 实例并设置文件
    // 通过 UIManager 的内部映射查找
    const fileEvent = new CustomEvent('ui-file-selected', { detail: { id: node.id, file: input.files[0] } })
    window.dispatchEvent(fileEvent)
    input.value = '' // 重置以便重复选择同一文件
  }
}

// 画板显示：监听版本号变化重绘
watch(
  () => props.node.version,
  () => {
    nextTick(() => {
      const canvas = boardCanvasRefs.value[props.node.id]
      if (canvas) {
        renderBoard(canvas)
      }
    })
  }
)

// 初始挂载后也渲染一次
watch(
  () => boardCanvasRefs.value[props.node.id],
  (canvas) => {
    if (canvas && props.node.type === 'board-display') {
      nextTick(() => renderBoard(canvas))
    }
  }
)

function renderBoard(canvas: HTMLCanvasElement) {
  const event = new CustomEvent('ui-board-render', { detail: { id: props.node.id, canvas } })
  window.dispatchEvent(event)
}
</script>

<script lang="ts">
// 递归组件需要显式命名
export default { name: 'UINodeRenderer' }
</script>

<style scoped>
.ui-node-wrap {
  display: contents;
}

.ui-row {
  display: flex;
  flex-direction: row;
}

.ui-column {
  display: flex;
  flex-direction: column;
}

.ui-label {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  user-select: none;
}

.ui-edit {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  min-width: 60px;
  outline: none;
}

.ui-edit:focus {
  border-color: #d4b87a;
}

/* 按钮 */
.ui-button {
  padding: 5px 16px;
  font-size: 13px;
  color: #1a1a2e;
  background: #fff;
  border: 1px solid #d4b87a;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.ui-button:hover {
  background: #d4b87a;
  color: #fff;
}

.ui-button:active {
  transform: scale(0.97);
}

/* 滑块条 */
.ui-slider-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
}

.ui-slider-label {
  font-size: 12px;
  color: #555;
  white-space: nowrap;
  user-select: none;
}

.ui-slider {
  flex: 1;
  min-width: 100px;
  accent-color: #d4b87a;
  cursor: pointer;
}

.ui-slider-value {
  font-size: 12px;
  color: #333;
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  user-select: none;
}

/* 列表 */
.ui-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
  background: #fafafa;
  min-width: 200px;
}

.ui-list-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 4px 6px;
}

.ui-list-row-content {
  flex: 1;
  min-width: 0;
}

.ui-list-del, .ui-table-del {
  width: 22px;
  height: 22px;
  border: none;
  background: #f2f2f2;
  color: #999;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
  transition: all 0.15s;
}

.ui-list-del:hover, .ui-table-del:hover {
  background: #ff6b6b;
  color: #fff;
}

.ui-list-add, .ui-table-add {
  padding: 5px 12px;
  border: 1px dashed #bbb;
  background: #fff;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  align-self: flex-start;
  transition: all 0.15s;
}

.ui-list-add:hover, .ui-table-add:hover {
  border-color: #d4b87a;
  color: #1a1a2e;
  background: #faf6ee;
}

/* 表格 */
.ui-table {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
  background: #fafafa;
}

.ui-table-inner {
  border-collapse: collapse;
}

.ui-table-cell {
  border: 1px solid #eee;
  padding: 4px;
  background: #fff;
  min-width: 80px;
  vertical-align: top;
}

.ui-table-ctrl {
  padding: 2px;
  text-align: center;
}

.ui-table-btns {
  display: flex;
  gap: 8px;
}

.ui-textarea {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  resize: vertical;
  outline: none;
  font-family: inherit;
}

.ui-textarea:focus {
  border-color: #d4b87a;
}

.ui-dropdown {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.ui-dropdown-editable {
  cursor: text;
  min-width: 100px;
}

.ui-dropdown-editable:focus {
  border-color: #d4b87a;
}

.ui-number {
  display: flex;
  align-items: center;
  gap: 0;
}

.ui-number-btn {
  width: 24px;
  height: 28px;
  border: 1px solid #ccc;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.ui-number-btn:first-child {
  border-radius: 4px 0 0 4px;
  border-right: none;
}

.ui-number-btn:last-child {
  border-radius: 0 4px 4px 0;
  border-left: none;
}

.ui-number-btn:hover {
  background: #e8e8e8;
}

.ui-number-input {
  width: 60px;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 0;
  text-align: center;
  font-size: 13px;
  outline: none;
  -moz-appearance: textfield;
}

.ui-number-input::-webkit-outer-spin-button,
.ui-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.ui-color {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ui-color-picker {
  width: 28px;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: none;
}

.ui-color-text {
  width: 80px;
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  outline: none;
}

.ui-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.ui-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.ui-switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ccc;
  border-radius: 20px;
  transition: 0.2s;
}

.ui-switch-slider:before {
  content: "";
  position: absolute;
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
}

.ui-switch input:checked + .ui-switch-slider {
  background: #d4b87a;
}

.ui-switch input:checked + .ui-switch-slider:before {
  transform: translateX(16px);
}

.ui-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.ui-checkbox input {
  opacity: 0;
  width: 0;
  height: 0;
}

.ui-checkbox-box {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-radius: 3px;
  transition: 0.2s;
  position: relative;
}

.ui-checkbox input:checked + .ui-checkbox-box {
  background: #d4b87a;
  border-color: #d4b87a;
}

.ui-checkbox input:checked + .ui-checkbox-box:after {
  content: "";
  position: absolute;
  left: 5px;
  top: 1px;
  width: 4px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.ui-path {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ui-path-text {
  flex: 1;
  min-width: 100px;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.ui-path-text:focus {
  border-color: #d4b87a;
}

.ui-path-btn {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.ui-path-btn:hover {
  background: #e8e8e8;
}

.ui-file {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ui-file-name {
  font-size: 13px;
  color: #666;
  min-width: 80px;
}

.ui-file-btn {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.ui-file-btn:hover {
  background: #e8e8e8;
}

.ui-board-display {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background: #fafafa;
}

.ui-board-canvas {
  display: block;
}

.ui-unknown {
  color: red;
  font-size: 12px;
}
</style>
