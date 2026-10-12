/** C 组：11 个 TaskType 任务页排版稿。 */
import { tabs, tips, viewport, corners } from './parts.mjs'

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
    body: `${tabs('None')}
      <div class="ui-center" style="height:100%;gap:12px">
        <div style="font-size:40px;opacity:.35">◌</div>
        <div class="ui-h2">该项目暂无可展示的内容</div>
        <div class="ui-muted ui-small">「空类型」是 TaskType 的占位值（序号 0），用于尚未配置内容的项目</div>
        <div class="ui-row" style="margin-top:8px"><button class="ui-btn ui-btn--primary">从「任务目的」开始</button></div>
      </div>
      ${corners()}
      <div class="note">C1 · <b>空类型</b> · 占位页，不做三维（技术栈：Three）</div>`,
  },

  // ---------------------------------------------------------- C2 Purpose
  {
    id: 'C2',
    file: 'c2-purpose.html',
    title: 'C2 任务目的（Purpose）',
    state: 'UI · TaskType.Purpose',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Purpose', ['Purpose'])}
      <div style="position:absolute;inset:0;padding:18px 24px;display:flex;gap:18px">
        <div class="ui-panel" style="flex:1.35">
          <div class="ui-panel__head">设备三维展示<span class="ui-panel__right"><span class="ui-badge ui-badge--info">Three.js</span></span></div>
          <div class="ui-panel__body ui-panel__body--flush" style="position:relative;height:100%">
${viewport('Three.js', 'ObjectShowElement')}
          </div>
        </div>
        <div class="ui-panel" style="flex:1;display:flex;flex-direction:column">
          <div class="ui-panel__head">实验目的</div>
          <div class="ui-panel__body ui-col" style="gap:12px;overflow:auto">
            <div class="ui-card">
              <div class="ui-h2" style="font-size:var(--fs-14)">1 · 掌握测量原理</div>
              <div class="ui-muted ui-small" style="margin-top:6px;line-height:1.8">理解热电阻/热电偶的测温原理与温度—电压对应关系。</div>
            </div>
            <div class="ui-card">
              <div class="ui-h2" style="font-size:var(--fs-14)">2 · 熟悉实验步骤</div>
              <div class="ui-muted ui-small" style="margin-top:6px;line-height:1.8">能独立完成接线、量程选择、读数与记录。</div>
            </div>
            <div class="ui-card">
              <div class="ui-h2" style="font-size:var(--fs-14)">3 · 会判断异常</div>
              <div class="ui-muted ui-small" style="margin-top:6px;line-height:1.8">能识别掉线、量程不匹配等常见错误。</div>
            </div>
            <div style="height:120px;border-radius:8px;background:var(--grid);background-color:var(--bg-0);border:1px solid var(--line-1)"></div>
          </div>
          <div class="ui-row" style="padding:12px 16px;border-top:1px solid var(--line-1);justify-content:space-between">
            <span class="ui-muted ui-small">图文可上下滚动</span>
            <button class="ui-btn ui-btn--sm ui-btn--primary">跳过，去下一个</button>
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note" style="z-index:60">C2 · <b>任务目的</b> · 左三维展示 + 右图文 + 跳过按钮（对应参考工程 Task_PurposePanel）</div>`,
  },

  // -------------------------------------------------------- C3 Equipment
  {
    id: 'C3',
    file: 'c3-equipment.html',
    title: 'C3 实验仪器（Equipment）',
    state: 'UI · TaskType.Equipment',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Equipment', ['Purpose', 'Equipment'])}
      <div style="position:absolute;inset:0;padding:18px 24px;display:flex;gap:16px">
        <div class="ui-panel" style="width:300px">
          <div class="ui-panel__head">仪器清单</div>
          <div class="ui-panel__body ui-list ui-panel__body--flush" style="padding:12px">
            <div class="ui-list__item ui-list__item--active"><span class="ui-list__idx">1</span><span class="ui-list__thumb"></span><span>数字万用表</span></div>
            <div class="ui-list__item"><span class="ui-list__idx">2</span><span class="ui-list__thumb"></span><span>直流稳压电源</span></div>
            <div class="ui-list__item"><span class="ui-list__idx">3</span><span class="ui-list__thumb"></span><span>温度传感器</span></div>
            <div class="ui-list__item"><span class="ui-list__idx">4</span><span class="ui-list__thumb"></span><span>加热台</span></div>
            <div class="ui-list__item"><span class="ui-list__idx">5</span><span class="ui-list__thumb"></span><span>连接线（红/黑）</span></div>
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
        <div class="ui-panel" style="width:330px">
          <div class="ui-panel__head">仪器说明</div>
          <div class="ui-panel__body ui-col" style="gap:10px">
            <div style="height:120px;border-radius:8px;background:var(--grid);background-color:var(--bg-0);border:1px solid var(--line-1)"></div>
            <div class="ui-h2" style="font-size:var(--fs-14)">数字万用表</div>
            <div class="ui-muted ui-small" style="line-height:1.8">可测直流电压 / 交流电压 / 电阻 / 电流；本实验用于测量传感器输出电压。</div>
            <div class="ui-row" style="gap:8px"><span class="ui-badge">量程 2V/20V</span><span class="ui-badge">精度 0.5%</span></div>
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note" style="z-index:60">C3 · <b>实验仪器</b> · 左清单 + 中三维可交互 + 右图文（参考工程里这一页是最佳样板，MCV 已完整接线）</div>`,
  },

  // -------------------------------------------------------- C4 Principle
  {
    id: 'C4',
    file: 'c4-principle.html',
    title: 'C4 实验原理（Principle）',
    state: 'UI · TaskType.Principle',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Principle', ['Purpose'])}
      <div style="position:absolute;inset:0;padding:18px 24px;display:flex;gap:18px">
        <div class="ui-panel" style="width:260px">
          <div class="ui-panel__head">章节</div>
          <div class="ui-panel__body ui-list ui-panel__body--flush" style="padding:12px">
            <div class="ui-list__item ui-list__item--active"><span>1 · 测温原理</span></div>
            <div class="ui-list__item"><span>2 · 电路模型</span></div>
            <div class="ui-list__item"><span>3 · 误差来源</span></div>
            <div class="ui-list__item"><span>4 · 视频讲解</span></div>
          </div>
        </div>
        <div class="ui-panel" style="flex:1">
          <div class="ui-panel__head">1 · 测温原理</div>
          <div class="ui-panel__body ui-col" style="gap:14px;overflow:auto">
            <div class="ui-muted" style="font-size:var(--fs-14);line-height:1.9">
              金属导体的电阻随温度升高而增大，其关系可近似表示为
              <b>R<sub>t</sub> = R<sub>0</sub>(1 + α·Δt)</b>。通过测量电阻变化，即可推算出温度。
            </div>
            <div style="height:240px;border-radius:8px;background:var(--grid);background-color:var(--bg-0);border:1px solid var(--line-1);display:flex;align-items:center;justify-content:center" class="ui-muted ui-small">原理动画 / 示意图（Three.js 轻量化演示）</div>
            <div class="ui-row"><button class="ui-btn ui-btn--sm">▶ 播放动画</button><button class="ui-btn ui-btn--sm">重播</button></div>
            <div class="ui-card">
              <div class="ui-h2" style="font-size:var(--fs-14)">视频讲解</div>
              <div class="ui-row" style="margin-top:10px"><div style="width:260px;height:146px;border-radius:8px;background:var(--grid);background-color:var(--bg-0);border:1px solid var(--line-1)"></div>
              <div class="ui-muted ui-small">微信内置浏览器需用户点击后才可播放（DEC-70）</div></div>
            </div>
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note" style="z-index:60">C4 · <b>实验原理</b> · 左章节锚点 + 右图文/动画/视频（参考工程此页只有视频字段，未实现内容）</div>`,
  },

  // ------------------------------------------------------------- C5 Test
  {
    id: 'C5',
    file: 'c5-test.html',
    title: 'C5 小测验（Test）',
    state: 'UI · TaskType.Test',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Test', ['Purpose'])}
      <div style="position:absolute;inset:0;padding:18px 24px;display:flex;gap:18px">
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
      ${corners()}
      <div class="note" style="z-index:60">C5 · <b>小测验</b> · 题干 + 选项 + 答题卡（控件详见 D2）</div>`,
  },

  // ------------------------------------------------------------- C6 Info
  {
    id: 'C6',
    file: 'c6-info.html',
    title: 'C6 简介（Info）',
    state: 'UI · TaskType.Info',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Info')}
      <div style="position:absolute;inset:0;padding:18px 24px;display:flex;gap:18px">
        <div class="ui-panel" style="flex:1">
          <div class="ui-panel__head">项目简介</div>
          <div class="ui-panel__body ui-col" style="gap:14px;overflow:auto">
            <div style="height:220px;border-radius:8px;background:var(--grid);background-color:var(--bg-0);border:1px solid var(--line-1)"></div>
            <div class="ui-muted" style="font-size:var(--fs-14);line-height:1.9">
              本实验以温度传感器为对象，覆盖「认识仪器 → 理解原理 → 接线 → 仿真操作 → 测验考核」的完整链路。
              建议按左侧页签顺序逐项完成，最后在「考核」中检验掌握程度。
            </div>
            <div class="ui-row"><span class="ui-badge">预计用时 45 分钟</span><span class="ui-badge">11 个任务</span><span class="ui-badge ui-badge--info">适合学段：中职 / 高职</span></div>
          </div>
        </div>
        <div class="ui-panel" style="width:300px">
          <div class="ui-panel__head">目录</div>
          <div class="ui-panel__body ui-list ui-panel__body--flush" style="padding:12px">
            <div class="ui-list__item ui-list__item--active"><span>1 · 项目背景</span></div>
            <div class="ui-list__item"><span>2 · 适用对象</span></div>
            <div class="ui-list__item"><span>3 · 学习路径</span></div>
            <div class="ui-list__item"><span>4 · 考核说明</span></div>
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note" style="z-index:60">C6 · <b>简介</b> · 纯图文（参考工程 MCV 有此页字段但无写入方）</div>`,
  },

  // ------------------------------------------------------------- C7 Exam
  {
    id: 'C7',
    file: 'c7-exam.html',
    title: 'C7 考核（Exam）',
    state: 'UI · TaskType.Exam',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Exam', ['Purpose'])}
      <div style="position:absolute;inset:0;padding:18px 24px;display:flex;gap:18px">
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
          <div class="ui-panel__body ui-col" style="gap:12px">
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
              <div class="ui-list__idx" style="background:var(--ok-weak);border:1px solid var(--ok);color:#8ce6ab">1</div>
              <div class="ui-list__idx" style="background:var(--ok-weak);border:1px solid var(--ok);color:#8ce6ab">2</div>
              <div class="ui-list__idx">3</div>
              <div class="ui-list__idx ui-list__item--active" style="background:var(--accent);border-color:var(--accent);color:#fff">7</div>
              <div class="ui-list__idx">8</div>
              <div class="ui-list__idx" style="background:var(--warn-weak);border:1px solid var(--warn);color:#ffd28a">9</div>
              <div class="ui-list__idx">10</div>
            </div>
            <div class="ui-muted ui-small">绿＝已答、橙＝标记待定、蓝＝当前题</div>
            <button class="ui-btn ui-btn--primary ui-btn--block">交卷</button>
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note" style="z-index:60">C7 · <b>考核</b> · 抽题 + 计时 + 答题卡 + 交卷（参考工程 MCV 的考核态实际不可达，此处为本项目自研）</div>`,
  },

  // ---------------------------------------------------- C8 LineConnection
  {
    id: 'C8',
    file: 'c8-lineconnection.html',
    title: 'C8 电路连接（LineConnection）',
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
            <button class="ui-btn ui-btn--sm">清空</button>
          </div>
          <div style="position:absolute;left:18px;top:18px" class="ui-panel">
            <div class="ui-panel__body ui-col" style="gap:8px;padding:12px">
              <span class="ui-small ui-muted">引线标注</span>
              <span class="ui-lead"><span class="ui-lead__dot"></span>V+ 端子<span class="ui-lead__line"></span></span>
              <span class="ui-lead"><span class="ui-lead__dot"></span>GND 端子<span class="ui-lead__line"></span></span>
            </div>
          </div>
        </div>
        <div class="ui-layout-3d__side">
          <div class="ui-panel">
            <div class="ui-panel__head">接线进度<span class="ui-panel__right"><span class="ui-badge ui-badge--info">3 / 6 根</span></span></div>
            <div class="ui-panel__body ui-col" style="gap:10px">
              <div class="ui-steps" style="flex-direction:column;align-items:flex-start;gap:10px">
                <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>红表笔 → V+</div>
                <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>黑表笔 → GND</div>
                <div class="ui-step ui-step--current"><span class="ui-step__dot">3</span>电源正极 → 传感器 VCC</div>
                <div class="ui-step"><span class="ui-step__dot">4</span>加热台连线</div>
                <div class="ui-step"><span class="ui-step__dot">5</span>检查回路</div>
              </div>
            </div>
          </div>
          <div style="position:absolute;left:12px;right:12px;bottom:12px">
${tips('把红色表笔接到 V+ 端子', '先确认电源已断电再接线；接好后系统会自动检测回路', false)}
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note" style="z-index:60">C8 · <b>电路连接</b> · Unity 全屏画布 + 悬浮工具条 + 引线标注 + 右侧进度 + 底部提示</div>`,
  },

  // ---------------------------------------------------------- C9 Training
  {
    id: 'C9',
    file: 'c9-training.html',
    title: 'C9 仿真实验（Training）',
    state: 'UI · TaskType.Training',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Training', ['Purpose']) }
      <div class="ui-layout-3d">
        <div class="ui-layout-3d__view">
${viewport('Unity WebGL', '仿真实训场景 · 自由相机')}
          <div class="ui-floatbar">
            <button class="ui-btn ui-btn--sm">视角：自由</button>
            <button class="ui-btn ui-btn--sm">视角：跟随</button>
            <button class="ui-btn ui-btn--sm">记录数据</button>
            <button class="ui-btn ui-btn--sm">生成曲线</button>
          </div>
          <div class="ui-row" style="position:absolute;left:18px;top:18px;gap:10px">
            <span class="ui-meter"><span class="ui-meter__label">当前温度</span><span class="ui-meter__value">26.4<span class="ui-meter__unit">°C</span></span></span>
            <span class="ui-meter"><span class="ui-meter__label">输出电压</span><span class="ui-meter__value">0.512<span class="ui-meter__unit">V</span></span></span>
            <span class="ui-meter"><span class="ui-meter__label">量程</span><span class="ui-meter__value">dc 2V</span></span>
          </div>
        </div>
        <div class="ui-layout-3d__side">
          <div class="ui-panel">
            <div class="ui-panel__head">实验步骤<span class="ui-panel__right"><span class="ui-badge ui-badge--info">4 / 12</span></span></div>
            <div class="ui-panel__body ui-col" style="gap:10px">
              <div class="ui-steps" style="flex-direction:column;align-items:flex-start;gap:10px">
                <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>接通电源</div>
                <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>选择直流电压档</div>
                <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>接入传感器输出</div>
                <div class="ui-step ui-step--current"><span class="ui-step__dot">4</span>调节旋钮使读数稳定</div>
                <div class="ui-step"><span class="ui-step__dot">5</span>记录 5 组数据</div>
              </div>
            </div>
          </div>
          <div class="ui-panel">
            <div class="ui-panel__head">数据记录</div>
            <div class="ui-panel__body ui-small ui-muted">已记录 0 组 · 需要 5 组</div>
          </div>
          <div style="position:absolute;left:12px;right:12px;bottom:12px">
${tips('调节旋钮，使输出电压读数稳定在 0.5V 附近', '旋钮支持拖拽；读数稳定后点击「记录数据」', false)}
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note" style="z-index:60">C9 · <b>仿真实验</b> · Unity 画布 + 数显叠层 + 右侧步骤面板 + 底部提示（参考工程此页最重，21 步/项目）</div>`,
  },

  // --------------------------------------------------------- C10 Structure
  {
    id: 'C10',
    file: 'c10-structure.html',
    title: 'C10 结构（Structure）',
    state: 'UI · TaskType.Structure',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Structure')}
      <div class="ui-layout-3d">
        <div class="ui-layout-3d__view">
${viewport('Unity WebGL', '结构剖切 · 正交相机')}
          <div class="ui-floatbar">
            <span class="ui-small ui-muted">爆炸程度</span>
            <input class="ui-input" style="width:220px" value="42%">
            <button class="ui-btn ui-btn--sm">剖切视图</button>
            <button class="ui-btn ui-btn--sm">还原</button>
          </div>
        </div>
        <div class="ui-layout-3d__side">
          <div class="ui-panel">
            <div class="ui-panel__head">部件树</div>
            <div class="ui-panel__body ui-col ui-panel__body--flush" style="gap:4px;padding:12px">
              <div class="ui-list__item">▾ 传感器本体</div>
              <div class="ui-list__item" style="margin-left:18px">保护套管</div>
              <div class="ui-list__item ui-list__item--active" style="margin-left:18px">感温元件</div>
              <div class="ui-list__item" style="margin-left:18px">接线端子</div>
              <div class="ui-list__item">▸ 显示仪表</div>
            </div>
          </div>
          <div style="position:absolute;left:12px;right:12px;bottom:12px">
${tips('点击部件树中的「感温元件」查看结构说明', '拖动底部滑杆可逐级爆炸展开', false)}
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note" style="z-index:60">C10 · <b>结构</b> · 部件树 + 爆炸/剖切（参考工程 MCV 有浮动提示字段但未实现）</div>`,
  },

  // -------------------------------------------------------- C11 Inspection
  {
    id: 'C11',
    file: 'c11-inspection.html',
    title: 'C11 检测（Inspection）',
    state: 'UI · TaskType.Inspection',
    crumb: CRUMB,
    right: RIGHT,
    body: `${tabs('Inspection')}
      <div class="ui-layout-3d">
        <div class="ui-layout-3d__view">
${viewport('Unity WebGL', '检测工位 · 第一人称 / 漫游相机')}
          <div class="ui-row" style="position:absolute;left:18px;top:18px;gap:10px">
            <span class="ui-meter"><span class="ui-meter__label">表笔</span><span class="ui-meter__value">红</span></span>
            <span class="ui-meter"><span class="ui-meter__label">实测值</span><span class="ui-meter__value">1.204<span class="ui-meter__unit">kΩ</span></span></span>
            <span class="ui-meter"><span class="ui-meter__label">参考值</span><span class="ui-meter__value">1.200<span class="ui-meter__unit">kΩ</span></span></span>
          </div>
          <div class="ui-alert ui-alert--ok" style="position:absolute;left:18px;bottom:104px;width:420px">
            <span class="ui-alert__icon">✓</span><span>偏差 0.33%，在允许范围内（±2%）</span>
          </div>
          <div class="ui-floatbar">
            <button class="ui-btn ui-btn--sm ui-btn--primary">红表笔</button>
            <button class="ui-btn ui-btn--sm">黑表笔</button>
            <button class="ui-btn ui-btn--sm">记录本次测量</button>
          </div>
        </div>
        <div class="ui-layout-3d__side">
          <div class="ui-panel">
            <div class="ui-panel__head">检测项目<span class="ui-panel__right"><span class="ui-badge ui-badge--gold">得分 16 / 24</span></span></div>
            <div class="ui-panel__body ui-col" style="gap:10px">
              <div class="ui-list__item ui-list__item--active"><span class="ui-badge ui-badge--ok">✓</span>测量端子通断</div>
              <div class="ui-list__item"><span class="ui-badge ui-badge--ok">✓</span>测量绝缘电阻</div>
              <div class="ui-list__item"><span class="ui-badge">3</span>测量感温元件阻值</div>
              <div class="ui-list__item"><span class="ui-badge">4</span>记录并判定</div>
            </div>
          </div>
          <div style="position:absolute;left:12px;right:12px;bottom:12px">
${tips('用红表笔接触感温元件端子', '读数稳定 2 秒后自动采集；超过允许偏差会判定不合格', false)}
          </div>
        </div>
      </div>
      ${corners()}
      <div class="note" style="z-index:60">C11 · <b>检测</b> · 仪表数显 + 测量步骤 + 计分（参考工程 MCV 此页控制器只打 Warning）</div>`,
  },
]
