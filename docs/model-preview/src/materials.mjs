/**
 * 渲染期材质解算：把 GLB 里**带不动**的部分按源工程的规格补上。
 *
 * 为什么必须在渲染期做（而不是"转 GLB 时烘进去"）：
 *   · `_MaskMap` 是 HDRP Lit 排布（**R=Metallic、G=AO、B=DetailMask、A=Smoothness**），
 *     glTF 要的是 ORM（**R=AO、G=Roughness、B=Metallic**）—— 通道语义不同，同一张图不能直接用；
 *   · 第二/第三套子材质有自己的贴图（铭牌 / 贴花 / 面板图 / 纯白 × α），
 *     按文件名前缀挂钩会全部套上主干贴图；
 *   · 表面模式（MASK / BLEND）与 `_Cull` 只写在源工程的材质里。
 * 三者都能在加载后按规格修正 —— 所以 GLB 保持现状也能显示正确。
 *
 * 规格来源：`content/asset-material-spec.json`（`tools/pipeline/extract-material-spec.mjs` 从只读来源工程抽出）。
 * 区间重映射**必须烘进像素**（AO 的下界是 0.5，不是 0），否则画面会整体偏暗。
 */

import * as THREE from 'three'

/** mask 图已在库内（Unity 侧原地落点），按固定规则读，避免再拷一份 24MB。 */
const MASK_ROOT = '../../NewStructureUnity/Assets/Models/<device>'
const REPO_PREFIX = '../../'

const withDevice = (template, device) => template.replace('<device>', device)

async function fetchBitmap(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return createImageBitmap(await response.blob())
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
  const texture = await new THREE.TextureLoader().loadAsync(encodeURI(url))
  texture.colorSpace = colorSpace
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
export async function resolveMaterials({ gltf, device, stem, spec, lookup, log }) {
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
      // ① 基色 / 法线：GLB 里那份是"按前缀错挂"的，按规格换掉
      for (const [slot, base, colorSpace] of [
        ['map', entry.textures.baseColor, THREE.SRGBColorSpace],
        ['normalMap', entry.textures.normal, THREE.NoColorSpace],
      ]) {
        if (!base) continue
        if (sameName(material[slot]?.name, base)) continue
        try {
          const previous = material[slot]
          material[slot] = await loadTexture(lookup, device, base, colorSpace)
          previous?.dispose?.()
          record.swapped.push(slot === 'map' ? base : `N:${base}`)
        } catch (error) {
          record.errors.push(String(error.message ?? error))
        }
      }

      // ② mask → ORM（没有 mask 的材质走 `_Metallic` / `_Smoothness` 标量）
      if (entry.textures.mask) {
        try {
          const orm = await buildOrmTexture(`${withDevice(MASK_ROOT, device)}/${encodeURIComponent(entry.textures.mask)}`, entry.remap)
          material.aoMap = orm
          material.metalnessMap = orm
          material.roughnessMap = orm
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
