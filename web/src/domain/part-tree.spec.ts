import { describe, expect, it } from 'vitest'

import { buildPartTree } from './part-tree'
import type { PartEntry } from '@/contracts'

const part = (key: string, name: string, parentKey?: string, nameEn?: string): PartEntry => {
  const entry: PartEntry = { key, name }
  if (parentKey !== undefined) entry.parentKey = parentKey
  if (nameEn !== undefined) entry.nameEn = nameEn
  return entry
}

describe('buildPartTree：扁平清单 → 部件树', () => {
  it('按 parentKey 成树，兄弟顺序与输入一致', () => {
    const tree = buildPartTree([
      part('body', '传感器本体', undefined, 'Sensor Body'),
      part('sensing', '感温元件', 'body'),
      part('terminal', '接线端子', 'body'),
    ])

    expect(tree).toHaveLength(1)
    expect(tree[0].key).toBe('body')
    expect(tree[0].nameEn).toBe('Sensor Body')
    expect(tree[0].children.map((node) => node.key)).toEqual(['sensing', 'terminal'])
  })

  it('父键认不出 ⇒ 当根，不丢节点', () => {
    const tree = buildPartTree([part('a', 'A', 'missing'), part('b', 'B')])
    expect(tree.map((node) => node.key)).toEqual(['a', 'b'])
  })

  it('自环与成环都当根，不进死循环', () => {
    const selfLoop = buildPartTree([part('a', 'A', 'a')])
    expect(selfLoop.map((node) => node.key)).toEqual(['a'])

    const cycle = buildPartTree([part('a', 'A', 'b'), part('b', 'B', 'a')])
    // 第二条边（b 的父是 a）会回指 ⇒ 只断开它：b 当根、a 挂在 b 下，节点一个都不丢
    expect(cycle.map((node) => node.key)).toEqual(['b'])
    expect(cycle[0].children.map((node) => node.key)).toEqual(['a'])
  })

  it('空键 / 空名 / 重复键一律跳过', () => {
    const tree = buildPartTree([
      part('', '空键'),
      part('a', '   '),
      part('a', 'A'),
      part('a', 'A 的重复条目'),
    ])
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('A')
  })

  it('空清单 ⇒ 空树', () => {
    expect(buildPartTree([])).toEqual([])
  })

  it('多层嵌套按层级挂载', () => {
    const tree = buildPartTree([
      part('root', '整机'),
      part('mid', '机构', 'root'),
      part('leaf', '触点', 'mid'),
    ])
    expect(tree[0].children[0].key).toBe('mid')
    expect(tree[0].children[0].children[0].key).toBe('leaf')
  })
})
