<template>
  <div class="param-panel">
    <div class="param-header">
      <span class="param-title">参数面板</span>
      <button class="reset-btn" title="将所有参数重置为代码中定义的默认值" @click="onReset">↺ 重置默认值</button>
    </div>

    <!-- UI 内部选项卡：仅当多于 1 个时显示；选项卡只能通过代码 UIManager.addUiTab 创建 -->
    <div v-if="uiTabs.length > 1" class="ui-tabs-bar">
      <div class="ui-tabs">
        <span
          v-for="(tab, idx) in uiTabs"
          :key="idx"
          class="ui-tab"
          :class="{ active: activeUiTab === idx }"
          @click="setActiveUiTab(idx)"
        >{{ tab.name }}</span>
      </div>
    </div>

    <template v-for="node in activeChildren" :key="node.id">
      <UINodeRenderer :node="node" />
    </template>
    <div v-if="activeChildren.length === 0" class="param-empty">
      运行代码后，参数面板将在此显示。
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { root, uiTabs, activeUiTab, UIManager } from '../api/ui'
import UINodeRenderer from './UINodeRenderer.vue'

const emit = defineEmits<{ reset: [] }>()

const activeChildren = computed(() => root.children)

function setActiveUiTab(idx: number) {
  UIManager.setActiveUiTab(idx)
}

function onReset() {
  UIManager.resetAll()
  emit('reset')
}
</script>

<style scoped>
.param-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  height: 100%;
  overflow-y: auto;
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
}

.param-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.param-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.reset-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}

.reset-btn:hover {
  border-color: #d4b87a;
  color: #1a1a2e;
  background: #faf6ee;
}

.ui-tabs-bar {
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 4px;
}

.ui-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
}

.ui-tab {
  padding: 6px 14px;
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}

.ui-tab:hover {
  background: #ebebeb;
  color: #333;
}

.ui-tab.active {
  background: #fff;
  color: #1a1a2e;
  font-weight: 600;
  border-color: #d4b87a;
  border-bottom: 2px solid #fff;
  margin-bottom: -1px;
}

.ui-tab-add {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #888;
  background: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 4px;
}

.ui-tab-add:hover {
  background: #d4b87a;
  color: #fff;
  border-color: #d4b87a;
}

.param-empty {
  color: #999;
  font-size: 13px;
  text-align: center;
  padding: 40px 20px;
}
</style>
