// src/api/draw-items/BoardEffects.ts
// 画板特效工具：噪波生成 + 像素级滤镜

// ===================== 颜色工具 =====================

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.substring(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ===================== 噪波生成器 =====================

/** 伪随机数生成器（mulberry32） */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 平滑插值 */
function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** 值噪波（Value Noise）生成器 */
class ValueNoise {
  private rand: () => number;
  private perm: number[];

  constructor(seed: number) {
    this.rand = mulberry32(seed);
    this.perm = new Array(512);
    const p = new Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  /** 获取 (x,y) 处的噪波值，范围 0~1 */
  noise2D(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const hash = (a: number, b: number) => this.perm[(this.perm[a] + b) & 511] / 255;

    const v00 = hash(xi, yi);
    const v10 = hash(xi + 1, yi);
    const v01 = hash(xi, yi + 1);
    const v11 = hash(xi + 1, yi + 1);

    const u = smoothStep(xf);
    const v = smoothStep(yf);

    const top = v00 + (v10 - v00) * u;
    const bot = v01 + (v11 - v01) * u;
    return top + (bot - top) * v;
  }
}

/** 噪波类型 */
export type NoiseType = 'value' | 'fractal' | 'turbulence';

/** 噪波生成选项 */
export interface NoiseOptions {
  /** 噪波类型：value 值噪波，fractal 分形布朗运动，turbulence 湍流 */
  type?: NoiseType;
  /** 随机种子（相同种子产生相同噪波） */
  seed?: number;
  /** 缩放（数值越小噪波越细密），默认 10 */
  scale?: number;
  /** 分形层数（仅 fractal/turbulence），默认 4 */
  octaves?: number;
  /** 分形振幅衰减系数，默认 0.5 */
  persistence?: number;
  /** 分形频率倍增系数，默认 2 */
  lacunarity?: number;
  /** 起始颜色（噪波值 0 时） */
  color1?: string;
  /** 结束颜色（噪波值 1 时） */
  color2?: string;
  /** 对比度（0~2，默认 1） */
  contrast?: number;
  /** 亮度偏移（-1~1，默认 0） */
  brightness?: number;
}

/**
 * 生成噪波图案 canvas。
 * 噪波值在 color1 和 color2 之间插值。
 */
export function generateNoiseCanvas(opts: NoiseOptions & { width: number; height: number }): HTMLCanvasElement {
  const { width, height } = opts;
  const type = opts.type ?? 'value';
  const seed = opts.seed ?? Math.floor(Math.random() * 100000);
  const scale = opts.scale ?? 10;
  const octaves = Math.max(1, opts.octaves ?? 4);
  const persistence = opts.persistence ?? 0.5;
  const lacunarity = opts.lacunarity ?? 2;
  const color1 = hexToRgb(opts.color1 ?? '#000000');
  const color2 = hexToRgb(opts.color2 ?? '#ffffff');
  const contrast = opts.contrast ?? 1;
  const brightness = opts.brightness ?? 0;

  const noise = new ValueNoise(seed);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      if (type === 'value') {
        value = noise.noise2D(x / scale, y / scale);
      } else {
        let amp = 1, freq = 1, maxAmp = 0;
        for (let o = 0; o < octaves; o++) {
          const n = noise.noise2D((x / scale) * freq, (y / scale) * freq);
          value += n * amp;
          maxAmp += amp;
          amp *= persistence;
          freq *= lacunarity;
        }
        value /= maxAmp;
        if (type === 'turbulence') {
          value = Math.abs(value * 2 - 1);
        }
      }

      // 对比度 + 亮度
      value = (value - 0.5) * contrast + 0.5 + brightness;
      value = Math.max(0, Math.min(1, value));

      const i = (y * width + x) * 4;
      data[i] = Math.round(color1[0] + (color2[0] - color1[0]) * value);
      data[i + 1] = Math.round(color1[1] + (color2[1] - color1[1]) * value);
      data[i + 2] = Math.round(color1[2] + (color2[2] - color1[2]) * value);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// ===================== 像素滤镜 =====================

/** 模糊滤镜选项 */
export interface BlurOptions {
  /** 模糊半径（像素），默认 5 */
  radius?: number;
}

/** HSL 调色选项 */
export interface HslOptions {
  /** 色相偏移（-360~360 度），默认 0 */
  hue?: number;
  /** 饱和度调整（-1~1），默认 0 */
  saturation?: number;
  /** 亮度调整（-1~1），默认 0 */
  lightness?: number;
}

/** RGB 调色选项 */
export interface RgbOptions {
  /** 红色通道调整（-255~255），默认 0 */
  r?: number;
  /** 绿色通道调整（-255~255），默认 0 */
  g?: number;
  /** 蓝色通道调整（-255~255），默认 0 */
  b?: number;
  /** 红色通道乘数（0~2），默认 1 */
  rScale?: number;
  /** 绿色通道乘数（0~2），默认 1 */
  gScale?: number;
  /** 蓝色通道乘数（0~2），默认 1 */
  bScale?: number;
}

/** 置换滤镜选项（按噪波偏移像素） */
export interface DisplaceOptions {
  /** 水平位移幅度（像素），默认 10 */
  amountX?: number;
  /** 垂直位移幅度（像素），默认 10 */
  amountY?: number;
  /** 噪波缩放，默认 20 */
  scale?: number;
  /** 随机种子 */
  seed?: number;
}

/** 挤压滤镜选项（径向挤压/膨胀） */
export interface PinchOptions {
  /** 挤压强度（-1=完全膨胀, 0=无, 1=完全挤压），默认 0.5 */
  strength?: number;
  /** 挤压中心 X（0~1），默认 0.5 */
  cx?: number;
  /** 挤压中心 Y（0~1），默认 0.5 */
  cy?: number;
  /** 影响半径比例（0~1），默认 1 */
  radius?: number;
}

/** 去色选项 */
export interface DesaturateOptions {
  /** 去色强度（0=原色, 1=完全灰度），默认 1 */
  amount?: number;
}

/** 滤镜类型 */
export type FilterType = 'blur' | 'hsl' | 'rgb' | 'displace' | 'pinch' | 'desaturate';

/** 对 ImageData 应用滤镜（原地修改） */
export function applyFilterToImageData(
  imgData: ImageData,
  type: FilterType,
  opts: BlurOptions | HslOptions | RgbOptions | DisplaceOptions | PinchOptions | DesaturateOptions
): ImageData {
  switch (type) {
    case 'blur': return blurImageData(imgData, opts as BlurOptions);
    case 'hsl': return hslImageData(imgData, opts as HslOptions);
    case 'rgb': return rgbImageData(imgData, opts as RgbOptions);
    case 'displace': return displaceImageData(imgData, opts as DisplaceOptions);
    case 'pinch': return pinchImageData(imgData, opts as PinchOptions);
    case 'desaturate': return desaturateImageData(imgData, opts as DesaturateOptions);
    default: return imgData;
  }
}

/** 高斯模糊（盒模糊近似，多次迭代） */
function blurImageData(imgData: ImageData, opts: BlurOptions): ImageData {
  const radius = Math.max(1, opts.radius ?? 5);
  const { data, width, height } = imgData;
  const copy = new Uint8ClampedArray(data);

  // 水平方向
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.min(width - 1, Math.max(0, x + dx));
        const i = (y * width + nx) * 4;
        r += copy[i]; g += copy[i + 1]; b += copy[i + 2]; a += copy[i + 3];
        count++;
      }
      const o = (y * width + x) * 4;
      data[o] = r / count;
      data[o + 1] = g / count;
      data[o + 2] = b / count;
      data[o + 3] = a / count;
    }
  }

  // 垂直方向
  const hcopy = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = Math.min(height - 1, Math.max(0, y + dy));
        const i = (ny * width + x) * 4;
        r += hcopy[i]; g += hcopy[i + 1]; b += hcopy[i + 2]; a += hcopy[i + 3];
        count++;
      }
      const o = (y * width + x) * 4;
      data[o] = r / count;
      data[o + 1] = g / count;
      data[o + 2] = b / count;
      data[o + 3] = a / count;
    }
  }

  return imgData;
}

