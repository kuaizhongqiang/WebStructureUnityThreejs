/**
 * 部件树：把 `scene:parts` 的**扁平**清单组装成树（纯函数，可单测）。
 *
 * 为什么组装放在 Web 侧而不是让 Unity 直接报树：Unity 那边如实读的是 Transform 父级关系，
 * 它只有"这一条挂在谁下面"这一种事实；**怎么成树、怎么显示是展示层的事**。
 * 顺带把三种脏输入挡住（都不是假想 —— 父部件没被报上来是常态，"某个零件不是 StructureObj"就会这样）：
 *   · 父键**认不出** ⇒ 当根，不丢节点；
 *   · **自环**（`parentKey === key`）⇒ 当根；
 *   · **成环**（A 的父是 B、B 的父是 A）⇒ 断开后一条边、当根，绝不进死循环。
 * 另外同键重复只留**第一条**（Unity 侧理论上不会重复，但重复时静默丢节点比报错更难查）。
 *
 * 依据：`docs/design/02-bridge-protocol.md` 的 `scene:parts`；部件名随预制体走见 DEC-104。
 */
import type { PartEntry, PartNode } from '@/contracts'

export function buildPartTree(entries: readonly PartEntry[]): PartNode[] {
  const nodes = new Map<string, PartNode>()
  const declaredParent = new Map<string, string>()
  const order: string[] = []

  // ① 建节点：空键 / 空名 / 重复键一律跳过（跳过而不是报错：渲染不该被一条脏数据打断）
  for (const entry of entries) {
    const key = typeof entry?.key === 'string' ? entry.key.trim() : ''
    const name = typeof entry?.name === 'string' ? entry.name.trim() : ''
    if (key === '' || name === '' || nodes.has(key)) continue
    const node: PartNode = { key, name, children: [] }
    const nameEn = typeof entry?.nameEn === 'string' ? entry.nameEn.trim() : ''
    if (nameEn !== '') node.nameEn = nameEn
    nodes.set(key, node)
    declaredParent.set(key, typeof entry?.parentKey === 'string' ? entry.parentKey.trim() : '')
    order.push(key)
  }

  // ② 逐条定父：只认**已解析**的链条，所以永远不会成环（发现回指就当根）
  const resolvedParent = new Map<string, string>()
  for (const key of order) {
    const declared = declaredParent.get(key) ?? ''
    const usable =
      declared !== '' && declared !== key && nodes.has(declared) && !reaches(declared, key, resolvedParent)
    resolvedParent.set(key, usable ? declared : '')
  }

  // ③ 按最终父子关系成树，兄弟顺序 = 输入顺序（Unity 的遍历顺序）
  const roots: PartNode[] = []
  for (const key of order) {
    const node = nodes.get(key) as PartNode
    const parentKey = resolvedParent.get(key) ?? ''
    const parent = parentKey === '' ? undefined : nodes.get(parentKey)
    if (parent === undefined) roots.push(node)
    else parent.children.push(node)
  }
  return roots
}

/** 沿"已解析的父链"往上走，能否走到 `target`（用于判环）。 */
function reaches(start: string, target: string, resolvedParent: Map<string, string>): boolean {
  const seen = new Set<string>()
  let cursor = start
  while (cursor !== '' && !seen.has(cursor)) {
    if (cursor === target) return true
    seen.add(cursor)
    cursor = resolvedParent.get(cursor) ?? ''
  }
  return false
}
