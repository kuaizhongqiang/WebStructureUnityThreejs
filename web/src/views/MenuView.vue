<script setup lang="ts">
/**
 * 菜单 / 项目目录页（对应排版稿 A5 · **环形伪三维卡片**）。
 *
 * 数据来自**被采纳的内容数据**：`content/data/MenuData.json` 给出 9 个项目
 * （8 个器件 + 小测验），每项指向 `ProjectData.json` 里的一个 clip。
 * 卡片上的"站数"是该项目**真正启用的任务数**（采纳数据里每个 clip 只有一部分槽位非空）——
 * 点进去只会走到有内容的站，不把用户送进空页面。
 *
 * 形态与全部取值来自冻结契约 `docs/design/14-a5-menu-ring-contract.md`；
 * 样式落在 `docs/ui-mockups/components.css` §26（`.a5r-*`），产品通过 `@ds/components.css`
 * 引用**同一份**，不另造产品专用类（DEC-74 的单一来源纪律）。
 *
 * 本轮范围（契约 FRZ-25）：**只把网格换成环**。
 *   - **不新增工具条**（搜索 / 状态筛选 / 去漫游 / 我的成绩）—— 排版稿有、产品侧本轮不加，
 *     属 D15 与产品现状之间的既有落差，处置留负责人裁决（契约 §13.4）。
 *   - `next` / `totals` / `enter` / `preloadUnity` 的逻辑**一行未动**（它们已是正确口径）。
 *   - 不动 `.ui-route__dot--current`（站线圆点用外阴影 + 2px 描边，是框体规则允许的例外；
 *     环形卡的焦点态是 inset 辉光，两者**不同语义**，不为"统一"去改）。
 *
 * 与排版稿（`pages/a5-menu-ring.html`）的两处**有意差异**：
 *   1. 几何全部**读样式表**（R / Δ / slot / vscale / descent-sign / descent-budget），
 *      不在页面里硬编码 —— 改 §26.1 的数值时三页与产品一起跟随。
 *   2. 焦点环载体用**卡内 `<span class="a5r-focusring">`**（契约 §10.5 的**方案 B**），
 *      与排版稿同选一处，便于成果页单独展示该元素。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import { useRuntimeStore } from '@/stores/runtime'
import { labelOf } from '@/domain/registry'
import { ensureUnityInstance } from '@/unity/UnityHost'
import { TaskType } from '@/contracts'

const router = useRouter()
const content = useContentStore()
const progress = useProgressStore()

interface MenuCard {
  id: string
  title: string
  projectId: string
  /** 该项目启用的任务（站点线呈现顺序，DEC-148）；空 = 项目数据没到位 */
  types: TaskType[]
  summary: string
  /** 下一站：本项目里第一个未完成的任务 */
  next: TaskType | null
}

const cards = computed<MenuCard[]>(() =>
  content.menu.map((item) => {
    const project = content.projectOf(item.projectId)
    const types = content.enabledTypesOf(item.projectId)
    return {
      id: item.id,
      title: item.title,
      projectId: item.projectId,
      types,
      summary: project?.summary ?? '',
      next: types.find((type) => progress.statusOf(type) === 'unfinished') ?? types[0] ?? null,
    }
  }),
)

/** 已完成 / 总站数：按**全部项目的启用任务**算，而不是全局 11 个契约任务。 */
const totals = computed(() => {
  const all = cards.value.flatMap((card) => card.types)
  return { done: all.filter((type) => progress.statusOf(type) === 'completed').length, total: all.length }
})

function enter(card: MenuCard): void {
  if (card.next === null) return
  void router.push({
    name: 'task',
    params: { taskType: String(card.next) },
    query: { project: card.projectId },
  })
}

/**
 * 退出：回登录页（DEC-101 的流程 = `start → login → menu`）。
 *
 * 游客模式**没有会话要清**，所以这里只做页面流转 —— 本机进度存档（DEC-54）**保留**，
 * 再次以游客进入时进度还在。真正的"清档"是 `progress.reset()`，不该藏在退出按钮里。
 */
function exitToLogin(): void {
  void router.push({ name: 'login' })
}

onMounted(() => {
  void content.ensureCatalog()
  void preloadUnity()
})

