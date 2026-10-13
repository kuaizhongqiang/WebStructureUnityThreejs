/**
 * 模型检视页的编排层：清单 → 列表 → 舞台 → 读数。
 *
 * 清单**不另维护第二份**：直接读 `content/asset-convert-report.json`
 * （P1-4 的转换证据，进 git；里面有 device / stem / glb / bytes / triangles / meshes /
 * materials / images / unmapped），再用内容数据 `content/data/ProjectData.json` 取器件中文名。
 * 这样清单与磁盘漂了会立刻暴露 —— 页面会对每个 GLB 发一次 HEAD 校验字节数。
 *
 * 深链：`?model=<器件>/<名字>`（如 `?model=contactor/NewACContactor`），选了就写回地址栏，
 * 方便把"就是这一张"直接发给别人。
 */

import { ENV_PRESETS, Stage, describeMaterials, describeModel } from './stage.mjs'
import { resolveMaterials } from './materials.mjs'

/** `index.html` 在 docs/model-preview/，所以这几条相对路径都指向仓库根下的目标。 */
const REPORT_URL = '../../content/asset-convert-report.json'
const SPEC_URL = '../../content/asset-material-spec.json'
const TEXTURES_URL = '../../content/asset-material-textures.json'
const DATA_URL = '../../web/public/content/data/ProjectData.json'
const THREE_URL = '../../web/node_modules/three/build/three.module.js'
/** 转换报告里的 `glb` 是**仓库相对路径**，从本页出发只要补一层 `../../`。 */
const GLB_PREFIX = '../../'

const element = (id) => document.getElementById(id)

const state = {
  models: [],
  devices: new Map(),
  files: new Map(),
  current: null,
  stage: null,
  timer: 0,
  /** 源工程材质规格（`tools/pipeline/extract-material-spec.mjs` 抽出）；读不到就退化为不解算 */
  spec: null,
  /** 渲染期贴图查找表（`tools/pipeline/import-material-textures.mjs` 生成） */
  textures: null,
  solveEnabled: true,
  solveRecords: [],
  /** 材质名 → 解算记录（给读数面板按名字对齐） */
  solve: new Map(),
}

// ── 启动 ──────────────────────────────────────────────────────────────

boot()

async function boot() {
  if (location.protocol === 'file:') {
    fail([
      '本页必须经 HTTP 打开：它要用 import map 引 `web/node_modules/three`，还要 fetch 转换报告与 GLB。',
      '正确跑法（服务根＝仓库根）：node docs/model-preview/serve.mjs',
    ])
    return
  }

  let report = null
  try {
    await requireThree()
    report = await fetchJson(REPORT_URL)
  } catch (error) {
    fail([String(error.message ?? error), '正确跑法（服务根＝仓库根）：node docs/model-preview/serve.mjs'])
    return
  }

  state.models = normalizeReport(report)
  if (state.models.length === 0) {
    fail(['转换报告里没有任何模型（`content/asset-convert-report.json` 的 models 是空的）。'])
    return
  }

  const data = await fetchJson(DATA_URL).catch(() => null)
  state.devices = deviceLabels(data)
  state.files = await verifyFiles(state.models)

  // 材质规格与贴图查找表是"能不能解算对"的前提：读不到只是不能解算，页面照常能看（不静默）
  state.spec = await fetchJson(SPEC_URL).catch(() => null)
  const textureReport = await fetchJson(TEXTURES_URL).catch(() => null)
  state.textures = textureReport?.textures ?? null
  if (!state.spec) {
    warn('读不到 content/asset-material-spec.json —— 材质解算不可用（跑 tools/pipeline/extract-material-spec.mjs 生成）。')
  }

  const missing = state.models.filter((model) => state.files.get(model.key)?.ok === false)
  if (missing.length > 0) {
    warn(
      `有 ${missing.length} 个 GLB 在磁盘上找不到（清单与磁盘不一致）：` +
        missing.map((model) => model.stem).join('、'),
    )
  }

  mountStage()
  renderList()
  renderStaticReadouts()

  const wanted = new URLSearchParams(location.search).get('model')
  const initial = state.models.find((model) => model.key === wanted) ?? state.models[0]
  select(initial.key)
}

