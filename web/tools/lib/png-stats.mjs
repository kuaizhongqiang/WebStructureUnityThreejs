/**
 * PNG 像素统计（共享模块）。
 *
 * 谁在用：
 *   · `tools/render-smoke.mjs` —— 判断"画布不是纯色白屏"；
 *   · `tools/verify-unity-transparency.mjs` —— 判断"画布真的透出来了、不是一整块黑"。
 * 两处都要同一套口径，所以抽出来一份，避免两套判据漂移。
 *
 * 只支持 Playwright 截图那种格式（8bit / 非隔行 / RGB 或 RGBA）；不支持的格式直接抛错，
 * 而不是悄悄返回零值（"量不到"不能当成"通过"）。
 */
import { inflateSync } from 'node:zlib'

/** 近黑阈值：亮度低于它算"黑"。 */
const DARK_LUM = 12

/**
 * 解码 PNG 并统计色彩分布（同时把原始像素一并返回，供"两次截图逐像素比对"用）。
 * 返回：`{ width, height, channels, pixels, uniqueColors, minLum, maxLum, meanLum, darkRatio }`
 */
function decodePng(buffer) {
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idat = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (channels === 0 || bitDepth !== 8) {
    throw new Error(`不支持的 PNG 格式：colorType=${colorType} bitDepth=${bitDepth}`)
  }
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = Buffer.alloc(height * stride)
  let pos = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos]
    pos += 1
    const line = raw.subarray(pos, pos + stride)
    pos += stride
    const prev = y === 0 ? null : pixels.subarray((y - 1) * stride, y * stride)
    const cur = pixels.subarray(y * stride, (y + 1) * stride)
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= channels ? prev[x - channels] : 0
      let v = line[x]
      if (filter === 1) v = (v + a) & 0xff
      else if (filter === 2) v = (v + b) & 0xff
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff
      } else if (filter !== 0) {
        throw new Error(`未知 PNG 过滤器：${filter}`)
      }
      cur[x] = v
    }
  }

  // 只出原始像素：统计口径收在 pngStats 里一份（避免两套算法漂移）
  return { width, height, channels, pixels }
}

/**
 * 色彩统计出口（**不含原始像素** —— 消费方会 `JSON.stringify` 它，带上像素会炸）。
 */
export function pngStats(buffer) {
  const { width, height, channels, pixels } = decodePng(buffer)
  const unique = new Set()
  let minLum = 255
  let maxLum = 0
  let lumSum = 0
  let samples = 0
  let darkSamples = 0
  const stride = width * channels
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = y * stride + x * channels
      unique.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2])
      const lum = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
      if (lum < minLum) minLum = lum
      if (lum > maxLum) maxLum = lum
      lumSum += lum
      samples += 1
      if (lum < DARK_LUM) darkSamples += 1
    }
  }
  return {
    width,
    height,
    uniqueColors: unique.size,
    minLum: Math.round(minLum),
    maxLum: Math.round(maxLum),
    meanLum: samples === 0 ? 0 : Math.round(lumSum / samples),
    /** 近黑像素占比（0~1）：不透明黑底会很高；画布透明时看到的是页面底图与模型。 */
    darkRatio: samples === 0 ? 1 : Number((darkSamples / samples).toFixed(3)),
  }
}

/** 只要原始像素时用这个（`pixels` 是 RGB/RGBA 交错的一维 Buffer）。 */
export function pngDecode(buffer) {
  const { width, height, channels, pixels } = decodePng(buffer)
  return { width, height, channels, pixels }
}

/**
 * 两次**同尺寸**截图的平均绝对差（0~255）。用来做"画布是不是透的"这条判据：
 * 把画布藏起来、同一块区域再截一次，如果那个区域几乎没变，说明画布本来就没盖住页面（= 透的）。
 *
 * `region` 可选：`{ x, y, width, height }`（相对左上角的像素范围），只比这一小块。
 */
export function meanAbsDiff(a, b, region) {
  if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) {
    throw new Error('两张图尺寸/通道不一致，无法逐像素比对')
  }
  const area = region ?? { x: 0, y: 0, width: a.width, height: a.height }
  const x0 = Math.max(0, Math.min(a.width - 1, area.x))
  const y0 = Math.max(0, Math.min(a.height - 1, area.y))
  const x1 = Math.max(x0 + 1, Math.min(a.width, area.x + area.width))
  const y1 = Math.max(y0 + 1, Math.min(a.height, area.y + area.height))

  let sum = 0
  let count = 0
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * a.width + x) * a.channels
      const d0 = Math.abs(a.pixels[i] - b.pixels[i])
      const d1 = Math.abs(a.pixels[i + 1] - b.pixels[i + 1])
      const d2 = Math.abs(a.pixels[i + 2] - b.pixels[i + 2])
      sum += (d0 + d1 + d2) / 3
      count += 1
    }
  }
  return count === 0 ? 0 : Number((sum / count).toFixed(1))
}
