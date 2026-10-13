/**
 * 渲染期材质解算：**贴图全部后加载 + 按规格解算**。
 *
 * 口径（负责人 2026-10-13 定）：**GLB 只出网格与材质，一张贴图都不带**；
 * base(含 alpha) / normal / mask 三张图都在渲染期按查找表加载。
 * 这么定的直接好处：贴图正是反复要调的东西，换成"改文件即生效"，不必重导 GLB。
 *
 * 加载后要做的三件事（都来自源工程的真值，不是猜）：
 *   ① 基色 / 法线：按**规格里声明的文件名**接（按 FBX 同名前缀挂钩会把第二/第三套子材质
 *      全套上主干贴图 —— 贴花显示车身纹理就是这么来的）；
 *   ② mask → ORM：`*_M_AO_G.png` 是 HDRP Lit 排布（**R=Metallic、G=AO、A=Smoothness**），
 *      glTF 要 ORM（**R=AO、G=Roughness、B=Metallic**）—— 通道语义不同，必须重排，
 *      而且区间重映射**要烘进像素**（AO 的下界是 0.5，不是 0），否则画面整体偏暗；
 *   ③ 表面模式（MASK / BLEND / OPAQUE）与双面：源工程写在材质里，GLB 里也带了一份，
 *      这里以规格为准做最后一道对齐。
 *
 * 规格来源：`content/asset-material-spec.json`；贴图落点与查找表：`content/asset-material-textures.json`
 * （由 `tools/pipeline/import-material-textures.mjs` 生成）。
 */

import * as THREE from 'three'

const REPO_PREFIX = '../../'

/** 取图重试次数（本地服务偶发抖动、解码未就绪都能被这一两次重试救回来）。 */
const TEXTURE_RETRIES = 3

/**
 * 取图 → ImageBitmap，**带重试**。
 *
 * 为什么不直接用 `TextureLoader`：它内部是 `<img>` + `onerror`，失败时只给一个"图裂"式的结果，
 * HTTP 状态、解码失败、0×0 都**报不出来**；改成 fetch 之后每一步都能给出人话错误。
 * base / normal / mask 三条路都走这一个函数，行为一致（以前 ORM 用 fetch、base/normal 用 TextureLoader，两套）。
 */
async function fetchBitmap(url, label = url) {
  let lastError = null
  for (let attempt = 1; attempt <= TEXTURE_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const bitmap = await createImageBitmap(await response.blob())
      if (!bitmap.width || !bitmap.height) throw new Error('解出来是 0×0')
      return bitmap
    } catch (error) {
      lastError = error
      if (attempt < TEXTURE_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 120 * attempt))
      }
    }
  }
  throw new Error(`${label} 取不到（试了 ${TEXTURE_RETRIES} 次）：${lastError?.message ?? lastError}`)
}

/**
 * 贴图 URL：**只用查找表**（`content/asset-material-textures.json`，由搬运脚本生成）。
 *
 * 不用"逐个目录试探"是有代价的：浏览器里每个 404 都会进 console，审核页要求零错误；
 * 而且试探顺序错了会静默挂错图。查不到就明确报错。
 */
function textureUrl(lookup, device, base) {
  const relative = lookup?.[`${device}/${base}`] ?? lookup?.[`_shared/${base}`]
  return relative ? REPO_PREFIX + relative : null
}

async function loadTexture(lookup, device, base, colorSpace) {
  const url = textureUrl(lookup, device, base)
  if (!url) throw new Error(`查找表里没有 ${device}/${base}（跑 tools/pipeline/import-material-textures.mjs 补搬）`)
  // 与 mask 同一条取图路（fetch + 重试 + 明确报错），只是这里要用这张图做材质贴图，所以不 close 它
  const bitmap = await fetchBitmap(encodeURI(REPO_PREFIX + url), base)
  const texture = new THREE.Texture(bitmap)
  // ⚠️ 从 ImageBitmap 直接建纹理必须自己标脏，否则永远不上传（`TextureLoader` 会替你标，现在得自己来）
  texture.needsUpdate = true
  texture.colorSpace = colorSpace
  /**
   * ⚠️ **`flipY` 必须为 false**：glTF 的 UV 原点在**左上**（Blender 导出时按此写 UV），
   * 所以从 GLB 里取出来的贴图，three 的 GLTFLoader 一律设 `flipY = false`。
   * 改成"贴图后加载"之后，外部加载的图**必须自己补上这条**，否则整张图上下翻转
   * （base 与 normal 全错位；而 mask 因为建 ORM 时显式设过 `flipY = false` 反而是对的 ——
   * "只有 mask 对"就是这条漏了的典型症状）。
   * `wrap` 同理：glTF 默认 REPEAT，从 GLB 里出来就是 REPEAT，外部加载要保持一致。
   */
  texture.flipY = false
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.name = base
  return texture
}

/**
 * `*_M_AO_G.png` → glTF ORM 贴图。
 *
 * 重排（源工程 HDRP Lit 通道语义 → glTF 通道语义）：
 *   R ← Remap(AO,        G, [OAMin, OAMax])
 *   G ← 1 − Remap(Smoothness, A, [SmoothnessMin, SmoothnessMax])
 *   B ← Remap(Metallic,  R, [MetallicMin, MetallicMax])
 */
