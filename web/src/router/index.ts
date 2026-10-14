import { createRouter, createWebHashHistory } from 'vue-router'
import { SceneState } from '@/contracts'
// 首屏（欢迎页）**同步导入**：它是入口，懒加载会让"打开的一瞬间"是空白（桌面壳里尤其明显）。
// 其余路由保持懒加载，按需切包。
import StartView from '@/views/StartView.vue'

/**
 * 路由表。
 *
 * 两条纪律写在这里：
 *   ① **hash 模式**：静态托管 + 任意子路径部署都不需要服务器 rewrite，
 *      也是桌面壳里 `file://` 与 `http://127.0.0.1` 两种加载方式都成立的前提（DEC-22 / DEC-20）。
 *   ② 每条路由声明自己的 `SceneState`（双端契约），由 `main.ts` 的守卫统一切状态 ——
 *      页面不要再自己 set，否则"当前处于哪个场景"会有多个真源。
 *
 * 页面分组对应排版稿：A 组（启动与导航）/ B 组（项目内主页面）/ C 组（任务页）/ D 组（考核与结算）。
 * Phase 1（DEC-75）做实：start / login / menu / task / debug；其余先给外壳就绪的占位页。
 *
 * **启动流程（DEC-101）**：`start → login → menu` —— 登录页是流程中的一站，不是可选旁路；
 * 它只提供游客入口（本期无后端、无登录校验），菜单页有"退出"回到这里。
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: { name: 'start' } },

    // —— A 组：启动与导航 ——
    {
      path: '/start',
      name: 'start',
      component: StartView,
      meta: { scene: SceneState.Start },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { scene: SceneState.Login },
    },
    {
      path: '/quality',
      name: 'quality',
      component: () => import('@/views/PlaceholderView.vue'),
      props: {
        title: '选择画面质量',
        desc: '标清 / 高清 / 超清三档，含推荐项与硬件提示（排版稿 A4）。选择结果写入本机设置，影响像素比上限与阴影开关。',
      },
      meta: { scene: SceneState.Setup },
    },

    // —— 项目内 ——
    {
      path: '/menu',
      name: 'menu',
      component: () => import('@/views/MenuView.vue'),
      meta: { scene: SceneState.Menu },
    },
    {
      path: '/task/:taskType(\\d+)',
      name: 'task',
      component: () => import('@/views/TaskView.vue'),
      meta: { scene: SceneState.UI },
    },
    {
      path: '/roaming',
      name: 'roaming',
      component: () => import('@/views/PlaceholderView.vue'),
      props: {
        title: '自由漫游',
        desc: '大场景漫游模式（排版稿 A6）：以第一人称在实验楼内行走，含小地图与碰撞。Phase 3 交付。',
      },
      meta: { scene: SceneState.Roaming },
    },

    // —— 骨架自检（原两个演示页的功能，保留为可运行证据）——
    {
      path: '/debug',
      name: 'debug',
      component: () => import('@/views/DebugView.vue'),
      meta: { scene: SceneState.Setup },
    },

    { path: '/:pathMatch(.*)*', redirect: { name: 'start' } },
  ],
})
