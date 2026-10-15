/**
 * 页面 / 站间过渡的口径（Issue #57）。
 *
 * 两处过渡共用**同一对令牌**（`--dur-page` / `--ease-page`，见 `docs/ui-mockups/tokens.css` §22），
 * 所以节奏是统一的；差别只在"过渡哪一个区域"：
 *
 *   · `PAGE_TRANSITION`（`ui-page`）—— **路由级**：启动 / 登录 / 目录 / 任务页之间换整个视图。
 *     纯淡入淡出，不带位移（换的是整屏含整页底图，位移会露出底色缝）。
 *     落点：`App.vue` 的 `<router-view>`。
 *   · `STATION_TRANSITION`（`ui-station`）—— **站间级**：任务页内沿站点线前后翻站，只换主内容区。
 *     同节奏 + 极短位移。落点：`TaskView` 的 `.app-task`。
 */

import { TaskType } from '@/contracts'
import { isUnityTask } from './registry'

/** 路由级过渡名（`<Transition name="ui-page">`）—— 纯淡入淡出。 */
export const PAGE_TRANSITION = 'ui-page'

/** 站间级过渡名（`<Transition name="ui-station">`）—— 同一节奏 + 极短位移。 */
export const STATION_TRANSITION = 'ui-station'

/**
 * **Unity 站之间共用的站间 key**。
 *
 * 这是本文件存在的唯一理由，也是 Issue #57 列的那条红线：
 * Unity 实例是**常驻单例**（DEC-145），画布由 JS 在"任务页视口"与"停泊区"之间搬挂。
 * Vue 的 `<Transition>` 只在**子节点 key 变化**时才做离场/入场；key 一变，旧子树会被销毁、
 * 新子树重建 ⇒ 挂载点元素换了一个 ⇒ 画布被搬挂一次，并且整棵子树会按 `ui-station-*`
 * 淡出再淡入 —— 用户看到的就是 **WebGL 画布闪断**。
 *
 * 所以：**Unity 站共用一个恒定 key**（结构 ↔ 检测 ↔ 电路连接 ↔ 仿真实验 之间切换不触发过渡、
 * 不重建 DOM，画布原地不动），**非 Unity 站各自一个 key**（换站即过渡）。
 * 跨栈翻站（Unity ↔ Three）key 必然不同 ⇒ 走过渡，此时画布本来就要搬进/搬出，
 * 淡入淡出是期望行为而不是缺陷。
 *
 * ⚠️ 不要"优化"成 `station:${taskType}` —— 那等于把画布交给过渡去搬。
 */
const UNITY_STATION_KEY = 'station:unity'

/**
 * 站间过渡的 key。
 *
 * 取值只由"这一站是不是 Unity 承载"决定（技术栈归属的唯一权威是 `domain/registry` 的
 * `isUnityTask`，即 DEC-06），**与具体是哪一个 TaskType 无关** —— 见上面的红线说明。
 */
export function stationKeyOf(taskType: TaskType): string {
  return isUnityTask(taskType) ? UNITY_STATION_KEY : `station:${taskType}`
}
