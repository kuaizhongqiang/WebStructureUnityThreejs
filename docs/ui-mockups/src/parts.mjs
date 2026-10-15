/**
 * 可复用的页面片段。
 *
 * 第二轮修订（2026-10-12）：
 *   - tabs()  → route()         站点线导航（"点线连接"概念），替代页签栏
 *   - tips()  → tipsFloat()     浮窗式提示，替代底部固定提示栏
 *   - corners() → topRight()    右上按钮组（含返回），替代角落 fab
 * 第四轮修订（2026-10-15）：C8~C11 也换用 `route()`，`tabs()` 与其 `.ui-tabs` 样式一并删除
 * （原先只有这四页还在用旧页签栏），角落 fab `corners()` 换成与 C6 相同的 `topRight()`。
 * 剩下的旧片段只有 `tips()`（C8~C11 的底部提示栏）与 `corners()`（现只剩 D1 在用）。
 *
 * 图标：一律用 `icons.mjs` 的 icon()（矢量，Lucide，跟随 currentColor），**不要再用 emoji 或 ✓✕← 这类字形**。
 */
 import { icon } from './icons.mjs'

export const TASK_TABS = [
  ['None', '空类型', 'three'],
  ['Purpose', '任务目的', 'three'],
  ['Equipment', '实验仪器', 'three'],
  ['Principle', '实验原理', 'three'],
  ['LineConnection', '电路连接', 'unity'],
  ['Training', '仿真实验', 'unity'],
  ['Test', '小测验', 'three'],
  ['Info', '简介', 'three'],
  ['Structure', '结构', 'unity'],
  ['Inspection', '检测', 'unity'],
  ['Exam', '考核', 'three'],
]

const stackBadge = (stack) =>
  `<span class="ui-route__stack" style="color:var(${stack === 'unity' ? '--unity' : '--three'})">${
    stack === 'unity' ? 'Unity' : 'Three'
  }</span>`

/** 站点线导航：一个 TaskType 一个"站"，站与站之间用连线连接。 */
export function route(active, done = [], options = {}) {
  const { narrow = false, locked = [] } = options
  return `<nav class="ui-route${narrow ? ' ui-route--narrow' : ''}">
${TASK_TABS.map(([key, label, stack], index) => {
  const prev = TASK_TABS[index - 1]
  const seg = index === 0 ? '' : `<span class="ui-route__seg${done.includes(prev[0]) && (done.includes(key) || key === active) ? ' ui-route__seg--done' : ''}"></span>`
  const cls = ['ui-route__stop']
  if (key === active) cls.push('ui-route__stop--current')
  else if (done.includes(key)) cls.push('ui-route__stop--done')
  if (locked.includes(key)) cls.push('ui-route__stop--locked')
  const inner = done.includes(key) && key !== active ? icon('check', 14) : String(index + 1)
  return `${seg}<div class="${cls.join(' ')}">
          <span class="ui-route__dot">${inner}</span>
          <span class="ui-route__label">${label}</span>
          ${stackBadge(stack)}
        </div>`
}).join('\n')}
      </nav>`
}

/** 浮窗式提示：步骤提示 + 操作提示，右下角，可收起为一行。 */
export function tipsFloat(stepText, opText, options = {}) {
  const { mini = false, ghost = false, image = false } = options
  if (mini) {
    return `<div class="ui-tips-float ui-tips-float--mini">
          <span class="ui-tips__tag ui-tips__tag--step">步骤</span>
          <span class="ui-tips__text">${stepText}</span>
          <span class="ui-tips-float__icon">${icon('chevron-up', 14)}</span>
        </div>`
  }
  return `<div class="ui-tips-float${ghost ? ' ui-tips-float--ghost' : ''}">
          <div class="ui-tips-float__head">
            <span>当前步骤提示</span>
            <span class="ui-tips-float__actions"><span class="ui-tips-float__icon">${icon('chevron-down', 14)}</span><span class="ui-tips-float__icon">${icon('x', 14)}</span></span>
          </div>
          <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">${stepText}</span></div>
          <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--op">操作提示</span><span class="ui-tips__text">${opText}</span></div>
          ${image ? '<div class="ui-tips__img" style="width:100%;height:88px"></div>' : ''}
        </div>`
}

