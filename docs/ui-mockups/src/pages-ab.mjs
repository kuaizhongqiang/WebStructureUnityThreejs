/**
 * A 组（启动与导航）+ B 组（项目内主页面）排版稿。
 *
 * 第二轮修订（2026-10-12）依据审核意见：
 *   - A9 休眠改为"功能条伸缩两态"，不再是遮罩
 *   - A10 增加 AI 思考气泡
 *   - B1/B3 用站点线导航 + 去掉底部固定栏 + 提示改浮窗 + 返回在右上
 *   - B2 站点线导航（替代页签栏）
 *   - B4 右上按钮组（替代角落 fab）
 *   - B5 提示改浮窗
 *   - A5 菜单页待重做（见 TODO.md T1，本文件仍为旧版并带 TODO 标记）
 */
import { icon } from './icons.mjs'
import { route, tipsFloat, topRight, company } from './parts.mjs'

const RIGHT = '<span class="ui-badge ui-badge--ok">已完成 3 / 11</span><span class="ui-badge ui-badge--info">高清</span><span class="ui-badge">游客</span>'
const CRUMB = '目录 / <b>温度传感器特性测量</b>'

/** 演示用的小号站点线（4 站，适配演示框宽度）。 */
const MINI_ROUTE = `<nav class="ui-route" style="padding:12px 16px 8px">
          <div class="ui-route__stop ui-route__stop--done"><span class="ui-route__dot">${icon('check', 15)}</span><span class="ui-route__label">任务目的</span></div>
          <span class="ui-route__seg ui-route__seg--done"></span>
          <div class="ui-route__stop ui-route__stop--done"><span class="ui-route__dot">${icon('check', 15)}</span><span class="ui-route__label">实验仪器</span></div>
          <span class="ui-route__seg ui-route__seg--done"></span>
          <div class="ui-route__stop ui-route__stop--current"><span class="ui-route__dot">3</span><span class="ui-route__label">仿真实验</span></div>
          <span class="ui-route__seg"></span>
          <div class="ui-route__stop"><span class="ui-route__dot">4</span><span class="ui-route__label">小测验</span></div>
        </nav>`

