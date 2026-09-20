<template>
  <div ref="containerRef" class="code-editor-field" :style="{ height: height + 'px' }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import loader from '@monaco-editor/loader'
import { userApiDeclaration } from '../types/user-api-declaration'

const props = withDefaults(defineProps<{
  modelValue: string
  language?: string
  height?: number
}>(), {
  language: 'javascript',
  height: 160,
})

const emit = defineEmits(['update:modelValue'])

const containerRef = ref<HTMLDivElement>()
let editor: any = null
let model: any = null

onMounted(async () => {
  const monaco = await loader.init()
  if (!containerRef.value) return

  // 类型声明（全局，已由主编辑器注入过，这里幂等）
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    userApiDeclaration,
    'ts:card-generator.d.ts'
  )

  model = monaco.editor.createModel(props.modelValue, props.language)
  editor = monaco.editor.create(containerRef.value, {
    model,
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    tabSize: 2,
    lineNumbers: 'on',
    folding: false,
    lineDecorationsWidth: 0,
    renderLineHighlight: 'none',
    lineNumbersMinChars: 2,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  })

  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor.getValue())
  })

  window.addEventListener('resize', onResize)
})

function onResize() {
  editor?.layout()
}

watch(() => props.modelValue, (newVal) => {
  if (editor && editor.getValue() !== newVal) {
    editor.setValue(newVal)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  editor?.dispose()
  model?.dispose()
})
</script>

<style scoped>
.code-editor-field {
  width: 100%;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  overflow: hidden;
  background: #1e1e1e;
}
</style>