export async function buildOrmTexture(url, remap) {
  const bitmap = await fetchBitmap(url)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(bitmap, 0, 0)
  bitmap.close?.()

  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  const [aoMin, aoMax] = remap.occlusion
  const [glossMin, glossMax] = remap.smoothness
  const [metalMin, metalMax] = remap.metallic
  for (let i = 0; i < data.length; i += 4) {
    const metallic = data[i] / 255
    const ao = data[i + 1] / 255
    const gloss = data[i + 3] / 255
    data[i] = Math.round((aoMin + ao * (aoMax - aoMin)) * 255)
    data[i + 1] = Math.round((1 - (glossMin + gloss * (glossMax - glossMin))) * 255)
    data[i + 2] = Math.round((metalMin + metallic * (metalMax - metalMin)) * 255)
    data[i + 3] = 255
  }
  context.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace // 数据贴图（不是颜色），不能走 sRGB
  texture.flipY = false // glTF 的 UV 约定：贴图不翻转
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.name = 'ORM'
  return texture
}

/** 贴图名比对（忽略扩展名与大小写）：GLB 里已带的就不重复下载。 */
const sameName = (a, b) =>
  Boolean(a) === Boolean(b) &&
  String(a ?? '')
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase() ===
    String(b ?? '')
      .replace(/\.[a-z0-9]+$/i, '')
      .toLowerCase()

/**
 * 给已加载的模型按规格接好材质。返回逐材质的核对记录（给读数面板与自动核对用）。
 *
 * ⚠️ 这里**不**动几何、不重建材质：只在原材质上就地改（DEC-87 的降级口径）。
 */
export async function resolveMaterials({ gltf, device, stem, spec, lookup, log, commit }) {
  const records = []
  const materials = []
  gltf.scene.traverse((child) => {
    if (!child.isMesh) return
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (material && !materials.includes(material)) materials.push(material)
    }
  })

  for (const material of materials) {
    const entry = spec.materials?.[material.name] ?? null
    const record = {
      name: material.name || '(无名)',
      matched: Boolean(entry),
      swapped: [],
      orm: false,
      mode: entry?.surfaceMode ?? material.alphaModeFallback ?? 'OPAQUE',
      errors: [],
    }

    if (entry) {
      // ① 基色 / 法线：库里那份是"按前缀错挂"的（或 GLB 根本没带），按规格接上。
      //    两张**并行**取（省一趟往返），各自独立报错、互不拖累。
      const wanted = [
        ['map', entry.textures.baseColor, THREE.SRGBColorSpace],
        ['normalMap', entry.textures.normal, THREE.NoColorSpace],
      ].filter(([slot, base]) => base && !sameName(material[slot]?.name, base))
      await Promise.all(
        wanted.map(async ([slot, base, colorSpace]) => {
          try {
            const texture = await loadTexture(lookup, device, base, colorSpace)
            const previous = material[slot]
            // ⚠️ 走 `commit` 而不是直接赋值：解算途中只要有一次 `apply()`（控件一动就会调），
            //    直接写在材质上的值会被快照里的 null 覆盖回去 —— 这就是"偶现加载不出来"。
            if (commit) commit(material, slot, texture)
            else material[slot] = texture
            previous?.dispose?.()
            record.swapped.push(slot === 'map' ? base : `N:${base}`)
          } catch (error) {
            record.errors.push(String(error.message ?? error))
          }
        }),
      )

      // ①b 法线强度：以前由 GLB 的 `normalTexture.scale` 带出去，改成后加载后要自己按规格给
      material.normalScale.setScalar(entry.normalStrength ?? 1)

      // ② mask → ORM（没有 mask 的材质走 `_Metallic` / `_Smoothness` 标量）
      if (entry.textures.mask) {
        try {
          // mask 与 base/normal 走**同一套查找表**（以前它是唯一一个直读 Unity 侧路径的例外，
          // 那条路径在产品里不存在 —— 现在三张图一视同仁，打包时一起带走即可）
          const maskUrl = textureUrl(lookup, device, entry.textures.mask)
          if (!maskUrl) throw new Error(`查找表里没有 ${device}/${entry.textures.mask}`)
          const orm = await buildOrmTexture(REPO_PREFIX + maskUrl, entry.remap)
          // 同样要 commit：否则解算途中的 apply() 会把 ORM 一起清掉（症状同 base/normal）
          if (commit) {
            commit(material, 'aoMap', orm)
            commit(material, 'metalnessMap', orm)
            commit(material, 'roughnessMap', orm)
          } else {
            material.aoMap = orm
            material.metalnessMap = orm
            material.roughnessMap = orm
          }
          material.aoMapIntensity = 1
          material.metalness = 1
          material.roughness = 1
          record.orm = true
        } catch (error) {
          record.errors.push(String(error.message ?? error))
        }
      } else {
        material.metalness = entry.scalars?.metallic ?? 0
        material.roughness = 1 - (entry.scalars?.smoothness ?? 0.5)
      }

      // ③ 表面模式（MASK 靠贴图 alpha 裁，BLEND 靠 baseColor 的 α）
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
        if (/^White\./i.test(entry.textures.baseColor ?? '')) {
          material.color.setRGB(entry.baseColor[0], entry.baseColor[1], entry.baseColor[2])
        }
      } else {
        material.alphaTest = 0
        material.transparent = false
        material.depthWrite = true
      }

      material.side = entry.doubleSided ? THREE.DoubleSide : THREE.FrontSide
      material.needsUpdate = true
    }

    if (record.errors.length > 0) log?.(`材质 ${record.name} 解算有问题：${record.errors.join('；')}`)
    records.push(record)
  }

  return records
}
