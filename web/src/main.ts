import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { initTheme } from './shell/theme'
import { useSessionStore } from './stores/session'
import { SceneState } from './contracts'
// 产品样式入口：只引用设计系统的 tokens + components（DEC-74），评审外壳不进来
import './styles/index.css'

// 主题要先于挂载生效，避免"先深后浅"的闪一下
initTheme()

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)

/**
 * 路由 → SceneState：`SceneState` 是双端契约（DEC-09），
 * 页面是不是"登录中"应当由**路由**决定，而不是散在各页面里各自 set。
 * 统一在这里映射，页面就只管呈现。
 */
router.beforeEach((to) => {
  const scene = to.meta.scene
  if (typeof scene === 'number') {
    useSessionStore(pinia).switchSceneState(scene as SceneState)
  }
  return true
})

app.mount('#app')