/** 先确认 three 在（`web/node_modules` 没装的话，报错要能指路，而不是一句模块解析失败）。 */
async function requireThree() {
  const response = await fetch(THREE_URL, { method: 'HEAD' })
  if (!response.ok) {
    throw new Error(
      `取不到 three（HTTP ${response.status}）：${THREE_URL}\n先在 web/ 下跑一次 npm install。`,
    )
  }
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`取不到 ${url}（HTTP ${response.status}）`)
  return response.json()
}

// ── 清单 ──────────────────────────────────────────────────────────────

function normalizeReport(report) {
  const models = Array.isArray(report?.models) ? report.models : []
  return models
    .filter((model) => model && typeof model.glb === 'string' && model.status !== 'failed')
    .map((model) => ({
      key: `${model.device}/${model.stem}`,
      device: model.device,
      stem: model.stem,
      glb: model.glb,
      bytes: model.bytes ?? 0,
      triangles: model.triangles ?? 0,
      meshes: model.meshes ?? 0,
      materials: model.materials ?? 0,
      images: model.images ?? [],
      unmapped: model.unmapped ?? [],
      warnings: model.warnings ?? [],
      status: model.status ?? 'unknown',
      url: GLB_PREFIX + model.glb,
    }))
}

/** 器件中文名取内容数据（`clip_<device>`），取不到就退回目录名 —— 不硬编一张表。 */
function deviceLabels(data) {
  const labels = new Map()
  for (const clip of data?.clips ?? []) {
    if (typeof clip?.id !== 'string' || !clip.id.startsWith('clip_')) continue
    labels.set(clip.id.slice('clip_'.length), clip.displayName ?? clip.id)
  }
  return labels
}

/** 每个 GLB 发一次 HEAD：既当"文件在不在"的检查，也拿到真实字节数去对清单。 */
async function verifyFiles(models) {
  const entries = await Promise.all(
    models.map(async (model) => {
      try {
        const response = await fetch(model.url, { method: 'HEAD' })
        const length = Number(response.headers.get('content-length') ?? 0)
        return [model.key, { ok: response.ok, bytes: length, status: response.status }]
      } catch {
        return [model.key, { ok: false, bytes: 0, status: 0 }]
      }
    }),
  )
  return new Map(entries)
}

// ── 渲染 ──────────────────────────────────────────────────────────────

function mountStage() {
  state.stage = new Stage(element('viewport'))
  state.stage.start()
  // 调试/自检把手：与产品侧 __WSU3_VIEWER__ 同一约定（审核页要能被程序化核对）
  window.__MODEL_STAGE__ = state.stage

  for (const [name, preset] of Object.entries(ENV_PRESETS)) {
    const option = document.createElement('option')
    option.value = name
    option.textContent = preset.label
    element('env-preset').append(option)
  }
  element('env-preset').value = state.stage.options.preset
  renderPresetNote()

  bindControls()
  state.timer = window.setInterval(renderRenderStats, 500)
  window.addEventListener('beforeunload', () => {
    window.clearInterval(state.timer)
    state.stage?.dispose()
  })
}

function bindControls() {
  const stage = state.stage

  element('env-preset').addEventListener('change', (event) => {
    const preset = ENV_PRESETS[event.target.value]
    const patch = { preset: event.target.value }
    // 方案自带背景时一并切过去，并把下拉同步上 —— 否则会出现"画面变了、下拉还写着深色"
    if (preset?.background) {
      patch.background = preset.background
      element('bg').value = preset.background
    }
    stage.apply(patch)
    renderPresetNote()
  })
  element('bg').addEventListener('change', (event) => {
    stage.apply({ background: event.target.value })
  })
  element('tone').addEventListener('change', (event) => {
    stage.apply({ toneMapping: event.target.value })
  })

  bindRange('exposure', (value) => stage.apply({ exposure: value }))
  bindRange('env-intensity', (value) => stage.apply({ envIntensity: value }))
  bindRange('metalness', (value) => stage.apply({ metalness: value }))
  bindRange('roughness', (value) => stage.apply({ roughness: value }))

  // 解算开关：改它要**重新加载**当前模型（重新拿一份干净的 GLB 材质，才谈得上 A/B 对照）
  element('chk-solve').checked = state.solveEnabled
  element('chk-solve').addEventListener('change', (event) => {
    state.solveEnabled = event.target.checked
    if (state.current) load(state.current)
  })

  bindCheck('chk-textures', (checked) => stage.apply({ textures: checked }))
  bindCheck('chk-wireframe', (checked) => stage.apply({ wireframe: checked }))
  bindCheck('chk-axes', (checked) => stage.apply({ axes: checked }))
  bindCheck('chk-spin', (checked) => stage.apply({ autoRotate: checked }))
  bindCheck('chk-override', (checked) => {
    element('metalness').disabled = !checked
    element('roughness').disabled = !checked
    stage.apply({ overridePbr: checked })
  })

  element('btn-reset').addEventListener('click', () => stage.resetView())
  element('btn-reload').addEventListener('click', () => {
    if (state.current) load(state.current)
  })

  // 影棚 HDR 是异步拉的（5.6MB）：拉不到要说话，不能静默变成纯色背景
  stage.exrReady?.then(() => {
    if (stage.exrError) {
      warn(`影棚 HDR 没取到（${String(stage.exrError.message ?? stage.exrError)}）—— 天空盒会退回纯色。`)
    }
  })
}

