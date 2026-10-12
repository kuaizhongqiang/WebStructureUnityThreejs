/** A 组（启动与导航）+ B 组（项目内主页面）排版稿。 */
import { tabs, tips, viewport, corners, company } from './parts.mjs'

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
        <div class="ui-h1" style="margin-top:26px">虚拟仿真教学平台</div>
        <div class="ui-muted" style="letter-spacing:3px;font-size:12px;margin-top:8px">VIRTUAL SIMULATION TEACHING PLATFORM</div>
        <div style="margin-top:12px;font-size:14px;color:var(--text-2)">教学实验 · 虚拟仿真 · 分步操作训练</div>
        <div class="ui-row" style="margin-top:40px;gap:16px">
          <button class="ui-btn ui-btn--primary ui-btn--lg ui-btn--pill">开始实验</button>
          <button class="ui-btn ui-btn--lg ui-btn--pill ui-btn--ghost">操作说明</button>
        </div>
        <div class="ui-row" style="margin-top:30px">
          <span class="ui-badge ui-badge--info">游客可直接进入（DEC-04）</span>
          <span class="ui-badge">纯静态 · 无后端（DEC-21）</span>
        </div>
        <div class="ui-muted" style="position:absolute;left:0;right:0;bottom:28px;text-align:center;font-size:11px">© 2026 虚拟仿真教学平台 · 首次进入会弹画质设置</div>
        <div class="note">A1 · <b>欢迎/开始页</b> · 居中主视觉 + 主次双按钮 + 底部版权</div>
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
        <div style="flex:1;position:relative;background:var(--grid);background-color:var(--bg-0);border-right:1px solid var(--line-1)">
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
            <select class="ui-select"><option>学生</option><option>教师</option><option>管理员</option></select>
            <div class="ui-field__hint">对应数据模型的 userType（未知 / 学生 / 教师 / 管理员）</div>
          </div>
          <div class="ui-row" style="justify-content:space-between">
            <label class="ui-check ui-check--on"><span class="ui-check__box">✓</span>记住我</label>
            <span class="ui-muted ui-small">忘记密码？</span>
          </div>
          <button class="ui-btn ui-btn--primary ui-btn--block">登录</button>
          <button class="ui-btn ui-btn--ghost ui-btn--block">以游客身份进入</button>
          <div class="ui-alert ui-alert--info">
            <span class="ui-alert__icon">i</span>
            <span>本期无后端（DEC-21）：登录仅作界面占位；进度与成绩保存在本机一个 JSON 里（DEC-54）。</span>
          </div>
        </div>
      </div>
      <div class="note">A2 · <b>登录页</b> · 左品牌区 + 右表单，游客入口并列主按钮</div>`,
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
      <div class="ui-center" style="height:100%;gap:22px">
        <div class="ui-loading-ring"></div>
        <div class="ui-h2">正在加载实验环境…</div>
        <div style="width:620px">
          <div class="ui-progress ui-progress--lg"><div class="ui-progress__bar" style="width:64%"></div></div>
          <div class="ui-row" style="justify-content:space-between;margin-top:10px">
            <span class="ui-muted ui-small">当前阶段：加载三维资源（Addressables 分包）</span>
            <span class="ui-small" style="color:var(--accent-2)">64%</span>
          </div>
        </div>
        <div class="ui-muted ui-small" style="margin-top:6px">首次加载较慢；后续进入同一实验会命中缓存</div>
        <div class="note">A3 · <b>加载过渡页</b> · 环形进度 + 条形进度 + 阶段文案（对应参考工程 LoadingPanel）</div>
      </div>`,
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
        <div class="ui-tile-grid" style="width:1180px;grid-template-columns:repeat(3,1fr)">
          <div class="ui-tile">
            <div class="ui-tile__thumb"></div>
            <div class="ui-tile__name">标清</div>
            <div class="ui-tile__desc">低端集显 / 移动端推荐 · 关闭阴影与后处理</div>
          </div>
          <div class="ui-tile ui-tile--active">
            <div class="ui-tile__thumb"></div>
            <div class="ui-tile__name">高清 <span class="ui-badge ui-badge--ok">推荐</span></div>
            <div class="ui-tile__desc">独立显卡 / 桌面浏览器 · 开启基础阴影</div>
          </div>
          <div class="ui-tile">
            <div class="ui-tile__thumb"></div>
            <div class="ui-tile__name">超清</div>
            <div class="ui-tile__desc">高性能显卡 · 全特效，首次加载更慢</div>
          </div>
        </div>
        <div class="ui-alert ui-alert--warn" style="width:1180px">
          <span class="ui-alert__icon">!</span>
          <span>检测到当前设备为 <b>移动端浏览器</b>（微信内置）：建议选择「标清」，并优先使用电脑浏览器体验三维实验（DEC-70）。</span>
        </div>
        <div class="ui-row" style="margin-top:6px">
          <button class="ui-btn ui-btn--primary">确定并进入</button>
          <button class="ui-btn ui-btn--ghost">使用推荐值</button>
        </div>
        <div class="note">A4 · <b>画质设置</b> · 三档卡片 + 硬件提示（对应参考工程 RenderQualityPanel）</div>
      </div>`,
  },

  // ------------------------------------------------------------------ A5
  {
    id: 'A5',
    file: 'a5-menu.html',
    title: '菜单 / 项目列表页',
    state: 'Menu',
    crumb: '目录',
    body: `
      <div style="padding:22px 32px;height:100%;display:flex;flex-direction:column;gap:16px">
        <div class="ui-row">
          <div class="ui-h2">实验项目</div>
          <span class="ui-badge">共 17 个（示例）</span>
          <div class="ui-grow"></div>
          <input class="ui-input" style="width:280px" placeholder="搜索项目名称 / 关键词">
          <select class="ui-select" style="width:170px"><option>全部</option><option>未开始</option><option>已完成</option></select>
          <button class="ui-btn ui-btn--sm">去漫游</button>
          <button class="ui-btn ui-btn--sm">我的成绩</button>
          <button class="ui-btn ui-btn--sm ui-btn--danger">退出</button>
        </div>

        <div class="ui-alert ui-alert--info">
          <span class="ui-alert__icon">i</span>
          <span>点项目进入实验；每个项目包含 11 个任务页签，其中 4 个为 Unity 承载的复杂三维（DEC-06）。</span>
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

        <div class="ui-row" style="gap:20px">
          <span class="ui-small ui-muted">总体进度</span>
          <div class="ui-progress" style="width:420px"><div class="ui-progress__bar" style="width:27%"></div></div>
          <span class="ui-small" style="color:var(--accent-2)">27%</span>
          <div class="ui-grow"></div>
          <span class="ui-small ui-muted">最近一次：项目 03 · 小测验 · 88 分</span>
        </div>
      </div>
      <div class="note">A5 · <b>菜单 / 项目列表</b> · 工具条（搜索/筛选/漫游/成绩/退出）+ 卡片网格 + 进度概览</div>`,
  },

  // ------------------------------------------------------------------ A6
  {
    id: 'A6',
    file: 'a6-roaming.html',
    title: '漫游大场景页',
    state: 'Roaming',
    crumb: '漫游 / 实验楼一层',
    body: `
      <div style="position:absolute;inset:0">
