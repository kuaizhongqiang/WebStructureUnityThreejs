/** 样式清单的组件分节 + 页面索引分组。 */

export const styleSpecSections = [
  {
    title: '三、按钮与操作',
    items: [
      {
        name: '主按钮',
        desc: '页面主操作，一个页面最多一个',
        cls: '.ui-btn.ui-btn--primary',
        html: '<button class="ui-btn ui-btn--primary">开始实验</button>',
      },
      {
        name: '次按钮',
        desc: '常规操作',
        cls: '.ui-btn',
        html: '<button class="ui-btn">取消</button>',
      },
      {
        name: '幽灵按钮',
        desc: '低权重操作，与主按钮并列',
        cls: '.ui-btn.ui-btn--ghost',
        html: '<button class="ui-btn ui-btn--ghost">游客进入</button>',
      },
      {
        name: '危险按钮',
        desc: '退出 / 删除 / 不可逆操作',
        cls: '.ui-btn.ui-btn--danger',
        html: '<button class="ui-btn ui-btn--danger">退出</button>',
      },
      {
        name: '大按钮',
        desc: '欢迎页等强调场景，高 64px',
        cls: '.ui-btn.ui-btn--lg.ui-btn--pill',
        html: '<button class="ui-btn ui-btn--primary ui-btn--lg ui-btn--pill">开始</button>',
      },
      {
        name: '小按钮',
        desc: '工具条、列表行内，高 30px',
        cls: '.ui-btn.ui-btn--sm',
        html: '<button class="ui-btn ui-btn--sm">复位视角</button>',
      },
      {
        name: '禁用态（重新设计：虚线框）',
        desc: '条件不满足时用虚线框 + 锁图标；与可用按钮靠形状区分，不只靠明度（详见第六节）',
        cls: '.ui-btn[disabled]',
        html: '<button class="ui-btn ui-btn--primary" disabled>提交成绩</button>',
      },
      {
        name: '浮起功能键',
        desc: '角落常驻操作（右上 / 左下）',
        cls: '.ui-fab',
        html: '<div class="ui-fab"><span class="ui-fab__icon">☰</span>目录</div><div class="ui-fab"><span class="ui-fab__icon">⛶</span>全屏</div>',
      },
    ],
  },
  {
    title: '四、列表与条目',
    items: [
      {
        name: '列表行',
        desc: '仪器 / 章节 / 步骤条目',
        cls: '.ui-list__item',
        html: '<div class="ui-list__item" style="width:260px"><span class="ui-list__idx">1</span>数字万用表</div>',
      },
      {
        name: '列表行 · 选中',
        desc: '当前项，主色描边 + 发光',
        cls: '.ui-list__item--active',
        html: '<div class="ui-list__item ui-list__item--active" style="width:260px"><span class="ui-list__idx">2</span>温度传感器</div>',
      },
      {
        name: '带缩略图的行',
        desc: '需要图像辅助识别的条目',
        cls: '.ui-list__thumb',
        html: '<div class="ui-list__item" style="width:260px"><span class="ui-list__thumb"></span>直流稳压电源</div>',
      },
      {
        name: '带右侧元信息的行',
        desc: '状态徽章 + 分数等',
        cls: '.ui-list__meta',
        html: '<div class="ui-list__item" style="width:300px"><span class="ui-list__idx">6</span>小测验<span class="ui-list__meta"><span class="ui-badge ui-badge--ok">已完成</span><span>24/30</span></span></div>',
      },
      {
        name: '卡片（项目格）',
        desc: '项目选择、画质选择',
        cls: '.ui-tile',
        html: '<div class="ui-tile" style="width:200px"><div class="ui-tile__thumb"></div><div class="ui-tile__name">01 · 项目名称</div><div class="ui-tile__desc">进度 3 / 11</div></div>',
      },
      {
        name: '卡片 · 选中',
        desc: '当前选择项',
        cls: '.ui-tile--active',
        html: '<div class="ui-tile ui-tile--active" style="width:200px"><div class="ui-tile__thumb"></div><div class="ui-tile__name">02 · 项目名称</div><div class="ui-tile__desc">进度 7 / 11</div></div>',
      },
    ],
  },
  {
    title: '五、表单与控件',
    items: [
      {
        name: '输入框',
        desc: '登录、填空、搜索',
        cls: '.ui-input',
        html: '<input class="ui-input" style="width:220px" placeholder="请输入账号或学号">',
      },
      {
        name: '下拉选择',
        desc: '身份、筛选、排序',
        cls: '.ui-select',
        html: '<select class="ui-select" style="width:180px"><option>学生</option><option>教师</option></select>',
      },
      {
        name: '复选框 / 单选',
        desc: '记住我、多选答案',
        cls: '.ui-check',
        html: '<label class="ui-check ui-check--on"><span class="ui-check__box">✓</span>记住我</label><label class="ui-check"><span class="ui-check__box"></span>未选</label>',
      },
      {
        name: '开关',
        desc: '自动旋转、音效等即时开关',
        cls: '.ui-switch',
        html: '<div class="ui-row"><div class="ui-switch ui-switch--on"></div><div class="ui-switch"></div></div>',
      },
      {
        name: '进度条',
        desc: '加载、答题进度、完成度',
        cls: '.ui-progress / __bar',
        html: '<div class="ui-progress" style="width:220px"><div class="ui-progress__bar" style="width:64%"></div></div>',
      },
      {
        name: '加载环',
        desc: '等待状态；不可无反馈地空白等待',
        cls: '.ui-loading-ring',
        html: '<div class="ui-loading-ring" style="width:40px;height:40px;border-width:3px"></div>',
      },
      {
        name: '步骤条',
        desc: '横向步骤指示;三态：完成 / 当前 / 未开始',
        cls: '.ui-steps / .ui-step',
        html: '<div class="ui-steps"><div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>通电</div><span class="ui-step__line"></span><div class="ui-step ui-step--current"><span class="ui-step__dot">2</span>选量程</div></div>',
      },
      {
        name: '徽章 / 标签',
        desc: '状态与分类标记',
        cls: '.ui-badge--ok/info/warn/err/gold',
        html: '<span class="ui-badge">默认</span><span class="ui-badge ui-badge--ok">已完成</span><span class="ui-badge ui-badge--info">Three</span><span class="ui-badge ui-badge--warn">部分完成</span><span class="ui-badge ui-badge--err">未通过</span><span class="ui-badge ui-badge--gold">+5 分</span>',
      },
    ],
  },
  {
    title: '六、反馈与提示',
    items: [
      {
        name: '信息提示',
        desc: '说明类，蓝色',
        cls: '.ui-alert.ui-alert--info',
        html: '<div class="ui-alert ui-alert--info" style="width:280px"><span class="ui-alert__icon">i</span><span>本期无后端，成绩保存在本机。</span></div>',
      },
      {
        name: '成功提示',
        desc: '操作通过',
        cls: '.ui-alert.ui-alert--ok',
        html: '<div class="ui-alert ui-alert--ok" style="width:280px"><span class="ui-alert__icon">✓</span><span>偏差在允许范围内。</span></div>',
      },
      {
        name: '警告提示',
        desc: '有风险但可继续（如移动端性能）',
        cls: '.ui-alert.ui-alert--warn',
        html: '<div class="ui-alert ui-alert--warn" style="width:280px"><span class="ui-alert__icon">!</span><span>微信内置浏览器性能有限。</span></div>',
      },
      {
        name: '错误提示',
        desc: '阻塞或失败',
        cls: '.ui-alert.ui-alert--err',
        html: '<div class="ui-alert ui-alert--err" style="width:280px"><span class="ui-alert__icon">✕</span><span>三维资源加载失败，请重试。</span></div>',
      },
      {
        name: '步骤/操作提示栏',
        desc: '任务页底部固定，两块信息固定顺序',
        cls: '.ui-tips',
        html: '<div class="ui-tips" style="width:420px"><div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">把红表笔接到 V+</span></div><div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--op">操作提示</span><span class="ui-tips__text">先确认电源已断电</span></div></div>',
      },
      {
        name: '模态框',
        desc: '4 类语义：返回 / 退出 / 跳转 / 提交',
        cls: '.ui-dialog',
        html: '<div class="ui-dialog" style="width:300px"><div class="ui-dialog__title" style="height:40px;font-size:14px">返回目录？</div><div class="ui-dialog__body" style="padding:14px;font-size:12px">当前实训尚未完成。</div><div class="ui-dialog__foot" style="padding:10px 14px"><button class="ui-btn ui-btn--sm">继续</button><button class="ui-btn ui-btn--primary ui-btn--sm">返回</button></div></div>',
      },
      {
        name: '轻提示（Toast）',
        desc: '非阻塞反馈，2~3 秒自动消失',
        cls: '.ui-toast',
        html: '<div class="ui-toast" style="position:static;transform:none">已记录第 1 组数据</div>',
      },
      {
        name: '禁用按钮（重新设计）',
        desc: '透明底 + 虚线框 + 锁图标；与可用按钮靠"形状"区分，不只靠明度。旁边必须给一行原因说明',
        cls: '.ui-btn[disabled] / .ui-disabled-hint',
        html: `<div class="ui-col" style="align-items:flex-start;gap:6px">
          <button class="ui-btn ui-btn--primary" disabled>提交成绩</button>
          <span class="ui-disabled-hint">还有 2 个任务未完成，完成后可提交</span>
        </div>`,
      },
      {
        name: '中文正文排版（两段示例）',
        desc: '首行缩进 2 字符（text-indent: 2em）；行距 1.9 与段距 0.9em 必须不同，否则段落读不出来；两端对齐、长英文串折行不断词',
        cls: '.ui-article p / p + p',
        html: `<div class="ui-article" style="width:520px;text-align:left">
          <p>本实验以温度传感器为对象。传感器输出的电压随温度升高而线性增大，万用表读数即反映这一变化。测量前应确认量程档位与被测物理量一致。</p>
          <p>若量程选择过大，相对误差会被放大；若过小，则读数可能溢出。一般应选择略大于被测值的档位，并等待读数稳定后再记录。这一段用于验证段间距，注意它与上一段之间的距离明显小于行距。</p>
        </div>`,
      },
    ],
  },
  {
    title: '七、三维与专用控件',
    items: [
      {
        name: '三维视口',
        desc: '网格底纹表示画布；左上标技术栈与场景名，右上工具组',
        cls: '.ui-viewport',
        html: '<div class="ui-viewport" style="width:280px;height:140px;position:relative"><div class="ui-viewport__hint">Unity · 接线场景</div><div class="ui-viewport__center" style="font-size:11px">画布区域</div></div>',
      },
      {
        name: '悬浮工具条',
        desc: '叠在三维之上的操作组（表笔、视角、记录）',
        cls: '.ui-floatbar',
        html: '<div class="ui-floatbar" style="position:static;transform:none"><button class="ui-btn ui-btn--sm">红表笔</button><button class="ui-btn ui-btn--sm ui-btn--primary">黑表笔</button></div>',
      },
      {
        name: '数显（仪表）',
        desc: '温度 / 电压 / 电阻读数，等宽字体',
        cls: '.ui-meter',
        html: '<span class="ui-meter"><span class="ui-meter__label">当前温度</span><span class="ui-meter__value">26.4<span class="ui-meter__unit">°C</span></span></span>',
      },
      {
        name: '旋钮',
        desc: '可拖拽调节，带指针与量程映射',
        cls: '.ui-knob',
        html: '<div class="ui-knob"></div>',
      },
      {
        name: '引线标注',
        desc: '指向三维中的端子/部件',
        cls: '.ui-lead',
        html: '<span class="ui-lead"><span class="ui-lead__dot"></span>V+ 端子<span class="ui-lead__line"></span></span>',
      },
      {
        name: '题目控件',
        desc: '题干 + 选项 + 答题卡（详见 D2 页）',
        cls: '.ui-question / .ui-option',
        html: '<div class="ui-options" style="width:260px"><div class="ui-option"><span class="ui-option__key">A</span>选项一</div><div class="ui-option ui-option--picked"><span class="ui-option__key">B</span>选项二（已选）</div></div>',
      },
      {
        name: 'AI 助理浮窗',
        desc: '右下角 380px；气泡左 AI 右用户',
        cls: '.ui-ai',
        html: '<div class="ui-ai" style="position:static;width:280px"><div class="ui-ai__head">AI 实验助理</div><div class="ui-ai__body" style="padding:10px"><div class="ui-ai__msg ui-ai__msg--ai">需要解释这个参数吗？</div></div></div>',
      },
      {
        name: '版权 / LOGO 块',
        desc: '左上常驻（对应参考工程 CompanyPanel）',
        cls: '.ui-company',
        html: '<div class="ui-company" style="position:static"><span class="ui-company__logo">示</span>示范教育科技有限公司</div>',
      },
    ],
  },
]

