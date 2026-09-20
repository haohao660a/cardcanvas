// ============================================================
// 扑克牌生成器 —— UI 参数面板版（缓存优化 + draw 分发）
// - 牌背：draw='back' 分发到 back 函数，所有牌背共用一个缓存容器
// - 正面 54 张牌：draw='front' 分发到 front 函数，相同 rank+suit 的牌共用缓存
//   （单副牌每张内容不同，但扩展为多副时缓存可复用）
// ============================================================

// ------ 创建参数面板 ------
// 分组1: 页面布局
const grpPage = new ColumnLayout({ gap: 6, align: 'start' })
grpPage.add(new LabelUI('━━━ 页面布局 ━━━'))

const rowPageSize = new RowLayout({ gap: 8 })
rowPageSize.add(new LabelUI('页面:'))
rowPageSize.add(new NumberEditUI('page.width', 2480, { min: 100, step: 10 }))
rowPageSize.add(new LabelUI('×'))
rowPageSize.add(new NumberEditUI('page.height', 3508, { min: 100, step: 10 }))
grpPage.add(rowPageSize)

const rowGrid = new RowLayout({ gap: 8 })
rowGrid.add(new LabelUI('网格:'))
rowGrid.add(new NumberEditUI('page.cols', 3, { min: 1, max: 20 }))
rowGrid.add(new LabelUI('列 ×'))
rowGrid.add(new NumberEditUI('page.rows', 3, { min: 1, max: 20 }))
rowGrid.add(new LabelUI('行'))
grpPage.add(rowGrid)

const rowCardSize = new RowLayout({ gap: 8 })
rowCardSize.add(new LabelUI('卡牌:'))
rowCardSize.add(new NumberEditUI('card.width', 750, { min: 50, step: 10 }))
rowCardSize.add(new LabelUI('×'))
rowCardSize.add(new NumberEditUI('card.height', 1050, { min: 50, step: 10 }))
grpPage.add(rowCardSize)

const rowGap = new RowLayout({ gap: 8 })
rowGap.add(new LabelUI('间距:'))
rowGap.add(new NumberEditUI('page.hGap', 5, { min: 0, step: 1 }))
rowGap.add(new LabelUI('水平'))
rowGap.add(new NumberEditUI('page.vGap', 5, { min: 0, step: 1 }))
rowGap.add(new LabelUI('垂直'))
grpPage.add(rowGap)

const rowBg = new RowLayout({ gap: 8 })
rowBg.add(new LabelUI('页面背景:'))
rowBg.add(new ColorPickerUI('page.bg', '#1a2a3a'))
grpPage.add(rowBg)

const rowCount = new RowLayout({ gap: 8 })
rowCount.add(new LabelUI('卡牌总数:'))
rowCount.add(new NumberEditUI('card.count', 54, { min: 1, max: 500, step: 1 }))
grpPage.add(rowCount)

// 分组2: 卡牌样式
const grpStyle = new ColumnLayout({ gap: 6, align: 'start' })
grpStyle.add(new LabelUI('━━━ 卡牌样式 ━━━'))

const rowCardBg = new RowLayout({ gap: 8 })
rowCardBg.add(new LabelUI('背景色:'))
rowCardBg.add(new ColorPickerUI('style.bg', '#f5f0e8'))
grpStyle.add(rowCardBg)

const rowCardBorder = new RowLayout({ gap: 8 })
rowCardBorder.add(new LabelUI('边框:'))
rowCardBorder.add(new ColorPickerUI('style.borderColor', '#c0a87a'))
rowCardBorder.add(new LabelUI('宽:'))
rowCardBorder.add(new NumberEditUI('style.borderWidth', 4, { min: 0, step: 1 }))
rowCardBorder.add(new LabelUI('圆角:'))
rowCardBorder.add(new NumberEditUI('style.borderRadius', 50, { min: 0, step: 1 }))
grpStyle.add(rowCardBorder)

const rowInnerBorder = new RowLayout({ gap: 8 })
rowInnerBorder.add(new LabelUI('内边框:'))
rowInnerBorder.add(new NumberEditUI('style.innerPadding', 12, { min: 0, step: 1 }))
rowInnerBorder.add(new LabelUI('线宽:'))
rowInnerBorder.add(new NumberEditUI('style.innerLineWidth', 2, { min: 0, step: 1 }))
grpStyle.add(rowInnerBorder)