${viewport('Unity WebGL', '漫游场景')}
        <!-- 底部操作提示（3 条淡入淡出，对应参考工程 RoamingBottomPanel） -->
        <div style="position:absolute;left:50%;bottom:96px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center">
          <div class="ui-toast" style="position:static;transform:none">W / A / S / D 移动 · 鼠标右键拖拽转视角</div>
          <div class="ui-toast" style="position:static;transform:none;opacity:.75">对准设备后点击左键，查看该实验项目的介绍</div>
          <div class="ui-toast" style="position:static;transform:none;opacity:.5">按 ESC 打开目录，可切换到其它实验</div>
        </div>

        <!-- 点选物体后的信息浮窗（对应 RoamingContentShowPanel） -->
        <div class="ui-panel" style="position:absolute;right:36px;top:130px;width:400px">
          <div class="ui-panel__head">设备信息<span class="ui-panel__right"><span class="ui-badge ui-badge--info">可进入</span></span></div>
          <div class="ui-panel__body ui-col">
            <div style="font-size:var(--fs-16);font-weight:600">实验台 03 · 温度传感器</div>
            <div class="ui-muted ui-small">该设备对应教学项目：温度传感器特性测量（11 个任务页签）</div>
            <div class="ui-row" style="gap:8px">
              <span class="ui-badge">进度 3 / 11</span>
              <span class="ui-badge ui-badge--warn">推荐先看「任务目的」</span>
            </div>
            <button class="ui-btn ui-btn--primary ui-btn--block">进入该项目</button>
          </div>
        </div>

        <div class="ui-fab" style="position:absolute;left:36px;top:130px"><span class="ui-fab__icon">◎</span>复位</div>
      </div>
      <div class="note">A6 · <b>漫游大场景</b> · 三维主视图 + 底部操作提示 + 点选信息浮窗（参考工程的漫游链路是断的，此处为本项目自研）</div>`,
  },

  // ------------------------------------------------------------------ A7
  {
    id: 'A7',
    file: 'a7-titlebar.html',
    title: '常驻 · 顶部标题栏（3 种形态）',
    state: '常驻',
    crumb: '组件规范',
    right: '',
    body: `
      <div style="padding:26px 32px;display:flex;flex-direction:column;gap:26px">
        <div>
          <div class="ui-h2" style="margin-bottom:10px">形态 1 · 内容页（项目内）</div>
          <div style="border:1px dashed var(--line-2);border-radius:12px;overflow:hidden">
            <header class="ui-titlebar" style="border-bottom:none">
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
          <div style="border:1px dashed var(--line-2);border-radius:12px;overflow:hidden">
            <header class="ui-titlebar" style="border-bottom:none">
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
          <div style="width:760px;border:1px dashed var(--line-2);border-radius:12px;overflow:hidden">
            <header class="ui-titlebar" style="border-bottom:none;height:64px">
              <div class="ui-titlebar__logo" style="width:34px;height:34px;font-size:14px">仿</div>
              <div class="ui-titlebar__names"><div class="ui-titlebar__cn" style="font-size:15px">温度传感器特性测量</div></div>
              <div class="ui-titlebar__right"><span class="ui-badge">3 / 11</span><span class="ui-fab" style="width:34px;height:34px"><span class="ui-fab__icon">☰</span></span></div>
            </header>
          </div>
        </div>
        <div class="ui-alert ui-alert--info">
          <span class="ui-alert__icon">i</span>
          <span>规范：高 84px（窄屏 64px）；左 LOGO 44px + 中英双行；右侧依次为 面包屑 → 进度 → 画质 → 用户。</span>
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
          <div class="ui-dialog__body">当前实训尚未完成（进度 3 / 11），返回后进度会保留在本机。确定要返回目录吗？</div>
          <div class="ui-dialog__foot"><button class="ui-btn">继续实验</button><button class="ui-btn ui-btn--primary">返回目录</button></div>
        </div>
        <div class="ui-dialog">
          <div class="ui-dialog__title">退出平台？</div>
          <div class="ui-dialog__body">退出后未提交的成绩将不会保存。确定退出吗？</div>
          <div class="ui-dialog__foot"><button class="ui-btn">取消</button><button class="ui-btn ui-btn--danger">退出</button></div>
        </div>
        <div class="ui-dialog">
          <div class="ui-dialog__title">切换到漫游场景</div>
          <div class="ui-dialog__body">即将离开当前实验场景进入漫游。切换过程需要重新加载三维资源，可能需要十几秒。</div>
          <div class="ui-dialog__foot"><button class="ui-btn">取消</button><button class="ui-btn ui-btn--primary">前往漫游</button></div>
        </div>
        <div class="ui-dialog">
          <div class="ui-dialog__title">提交成绩</div>
          <div class="ui-dialog__body">提交后本次成绩将记录到本机存档，不可修改。确认提交？</div>
          <div class="ui-dialog__foot"><button class="ui-btn">再检查一下</button><button class="ui-btn ui-btn--primary">确认提交</button></div>
        </div>
        <div class="ui-alert ui-alert--info" style="grid-column:1 / -1">
          <span class="ui-alert__icon">i</span>
          <span>规范：宽 520px；标题 54px；正文 24px 内边距；底部右对齐双按钮（次按钮在左、主按钮在右）；遮罩 rgba(5,8,12,.72)。共 4 类语义：返回 / 退出 / 跳转 / 提交。</span>
        </div>
      </div>`,
    overlay: `
      <div class="ui-mask" style="background:transparent;align-items:flex-start;justify-content:flex-end;padding:16px 24px;z-index:20">
        <span class="ui-badge ui-badge--warn">真实使用时遮罩会覆盖整个内容区</span>
      </div>`,
  },

  // ------------------------------------------------------------------ A9
  {
    id: 'A9',
    file: 'a9-sleep.html',
    title: '常驻 · 沉睡 / 唤醒遮罩',
    state: '常驻',
    crumb: '组件规范',
    right: '',
    body: `
      <div class="ui-sleepmask" style="position:absolute;inset:0">
        <div style="font-size:40px;opacity:.5">◍</div>
        <div class="ui-h2">已进入休眠</div>
        <div class="ui-muted ui-small">超过 3 分钟无操作，已暂停三维渲染以节省性能</div>
        <button class="ui-btn ui-btn--primary ui-btn--lg ui-btn--pill" style="margin-top:10px">点击任意处继续</button>
      </div>
      <div class="note" style="z-index:70">A9 · <b>沉睡遮罩</b> · 无操作 N 分钟后暂停渲染（对应参考工程 SleepTipsPanel）</div>`,
  },

  // ------------------------------------------------------------------ A10
  {
    id: 'A10',
    file: 'a10-ai.html',
    title: '常驻 · AI 助理浮窗',
    state: '常驻（可开关）',
    crumb: '实验 / 仿真实验',
    body: `
      <div style="position:absolute;inset:0">
