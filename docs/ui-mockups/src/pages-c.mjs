/**
 * C 组：11 个 TaskType 任务页排版稿。
 *
 * 第二轮修订（2026-10-12）：
 *   - C2 任务目的：内容只有一段文字 → 大幅简化（三维 + 一段文字 + 跳过）
 *   - C3 实验仪器：列表改成"图标优先"，右侧说明文字放大
 *   - C4 实验原理：改为视频播放器 + 播放列表（原理解有误）
 *   - C6 简介：改为"左三维模型 + 右一段文字"
 *   - C5 / C7：样式待重做，页面上带 TODO 标记（见 TODO.md T2 / T3）
 *   - C8~C11：Unity 侧，UI 暂不设计（保留第一轮样式，仅作占位）
 */
import { route, tipsFloat, topRight, tabs, tips, corners, viewport } from './parts.mjs'

const RIGHT = '<span class="ui-badge ui-badge--ok">已完成 3 / 11</span><span class="ui-badge ui-badge--info">高清</span><span class="ui-badge">游客</span>'
const CRUMB = '目录 / <b>温度传感器特性测量</b>'

export const pagesC = [
  // ------------------------------------------------------------- C1 None
  {
    id: 'C1',
    file: 'c1-none.html',
    title: 'C1 空类型（None）',
    state: 'UI · TaskType.None',
    crumb: CRUMB,
    right: RIGHT,
    statusbar: false,
    body: `${route('None')}
      ${topRight('')}
      <div class="ui-center" style="height:100%;gap:12px">
        <div style="font-size:40px;opacity:.35">◌</div>
        <div class="ui-h2">该项目暂无可展示的内容</div>
        <div class="ui-muted ui-small">「空类型」是 TaskType 的占位值（序号 0），用于尚未配置内容的项目</div>
        <div class="ui-row" style="margin-top:8px"><button class="ui-btn ui-btn--primary">从「任务目的」开始</button></div>
      </div>
      <div class="note">C1 · <b>空类型</b> · 占位页（Three）</div>`,
  },

  // ---------------------------------------------------------- C2 Purpose（简化）
  {
    id: 'C2',
    file: 'c2-purpose.html',
    title: 'C2 任务目的（Purpose）— 已按审核意见简化',
    state: 'UI · TaskType.Purpose',
    crumb: CRUMB,
    right: RIGHT,
    statusbar: false,
    body: `${route('Purpose', ['Purpose'])}
      ${topRight('')}
      <div style="position:absolute;inset:0;padding:20px 24px;display:flex;gap:20px">
        <div class="ui-panel" style="flex:1.5">
          <div class="ui-panel__head">设备展示<span class="ui-panel__right"><span class="ui-badge ui-badge--info">Three.js · 循环动画</span></span></div>
          <div class="ui-panel__body ui-panel__body--flush" style="position:relative;height:100%">
${viewport('Three.js', 'ObjectShowElement')}
          </div>
        </div>
        <div class="ui-panel" style="flex:1">
          <div class="ui-panel__head">实验目的</div>
          <div class="ui-panel__body" style="display:flex;flex-direction:column;gap:18px">
            <!-- 内容字段只有一段文字：不加卡片、不加图标、不加二级标题 -->
            <div class="ui-article">
              本实验以温度传感器为对象，通过测量其在不同温度下的输出，理解测温原理与温度—电压的对应关系，
              并掌握万用表的正确使用方法与数据记录规范。
            </div>
            <div class="ui-grow"></div>
            <button class="ui-btn ui-btn--primary ui-btn--block">下一步：实验仪器</button>
          </div>
        </div>
      </div>
      <div class="note">C2 · <b>任务目的（已简化）</b> · 左三维 + 右一段文字 + 一个前进按钮，去掉了原来的卡片堆叠</div>`,
  },

  // -------------------------------------------------------- C3 Equipment（图标优先）
  {
    id: 'C3',
    file: 'c3-equipment.html',
    title: 'C3 实验仪器（Equipment）— 已按审核意见调整',
    state: 'UI · TaskType.Equipment',
    crumb: CRUMB,
    right: RIGHT,
    statusbar: false,
    body: `${route('Equipment', ['Purpose', 'Equipment'])}
      ${topRight('')}
      <div style="position:absolute;inset:0;padding:20px 24px;display:flex;gap:18px">
        <div class="ui-panel" style="width:330px">
          <div class="ui-panel__head">仪器清单<span class="ui-panel__right"><span class="ui-badge">5 件</span></span></div>
          <div class="ui-panel__body ui-panel__body--flush" style="padding:14px">
            <div class="ui-iconlist">
              <div class="ui-iconitem ui-iconitem--active">
                <span class="ui-iconitem__icon">📊</span>
                <span><span class="ui-iconitem__name">数字万用表</span><br><span class="ui-iconitem__sub">测量电压 / 电阻</span></span>
              </div>
              <div class="ui-iconitem">
                <span class="ui-iconitem__icon">🔌</span>
                <span><span class="ui-iconitem__name">直流稳压电源</span><br><span class="ui-iconitem__sub">0~30V 可调</span></span>
              </div>
              <div class="ui-iconitem">
                <span class="ui-iconitem__icon">🌡️</span>
                <span><span class="ui-iconitem__name">温度传感器</span><br><span class="ui-iconitem__sub">被测对象</span></span>
              </div>
              <div class="ui-iconitem">
                <span class="ui-iconitem__icon">♨️</span>
                <span><span class="ui-iconitem__name">加热台</span><br><span class="ui-iconitem__sub">提供温度变化</span></span>
              </div>
              <div class="ui-iconitem">
                <span class="ui-iconitem__icon">➰</span>
                <span><span class="ui-iconitem__name">连接线</span><br><span class="ui-iconitem__sub">红 / 黑各一</span></span>
              </div>
            </div>
          </div>
        </div>
        <div class="ui-panel" style="flex:1">
          <div class="ui-panel__head">数字万用表<span class="ui-panel__right"><span class="ui-badge ui-badge--info">Three.js · 可旋转</span></span></div>
          <div class="ui-panel__body ui-panel__body--flush" style="position:relative;height:100%">
${viewport('Three.js', 'ObjectShowElement（可交互）')}
            <div class="ui-floatbar">
              <button class="ui-btn ui-btn--sm">自动旋转</button>
              <button class="ui-btn ui-btn--sm">复位视角</button>
              <button class="ui-btn ui-btn--sm">标注</button>
            </div>
          </div>
        </div>
        <div class="ui-panel" style="width:400px">
          <div class="ui-panel__head">仪器说明</div>
          <div class="ui-panel__body" style="display:flex;flex-direction:column;gap:16px">
            <div style="height:180px;border-radius:8px;background:var(--grid);background-color:var(--bg-0);border:1px solid var(--line-1)"></div>
            <div style="font-size:var(--fs-18);font-weight:600">数字万用表</div>
            <div class="ui-article" style="font-size:var(--fs-14)">
              可测量直流电压、交流电压、电阻与电流。本实验用于测量传感器的输出电压，
              注意量程应选择略大于被测值的档位，以减小相对误差。
            </div>
            <div class="ui-row" style="gap:8px;flex-wrap:wrap">
              <span class="ui-badge">量程 2V / 20V</span>
              <span class="ui-badge">精度 0.5%</span>
              <span class="ui-badge">输入阻抗 10MΩ</span>
            </div>
          </div>
        </div>
      </div>
      <div class="note">C3 · <b>实验仪器（已调整）</b> · 列表改为<b>图标优先</b>（46px 图标 + 名称 16px）；右栏说明字号从 12px 提到 14/18px</div>`,
  },

  // -------------------------------------------------------- C4 Principle（视频播放器）
  {
    id: 'C4',
    file: 'c4-principle.html',
    title: 'C4 实验原理（Principle）— 改为视频播放器',
    state: 'UI · TaskType.Principle',
    crumb: CRUMB,
    right: RIGHT,
    statusbar: false,
    body: `${route('Principle', ['Purpose'])}
      ${topRight('')}
      <div style="position:absolute;inset:0;padding:20px 24px;display:flex;gap:18px">
        <div style="flex:1;display:flex;flex-direction:column">
          <div class="ui-player">
            <div class="ui-player__stage">
              <div class="ui-player__badge"><span class="ui-badge ui-badge--info">原理讲解</span><span class="ui-badge">03:24</span></div>
              <div class="ui-player__play">▶</div>
              <div class="ui-muted ui-small" style="position:absolute;bottom:14px">视频区域（真实播放时由 video 元素承载；微信内需点击后播放，DEC-70）</div>
            </div>
            <div class="ui-player__ctrl">
              <span class="ui-player__btn">▶</span>
              <div class="ui-player__track"><div class="ui-player__progress"></div></div>
              <span class="ui-player__time">01:18 / 03:24</span>
              <span class="ui-player__btn">🔊</span>
              <span class="ui-player__btn">⛶</span>
            </div>
          </div>
        </div>
        <div class="ui-panel" style="width:360px">
          <div class="ui-panel__head">视频列表<span class="ui-panel__right"><span class="ui-badge">3 段</span></span></div>
          <div class="ui-panel__body ui-playlist">
            <div class="ui-playlist__item ui-playlist__item--active">
              <span class="ui-playlist__thumb">▶</span>
              <span><span class="ui-playlist__name">1 · 测温原理</span><br><span class="ui-playlist__meta">03:24 · 已看完 0:00</span></span>
            </div>
            <div class="ui-playlist__item">
              <span class="ui-playlist__thumb">▶</span>
              <span><span class="ui-playlist__name">2 · 电路模型与接线</span><br><span class="ui-playlist__meta">04:10</span></span>
            </div>
            <div class="ui-playlist__item">
              <span class="ui-playlist__thumb">▶</span>
              <span><span class="ui-playlist__name">3 · 误差来源分析</span><br><span class="ui-playlist__meta">02:45</span></span>
            </div>
          </div>
        </div>
      </div>
      <div class="note">C4 · <b>实验原理（已改正）</b> · 主体是<b>视频播放器</b> + 右侧<b>视频列表</b>（原第一轮理解成图文+动画，是错的）</div>`,
  },

  // ------------------------------------------------------------- C5 Test（待重做）
  {
    id: 'C5',
    file: 'c5-test.html',
    title: 'C5 小测验（Test）',
    state: 'UI · TaskType.Test',
    crumb: CRUMB,
    right: RIGHT,
    statusbar: false,
    body: `<div class="todo-mark">题目样式待重做（TODO.md T2）</div>
      ${route('Test', ['Purpose']) }
      ${topRight('')}
      <div style="position:absolute;inset:0;padding:20px 24px;display:flex;gap:18px">
        <div class="ui-panel" style="flex:1">
          <div class="ui-panel__head">小测验<span class="ui-panel__right"><span class="ui-badge ui-badge--info">Three.js</span></span></div>
          <div class="ui-panel__body ui-question">
            <div class="ui-row"><span class="ui-badge">第 2 / 5 题</span><span class="ui-badge">单选</span><span class="ui-badge ui-badge--gold">5 分</span><div class="ui-grow"></div><span class="ui-muted ui-small">已答 1 题 · 得 5 分</span></div>
            <div class="ui-question__stem"><span class="ui-question__index">2.</span>用万用表测量传感器输出电压时，正确的做法是：</div>
            <div class="ui-options">
              <div class="ui-option"><span class="ui-option__key">A</span>把表笔直接短接后在电压档读数</div>
              <div class="ui-option ui-option--picked"><span class="ui-option__key">B</span>把量程调到直流电压档，表笔并联在输出两端</div>
              <div class="ui-option"><span class="ui-option__key">C</span>把量程调到电阻档，表笔串联在回路中</div>
              <div class="ui-option"><span class="ui-option__key">D</span>任意档位都可以，读数一致</div>
            </div>
            <div class="ui-row" style="justify-content:space-between;padding-top:6px">
              <button class="ui-btn ui-btn--sm">上一题</button>
              <div class="ui-row"><button class="ui-btn ui-btn--sm">跳过</button><button class="ui-btn ui-btn--primary">提交本题</button></div>
            </div>
          </div>
        </div>
        <div class="ui-panel" style="width:300px">
          <div class="ui-panel__head">答题卡</div>
          <div class="ui-panel__body" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
            <div class="ui-list__idx" style="background:var(--ok-weak);border:1px solid var(--ok);color:#8ce6ab">1</div>
            <div class="ui-list__idx" style="background:var(--accent);border:1px solid var(--accent);color:#fff">2</div>
            <div class="ui-list__idx">3</div>
            <div class="ui-list__idx">4</div>
            <div class="ui-list__idx">5</div>
          </div>
        </div>
      </div>
      <div class="note">C5 · <b>小测验</b> · <b>题目样式已列入重做</b>（审核意见：丑）；结构与站点线已更新，请只评审结构与导航</div>`,
  },

  // ------------------------------------------------------------- C6 Info（左三维 + 右文字）
  {
    id: 'C6',
    file: 'c6-info.html',
    title: 'C6 简介（Info）— 已按审核意见调整',
    state: 'UI · TaskType.Info',
    crumb: CRUMB,
    right: RIGHT,
    statusbar: false,
    body: `${route('Info')}
      ${topRight('')}
      <div style="position:absolute;inset:0;padding:20px 24px;display:flex;gap:20px">
        <div class="ui-panel" style="flex:1.4">
          <div class="ui-panel__head">三维模型<span class="ui-panel__right"><span class="ui-badge ui-badge--info">Three.js · 可旋转</span></span></div>
          <div class="ui-panel__body ui-panel__body--flush" style="position:relative;height:100%">
${viewport('Three.js', '整机 / 场景模型')}
          </div>
        </div>
        <div class="ui-panel" style="flex:1">
          <div class="ui-panel__head">简介</div>
          <div class="ui-panel__body" style="display:flex;flex-direction:column;gap:16px">
            <div class="ui-article">
              本实验以温度传感器为对象，覆盖「认识仪器 → 理解原理 → 接线 → 仿真操作 → 测验考核」的完整链路。
              建议按站点线顺序逐项完成，最后在「考核」中检验掌握程度。预计用时 45 分钟。
            </div>
            <div class="ui-row" style="gap:8px;flex-wrap:wrap">
              <span class="ui-badge">预计 45 分钟</span>
              <span class="ui-badge">11 个任务</span>
              <span class="ui-badge ui-badge--info">中职 / 高职</span>
            </div>
          </div>
        </div>
      </div>
      <div class="note">C6 · <b>简介（已调整）</b> · 左侧主体改为<b>三维模型展示</b>，右侧一段文字（原来是左图右目录，理解错了）</div>`,
  },

  // ------------------------------------------------------------- C7 Exam（待重做）
  {
    id: 'C7',
    file: 'c7-exam.html',
    title: 'C7 考核（Exam）',
    state: 'UI · TaskType.Exam',
    crumb: CRUMB,
    right: RIGHT,
    statusbar: false,
    body: `<div class="todo-mark">考核样式待重做（TODO.md T3）</div>
      ${route('Exam', ['Purpose'])}
      ${topRight('')}
      <div style="position:absolute;inset:0;padding:20px 24px;display:flex;gap:18px">
        <div class="ui-panel" style="flex:1">
          <div class="ui-panel__head">考核<span class="ui-panel__right"><span class="ui-badge ui-badge--warn">计时 12:36</span></span></div>
          <div class="ui-panel__body ui-question">
            <div class="ui-row"><span class="ui-badge">抽题池 · 共 20 题</span><span class="ui-badge">第 7 题</span><span class="ui-badge ui-badge--gold">5 分</span><div class="ui-grow"></div><span class="ui-muted ui-small">已得 24 / 100</span></div>
            <div class="ui-question__stem"><span class="ui-question__index">7.</span>关于测量误差，下列说法正确的是：</div>
            <div class="ui-options">
              <div class="ui-option"><span class="ui-option__key">A</span>系统误差可以通过多次测量取平均完全消除</div>
              <div class="ui-option ui-option--picked"><span class="ui-option__key">B</span>量程选择过大会引入明显的相对误差</div>
              <div class="ui-option"><span class="ui-option__key">C</span>偶然误差与仪器精度无关</div>
              <div class="ui-option"><span class="ui-option__key">D</span>误差大小只取决于读数习惯</div>
            </div>
            <div class="ui-row" style="justify-content:space-between;padding-top:6px">
              <button class="ui-btn ui-btn--sm">上一题</button>
              <button class="ui-btn ui-btn--sm">标记待定</button>
              <button class="ui-btn ui-btn--primary">下一题</button>
            </div>
          </div>
        </div>
        <div class="ui-panel" style="width:340px">
          <div class="ui-panel__head">答题卡</div>
          <div class="ui-panel__body" style="display:flex;flex-direction:column;gap:12px">
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
              <div class="ui-list__idx" style="background:var(--ok-weak);border:1px solid var(--ok);color:#8ce6ab">1</div>
              <div class="ui-list__idx" style="background:var(--ok-weak);border:1px solid var(--ok);color:#8ce6ab">2</div>
              <div class="ui-list__idx">3</div>
              <div class="ui-list__idx" style="background:var(--accent);border:1px solid var(--accent);color:#fff">7</div>
              <div class="ui-list__idx">8</div>
              <div class="ui-list__idx" style="background:var(--warn-weak);border:1px solid var(--warn);color:#ffd28a">9</div>
              <div class="ui-list__idx">10</div>
            </div>
            <div class="ui-muted ui-small">绿＝已答、橙＝标记待定、蓝＝当前题</div>
            <button class="ui-btn ui-btn--primary ui-btn--block">交卷</button>
          </div>
        </div>
      </div>
      <div class="note">C7 · <b>考核</b> · <b>样式已列入重做</b>（审核意见：丑）；结构与站点线已更新</div>`,
  },

  // ---------------------------------------------------- C8~C11 Unity 侧（暂不设计）
  {
    id: 'C8',
    file: 'c8-lineconnection.html',
    title: 'C8 电路连接（LineConnection）· Unity 侧暂不设计',
    state: 'UI · TaskType.LineConnection',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('LineConnection', ['Purpose'])}
      <div class="ui-layout-3d">
        <div class="ui-layout-3d__view">
${viewport('Unity WebGL', '接线场景 · 正交俯视相机')}
          <div class="ui-floatbar">
            <button class="ui-btn ui-btn--sm">红表笔</button>
            <button class="ui-btn ui-btn--sm ui-btn--primary">黑表笔</button>
            <button class="ui-btn ui-btn--sm">撤销上一根</button>
          </div>
        </div>
        <div class="ui-layout-3d__side">
          <div class="ui-panel">
            <div class="ui-panel__head">接线进度<span class="ui-panel__right"><span class="ui-badge ui-badge--info">3 / 6 根</span></span></div>
            <div class="ui-panel__body ui-col" style="gap:10px">
              <div class="ui-steps" style="flex-direction:column;align-items:flex-start;gap:10px">
                <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>红表笔 → V+</div>
                <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>黑表笔 → GND</div>
                <div class="ui-step ui-step--current"><span class="ui-step__dot">3</span>电源正极 → VCC</div>
              </div>
            </div>
          </div>
          <div style="position:absolute;left:12px;right:12px;bottom:12px">
${tips('把红色表笔接到 V+ 端子', '先确认电源已断电', false)}
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note">C8 · <b>Unity 侧</b> · UI 暂不设计（审核意见），本页仍是第一轮样式，不作为评审对象</div>`,
  },
  {
    id: 'C9',
    file: 'c9-training.html',
    title: 'C9 仿真实验（Training）· Unity 侧暂不设计',
    state: 'UI · TaskType.Training',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Training', ['Purpose']) }
      <div class="ui-layout-3d">
        <div class="ui-layout-3d__view">
${viewport('Unity WebGL', '仿真实训场景 · 自由相机')}
          <div class="ui-floatbar">
            <button class="ui-btn ui-btn--sm">视角：自由</button>
            <button class="ui-btn ui-btn--sm">记录数据</button>
            <button class="ui-btn ui-btn--sm">生成曲线</button>
          </div>
          <div class="ui-row" style="position:absolute;left:18px;top:18px;gap:10px">
            <span class="ui-meter"><span class="ui-meter__label">当前温度</span><span class="ui-meter__value">26.4<span class="ui-meter__unit">°C</span></span></span>
            <span class="ui-meter"><span class="ui-meter__label">输出电压</span><span class="ui-meter__value">0.512<span class="ui-meter__unit">V</span></span></span>
          </div>
        </div>
        <div class="ui-layout-3d__side">
          <div class="ui-panel">
            <div class="ui-panel__head">实验步骤<span class="ui-panel__right"><span class="ui-badge ui-badge--info">4 / 12</span></span></div>
            <div class="ui-panel__body ui-col" style="gap:10px">
              <div class="ui-steps" style="flex-direction:column;align-items:flex-start;gap:10px">
                <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>接通电源</div>
                <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>选择直流电压档</div>
                <div class="ui-step ui-step--current"><span class="ui-step__dot">3</span>调节旋钮使读数稳定</div>
              </div>
            </div>
          </div>
          <div style="position:absolute;left:12px;right:12px;bottom:12px">
${tips('调节旋钮，使读数稳定在 0.5V 附近', '读数稳定后点击「记录数据」', false)}
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note">C9 · <b>Unity 侧</b> · UI 暂不设计，本页不作为评审对象</div>`,
  },
  {
    id: 'C10',
    file: 'c10-structure.html',
    title: 'C10 结构（Structure）· Unity 侧暂不设计',
    state: 'UI · TaskType.Structure',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Structure')}
      <div class="ui-layout-3d">
        <div class="ui-layout-3d__view">
${viewport('Unity WebGL', '结构剖切 · 正交相机')}
          <div class="ui-floatbar">
            <span class="ui-small ui-muted">爆炸程度</span>
            <input class="ui-input" style="width:200px" value="42%">
            <button class="ui-btn ui-btn--sm">还原</button>
          </div>
        </div>
        <div class="ui-layout-3d__side">
          <div class="ui-panel">
            <div class="ui-panel__head">部件树</div>
            <div class="ui-panel__body ui-col ui-panel__body--flush" style="gap:4px;padding:12px">
              <div class="ui-list__item">▾ 传感器本体</div>
              <div class="ui-list__item ui-list__item--active" style="margin-left:18px">感温元件</div>
              <div class="ui-list__item" style="margin-left:18px">接线端子</div>
            </div>
          </div>
          <div style="position:absolute;left:12px;right:12px;bottom:12px">
${tips('点击「感温元件」查看结构说明', '拖动滑杆可逐级爆炸展开', false)}
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note">C10 · <b>Unity 侧</b> · UI 暂不设计，本页不作为评审对象</div>`,
  },
  {
    id: 'C11',
    file: 'c11-inspection.html',
    title: 'C11 检测（Inspection）· Unity 侧暂不设计',
    state: 'UI · TaskType.Inspection',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Inspection')}
      <div class="ui-layout-3d">
        <div class="ui-layout-3d__view">
${viewport('Unity WebGL', '检测工位 · 第一人称相机')}
          <div class="ui-row" style="position:absolute;left:18px;top:18px;gap:10px">
            <span class="ui-meter"><span class="ui-meter__label">表笔</span><span class="ui-meter__value">红</span></span>
            <span class="ui-meter"><span class="ui-meter__label">实测值</span><span class="ui-meter__value">1.204<span class="ui-meter__unit">kΩ</span></span></span>
          </div>
          <div class="ui-floatbar">
            <button class="ui-btn ui-btn--sm ui-btn--primary">红表笔</button>
            <button class="ui-btn ui-btn--sm">黑表笔</button>
            <button class="ui-btn ui-btn--sm">记录本次测量</button>
          </div>
        </div>
        <div class="ui-layout-3d__side">
          <div class="ui-panel">
            <div class="ui-panel__head">检测项目<span class="ui-panel__right"><span class="ui-badge ui-badge--gold">16 / 24</span></span></div>
            <div class="ui-panel__body ui-col" style="gap:10px">
              <div class="ui-list__item"><span class="ui-badge ui-badge--ok">✓</span>测量端子通断</div>
              <div class="ui-list__item ui-list__item--active"><span class="ui-badge">2</span>测量感温元件阻值</div>
            </div>
          </div>
          <div style="position:absolute;left:12px;right:12px;bottom:12px">
${tips('用红表笔接触感温元件端子', '读数稳定 2 秒后自动采集', false)}
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note">C11 · <b>Unity 侧</b> · UI 暂不设计，本页不作为评审对象</div>`,
  },
]