/** HSL 调色 */
function hslImageData(imgData: ImageData, opts: HslOptions): ImageData {
  const hueShift = (opts.hue ?? 0) / 360;
  const satAdj = opts.saturation ?? 0;
  const lightAdj = opts.lightness ?? 0;
  const { data } = imgData;

  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    let nh = (h + hueShift + 1) % 1;
    let ns = Math.max(0, Math.min(1, s + satAdj));
    let nl = Math.max(0, Math.min(1, l + lightAdj));
    const [r, g, b] = hslToRgb(nh, ns, nl);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return imgData;
}

/** RGB 调色（加法 + 乘法） */
function rgbImageData(imgData: ImageData, opts: RgbOptions): ImageData {
  const rAdd = opts.r ?? 0, gAdd = opts.g ?? 0, bAdd = opts.b ?? 0;
  const rScale = opts.rScale ?? 1, gScale = opts.gScale ?? 1, bScale = opts.bScale ?? 1;
  const { data } = imgData;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp255(data[i] * rScale + rAdd);
    data[i + 1] = clamp255(data[i + 1] * gScale + gAdd);
    data[i + 2] = clamp255(data[i + 2] * bScale + bAdd);
  }
  return imgData;
}

/** 去色（灰度） */
function desaturateImageData(imgData: ImageData, opts: DesaturateOptions): ImageData {
  const amount = opts.amount ?? 1;
  const { data } = imgData;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = clamp255(data[i] + (gray - data[i]) * amount);
    data[i + 1] = clamp255(data[i + 1] + (gray - data[i + 1]) * amount);
    data[i + 2] = clamp255(data[i + 2] + (gray - data[i + 2]) * amount);
  }
  return imgData;
}