/**
 * Unity 常驻实例的**预载**（D-25 / DEC-145：负责人口径"进 task 直接可交互"）。
 * 菜单页是 `start → login → menu` 的最后一段：在这里就把常驻实例建起来（幂等），
 * 之后进任何 Unity 任务都只是"搬画布"，没有加载进度条与 Unity 启动画面。
 *
 * 失败静默 —— 任务页挂靠时会重试并把失败原因摆出来（UnityHost 的失败状态会被清掉允许重试）；
 * 清单缺失（dev 直跑）时 `unityBuildFor` 返回 null，这里什么都不做。
 */
async function preloadUnity(): Promise<void> {
  const runtime = useRuntimeStore()
  await runtime.load()
  const build = runtime.unityBuildFor(TaskType.Structure) ?? runtime.unityBuilds[0] ?? null
  if (!build) return
  try {
    await ensureUnityInstance(build)
  } catch (cause) {
    console.warn('[menu] Unity 预载失败（进任务页会重试）：', cause)
  }
}

/* ============================================================================
 * 环形菜单（契约 §4~§8；样式全在 components.css §26）
 * ========================================================================== */

/** 档位表（契约 §5.2，**冻结**）：档位 = k + 1。 */
const TIERS = [
  { scale: 1.0, blur: 0, opacity: 1.0, z: 500, tab: true },
  { scale: 0.85, blur: 2, opacity: 0.72, z: 400, tab: true },
  { scale: 0.72, blur: 4, opacity: 0.44, z: 300, tab: true },
  { scale: 0.61, blur: 6, opacity: 0.28, z: 200, tab: false },
  { scale: 0.58, blur: 6, opacity: 0.28, z: 100, tab: false },
] as const

/** 承轴 / 起伏轴：两形态共用一份代码，只查这张表选哪根轴（契约 §11.3，不写朝向分支）。 */
const AXES = {
  h: { slot: 'dx', descent: 'dy' },
  v: { slot: 'dy', descent: 'dx' },
} as const

const ringRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const stageBodyRef = ref<HTMLElement | null>(null)
const ringHeight = ref(0)
const focus = ref(0)
const isSnapping = ref(false)
const isDragging = ref(false)
const announcing = ref('')

/** 窄屏降级为**垂直环**（契约 §11.3：同一方案的另一朝向，不是第二个方案）。
 *  产品里**只有系统偏好**这一条入口（`max-width: 900px`），没有页内开关 ——
 *  开关是排版稿的评审手段（评审画布固定 1920×1080，触发不了视口宽度）。 */
const prefersVertical = ref(false)
const vertical = computed(() => prefersVertical.value)

const count = computed(() => cards.value.length)

