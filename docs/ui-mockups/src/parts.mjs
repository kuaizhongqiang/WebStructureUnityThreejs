/** 可复用的页面片段（11 个任务页签、提示栏、三维视口、角落按钮、版权块）。 */

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

/** 任务页签栏。active = TaskType 名；done = 已完成的 TaskType 名数组。 */
export function tabs(active, done = []) {
  return `<nav class="ui-tabs">
${TASK_TABS.map(([key, label, stack]) => {
  const cls = ['ui-tab']
  if (key === active) cls.push('ui-tab--active')
  if (done.includes(key)) cls.push('ui-tab--done')
  const stackCls = `ui-tab__stack ui-tab__stack--${stack}`
  return `        <div class="${cls.join(' ')}">${label}<span class="${stackCls}">${stack === 'unity' ? 'Unity' : 'Three'}</span></div>`
}).join('\n')}
      </nav>`
}

/** 步骤提示 + 操作提示（参考工程 TipsPanel 的双缓冲结构）。 */
export function tips(stepText, opText, withImage = true) {
  return `<div class="ui-tips">
        <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">${stepText}</span></div>
        <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--op">操作提示</span><span class="ui-tips__text">${opText}</span>${withImage ? '<span class="ui-tips__img"></span>' : ''}</div>
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

/** 右上功能按钮组 + 左下菜单按钮（对齐参考工程 RightUpPanel / LeftBottomPanel）。 */
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
