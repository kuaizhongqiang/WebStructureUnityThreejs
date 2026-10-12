/**
 * 会话真源（Web 侧，DEC-08）。
 *
 * 纪律：
 *   - `SceneState` / 当前 `TaskType` 的**唯一真源在这里**；Unity 只被指令、只回报事件；
 *   - 状态变更**必须发事件**，不允许"悄悄改字段"；
 *   - 不提供"查询当前状态"的命令式接口给跨模块调用方 —— 需要感知变化就 `subscribe`。
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { SceneState, TaskType, ViewerStack, resolveViewerStack } from '@/contracts'

export interface SceneStateChangedEvent {
  readonly type: 'sceneState:changed'
  readonly state: SceneState
  readonly previous: SceneState
}

export interface TaskTypeChangedEvent {
  readonly type: 'taskType:changed'
  readonly taskType: TaskType
  readonly previous: TaskType
  /** 该任务应当由哪条三维技术栈承载（DEC-06）。 */
  readonly stack: ViewerStack
}

export type AppEvent = SceneStateChangedEvent | TaskTypeChangedEvent

export type AppEventListener = (event: AppEvent) => void

export const useSessionStore = defineStore('session', () => {
  const sceneState = ref<SceneState>(SceneState.Setup)
  const currentTaskType = ref<TaskType>(TaskType.None)

  /** DEC-06 的唯一落点：Unity 件与 Three.js 件的切换依据。 */
  const viewerStack = computed<ViewerStack>(() => resolveViewerStack(currentTaskType.value))

  const listeners = new Set<AppEventListener>()

  /** 订阅事件；返回退订函数（务必在组件卸载时调用，避免漏退订）。 */
  function subscribe(listener: AppEventListener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function publish(event: AppEvent): void {
    for (const listener of [...listeners]) listener(event)
  }

  function switchSceneState(next: SceneState): void {
    if (next === sceneState.value) return
    const previous = sceneState.value
    sceneState.value = next
    publish({ type: 'sceneState:changed', state: next, previous })
  }

  function switchTaskType(next: TaskType): void {
    if (next === currentTaskType.value) return
    const previous = currentTaskType.value
    currentTaskType.value = next
    publish({ type: 'taskType:changed', taskType: next, previous, stack: viewerStack.value })
  }

  /** 仅测试用：清空订阅者。 */
  function clearListeners(): void {
    listeners.clear()
  }

  return {
    sceneState,
    currentTaskType,
    viewerStack,
    subscribe,
    switchSceneState,
    switchTaskType,
    clearListeners,
  }
})