/** 滑杆：一个 input 事件同时更新数字读数与舞台（数字读数由 `*-out` 约定确定）。 */
function bindRange(id, apply) {
  const input = element(id)
  const output = element(`${id}-out`)
  const sync = () => {
    const value = Number(input.value)
    output.textContent = value.toFixed(2)
    apply(value)
  }
  input.addEventListener('input', sync)
  sync()
}

function bindCheck(id, apply) {
  const input = element(id)
  apply(input.checked)
  input.addEventListener('change', () => apply(input.checked))
}

function renderPresetNote() {
  element('preset-note').textContent = state.stage.preset.note
}

function renderList() {
  const list = element('model-list')
  list.textContent = ''
  let lastDevice = null

  for (const model of state.models) {
    if (model.device !== lastDevice) {
      lastDevice = model.device
      const group = document.createElement('div')
      group.className = 'mp-group'
      group.textContent = `${state.devices.get(model.device) ?? model.device} · ${model.device}`
      list.append(group)
    }

    const row = document.createElement('button')
    row.type = 'button'
    row.className = 'ui-btn ui-btn--sm'
    row.dataset.key = model.key
    const name = document.createElement('span')
    name.textContent = model.stem
    const faces = document.createElement('span')
    faces.className = 'mp-tri'
    faces.textContent = `${formatInt(model.triangles)} 面`
    row.append(name, faces)
    if (state.files.get(model.key)?.ok === false) {
      row.disabled = true
      row.title = '磁盘上找不到这个 GLB'
    }
    row.addEventListener('click', () => select(model.key))
    list.append(row)
  }

  element('list-count').textContent = `${state.models.length} 个`
  const total = state.models.reduce((sum, model) => sum + (model.bytes || 0), 0)
  element('list-size').textContent = formatBytes(total)
  updateSelection()
}

function updateSelection() {
  for (const row of element('model-list').querySelectorAll('.ui-btn')) {
    const on = row.dataset.key === state.current?.key
    row.classList.toggle('ui-btn--primary', on)
  }
}

async function select(key, { push = true } = {}) {
  const model = state.models.find((item) => item.key === key)
  if (!model || model.key === state.current?.key) return
  state.current = model
  updateSelection()
  if (push) {
    const url = new URL(location.href)
    url.searchParams.set('model', model.key)
    history.replaceState(null, '', url)
  }
  await load(model)
}

async function load(model) {
  const title = `${state.devices.get(model.device) ?? model.device} · ${model.stem}`
  element('view-title').textContent = title

  let result = null
  try {
    result = await state.stage.loadModel(model.url)
    // 渲染期材质解算：GLB 里带不动的（mask 通道语义 / 子材质贴图 / 表面模式）在这里补上
    if (state.solveEnabled && state.spec) {
      state.solveRecords = await resolveMaterials({
        gltf: { scene: result.object },
        device: model.device,
        stem: model.stem,
        spec: state.spec,
        lookup: state.textures,
        log: warn,
      })
      state.solve = new Map(state.solveRecords.map((record) => [record.name, record]))
      // 改过材质必须重新快照，否则"贴图开关 / 覆盖 PBR"会把解算结果还原回旧值
      state.stage.refreshMaterialSnapshot()
      state.stage.apply()
    } else {
      state.solveRecords = []
      state.solve = new Map()
    }
  } catch (error) {
    fillDefinitionList('runtime', [])
    warn(`加载 ${model.stem} 失败：${String(error.message ?? error)}`)
    return
  }

  element('load-time').textContent = `${Math.round(result.elapsed)} ms`
  renderEvidence(model)
  renderRuntime(model, result)
  renderMaterials()
  renderRenderStats()

  // 探针：给"13 个模型逐个加载"的自动核对一个可断言的落点（与产品侧 __WSU3_VIEWER__ 同一约定）
  const measured = describeModel(result.object)
  window.__MODEL_PREVIEW__ = {
    key: model.key,
    triangles: measured.triangles,
    meshes: measured.meshes,
    materials: measured.materials,
    materialKinds: measured.materialKinds,
    elapsed: Math.round(result.elapsed),
    solveEnabled: state.solveEnabled,
    solved: state.solveRecords.map((record) => ({
      name: record.name,
      matched: record.matched,
      orm: record.orm,
      mode: record.mode,
      swapped: record.swapped.length,
      errors: record.errors.length,
    })),
  }
}