${viewport('Unity WebGL', '仿真实验')}
        <div class="ui-ai">
          <div class="ui-ai__head">AI 实验助理<span class="ui-grow"></span><span class="ui-badge">实验内容问答</span></div>
          <div class="ui-ai__body">
            <div class="ui-ai__msg ui-ai__msg--ai">当前步骤是「调节旋钮使读数稳定」。需要我解释一下这个参数的含义吗？</div>
            <div class="ui-ai__msg ui-ai__msg--me">刚才那步为什么判我错了？</div>
            <div class="ui-ai__msg ui-ai__msg--ai">你把量程档位放在了电阻档，而本步要求测电压——档位与测量对象不匹配，所以不通过。</div>
          </div>
          <div class="ui-ai__foot">
            <input class="ui-input" placeholder="描述你的问题…">
            <button class="ui-btn ui-btn--sm">截图</button>
            <button class="ui-btn ui-btn--primary ui-btn--sm">发送</button>
          </div>
        </div>
      </div>
      <div class="note">A10 · <b>AI 助理浮窗</b> · 右下角 380px 宽；本期只做界面与预留入口（DEC-43），不实现真实问答</div>`,
  },

  // ------------------------------------------------------------------ B1
  {
    id: 'B1',
    file: 'b1-content-shell.html',
    title: '项目内容页壳（区域划分）',
    state: 'UI',
    crumb: '目录 / <b>温度传感器特性测量</b>',
    right: '<span class="ui-badge ui-badge--ok">已完成 3 / 11</span><span class="ui-badge ui-badge--info">高清</span><span class="ui-badge">游客</span>',
    body: `${tabs('Equipment', ['Purpose'])}
      <div style="position:absolute;inset:0;padding:18px 24px">
        <div style="border:1px dashed var(--line-2);border-radius:12px;height:100%;display:flex;align-items:center;justify-content:center;position:relative">
          <div class="ui-col" style="align-items:center;gap:10px">
            <div class="ui-h2">任务页插槽</div>
            <div class="ui-muted ui-small">此区域由当前 TaskType 对应的页面填充（见 C1~C11）</div>
            <div class="ui-row">
              <span class="ui-badge ui-badge--info">Three.js 页：同页 3D 渲染</span>
              <span class="ui-badge ui-badge--info">Unity 页：挂载 WebGL 实例</span>
            </div>
          </div>
          ${corners()}
          ${company()}
          <div style="position:absolute;left:18px;bottom:18px;right:18px">
