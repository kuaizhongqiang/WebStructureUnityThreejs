/**
 * 产品侧的三维舞台：**带环境与材质解算的模型展示**（DEC-98）。
 *
 * 与 `Viewer.ts` 的分工（两个类不是替代关系）：
 *   · `Viewer`     —— "加载一个模型并居中"的最小封装（骨架自检页、条目型任务页在用）；
 *   · `ModelStage` —— 教学页要看**材质与环境**的那一类：影棚 HDR 当 IBL、画布透明、
 *     贴图**渲染期后加载**（DEC-97：GLB 里一张贴图都不带）。
 *
 * 表现**逐项对齐排版稿 C6 里那块真实画布**（否则"排版稿好看、产品里不是那么回事"）：
 *
 * | 项 | 取值 | 为什么 |
 * |---|---|---|
 * | 灯 | **不打灯**，只用环境贴图（IBL） | 影棚柔光箱的反射最接近实物拍摄 |
 * | 色调映射 / 曝光 | `NoToneMapping` / 1 | 与审核页同一档，改了就是两个画面 |
 * | 画布 | **透明**（`clearAlpha = 0` + `scene.background = null`） | 底色交给 `.ui-panel` 的毛玻璃，深浅主题自动跟随 |
 * | 相机 | 轨道旋转；**右键不平移** | 与审核页一致（右键在页面里另有用途） |
 *
 * 与 `docs/model-preview/`（审核页）的关系：**行为对齐、代码自负**。
 * 审核页是无构建的静态页、产品是打包的 TS，两边无法共用同一份源码而不把审核工具拖进产品构建链
 * （DEC-96 禁止）—— 这条已知重复登记在 `DECISIONS.md` §20 DEC-98 未闭合 a 与 `docs/TODO.md` D-09。
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { assetUrl, textureUrl, type SceneAssetTables } from './scene-assets'

/** 影棚 HDR：**同时**是光（IBL）与环境反射；落点与审核页同一份文件。 */
const ENV_FILE = 'env/StudioWhiteUmbrella.exr'

/** 取图重试次数（本地服务偶发抖动、解码未就绪都能被救回来）。 */
const TEXTURE_RETRIES = 3

/** 会被后加载的两类槽位（本类自己建、也要自己释放）。 */
const TEXTURE_SLOTS = [
  'map',
  'normalMap',
  'metalnessMap',
  'roughnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
] as const

type TextureSlot = (typeof TEXTURE_SLOTS)[number]

export interface ModelStageOptions {
  container: HTMLElement
  /** devicePixelRatio 上限（DEC-18：移动端封顶 1.5，教学页不追高）。 */
  pixelRatioCap?: number
}

/** 逐材质的解算记录（给页面/冒烟一个可复述的事实，而不是"看起来还行"）。 */
export interface ModelSolveRecord {
  name: string
  /** 规格里有这个材质吗（没有就是"只能照 GLB 原样显示"） */
  matched: boolean
  /** 是否接上了 mask→ORM（金属度/粗糙度由贴图驱动） */
  orm: boolean
  mode: string
  errors: string[]
}

export interface ModelStageStats {
  url: string | null
  frame: number
  calls: number
  triangles: number
  materials: number
  textures: number
  /** 影棚 HDR 没取到、退回 three 自带室内环境（画面仍可见，但**不是**排版稿那一档） */
  envFallback: boolean
}

export class ModelStage {
  private readonly container: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly loader = new GLTFLoader()
  private readonly pmrem: THREE.PMREMGenerator
  /** 本类自己建出来的贴图（环境、后加载的 base/normal/mask/ORM）——释放时逐个 dispose */
  private readonly ownTextures: THREE.Texture[] = []

  private model: THREE.Object3D | null = null
  private resizeObserver: ResizeObserver | null = null
  private animationHandle = 0
  private frameCount = 0
  private homeDistance = 5
  private disposed = false
  /** 加载代次：切项目时慢的那次 `loadAsync` 会晚到，靠它丢弃过期结果 */
  private generation = 0
  private currentUrl: string | null = null
  private envFallback = false
  private solved: ModelSolveRecord[] = []

