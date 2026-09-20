import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  define: {
    '__DEFAULT_CODE_PLACEHOLDER__': '"__DEFAULT_CODE_PLACEHOLDER__"',
    '__SAVE_TEMPLATE_PLACEHOLDER__': '"__SAVE_TEMPLATE_PLACEHOLDER__"'
  }
})