export const styleSpecSectionsRound2 = [
  {
    title: '八、本轮修订：新增与替换的组件（依 2026-10-12 审核意见）',
    items: [
      {
        name: '站点线导航（替代页签栏）',
        desc: '一个 TaskType 一个"站"，站与站之间用连线连接；已完成站打勾、当前站实心带光晕',
        cls: '.ui-route / .ui-route__stop / .ui-route__seg',
        html: `<nav class="ui-route" style="padding:12px 14px 8px">
          <div class="ui-route__stop ui-route__stop--done"><span class="ui-route__dot">✓</span><span class="ui-route__label">目的</span></div>
          <span class="ui-route__seg ui-route__seg--done"></span>
          <div class="ui-route__stop ui-route__stop--current"><span class="ui-route__dot">2</span><span class="ui-route__label">仪器</span></div>
          <span class="ui-route__seg"></span>
          <div class="ui-route__stop"><span class="ui-route__dot">3</span><span class="ui-route__label">原理</span></div>
        </nav>`,
      },
      {
        name: '站点 · 未开放态',
        desc: '内容未启用（active:false）时半透明且不可点',
        cls: '.ui-route__stop--locked',
        html: `<nav class="ui-route" style="padding:12px 14px 8px">
          <div class="ui-route__stop ui-route__stop--done"><span class="ui-route__dot">✓</span><span class="ui-route__label">目的</span></div>
          <span class="ui-route__seg ui-route__seg--done"></span>
          <div class="ui-route__stop ui-route__stop--locked"><span class="ui-route__dot">2</span><span class="ui-route__label">电路连接</span></div>
        </nav>`,
      },
      {
        name: '提示浮窗（展开）',
        desc: '右下角浮窗，替代原"底部固定提示栏"；步骤提示在上、操作提示在下',
        cls: '.ui-tips-float',
        html: `<div class="ui-tips-float" style="position:static;width:300px">
          <div class="ui-tips-float__head"><span>当前步骤提示</span><span class="ui-tips-float__actions"><span class="ui-tips-float__icon">▾</span><span class="ui-tips-float__icon">✕</span></span></div>
          <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">接到 V+ 端子</span></div>
          <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--op">操作提示</span><span class="ui-tips__text">先断电</span></div>
        </div>`,
      },
      {
        name: '提示浮窗（最小化为一行）',
        desc: '点 ▾ 收起；再点展开',
        cls: '.ui-tips-float--mini',
        html: `<div class="ui-tips-float ui-tips-float--mini" style="position:static">
          <span class="ui-tips__tag ui-tips__tag--step">步骤</span><span class="ui-tips__text">接到 V+ 端子</span><span class="ui-tips-float__icon">▴</span>
        </div>`,
      },
      {
        name: '提示浮窗（淡出态）',
        desc: '步骤完成后自动降到半透明，鼠标移入恢复',
        cls: '.ui-tips-float--ghost',
        html: `<div class="ui-tips-float ui-tips-float--ghost" style="position:static;width:260px">
          <div class="ui-tips-float__head"><span>上一步已完成</span></div>
          <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">接到 V+ 端子</span></div>
        </div>`,
      },
      {
        name: '功能条收起态 + 把手',
        desc: '无操作后自动收起（高 0，只剩 4px 把手）；<b>不是遮罩</b>，标题栏与返回按钮永不收起',
        cls: '.ui-bar--collapsed / .ui-bar__handle / .ui-bar-toggle',
        html: `<div style="display:flex;flex-direction:column;gap:10px;align-items:center;width:240px">
          <span class="ui-bar__handle"></span>
          <span class="ui-bar-toggle">▴ 展开功能条</span>
          <span class="ui-small ui-muted">收起态：条高 0 + 把手</span>
        </div>`,
      },
      {
        name: '右上返回按钮',
        desc: '返回固定为右上第一个按钮，用主色语义，与其它按钮区分',
        cls: '.ui-iconbtn--back',
        html: '<button class="ui-iconbtn ui-iconbtn--back">← 返回目录</button>',
      },
      {
        name: '右上按钮组',
        desc: '返回 + 全屏 + 画质 + 帮助；替代原"角落 fab"',
        cls: '.ui-topright / .ui-iconbtn',
        html: `<div style="display:flex;gap:8px;align-items:center">
          <button class="ui-iconbtn ui-iconbtn--back">← 返回</button>
          <button class="ui-iconbtn ui-iconbtn--icon">⛶</button>
          <button class="ui-iconbtn ui-iconbtn--icon">◐</button>
          <button class="ui-iconbtn ui-iconbtn--icon">?</button>
        </div>`,
      },
      {
        name: '视频播放器',
        desc: '实验原理页主体：大播放键 + 进度条 + 时间 + 音量/全屏',
        cls: '.ui-player / __stage / __ctrl / __track',
        html: `<div class="ui-player" style="width:300px;height:170px">
          <div class="ui-player__stage"><div class="ui-player__play" style="width:48px;height:48px;font-size:18px">▶</div></div>
          <div class="ui-player__ctrl" style="height:38px;gap:8px;padding:0 10px">
            <span class="ui-player__btn" style="font-size:12px">▶</span>
            <div class="ui-player__track"><div class="ui-player__progress"></div></div>
            <span class="ui-player__time" style="font-size:10px">01:18</span>
          </div>
        </div>`,
      },
      {
        name: '播放列表',
        desc: '原理页可有多段视频；当前段高亮',
        cls: '.ui-playlist / __item / __thumb',
        html: `<div class="ui-playlist" style="width:260px">
          <div class="ui-playlist__item ui-playlist__item--active"><span class="ui-playlist__thumb" style="width:56px;height:32px">▶</span><span><span class="ui-playlist__name">1 · 测温原理</span></span></div>
          <div class="ui-playlist__item"><span class="ui-playlist__thumb" style="width:56px;height:32px">▶</span><span><span class="ui-playlist__name">2 · 电路模型</span></span></div>
        </div>`,
      },
      {
        name: 'AI 思考气泡',
        desc: '三点跳动 + "正在做什么"的步骤说明，避免发出去没反应',
        cls: '.ui-ai__thinking / .ui-ai__steps',
        html: `<div class="ui-ai__msg ui-ai__msg--ai" style="position:static">
          <div class="ui-ai__thinking"><i></i><i></i><i></i></div>
          <div class="ui-ai__steps"><span class="ui-ai__step--done">✓ 已读取当前步骤</span><span>… 正在核对量程规则</span></div>
        </div>`,
      },
      {
        name: '图标优先的列表项',
        desc: '仪器列表：46px 大图标为主视觉，名称 16px、副标题 11px',
        cls: '.ui-iconitem / __icon / __name / __sub',
        html: `<div class="ui-iconitem ui-iconitem--active" style="width:230px">
          <span class="ui-iconitem__icon">📊</span>
          <span><span class="ui-iconitem__name">数字万用表</span><br><span class="ui-iconitem__sub">测量电压 / 电阻</span></span>
        </div>`,
      },
      {
        name: '正文排版',
        desc: '页内成段文字统一走这个类（16px / 行高 1.95），替代原来 12px 的小字',
        cls: '.ui-article',
        html: '<div class="ui-article" style="width:280px">本实验以温度传感器为对象，理解测温原理与温度—电压的对应关系。</div>',
      },
    ],
  },
]

