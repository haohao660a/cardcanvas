// 模拟还原后的单 model Editor 与 App.vue 数据流交互契约：
// - codeTabs + activeCodeTab 模拟 App.vue 状态
// - MockEditor 模拟 Monaco：setValue 会同步触发 onDidChangeModelContent → emit('update:modelValue')
// - watchModelValue 模拟 Editor.vue 的 watch(() => props.modelValue)：值不同才 setValue
// 验证：main/a 来回切换多次，内容不串扰、不交换

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓', msg) }
  else { failed++; console.error('  ✗', msg) }
}

// ---------- App.vue 侧 ----------
const codeTabs = [{ name: 'main', content: '' }]
let activeCodeTab = 0
const getScript = () => codeTabs[activeCodeTab]?.content ?? ''
function updateActiveCode(val) {
  if (codeTabs[activeCodeTab]) codeTabs[activeCodeTab].content = val
}

// ---------- Editor.vue 侧（单 model 还原版） ----------
const editor = {
  value: getScript(),
  getValue() { return this.value },
  setValue(v) {
    this.value = v
    // Monaco: setValue 同步触发 onDidChangeModelContent → emit update:modelValue
    updateActiveCode(this.value)
  },
}
// watch(() => props.modelValue)
function watchModelValue() {
  const newVal = getScript()
  if (editor.getValue() !== newVal) editor.setValue(newVal)
}

// ---------- 操作模拟 ----------
function userType(text) {
  // 用户键入：Monaco 内容变化 → emit → updateActiveCode（当前 tab）
  editor.value = text
  updateActiveCode(text)
}
function switchTab(idx) {
  activeCodeTab = idx
  watchModelValue() // Vue: script computed 变化 → modelValue watch 触发
}
function addTab(name) {
  codeTabs.push({ name, content: '' })
  switchTab(codeTabs.length - 1)
}

// ===================== 用户报告的场景复现 =====================
console.log('场景：创建 a，main 写 maincode，a 写 acode，来回切换')
userType('maincode')
addTab('a')                       // 切到 a（空内容）
assert(editor.getValue() === '', '切到新 tab a，编辑器为空')
userType('acode')
assert(codeTabs[0].content === 'maincode', 'main 内容仍为 maincode')
assert(codeTabs[1].content === 'acode', 'a 内容为 acode')

switchTab(0)
assert(editor.getValue() === 'maincode', 'a→main：编辑器显示 maincode')
assert(codeTabs[0].content === 'maincode', 'a→main：main 存储为 maincode')
assert(codeTabs[1].content === 'acode', 'a→main：a 存储仍为 acode')

switchTab(1)
assert(editor.getValue() === 'acode', 'main→a：编辑器显示 acode')
assert(codeTabs[1].content === 'acode', 'main→a：a 存储为 acode')
assert(codeTabs[0].content === 'maincode', 'main→a：main 存储仍为 maincode')

// 来回切换 20 次，内容必须稳定
let stable = true
for (let i = 0; i < 20; i++) {
  switchTab(i % 2 === 0 ? 1 : 0)
}
switchTab(0)
stable = codeTabs[0].content === 'maincode' && codeTabs[1].content === 'acode'
assert(stable, '来回切换 20 次后：main=maincode，a=acode（不交换）')
assert(editor.getValue() === 'maincode', '最终停在 main，编辑器显示 maincode')

// ===================== 边界：切换后在旧 tab 的未保存输入 =====================
console.log('场景：多 tab 交错编辑')
addTab('b')
userType('bcode')
switchTab(0); userType('maincode-v2')   // 回 main 改内容
switchTab(2)                            // 切到 b
assert(editor.getValue() === 'bcode', 'main→b：编辑器显示 bcode')
switchTab(1)
assert(editor.getValue() === 'acode', 'b→a：编辑器显示 acode')
switchTab(0)
assert(editor.getValue() === 'maincode-v2', 'a→main：编辑器显示 maincode-v2')

// ===================== 边界：删除当前 tab =====================
console.log('场景：删除当前激活 tab')
switchTab(2)                            // 激活 b
codeTabs.splice(2, 1)                   // 删除 b
if (activeCodeTab >= codeTabs.length) activeCodeTab = codeTabs.length - 1
watchModelValue()
assert(editor.getValue() === 'acode', '删除 b 后回落到 a，编辑器显示 acode')

console.log(`\n结果：${passed} 通过，${failed} 失败`)
process.exit(failed ? 1 : 0)