// 分组3: 角标文字
const grpCorner = new ColumnLayout({ gap: 6, align: 'start' })
grpCorner.add(new LabelUI('━━━ 角标文字 ━━━'))

const rowCornerFont = new RowLayout({ gap: 8 })
rowCornerFont.add(new LabelUI('字号比例:'))
rowCornerFont.add(new NumberEditUI('corner.fontSize', 0.22, { min: 0.05, max: 1, step: 0.01 }))
grpCorner.add(rowCornerFont)

const rowCornerOffset = new RowLayout({ gap: 8 })
rowCornerOffset.add(new LabelUI('偏移:'))
rowCornerOffset.add(new NumberEditUI('corner.offsetX', 30, { min: 0, step: 1 }))
rowCornerOffset.add(new LabelUI('X'))
rowCornerOffset.add(new NumberEditUI('corner.offsetY', 30, { min: 0, step: 1 }))
rowCornerOffset.add(new LabelUI('Y'))
grpCorner.add(rowCornerOffset)

const rowFont = new RowLayout({ gap: 8 })
rowFont.add(new LabelUI('字体:'))
rowFont.add(new DropdownUI('text.font', ['Consolas', 'Arial', 'SimSun', 'Microsoft YaHei', 'monospace'], 'Consolas', { editable: true }))
grpCorner.add(rowFont)

// 分组4: 中心容器
const grpCenter = new ColumnLayout({ gap: 6, align: 'start' })
grpCenter.add(new LabelUI('━━━ 中心容器 ━━━'))

const rowCenterScale = new RowLayout({ gap: 8 })
rowCenterScale.add(new LabelUI('缩放:'))
rowCenterScale.add(new NumberEditUI('center.scaleX', 0.8, { min: 0.1, max: 2, step: 0.05 }))
rowCenterScale.add(new LabelUI('×'))
rowCenterScale.add(new NumberEditUI('center.scaleY', 0.8, { min: 0.1, max: 2, step: 0.05 }))
grpCenter.add(rowCenterScale)

// 分组5: 中心图案
const grpPattern = new ColumnLayout({ gap: 6, align: 'start' })
grpPattern.add(new LabelUI('━━━ 中心图案 ━━━'))

const rowJoker = new RowLayout({ gap: 8 })
rowJoker.add(new LabelUI('王牌emoji:'))
rowJoker.add(new NumberEditUI('pattern.jokerEmoji', 0.6, { min: 0.1, max: 2, step: 0.05 }))
rowJoker.add(new ColorPickerUI('pattern.jokerEmojiColor', '#cc2233'))
grpPattern.add(rowJoker)

const rowJokerLabel = new RowLayout({ gap: 8 })
rowJokerLabel.add(new LabelUI('王牌标签:'))
rowJokerLabel.add(new NumberEditUI('pattern.jokerLabel', 0.2, { min: 0.05, max: 1, step: 0.05 }))
rowJokerLabel.add(new ColorPickerUI('pattern.jokerLabelColor', '#1a1a1a'))
grpPattern.add(rowJokerLabel)

const rowFace = new RowLayout({ gap: 8 })
rowFace.add(new LabelUI('人头牌:'))
rowFace.add(new LabelUI('花色'))
rowFace.add(new NumberEditUI('pattern.faceSuit', 0.6, { min: 0.1, max: 2, step: 0.05 }))
rowFace.add(new LabelUI('字母'))
rowFace.add(new NumberEditUI('pattern.faceRank', 0.6, { min: 0.1, max: 2, step: 0.05 }))
grpPattern.add(rowFace)

const rowAce = new RowLayout({ gap: 8 })
rowAce.add(new LabelUI('A花色:'))
rowAce.add(new NumberEditUI('pattern.aceSuit', 1.0, { min: 0.1, max: 2, step: 0.05 }))
grpPattern.add(rowAce)

const rowPip = new RowLayout({ gap: 8 })
rowPip.add(new LabelUI('点数大小:'))
rowPip.add(new NumberEditUI('pattern.pipSize', 0.4, { min: 0.05, max: 1, step: 0.05 }))
grpPattern.add(rowPip)

// 分组6: 王牌滤镜
const grpFilter = new ColumnLayout({ gap: 6, align: 'start' })
grpFilter.add(new LabelUI('━━━ 王牌滤镜 ━━━'))

