/**
 * 可复用的页面片段。
 *
 * 第二轮修订（2026-10-12）：
 *   - tabs()  → route()         站点线导航（"点线连接"概念），替代页签栏
 *   - tips()  → tipsFloat()     浮窗式提示，替代底部固定提示栏
 *   - corners() → topRight()    右上按钮组（含返回），替代角落 fab
 * 旧函数保留，仅供尚未重做的页面（C8~C11 Unity 侧）使用。
 */

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
  const inner = done.includes(key) && key !== active ? '✓' : String(index + 1)
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
          <span class="ui-tips-float__icon">▴</span>
        </div>`
  }
  return `<div class="ui-tips-float${ghost ? ' ui-tips-float--ghost' : ''}">
          <div class="ui-tips-float__head">
            <span>当前步骤提示</span>
            <span class="ui-tips-float__actions"><span class="ui-tips-float__icon">▾</span><span class="ui-tips-float__icon">✕</span></span>
          </div>
          <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">${stepText}</span></div>
          <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--op">操作提示</span><span class="ui-tips__text">${opText}</span></div>
          ${image ? '<div class="ui-tips__img" style="width:100%;height:88px"></div>' : ''}
        </div>`
}

/** 右上按钮组：返回固定在第一个。 */
export function topRight(extra = '') {
  return `<div class="ui-topright">
          <button class="ui-iconbtn ui-iconbtn--back">← 返回目录</button>
          <button class="ui-iconbtn ui-iconbtn--icon" title="全屏">⛶</button>
          <button class="ui-iconbtn ui-iconbtn--icon" title="画质">◐</button>
          <button class="ui-iconbtn ui-iconbtn--icon" title="帮助">?</button>
          ${extra}
        </div>`
}

/** 三维视口占位（网格底纹表示画布）。 */
export function viewport(stack, label) {
  return `<div class="ui-viewport" style="position:absolute;inset:0">
          <div class="ui-viewport__hint">${stack} · ${label}</div>
          <div class="ui-viewport__tools">
            <div class="ui-viewport__tool">⟳</div>
            <div class="ui-viewport__tool">⤢</div>
            <div class="ui-viewport__tool">⛶</div>
            <div class="ui-viewport__tool">⌖</div>
          </div>
          <div class="ui-viewport__center">三维画布区域 —— 由 ${stack} 承载，本稿只表示占位与叠层 UI 的位置</div>
        </div>`
}

/* ------------------------------------------------- 以下为旧组件（仅 C8~C11 使用） */

export function tabs(active, done = []) {
  return `<nav class="ui-tabs">
${TASK_TABS.map(([key, label, stack]) => {
  const cls = ['ui-tab']
  if (key === active) cls.push('ui-tab--active')
  if (done.includes(key)) cls.push('ui-tab--done')
  return `        <div class="${cls.join(' ')}">${label}<span class="ui-tab__stack ui-tab__stack--${stack}">${stack === 'unity' ? 'Unity' : 'Three'}</span></div>`
}).join('\n')}
      </nav>`
}

export function tips(stepText, opText, withImage = true) {
  return `<div class="ui-tips">
        <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">${stepText}</span></div>
        <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--op">操作提示</span><span class="ui-tips__text">${opText}</span>${withImage ? '<span class="ui-tips__img"></span>' : ''}</div>
      </div>`
}

export function corners() {
  return `<div class="ui-corner ui-corner--rt">
        <div class="ui-fab"><span class="ui-fab__icon">☰</span>目录</div>
        <div class="ui-fab"><span class="ui-fab__icon">⛶</span>全屏</div>
        <div class="ui-fab"><span class="ui-fab__icon">◐</span>画质</div>
      </div>
      <div class="ui-corner ui-corner--lb">
        <div class="ui-fab"><span class="ui-fab__icon">←</span>菜单</div>
      </div>`
}

export function company(text = '示范教育科技有限公司') {
  return `<div class="ui-company"><span class="ui-company__logo">示</span>${text}</div>`
}
