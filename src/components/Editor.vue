<template>
  <div ref="containerRef" class="editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import loader from '@monaco-editor/loader'
import { userApiDeclaration } from '../types/user-api-declaration'

const props = defineProps<{
  modelValue: string
  language?: string
}>()

const emit = defineEmits(['update:modelValue'])

const containerRef = ref<HTMLDivElement>()
let editor: any = null
let monaco: any = null

onMounted(async () => {
  monaco = await loader.init()
  if (!containerRef.value) return

  // ---------- 创建编辑器（单 model：切换 tab 通过 setValue 更换内容，不保留撤销历史） ----------
  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue,
    language: props.language || 'javascript',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    tabSize: 2,
    lineNumbers: 'on',
    folding: true,
    showFoldingControls: 'mouseover',
    lineDecorationsWidth: 0,
    renderLineHighlight: 'none',
    lineNumbersMinChars: 2,
  })

  // ---------- 注入类型声明 ----------
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    userApiDeclaration,
    'ts:card-generator.d.ts'
  )

  // ---------- 监听内容变化 ----------
  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor.getValue())
  })

  // 开发模式暴露实例（便于自动化测试注入代码）
  if (import.meta.env.DEV) {
    ;(window as any).__monacoEditor = editor
  }

  // ---------- 窗口大小自适应 ----------
  window.addEventListener('resize', onResize)
})

function onResize() {
  editor?.layout()
}

// 外部值变化（切换 tab、导入文件覆盖等）：setValue 更新内容
watch(() => props.modelValue, (newVal) => {
  if (!editor) return
  if (editor.getValue() !== newVal) {
    editor.setValue(newVal)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  editor?.dispose()
})
</script>

<style scoped>
.editor-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #444;
  text-align: left !important;
}
.editor-container :deep(.view-line) {
  text-align: left !important;
}
</style>
