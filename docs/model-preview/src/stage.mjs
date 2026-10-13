/**
 * 模型检视页的三维舞台（审核用）。
 *
 * 与产品侧 `web/src/viewer/Viewer.ts` 的关系：
 *   · **同一套 three 库**（都从 `web/node_modules/three` 来，一份库两处用）；
 *   · `product` 这个环境方案**逐值复刻**产品的默认光照，审核时能直接对照"产品现在什么样"；
 *   · 取景算法（居中 + 按包围球推相机距离）也照抄产品那份，免得"看着不一样"是取景差异造成的。
 * 差别只在职责：产品 Viewer 是"加载一个模型并居中"，本文件是"把光照与材质摊开让人挑"。
 *
 * 三个纪律：
 *   1. **所有可调项都收敛在 `options` + `apply()`,** 不允许散在各处直接改 three 对象
 *      （否则"切换选项 → 画面没变"这类问题查不出来）；
 *   2. **切模型必须真正释放**几何 / 材质 / 贴图（教学页会反复进出，DEC-12 同类问题）；
 *   3. 读数一律**从 GLB 现读**，不引用清单里的数字 —— 清单漂了要能看出来。
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

/**
 * 影棚 HDR 环境贴图（本页要定的"环境"的第一候选）。
 * 落点：`content/assets/three/env/**`（Three 侧大资产，按 DEC-57 不进 git）；
 * 它**同时**当背景（天空盒）与光源（IBL），所以比"打灯"更接近实物拍摄。
 */
const ENV_URL = '../../content/assets/three/env/StudioWhiteUmbrella.exr'

/**
 * 环境方案：决定"灯 + 环境贴图 + 背景"，这是本页要定的第一件事。
 *
 * · `ibl`：`'exr'` 用影棚 HDR；`'room'` 用 three 自带的室内程序化环境；`null` 无环境贴图。
 * · `background`：非 null 时**强制**切到该背景（`'hdr'` = 天空盒），免得"换了环境方案画面底色没变"。
 */
export const ENV_PRESETS = {
  exr: {
    label: '影棚 HDRI · Studio White Umbrella（推荐）',
    lights: 'none',
    ibl: 'exr',
    background: 'hdr',
    note: 'Studio White Umbrella 的 HDR 既当背景（天空盒）又当光源：金属与高光会反射影棚的柔光箱，最接近实物拍摄。',
  },
  product: {
    label: '产品现状（Viewer.ts 默认）',
    lights: 'viewer',
    ibl: null,
    // 连背景一起回到产品的深色 —— "产品现状"这一档要的是**整体**可对照，不只是灯
    background: 'dark',
    note: '半球光 2.0 + 方向光 1.6 + 深色底、无环境贴图 —— 与 web/src/viewer/Viewer.ts 逐值一致。',
  },
  studio: {
    label: '灯光 + 室内 IBL',
    lights: 'viewer',
    ibl: 'room',
    background: null,
    note: '在现状之上叠一层 three 自带的室内环境贴图（无影棚反射，但比现状立体）。',
  },
  ibl: {
    label: '仅室内 IBL（无方向光）',
    lights: 'none',
    ibl: 'room',
    background: null,
    note: '只有室内环境贴图照明 —— 看材质对环境光的响应是否够亮、够立体。',
  },
  flat: {
    label: '仅环境光（诊断）',
    lights: 'ambient',
    ibl: null,
    background: null,
    note: '没有方向性：法线、UV、贴图接错的瑕疵在这档最容易暴露。',
  },
}

/** `hdr` 不是颜色，是"用环境贴图当天空盒"，故单独处理。 */
const BACKGROUNDS = {
  dark: 0x1b1f27,
  mid: 0x6b7078,
  light: 0xf0f2f5,
}

const TEXTURE_SLOTS = [
  'map',
  'normalMap',
  'metalnessMap',
  'roughnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
]

/** 递归释放几何与材质（贴图按材质实际引用释放）。 */
function disposeSubtree(root) {
  root.traverse((child) => {
    child.geometry?.dispose?.()
    const materials = child.material
      ? Array.isArray(child.material)
        ? child.material
        : [child.material]
      : []
    for (const material of materials) {
      for (const slot of TEXTURE_SLOTS) material[slot]?.dispose?.()
      material.dispose?.()
    }
  })
}

