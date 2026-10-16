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
import { styleSpecSections, styleSpecSectionsRound2, styleSpecSectionsRound3, pageIndexGroups } from './style-spec.mjs'
import { styleSpecSectionsRound4 } from './spec-ring.mjs'
import { icon, ICON_VERSION } from './icons.mjs'

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
    // 输入模态：鼠标不画焦点环，键盘导航才画（规则见 docs/design/07-frame-style-rules.md §5）。
    var set = function (m) { document.documentElement.setAttribute('data-input-modality', m); };
    set('pointer');
    addEventListener('pointerdown', function () { set('pointer'); }, true);
    addEventListener('keydown', function (e) {
      if (e.key === 'Tab' || e.key.indexOf('Arrow') === 0) set('keyboard');
    }, true);
  })();
</script>`

const THEME_SWITCH = `<span class="theme-switch"><a href="?theme=dark">深色</a><a href="?theme=light">亮色</a></span>`

/** 成果页"图标"一节：本项目实际用到的图标 + 用途（改 icons 后这里也要跟着补）。 */
const ICON_USAGE = [
  ['menu', '目录 / 菜单抽屉'],
  ['arrow-left', '返回目录'],
  ['x', '关闭 / 收起浮窗'],
  ['maximize', '全屏'],
  ['sliders-horizontal', '画质设置'],
  ['circle-help', '帮助'],
  ['check', '已完成 / 选中 / 步骤完成'],
  ['lock', '禁用按钮（虚线框左侧）'],
  ['info', '信息提示'],
  ['triangle-alert', '警告提示'],
  ['chevron-down', '展开 / 下拉箭头'],
  ['chevron-up', '收起 / 展开功能条'],
  ['rotate-cw', '复位视角'],
  ['expand', '自适应画面'],
  ['crosshair', '定位 / 对焦'],
  ['play', '播放'],
  ['volume-2', '音量'],
  ['gauge', '数字万用表'],
  ['plug-zap', '直流稳压电源'],
  ['thermometer', '温度传感器'],
  ['flame', '加热台'],
  ['cable', '连接线'],
  ['signal-low', '画质 · 标清'],
  ['signal-high', '画质 · 高清'],
  ['gem', '画质 · 超清'],
  ['square', '答题 · 未选'],
  ['square-check', '答题 · 已选'],
]

const TITLEBAR = (crumb, right) => `
      <header class="ui-titlebar ui-titlebar--float">
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

/** 生成器负责产出的页面。 */
const generatedPages = [...pagesAB, ...pagesC, ...pagesD]

/**
 * E 组 · A5 菜单页**历史留档**（Issue #73 / T1，2026-10-16）—— **手写页，不在此生成**。
 *
 * 为什么不放进本生成器：这几页是 A5 的**手写重做页**（A5-R2「必须手写」），
 * 各有自己的机制脚本，不共享 `page()` 那套骨架模板；`pageIndexGroups` 里注册它们只是**编索引**。
 * 这里单列一份，是为了让"页面总数"这个口径包含它们（否则成果页会写少 5 页）。
 * 现状（DEC-163 / DEC-165 的 D20）：A5 只保留**唯一候选 = 水平环形伪三维卡片**
 * （a5-menu-ring / -narrow / -reduced-motion，由另一工作项单独登记）；
 * ② 节点散射 / ③ 六边形蜂窝 / ⑦ 档案抽屉 / ⑧ 探照灯取景器**全部废案**，
 * 四个废案页**保留在盘、不删除**、只作反面参照；V1 是唯一候选的**前身**，
 * 机制已由"水平轴排开"更正为"水平圆周排开" ⇒ 它的实现作废，与 ②③⑦⑧ 不混为一谈。
 * 复核依据：`docs/design/14-a5-menu-ring-contract.md` §3.1 FRZ-10 / §13.1；`docs/DECISIONS.md` §33。
 */
const handWrittenPages = [
  { id: 'V1', file: 'a5-menu-v1-pseudo3d.html' },
  { id: 'V2', file: 'a5-menu-v2-scatter.html' },
  { id: 'V3', file: 'a5-menu-v3-hex.html' },
  { id: 'V4', file: 'a5-menu-v4-drawer.html' },
  { id: 'V5', file: 'a5-menu-v5-spotlight.html' },
]

const allPages = [...generatedPages, ...handWrittenPages]