// ── 读数 ──────────────────────────────────────────────────────────────

function renderStaticReadouts() {
  renderEvidence(null)
  renderRuntime(null, null)
  renderMaterials()
}

function renderEvidence(model) {
  const rows = []
  if (model) {
    const file = state.files.get(model.key)
    rows.push(
      ['文件', model.glb],
      ['状态', model.status === 'converted' ? 'converted（已转换）' : model.status],
      ['大小', `${formatBytes(model.bytes)}${sizeNote(model)}`],
      ['三角面', formatInt(model.triangles)],
      ['网格 / 材质（清单）', `${model.meshes} / ${model.materials}`],
      ['贴图', model.images.length ? model.images.join('、') : '—'],
      ['磁盘校验', file?.ok ? `HEAD ${file.status} · ${formatBytes(file.bytes)}` : `HEAD ${file?.status ?? '—'}`],
    )
  }
  fillDefinitionList('evidence', rows)
}

function sizeNote(model) {
  const file = state.files.get(model.key)
  if (!file?.ok || !model.bytes) return ''
  return file.bytes === model.bytes ? '（与清单一致）' : `（清单写 ${formatBytes(model.bytes)}，不一致）`
}

function renderRuntime(model, result) {
  if (!model || !result) {
    fillDefinitionList('runtime', [])
    return
  }
  const measured = describeModel(result.object)
  const box = result.box
  const trianglesOk = Math.abs(measured.triangles - model.triangles) <= Math.max(1, model.triangles * 0.001)
  const materialsOk = measured.materialKinds === model.materials
  fillDefinitionList('runtime', [
    ['三角面', `${formatInt(measured.triangles)}${trianglesOk ? '（与证据一致）' : '（与证据不一致！）'}`],
    ['网格', `${measured.meshes} 个 primitive（证据里是 Blender 的网格对象数，拆过 primitive 会不等）`],
    [
      '材质',
      `${measured.materialKinds} 种${materialsOk ? '（与证据一致）' : '（与证据不一致！）'}` +
        ` · three.js 实例 ${measured.materials} 个（GLTFLoader 会按几何体克隆）`,
    ],
    [
      '包围盒',
      box
        ? `${box.size.x.toFixed(3)} × ${box.size.y.toFixed(3)} × ${box.size.z.toFixed(3)}`
        : '—',
    ],
    ['Y 轴朝向', 'Y-up（Blender 导出 export_yup）；开"坐标轴"对准 X 红 / Y 绿 / Z 蓝'],
  ])
}