${tips('本步：选择实验仪器', '点击左侧列表中的仪器名称，可在中间三维区域查看该仪器', true)}
          </div>
        </div>
      </div>
      <div class="note">B1 · <b>项目内容页壳</b> · 顶部标题栏 + 页签栏 + 任务页插槽 + 角落按钮 + 底部提示栏</div>`,
  },

  // ------------------------------------------------------------------ B2
  {
    id: 'B2',
    file: 'b2-task-tabs.html',
    title: '任务页签栏（11 个 TaskType）',
    state: 'UI',
    crumb: '组件规范',
    right: '',
    body: `
      <div style="padding:26px 32px;display:flex;flex-direction:column;gap:26px">
        <div>
          <div class="ui-h2" style="margin-bottom:10px">完整形态（11 个页签，含技术栈标记）</div>
          <div style="border:1px dashed var(--line-2);border-radius:12px;overflow:hidden">
${tabs('Training', ['Purpose', 'Equipment', 'Principle'])}
          </div>
        </div>
        <div>
          <div class="ui-h2" style="margin-bottom:10px">状态说明</div>
          <div style="border:1px dashed var(--line-2);border-radius:12px;overflow:hidden">
            <nav class="ui-tabs">
              <div class="ui-tab ui-tab--done">任务目的<span class="ui-tab__stack ui-tab__stack--three">Three</span></div>
              <div class="ui-tab ui-tab--active">实验仪器<span class="ui-tab__stack ui-tab__stack--three">Three</span></div>
              <div class="ui-tab">实验原理<span class="ui-tab__stack ui-tab__stack--three">Three</span></div>
              <div class="ui-tab ui-tab--disabled">电路连接<span class="ui-tab__stack ui-tab__stack--unity">Unity</span></div>
            </nav>
          </div>
          <div class="ui-row" style="margin-top:12px;gap:16px">
            <span class="ui-small"><span class="ui-badge ui-badge--ok">✓</span> 已完成（页签右侧打勾）</span>
            <span class="ui-small"><span class="ui-badge ui-badge--info">高亮</span> 当前页（顶部 2px 主色条）</span>
            <span class="ui-small"><span class="ui-badge">灰</span> 未开始</span>
            <span class="ui-small"><span class="ui-badge ui-badge--warn">灰+禁止</span> 内容未开放（active:false）</span>
          </div>
        </div>
        <div>
          <div class="ui-h2" style="margin-bottom:10px">窄屏形态（移动端，横向滚动 + 两端渐隐）</div>
          <div style="width:900px;border:1px dashed var(--line-2);border-radius:12px;overflow:hidden;display:flex;align-items:center">
            <span class="ui-muted" style="padding:0 10px">‹</span>
            <nav class="ui-tabs" style="border-bottom:none">
              <div class="ui-tab ui-tab--done">任务目的</div>
              <div class="ui-tab ui-tab--active">实验仪器</div>
              <div class="ui-tab">实验原理</div>
              <div class="ui-tab ui-tab--disabled">电路连接</div>
            </nav>
            <span class="ui-muted" style="padding:0 10px">›</span>
          </div>
        </div>
        <div class="ui-alert ui-alert--warn">
          <span class="ui-alert__icon">!</span>
          <span>页签顺序即 <b>TaskType 枚举序号</b>（DEC-09 只许往后追加）；页签是<b>技术栈分流开关</b>（DEC-06），标记必须与实际承载一致。</span>
        </div>
      </div>`,
  },

  // ------------------------------------------------------------------ B3
  {
    id: 'B3',
    file: 'b3-loading-assets.html',
    title: '任务切换 · 资产加载遮罩',
    state: 'UI',
    crumb: '目录 / <b>温度传感器特性测量</b>',
    body: `${tabs('Training', ['Purpose']) }
      <div style="position:absolute;inset:0;background:var(--bg-1)"></div>
      <div class="ui-mask" style="z-index:50">
        <div class="ui-panel" style="width:560px">
          <div class="ui-panel__head">正在切换到「仿真实验」</div>
          <div class="ui-panel__body ui-col" style="gap:16px">
            <div class="ui-row"><div class="ui-loading-ring" style="width:34px;height:34px;border-width:3px"></div><span>加载 Unity WebGL 运行时与分包资源…</span></div>
            <div>
              <div class="ui-progress"><div class="ui-progress__bar" style="width:42%"></div></div>
              <div class="ui-row" style="justify-content:space-between;margin-top:8px">
                <span class="ui-muted ui-small">training.pack · 18.6 MB</span>
                <span class="ui-small" style="color:var(--accent-2)">42%</span>
              </div>
            </div>
            <div class="ui-muted ui-small">该页由 Unity 承载（DEC-06），首次进入需下载分包；同一会话内再进入会走缓存。</div>
            <button class="ui-btn ui-btn--sm" style="align-self:flex-start">取消并返回</button>
          </div>
        </div>
      </div>
      <div class="note" style="z-index:60">B3 · <b>资产加载遮罩</b> · 对应参考工程 LoadingAssetsPanel；「可取消」是必需项</div>`,
  },

  // ------------------------------------------------------------------ B4
  {
    id: 'B4',
    file: 'b4-corner-bar.html',
    title: '角落操作条（右上 / 左下）',
    state: 'UI / Roaming',
    crumb: '组件规范',
    right: '',
    body: `
      <div style="padding:26px 32px;display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div class="ui-panel">
          <div class="ui-panel__head">右上功能组（内容页）</div>
          <div class="ui-panel__body ui-row" style="justify-content:center;padding:34px 0">
            <div class="ui-fab"><span class="ui-fab__icon">☰</span>目录</div>
            <div class="ui-fab"><span class="ui-fab__icon">⛶</span>全屏</div>
            <div class="ui-fab"><span class="ui-fab__icon">◐</span>画质</div>
            <div class="ui-fab"><span class="ui-fab__icon">?</span>帮助</div>
          </div>
        </div>
        <div class="ui-panel">
          <div class="ui-panel__head">左下功能组（项目内 / 漫游）</div>
          <div class="ui-panel__body ui-row" style="justify-content:center;padding:34px 0">
            <div class="ui-fab"><span class="ui-fab__icon">←</span>菜单</div>
            <div class="ui-fab"><span class="ui-fab__icon">◎</span>复位视角</div>
          </div>
        </div>
        <div class="ui-panel" style="grid-column:1 / -1">
          <div class="ui-panel__head">规范</div>
          <div class="ui-panel__body">
            <div class="ui-row" style="gap:26px;flex-wrap:wrap">
              <span class="ui-small"><b>尺寸</b> 56×56 圆角 8px</span>
              <span class="ui-small"><b>图标</b> 16px + 文字 11px 竖排</span>
              <span class="ui-small"><b>右上定位</b> right 28px / top 100px</span>
              <span class="ui-small"><b>左下定位</b> left 28px / bottom 44px</span>
              <span class="ui-small"><b>底色</b> rgba(22,32,46,.92) + 1px 描边</span>
              <span class="ui-small"><b>悬停</b> 描边变主色</span>
            </div>
          </div>
        </div>
      </div>`,
  },

  // ------------------------------------------------------------------ B5
  {
    id: 'B5',
    file: 'b5-tips.html',
    title: '步骤提示 + 操作提示栏',
    state: 'UI（Principle / LineConnection / Training）',
    crumb: '组件规范',
    right: '',
    body: `
      <div style="padding:26px 32px;display:flex;flex-direction:column;gap:22px">
        <div class="ui-h2">标准形态（带示意图）</div>