export const pageIndexGroups = [
  {
    title: 'A 组 · 启动与导航（10）',
    pages: [
      { id: 'A1', file: 'a1-start.html', title: '欢迎 / 开始页', note: 'Start' },
      { id: 'A2', file: 'a2-login.html', title: '登录页', note: 'Login' },
      { id: 'A3', file: 'a3-loading.html', title: '加载过渡页', note: '常驻' },
      { id: 'A4', file: 'a4-quality.html', title: '画质 / 首次设置', note: 'Start' },
      { id: 'A5', file: 'a5-menu.html', title: '菜单 / 项目列表页', note: 'Menu' },
      { id: 'A6', file: 'a6-roaming.html', title: '漫游大场景页', note: 'Roaming' },
      { id: 'A7', file: 'a7-titlebar.html', title: '顶部标题栏（3 形态）', note: '常驻' },
      { id: 'A8', file: 'a8-dialog.html', title: '通用模态框（4 类）', note: '常驻' },
      { id: 'A9', file: 'a9-sleep.html', title: '沉睡 / 唤醒遮罩', note: '常驻' },
      { id: 'A10', file: 'a10-ai.html', title: 'AI 助理浮窗', note: '常驻' },
    ],
  },
  {
    title: 'B 组 · 项目内主页面（5）',
    pages: [
      { id: 'B1', file: 'b1-content-shell.html', title: '项目内容页壳', note: '区域划分' },
      { id: 'B2', file: 'b2-task-tabs.html', title: '任务页签栏（11）', note: '含状态与窄屏' },
      { id: 'B3', file: 'b3-loading-assets.html', title: '任务切换加载遮罩', note: '可取消' },
      { id: 'B4', file: 'b4-corner-bar.html', title: '角落操作条', note: '右上 / 左下' },
      { id: 'B5', file: 'b5-tips.html', title: '步骤 + 操作提示栏', note: '含步骤条' },
    ],
  },
  {
    title: 'C 组 · 任务页（11 个 TaskType）',
    pages: [
      { id: 'C1', file: 'c1-none.html', title: '空类型 None', note: 'Three' },
      { id: 'C2', file: 'c2-purpose.html', title: '任务目的 Purpose', note: 'Three' },
      { id: 'C3', file: 'c3-equipment.html', title: '实验仪器 Equipment', note: 'Three · 最佳样板' },
      { id: 'C4', file: 'c4-principle.html', title: '实验原理 Principle', note: 'Three' },
      { id: 'C5', file: 'c5-test.html', title: '小测验 Test', note: 'Three' },
      { id: 'C6', file: 'c6-info.html', title: '简介 Info', note: 'Three' },
      { id: 'C7', file: 'c7-exam.html', title: '考核 Exam', note: 'Three' },
      { id: 'C8', file: 'c8-lineconnection.html', title: '电路连接 LineConnection', note: 'Unity' },
      { id: 'C9', file: 'c9-training.html', title: '仿真实验 Training', note: 'Unity' },
      { id: 'C10', file: 'c10-structure.html', title: '结构 Structure', note: 'Unity' },
      { id: 'C11', file: 'c11-inspection.html', title: '检测 Inspection', note: 'Unity' },
    ],
  },
  {
    title: 'D 组 · 考核与结算（3）',
    pages: [
      { id: 'D1', file: 'd1-result.html', title: '成绩结算 / 提交页', note: '11 项字段' },
      { id: 'D2', file: 'd2-question.html', title: '题目控件（各题型）', note: '5 种题型' },
      { id: 'D3', file: 'd3-feedback.html', title: '答题对错反馈', note: '含解析' },
    ],
  },
]
