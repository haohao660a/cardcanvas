// src/api/draw-items/TextItem.ts
import { BaseDrawItem } from './DrawItem';
import type { Color } from './DrawItem';

export interface TextOptions {
  text: string;
  fontSize?: number;
  color?: Color;
  backgroundColor?: Color;
  borderRadius?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  textBaseline?: 'top' | 'middle' | 'bottom';
  /** 最大宽度（像素），超出自动换行，默认 0 表示不自动换行 */
  maxWidth?: number;
  /** 行高（倍数，相对于 fontSize），默认 1 */
  lineHeight?: number;
}

export class TextItem extends BaseDrawItem {
  type = 'text';
  text: string;
  fontSize: number;
  color: Color;
  backgroundColor: Color;
  borderRadius: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  textBaseline: 'top' | 'middle' | 'bottom';
  maxWidth: number;
  lineHeight: number;

  constructor(opts: TextOptions & { x?: number | string; y?: number | string; width?: number | string; height?: number | string; anchorX?: number | string; anchorY?: number | string; anchorXMode?: 'pixel' | 'percent'; anchorYMode?: 'pixel' | 'percent' }) {
    super();
    this.text = opts.text;
    this.fontSize = opts.fontSize ?? 16;
    this.color = opts.color ?? '#000000';
    this.backgroundColor = opts.backgroundColor ?? 'transparent';
    this.borderRadius = opts.borderRadius ?? 0;
    this.bold = opts.bold ?? false;
    this.italic = opts.italic ?? false;
    this.underline = opts.underline ?? false;
    this.strikethrough = opts.strikethrough ?? false;
    this.fontFamily = opts.fontFamily ?? 'sans-serif';
    this.textAlign = opts.textAlign ?? 'left';
    this.textBaseline = opts.textBaseline ?? 'top';
    this.maxWidth = opts.maxWidth ?? 0;
    this.lineHeight = opts.lineHeight ?? 1;
    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;
    if (opts.width !== undefined) this.width = opts.width;
    if (opts.height !== undefined) this.height = opts.height;
    if (opts.anchorX !== undefined) this.anchorX = opts.anchorX;
    if (opts.anchorY !== undefined) this.anchorY = opts.anchorY;
    if (opts.anchorXMode !== undefined) this.anchorXMode = opts.anchorXMode;
    if (opts.anchorYMode !== undefined) this.anchorYMode = opts.anchorYMode;
  }