  constructor(options: ModelStageOptions) {
    const { container, pixelRatioCap = 1.5 } = options
    this.container = container

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap))
    this.renderer.shadowMap.enabled = false
    // 透明画布 + 无色调映射 + 曝光 1：与排版稿那块画布同一档（见类注释的表）
    this.renderer.setClearAlpha(0)
    this.renderer.toneMapping = THREE.NoToneMapping
    this.renderer.toneMappingExposure = 1
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = null
    this.scene.environmentIntensity = 1

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000)
    this.camera.position.set(2.2, 1.8, 2.6)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: null,
    }

    this.pmrem = new THREE.PMREMGenerator(this.renderer)

    this.observeResize()
    void this.loadEnvironment()
  }

  /** 渲染统计：给冒烟一个可断言的"真的在渲染"的证据（DEC-27 第 3 条）。 */
  get renderStats(): ModelStageStats {
    const info = this.renderer.info
    return {
      url: this.currentUrl,
      frame: this.frameCount,
      calls: info.render.calls,
      triangles: info.render.triangles,
      materials: this.solved.length,
      textures: info.memory.textures,
      envFallback: this.envFallback,
    }
  }

  /** 逐材质解算记录（冒烟与人工排查用）。 */
  get solveRecords(): readonly ModelSolveRecord[] {
    return this.solved
  }

  start(): void {
    if (this.disposed || this.animationHandle !== 0) return
    const tick = (): void => {
      if (this.disposed) return
      this.animationHandle = window.requestAnimationFrame(tick)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
      this.frameCount += 1
    }
    this.animationHandle = window.requestAnimationFrame(tick)
  }

  /**
   * 加载模型并按规格解算材质。返回 `null` = **本次加载已被更新的请求取代**（调用侧丢弃即可，
   * 不要把结果写进页面状态）。
   */
  async loadModel(
    url: string,
    context: { device: string; tables: SceneAssetTables },
  ): Promise<{ records: ModelSolveRecord[] } | null> {
    const generation = (this.generation += 1)
    const gltf = await this.loader.loadAsync(url)
    if (this.disposed || generation !== this.generation) return null

    // ⚠️ 这里只能释放**旧模型**，不能走 `clearModel()` —— 它会自增代次，
    //    于是本次加载在解算完就被自己判成"过期"，`ready` 永远设不上（画面却已经渲染出来了）。
    this.releaseModel()
    this.currentUrl = url
    this.model = gltf.scene
    this.scene.add(this.model)
    this.frameModel(this.model)
    const records = await this.solveMaterials(gltf.scene, context)
    if (this.disposed || generation !== this.generation) return null
    this.solved = records
    return { records }
  }

  /** 丢弃当前加载并释放模型（外部调用：切项目 / 离开页面时用）。 */
  clearModel(): void {
    this.generation += 1
    this.releaseModel()
  }

  /** 只释放模型与它带的资源，**不动加载代次**（加载流程内部"换模型"时用这个）。 */
  private releaseModel(): void {
    this.currentUrl = null
    this.solved = []
    if (!this.model) return
    this.scene.remove(this.model)
    const materials = collectStandardMaterials(this.model)
    this.model.traverse((child) => {
      ;(child as THREE.Mesh).geometry?.dispose?.()
    })
    for (const material of materials) {
      for (const slot of TEXTURE_SLOTS) material[slot]?.dispose?.()
      material.dispose()
    }
    this.model = null
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.animationHandle !== 0) window.cancelAnimationFrame(this.animationHandle)
    this.animationHandle = 0
    this.resizeObserver?.disconnect()
    this.resizeObserver = null

    this.clearModel()
    for (const texture of this.ownTextures) texture.dispose()
    this.ownTextures.length = 0
    this.scene.environment = null
    this.pmrem.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  // ── 环境 ──────────────────────────────────────────────────────────────

  private async loadEnvironment(): Promise<void> {
    try {
      const equirect = await new EXRLoader().loadAsync(assetUrl(ENV_FILE))
      if (this.disposed) {
        equirect.dispose()
        return
      }
      equirect.mapping = THREE.EquirectangularReflectionMapping
      this.ownTextures.push(equirect)
      // 背景是透明的，用不上天空盒；只要 PMREM 之后的那份做 IBL
      const env = this.pmrem.fromEquirectangular(equirect).texture
      this.ownTextures.push(env)
      this.scene.environment = env
    } catch (cause) {
      // 影棚 HDR 缺失不该让画面全黑：退回 three 自带的室内环境，并把"这是退档"记进统计
      this.envFallback = true
      const room = new RoomEnvironment()
      const env = this.pmrem.fromScene(room, 0.04).texture
      for (const material of collectStandardMaterials(room)) material.dispose()
      room.traverse((child) => (child as THREE.Mesh).geometry?.dispose?.())
      this.ownTextures.push(env)
      this.scene.environment = env
      console.warn(
        `[ModelStage] 影棚 HDR 取不到（${ENV_FILE}），已退回室内环境：${
          cause instanceof Error ? cause.message : String(cause)
        }`,
      )
    }
  }

  // ── 材质解算（口径见 DEC-97 / DEC-98） ─────────────────────────────────

  /**
   * 按规格接好材质。**就地改**（不重建材质、不动几何），三条：
   *   ① 基色 / 法线按**规格声明的文件名**接（按前缀挂钩会把第二/第三套子材质全套上主干贴图）；
   *   ② `*_M_AO_G.png` 是 HDRP Lit 排布（R=金属度 / G=AO / A=光泽度），
   *      glTF 要 ORM（R=AO / G=粗糙度 / B=金属度）—— 通道语义不同，**必须重排**，
   *      且区间重映射要烘进像素（AO 下界 0.5，不是 0）；
   *   ③ 表面模式 / 双面 / 法线强度以规格为准做最后一道对齐。
   */
  private async solveMaterials(
    root: THREE.Object3D,
    context: { device: string; tables: SceneAssetTables },
  ): Promise<ModelSolveRecord[]> {
    const { device, tables } = context
    const records: ModelSolveRecord[] = []

    for (const material of collectStandardMaterials(root)) {
      const entry = tables.materials[material.name]
      const record: ModelSolveRecord = {
        name: material.name || '(无名)',
        matched: Boolean(entry),
        orm: false,
        mode: entry?.surfaceMode ?? 'OPAQUE',
        errors: [],
      }

      if (entry) {
        const wanted: Array<[TextureSlot, string | null | undefined, string]> = [
          ['map', entry.textures?.baseColor, THREE.SRGBColorSpace],
          ['normalMap', entry.textures?.normal, THREE.NoColorSpace],
        ]
        // 两张**并行**取（省一趟往返），各自独立报错、互不拖累
        await Promise.all(
          wanted
            .filter(([, base]) => Boolean(base))
            .map(async ([slot, base, colorSpace]) => {
              try {
                const url = textureUrl(tables, device, base as string)
                if (!url) throw new Error(`查找表里没有 ${device}/${base}`)
                const texture = await this.loadTexture(url, base as string, colorSpace)
                material[slot]?.dispose?.()
                material[slot] = texture
              } catch (cause) {
                record.errors.push(cause instanceof Error ? cause.message : String(cause))
              }
            }),
        )
        material.normalScale.setScalar(entry.normalStrength ?? 1)

        if (entry.textures?.mask) {
          try {
            const url = textureUrl(tables, device, entry.textures.mask)
            if (!url) throw new Error(`查找表里没有 ${device}/${entry.textures.mask}`)
            const orm = await this.buildOrmTexture(url, entry.remap)
            material.aoMap = orm
            material.metalnessMap = orm
            material.roughnessMap = orm
            material.aoMapIntensity = 1
            material.metalness = 1
            material.roughness = 1
            record.orm = true
          } catch (cause) {
            record.errors.push(cause instanceof Error ? cause.message : String(cause))
          }
        } else {
          material.metalness = entry.scalars?.metallic ?? 0
          material.roughness = 1 - (entry.scalars?.smoothness ?? 0.5)
        }

        const alpha = entry.baseColor?.[3] ?? 1
        if (entry.surfaceMode === 'MASK') {
          material.alphaTest = entry.alphaCutoff ?? 0.5
          material.transparent = false
          material.depthWrite = true
        } else if (entry.surfaceMode === 'BLEND') {
          material.transparent = true
          material.depthWrite = false
          material.alphaTest = 0
          material.opacity = alpha
          // 纯白贴图 × α 的材质（玻璃 / 透明罩）：源工程的 `_BaseColor` 就是它的染色
          if (/^White\./i.test(entry.textures?.baseColor ?? '') && entry.baseColor) {
            material.color.setRGB(entry.baseColor[0] ?? 1, entry.baseColor[1] ?? 1, entry.baseColor[2] ?? 1)
          }
        } else {
          material.alphaTest = 0
          material.transparent = false
          material.depthWrite = true
        }
        material.side = entry.doubleSided ? THREE.DoubleSide : THREE.FrontSide
        material.needsUpdate = true
      }

      if (record.errors.length > 0) {
        // 用 warn 不用 error：页面没坏，但**必须**留下可查的记录（冒烟按 console.error 判失败）
        console.warn(`[ModelStage] 材质解算未完全成功 —— ${record.name}：${record.errors.join('；')}`)
      }
      records.push(record)
    }
    return records
  }

  /**
   * 取图 → `ImageBitmap`（带重试）。
   *
   * 不用 `TextureLoader`：它内部是 `<img>` + `onerror`，失败时只给一个"图裂"式的结果，
   * HTTP 状态 / 解码失败 / 0×0 都报不出来。
   */
  private async fetchBitmap(url: string, label: string): Promise<ImageBitmap> {
    let lastError: unknown = null
    for (let attempt = 1; attempt <= TEXTURE_RETRIES; attempt += 1) {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const bitmap = await createImageBitmap(await response.blob())
        if (!bitmap.width || !bitmap.height) throw new Error('解出来是 0×0')
        return bitmap
      } catch (cause) {
        lastError = cause
        if (attempt < TEXTURE_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 120 * attempt))
        }
      }
    }
    throw new Error(`${label} 取不到（试了 ${TEXTURE_RETRIES} 次）：${String(lastError)}`)
  }

  private async loadTexture(url: string, name: string, colorSpace: string): Promise<THREE.Texture> {
    const bitmap = await this.fetchBitmap(url, name)
    const texture = new THREE.Texture(bitmap)
    // ⚠️ 从 ImageBitmap 直接建纹理必须自己标脏，否则永远不上传（`TextureLoader` 会替你标）
    texture.needsUpdate = true
    texture.colorSpace = colorSpace
    /**
     * ⚠️ `flipY = false`：glTF 的 UV 原点在**左上**，GLTFLoader 从 GLB 取图时一律设 false。
     * 贴图改成"渲染期后加载"之后，外部加载的图**必须自己补上** ——
     * 否则 base / normal 整张上下翻转（而 mask 因为建 ORM 时显式设过反而是对的，
     * 症状就是"只有 mask 是对的"）。`wrap` 同理（glTF 默认 REPEAT）。
     */
    texture.flipY = false
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.name = name
    this.ownTextures.push(texture)
    return texture
  }

  /**
   * `*_M_AO_G.png` → glTF ORM：
   *   R ← Remap(AO, G)   G ← 1 − Remap(Smoothness, A)   B ← Remap(Metallic, R)
   * 区间重映射**烘进像素**（AO 下界是 0.5 不是 0，否则画面整体偏暗）。
   */
  private async buildOrmTexture(
    url: string,
    remap: Record<string, number[] | undefined> | undefined,
  ): Promise<THREE.Texture> {
    const bitmap = await this.fetchBitmap(url, 'ORM(mask)')
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('拿不到 2D 上下文，无法重排 mask 通道')
    context.drawImage(bitmap, 0, 0)
    bitmap.close?.()

    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    const data = image.data
    const [aoMin = 0, aoMax = 1] = remap?.occlusion ?? []
    const [glossMin = 0, glossMax = 1] = remap?.smoothness ?? []
    const [metalMin = 0, metalMax = 1] = remap?.metallic ?? []
    for (let i = 0; i < data.length; i += 4) {
      const metallic = (data[i] ?? 0) / 255
      const ao = (data[i + 1] ?? 0) / 255
      const gloss = (data[i + 3] ?? 0) / 255
      data[i] = Math.round((aoMin + ao * (aoMax - aoMin)) * 255)
      data[i + 1] = Math.round((1 - (glossMin + gloss * (glossMax - glossMin))) * 255)
      data[i + 2] = Math.round((metalMin + metallic * (metalMax - metalMin)) * 255)
      data[i + 3] = 255
    }
    context.putImageData(image, 0, 0)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.NoColorSpace // 数据贴图（不是颜色），不能走 sRGB
    texture.flipY = false
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.name = 'ORM'
    this.ownTextures.push(texture)
    return texture
  }

  // ── 取景与尺寸 ────────────────────────────────────────────────────────

  /** 居中 + 按包围球推相机距离（**不缩放** —— 尺度不对是要被看见的）。 */
  private frameModel(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object)
    if (box.isEmpty()) return
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1

    object.position.sub(center)

    this.homeDistance = radius / Math.tan((this.camera.fov * Math.PI) / 360) + radius
    this.resetView()
  }

  private resetView(): void {
    const distance = this.homeDistance
    this.camera.near = Math.max(distance / 100, 0.01)
    this.camera.far = distance * 200
    this.camera.position.set(distance * 0.7, distance * 0.6, distance * 0.9)
    this.camera.updateProjectionMatrix()
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  private observeResize(): void {
    const apply = (): void => {
      const width = this.container.clientWidth || 1
      const height = this.container.clientHeight || 1
      this.renderer.setSize(width, height, false)
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    }
    apply()
    this.resizeObserver = new ResizeObserver(apply)
    this.resizeObserver.observe(this.container)
  }
}

/** 收集子树里的标准材质（去重）——GLTFLoader 会因几何缺法线/切线而**克隆**材质，所以按实例去重。 */
function collectStandardMaterials(root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const found = new Set<THREE.MeshStandardMaterial>()
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of list) {
      const standard = material as THREE.MeshStandardMaterial | null
      if (standard?.isMeshStandardMaterial) found.add(standard)
    }
  })
  return [...found]
}
