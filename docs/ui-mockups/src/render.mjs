/**
 * 页面排版稿生成器。
 *
 * 为什么用生成器：29 个页面共享同一套外壳（标题栏/状态条/站点线/浮窗），手写会漂移；
 * 生成产物是**纯静态 HTML**（只用内联普通 script，不用 ES module），可以直接 file:// 打开审核。
 *
 * 用法：node docs/ui-mockups/src/render.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pagesAB } from './pages-ab.mjs'
import { pagesC } from './pages-c.mjs'
import { pagesD } from './pages-d.mjs'
import { styleSpecSections, styleSpecSectionsRound2, pageIndexGroups } from './style-spec.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pagesDir = resolve(root, 'pages')

/**
 * 主题切换（仅排版稿外壳用，不属于产品界面）。
 * 用普通内联 script：file:// 下 ES module 会被 CORS 拦，普通 script 不受影响。
 * 优先读 URL 上的 ?theme=light|dark，其次读 localStorage。
 */
const THEME_SCRIPT = `<script>
  (function () {
    try {
      var m = location.search.match(/theme=(light|dark)/);
      var t = m ? m[1] : localStorage.getItem('wsu3.theme');
      if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    } catch (e) { /* file:// 下取不到也没关系 */ }
  })();
</script>`

const THEME_SWITCH = `<span class="theme-switch"><a href="?theme=dark">深色</a><a href="?theme=light">亮色</a></span>`

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
    statusRight = 'v0.2 · 排版稿 · docs/ui-mockups',
    overlay = '',
  } = spec

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${id} ${title} — 页面排版稿</title>
<link rel="stylesheet" href="../style.css">
${THEME_SCRIPT}
</head>
<body>
<div class="board-wrap"><div class="board">
  <div class="board__bg"></div>
${TITLEBAR(crumb, right)}
  <div class="board__body">
${body.trimEnd()}
${overlay.trimEnd()}
  </div>
${statusbar === false ? '' : STATUSBAR(statusbar, statusRight)}
</div></div>

<div class="board-nav">
  <a href="../index.html">← 样式清单 / 页面索引</a>
  <span>${id} · ${title} · 归属 ${state}</span>
  ${THEME_SWITCH}
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

const DARK_TOKENS = [
  ['背景 bg-0（三维视口底）', '#0b0f16'],
  ['背景 bg-1（页面底）', '#111823'],
  ['背景 bg-2（面板底）', '#16202e'],
  ['背景 bg-3（浮起块）', '#1d2836'],
  ['描边 line-1', '#243040'],
  ['描边 line-2', '#33445a'],
  ['文字 text-1 主', '#e9eff7'],
  ['文字 text-2 次', '#a4b4c8'],
  ['文字 text-3 弱', '#6d7f95'],
  ['主色 accent', '#3b82f6'],
  ['科技青 accent-2', '#22d3ee'],
  ['成功 ok', '#22c55e'],
  ['警告 warn', '#f59e0b'],
  ['错误 err', '#ef4444'],
  ['得分 gold', '#fbbf24'],
  ['Three 标记', '#7ee2a8'],
  ['Unity 标记', '#b79bff'],
]

const LIGHT_TOKENS = [
  ['背景 bg-0', '#cfd8e3'],
  ['背景 bg-1', '#eef2f7'],
  ['背景 bg-2', '#f8fafc'],
  ['背景 bg-3', '#ffffff'],
  ['描边 line-1', '#d8e0ea'],
  ['描边 line-2', '#bcc8d8'],
  ['文字 text-1 主', '#16212e'],
  ['文字 text-2 次', '#3f4e60'],
  ['文字 text-3 弱', '#5c6b7d'],
  ['主色 accent', '#1f6feb'],
  ['科技青 accent-2', '#0e8fa8'],
  ['成功 ok', '#15803d'],
  ['警告 warn', '#b45309'],
  ['错误 err', '#b91c1c'],
  ['得分 gold', '#a16207'],
  ['Three 标记', '#15803d'],
  ['Unity 标记', '#6d28d9'],
]

const GLASS_TOKENS = [
  ['深色 --glass-bar（标题栏/状态条）', 'rgba(19,27,39,.60)'],
  ['深色 --glass-panel（面板）', 'rgba(22,32,46,.55)'],
  ['深色 --glass-card（卡片/条目）', 'rgba(29,40,54,.48)'],
  ['深色 --glass-strong（浮层）', 'rgba(20,29,41,.78)'],
  ['深色 --glass-input（控件）', 'rgba(12,18,26,.62)'],
  ['深色 --glass-border（高光描边）', 'rgba(255,255,255,.10)'],
  ['亮色 --glass-bar', 'rgba(255,255,255,.66)'],
  ['亮色 --glass-panel', 'rgba(255,255,255,.62)'],
  ['亮色 --glass-card', 'rgba(255,255,255,.74)'],
  ['亮色 --glass-strong', 'rgba(255,255,255,.90)'],
  ['亮色 --glass-input', 'rgba(255,255,255,.80)'],
  ['亮色 --glass-border', 'rgba(255,255,255,.85)'],
]