/** 置换滤镜：按噪波偏移采样源像素 */
function displaceImageData(imgData: ImageData, opts: DisplaceOptions): ImageData {
  const amountX = opts.amountX ?? 10;
  const amountY = opts.amountY ?? 10;
  const scale = opts.scale ?? 20;
  const seed = opts.seed ?? 12345;
  const { data, width, height } = imgData;
  const copy = new Uint8ClampedArray(data);
  const noise = new ValueNoise(seed);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = noise.noise2D(x / scale, y / scale);
      const ny = noise.noise2D(x / scale + 1000, y / scale + 1000);
      const ox = Math.round((nx - 0.5) * amountX * 2);
      const oy = Math.round((ny - 0.5) * amountY * 2);
      const sx = Math.min(width - 1, Math.max(0, x + ox));
      const sy = Math.min(height - 1, Math.max(0, y + oy));
      const src = (sy * width + sx) * 4;
      const dst = (y * width + x) * 4;
      data[dst] = copy[src];
      data[dst + 1] = copy[src + 1];
      data[dst + 2] = copy[src + 2];
      data[dst + 3] = copy[src + 3];
    }
  }
  return imgData;
}

/** 挤压滤镜：径向挤压/膨胀 */
function pinchImageData(imgData: ImageData, opts: PinchOptions): ImageData {
  const strength = opts.strength ?? 0.5;
  const cx = (opts.cx ?? 0.5) * imgData.width;
  const cy = (opts.cy ?? 0.5) * imgData.height;
  const radius = Math.min(imgData.width, imgData.height) * (opts.radius ?? 1) / 2;
  const { data, width, height } = imgData;
  const copy = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      const t = dist / radius;
      // strength > 0 向中心挤压（采样更远处的像素），< 0 膨胀
      const factor = strength > 0 ? 1 + strength * (1 - t) : 1 + strength * t;
      const sx = cx + dx * factor;
      const sy = cy + dy * factor;
      const ix = Math.round(sx);
      const iy = Math.round(sy);
      if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue;
      const src = (iy * width + ix) * 4;
      const dst = (y * width + x) * 4;
      data[dst] = copy[src];
      data[dst + 1] = copy[src + 1];
      data[dst + 2] = copy[src + 2];
      data[dst + 3] = copy[src + 3];
    }
  }
  return imgData;
}