function renderMaterials() {
  const body = element('materials').querySelector('tbody')
  body.textContent = ''
  const materials = describeMaterials(state.stage.materials)
  for (const [index, material] of materials.entries()) {
    const record = state.solve.get(material.name)
    const row = document.createElement('tr')
    const cells = [
      String(index),
      material.name,
      material.metalness === null ? '—' : material.metalness.toFixed(2),
      material.roughness === null ? '—' : material.roughness.toFixed(2),
      material.maps.length ? material.maps.join(' ') : '无',
      `${material.side} · ${material.alpha}` +
        (record?.orm ? ' · ORM' : '') +
        (record && !record.matched ? ' · 未命中规格' : ''),
    ]
    for (const cell of cells) {
      const td = document.createElement('td')
      td.textContent = cell
      row.append(td)
    }
    body.append(row)
  }

  // 解算概览：一眼看出"规格命中几个 / ORM 接上几个 / 换过几张贴图"
  const records = state.solveRecords
  const summary = element('solve-summary')
  if (!state.spec) {
    summary.textContent = '材质解算不可用（读不到 asset-material-spec.json）'
  } else if (!state.solveEnabled) {
    summary.textContent = '材质解算已关闭：金属度 / 粗糙度用的是转换期常数兜底，贴图按 GLB 里那份（子材质会显示成主干贴图）'
  } else if (records.length === 0) {
    summary.textContent = '—'
  } else {
    summary.textContent =
      `规格命中 ${records.filter((item) => item.matched).length}/${records.length}` +
      ` · ORM ${records.filter((item) => item.orm).length}` +
      ` · BLEND ${records.filter((item) => item.mode === 'BLEND').length}` +
      ` · MASK ${records.filter((item) => item.mode === 'MASK').length}` +
      ` · 换过贴图 ${records.filter((item) => item.swapped.length > 0).length}`
  }

  const unmapped = state.current?.unmapped ?? []
  const node = element('unmapped')
  if (!state.current) {
    node.textContent = '—'
    return
  }
  if (state.solveEnabled && state.spec && unmapped.length > 0) {
    const main = state.spec.materials?.[state.current.stem]
    const range = main ? `AO[${main.remap.occlusion.join(',')}] · Smooth[${main.remap.smoothness.join(',')}]` : ''
    const lost = [...new Set(Object.values(state.spec.materials ?? {}).flatMap((item) => item.lostInGltf ?? []))]
    node.textContent =
      `已解算：${unmapped.map((item) => item.file).join('、')} 按 HDRP 排布（R=Metallic / G=AO / A=Smoothness）重排为 glTF ORM` +
      `（R←AO、G←1−Smoothness、B←Metallic；区间 ${range}）—— 所以金属度 / 粗糙度现在是**贴图驱动**，不再是常数。` +
      (lost.length > 0 ? `仍无法表达：${lost.join('；')}。` : '')
    return
  }
  if (unmapped.length === 0) {
    node.textContent = '未映射项：无。'
    return
  }
  const fallback = materials
    .map((material) => `${material.metalness?.toFixed(2)} / ${material.roughness?.toFixed(2)}`)
    .join('、')
  node.textContent =
    `未映射：${unmapped.map((item) => item.file).join('、')} —— ${unmapped[0].reason}。` +
    `因此 GLB 里的金属度 / 粗糙度是常数兜底（当前 ${fallback}）：` +
    '勾上上面的"材质解算"即可在渲染期按 HDRP 通道重排。'
}

/**
 * 渲染统计与**显存账**。
 *
 * 显存账（几何 / 贴图数）必须**在渲染过一帧之后**读才有意义：three 的计数器是
 * "上传时加、释放时减"，加载完立刻读会读到全 0（新模型的资源还没上传）。
 * 放在这个定时器里刷，正好是"已经上传"的状态 —— 切模型后不回落就说明存在泄漏。
 */
function renderRenderStats() {
  const stats = state.stage?.renderStats
  if (!stats) return
  element('render-stats').textContent =
    `帧 ${stats.frame} · 绘制 ${stats.calls} · 三角面 ${formatInt(stats.triangles)} · 几何 ${stats.geometries} · 贴图 ${stats.textures}`
  if (window.__MODEL_PREVIEW__) {
    window.__MODEL_PREVIEW__.geometries = stats.geometries
    window.__MODEL_PREVIEW__.textures = stats.textures
  }
}

function fillDefinitionList(id, rows) {
  const list = element(id)
  list.textContent = ''
  for (const [term, value] of rows) {
    const dt = document.createElement('dt')
    dt.textContent = term
    const dd = document.createElement('dd')
    dd.textContent = value
    list.append(dt, dd)
  }
}

// ── 提示与格式化 ──────────────────────────────────────────────────────

function warn(text) {
  const banner = element('banner')
  element('banner-body').textContent = text
  banner.classList.add('mp-banner--on')
}

function fail(lines) {
  const banner = element('banner')
  const body = element('banner-body')
  body.textContent = ''
  for (const line of lines) {
    const div = document.createElement('div')
    div.textContent = line
    body.append(div)
  }
  banner.classList.add('mp-banner--on')
  element('model-list').textContent = ''
  element('list-count').textContent = '0 个'
  element('list-size').textContent = '—'
}

function formatInt(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${Math.round(bytes / 1024)} KB`
}
