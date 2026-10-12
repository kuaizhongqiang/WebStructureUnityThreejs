import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * hash 模式：静态托管 + 任意子路径部署都不需要服务器 rewrite（DEC-22）。
 * 若目标服务器可控且要求 history 模式，再改 history 并补 rewrite 规则。
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/pages/HomeView.vue') },
    { path: '/task/:taskType(\\d+)', name: 'task', component: () => import('@/pages/TaskView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