const rowFilter = new RowLayout({ gap: 8 })
rowFilter.add(new LabelUI('灰度:'))
rowFilter.add(new NumberEditUI('filter.grayscale', 1, { min: 0, max: 1, step: 0.1 }))
rowFilter.add(new LabelUI('亮度:'))
rowFilter.add(new NumberEditUI('filter.brightness', 1.1, { min: 0, max: 3, step: 0.1 }))
grpFilter.add(rowFilter)

// 分组7: 牌背
const grpBack = new ColumnLayout({ gap: 6, align: 'start' })
grpBack.add(new LabelUI('━━━ 牌背 ━━━'))

const rowBackBg = new RowLayout({ gap: 8 })
rowBackBg.add(new LabelUI('背景色:'))
rowBackBg.add(new ColorPickerUI('back.bg', '#1e4a8a'))
grpBack.add(rowBackBg)

const rowBackLine = new RowLayout({ gap: 8 })
rowBackLine.add(new LabelUI('线色:'))
rowBackLine.add(new ColorPickerUI('back.lineColor', '#e8e0d0'))
rowBackLine.add(new LabelUI('线宽:'))
rowBackLine.add(new NumberEditUI('back.lineWidth', 3, { min: 1, max: 30, step: 1 }))
grpBack.add(rowBackLine)

const rowBackGap = new RowLayout({ gap: 8 })
rowBackGap.add(new LabelUI('网格间距:'))
rowBackGap.add(new NumberEditUI('back.lineGap', 40, { min: 10, max: 400, step: 5 }))
rowBackGap.add(new LabelUI('内边距:'))
rowBackGap.add(new NumberEditUI('back.padding', 30, { min: 0, step: 5 }))
grpBack.add(rowBackGap)

// ============================================================
// 参数读取
// ============================================================
function getParams() {
  return {
    font: {
      fontFamily: UIManager.getState('text.font', 'Consolas'),
    },
    page: {
      width: UIManager.getState('page.width', 2480),
      height: UIManager.getState('page.height', 3508),
      margin: { top: 40, bottom: 40, left: 40, right: 40 },
      grid: {
        cols: UIManager.getState('page.cols', 3),
        rows: UIManager.getState('page.rows', 3),
      },
      cardSize: {
        width: UIManager.getState('card.width', 750),
        height: UIManager.getState('card.height', 1050),
      },
      background: UIManager.getState('page.bg', '#1a2a3a'),
      cardHGap: UIManager.getState('page.hGap', 5),
      cardVGap: UIManager.getState('page.vGap', 5),
      hGapEdges: true,
      vGapEdges: true,
    },
    cardCount: UIManager.getState('card.count', 54),
    style: {
      backgroundColor: UIManager.getState('style.bg', '#f5f0e8'),
      borderRadius: UIManager.getState('style.borderRadius', 50),
      borderColor: UIManager.getState('style.borderColor', '#c0a87a'),
      borderWidth: UIManager.getState('style.borderWidth', 4),
      borderInnerPadding: UIManager.getState('style.innerPadding', 12),
      borderLineWidth: UIManager.getState('style.innerLineWidth', 2),
    },
    corner: {
      fontSizeRatio: UIManager.getState('corner.fontSize', 0.22),
      offsetX: UIManager.getState('corner.offsetX', 30),
      offsetY: UIManager.getState('corner.offsetY', 30),
    },
    center: {
      scaleX: UIManager.getState('center.scaleX', 0.8),
      scaleY: UIManager.getState('center.scaleY', 0.8),
      centerX: 0.5,
      centerY: 0.5,
      posX: 0.1,
      posY: 0.1,
      sizeX: 0.8,
      sizeY: 0.8,
    },
    pattern: {
      jokerEmojiSizeRatio: UIManager.getState('pattern.jokerEmoji', 0.6),
      jokerLabelSizeRatio: UIManager.getState('pattern.jokerLabel', 0.2),
      jokerEmojiColor: UIManager.getState('pattern.jokerEmojiColor', '#cc2233'),
      jokerLabelColor: UIManager.getState('pattern.jokerLabelColor', '#1a1a1a'),
      faceSuitSizeRatio: UIManager.getState('pattern.faceSuit', 0.6),
      faceRankSizeRatio: UIManager.getState('pattern.faceRank', 0.6),
      aceSuitSizeRatio: UIManager.getState('pattern.aceSuit', 1.0),
      pipSizeRatio: UIManager.getState('pattern.pipSize', 0.4),
    },
    filter: {
      grayscale: UIManager.getState('filter.grayscale', 1),
      brightness: UIManager.getState('filter.brightness', 1.1),
    },
    back: {
      backgroundColor: UIManager.getState('back.bg', '#1e4a8a'),
      lineColor: UIManager.getState('back.lineColor', '#e8e0d0'),
      lineWidth: UIManager.getState('back.lineWidth', 3),
      lineGap: UIManager.getState('back.lineGap', 40),
      padding: UIManager.getState('back.padding', 30),
    },
  };
}

