#!/usr/bin/env node
/**
 * 应用图标生成：矢量源 → ico（+ 一张大尺寸 png 供预览用）。
 *
 * 为什么在这里（`web/tools/`）而不是 `tools/pipeline/`：
 *   本脚本用 **Playwright 的 Chromium** 做光栅化（矢量 → 位图），而 playwright 是 web 的 devDependency
 *   （仓库根没有 node_modules）；放在这里可以直接 `import 'playwright'`，不必新引第三个依赖。
 *
 * 为什么走 Chromium 而不是装一套 svg→png 工具链：
 *   依赖少、结果与浏览器一致（图标本来就是在浏览器生态里看的），且冒烟已经在用同一套 Chromium。
 *
 * 用法：node web/tools/make-app-icon.mjs
 *   —— 读 `electron/assets/app-icon.svg`，写：
 *        `electron/assets/app-icon.ico`        多尺寸 ICO（16/24/32/48/64/128/256，PNG 负载）
 *        `electron/assets/app-icon-512.png`    512 预览图（不进打包，只为肉眼核对）
 *   **产物是生成物，不要手改**；改图标请改 SVG 再重跑本脚本。
 */
import { readFile, writeFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const svgPath = join(repoRoot, 'electron', 'assets', 'app-icon.svg')
const icoPath = join(repoRoot, 'electron', 'assets', 'app-icon.ico')
const pngPath = join(repoRoot, 'electron', 'assets', 'app-icon-512.png')

/** ICO 里放哪些尺寸。Windows 会按显示场景自己挑（任务栏 32、桌面大图标 256…）。 */
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

/** 把 SVG 渲染成指定边长的 PNG（透明底）。 */
async function renderPng(page, svg, size) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8">
     <style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}
            svg{display:block;width:${size}px;height:${size}px}</style>
     </head><body>${svg}</body></html>`,
    { waitUntil: 'load' },
  )
  return page.screenshot({ omitBackground: true, animations: 'disabled' })
}

/**
 * 打包 ICO（Vista 起支持 PNG 负载，Windows 10/11 都认）。
 * 结构：ICONDIR(6) + N × ICONDIRENTRY(16) + N 段 PNG 数据，偏移从文件头算。
 */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = icon
  header.writeUInt16LE(images.length, 4)

  const directory = Buffer.alloc(16 * images.length)
  let offset = header.length + directory.length
  images.forEach((image, index) => {
    const entry = index * 16
    // 256 在 ICO 里用 0 表示（一个字节存不下）
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entry + 0)
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, entry + 1)
    directory.writeUInt8(0, entry + 2) // 调色板数（真彩不用）
    directory.writeUInt8(0, entry + 3) // reserved
    directory.writeUInt16LE(1, entry + 4) // color planes
    directory.writeUInt16LE(32, entry + 6) // bits per pixel
    directory.writeUInt32LE(image.data.length, entry + 8)
    directory.writeUInt32LE(offset, entry + 12)
    offset += image.data.length
  })

  return Buffer.concat([header, directory, ...images.map((image) => image.data)])
}

const svg = await readFile(svgPath, 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()

try {
  const images = []
  for (const size of ICO_SIZES) {
    images.push({ size, data: await renderPng(page, svg, size) })
  }
  const preview = await renderPng(page, svg, 512)

  await writeFile(icoPath, buildIco(images))
  await writeFile(pngPath, preview)

  const icoBytes = (await stat(icoPath)).size
  console.log(
    `图标已生成：${ICO_SIZES.join('/')} → electron/assets/app-icon.ico（${icoBytes} 字节）+ app-icon-512.png`,
  )
} finally {
  await browser.close()
}
