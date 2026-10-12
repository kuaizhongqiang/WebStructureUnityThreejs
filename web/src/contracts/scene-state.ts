/**
 * SceneState —— 双端共享契约（Web 侧）。
 *
 * 契约来源（只读参考，勿改）：
 *   F:\Project\MCV_Module\packages\com.mcv.core\Runtime\Models\EnumAll.cs:137-152
 *
 * 纪律（docs/DECISIONS.md DEC-09）：
 *   - 只许**往后追加**，不得插值、改序、改名；
 *   - 中文标签是契约的一部分，**逐字保持**；
 *   - 只做事件驱动读写，**禁止提供"查询当前状态"的同步接口**（DEC-08）。
 */

export const SCENE_STATE_CONTRACT_VERSION = 1

export enum SceneState {
  Setup = 0,
  Start = 1,
  Login = 2,
  Menu = 3,
  UI = 4,
  Roaming = 5,
}

/** 中文标签，与 C# 侧 `[InspectorName]` 逐字一致。 */
export const SCENE_STATE_LABELS: Readonly<Record<SceneState, string>> = {
  [SceneState.Setup]: '初始化',
  [SceneState.Start]: '开始',
  [SceneState.Login]: '登录',
  [SceneState.Menu]: '菜单',
  [SceneState.UI]: 'UI',
  [SceneState.Roaming]: '漫游',
}

export const SCENE_STATES: readonly SceneState[] = [
  SceneState.Setup,
  SceneState.Start,
  SceneState.Login,
  SceneState.Menu,
  SceneState.UI,
  SceneState.Roaming,
]

export function isSceneState(value: unknown): value is SceneState {
  return typeof value === 'number' && value in SCENE_STATE_LABELS
}
