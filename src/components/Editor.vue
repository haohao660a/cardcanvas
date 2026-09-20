<template>
  <div ref="containerRef" class="editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import loader from '@monaco-editor/loader'
import { userApiDeclaration } from '../types/user-api-declaration'

const props = defineProps<{
  modelValue: string
  language?: string
}>()

const emit = defineEmits(['update:modelValue'])

const containerRef = ref<HTMLDivElement>()
let editor: any = null

onMounted(async () => {
  const monaco = await loader.init()
  if (!containerRef.value) return

  // ---------- 创建编辑器 ----------
  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue,
    language: props.language || 'javascript',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    tabSize: 2,
    lineNumbers: 'on',           // 显示行号
    folding: true,               // 代码折叠（Monaco 内置，点击行号旁的折叠标记收缩/展开代码块）
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
  window.addEventListener('resize', () => {
    editor?.layout()
  })
})

// 外部值变化时更新编辑器
watch(
  () => props.modelValue,
  (newVal) => {
    if (editor && editor.getValue() !== newVal) {
      editor.setValue(newVal)
    }
  }
)
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