export const pagesAB = [
  // ------------------------------------------------------------------ A1
  {
    id: 'A1',
    file: 'a1-start.html',
    title: '欢迎 / 开始页',
    state: 'Start',
    crumb: '—',
    right: '<span class="ui-badge">v0.1</span>',
    body: `
      <div class="ui-center" style="height:100%">
        <div class="ui-titlebar__logo" style="width:96px;height:96px;font-size:40px;border-radius:20px">仿</div>
        <div class="ui-h1" style="margin-top:30px">虚拟仿真教学平台</div>
        <div class="ui-muted" style="letter-spacing:3px;font-size:12px;margin-top:12px">VIRTUAL SIMULATION TEACHING PLATFORM</div>
        <div style="margin-top:16px;font-size:14px;color:var(--text-2)">教学实验 · 虚拟仿真 · 分步操作训练</div>
        <div class="ui-row" style="margin-top:34px">
          <span class="ui-badge ui-badge--info">游客可直接进入（DEC-04）</span>
          <span class="ui-badge">纯静态 · 无后端（DEC-21）</span>
        </div>
        <!-- 主操作移到右下角：与右上角浮卡共用 50px 边距，形成对角呼应；"操作说明"按钮按要求移除。
             bottom 要减掉状态条高度，否则只是"距内容区 50px"，叠上 36px 状态条后离画布底会有 86px。 -->
        <button class="ui-btn ui-btn--primary ui-btn--lg ui-btn--pill"
                style="position:absolute;right:var(--shell-top-x);bottom:calc(var(--shell-top-x) - var(--statusbar-h))">开始实验</button>
        <div class="ui-muted" style="position:absolute;left:0;right:0;bottom:28px;text-align:center;font-size:11px">© 2026 虚拟仿真教学平台 · 首次进入会弹画质设置</div>
        <div class="note">A1 · <b>欢迎 / 开始页</b> · 居中主视觉 + 右下主按钮（已移除"操作说明"）</div>
      </div>`,
  },

  // ------------------------------------------------------------------ A2
  {
    id: 'A2',
    file: 'a2-login.html',
    title: '登录页',
    state: 'Login',
    crumb: '登录',
    body: `
      <div style="display:flex;height:100%">
        <!-- 左：三维展示区。产品里是 Three.js 画布（DEC-06：简单三维 → Three.js）；
             排版稿按全站惯例用 --grid 作三维空间底，并挂视口标识，避免被误认成背景底纹。 -->
        <div style="flex:1;position:relative;background:var(--grid);background-color:var(--bg-0);border-right:var(--hairline) solid var(--line-1)">
          <span class="ui-viewport__hint">Three.js · 三维展示区（设备旋转）</span>
          <div style="position:absolute;left:56px;bottom:56px;max-width:520px">
            <div class="ui-h2">欢迎使用虚拟仿真教学平台</div>
            <div class="ui-muted ui-small" style="margin-top:8px;line-height:1.8">登录后可保存学习进度与考核成绩；本期也可以游客身份直接体验全部实验。</div>
          </div>
          <div class="ui-company" style="bottom:24px;top:auto"><span class="ui-company__logo">示</span>示范教育科技有限公司</div>
        </div>
        <div style="width:680px;padding:0 96px;display:flex;flex-direction:column;justify-content:center;gap:18px">
          <div class="ui-h2">登录</div>
          <div class="ui-field">
            <div class="ui-field__label">账号 / 学号</div>
            <input class="ui-input" placeholder="请输入账号或学号">
          </div>
          <div class="ui-field">
            <div class="ui-field__label">密码</div>
            <input class="ui-input" type="password" placeholder="请输入密码">
          </div>
          <div class="ui-field">
            <div class="ui-field__label">身份</div>
            <!-- 自定义下拉：原生 <select> 的展开列表由浏览器绘制、无法套样式，所以改用触发器 + .ui-menu 浮层 -->
            <div class="ui-selectbox">
              <button class="ui-selectbox__trigger" type="button" aria-haspopup="listbox" aria-expanded="true">
                <span>学生</span><span class="ui-selectbox__chev">${icon('chevron-down', 14)}</span>
              </button>
              <div class="ui-menu ui-selectbox__pop" role="listbox" aria-label="选择身份">
                <div class="ui-menu__group">选择身份</div>
                <div class="ui-menu__item ui-menu__item--current" role="option" aria-selected="true">学生</div>
                <div class="ui-menu__item" role="option">教师</div>
                <div class="ui-menu__item" role="option">管理员</div>
                <div class="ui-menu__sep"></div>
                <div class="ui-menu__item ui-menu__item--disabled" role="option" aria-disabled="true">其他（暂不支持）</div>
              </div>
            </div>
            <div class="ui-field__hint">对应数据模型的 userType（未知 / 学生 / 教师 / 管理员）</div>
          </div>
          <div class="ui-row" style="justify-content:space-between">
            <label class="ui-check ui-check--on"><span class="ui-check__box">${icon('check', 12)}</span>记住我</label>
            <span class="ui-muted ui-small">忘记密码？</span>
          </div>
          <button class="ui-btn ui-btn--primary ui-btn--block">登录</button>
          <button class="ui-btn ui-btn--ghost ui-btn--block">以游客身份进入</button>
          <div class="ui-alert ui-alert--info">
            <span class="u${icon('info', 14)}-alert__icon">i</span>
            <span>本期无后端（DEC-21）：登录仅作界面占位；进度与成绩保存在本机一个 JSON 里（DEC-54）。</span>
          </div>
        </div>
      </div>
      <div class="note">A2 · <b>登录页</b> · 左三维展示区 + 右表单；身份下拉为<b>展开态</b>演示（浮层会盖住下方内容，真实下拉就是这样）</div>`,
  },

  // ------------------------------------------------------------------ A3
  {
    id: 'A3',
    file: 'a3-loading.html',
    title: '加载过渡页',
    state: '常驻（切场景时）',
    crumb: '加载中',
    right: '',
    statusbar: '[ 加载中 ] 正在准备实验环境',
    statusRight: '请勿关闭页面',
    body: `
      <!-- 加载环单独居中；文字与进度整体压到下部（2026-10-12 审核意见） -->
      <div class="ui-center" style="height:100%">
        <div class="ui-loading-ring"></div>
      </div>
      <div style="position:absolute;left:0;right:0;bottom:56px;display:flex;flex-direction:column;align-items:center;gap:14px">
        <div class="ui-h2">正在加载实验环境…</div>
        <div style="width:620px">
          <div class="ui-progress ui-progress--lg"><div class="ui-progress__bar" style="width:64%"></div></div>
          <div class="ui-row" style="justify-content:space-between;margin-top:10px">
            <span class="ui-muted ui-small">当前阶段：加载三维资源（Addressables 分包）</span>
            <span class="ui-small" style="color:var(--accent-2)">64%</span>
          </div>
        </div>
        <div class="ui-muted ui-small">首次加载较慢；后续进入同一实验会命中缓存</div>
      </div>
      <div class="note">A3 · <b>加载过渡页</b> · 环形进度居中 + 阶段文案与条形进度在下部</div>`,
  },

  // ------------------------------------------------------------------ A4
  {
    id: 'A4',
    file: 'a4-quality.html',
    title: '画质 / 首次设置',
    state: 'Start（首启弹窗）',
    crumb: '设置 / 画面质量',
    body: `
      <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px">
        <div class="ui-h2">选择画面质量</div>
        <div class="ui-muted ui-small">首次进入需要选择一次；之后可在右上「画质」按钮修改</div>
        <!-- 三个选项卡放在一个承载框里；卡内不再用大缩略图，改为 图标 + 标题 + 描述（+ 推荐徽章） -->
        <div class="ui-tile-grid ui-tile-grid--boxed" style="width:1180px;grid-template-columns:repeat(3,1fr)">
          <div class="ui-tile ui-tile--icon">
            <span class="ui-tile__icon">${icon('signal-low', 26)}</span>
            <div class="ui-tile__body">
              <div class="ui-tile__name">标清</div>
              <div class="ui-tile__desc">低端集显 / 移动端推荐 · 关闭阴影与后处理</div>
            </div>
          </div>
          <div class="ui-tile ui-tile--icon ui-tile--active">
            <span class="ui-tile__icon">${icon('signal-high', 26)}</span>
            <div class="ui-tile__body">
              <div class="ui-tile__name">高清 <span class="ui-badge ui-badge--ok">推荐</span></div>
              <div class="ui-tile__desc">独立显卡 / 桌面浏览器 · 开启基础阴影</div>
            </div>
          </div>
          <div class="ui-tile ui-tile--icon">
            <span class="ui-tile__icon">${icon('gem', 26)}</span>
            <div class="ui-tile__body">
              <div class="ui-tile__name">超清</div>
              <div class="ui-tile__desc">高性能显卡 · 全特效，首次加载更慢</div>
            </div>
          </div>
        </div>
        <div class="ui-alert ui-alert--warn" style="width:1180px">
          <span class="ui-alert__icon">${icon('triangle-alert', 14)}</span>
          <span>检测到当前设备为 <b>移动端浏览器</b>（微信内置）：建议选择「标清」，并优先使用电脑浏览器体验三维实验（DEC-70）。</span>
        </div>
        <div class="ui-row" style="margin-top:6px">
          <button class="ui-btn ui-btn--primary">确定并进入</button>
          <button class="ui-btn ui-btn--ghost">使用推荐值</button>
        </div>
        <div class="note">A4 · <b>画质设置</b> · 承载框 + 三档图标卡片（图标 / 标题 / 描述 / 推荐）+ 硬件提示</div>
      </div>`,
  },

  // ------------------------------------------------------------------ A5（待重做）
  {
    id: 'A5',
    file: 'a5-menu.html',
    title: '菜单 / 项目列表页',
    state: 'Menu',
    crumb: '目录',
    body: `
      <div class="todo-mark">待重做（TODO.md T1 · 手写动感版）</div>
      <div style="padding:22px 32px;height:100%;display:flex;flex-direction:column;gap:16px">
        <div class="ui-row">
          <div class="ui-h2">实验项目</div>
          <span class="ui-badge">共 17 个（示例）</span>
          <div class="ui-grow"></div>
          <input class="ui-input" style="width:280px" placeholder="搜索项目名称 / 关键词">
          <select class="ui-select" style="width:170px"><option>全部</option><option>未开始</option><option>已完成</option></select>
          <button class="ui-btn ui-btn--sm">去漫游</button>
          <button class="ui-btn ui-btn--sm">我的成绩</button>
        </div>
        <div class="ui-tile-grid" style="grid-template-columns:repeat(5,1fr);overflow:auto;flex:1">
${Array.from({ length: 10 })
  .map(
    (_, i) => `          <div class="ui-tile${i === 2 ? ' ui-tile--active' : ''}">
            <div class="ui-tile__thumb"></div>
            <div class="ui-tile__name">${String(i + 1).padStart(2, '0')} · 项目名称</div>
            <div class="ui-tile__desc">任务进度 3 / 11 · ${i < 3 ? '<span class="ui-badge ui-badge--ok">已完成</span>' : '<span class="ui-badge">未开始</span>'}</div>
          </div>`,
  )
  .join('\n')}
        </div>
        <div class="ui-alert ui-alert--warn">
          <span class="ui-alert__icon">${icon('triangle-alert', 14)}</span>
          <span>本页为第一轮遗留样式，已列入重做（审核意见：太丑、要更动感、需手写）。<b>请只评审其它页面</b>。</span>
        </div>
      </div>
      <div class="note">A5 · <b>菜单页（待重做）</b> · 保留旧样式仅为占位，不作为评审对象</div>`,
    statusbar: false,
  },

  // ------------------------------------------------- A6 漫游（Unity，暂不细化）
  {
    id: 'A6',
    file: 'a6-roaming.html',
    title: '漫游大场景页',
    state: 'Roaming',
    crumb: '漫游 / 实验楼一层',
    body: `
      <div style="position:absolute;inset:0">
        <div class="ui-viewport" style="position:absolute;inset:0">
          <div class="ui-viewport__hint">Unity WebGL · 漫游场景</div>
          <div class="ui-viewport__center">三维画布区域（Unity 侧 UI 暂不设计）</div>
        </div>
        ${topRight('<button class="ui-iconbtn">◎ 复位</button>')}
        <div style="position:absolute;left:50%;bottom:28px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center">
          <div class="ui-toast" style="position:static;transform:none">W / A / S / D 移动 · 右键拖拽转视角 · 对准设备点击进入该项目</div>
        </div>
        <div class="ui-panel" style="position:absolute;right:18px;bottom:96px;width:380px">
          <div class="ui-panel__head">设备信息<span class="ui-panel__right"><span class="ui-badge ui-badge--info">可进入</span></span></div>
          <div class="ui-panel__body ui-col">
            <div style="font-size:var(--fs-16);font-weight:600">实验台 03 · 温度传感器</div>
            <div class="ui-muted ui-small">对应教学项目：温度传感器特性测量</div>
            <button class="ui-btn ui-btn--primary ui-btn--block">进入该项目</button>
          </div>
        </div>
      </div>
      <div class="note">A6 · <b>漫游大场景</b> · 仅确认"返回/复位在右上 + 提示为浮窗"这套新规范，三维侧 UI 暂不细化</div>`,
    statusbar: false,
  },

  // ------------------------------------------------------------------ A7
  {
    id: 'A7',
    file: 'a7-titlebar.html',
    title: '常驻 · 外壳浮卡（右上角 · 3 种内容形态）',
    state: '常驻',
    crumb: '组件规范',
    right: '',
    body: `
      <div style="padding:26px 32px;display:flex;flex-direction:column;gap:26px">
        <div>
          <div class="ui-h2" style="margin-bottom:10px">形态 1 · 内容页（项目内）</div>
          <div style="border:1px dashed var(--line-2);border-radius:var(--radius-md);padding:16px;display:flex;justify-content:flex-start">
            <header class="ui-titlebar ui-titlebar--float">
              <div class="ui-titlebar__logo">仿</div>
              <div class="ui-titlebar__names">
                <div class="ui-titlebar__cn">虚拟仿真教学平台</div>
                <div class="ui-titlebar__en">Virtual Simulation Teaching Platform</div>
              </div>
              <div class="ui-titlebar__right">
                <span class="ui-titlebar__crumb">目录 / <b>温度传感器特性测量</b></span>
                <span class="ui-badge ui-badge--ok">已完成 3 / 11</span>
                <span class="ui-badge ui-badge--info">高清</span>
                <span class="ui-badge">游客</span>
              </div>
            </header>
          </div>
        </div>
        <div>
          <div class="ui-h2" style="margin-bottom:10px">形态 2 · 漫游页</div>
          <div style="border:1px dashed var(--line-2);border-radius:var(--radius-md);padding:16px;display:flex;justify-content:flex-start">
            <header class="ui-titlebar ui-titlebar--float">
              <div class="ui-titlebar__logo">仿</div>
              <div class="ui-titlebar__names">
                <div class="ui-titlebar__cn">虚拟仿真教学平台</div>
                <div class="ui-titlebar__en">Free Roaming</div>
              </div>
              <div class="ui-titlebar__right">
                <span class="ui-titlebar__crumb">漫游 / <b>实验楼一层</b></span>
                <span class="ui-badge">FPS 60</span>
                <span class="ui-badge ui-badge--info">高清</span>
              </div>
            </header>
          </div>
        </div>
        <div>
          <div class="ui-h2" style="margin-bottom:10px">形态 3 · 窄屏折叠（移动端 / 小窗口）</div>
          <div style="width:560px;border:1px dashed var(--line-2);border-radius:var(--radius-md);padding:16px;display:flex;justify-content:flex-start">
            <header class="ui-titlebar ui-titlebar--float" style="padding:8px 12px">
              <div class="ui-titlebar__logo" style="width:34px;height:34px;font-size:14px">仿</div>
              <div class="ui-titlebar__names"><div class="ui-titlebar__cn" style="font-size:15px">温度传感器特性测量</div></div>
              <div class="ui-titlebar__right"><span class="ui-badge">3 / 11</span><button class="ui-iconbtn ui-iconbtn--icon">${icon('menu', 15)}</button></div>
            </header>
          </div>
        </div>
        <div class="ui-alert ui-alert--info">
          <span class="u${icon('info', 14)}-alert__icon">i</span>
          <span>规范：<b>钉在画布左上角，距上 / 左各 50px，宽度随内容自适应</b>（<code>width: max-content</code>，上限 <code>--shell-card-max-w: 560px</code>，超长内容走省略号），高约 70px；左 LOGO + 中英双行，右侧依次为 面包屑 → 进度 → 画质 → 用户。<b>顶栏不再横贯全宽</b>，因此内容区多出 84px 高度；站点线左端要为浮卡留 620px、右端留 268px（给页面右上按钮组）。<b>浮卡永不收起</b>（保证返回入口常驻）。</span>
        </div>
      </div>`,
  },

  // ------------------------------------------------------------------ A8
  {
    id: 'A8',
    file: 'a8-dialog.html',
    title: '常驻 · 通用模态框（4 类）',
    state: '常驻',
    crumb: '组件规范',
    right: '',
    body: `
      <div style="padding:24px 32px;display:grid;grid-template-columns:repeat(2,1fr);gap:24px">
        <div class="ui-dialog">
          <div class="ui-dialog__title">返回目录？</div>
          <div class="ui-dialog__body"><p>当前实训尚未完成（进度 3 / 11），返回后进度会保留在本机。确定要返回目录吗？</p></div>
          <div class="ui-dialog__foot"><button class="ui-btn">继续实验</button><button class="ui-btn ui-btn--primary">返回目录</button></div>
        </div>
        <div class="ui-dialog">
          <div class="ui-dialog__title">退出平台？</div>
          <div class="ui-dialog__body"><p>退出后未提交的成绩将不会保存。确定退出吗？</p></div>
          <div class="ui-dialog__foot"><button class="ui-btn">取消</button><button class="ui-btn ui-btn--danger">退出</button></div>
        </div>
        <div class="ui-dialog">
          <div class="ui-dialog__title">切换到漫游场景</div>
          <div class="ui-dialog__body"><p>即将离开当前实验场景进入漫游。切换过程需要重新加载三维资源，可能需要十几秒。</p></div>
          <div class="ui-dialog__foot"><button class="ui-btn">取消</button><button class="ui-btn ui-btn--primary">前往漫游</button></div>
        </div>
        <div class="ui-dialog">
          <div class="ui-dialog__title">提交成绩</div>
          <div class="ui-dialog__body"><p>提交后本次成绩将记录到本机存档，不可修改。确认提交？</p><p>若还有任务未完成，建议先返回检查；提交后无法撤回。</p></div>
          <div class="ui-dialog__foot"><button class="ui-btn">再检查一下</button><button class="ui-btn ui-btn--primary">确认提交</button></div>
        </div>
        <div class="ui-alert ui-alert--info" style="grid-column:1 / -1">
          <span class="u${icon('info', 14)}-alert__icon">i</span>
          <span>规范：宽 520px；标题 54px；正文 24px 内边距；底部右对齐双按钮（次按钮在左、主按钮在右）。4 类语义：返回 / 退出 / 跳转 / 提交。</span>
        </div>
      </div>`,
  },

  // ------------------------------------------- A9 功能条伸缩（替换原"遮罩休眠"）
  {
    id: 'A9',
    file: 'a9-sleep.html',
    title: '常驻 · 功能条伸缩两态（原「休眠」）',
    state: '常驻',
    crumb: '组件规范',
    right: '',
    body: `
      <div style="padding:24px 32px;display:flex;flex-direction:column;gap:20px">
        <div class="ui-alert ui-alert--info">
          <span class="u${icon('info', 14)}-alert__icon">i</span>
          <span>
            <b>休眠不是遮罩。</b>无操作达到阈值后，把<b>可伸缩的功能条自动收起</b>（只留把手），并暂停三维渲染；
            鼠标移动 / 点击把手即恢复。<b>标题栏与右上返回按钮永不收起</b>，始终给用户出口。
          </span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div>
            <div class="ui-h2" style="margin-bottom:10px">① 展开态（默认）</div>
            <div class="demo-frame">
              <div style="position:absolute;top:0;left:0;right:0">
                ${MINI_ROUTE}
              </div>
              <div class="ui-bar__handle" style="margin-top:6px"></div>
              ${topRight('')}
              <div class="ui-tips-float" style="right:14px;bottom:14px;width:280px">
                <div class="ui-tips-float__head"><span>当前步骤提示</span><span class="ui-tips-float__actions"><span class="ui-tips-float__icon">${icon('chevron-down', 14)}</span></span></div>
                <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">调节旋钮使读数稳定</span></div>
              </div>
            </div>
          </div>
          <div>
            <div class="ui-h2" style="margin-bottom:10px">② 收起态（无操作 N 分钟后）</div>
            <div class="demo-frame">
              <div class="ui-bar--collapsed" style="position:absolute;top:0;left:0;right:0">${MINI_ROUTE}</div>
              <div class="ui-bar__handle" style="position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:6"></div>
              ${topRight('')}
              <div class="ui-center ui-muted ui-small" style="position:absolute;inset:0;justify-content:center">三维渲染已暂停（省电）<br>移动鼠标或点击上方把手即可恢复</div>
            </div>
          </div>
        </div>

        <div>
          <div class="ui-h2" style="margin-bottom:10px">哪些条可伸缩</div>
          <div class="ui-panel">
            <div class="ui-panel__body ui-col" style="gap:8px">
              <div class="ui-row"><span class="ui-badge ui-badge--info">可收起</span><span class="ui-small">任务站点线（页签栏）</span></div>
              <div class="ui-row"><span class="ui-badge ui-badge--info">可收起</span><span class="ui-small">提示浮窗（可单独最小化为一行）</span></div>
              <div class="ui-row"><span class="ui-badge ui-badge--info">可收起</span><span class="ui-small">三维页的悬浮工具条</span></div>
              <div class="ui-row"><span class="ui-badge ui-badge--err">永不收起</span><span class="ui-small">标题栏 + 右上返回按钮（用户出口）</span></div>
              <div class="ui-row"><span class="ui-badge ui-badge--err">永不收起</span><span class="ui-small">模态框（有未确认的操作时）</span></div>
            </div>
          </div>
        </div>

        <div class="ui-row" style="gap:16px">
          <span class="ui-small ui-muted">把手形态</span>
          <span style="width:120px;display:flex;flex-direction:column;align-items:center;gap:2px"><span class="ui-bar__handle"></span></span>
          <span class="ui-small ui-muted">收起后条高为 0，仅保留 4px 把手；悬停把手变主色</span>
          <span class="ui-bar-toggle">${icon('chevron-up', 14)} 展开功能条</span>
        </div>
      </div>`,
    statusbar: false,
  },

  // ------------------------------------------------------------------ A10
  {
    id: 'A10',
    file: 'a10-ai.html',
    title: '常驻 · AI 助理浮窗（含思考气泡）',
    state: '常驻（可开关）',
    crumb: '实验 / 仿真实验',
    body: `
      <div style="position:absolute;inset:0">
        <div class="ui-viewport" style="position:absolute;inset:0">
          <div class="ui-viewport__hint">Unity WebGL · 仿真实验</div>
          <div class="ui-viewport__center">三维画布区域（Unity 侧 UI 暂不设计）</div>
        </div>
        ${topRight('')}
        <div class="ui-ai">
          <div class="ui-ai__head">AI 实验助理<span class="ui-grow"></span><span class="ui-badge">实验内容问答</span></div>
          <div class="ui-ai__body">
            <div class="ui-ai__msg ui-ai__msg--me">刚才那步为什么判我错了？</div>

            <!-- 思考气泡：三点跳动 + 过程说明 -->
            <div class="ui-ai__msg ui-ai__msg--ai" style="min-width:200px">
              <div class="ui-ai__thinking"><i></i><i></i><i></i></div>
              <div class="ui-ai__steps" style="margin-top:8px">
                <span class="ui-ai__step--done">✓ 已读取当前步骤：调节旋钮</span>
                <span class="ui-ai__step--done">✓ 已读取你的操作：旋钮停在电阻档</span>
                <span>… 正在核对量程规则</span>
              </div>
            </div>

            <div class="ui-ai__msg ui-ai__msg--ai">你把量程档位放在了电阻档，而本步要求测电压 —— 档位与测量对象不匹配，所以不通过。</div>
          </div>
          <div class="ui-ai__foot">
            <input class="ui-input" placeholder="描述你的问题…">
            <button class="ui-btn ui-btn--sm">截图</button>
            <button class="ui-btn ui-btn--primary ui-btn--sm">发送</button>
          </div>
        </div>
        <div class="note">A10 · <b>AI 浮窗</b> · 新增<b>思考气泡</b>（三点跳动 + 正在做什么），避免"发出去没反应"的空白等待</div>
      </div>`,
    statusbar: false,
  },

  // ------------------------------------------------------------------ B1
  {
    id: 'B1',
    file: 'b1-content-shell.html',
    title: '项目内容页壳（区域划分）',
    state: 'UI',
    crumb: CRUMB,
    right: RIGHT,
    statusbar: false,
    body: `${route('Equipment', ['Purpose'])}
      <div style="position:absolute;inset:0">
        ${topRight('')}
        <div style="position:absolute;left:24px;right:24px;top:24px;bottom:24px;border:1px dashed var(--line-2);border-radius:12px;display:flex;align-items:center;justify-content:center">
          <div class="ui-col" style="align-items:center;gap:10px">
            <div class="ui-h2">任务页插槽</div>
            <div class="ui-muted ui-small">此区域由当前 TaskType 对应的页面填充（见 C1~C11）</div>
            <div class="ui-row">
              <span class="ui-badge ui-badge--info">Three.js 页：同页 3D 渲染</span>
              <span class="ui-badge ui-badge--info">Unity 页：挂载 WebGL 实例</span>
            </div>
          </div>
        </div>
        ${company()}
        ${tipsFloat('选择实验仪器', '点击左侧列表中的仪器，可在中间三维区域查看')}
      </div>
      <div class="note">B1 · <b>内容页壳</b> · 站点线导航（不是 tab）+ 右上按钮组（返回在这里）+ 提示浮窗 + <b>无底部固定栏</b></div>`,
  },

  // ------------------------------------------------------------------ B2
  {
    id: 'B2',
    file: 'b2-task-tabs.html',
    title: '任务站点线（11 个 TaskType）',
    state: 'UI',
    crumb: '组件规范',
    right: '',
    statusbar: false,
    body: `
      <div style="padding:24px 32px;display:flex;flex-direction:column;gap:24px">
        <div>
          <div class="ui-h2" style="margin-bottom:10px">完整形态（11 站，含技术栈标记）</div>
          <div style="border:1px dashed var(--line-2);border-radius:12px;overflow:hidden">
${route('Training', ['Purpose', 'Equipment', 'Principle'])}
          </div>
        </div>

        <div>
          <div class="ui-h2" style="margin-bottom:10px">四种站点状态</div>
          <div style="border:1px dashed var(--line-2);border-radius:12px;overflow:hidden">
            <nav class="ui-route" style="padding:16px 24px 10px">
              <div class="ui-route__stop ui-route__stop--done"><span class="ui-route__dot">${icon('check', 15)}</span><span class="ui-route__label">任务目的</span></div>
              <span class="ui-route__seg ui-route__seg--done"></span>
              <div class="ui-route__stop ui-route__stop--current"><span class="ui-route__dot">2</span><span class="ui-route__label">实验仪器</span></div>
              <span class="ui-route__seg"></span>
              <div class="ui-route__stop"><span class="ui-route__dot">3</span><span class="ui-route__label">实验原理</span></div>
              <span class="ui-route__seg"></span>
              <div class="ui-route__stop ui-route__stop--locked"><span class="ui-route__dot">4</span><span class="ui-route__label">电路连接（未开放）</span></div>
            </nav>
          </div>
          <div class="ui-row" style="margin-top:12px;gap:16px;flex-wrap:wrap">
            <span class="ui-small"><span class="ui-badge ui-badge--ok">${icon('check', 14)}</span> 已完成</span>
            <span class="ui-small"><span class="ui-badge ui-badge--info">实心+光晕</span> 当前站</span>
            <span class="ui-small"><span class="ui-badge">空心</span> 未开始</span>
            <span class="ui-small"><span class="ui-badge ui-badge--warn">半透明</span> 未开放（active:false）</span>
          </div>
        </div>

        <div>
          <div class="ui-h2" style="margin-bottom:10px">窄屏（移动端：横向滚动，只显示当前站附近）</div>
          <div style="width:880px;border:1px dashed var(--line-2);border-radius:12px;overflow:hidden">
${route('LineConnection', ['Purpose', 'Equipment'], { narrow: true })}
          </div>
        </div>

        <div class="ui-alert ui-alert--warn">
          <span class="ui-alert__icon">${icon('triangle-alert', 14)}</span>
          <span>站点顺序即 <b>TaskType 枚举序号</b>（DEC-09 只许往后追加）；站点是<b>技术栈分流开关</b>（DEC-06），标记必须与实际承载一致。</span>
        </div>
      </div>`,
  },

  // ------------------------------------------------------------------ B3
  {
    id: 'B3',
    file: 'b3-loading-assets.html',
    title: '任务切换 · 资产加载遮罩',
    state: 'UI',
    crumb: CRUMB,
    statusbar: false,
    body: `${route('Training', ['Purpose']) }
      <div style="position:absolute;inset:0;background:var(--bg-1)"></div>
      <div class="ui-mask" style="z-index:50">
        <div class="ui-panel" style="width:560px">
          <div class="ui-panel__head">正在切换到「仿真实验」</div>
          <div class="ui-panel__body ui-col" style="gap:16px">
            <div class="ui-row"><div class="ui-loading-ring ui-loading-ring--sm"></div><span>加载 Unity WebGL 运行时与分包资源…</span></div>
            <div>
              <div class="ui-progress"><div class="ui-progress__bar" style="width:42%"></div></div>
              <div class="ui-row" style="justify-content:space-between;margin-top:8px">
                <span class="ui-muted ui-small">training.pack · 18.6 MB</span>
                <span class="ui-small" style="color:var(--accent-2)">42%</span>
              </div>
            </div>
            <div class="ui-muted ui-small">该站由 Unity 承载（DEC-06），首次进入需下载分包；同一会话内再进入会走缓存。</div>
            <button class="ui-btn ui-btn--sm" style="align-self:flex-start">取消并返回</button>
          </div>
        </div>
      </div>
      <div class="note" style="z-index:60">B3 · <b>资产加载遮罩</b> · 这里是真遮罩（阻塞式，且必须可取消），与 A9 的"功能条伸缩"不是一回事</div>`,
  },

  // ------------------------------------------------------------------ B4
  {
    id: 'B4',
    file: 'b4-corner-bar.html',
    title: '右上按钮组（含返回）',
    state: 'UI / Roaming',
    crumb: '组件规范',
    right: '',
    statusbar: false,
    body: `
      <div style="padding:26px 32px;display:flex;flex-direction:column;gap:24px">
        <div>
          <div class="ui-h2" style="margin-bottom:10px">内容页（返回固定在第一个）</div>
          <div class="demo-frame" style="height:150px">
            <div style="position:absolute;left:0;right:0;top:0">${MINI_ROUTE}</div>
            ${topRight('')}
            <div class="ui-center ui-muted ui-small" style="position:absolute;inset:0;justify-content:center">三维 / 内容区域</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div class="ui-panel">
            <div class="ui-panel__head">按钮清单</div>
            <div class="ui-panel__body ui-col" style="gap:10px">
              <div class="ui-row"><button class="ui-iconbtn ui-iconbtn--back">${icon('arrow-left', 14)} 返回目录</button><span class="ui-small ui-muted">主入口，永远第一个、永远可见</span></div>
              <div class="ui-row"><button class="ui-iconbtn ui-iconbtn--icon">${icon('maximize', 15)}</button><span class="ui-small ui-muted">全屏</span></div>
              <div class="ui-row"><button class="ui-iconbtn ui-iconbtn--icon">${icon('sliders-horizontal', 15)}</button><span class="ui-small ui-muted">画质</span></div>
              <div class="ui-row"><button class="ui-iconbtn ui-iconbtn--icon">${icon('circle-help', 15)}</button><span class="ui-small ui-muted">帮助</span></div>
              <div class="ui-row"><button class="ui-iconbtn ui-iconbtn--icon">${icon('menu', 15)}</button><span class="ui-small ui-muted">窄屏时收进菜单抽屉</span></div>
            </div>
          </div>
          <div class="ui-panel">
            <div class="ui-panel__head">规范</div>
            <div class="ui-panel__body ui-col" style="gap:8px">
              <span class="ui-small"><b>位置</b> 右上 right 18px / top 14px</span>
              <span class="ui-small"><b>高度</b> 34px；图标按钮 34×34</span>
              <span class="ui-small"><b>底色</b> rgba(22,32,46,.92) + 1px 描边</span>
              <span class="ui-small"><b>返回</b> 用主色语义（蓝底蓝字），与其它按钮区分</span>
              <span class="ui-small"><b>不再使用</b> 角落 fab 与左下菜单按钮（第一轮方案作废）</span>
            </div>
          </div>
        </div>

        <div class="ui-alert ui-alert--info">
          <span class="u${icon('info', 14)}-alert__icon">i</span>
          <span>返回是"离开当前页面"的唯一入口，必须在<b>标题栏下方的右上角</b>，不随功能条收起（见 A9）。</span>
        </div>
      </div>`,
  },

  // ------------------------------------------------------------------ B5
  {
    id: 'B5',
    file: 'b5-tips.html',
    title: '提示浮窗（步骤 / 操作）',
    state: 'UI（Principle / LineConnection / Training）',
    crumb: '组件规范',
    right: '',
    statusbar: false,
    body: `
      <div style="padding:26px 32px;display:grid;grid-template-columns:1fr 1fr;gap:22px">
        <div>
          <div class="ui-h2" style="margin-bottom:10px">① 展开态（默认）</div>
          <div class="demo-frame">
            <div class="ui-tips-float" style="right:14px;bottom:14px;width:330px">
              <div class="ui-tips-float__head"><span>当前步骤提示</span><span class="ui-tips-float__actions"><span class="ui-tips-float__icon">${icon('chevron-down', 14)}</span><span class="ui-tips-float__icon">${icon('x', 14)}</span></span></div>
              <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">把红色表笔接到 V+ 端子</span></div>
              <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--op">操作提示</span><span class="ui-tips__text">先确认电源已断电；接好后系统自动检测回路</span></div>
              <div class="ui-tips__img" style="width:100%;height:84px"></div>
            </div>
          </div>
        </div>
        <div>
          <div class="ui-h2" style="margin-bottom:10px">② 收起态（点右上角的收起箭头，最小化为一行）</div>
          <div class="demo-frame">
            <div class="ui-tips-float ui-tips-float--mini" style="right:14px;bottom:14px">
              <span class="ui-tips__tag ui-tips__tag--step">步骤</span>
              <span class="ui-tips__text">把红色表笔接到 V+ 端子</span>
              <span class="ui-tips-float__icon">${icon('chevron-up', 14)}</span>
            </div>
          </div>
        </div>
        <div>
          <div class="ui-h2" style="margin-bottom:10px">③ 半透明态（步骤完成后自动淡出）</div>
          <div class="demo-frame">
            <div class="ui-tips-float ui-tips-float--ghost" style="right:14px;bottom:14px;width:300px">
              <div class="ui-tips-float__head"><span>上一步已完成</span></div>
              <div class="ui-tips__row"><span class="ui-tips__tag ui-tips__tag--step">步骤提示</span><span class="ui-tips__text">把红色表笔接到 V+ 端子</span></div>
            </div>
          </div>
        </div>
        <div>
          <div class="ui-h2" style="margin-bottom:10px">规范</div>
          <div class="ui-panel">
            <div class="ui-panel__body ui-col" style="gap:8px">
              <span class="ui-small"><b>位置</b> 右下角 18px；避让右上按钮组</span>
              <span class="ui-small"><b>宽度</b> 展开 372px / 最小化自适应</span>
              <span class="ui-small"><b>顺序</b> 步骤提示（蓝）在上，操作提示（青）在下</span>
              <span class="ui-small"><b>不遮挡</b> 悬浮工具条与关键三维区域</span>
              <span class="ui-small"><b>已废弃</b> 第一轮的"底部固定提示栏"</span>
            </div>
          </div>
        </div>
      </div>`,
  },
]
