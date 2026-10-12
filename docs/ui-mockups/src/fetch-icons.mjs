/**
 * 生成 `src/icons.mjs` —— 把 lucide 图标内联成 SVG 片段，供排版稿使用。
 *
 * 为什么"内联"而不是 CDN 引用：
 *   排版稿要保持**零外部请求、可离线打开、可无网截图**，否则评审与自动化截图会被网络拖累。
 * 产品端（web/）不要用这份内联数据，直接用 npm 包（如 lucide-vue-next），那是 tree-shaking 的。
 *
 * 图标库：Lucide（ISC 许可，可商用）。许可原文见 `../assets/icons/LICENSE-lucide.txt`。
 * 版本：见下面的 PINNED_VERSION（升级时改这里并重新生成，不要各自手改 icons.mjs）。
 *
 * 用法：
 *   node src/fetch-icons.mjs                                  # 从 unpkg 按固定版本拉取
 *   LUCIDE_DIR=D:\tmp\node_modules\lucide-static node src/fetch-icons.mjs   # 用本地已装包（离线）
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PINNED_VERSION = '1.55.0'
const here = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(here, 'icons.mjs')

/** 本项目实际用到的图标（新增图标：加进这个数组并重新执行本脚本）。 */
const ICONS = [
  // 导航 / 外壳
  'menu', 'arrow-left', 'x', 'maximize', 'sliders-horizontal', 'circle-help',
  // 通用状态
  'check', 'lock', 'info', 'triangle-alert', 'chevron-down', 'chevron-up',
  // 三维视口工具
  'rotate-cw', 'expand', 'crosshair',
  // 播放器
  'play', 'volume-2',
  // 仪器（设备清单）
  'gauge', 'plug-zap', 'thermometer', 'flame', 'cable',
  // 画质档位 / 答题选项
  'signal-low', 'signal-high', 'gem', 'square', 'square-check',
]

async function load(name) {
  const localDir = process.env.LUCIDE_DIR
  if (localDir) {
    const file = join(localDir, 'icons', `${name}.svg`)
    if (!existsSync(file)) throw new Error(`本地 lucide 包里没有 ${name}.svg（${file}）`)
    return readFile(file, 'utf8')
  }
  const url = `https://unpkg.com/lucide-static@${PINNED_VERSION}/icons/${name}.svg`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`拉取失败 ${url} → HTTP ${response.status}`)
  return await response.text()
}

/** 只取 <svg> 内部内容：外层属性由 icon() 统一给（尺寸 / 描边 / currentColor）。 */
function inner(svg) {
  const matched = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  if (!matched) throw new Error('不是合法的 SVG')
  return matched[1]
    .replace(/>\s+</g, '><')   // 只压标签之间的空白；标签内部的空格必须保留（否则 <svgclass= 这种会坏）
    .trim()
}

const entries = []
for (const name of ICONS) {
  entries.push([name, inner(await load(name))])
}
console.log(`已取 ${entries.length} 个图标：${ICONS.join(', ')}`)

const lines = entries.map(([name, body]) => `  '${name}': '${body.replace(/'/g, "\\'")}',`).join('\n')

const file = `/**
 * 自动生成，请勿手改 —— 由 \`src/fetch-icons.mjs\` 产出。
 *
 * 图标来源：Lucide v${PINNED_VERSION}（ISC 许可，可商用；许可原文见 ../assets/icons/LICENSE-lucide.txt）
 * 内联原因：排版稿保持零外部请求、可离线打开、可无网截图。
 * 产品端（web/）请改用 npm 包在构建期 tree-shake，不要复用这份数据。
 * 新增图标：把名字加进 fetch-icons.mjs 的 ICONS 数组，再执行 \`node src/fetch-icons.mjs\`。
 */
export const ICON_VERSION = '${PINNED_VERSION}'

export const ICON_PATHS = {
${lines}
}

/**
 * 输出一个矢量图标。
 * @param {string} name  ICON_PATHS 里的键
 * @param {number} size  边长（px），默认 16 —— 与 13~14px 正文同排时的推荐值
 * @param {string} extra 追加的 class（如 'ui-tile__icon-svg'）
 */
export function icon(name, size = 16, extra = '') {
  const body = ICON_PATHS[name]
  if (!body) throw new Error(\`未登记的图标：\${name} —— 请在 src/fetch-icons.mjs 的 ICONS 里加一行并重新生成\`)
  const cls = extra ? \`ico \${extra}\` : 'ico'
  return \`<svg class="\${cls}" width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">\${body}</svg>\`
}
`

await mkdir(dirname(OUTPUT), { recursive: true })
await writeFile(OUTPUT, file, 'utf8')
console.log(`已写出 ${OUTPUT}`)
