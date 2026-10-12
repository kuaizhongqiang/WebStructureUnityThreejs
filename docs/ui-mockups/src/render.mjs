/**
 * 页面排版稿生成器。
 *
 * 为什么用生成器：29 个页面共享同一套外壳（标题栏/状态条/角落按钮），手写会漂移；
 * 生成产物是**纯静态 HTML**（无 JS 依赖），可以直接 file:// 打开审核。
 *
 * 用法：node docs/ui-mockups/src/render.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pagesAB } from './pages-ab.mjs'
import { pagesC } from './pages-c.mjs'
import { pagesD } from './pages-d.mjs'
import { styleSpecSections, pageIndexGroups } from './style-spec.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pagesDir = resolve(root, 'pages')

const TITLEBAR = (crumb, right) => `
      <header class="ui-titlebar">
        <div class="ui-titlebar__logo">仿</div>
        <div class="ui-titlebar__names">
          <div class="ui-titlebar__cn">虚拟仿真教学平台</div>
          <div class="ui-titlebar__en">Virtual Simulation Teaching Platform</div>
        </div>
        <div class="ui-titlebar__right">
          <span class="ui-titlebar__crumb">${crumb}</span>
          ${right ?? ''}
        </div>
      </header>`

const STATUSBAR = (left, right) => `
      <footer class="ui-statusbar">
        <span>${left}</span>
        <span class="ui-statusbar__right">${right}</span>
      </footer>`

function page(spec) {
  const {
    id,
    title,
    state,
    crumb = '工作区 / 项目',
    right = '<span class="ui-badge ui-badge--info">高清</span><span class="ui-badge">游客</span>',
    body,
    statusbar = '[ 就绪 ] 无后端模式（DEC-21）',
    statusRight = 'v0.1 · 排版稿 · docs/ui-mockups',
    overlay = '',
  } = spec

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${id} ${title} — 页面排版稿</title>
<link rel="stylesheet" href="../style.css">
</head>
<body>
<div class="board-wrap"><div class="board">
${TITLEBAR(crumb, right)}
  <div class="board__body">
${body.trimEnd()}
${overlay.trimEnd()}
  </div>
${STATUSBAR(statusbar, statusRight)}
</div></div>

<div class="board-nav">
  <a href="../index.html">← 样式清单 / 页面索引</a>
  <span>${id} · ${title} · 归属 ${state}</span>
</div>
</body>
</html>
`
}

mkdirSync(pagesDir, { recursive: true })

const allPages = [...pagesAB, ...pagesC, ...pagesD]

for (const spec of allPages) {
  writeFileSync(resolve(pagesDir, spec.file), page(spec), 'utf8')
}

// ---------------------------------------------------------------- 样式清单首页
const specItem = (item) => `
      <div class="spec-item">
        <div class="spec-item__stage">${item.html.trim()}</div>
        <div class="spec-item__meta">
          <div class="spec-item__name">${item.name}</div>
          <div class="spec-item__desc">${item.desc}</div>
          <div class="spec-item__cls">${item.cls}</div>
        </div>
      </div>`

const token = (t) => `
      <div class="spec-token">
        <div class="spec-token__swatch" style="background:${t.value};${t.border ? `border-bottom:1px solid ${t.border};` : ''}"></div>
        <div class="spec-token__label"><b>${t.name}</b>${t.value}</div>
      </div>`

const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>样式清单 — 虚拟仿真教学平台</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="spec-page">
  <div class="spec-head">
    <h1>样式清单（UI 元件规范）</h1>
    <div class="sub">
      对应 <b>docs/PAGE-WORKLIST.md</b> 的页面清单。类名即组件名，可直接复制进 Web 工程复用；
      整套样式只依赖 <b>style.css</b>（改令牌即换肤）。基准画布 1920×1080。
    </div>
  </div>

  <div class="spec-section-title">一、设计令牌 · 颜色</div>
  <div class="spec-tokens">
${[
  ['bg-0 三维视口底', '#0b0f16'],
  ['bg-1 页面底', '#111823'],
  ['bg-2 面板底', '#16202e'],
  ['bg-3 浮起块', '#1d2836'],
  ['line-1 描边', '#243040'],
  ['line-2 强描边', '#33445a'],
  ['text-1 主文字', '#e9eff7'],
  ['text-2 次文字', '#a4b4c8'],
  ['text-3 弱文字', '#6d7f95'],
  ['accent 主色', '#3b82f6'],
  ['accent-2 科技青', '#22d3ee'],
  ['ok 成功', '#22c55e'],
  ['warn 警告', '#f59e0b'],
  ['err 错误', '#ef4444'],
  ['gold 得分', '#fbbf24'],
  ['three 归属标记', '#7ee2a8'],
  ['unity 归属标记', '#b79bff'],
]
  .map(([name, value]) => token({ name, value }))
  .join('')}
  </div>

  <div class="spec-section-title">二、设计令牌 · 字号 / 间距 / 圆角</div>
  <div class="spec-item">
    <div class="spec-item__stage" style="flex-direction:column;align-items:flex-start;gap:10px">
      <div style="font-size:40px">40 大标题</div>
      <div style="font-size:28px">28 页面主标题</div>
      <div style="font-size:22px">22 区块标题</div>
      <div style="font-size:18px">18 面板标题</div>
      <div style="font-size:16px">16 题干</div>
      <div style="font-size:14px">14 正文</div>
      <div style="font-size:13px">13 次要正文</div>
      <div style="font-size:11px;color:var(--text-3)">11 辅助说明</div>
      <div class="ui-row" style="margin-top:6px">
        <span class="ui-badge">间距 4 / 8 / 12 / 16 / 24 / 32</span>
        <span class="ui-badge">圆角 4 / 8 / 12 / 胶囊</span>
        <span class="ui-badge">面板 1920×1080 基准</span>
      </div>
    </div>
    <div class="spec-item__meta">
      <div class="spec-item__name">字号与间距阶梯</div>
      <div class="spec-item__desc">字号 --fs-11 ~ --fs-40；间距 --sp-1 ~ --sp-6；圆角 --r-1 / --r-2 / --r-3 / --r-pill</div>
      <div class="spec-item__cls">:root { --fs-* / --sp-* / --r-* }</div>
    </div>
  </div>

${styleSpecSections
  .map(
    (section) => `
  <div class="spec-section-title">${section.title}</div>
  <div class="spec-grid">
${section.items.map(specItem).join('')}
  </div>`,
  )
  .join('')}

  <div class="spec-section-title">八、页面排版稿索引（共 ${allPages.length} 页，逐页审核用）</div>
${pageIndexGroups
  .map(
    (group) => `
  <div class="ui-h2" style="margin:14px 0 10px">${group.title}</div>
  <div class="spec-pages">
${group.pages
  .map(
    (p) => `    <a class="spec-page-link" href="pages/${p.file}">${p.id} ${p.title}<span>${p.note ?? ''}</span></a>`,
  )
  .join('\n')}
  </div>`,
  )
  .join('')}

  <div class="spec-section-title">九、说明</div>
  <div class="spec-item">
    <div class="spec-item__stage" style="flex-direction:column;align-items:flex-start;gap:8px;font-size:13px;line-height:1.9">
      <div>· 三维区域用<b>网格底纹</b>表示"这里是画布/视口"，不是真实渲染效果。</div>
      <div>· 页面结构来自 <b>docs/PAGE-WORKLIST.md</b>（按两个参考工程实测盘点），不是凭空设计。</div>
      <div>· 技术栈标记（Three.js / Unity）按 <b>DEC-06</b> 标注，是审排版时要一并确认的信息。</div>
      <div>· 令牌集中在 <code>style.css</code> 顶部：要换浅色皮肤只改那一节。</div>
      <div>· 页面是生成物：改 <code>src/pages-*.mjs</code> 后重新执行 <code>node docs/ui-mockups/src/render.mjs</code>。</div>
    </div>
    <div class="spec-item__meta">
      <div class="spec-item__name">审核要点提示</div>
      <div class="spec-item__desc">排版稿仅供确认布局与信息层级，交互逻辑与真实三维效果不在此范围</div>
      <div class="spec-item__cls">docs/ui-mockups/index.html</div>
    </div>
  </div>
</div>
</body>
</html>
`

writeFileSync(resolve(root, 'index.html'), indexHtml, 'utf8')

console.log(`生成完成：${allPages.length} 个页面排版稿 + index.html（样式清单）`)
console.log(`输出目录：${root}`)