for (const spec of generatedPages) {
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
  ['描边 l1 α黑 5%', 'rgba(23,43,77,.05)'],
  ['描边 l2 α黑 10%', 'rgba(23,43,77,.10)'],
  ['描边 l3 α黑 14%', 'rgba(23,43,77,.14)'],
  ['描边 l4 α黑 20%（控件框线）', 'rgba(23,43,77,.20)'],
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
  ['深色 --glass-inset（内嵌块）', 'rgba(10,16,24,.50)'],
  ['亮色 --glass-bar', 'rgba(255,255,255,.52)'],
  ['亮色 --glass-panel', 'rgba(255,255,255,.44)'],
  ['亮色 --glass-card', 'rgba(255,255,255,.52)'],
  ['亮色 --glass-strong（浮层）', 'rgba(255,255,255,.74)'],
  ['亮色 --glass-input', 'rgba(255,255,255,.62)'],
  ['亮色 --glass-inset', 'rgba(255,255,255,.40)'],
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
      <div class="ui-h1">84 欢迎页主标题（带投影）</div>
      <div style="font-size:40px">40 大标题</div>
      <div style="font-size:28px">28 页面主标题</div>
      <div style="font-size:22px">22 区块标题</div>
      <div style="font-size:18px">18 面板标题</div>
      <div style="font-size:16px">16 题干 / 正文</div>
      <div style="font-size:14px">14 正文</div>
      <div style="font-size:13px">13 次要正文</div>
      <div style="font-size:11px;color:var(--text-3)">11 辅助说明</div>
      <div class="ui-row" style="margin-top:6px">
        <span class="ui-badge">间距 4 / 8 / 12 / 16 / 24 / 32 / 40</span>
        <span class="ui-badge">圆角 4 / 8 / 12 / 16 / 20 / 28</span>
        <span class="ui-badge">面板 1920×1080 基准</span>
      </div>
    </div>
    <div class="spec-item__meta">
      <div class="spec-item__name">字号与间距阶梯</div>
      <div class="spec-item__desc">字号 --fs-11 ~ --fs-84（84 = 欢迎页主标题，带 <code>--h1-shadow</code> 投影）；间距 --sp-1 ~ --sp-7；圆角 --radius-xs ~ --radius-panel（详见第九节）</div>
      <div class="spec-item__cls">:root { --fs-* / --sp-* / --radius-* }</div>
    </div>
  </div>

${[...styleSpecSections, ...styleSpecSectionsRound2, ...styleSpecSectionsRound3, ...styleSpecSectionsRound4]
  .map(
    (section) => `
  <div class="spec-section-title">${section.title}</div>
  <div class="spec-grid">
${section.items.map(specItem).join('')}
  </div>`,
  )
  .join('')}

  <div class="spec-section-title">九、框体令牌（2026-10-12 统一升级）</div>
  <div class="ui-small ui-muted" style="margin-bottom:10px">
    规则权威：<code>docs/design/07-frame-style-rules.md</code>（本节是它的展示）。
    五条要点：中性描边一律 0.5px 发丝、圆角只有 6 级且按角色选档、浮层 <code>border:0</code> + <code>--elev-*</code> 阴影（阴影第一层就是那道发丝）、
    hover/按压/选中只叠一层半透明、键盘焦点环 2px 且鼠标点不出环。
  </div>
  <div class="spec-grid">
    <div class="spec-item">
      <div class="spec-item__stage" style="gap:14px;align-items:flex-end">
        <div style="text-align:center"><div style="width:52px;height:52px;background:var(--accent-weak);border:0.5px solid var(--accent);border-radius:var(--radius-xs)"></div><div class="spec-item__cls">xs 4</div><div class="ui-small ui-muted">字母标</div></div>
        <div style="text-align:center"><div style="width:52px;height:52px;background:var(--accent-weak);border:0.5px solid var(--accent);border-radius:var(--radius-sm)"></div><div class="spec-item__cls">sm 8</div><div class="ui-small ui-muted">缩略图</div></div>
        <div style="text-align:center"><div style="width:52px;height:52px;background:var(--accent-weak);border:0.5px solid var(--accent);border-radius:var(--radius-md)"></div><div class="spec-item__cls">md 12</div><div class="ui-small ui-muted">控件</div></div>
        <div style="text-align:center"><div style="width:52px;height:52px;background:var(--accent-weak);border:0.5px solid var(--accent);border-radius:var(--radius-lg)"></div><div class="spec-item__cls">lg 16</div><div class="ui-small ui-muted">大控件</div></div>
        <div style="text-align:center"><div style="width:52px;height:52px;background:var(--accent-weak);border:0.5px solid var(--accent);border-radius:var(--radius-xl)"></div><div class="spec-item__cls">xl 20</div><div class="ui-small ui-muted">内容卡</div></div>
        <div style="text-align:center"><div style="width:52px;height:52px;background:var(--accent-weak);border:0.5px solid var(--accent);border-radius:var(--radius-panel)"></div><div class="spec-item__cls">panel 28</div><div class="ui-small ui-muted">主面板/对话框</div></div>
      </div>
      <div class="spec-item__meta">
        <div class="spec-item__name">圆角刻度：只允许这 6 个值</div>
        <div class="spec-item__desc">按<b>角色</b>选档，不按尺寸：控件 12 / 内容卡 20 / 主面板与对话框 28。禁止 10、14、18、24 这类游离字面值；药丸与正圆保持 999px / 50%。</div>
        <div class="spec-item__cls">--radius-xs | sm | md | lg | xl | panel</div>
      </div>
    </div>

    <div class="spec-item">
      <div class="spec-item__stage" style="flex-direction:column;align-items:stretch;gap:10px">
        <div style="height:32px;display:flex;align-items:center;justify-content:center;border:0.5px solid var(--border-2);border-radius:var(--radius-md)" class="ui-small">l2 · 0.5px 分隔线</div>
        <div style="height:32px;display:flex;align-items:center;justify-content:center;border:0.5px solid var(--border-3);border-radius:var(--radius-md)" class="ui-small">l3 · 0.5px 面板框</div>
        <div style="height:32px;display:flex;align-items:center;justify-content:center;border:0.5px solid var(--border-4);border-radius:var(--radius-md)" class="ui-small">l4 · 0.5px 控件框</div>
        <div style="height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-4);border-radius:var(--radius-md);opacity:.75" class="ui-small">对照：l4 若用 1px（偏粗，已全站弃用）</div>
      </div>
      <div class="spec-item__meta">
        <div class="spec-item__name">描边阶梯：α 值 + 0.5px 发丝</div>
        <div class="spec-item__desc">深色用 α 白、亮色用 α 黑，所以<b>同一句 border 在两套主题都成立</b>，不必为主题各写一条。1px 只留给虚线提示与语义状态色描边。</div>
        <div class="spec-item__cls">border: 0.5px solid var(--border-1|2|3|4)</div>
      </div>
    </div>

    <div class="spec-item">
      <div class="spec-item__stage" style="background:var(--bg-1);border-radius:var(--radius-xl);gap:16px;padding:26px">
        <div style="width:88px;height:56px;border-radius:var(--radius-xl);background:var(--glass-strong);box-shadow:var(--elev-panel);display:flex;align-items:center;justify-content:center" class="ui-small">panel</div>
        <div style="width:88px;height:56px;border-radius:var(--radius-xl);background:var(--glass-strong);box-shadow:var(--elev-prominent);display:flex;align-items:center;justify-content:center" class="ui-small">prominent</div>
        <div style="width:88px;height:56px;border-radius:var(--radius-xl);background:var(--glass-strong);box-shadow:var(--elev-soft);display:flex;align-items:center;justify-content:center" class="ui-small">soft</div>
      </div>
      <div class="spec-item__meta">
        <div class="spec-item__name">浮起材质：border:0 + elevation 阴影</div>
        <div class="spec-item__desc">弹窗 / 浮窗 / 提示条 / toast / 悬浮工具条都用这一套：<b>不再画中性 border</b> —— 边由阴影第一层 <code>0 0 0 0.5px</code> 承担；颜色可用 <code>--elev-stroke-color</code> 重绑或关掉。</div>
        <div class="spec-item__cls">box-shadow: var(--elev-panel | prominent | soft)</div>
      </div>
    </div>

    <div class="spec-item">
      <div class="spec-item__stage" style="gap:12px">
        <div style="text-align:center"><div style="width:96px;height:56px;border-radius:var(--radius-md);background:var(--glass-card);border:0.5px solid var(--line-1);display:flex;align-items:center;justify-content:center;position:relative" class="ui-small"><span style="position:absolute;inset:0;border-radius:inherit;background:var(--inter-hover)"></span>hover</div><div class="spec-item__cls">--inter-hover</div></div>
        <div style="text-align:center"><div style="width:96px;height:56px;border-radius:var(--radius-md);background:var(--glass-card);border:0.5px solid var(--line-1);display:flex;align-items:center;justify-content:center;position:relative" class="ui-small"><span style="position:absolute;inset:0;border-radius:inherit;background:var(--inter-active)"></span>按压</div><div class="spec-item__cls">--inter-active</div></div>
        <div style="text-align:center"><div style="width:96px;height:56px;border-radius:var(--radius-md);background:var(--glass-card);border:0.5px solid var(--line-1);display:flex;align-items:center;justify-content:center;position:relative" class="ui-small"><span style="position:absolute;inset:0;border-radius:inherit;background:var(--inter-hover-accent)"></span>强调</div><div class="spec-item__cls">--inter-hover-accent</div></div>
        <div style="text-align:center"><div style="width:96px;height:56px;border-radius:var(--radius-md);background:var(--glass-card);border:0.5px solid var(--line-1);display:flex;align-items:center;justify-content:center;position:relative" class="ui-small"><span style="position:absolute;inset:0;border-radius:inherit;background:var(--inter-hover-danger)"></span>危险</div><div class="spec-item__cls">--inter-hover-danger</div></div>
      </div>
      <div class="spec-item__meta">
        <div class="spec-item__name">交互态：只叠一层半透明，不换色</div>
        <div class="spec-item__desc">hover / 按压 / 选中都在原底上叠一层 α；<b>不改圆角、不改尺寸、不改文字色</b>。这样同一个组件在任何底色（玻璃、实底、图片上）都成立。</div>
        <div class="spec-item__cls">--inter-hover | active | hover-accent | hover-danger</div>
      </div>
    </div>

    <div class="spec-item">
      <div class="spec-item__stage" style="gap:18px">
        <button class="ui-btn is-focus-ring">键盘焦点（定格演示）</button>
        <button class="ui-btn ui-btn--primary is-focus-ring">主按钮</button>
      </div>
      <div class="spec-item__meta">
        <div class="spec-item__name">键盘焦点环（产品里是 :focus-visible）</div>
        <div class="spec-item__desc">2px 环 + 2px 偏移，颜色取主色。<b>鼠标点击不出环，键盘 Tab / 方向键才出</b>（外壳脚本按输入模态切换 <code>data-input-modality</code>）；输入框不画环而是描边变主色。</div>
        <div class="spec-item__cls">--ring-width / --ring-offset / --ring-color</div>
      </div>
    </div>
  </div>

  <div class="spec-section-title">十、页面排版稿索引（共 ${allPages.length} 页，逐页审核用）</div>
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

  <div class="spec-section-title">十一、图标（Lucide 矢量，ISC 许可可商用）</div>
  <div class="ui-small ui-muted" style="margin-bottom:10px">
    <b>不许用 emoji</b>：emoji 是字体渲染的彩色位图，跨系统长得不一样，而且<b>不跟随 currentColor</b>（亮/暗两套主题下颜色不受控）。
    图标一律用 <code>src/icons.mjs</code> 的 <code>icon(name, size)</code>，渲染成 <code>stroke: currentColor</code> 的 SVG，因此永远等于文字色。
    数据由 <code>src/fetch-icons.mjs</code> 从 <code>lucide-static@${ICON_VERSION}</code> 内联生成（零外部请求、可离线打开）；许可原文 <code>assets/icons/LICENSE-lucide.txt</code>。
    新增图标：把名字加进 <code>fetch-icons.mjs</code> 的 ICONS 数组，再执行 <code>node src/fetch-icons.mjs</code>。
  </div>
  <div class="spec-grid">
${ICON_USAGE.map(
  ([name, usage]) => `    <div class="spec-item">
      <div class="spec-item__stage" style="min-height:52px">${icon(name, 24)}</div>
      <div class="spec-item__meta">
        <div class="spec-item__name">${name}</div>
        <div class="spec-item__desc">${usage}</div>
        <div class="spec-item__cls">icon('${name}', 24)</div>
      </div>
    </div>`,
).join('\n')}
  </div>

  <div class="spec-section-title">十二、说明</div>
  <div class="spec-item">
    <div class="spec-item__stage" style="flex-direction:column;align-items:flex-start;gap:8px;font-size:13px;line-height:1.9">
      <div>· 三维区域用<b>网格底纹</b>表示"这里是画布/视口"，不是真实渲染效果。</div>
      <div>· 页面结构来自 <b>docs/PAGE-WORKLIST.md</b>（按既有同类软件实测盘点），不是凭空设计。</div>
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
