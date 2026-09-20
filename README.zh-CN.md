# 卡牌生成器 (Card Generator)

通过 JavaScript 脚本驱动卡牌设计与导出的前端工具。内置 Monaco 代码编辑器、实时预览、参数面板，支持多页排版、自定义卡牌尺寸、图片/SVG/形状绘制、遮罩与滤镜，一键导出 HTML 或打印 PDF。

**中文** | [English](./README.md)

## 功能概览

### 脚本驱动绘制
- 在内置 Monaco 编辑器中编写 JS 代码，定义 `init(workspace)` 和 `draw(page, card)` 函数
- 支持多代码选项卡：`main` 为主入口，可通过 `include('tabName')` 引入其他选项卡代码
- `workspace.run(code, context)` 在绘制函数中动态执行用户代码片段（表达式或函数体）

### 绘制能力
- **文本**：多行文字、对齐、描边、下划线/删除线、渐变填充
- **形状**：直线、曲线（Catmull-Rom）、矩形、圆角矩形、圆、椭圆、多边形、路径
- **画板 (BoardItem)**：内部坐标系、命令队列绘制、纯色/渐变/图案/噪波填充、虚线描边
- **遮罩与滤镜**：pushMask/popMask 多形状遮罩、画板蒙版（亮度控制透明度）、模糊/HSL/RGB 调色/置换/挤压/去色
- **图片与 SVG**：多级加载策略（fetch→blob / File System Access / 回退）、SVG 自动尺寸补全
- **精灵截取**：后台页预渲染、SpriteClip 按卡牌 ID 截取图块、TileBoard 网格拼贴

### 排版与导出
- 多页排版，每页独立网格（行列数、间距、边距、卡牌尺寸）
- 卡牌 ID 分配方向控制（ltr/rtl、ttb/btt、行优先/列优先）
- 页面网格对齐（alignX: left/center/right，alignY: top/middle/bottom）——牌背双面打印长边翻转靠右对齐
- 非标准卡牌：`useGrid: false` + `customCards` 自由布局，可与网格混用
- 一键导出独立 HTML（内嵌 base64 代码与 UI 数据）
- 打印 PDF：每页一张，纸张尺寸按页面宽高比自动选择或手动指定

### 参数面板
- 流式布局（RowLayout / ColumnLayout），多 UI 选项卡分组
- 控件：标签、编辑框、多行文本、下拉框、数值、颜色、开关、复选框、滑块条、按钮、路径/文件选择、列表、表格、代码编辑框、画板预览
- UI 值持久化：serialize/deserialize，导出 HTML 时随代码一起嵌入

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建独立 HTML（build.py 将默认代码注入 dist/index.html → dist/main.html）
npm run build
python build.py
```

打开 `http://localhost:5173/` 即可使用。编辑代码后点击「运行脚本」实时预览。

## 基本代码结构

```javascript
// init：创建页面与 UI 参数
function init(workspace) {
  // UI 参数控件
  new EditBoxUI('title', '默认标题');
  new ColorPickerUI('bg', '#ffffff');
  new SliderUI('fontSize', 28, { min: 12, max: 72, step: 1, label: '字号' });

  // 创建页面
  const page = workspace.createPage({
    width: 2480, height: 3508,
    margin: { top: 40, bottom: 40, left: 40, right: 40 },
    grid: { cols: 3, rows: 3 },
    cardSize: { width: 0, height: 0 },  // 0 = 自动撑满
    draw: 'main',
  });
  workspace.addPage(page);
}

// main：绘制每张卡牌
function main(page, card) {
  card.backgroundColor = UIManager.store['bg'];
  card.borderWidth = 2;

  const title = new TextItem({
    text: UIManager.store['title'],
    x: '50%', y: '20%',
    fontSize: UIManager.store['fontSize'],
    color: '#333333',
    textAlign: 'center',
  });
  card.addItem(title);
}
```

## 技术栈

- **Vue 3** + `<script setup>` SFC
- **TypeScript** 严格类型
- **Vite** 构建
- **Monaco Editor** 代码编辑与智能提示

## 项目结构

```
card-generator/
├── src/
│   ├── api/
│   │   ├── Workspace.ts          # 工作空间：页面管理、卡牌分配、run()
│   │   ├── Card.ts                # 卡牌与只读页面信息
│   │   ├── draw-items/            # 绘制组件
│   │   │   ├── TextItem.ts        # 文本
│   │   │   ├── ImageItem.ts       # 图片
│   │   │   ├── SvgItem.ts         # SVG
│   │   │   ├── BoardItem.ts       # 画板（遮罩/噪波/滤镜/文字/蒙版）
│   │   │   ├── BoardEffects.ts    # 噪波生成器 + 像素滤镜
│   │   │   ├── SpriteClipItem.ts  # 精灵截取
│   │   │   ├── TileBoardItem.ts   # 网格拼贴
│   │   │   └── ...
│   │   └── ui/                    # UI 控件系统
│   ├── components/                # Vue 组件
│   │   ├── ParameterPanel.vue     # 参数面板
│   │   ├── UINodeRenderer.vue     # UI 控件渲染
│   │   ├── Editor.vue             # Monaco 编辑器
│   │   └── Preview.vue            # 预览与导出
│   ├── types/
│   │   └── user-api-declaration.ts # 用户 API 类型声明（编辑器提示）
│   └── App.vue                     # 主应用
├── api-hints.js                   # VSCode/编辑器智能提示定义
├── build.py                       # 将默认代码注入 HTML 的构建脚本
└── default.js                     # 默认用户代码
```

## License

MIT
