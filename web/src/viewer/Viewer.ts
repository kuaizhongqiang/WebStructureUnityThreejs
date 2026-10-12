/**
 * 裸 three 的 Viewer（DEC-15：不使用 R3F / TresJS 这类声明式封装）。
 *
 * 设计要点：
 *   - 由本类**独占**渲染循环与 WebGL 上下文，外部只通过方法交互；
 *   - `dispose()` 是必须调用的：教学页面会反复进出，不释放必然泄漏上下文（DEC-12 同类问题）；
 *   - 移动端约束（DEC-18）：像素比默认封顶 1.5、不开重后处理。
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export interface ViewerOptions {
  container: HTMLElement
  /** devicePixelRatio 上限。移动端建议 1.5，桌面可 2。 */
  pixelRatioCap?: number
  background?: number
}

export class Viewer {
  private readonly container: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly loader: GLTFLoader
  private readonly pixelRatioCap: number
  private readonly disposables: Array<{ dispose: () => void }> = []

  private resizeObserver: ResizeObserver | null = null
  private animationHandle = 0
  private disposed = false
  private frameCount = 0

  /**
   * 渲染统计。用途：给冒烟测试一个可断言的"真的在渲染"的证据（DEC-27 第 3 条），
   * 也便于手动排查白屏问题。
   */
  get renderStats(): { frame: number; calls: number; triangles: number; lines: number } {
    const info = this.renderer.info.render
    return {
      frame: this.frameCount,
      calls: info.calls,
      triangles: info.triangles,
      lines: info.lines,
    }
  }

  constructor(options: ViewerOptions) {
    const { container, pixelRatioCap = 1.5, background = 0x1b1f27 } = options
    this.container = container
    this.pixelRatioCap = pixelRatioCap

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.pixelRatioCap))
    this.renderer.shadowMap.enabled = false
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(background)

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000)
    this.camera.position.set(2.2, 1.8, 2.6)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.disposables.push(this.controls)

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 2.0)
    const dir = new THREE.DirectionalLight(0xffffff, 1.6)
    dir.position.set(3, 5, 2)
    this.scene.add(hemi, dir)

    const grid = new THREE.GridHelper(10, 20, 0x3a4152, 0x2a2f3a)
    const gridMaterial = grid.material as THREE.Material
    this.disposables.push(gridMaterial, grid.geometry)
    this.scene.add(grid)

    this.loader = new GLTFLoader()

    this.observeResize()
  }

  /** 开始渲染循环（幂等）。 */
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

  /** 加载 GLB/glTF 并居中放入场景；返回加载出的根节点。 */
  async loadModel(url: string): Promise<THREE.Object3D> {
    const gltf = await this.loader.loadAsync(url)
    const root = gltf.scene
    this.scene.add(root)
    this.frameObject(root)
    return root
  }

  /** 把相机对到目标物体上（教学场景里"查看某个模型"的默认行为）。 */
  frameObject(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object)
    if (box.isEmpty()) return
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1

    object.position.sub(center)

    const distance = radius / Math.tan((this.camera.fov * Math.PI) / 360) + radius
    this.camera.near = Math.max(distance / 100, 0.01)
    this.camera.far = distance * 100
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

  /** 释放全部 GPU 资源与监听。**必须调用**，否则反复进出页面会泄漏。 */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.animationHandle !== 0) window.cancelAnimationFrame(this.animationHandle)
    this.animationHandle = 0
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.scene.traverse((child) => {
      const mesh = child as THREE.Mesh
      mesh.geometry?.dispose?.()
      const material = mesh.material
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose?.()
    })
    this.scene.clear()
    for (const item of this.disposables) item.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