// ============================================================
// 扑克牌数据
// ============================================================
const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const allCards = [];
for (const suit of suits) {
  for (const rank of ranks) {
    allCards.push({ suit, rank });
  }
}
allCards.push({ suit: '🃏', rank: 'JOKER' });
allCards.push({ suit: '🃏', rank: 'JOKER' });

function getSuitColor(suit) {
  return (suit === '♥' || suit === '♦') ? '#cc2233' : '#1a1a1a';
}

function getRankValue(rank) {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank, 10);
}

function getPipPositions(rankValue) {
  const L = 0.25, R = 0.75;
  const positions = {
    1: [[0.5, 0.5]],
    2: [[0.5, 0.25], [0.5, 0.75]],
    3: [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]],
    4: [[L, 0.25], [R, 0.25], [L, 0.75], [R, 0.75]],
    5: [[L, 0.2], [R, 0.2], [0.5, 0.5], [L, 0.8], [R, 0.8]],
    6: [[L, 0.2], [R, 0.2], [L, 0.5], [R, 0.5], [L, 0.8], [R, 0.8]],
    7: [[L, 0.15], [R, 0.15], [0.5, 0.32], [L, 0.5], [R, 0.5], [L, 0.8], [R, 0.8]],
    8: [[L, 0.15], [R, 0.15], [L, 0.38], [R, 0.38], [L, 0.62], [R, 0.62], [L, 0.85], [R, 0.85]],
    9: [[L, 0.12], [R, 0.12], [L, 0.35], [R, 0.35], [0.5, 0.5], [L, 0.65], [R, 0.65], [L, 0.88], [R, 0.88]],
    10: [[L, 0.1], [R, 0.1], [L, 0.37], [R, 0.37], [0.5, 0.23], [0.5, 0.75], [L, 0.62], [R, 0.62], [L, 0.9], [R, 0.9]]
  };
  return positions[rankValue] || positions[1];
}

// ============================================================
// 缓存容器：全局共享实例（懒加载）
// ============================================================
// 牌背：所有牌背卡牌内容完全相同，共用一个缓存容器
let backCacheInstance = null;
// 正面卡：以 "suit_rank_jokerVariant" 为 key 缓存，相同内容的卡牌共用
// （单副牌每张不同，但扩展为多副牌时可复用）
const frontCacheInstances = {};

// ============================================================
// 初始化：创建页面，通过 draw 属性分发到对应绘制函数
// ============================================================
function init(workspace) {
  const P = getParams();

  // 正面页：draw='front'，分发到 front 绘制函数
  const frontPage = workspace.createPage({ ...P.page, draw: 'front' });
  const card_pre_page = P.page.grid.cols * P.page.grid.rows;
  let left = 0;
  let page_count;
  if (card_pre_page === 0) {
    page_count = 4;
  } else {
    page_count = Math.floor(P.cardCount / card_pre_page);
    left = P.cardCount % card_pre_page;
  }
  for (let i = 0; i < page_count; i++) {
    workspace.addPage(frontPage);
  }
  if (left > 0) {
    frontPage.cardCount = left;
    workspace.addPage(frontPage);
  }

  // 牌背页：draw='back'，分发到 back 绘制函数
  const backPage = workspace.createPage({ ...P.page, draw: 'back' });
  workspace.addPage(backPage);

  // 重置缓存实例（参数变更后重新创建）
  backCacheInstance = null;
  for (const k in frontCacheInstances) delete frontCacheInstances[k];
}

