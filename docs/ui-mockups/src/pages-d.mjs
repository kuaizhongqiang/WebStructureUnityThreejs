/** D 组：考核与结算 + 题目控件规格。 */
import { icon } from './icons.mjs'
import { corners } from './parts.mjs'

export const pagesD = [
  // ------------------------------------------------------------ D1 结算页
  {
    id: 'D1',
    file: 'd1-result.html',
    title: 'D1 成绩结算 / 提交页',
    state: 'UI · 考核结算',
    crumb: '目录 / <b>温度传感器特性测量</b> / 成绩',
    right: '<span class="ui-badge ui-badge--info">高清</span>',
    body: `
      <div style="position:absolute;inset:0;padding:22px 32px;display:flex;gap:20px">
        <div class="ui-panel" style="flex:1">
          <div class="ui-panel__head">成绩明细</div>
          <div class="ui-panel__body ui-col" style="gap:12px">
            <div class="ui-card ui-row" style="gap:26px;flex-wrap:wrap">
              <span class="ui-small"><b>学号</b> 20260001</span>
              <span class="ui-small"><b>班级</b> 传感器 2401</span>
              <span class="ui-small"><b>姓名</b> 游客</span>
              <span class="ui-small"><b>身份</b> 学生</span>
            </div>
            <div class="ui-list">
              <div class="ui-list__item"><span class="ui-list__idx">1</span>任务目的<span class="ui-list__meta"><span class="ui-badge ui-badge--ok">已完成</span><span>10 / 10</span></span></div>
              <div class="ui-list__item"><span class="ui-list__idx">2</span>实验仪器<span class="ui-list__meta"><span class="ui-badge ui-badge--ok">已完成</span><span>10 / 10</span></span></div>
              <div class="ui-list__item"><span class="ui-list__idx">3</span>实验原理<span class="ui-list__meta"><span class="ui-badge ui-badge--ok">已完成</span><span>10 / 10</span></span></div>
              <div class="ui-list__item"><span class="ui-list__idx">4</span>电路连接<span class="ui-list__meta"><span class="ui-badge ui-badge--ok">已完成</span><span>18 / 20</span></span></div>
              <div class="ui-list__item"><span class="ui-list__idx">5</span>仿真实验<span class="ui-list__meta"><span class="ui-badge ui-badge--warn">部分完成</span><span>16 / 20</span></span></div>
              <div class="ui-list__item"><span class="ui-list__idx">6</span>小测验<span class="ui-list__meta"><span class="ui-badge ui-badge--ok">已完成</span><span>24 / 30</span></span></div>
            </div>
          </div>
        </div>
        <div class="ui-panel" style="width:420px">
          <div class="ui-panel__head">结算</div>
          <div class="ui-panel__body ui-col" style="gap:16px">
            <div class="ui-center" style="gap:6px;padding:18px 0;background:var(--bg-3);border-radius:12px">
              <div class="ui-muted ui-small">本次成绩</div>
              <div style="font-size:40px;font-weight:700;color:var(--gold)">88</div>
              <div class="ui-badge ui-badge--ok">评定：优秀</div>
            </div>
            <div class="ui-col ui-small" style="gap:8px">
              <div class="ui-row" style="justify-content:space-between"><span class="ui-muted">开始时间</span><span>2026-10-12 13:20</span></div>
              <div class="ui-row" style="justify-content:space-between"><span class="ui-muted">结束时间</span><span>2026-10-12 14:05</span></div>
              <div class="ui-row" style="justify-content:space-between"><span class="ui-muted">用时</span><span>45 分 12 秒</span></div>
              <div class="ui-row" style="justify-content:space-between"><span class="ui-muted">完成度</span><span>6 / 11 个任务</span></div>
            </div>
            <button class="ui-btn ui-btn--primary ui-btn--block">提交成绩</button>
            <button class="ui-btn ui-btn--ghost ui-btn--block">返回继续实验</button>
            <div class="ui-alert ui-alert--info">
              <span class="ui-alert__icon">${icon('info', 14)}</span>
              <span>本期无后端：提交后写入本机存档（DEC-54）；接后端时只换存档实现，界面不变。</span>
            </div>
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note" style="z-index:60">D1 · <b>成绩结算</b> · 左侧明细 + 右侧总成绩与时间（共 11 项字段）</div>`,
  },

  // ------------------------------------------------------ D2 题目控件规格
  {
    id: 'D2',
    file: 'd2-question.html',
    title: 'D2 题目控件（各题型与状态）',
    state: 'UI · 组件规范',
    crumb: '组件规范',
    right: '',
    body: `
      <div style="padding:22px 32px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="ui-card ui-question">
          <div class="ui-row"><span class="ui-badge">单选题</span><span class="ui-badge ui-badge--gold">5 分</span></div>
          <div class="ui-question__stem"><span class="ui-question__index">1.</span>下列哪个档位用于测量直流电压？</div>
          <div class="ui-options">
            <div class="ui-option ui-option--right"><span class="ui-option__key">A</span>V ⎓（直流电压）<span class="ui-grow"></span>${icon('check', 14)}</div>
            <div class="ui-option"><span class="ui-option__key">B</span>Ω（电阻）</div>
          </div>
        </div>
        <div class="ui-card ui-question">
          <div class="ui-row"><span class="ui-badge">多选题</span><span class="ui-badge ui-badge--gold">8 分</span></div>
          <div class="ui-question__stem"><span class="ui-question__index">2.</span>接线前必须确认的有：</div>
          <div class="ui-options">
            <div class="ui-option ui-option--picked"><span class="ui-option__key">${icon('square-check', 15)}</span>电源已断开</div>
            <div class="ui-option ui-option--picked"><span class="ui-option__key">${icon('square-check', 15)}</span>量程档位正确</div>
            <div class="ui-option ui-option--wrong"><span class="ui-option__key">${icon('square', 15)}</span>表笔可以随意插</div>
          </div>
        </div>
        <div class="ui-card ui-question">
          <div class="ui-row"><span class="ui-badge">判断题</span><span class="ui-badge ui-badge--gold">5 分</span></div>
          <div class="ui-question__stem"><span class="ui-question__index">3.</span>量程越大测量越准确。</div>
          <div class="ui-options" style="flex-direction:row">
            <div class="ui-option ui-option--right" style="flex:1"><span class="ui-option__key">${icon('check', 14)}</span>正确</div>
            <div class="ui-option" style="flex:1"><span class="ui-option__key">${icon('x', 14)}</span>错误</div>
          </div>
          <div class="ui-question__analysis">解析：量程过大将导致相对误差增大，应选择略大于被测值的档位。</div>
        </div>
        <div class="ui-card ui-question">
          <div class="ui-row"><span class="ui-badge">填空题</span><span class="ui-badge ui-badge--gold">6 分</span></div>
          <div class="ui-question__stem"><span class="ui-question__index">4.</span>测得电阻为 1.204 kΩ，参考值 1.200 kΩ，相对误差为 ______ %。</div>
          <div class="ui-field"><input class="ui-input" value="0.33"><div class="ui-field__hint">保留两位小数</div></div>
        </div>
        <div class="ui-card ui-question" style="grid-column:1 / -1">
          <div class="ui-row"><span class="ui-badge">排序题</span><span class="ui-badge ui-badge--gold">10 分</span></div>
          <div class="ui-question__stem"><span class="ui-question__index">5.</span>按正确顺序排列实验步骤：</div>
          <div class="ui-row" style="gap:10px;flex-wrap:wrap">
            <span class="ui-badge ui-badge--info">1 · 通电预热</span>
            <span class="ui-badge ui-badge--info">2 · 选择量程</span>
            <span class="ui-badge ui-badge--info">3 · 接线测量</span>
            <span class="ui-badge ui-badge--info">4 · 记录数据</span>
            <span class="ui-badge">5 · 断电整理</span>
            <span class="ui-muted ui-small">拖动可排序</span>
          </div>
        </div>
      </div>`,
  },

  // ---------------------------------------------------------- D3 对错反馈
  {
    id: 'D3',
    file: 'd3-feedback.html',
    title: 'D3 答题对错反馈',
    state: 'UI · 组件规范',
    crumb: '组件规范',
    right: '',
    body: `
      <div style="padding:28px 32px;display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div class="ui-card ui-center" style="gap:14px;padding:34px;border-color:var(--ok)">
          <div style="width:72px;height:72px;border-radius:50%;background:var(--ok-weak);border:2px solid var(--ok);display:flex;align-items:center;justify-content:center;font-size:34px;color:#8ce6ab">${icon('check', 14)}</div>
          <div class="ui-h2">回答正确</div>
          <div class="ui-badge ui-badge--gold">+ 5 分</div>
          <div class="ui-muted ui-small" style="max-width:320px">解析：直流电压档用于测量电压，表笔需并联在被测两端。</div>
          <button class="ui-btn ui-btn--primary">下一题</button>
        </div>
        <div class="ui-card ui-center" style="gap:14px;padding:34px;border-color:var(--err)">
          <div style="width:72px;height:72px;border-radius:50%;background:var(--err-weak);border:2px solid var(--err);display:flex;align-items:center;justify-content:center;font-size:34px;color:#ffb0b0">${icon('x', 14)}</div>
          <div class="ui-h2">回答错误</div>
          <div class="ui-badge ui-badge--err">正确答案：B</div>
          <div class="ui-muted ui-small" style="max-width:320px">你选择了 C（电阻档）。测量电压时使用电阻档会造成读数无意义。</div>
          <div class="ui-row"><button class="ui-btn">查看解析</button><button class="ui-btn ui-btn--primary">下一题</button></div>
        </div>
        <div class="ui-alert ui-alert--info" style="grid-column:1 / -1">
          <span class="ui-alert__icon">${icon('info', 14)}</span>
          <span>规范：对错图标 72px 圆形；正确用 ok 绿、错误用 err 红；必须给出<b>解析</b>；得分变化用金色徽章展示。</span>
        </div>
      </div>`,
  },
]
