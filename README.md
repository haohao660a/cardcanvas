# Card Generator

A front-end tool for designing and exporting cards via JavaScript scripts. Features a built-in Monaco code editor, live preview, parameter panel, multi-page layout, custom card sizes, image/SVG/shape drawing, masks and filters, one-click HTML export or PDF printing.

[中文](./README.zh-CN.md) | **English**

## Features

### Script-Driven Drawing
- Write JS code in the built-in Monaco editor; define `init(workspace)` and `draw(page, card)` functions
- Multi-tab code editing: `main` is the entry point; use `include('tabName')` to import other tabs
- `workspace.run(code, context)` dynamically executes user code snippets (expression or function body) during drawing

### Drawing Capabilities
- **Text**: multi-line, alignment, stroke, underline/strikethrough, gradient fill
- **Shapes**: lines, curves (Catmull-Rom), rectangles, rounded rectangles, circles, ellipses, polygons, paths
- **Board (BoardItem)**: internal coordinate system, command queue drawing, solid/gradient/pattern/noise fill, dashed stroke
- **Masks & Filters**: pushMask/popMask multi-shape masks, board luminance mask, blur/HSL/RGB adjust/displace/pinch/desaturate
- **Images & SVG**: multi-tier loading strategy (fetch→blob / File System Access / fallback), automatic SVG size normalization
- **Sprite Clipping**: background page pre-rendering, SpriteClip by card ID, TileBoard grid tiling

### Layout & Export
- Multi-page layout with independent grid per page (rows/cols, gaps, margins, card sizes)
- Card ID assignment direction control (ltr/rtl, ttb/btt, row-first/col-first)
- Page grid alignment (alignX: left/center/right, alignY: top/middle/bottom) — for double-sided card back printing with long-edge flip
- Non-standard cards: `useGrid: false` + `customCards` free layout, mixable with grid
- One-click standalone HTML export (embedded base64 code & UI data)
- PDF printing: one page per sheet, paper size auto-selected by aspect ratio or manually specified

### Parameter Panel
- Flow layout (RowLayout / ColumnLayout), multi-tab UI grouping
- Controls: label, edit box, textarea, dropdown, number, color picker, switch, checkbox, slider, button, path/file picker, list, table, code editor, board preview
- UI value persistence: serialize/deserialize, embedded in exported HTML

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build standalone HTML (build.py injects default code into dist/index.html → dist/main.html)
npm run build
python build.py
```

Open `http://localhost:5173/` to start. Edit code and click "Run Script" for live preview.

## Basic Code Structure

```javascript
// init: create pages and UI parameters
function init(workspace) {
  // UI parameter controls
  new EditBoxUI('title', 'Default Title');
  new ColorPickerUI('bg', '#ffffff');
  new SliderUI('fontSize', 28, { min: 12, max: 72, step: 1, label: 'Font Size' });

  // Create page
  const page = workspace.createPage({
    width: 2480, height: 3508,
    margin: { top: 40, bottom: 40, left: 40, right: 40 },
    grid: { cols: 3, rows: 3 },
    cardSize: { width: 0, height: 0 },  // 0 = auto-fill
    draw: 'main',
  });
  workspace.addPage(page);
}

// main: draw each card
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

## Tech Stack

- **Vue 3** + `<script setup>` SFC
- **TypeScript** strict mode
- **Vite** build tool
- **Monaco Editor** for code editing with IntelliSense

## Project Structure

```
card-generator/
├── src/
│   ├── api/
│   │   ├── Workspace.ts          # Workspace: page management, card assignment, run()
│   │   ├── Card.ts                # Card & read-only page info
│   │   ├── draw-items/            # Drawing components
│   │   │   ├── TextItem.ts        # Text
│   │   │   ├── ImageItem.ts       # Image
│   │   │   ├── SvgItem.ts         # SVG
│   │   │   ├── BoardItem.ts       # Board (mask/noise/filter/text/mask-board)
│   │   │   ├── BoardEffects.ts    # Noise generator + pixel filters
│   │   │   ├── SpriteClipItem.ts  # Sprite clipping
│   │   │   ├── TileBoardItem.ts   # Grid tiling
│   │   │   └── ...
│   │   └── ui/                    # UI control system
│   ├── components/                # Vue components
│   │   ├── ParameterPanel.vue     # Parameter panel
│   │   ├── UINodeRenderer.vue     # UI control renderer
│   │   ├── Editor.vue             # Monaco editor
│   │   └── Preview.vue            # Preview & export
│   ├── types/
│   │   └── user-api-declaration.ts # User API type declarations (editor hints)
│   └── App.vue                     # Main app
├── api-hints.js                   # VSCode/editor IntelliSense definitions
├── build.py                       # Script to inject default code into HTML
└── default.js                     # Default user code
```

## License

MIT