${tips('把红色表笔接到 U1 的 V+ 端子', '注意量程档位：先把旋钮转到直流电压档，再插入表笔', true)}

        <div class="ui-h2">无示意图（纯文字步骤）</div>
${tips('选择「任务目的」页签开始了解本实验', '可随时通过右上角「目录」返回项目列表', false)}

        <div class="ui-h2">步骤进度条（同一栏内）</div>
        <div class="ui-panel">
          <div class="ui-panel__body">
            <div class="ui-steps">
              <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>接通电源</div>
              <span class="ui-step__line"></span>
              <div class="ui-step ui-step--done"><span class="ui-step__dot">✓</span>选择量程</div>
              <span class="ui-step__line"></span>
              <div class="ui-step ui-step--current"><span class="ui-step__dot">3</span>连接表笔</div>
              <span class="ui-step__line"></span>
              <div class="ui-step"><span class="ui-step__dot">4</span>读取数值</div>
              <span class="ui-step__line"></span>
              <div class="ui-step"><span class="ui-step__dot">5</span>记录数据</div>
            </div>
          </div>
        </div>

        <div class="ui-alert ui-alert--info">
          <span class="ui-alert__icon">i</span>
          <span>规范：提示栏贴底（内容区左右 18px、下 18px）；两块信息固定顺序 —— <b>步骤提示</b>（蓝）在上、<b>操作提示</b>（青）在下；示意图 168×96。</span>
        </div>
      </div>`,
  },
]