export class Stage {
  constructor(container) {
    this.container = container

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.shadowMap.enabled = false
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(BACKGROUNDS.dark)

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000)
    this.camera.position.set(2.2, 1.8, 2.6)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.autoRotateSpeed = 1.2
    // 右键不平移（审核时右键常用来"停下/看菜单"，平移会误触）；中键仍是缩放
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: null,
    }

    this.lights = new THREE.Group()
    this.scene.add(this.lights)

    this.axes = new THREE.AxesHelper(1)
    this.axes.visible = false
    this.scene.add(this.axes)

    this.loader = new GLTFLoader()
    this.pmrem = new THREE.PMREMGenerator(this.renderer)
    /** PMREM 后的环境贴图（给材质做 IBL） */
    this.envTexture = null
    /** 影棚 HDR 的原图（给天空盒当背景；PMREM 版太糊，不适合当背景） */
    this.exrSource = null
    /** three 自带室内环境生成的 PMREM（按需生成一次） */
    this.roomTexture = null
    /** 已经真正接上的环境方案（用来避免每帧重建灯光与重复生贴图） */
    this.appliedPreset = null
    this.appliedIbl = null

    this.model = null
    this.currentUrl = null
    this.materials = []
    /** material → 原始贴图槽位（关贴图时要能原样还回去） */
    this.textureSlots = new Map()
    /** material → 文件里的 PBR 常数（覆盖开关关掉时要能还回去） */
    this.basePbr = new Map()

    this.options = {
      preset: 'exr',
      background: 'hdr',
      toneMapping: 'none',
      exposure: 1,
      envIntensity: 1,
      textures: true,
      wireframe: false,
      axes: false,
      autoRotate: false,
      overridePbr: false,
      metalness: 0,
      roughness: 0.5,
    }

    this.frames = 0
    this.animationHandle = 0
    this.disposed = false

    this.observeResize()
    // 先把影棚 HDR 拉起来（5.6MB，本机读盘很快）；到货后自刷新一次，切到"天空盒"不用等
    this.exrReady = this.#loadExr().catch((error) => {
      this.exrError = error
      return null
    })
  }

  /** 渲染统计：给"不是白屏"一个可断言的证据，也便于手动排查。 */
  get renderStats() {
    const info = this.renderer.info.render
    return {
      frame: this.frames,
      calls: info.calls,
      triangles: info.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    }
  }

  get preset() {
    return ENV_PRESETS[this.options.preset] ?? ENV_PRESETS.product
  }

  start() {
    if (this.disposed || this.animationHandle !== 0) return
    const tick = () => {
      if (this.disposed) return
      this.animationHandle = window.requestAnimationFrame(tick)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
      this.frames += 1
    }
    this.animationHandle = window.requestAnimationFrame(tick)
  }

  /**
   * 唯一的选项入口：合并 patch 后整体重放（幂等，可反复调）。
   *
   * 只有**进着色器程序键**的项（色调映射 / 贴图有无 / 线框）才标记 `needsUpdate` ——
   * 拖曝光和金属度滑杆时如果每次重编译，画面会一顿一顿的。
   */
  apply(patch = {}) {
    const previous = { ...this.options }
    Object.assign(this.options, patch)
    const recompile =
      previous.toneMapping !== this.options.toneMapping ||
      previous.textures !== this.options.textures ||
      previous.wireframe !== this.options.wireframe
    this.#applyRenderer()
    this.#applyEnvironment()
    this.#applyMaterials()
    if (recompile) for (const material of this.materials) material.needsUpdate = true
  }

  async loadModel(url) {
    const started = performance.now()
    const gltf = await this.loader.loadAsync(url)
    const elapsed = performance.now() - started
    this.currentUrl = url

    this.clearModel()
    this.model = gltf.scene
    this.scene.add(this.model)
    this.#collectMaterials()
    const box = this.#frame(this.model)
    this.apply()
    return { object: this.model, box, elapsed }
  }

  /** 重新加载当前模型（用于"改完 GLB 再看一眼"，浏览器会因 no-store 拿到新文件）。 */
  reload() {
    if (!this.currentUrl) return Promise.resolve(null)
    return this.loadModel(this.currentUrl)
  }

  resetView() {
    const distance = this.homeDistance
    this.camera.near = Math.max(distance / 100, 0.01)
    this.camera.far = distance * 200
    this.camera.position.set(distance * 0.7, distance * 0.6, distance * 0.9)
    this.camera.updateProjectionMatrix()
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  clearModel() {
    if (!this.model) return
    this.scene.remove(this.model)
    disposeSubtree(this.model)
    this.model = null
    this.materials = []
    this.textureSlots.clear()
    this.basePbr.clear()
  }

  /**
   * 就地改过材质（渲染期解算：换贴图 / 接 ORM / 改表面模式）之后**必须重新快照**，
   * 否则"贴图开关"与"覆盖 PBR 常数"会把解算结果还原回旧的错值。
   * 由调用方在解算完成后调用一次。
   */
  refreshMaterialSnapshot() {
    this.textureSlots.clear()
    this.basePbr.clear()
    for (const material of this.materials) {
      const slots = {}
      for (const slot of TEXTURE_SLOTS) slots[slot] = material[slot] ?? null
      this.textureSlots.set(material, slots)
      this.basePbr.set(material, {
        metalness: material.metalness ?? 0,
        roughness: material.roughness ?? 1,
      })
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    if (this.animationHandle !== 0) window.cancelAnimationFrame(this.animationHandle)
    this.animationHandle = 0
    this.resizeObserver?.disconnect()
    this.clearModel()
    this.axes.geometry.dispose()
    this.axes.material.dispose()
    this.envTexture?.dispose()
    this.exrSource?.dispose()
    this.pmrem.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  // ── 内部 ────────────────────────────────────────────────────────────

  /** 影棚 HDR（等距柱状投影）→ 原图留给天空盒，PMREM 版留给材质做 IBL。 */
  async #loadExr() {
    const equirect = await new EXRLoader().loadAsync(ENV_URL)
    if (this.disposed) {
      equirect.dispose()
      return null
    }
    equirect.mapping = THREE.EquirectangularReflectionMapping
    this.exrSource = equirect
    this.exrTexture = this.pmrem.fromEquirectangular(equirect).texture
    this.apply()
    return true
  }

  #iblTexture(kind) {
    if (kind === 'exr') return this.exrTexture ?? null
    if (kind === 'room') {
      if (!this.roomTexture) {
        const room = new RoomEnvironment()
        this.roomTexture = this.pmrem.fromScene(room, 0.04).texture
        disposeSubtree(room)
      }
      return this.roomTexture
    }
    return null
  }

  #applyRenderer() {
    const wantSkybox = this.options.background === 'hdr'
    if (wantSkybox && this.exrSource) {
      this.scene.background = this.exrSource
      this.scene.backgroundIntensity = 1
    } else {
      // 天空盒未就绪（或选了纯色）时退回深色，避免出现白底/黑底这种"看起来像坏了"的画面
      this.scene.background = new THREE.Color(BACKGROUNDS[this.options.background] ?? BACKGROUNDS.dark)
    }
    this.renderer.toneMapping =
      this.options.toneMapping === 'aces' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping
    this.renderer.toneMappingExposure = this.options.exposure
  }

  #applyEnvironment() {
    const preset = this.preset
    const kind = preset.ibl ?? null

    // 灯只在**方案变了**时重建：拖滑杆会高频走到这里，不该每次都造灯
    if (this.appliedPreset !== this.options.preset) {
      this.appliedPreset = this.options.preset

      this.lights.clear()
      if (preset.lights === 'viewer') {
        // 逐值复刻 web/src/viewer/Viewer.ts 的默认光照
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 2.0)
        const dir = new THREE.DirectionalLight(0xffffff, 1.6)
        dir.position.set(3, 5, 2)
        this.lights.add(hemi, dir)
      } else if (preset.lights === 'ambient') {
        this.lights.add(new THREE.AmbientLight(0xffffff, 2.0))
      }
    }

    // 环境贴图按需取（影棚 HDR 是异步的，没到货就先挂 null，到货后 apply() 会再来一次）
    const texture = this.#iblTexture(kind)
    if (this.appliedIbl !== kind || this.scene.environment !== texture) {
      this.appliedIbl = kind
      this.scene.environment = texture
    }

    this.scene.environmentIntensity = this.options.envIntensity
    this.axes.visible = this.options.axes
    this.controls.autoRotate = this.options.autoRotate
  }

  #applyMaterials() {
    const { textures, wireframe, overridePbr, metalness, roughness } = this.options
    for (const material of this.materials) {
      const slots = this.textureSlots.get(material)
      if (slots) {
        for (const slot of TEXTURE_SLOTS) material[slot] = textures ? slots[slot] : null
      }
      const base = this.basePbr.get(material)
      if (base) {
        material.metalness = overridePbr ? metalness : base.metalness
        material.roughness = overridePbr ? roughness : base.roughness
      }
      material.wireframe = wireframe
    }
  }

  #collectMaterials() {
    const seen = new Set()
    this.model.traverse((child) => {
      const materials = child.material
        ? Array.isArray(child.material)
          ? child.material
          : [child.material]
        : []
      for (const material of materials) {
        if (seen.has(material.uuid)) continue
        seen.add(material.uuid)
        this.materials.push(material)
        const slots = {}
        for (const slot of TEXTURE_SLOTS) slots[slot] = material[slot] ?? null
        this.textureSlots.set(material, slots)
        this.basePbr.set(material, {
          metalness: material.metalness ?? 0,
          roughness: material.roughness ?? 1,
        })

      }
    })
  }

  /** 居中 + 按包围球推相机距离；返回原始包围盒尺寸（**不缩放** —— 尺度对不对是要看的结论之一）。 */
  #frame(object) {
    const box = new THREE.Box3().setFromObject(object)
    if (box.isEmpty()) return null
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1

    object.position.sub(center)

    this.homeDistance = radius / Math.tan((this.camera.fov * Math.PI) / 360) + radius
    this.axes.scale.setScalar(radius)
    this.resetView()
    return { size, radius }
  }

  observeResize() {
    const applySize = () => {
      const width = this.container.clientWidth || 1
      const height = this.container.clientHeight || 1
      this.renderer.setSize(width, height, false)
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    }
    applySize()
    this.resizeObserver = new ResizeObserver(applySize)
    this.resizeObserver.observe(this.container)
  }
}