/** 右上按钮组：返回固定在第一个。 */
export function topRight(extra = '') {
  return `<div class="ui-topright">
          <button class="ui-iconbtn ui-iconbtn--back">${icon('arrow-left', 14)} 返回目录</button>
          <button class="ui-iconbtn ui-iconbtn--icon" title="全屏">${icon('maximize', 14)}</button>
          <button class="ui-iconbtn ui-iconbtn--icon" title="画质">${icon('sliders-horizontal', 14)}</button>
          <button class="ui-iconbtn ui-iconbtn--icon" title="帮助">${icon('circle-help', 14)}</button>
          ${extra}
        </div>`
}

/**
 * 三维视口。**两种形态都只留画布**。
 *
 * · 不传 `liveSrc`：**占位**（毛玻璃底 + 居中说明），框由 `.ui-viewport` 自己给。
 * · 传 `liveSrc`：里面装一个 **iframe 指向 `docs/model-preview/index.html?embed=1&model=…`**，
 *   于是这里显示的是**真实渲染**（同一套环境 / 贴图后加载 / 材质解算），而不是占位块。
 *   此时**不要底与描边**：框由外层 `.ui-panel` 给（见 `pages-c.mjs`），
 *   这里再画一层就是两层半透明叠加，会比旁边的框明显深。
 *
 * ⚠️ 左上技术栈标（`.ui-viewport__hint`）与右上工具组（`.ui-viewport__tools`）这两块**占位叠层**
 * 已于 2026-10-15 **整体退役**（T-13：各页一律按 C10「结构」的样式来 —— 画布上不摆壳层装饰，
 * 这些操作将来由 Unity / Three 侧自己出）。两个组件只在**样式成果页**留档，页面不再使用
 * （同 `.ui-selectbox`：成果页有展示、页面暂时不用）。`label` 于是改由居中说明承担。
 */
export function viewport(stack, label, liveSrc = null) {
  if (liveSrc) {
    return `<div class="ui-viewport" style="position:absolute;inset:0;background:none;border:0">
         <iframe class="ui-viewport__live" src="${liveSrc}" title="${stack} 实时渲染（模型检视页 · 嵌入模式）" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
       </div>`
  }
  return `<div class="ui-viewport" style="position:absolute;inset:0">
         <div class="ui-viewport__center">三维画布区域 —— 由 ${stack} 承载（${label}），本稿只表示占位画布的位置</div>
       </div>`
}

/* -------------------------------------- 以下为旧组件：`tips()` 仍被 C8~C11 使用、`corners()` 只剩 D1 */

export function tips(stepText, opText, withImage = true) {
  return `<div class="ui-tips">
        <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">${stepText}</span></div>
        <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--op">操作提示</span><span class="ui-tips__text">${opText}</span>${withImage ? '<span class="ui-tips__img"></span>' : ''}</div>
      </div>`
}

export function corners() {
  return `<div class="ui-corner ui-corner--rt">
        <div class="ui-fab"><span class="ui-fab__icon">${icon('menu', 18)}</span>目录</div>
        <div class="ui-fab"><span class="ui-fab__icon">${icon('maximize', 18)}</span>全屏</div>
        <div class="ui-fab"><span class="ui-fab__icon">${icon('sliders-horizontal', 18)}</span>画质</div>
      </div>
      <div class="ui-corner ui-corner--lb">
        <div class="ui-fab"><span class="ui-fab__icon">${icon('arrow-left', 18)}</span>菜单</div>
      </div>`
}

export function company(text = '示范教育科技有限公司') {
  return `<div class="ui-company"><span class="ui-company__logo">示</span>${text}</div>`
}