const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>样式清单 — 虚拟仿真教学平台</title>
<link rel="stylesheet" href="style.css">
${THEME_SCRIPT}
</head>
<body>
<div class="spec-page">
  <div class="spec-head">
    <h1>样式清单（UI 元件规范）</h1>
    <div class="sub">
      对应 <b>docs/PAGE-WORKLIST.md</b> 的页面清单。类名即组件名，可直接复制进 Web 工程复用；
      整套样式只依赖 <b>style.css</b>（改令牌即换肤）。基准画布 1920×1080。
      <br>bar 与 panel 的底统一为<b>带色毛玻璃</b>（第 17 节）；<b>亮色方案</b>见第 18 节与右上角的"深色 / 亮色"切换。
    </div>
    <div style="margin-top:12px;display:flex;gap:10px;align-items:center">
      ${THEME_SWITCH}
      <span class="ui-small ui-muted">切主题只改 &lt;html data-theme&gt;，组件结构不变</span>
    </div>
  </div>

  <div class="spec-section-title">一、设计令牌 · 颜色（深色）</div>
  <div class="spec-tokens">
${DARK_TOKENS.map(([name, value]) => token({ name, value })).join('')}
  </div>

  <div class="spec-section-title">二、设计令牌 · 颜色（亮色方案）</div>
  <div class="spec-tokens">
${LIGHT_TOKENS.map(([name, value]) => token({ name, value })).join('')}
  </div>
  <div class="ui-small ui-muted" style="margin-top:8px">亮色下同时把 --board-veil 设为 rgba(238,242,247,.55)，给深色背景图覆一层浅色雾，避免"暗底 + 亮玻璃"发脏。</div>

  <div class="spec-section-title">三、毛玻璃令牌（bar / panel 统一底）</div>
  <div class="spec-tokens">
${GLASS_TOKENS.map(([name, value]) => token({ name, value })).join('')}
  </div>
  <div class="ui-small ui-muted" style="margin-top:8px">
    统一用法：<code>background: var(--glass-*); -webkit-backdrop-filter: blur(16px) saturate(145%); backdrop-filter: …</code>
    —— 模糊强度 <code>--glass-blur</code>、饱和度 <code>--glass-sat</code> 可整体调。
  </div>

  <div class="spec-section-title">四、设计令牌 · 字号 / 间距 / 圆角</div>
  <div class="spec-item">
    <div class="spec-item__stage" style="flex-direction:column;align-items:flex-start;gap:10px">
      <div style="font-size:40px">40 大标题</div>
      <div style="font-size:28px">28 页面主标题</div>
      <div style="font-size:22px">22 区块标题</div>
      <div style="font-size:18px">18 面板标题</div>
      <div style="font-size:16px">16 题干 / 正文</div>
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

${[...styleSpecSections, ...styleSpecSectionsRound2]
  .map(
    (section) => `
  <div class="spec-section-title">${section.title}</div>
  <div class="spec-grid">
${section.items.map(specItem).join('')}
  </div>`,
  )
  .join('')}

  <div class="spec-section-title">九、页面排版稿索引（共 ${allPages.length} 页，逐页审核用）</div>
  <div class="ui-small ui-muted" style="margin-bottom:8px">每页右上角都可切"深色 / 亮色"（<code>?theme=light</code>），同一套页面两种皮肤对照看。</div>
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

  <div class="spec-section-title">十、说明</div>
  <div class="spec-item">
    <div class="spec-item__stage" style="flex-direction:column;align-items:flex-start;gap:8px;font-size:13px;line-height:1.9">
      <div>· 三维区域用<b>网格底纹</b>表示"这里是画布/视口"，不是真实渲染效果。</div>
      <div>· 页面结构来自 <b>docs/PAGE-WORKLIST.md</b>（按两个参考工程实测盘点），不是凭空设计。</div>
      <div>· 技术栈标记（Three.js / Unity）按 <b>DEC-06</b> 标注。</div>
      <div>· bar 与 panel 的底统一为<b>带色毛玻璃</b>；毛玻璃效果需要 .board__bg 的真实背景图才看得出来。</div>
      <div>· 背景图：<code>assets/bg-room-dark.jpg</code>（原图 RGB×0.5 烘焙，3840×2160/63MB → 1920×1080/123KB）。</div>
      <div>· 亮色方案在 <code>style.css</code> 第 18 节；深色令牌在第 1 节、毛玻璃令牌在第 3 节上方。</div>
      <div>· 未完成的（菜单手写版、题目样式、考核样式、Unity 侧 UI）见 <code>TODO.md</code>。</div>
      <div>· 页面是生成物：改 <code>src/pages-*.mjs</code> 后重新执行 <code>node docs/ui-mockups/src/render.mjs</code>。</div>
    </div>
    <div class="spec-item__meta">
      <div class="spec-item__name">审核要点提示</div>
      <div class="spec-item__desc">排版稿仅供确认布局、信息层级与配色；交互逻辑与真实三维效果不在此范围</div>
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
console.log('主题：深色为默认；页面右上角或 URL 加 ?theme=light 看亮色方案。')