// ============================================================
// 构建牌背缓存容器（懒加载：第一次 back 绘制时创建）
// ============================================================
function buildBackInstance(W, H, P) {
  const pad = P.back.padding;
  const bw = Math.max(1, W - pad * 2);
  const bh = Math.max(1, H - pad * 2);

  // 用 RelativeContainerItem 包装 BoardItem + 装饰边框，开启缓存
  const wrapper = new RelativeContainerItem({
    x: 0, y: 0, width: W, height: H,
  });

  // 斜向交叉网格线画板
  const board = new BoardItem({
    x: pad, y: pad,
    width: bw, height: bh,
    innerWidth: bw, innerHeight: bh,
    clip: true,
    borderRadius: Math.max(0, P.style.borderRadius - pad),
  });
  board.setStroke({ color: P.back.lineColor, lineWidth: P.back.lineWidth });
  const s = Math.max(5, P.back.lineGap);
  for (let k = -bh; k <= bw; k += s) {
    board.drawLine(k, 0, k + bh, bh);       // / 方向
  }
  for (let k = 0; k <= bw + bh; k += s) {
    board.drawLine(k, 0, k - bh, bh);       // \ 方向
  }
  wrapper.addChild(board);

  // 装饰性外边框
  const borderRect = new RectItem({
    x: P.style.borderInnerPadding,
    y: P.style.borderInnerPadding,
    width: W - P.style.borderInnerPadding * 2,
    height: H - P.style.borderInnerPadding * 2,
    fillColor: 'transparent',
    strokeColor: P.style.borderColor,
    lineWidth: P.style.borderLineWidth,
    borderRadius: P.style.borderRadius,
  });
  wrapper.addChild(borderRect);

  // 开启缓存：所有牌背卡牌共用此实例，首张渲染后后续直接 drawImage 输出
  wrapper.enableCache();
  return wrapper;
}

// ============================================================
// 构建正面卡缓存容器（懒加载：按 suit+rank+jokerVariant 缓存）
// ============================================================
function buildFrontInstance(card, suit, rank, P) {
  const W = card.width;
  const H = card.height;
  const rankValue = getRankValue(rank);
  const isFaceCard = (rank === 'J' || rank === 'Q' || rank === 'K');
  const isJoker = (rank === 'JOKER');
  const jokerVariant = isJoker ? (card.id % 2 === 0 ? 'gray' : 'color') : '';

  // 外层容器：承载所有内容，开启缓存
  const wrapper = new RelativeContainerItem({
    x: 0, y: 0, width: W, height: H,
  });

  // ------ 角标 ------
  let titleLabel = `${rank}${suit}`;
  if (isJoker) titleLabel = 'J\nO\nK\nE\nR';

  const topLeft = new TextItem({
    x: P.corner.offsetX, y: P.corner.offsetY,
    text: titleLabel,
    fontSize: W * P.corner.fontSizeRatio,
    color: getSuitColor(suit),
    bold: true,
    fontFamily: P.font.fontFamily,
    textAlign: 'left', textBaseline: 'top',
  });
  wrapper.addChild(topLeft);

  // 右下角（旋转180°）
  const bottomRight = new TextItem({
    x: P.corner.offsetX, y: P.corner.offsetY,
    text: titleLabel,
    fontSize: W * P.corner.fontSizeRatio,
    color: getSuitColor(suit),
    bold: true,
    fontFamily: P.font.fontFamily,
    textAlign: 'left', textBaseline: 'top',
  });
  const rotContainer = new RelativeContainerItem({
    x: 0, y: 0, width: W, height: H,
    rotation: Math.PI, centerX: 0.5, centerY: 0.5,
  });
  rotContainer.addChild(bottomRight);
  wrapper.addChild(rotContainer);

  // ------ 中心容器 ------
  const centerContainer = new RelativeContainerItem({
    x: 0, y: 0, width: W, height: H,
    scaleX: P.center.scaleX, scaleY: P.center.scaleY,
    centerX: P.center.centerX, centerY: P.center.centerY,
  });
  centerContainer.setPositionPercent(P.center.posX, P.center.posY);
  centerContainer.setSizePercent(P.center.sizeX, P.center.sizeY);

  // 王牌灰度滤镜（偶数 id 的 Joker）
  if (isJoker && jokerVariant === 'gray') {
    centerContainer.setFilter({
      grayscale: P.filter.grayscale,
      brightness: P.filter.brightness,
    });
  }

  // ------ 中心图案 ------
  if (isJoker) {
    const jokerText = new TextItem({
      text: '🃏',
      fontSize: W * P.pattern.jokerEmojiSizeRatio,
      fontFamily: P.font.fontFamily,
      color: P.pattern.jokerEmojiColor,
      textAlign: 'center', textBaseline: 'middle',
    });
    jokerText.setPositionPercent(0.5, 0.5);
    centerContainer.addChild(jokerText);

    const jokerLabel = new TextItem({
      text: 'JOKER',
      fontSize: W * P.pattern.jokerLabelSizeRatio,
      fontFamily: P.font.fontFamily,
      color: P.pattern.jokerLabelColor,
      bold: true,
      textAlign: 'center', textBaseline: 'middle',
    });
    jokerLabel.setPositionPercent(0.5, 0.82);
    centerContainer.addChild(jokerLabel);

  } else if (isFaceCard) {
    const centerSuit = new TextItem({
      text: suit,
      fontSize: W * P.pattern.faceSuitSizeRatio,
      fontFamily: P.font.fontFamily,
      color: getSuitColor(suit),
      textAlign: 'center', textBaseline: 'middle',
    });
    centerSuit.setPositionPercent(0.5, 0.35);
    centerContainer.addChild(centerSuit);

    const centerRank = new TextItem({
      text: rank,
      fontSize: W * P.pattern.faceRankSizeRatio,
      color: getSuitColor(suit),
      bold: true,
      fontFamily: P.font.fontFamily,
      textAlign: 'center', textBaseline: 'middle',
    });
    centerRank.setPositionPercent(0.5, 0.68);
    centerContainer.addChild(centerRank);

  } else if (rank === 'A') {
    const centerSuit = new TextItem({
      text: suit,
      fontFamily: P.font.fontFamily,
      fontSize: W * P.pattern.aceSuitSizeRatio,
      color: getSuitColor(suit),
      textAlign: 'center', textBaseline: 'middle',
    });
    centerSuit.setPositionPercent(0.5, 0.5);
    centerContainer.addChild(centerSuit);

  } else {
    const pipSize = W * P.pattern.pipSizeRatio;
    const positions = getPipPositions(rankValue);
    for (const pos of positions) {
      const pip = new TextItem({
        text: suit,
        fontSize: pipSize,
        color: getSuitColor(suit),
        fontFamily: P.font.fontFamily,
        textAlign: 'center', textBaseline: 'middle',
      });
      pip.setPositionPercent(pos[0], pos[1]);
      centerContainer.addChild(pip);
    }
  }
  wrapper.addChild(centerContainer);

  // ------ 装饰性内边框 ------
  const borderRect = new RectItem({
    x: P.style.borderInnerPadding,
    y: P.style.borderInnerPadding,
    width: W - P.style.borderInnerPadding * 2,
    height: H - P.style.borderInnerPadding * 2,
    fillColor: 'transparent',
    strokeColor: P.style.borderColor,
    lineWidth: P.style.borderLineWidth,
    borderRadius: P.style.borderRadius,
  });
  wrapper.addChild(borderRect);

  // 开启缓存
  wrapper.enableCache();
  return wrapper;
}