  draw(ctx: CanvasRenderingContext2D, parentWidth: number, parentHeight: number) {
    const { x, y, w, h } = this.resolveRect(parentWidth, parentHeight);

    ctx.save();

    // 设置字体样式
    let font = '';
    if (this.bold) font += 'bold ';
    if (this.italic) font += 'italic ';
    font += `${this.fontSize}px ${this.fontFamily}`;
    ctx.font = font;

    // ----- 文本换行处理 -----
    // 1. 先按 \n 分割文本
    const paragraphs = this.text.split('\n');
    
    // 2. 对每个段落进行处理（可能进一步按 maxWidth 换行）
    let allLines: string[] = [];
    for (const para of paragraphs) {
      if (para === '') {
        allLines.push(''); // 保留空行
        continue;
      }
      
      if (this.maxWidth <= 0) {
        // 不自动换行，直接添加整个段落
        allLines.push(para);
      } else {
        // 自动换行：按 maxWidth 分割
        const wrappedLines = this.wrapText(ctx, para, this.maxWidth);
        allLines.push(...wrappedLines);
      }
    }

    // 如果没有任何行，直接返回
    if (allLines.length === 0) {
      ctx.restore();
      return;
    }

    const lineHeightPx = this.fontSize * this.lineHeight;
    const totalTextHeight = allLines.length * lineHeightPx;

    // 计算每行的宽度和最大宽度
    let maxLineWidth = 0;
    const lineWidths: number[] = [];
    for (const line of allLines) {
      const metrics = ctx.measureText(line);
      const width = metrics.width;
      lineWidths.push(width);
      maxLineWidth = Math.max(maxLineWidth, width);
    }

    // 如果指定了 width，使用指定宽度；否则使用实际最大宽度
    const effectiveW = w || maxLineWidth;
    const effectiveH = h || totalTextHeight;

    // 绘制背景
    if (this.backgroundColor !== 'transparent') {
      ctx.fillStyle = this.backgroundColor;
      const r = this.borderRadius;
      ctx.beginPath();
      ctx.roundRect(x, y, effectiveW, effectiveH, r);
      ctx.fill();
    }

    // ---------- 关键修复：判断是否多行 ----------
    const isMultiLine = allLines.length > 1 || this.text.includes('\n') || this.maxWidth > 0;

    if (!isMultiLine && allLines.length === 1) {
      // ----- 单行模式：使用用户指定的 textAlign 和 textBaseline -----
      ctx.textAlign = this.textAlign;
      ctx.textBaseline = this.textBaseline;
      ctx.fillStyle = this.color;

      let drawX = x;
      let drawY = y;
      if (this.textAlign === 'center') drawX += w / 2;
      else if (this.textAlign === 'right') drawX += w;
      if (this.textBaseline === 'middle') drawY += h / 2;
      else if (this.textBaseline === 'bottom') drawY += h;

      ctx.fillText(this.text, drawX, drawY);

      // 装饰线
      if (this.underline || this.strikethrough) {
        const metrics = ctx.measureText(this.text);
        if (this.underline) {
          const lineY = drawY + (this.textBaseline === 'top' ? this.fontSize * 0.2 : 0);
          ctx.beginPath();
          ctx.moveTo(x, lineY);
          ctx.lineTo(x + metrics.width, lineY);
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (this.strikethrough) {
          const strikeY = drawY - this.fontSize * 0.3;
          ctx.beginPath();
          ctx.moveTo(x, strikeY);
          ctx.lineTo(x + metrics.width, strikeY);
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    } else {
      // ----- 多行模式：使用 top/left 手动控制每行 -----
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = this.color;

      // 计算起始绘制位置（根据对齐方式）
      let startX = x;
      let startY = y;

      // 水平对齐
      if (this.textAlign === 'center') {
        // w>0：在容器宽度内居中；w=0：以位置点为中心（模拟 canvas textAlign='center'）
        startX += w > 0 ? (effectiveW - maxLineWidth) / 2 : -maxLineWidth / 2;
      } else if (this.textAlign === 'right') {
        startX += w > 0 ? effectiveW - maxLineWidth : -maxLineWidth;
      }

      // 垂直对齐
      if (this.textBaseline === 'middle') {
        // h>0：在容器高度内居中；h=0：以位置点为中心（模拟 canvas textBaseline='middle'）
        startY += h > 0 ? (effectiveH - totalTextHeight) / 2 : -totalTextHeight / 2;
      } else if (this.textBaseline === 'bottom') {
        startY += h > 0 ? effectiveH - totalTextHeight : -totalTextHeight;
      }

      // 逐行绘制（每行根据自身宽度计算 X 偏移）
      let firstLineX = startX;
      for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];
        const lineY = startY + i * lineHeightPx;
        const lw = lineWidths[i];
        let lineX = startX;

        if (this.textAlign === 'center') {
          lineX = startX + (maxLineWidth - lw) / 2;
        } else if (this.textAlign === 'right') {
          lineX = startX + (maxLineWidth - lw);
        }

        if (i === 0) firstLineX = lineX;
        ctx.fillText(line, lineX, lineY);
      }

      // 装饰线（仅对第一行有效）
      if (this.underline || this.strikethrough) {
        const metrics = ctx.measureText(allLines[0] || '');
        if (this.underline) {
          const lineY = startY + this.fontSize * 0.2;
          ctx.beginPath();
          ctx.moveTo(firstLineX, lineY);
          ctx.lineTo(firstLineX + metrics.width, lineY);
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (this.strikethrough) {
          const strikeY = startY - this.fontSize * 0.3;
          ctx.beginPath();
          ctx.moveTo(firstLineX, strikeY);
          ctx.lineTo(firstLineX + metrics.width, strikeY);
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  /**
   * 将文本按最大宽度分割为多行
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const chars = text.split('');
    let currentLine = '';

    for (const char of chars) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }
}