/**
 * 从已加载的模型里现读读数（不引用任何清单）。
 *
 * ⚠️ 两个口径差异是**实测踩出来的**，不这样标会得出"清单错了"的假结论：
 *   · `meshes` = **glTF primitive 数**（GLTFLoader 一个 primitive 建一个 Mesh），
 *     而清单里的 `meshes` 是 Blender 的网格对象数 —— 一个网格拆多 primitive 时会不等；
 *   · `materials` = **three.js 材质实例数**，GLTFLoader 会因几何体缺法线/切线等**克隆**材质，
 *     所以实例数可能大于材质种类数。**要与清单比的是 `materialNames.size`**（按名字）。
 */
export function describeModel(object) {
  let meshes = 0
  let triangles = 0
  const materialSet = new Set()
  const nameSet = new Set()
  object.traverse((child) => {
    if (!child.isMesh) return
    meshes += 1
    const geometry = child.geometry
    const count = geometry.index ? geometry.index.count : (geometry.attributes.position?.count ?? 0)
    triangles += count / 3
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials) {
      if (!material) continue
      materialSet.add(material)
      nameSet.add(material.name || '(无名)')
    }
  })
  return {
    meshes,
    triangles: Math.round(triangles),
    materials: materialSet.size,
    materialKinds: nameSet.size,
  }
}

/** 材质的可读快照（含"贴图接了几张"），给读数面板用。 */
export function describeMaterials(materials) {
  return materials.map((material) => {
    const maps = []
    if (material.map) maps.push('BC')
    if (material.normalMap) maps.push('N')
    // 解算后的 ORM 是"同一张图挂三个槽位"，压成一个标记，别显示成 MR R AO 三张
    if (material.aoMap && material.aoMap === material.metalnessMap && material.aoMap === material.roughnessMap) {
      maps.push('ORM')
    } else {
      if (material.metalnessMap) maps.push('MR')
      if (material.roughnessMap) maps.push('R')
      if (material.aoMap) maps.push('AO')
    }
    if (material.emissiveMap) maps.push('EM')
    if (material.alphaMap) maps.push('A')
    return {
      name: material.name || '(无名)',
      type: material.type,
      metalness: material.metalness ?? null,
      roughness: material.roughness ?? null,
      maps,
      alpha: material.transparent ? '透明' : material.alphaTest > 0 ? `Mask ${material.alphaTest}` : '不透明',
      side: material.side === THREE.DoubleSide ? '双面' : '单面',
      color: material.color ? `#${material.color.getHexString()}` : null,
    }
  })
}