// ============================================================
// front 绘制函数：每张正面牌调用一次
// 用 suit+rank+jokerVariant 作为 key，相同内容的牌共用缓存容器
// ============================================================
function front(page, card) {
  const P = getParams();
  const idx = card.id % allCards.length;
  const { suit, rank } = allCards[idx];
  const isJoker = (rank === 'JOKER');
  const jokerVariant = isJoker ? (card.id % 2 === 0 ? 'gray' : 'color') : '';
  const cacheKey = `${suit}_${rank}_${jokerVariant}`;

  // 懒加载：第一次遇到该内容时用 card 实际尺寸创建缓存容器
  if (!frontCacheInstances[cacheKey]) {
    frontCacheInstances[cacheKey] = buildFrontInstance(card, suit, rank, P);
  }

  // 卡牌样式（背景/边框/圆角由 card 自身属性设置，不影响容器缓存）
  card.backgroundColor = P.style.backgroundColor;
  card.borderRadius = P.style.borderRadius;
  card.borderColor = P.style.borderColor;
  card.borderWidth = P.style.borderWidth;

  // 引用共享实例：首次 draw 缓存渲染，后续直接 drawImage 输出
  card.addItem(frontCacheInstances[cacheKey]);
}

// ============================================================
// back 绘制函数：所有牌背卡牌共用一个缓存容器
// ============================================================
function back(page, card) {
  const P = getParams();

  // 懒加载：第一次绘制时用 card 实际尺寸创建
  if (!backCacheInstance) {
    backCacheInstance = buildBackInstance(card.width, card.height, P);
  }

  // 卡牌样式
  card.backgroundColor = P.back.backgroundColor;
  card.borderRadius = P.style.borderRadius;
  card.borderColor = P.style.borderColor;
  card.borderWidth = P.style.borderWidth;

  // 引用共享实例
  card.addItem(backCacheInstance);
}