/** 环闭合（FRZ-06）：**必须** ((x % n) + n) % n，**不是** clamp（旧 v1 页夹紧到首尾是作废实现）。 */
function wrap(x: number): number {
  const n = count.value
  if (n === 0) return 0
  return ((x % n) + n) % n
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 读样式表里的几何量（**不硬编码** —— 改 §26.1 的数值时产品与排版稿一起跟随）。 */
function readNum(el: HTMLElement, name: string, fallback: number): number {
  const v = Number.parseFloat(getComputedStyle(el).getPropertyValue(name))
  return Number.isFinite(v) ? v : fallback
}

/** 卡片集合（顺序 = 环序；DOM 顺序固定，位置全部由 transform 表达）。 */
function cardEls(): HTMLElement[] {
  const track = trackRef.value
  return track ? Array.from(track.querySelectorAll<HTMLElement>('.a5r-card')) : []
}

/**
 * 把档位与位移写成**行内 CSS 变量**（契约 §10.4 冻结的 7 枚）。
 * 每帧只做 `style.setProperty` 与 `classList.toggle`，**不读布局**
 * （§5.5：禁止每帧 `getBoundingClientRect`）。
 */
function applyRing(): void {
  const ring = ringRef.value
  if (!ring) return
  const els = cardEls()
  if (els.length === 0) return
  const axes = AXES[vertical.value ? 'v' : 'h']
  const radius = readNum(ring, '--a5r-radius', 600)
  const delta = (readNum(ring, '--a5r-step', 24) * Math.PI) / 180
  const vscale = readNum(ring, '--a5r-vscale', 0.5)
  const dsign = readNum(ring, '--a5r-descent-sign', -1)
  const budget = readNum(ring, '--a5r-descent-budget', 152)
  const shapeMax = 1 - Math.cos(4 * delta)
  const n = count.value
  const rot = rotOf() // 连续旋转量（格）—— 位置用它，**不取整**

  for (let i = 0; i < els.length; i++) {
    // 每张卡的角度 = 环序 − 连续旋转量（**不取整**）⇒ 整排刚体旋转、文字随卡走
    let off = wrap(i - rot)
    if (off > n / 2) off -= n
    /**
     * ⚠️ 这里有两个「k」，**不要合成一个**（负责人 2026-10-16 实测裁决）：
     *   · `kd`（小数）= **位置**用 —— 卡片圆心必须在 `d(k)` 表上**连续插值**，
     *     否则位置只在跨档那一帧跳一次（实测：指针每走 25px，卡片位移 10 步里有 8 步是 0，
     *     然后一帧跳 −244px）⇒ 观感是"卡片没动、只是文字变了"，完全不像"用鼠标拖着卡片走"。
     *   · `k`（整数）= **档位**用 —— scale / blur / opacity / z 是 5 档**离散**定义，
     *     按契约 §5.1 的 `k = Math.round(off)` 取整。取整后的 k 处两种算法**完全相等**，
     *     所以静止态的读数与契约 §5.2 的档位表仍逐条一致。
     * ⇒ 位置连续、档位离散：拖起来是"环在手里转"，停下来仍是设计定的那 5 档。
     */
    const kd = Math.abs(off)
    const k = Math.min(4, Math.round(kd))
    const tier = TIERS[k]
    const el = els[i]
    const sign = off < 0 ? -1 : 1
    /**
     * 位置按**连续角度**算：`pos = R·sin(kd·Δ)`。
     *
     * ⚠️ 关键（负责人 2026-10-16 第二次实测裁决）：契约 §4.3 的 `d(k) = R·sin(kΔ)` **本身就是一个
     * 连续函数**，表里的 0 / 244.0 / 445.9 / 570.6 / 596.7 只是它在整数 k 上的取值 ⇒ 把小数
     * `kd` 直接代进去即可：整数处与档位表**逐位相等**（静止态读数不变），而拖动时卡片随指针
     * **连续**移动。
     *
     * 曾试过"在相邻两档之间线性插值"（切弦）：跟手比会掉到 0.37~0.8 —— 插值的斜率是**弦**的
     * 斜率、不是 sin 的切线，指针每步只兑现不到一半的位移，观感"卡不住手"。
     * 现在位置函数与档位表对齐到同一个连续函数，跟手比 = `cos(kd·Δ)`（环心附近 =1 严格跟手；
     * 越到两侧越小，这与"环上越远的点、横向投影变化越慢"的几何一致）。
     */
    const slotPx = radius * Math.sin(kd * delta) * sign
    // 起伏轴：形状 (1 − cos kΔ) 归一化后 × 预算 × 压缩系数 × 方向符号（见 components.css §26.1）
    const descentPx = dsign * budget * ((1 - Math.cos(kd * delta)) / shapeMax) * vscale
    const dx = axes.slot === 'dx' ? slotPx : descentPx
    const dy = axes.descent === 'dy' ? descentPx : slotPx

    el.style.setProperty('--a5r-scale', String(tier.scale))
    el.style.setProperty('--a5r-blur', `${tier.blur}px`)
    el.style.setProperty('--a5r-opacity', String(tier.opacity))
    el.style.setProperty('--a5r-z', String(tier.z))
    el.style.setProperty('--a5r-dx', `${round2(dx)}px`)
    el.style.setProperty('--a5r-dy', `${round2(dy)}px`)
    // 焦点环反缩放（§6.4）：让环的视觉粗细在各档一致
    el.style.setProperty('--a5r-ring-rescale', String(round2(1 / tier.scale)))

    // 状态类：只挂/摘，**不写**整串 transform（§10.4 三硬约束③）
    el.classList.toggle('is-focus', k === 0)
    el.setAttribute('aria-current', k === 0 ? 'true' : 'false')
    // Tab 序列的「档位门」（§8.4）：只有档位 1~3（k ≤ 2）进序列；档位 4/5 仍可鼠标点击
    el.setAttribute('tabindex', tier.tab ? '0' : '-1')
  }
  const cur = wrap(Math.round(rot))
  announcing.value = cards.value[cur] ? `第 ${cur + 1} / 共 ${n} · ${cards.value[cur].title}` : ''
}

/**
 * 吸附（契约 §7.4）：**两拍次序** —— 先挂 `.is-snapping`，**下一帧**才写目标值，
 * 过渡跑完（`--dur-page`）再摘类。若同一帧里既写值又摘类，过渡不会发生（表现为瞬跳，
 * 等价于"吸附不存在"）。理由与推导见 components.css §26.7。
 */
let snapTimer: number | null = null
function snapTo(target: number): void {
  focus.value = wrap(target)
  // 落位时把残留的小数位移清掉：目标就是**整数格**，环必须精确停在格位上
  travelPx = 0
  isSnapping.value = true
  if (snapTimer !== null) window.clearTimeout(snapTimer)
  requestAnimationFrame(() => {
    applyRing()
    const dur = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-page'))
    snapTimer = window.setTimeout(
      () => {
        isSnapping.value = false
        snapTimer = null
      },
      (Number.isFinite(dur) ? dur : 160) + 20,
    )
  })
}

/* --------------------------------------------------------- 指针 / 触控 */
const DRAG = {
  axisRatio: 1.2,
  axisMin: 8,
  clickSlop: 6,
  inertiaStart: 0.15,
  inertiaStop: 0.02,
  damping: 0.92,
  maxInertiaMs: 1200,
}

let pid: number | null = null
/**
 * 本次拖拽累计的**像素位移**（承轴方向）。
 *
 * ⚠️ 为什么要单独存它、而不每帧去改 `focus`（这是"文字随卡走"的关键）：
 * 环的位置有**两个**量，分工必须分清：
 *   · `focus`     —— **已停稳**的格数（整数）。吸附 / 键盘 / 惯性结算后写它。
 *   · `travelPx`  —— 拖动期间累计的像素位移（**不动 `focus`**）。
 * 环的**连续**旋转量 = `focus − travelPx / --a5r-slot`（见 `rotOf()`）。
 * 每张卡的屏幕角度 = 环序 − 该连续量，**不取整** ⇒ 9 张卡作为一个整体转过中心，
 * 而文字与卡片是同一个 DOM 节点 ⇒ **文字随卡走**，不会"卡片不动、内容在变"。
 * 取整只用在两处：① 档位查表（scale/blur/opacity/z）；② 焦点环序（aria / 播报）。
 * 若图省事写成 `focus = round(focus) − travel/slot`，每跨一格整排就被重排一次
 * （实测指针每走 30px，9 张卡的位置就整体突变一次），观感就是"卡片没动、文字在跳"。
 */
let travelPx = 0

/**
 * 拖拽灵敏度：屏幕位移 → 环转过多少格的比例。
 *
 * ⚠️ 负责人 2026-10-16 裁决 **0.2**（原 1.0「太灵敏」）。
 * `rotOf()` / 松手结算 / 惯性**三处共用**这一枚常量 —— 只调拖动不调惯性，
 * 会让「甩一下」仍然按原灵敏度飞很远，手感不一致。
 * 调它就能整体改灵敏度，不必去动那三处公式。
 */
const DRAG_GAIN = 0.2

/** 环的**连续**旋转量（单位 = 格）：已停稳的格数 − 本次拖拽位移折算的格数（含灵敏度）。 */
function rotOf(): number {
  const ring = ringRef.value
  const slot = ring ? readNum(ring, '--a5r-slot', 249.6) : 249.6
  return focus.value - (DRAG_GAIN * travelPx) / slot
}
let axisLocked: 'along' | 'across' | null = null
let downX = 0
let downY = 0
let moved = 0
let movedFar = false
let samples: { t: number; x: number; y: number }[] = []
let raf: number | null = null
let inertiaStartAt = 0

function onPointerDown(e: PointerEvent): void {
  if (pid !== null) return // 只认第一个 pointerId（§7.5 多指忽略）
  pid = e.pointerId
  axisLocked = null
  downX = e.clientX
  downY = e.clientY
  moved = 0
  movedFar = false
  samples = [{ t: performance.now(), x: e.clientX, y: e.clientY }]
  stopInertia()
  stopIntro() // 用户一碰就中止开场旋转（不跟用户抢）
  // 悬停 / 按下即暂停惯性（D14 / F10），且保证不停在非整数格上
  isSnapping.value = false
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent): void {
  if (e.pointerId !== pid) return
  const dx = e.clientX - downX
  const dy = e.clientY - downY
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  // 轴判定（§7.5，冻结：承轴 > 起伏轴 × 1.2 且 > 8px）。哪根轴算承轴查 AXES，**不写死横向**。
  const axes = AXES[vertical.value ? 'v' : 'h']
  const along = axes.slot === 'dx' ? adx : ady
  const across = axes.slot === 'dx' ? ady : adx
  if (axisLocked === null) {
    if (along > across * DRAG.axisRatio && along > DRAG.axisMin) axisLocked = 'along'
    else if (across > along * DRAG.axisRatio && across > DRAG.axisMin) axisLocked = 'across'
    else return
    isDragging.value = axisLocked === 'along'
  }
  if (axisLocked === 'across') return // 起伏轴上的手势归页面滚动
  if (e.cancelable) e.preventDefault()
  const travel = axes.slot === 'dx' ? dx : dy
  moved = Math.max(moved, Math.abs(travel))
  movedFar = movedFar || moved > DRAG.clickSlop
  /**
   * 换算：Δn = −承轴位移 / 一格在承轴上的屏幕位移（`--a5r-slot`，两形态都是 249.6px）。
   *
   * ⚠️ **方向 = 「拨转盘」**（负责人 2026-10-16 最终裁决，与契约 §7.2 原文的
   * `Δn = −dx / var(--a5r-slot)` **一致**）：
   *   · 指针往**左**拖 ⇒ 环往**右**转（焦点环序**递增**）
   *   · 指针往**右**拖 ⇒ 环往**左**转（焦点环序**递减**）
   * 读起来是"用手指把转盘拨过去"，而不是"把卡片从环上拽着走"。
   * （中途曾按"跟着指针走"实现过一版（取 `+`），已按本次裁决改回 `−`。）
   * 键盘那条路径（§8 的 ←/→/↑/↓）语义独立于拖拽方向，不受本条影响。
   *
   * ⚠️ **只累计 `travelPx`，不在这里改 `focus`**：环的旋转由 `rotOf()` 连续算出来。
   * 若改成 `focus = round(focus) − travel/slot`，每跨一格整排就被重排一次、正中那张卡被换掉
   * ⇒ 观感就是"卡片没动、文字在跳"（这正是要避免的那件事）。
   */
  travelPx += travel
  samples.push({ t: performance.now(), x: e.clientX, y: e.clientY })
  while (samples.length > 2 && performance.now() - samples[0].t > 100) samples.shift()
  applyRing()
}

function onPointerUp(e: PointerEvent): void {
  if (e.pointerId !== pid) return
  pid = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  const wasDragging = isDragging.value
  isDragging.value = false
  if (wasDragging && samples.length > 1) {
    const a = samples[0]
    const b = samples[samples.length - 1]
    const dt = b.t - a.t
    const axes = AXES[vertical.value ? 'v' : 'h']
    // 初速度 = 松手前最近 100ms 的平均速度（§7.3）
    const v = dt > 0 ? (axes.slot === 'dx' ? b.x - a.x : b.y - a.y) / dt : 0
    if (Math.abs(v) >= DRAG.inertiaStart) {
      settleTravel() // 先把本次拖拽已走的路程折算进 focus，然后再交给惯性
      startInertia(v)
      return
    }
  }
  settleTravel()
  snapTo(Math.round(focus.value))
}

/**
 * 松手：把本次拖拽累计的 `travelPx` 折成**整数格**并入 `focus`，**只留下不足一格的小数部分**。
 *
 * · 拖动期间 `rotOf()` 用 `travelPx` 算连续旋转量（文字随卡走）；
 * · 松手时把整格部分并回 `focus`（之后的吸附 / 惯性 / 键盘都只动这一个量），
 *   小数部分**保留** ⇒ `rotOf()` 的值在松手前后**连续**，吸附过渡才有东西可插值
 *   （否则渲染值会从"连续角"瞬间跳到"整数格"，表现为一跳）。
 * · 用 `Math.round` 而非直接除：手势快时帧间可能跨过 ±0.5 格，取最近的整格。
 */
function settleTravel(): void {
  const ring = ringRef.value
  if (travelPx !== 0 && ring) {
    const slot = readNum(ring, '--a5r-slot', 249.6)
    const steps = Math.round((DRAG_GAIN * travelPx) / slot)
    focus.value = wrap(focus.value - steps)
    travelPx -= (steps * slot) / DRAG_GAIN // 只留不足一格的小数位移
  }
}

/** 惯性滑行（§7.3）：每 16ms 帧 v ← v × 0.92；|v| < 0.02 停；1200ms 硬上限。 */
function startInertia(v0: number): void {
  stopInertia()
  const ring = ringRef.value
  if (!ring) {
    snapTo(Math.round(focus.value))
    return
  }
  const slot = readNum(ring, '--a5r-slot', 249.6)
  let v = v0
  let last = performance.now()
  inertiaStartAt = last
  const step = (): void => {
    const t = performance.now()
    const elapsed = t - last
    last = t
    v *= Math.pow(DRAG.damping, Math.max(0, elapsed) / 16)
    focus.value = wrap(focus.value + (DRAG_GAIN * v * elapsed) / slot)
    applyRing()
    if (Math.abs(v) < DRAG.inertiaStop || t - inertiaStartAt > DRAG.maxInertiaMs) {
      raf = null
      snapTo(Math.round(focus.value))
      return
    }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

function stopInertia(): void {
  if (raf !== null) {
    cancelAnimationFrame(raf)
    raf = null
  }
}

/* ----------------------------------------------------------------- 键盘 */
/**
 * 键位映射（§8.1 / §8.3，**冻结**）：← / ↑ 移 −1 格、→ / ↓ 移 +1 格、Enter 进入。
 * 两种朝向**完全相同** ⇒ 这里**不含**任何朝向分支。
 * Space / Home / End **有意不做**（环没有"首尾"，补上会制造"第一张"的概念）。
 */
function onKeyDown(e: KeyboardEvent): void {
  stopIntro() // 按键也中止开场旋转（否则键盘移焦点会被动画覆盖）
  let d: number
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') d = -1
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') d = 1
  else if (e.key === 'Enter') {
    // 焦点 = 环序 round(rot)：与 render 里的 aria-current / 播报同一口径
    const card = cards.value[wrap(Math.round(rotOf()))]
    if (card) {
      e.preventDefault()
      enterWithFeedback(card)
    }
    return
  } else return
  e.preventDefault()
  // 键盘移焦点**必须同时**把该卡转到前方正中（§8.1 焦点跟随）
  snapTo(wrap(focus.value + d))
}

/* ------------------------------------------------------------ 三类反馈 */
/** 进入：一次短暂推进（放大），`--dur-page` 后摘除。是**尺寸**维度（§6.1）。 */
function enterWithFeedback(card: MenuCard): void {
  const idx = cards.value.findIndex((c) => c.id === card.id)
  const el = cardEls()[idx]
  if (el) {
    el.classList.add('is-enter')
    window.setTimeout(() => el.classList.remove('is-enter'), 160)
  }
  enter(card)
}

function onCardClick(card: MenuCard): void {
  // 拖拽位移 > 6px ⇒ 吞掉随后那一次 click（§7.2）
  if (movedFar) {
    movedFar = false
    return
  }
  const idx = cards.value.findIndex((c) => c.id === card.id)
  if (idx !== focus.value) {
    snapTo(idx) // 点非焦点卡 ⇒ 先把它转到前方正中
    return
  }
  enterWithFeedback(card)
}

const hoveredId = ref<string | null>(null)

function onCardEnter(card: MenuCard): void {
  hoveredId.value = card.id
  // 悬停即暂停惯性（D14）；鼠标用户不认档位门，最远档也给反馈（§6.2）
  if (raf !== null) {
    stopInertia()
    snapTo(Math.round(focus.value))
  }
}

function onCardLeave(): void {
  hoveredId.value = null
}

/* --------------------------------------------------------------- 装配 */
/* ---------------------------------------------------------------- 开场旋转 */
/**
 * 页面加载时先转几圈、减速，最后**精确停在环序 1**（负责人 2026-10-16 需求）。
 *
 * 做法：把 `focus` 从 `−SPIN_TURNS` 连续推到 0，用 ease-out 幂曲线让末速度趋近 0
 * ⇒ 停下时正好是整数 0（= 环序 1），**不需要再吸附一次**（落位由曲线本身保证）。
 *
 * · 期间**不挂** `.is-snapping`（每帧 `applyRing()` 瞬写，与拖拽同一条通道），否则会拖尾；
 * · 命中「减少动态效果」⇒ **跳过动画**直接落位（该档下不做装饰性动画）；
 * · 用户在这期间碰指针 / 按键 ⇒ 立即中止（不跟用户抢）。
 * · `SPIN_TURNS` 取 N 的整数倍只是让"转几圈"读起来完整 —— 落位与它无关（终点恒为 0）。
 */
const SPIN_TURNS = 1
const SPIN_MS = 1900
let introRaf: number | null = null

function stopIntro(): void {
  if (introRaf !== null) {
    cancelAnimationFrame(introRaf)
    introRaf = null
  }
}

function startIntro(): void {
  focus.value = 0
  travelPx = 0
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    applyRing()
    return
  }
  const t0 = performance.now()
  const total = SPIN_TURNS * count.value
  const step = (t: number): void => {
    const p = Math.min(1, (t - t0) / SPIN_MS)
    const eased = 1 - Math.pow(1 - p, 3) // ease-out：起步最快、末段趋零
    focus.value = wrap(-(1 - eased) * total)
    applyRing()
    if (p < 1) {
      introRaf = requestAnimationFrame(step)
      return
    }
    focus.value = 0 // 精确落位到环序 1
    introRaf = null
    applyRing()
  }
  introRaf = requestAnimationFrame(step)
}

function measure(): void {
  const el = stageBodyRef.value
  ringHeight.value = el ? el.clientHeight : 0
}

let ro: ResizeObserver | null = null
let mqVertical: MediaQueryList | null = null
const onMediaChange = (e: MediaQueryListEvent): void => {
  prefersVertical.value = e.matches
}

onMounted(() => {
  // 窄屏 ⇒ 垂直环（契约 §11.3 / D16：同一方案的降级形态，不是第二个方案）
  mqVertical = window.matchMedia('(max-width: 900px)')
  prefersVertical.value = mqVertical.matches
  mqVertical.addEventListener('change', onMediaChange)

  measure()
  if (typeof ResizeObserver !== 'undefined' && stageBodyRef.value) {
    ro = new ResizeObserver(measure)
    ro.observe(stageBodyRef.value)
  }
  window.addEventListener('keydown', onKeyDown)
  void nextTick(() => {
    applyRing()
    startIntro() // 开场转几圈再停在环序 1
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  mqVertical?.removeEventListener('change', onMediaChange)
  stopIntro()
  stopInertia()
  ro?.disconnect()
})

// 卡数变化（内容数据到位 / 兜底切换）后重挂一次环形状态
watch(count, () => void nextTick(applyRing))
watch(vertical, () => void nextTick(applyRing))
watch(ringHeight, () => void nextTick(applyRing))

/** 进度环的 stroke-dashoffset（契约 §9.4）：138.23 × (1 − 已完成 / 站数)。 */
function dashOffset(card: MenuCard): string {
  const total = card.types.length
  if (total === 0) return '138.23'
  const done = card.types.filter((type) => progress.statusOf(type) === 'completed').length
  return (138.23 * (1 - done / total)).toFixed(2)
}

/** 进度环内数字：已完成 / 站数。 */
function ringLabel(card: MenuCard): string {
  const total = card.types.length
  const done = card.types.filter((type) => progress.statusOf(type) === 'completed').length
  return `${done}/${total}`
}

/** 该项目是否已全部完成（决定进度环走 `--done` 完成态）。 */
function isDone(card: MenuCard): boolean {
  const total = card.types.length
  return total > 0 && card.types.every((type) => progress.statusOf(type) === 'completed')
}

/** 环序（01~09）。 */
function indexLabel(i: number): string {
  return String(i + 1).padStart(2, '0')
}
</script>

<template>
  <AppShell
    crumb="项目目录"
    :badges="[`已完成 ${totals.done} / ${totals.total}`, '游客']"
    status-left="[ 就绪 ] 选择项目后进入任务流"
    exit
    :status-right="
      content.source === 'data'
        ? `内容数据已加载 · ${cards.length} 个项目`
        : content.source === 'fallback'
          ? '内容数据未就位 · 正在用兜底演示内容'
          : '正在读取内容数据…'
    "
    @exit="exitToLogin"
  >
    <div class="ui-panel ui-panel--ring">
      <div class="ui-panel__head">
        项目目录
        <span class="ui-panel__right">
          <span class="ui-badge ui-badge--info">共 {{ cards.length }} 个项目</span>
          <span class="a5r-status" role="status">{{ announcing }}</span>
        </span>
      </div>
      <div class="ui-panel__body">
        <!-- 环容器（参照物）= 撑满面板正文区，并收口「面板正文带」的裁剪。
             ⚠️ 它的高度**不是**自己撑出来的：本层与里面的 `.a5r-ring` / `.a5r-track` / 9 张卡
             全是绝对定位（卡的位置全部由 transform 表达），在流内容为空 ⇒
             块级盒子的 `height: auto` = 0（这就是目录页整页空白的根因）。
             ⇒ 高度由 `product.css` 的「目录页（A5）」一节**显式接链**：
               `.app-main__body > .ui-panel { height: 100% }` →
               `.ui-panel--ring > .ui-panel__body { flex: 1; min-height: 0 }` →
               `.a5r-stage-body { flex: 1; min-height: 0 }`。
             （链断掉时的表现：面板塌到只剩头部 46px，下面两枚变量都算成 0px；
               而 0 是**合法长度**，`var()` 不会回退 ⇒ `.a5r-ring` 高 0 + overflow: hidden
               把 9 张卡整块裁掉 —— DOM 在、单测过、typecheck 过，页面却是空的。） -->
        <div
          ref="stageBodyRef"
          class="a5r-stage-body"
          :style="{
            '--a5r-ring-height': `${ringHeight}px`,
            '--a5r-top': `${ringHeight * 0.42}px`,
          }"
        >
          <!-- 环容器：裁切框 + 拖拽宿主。产品侧的高度由祖先给的 `--a5r-ring-height`
               （像素值，= 上面那个 `.a5r-stage-body` 的实测高度）决定 —— 不能像排版稿那样
               让 `inset: 0` 去解析，产品侧没有 1080 画布，靠环绕块会解析成 0。
               形态由系统偏好（≤900px ⇒ 垂直环）或强制开关决定，样式只在 §26.6 的范围类里。 -->
          <div
            ref="ringRef"
            class="a5r-ring"
            :class="{ 'a5r-ring--vertical': vertical }"
            @pointerdown="onPointerDown"
          >
            <div
              ref="trackRef"
              class="a5r-track a5r--motion"
              :class="{ 'is-snapping': isSnapping, 'is-dragging': isDragging }"
            >
              <article
                v-for="(card, i) in cards"
                :key="card.id"
                class="ui-tile a5r-card"
                :class="{ 'is-hover': hoveredId === card.id }"
                :tabindex="i === focus ? 0 : -1"
                :aria-current="i === focus ? 'true' : 'false'"
                role="button"
                :aria-label="`第 ${i + 1} / 共 ${cards.length} · ${card.title} · ${card.types.length} 站`"
                @click="onCardClick(card)"
                @pointerenter="onCardEnter(card)"
                @pointerleave="onCardLeave"
              >
                <span class="a5r-card__idx">{{ indexLabel(i) }}</span>
                <div class="a5r-card__ring">
                  <div
                    class="ui-progress-ring ui-progress-ring--md"
                    :class="isDone(card) ? 'ui-progress-ring--done' : 'ui-progress-ring--partial'"
                  >
                    <svg class="ui-progress-ring__svg" viewBox="0 0 48 48" aria-hidden="true">
                      <circle
                        class="ui-progress-ring__track"
                        cx="24"
                        cy="24"
                        r="22"
                        fill="none"
                        stroke-width="4"
                      />
                      <circle
                        class="ui-progress-ring__value"
                        cx="24"
                        cy="24"
                        r="22"
                        fill="none"
                        stroke-width="4"
                        stroke-dasharray="138.23"
                        :stroke-dashoffset="dashOffset(card)"
                      />
                    </svg>
                    <span class="ui-progress-ring__num">{{ ringLabel(card) }}</span>
                    <span class="ui-progress-ring__check">
                      <svg
                        class="ico"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div class="a5r-card__body">
                  <span class="ui-tile__name">
                    {{ card.title }}
                    <span v-if="card.next === null" class="ui-badge ui-badge--warn">无可用任务</span>
                  </span>
                  <span class="ui-tile__desc">
                    {{ card.types.length }} 站<template v-if="card.next !== null">
                      · 下一站：{{ labelOf(card.next) }}</template
                    >
                  </span>
                </div>
                <!-- 焦点环载体（契约 §10.5 方案 B：卡内 <span>） -->
                <span class="a5r-focusring" aria-hidden="true" />
              </article>
            </div>
          </div>
        </div>

        <div v-if="content.source === 'fallback'" class="ui-alert ui-alert--info">
          <span class="ui-alert__icon">i</span>
          <span>
            内容数据（<code>content/data/MenuData.json</code>）没读到，当前用的是兜底演示内容 ——
            页面仍可跑通，但不代表真实项目。数据随包发布后会自动切过去。
          </span>
        </div>
        <div v-if="content.error" class="ui-alert ui-alert--warn">
          <span class="ui-alert__icon">!</span>
          <span>{{ content.error }}</span>
        </div>
      </div>
    </div>
  </AppShell>
</template>
