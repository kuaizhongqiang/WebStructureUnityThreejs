# 调研 02：Web / Three.js 线（简单三维交互）

> 读者：AI 与人｜状态：2026-10-12 v0｜性质：技术调研，**★ 是当时的建议值**。
> ⚠️ 本文的选型建议**已被 `../DECISIONS.md` 取代**：最终决定为 DEC-15 / DEC-33（Vite + TS 5.9.3 + Vue 3 + 裸 three）、DEC-16（DOM 覆盖层）、DEC-17（现代浏览器）、DEC-18（支持移动端、排除 iOS Safari）、DEC-19（`web/`）。落地与实测结果见 `07-web-scaffold.md`。冲突时以 `DECISIONS.md` 为准。

## 1 现状事实

- **Web 工程尚不存在**：本仓库根目录只有 `AGENT.md` / `README.md` / `LICENSE` / `docs/` / `NewStructureUnity/`（实测）。
- 本机工具链（实测）：Node **v24.19.0**、npm **11.17.0**、pnpm **11.7.0**、git **2.53.0**、Python **3.12.0**。
- npm 已配代理：`http.proxy = http://127.0.0.1:10808`、`registry = https://registry.npmjs.org/`；**实测可拉取**（见 §3）。

## 2 技术栈选型（**核心待决**）

### 2.1 构建工具

| 选项 | 优点 | 代价 |
|---|---|---|
| **Vite** ★建议 | 生态最大、TS 开箱即用、`import()` 天然对应"分模块按需加载" | 超大工程生产构建偏慢 |
| Rspack | Rust 内核、构建快 | 插件生态与团队熟悉度不如 Vite |
| webpack | 兼容一切 | 配置负担重，新项目无必要 |

### 2.2 语言

- **TypeScript** ★建议：双端（C# ↔ TS）共享 `SceneState` / `TaskType` 契约时，类型是成本最低的防漂移手段；`@types/three` 也能显著减少运行期错误。
- 纯 JS：仅在"必须兼容老旧内核"的极端约束下才有意义（见 §5）。

### 2.3 UI 框架（页面外壳与教学界面）

| 选项 | 优点 | 代价 |
|---|---|---|
| **Vue 3** ★建议（若无强偏好） | 上手快、单文件组件适合"每教学页一个组件"、中文生态好 | — |
| React 19 | 生态最大；配 `@react-three/fiber` 可声明式写场景 | 心智负担略高 |
| 无框架（原生 TS + DOM） | 依赖最少、可控性最强 | 页面一多，状态管理要自己造 |

> 这是**团队偏好 + 页数规模**的决定，不是技术优劣。
> ★ 更稳的默认组合：**UI 用框架、三维用裸 three（命令式、自己控制渲染循环）**，避免"声明式三维"在教学软件里引入难调试的性能与生命周期问题。

### 2.4 三维渲染层

- **`three` + `@types/three`** ★建议直接用**裸 three**，封装成自己的 `Viewer` 模块（持有 `WebGLRenderer` / `Scene` / 渲染循环）。理由：简单三维的范围可控，封装成本低于学习 R3F/TresJS 的生命周期模型，且与 Unity 侧"我们自己控制场景"的心智一致。
- 可选封装 `@react-three/fiber`（React）/ `@tresjs/core`（Vue）：适合页面上有大量小型三维组件复用的场景；**当前不建议作为默认**。

## 3 依赖版本探测结果（2026-10-12 实测，经代理直查 npm registry）

| 包 | 最新版 | 备注 |
|---|---|---|
| `three` | 0.186.1 | 主库 |
| `@types/three` | 0.186.0 | 需与 `three` 次版本对齐 |
| `vite` | 8.3.4 | 构建 |
| `typescript` | 7.0.2 | ⚠️ 7.x 为原生重写线，**与 `vue-tsc`/`eslint` 等生态的兼容性本项目尚未实测** |
| `vue` | 3.5.43 | 备选 UI |
| `react` | 19.3.0 | 备选 UI |
| `@react-three/fiber` | 9.8.1 | 备选三维封装 |
| `@tresjs/core` | 5.9.3 | 备选三维封装 |
| `pinia` | 4.0.3 | Vue 状态管理 |
| `zustand` | 5.0.15 | React 状态管理 |
| `sass` | 1.105.1 | 样式（如需要） |
| `eslint` | 10.12.0 | 规范 |
| `vitest` | 5.0.3 | 单测 |
| `playwright` | 1.64.0 | E2E / 三维渲染冒烟 |
| `electron` | 44.7.0 | 仅壳分支需要 |

> 以上是 `dist-tags.latest` 探测值，**不是锁定版本**。锁定版本（含是否需要降级以避开 TS 7 / Vite 8 的生态适配问题）应在 Q-D1 确认栈之后，用一次真实的 `install + build` 验证再写进 `05-dependency-plan.md`。

## 4 Three.js 侧工程要点（"简单三维"要做好也不简单）

1. **模型格式统一 GLB/glTF**，与 Unity 线共用同一批资产（见 `01-unity-line.md` §5）。
2. **加载链**：`GLTFLoader` + `DRACOLoader`（几何压缩）/ `KTX2Loader`（纹理）/ `MeshoptDecoder`。教育软件首屏敏感，★建议开局就配好压缩链，而不是后期补。
3. **几何量控制**：`InstancedMesh`、LOD、合并材质、限制实时阴影与后处理。**"简单"的判定应包含"能不能在低端集显笔记本上 60fps"**。
4. **后处理**：用 `EffectComposer` 时注意与抗锯齿/性能的冲突；教学场景优先"够用的像素比 + 无重后处理"。
5. **交互**：`Raycaster` 拾取 + 部件高亮/引线/标签。**部件语义必须来自 sidecar 数据**（与 Unity 线共用同一份语义文件），不要把模型节点名当业务含义硬编码。
6. **UI 与画布的关系**：★建议 **HTML/CSS 覆盖层做教学界面**（DOM 做文字/表单/列表，画布只做三维），更易访问、更好国际化、更快。
7. **资源路径**：全部相对路径 + 部署前缀可配（Vite 的 `base`），否则换部署目录就白屏。

## 5 浏览器基线：**一个可能推翻全部技术栈的问题**

- 目标是**现代 Chrome/Edge/Firefox/Safari**（近两年版本）⇒ ★本节建议栈全部成立。
- 若目标含**老旧内嵌 WebView**（教育/政务场景常见），则可能出现：
  - **ES6+ 不可用**（无模块、无 `const/let`、无 Promise、无 class）⇒ 构建目标必须降到 ES5；
  - **无 WebGL2**，新版 Three.js 对 WebGL1 的支持正在收缩；
  - **无 `.wasm` 或 wasm 极慢** ⇒ **直接影响 Unity WebGL 能否落地**（Unity 2022 WebGL 本质是 wasm）。
- **团队既往经验（另一项目，非本项目事实）**：同一甲方的数字教材平台 WebView 内核约相当于 **Chrome 50**，最终强制"ES5 语法 + 避开 ES6 特性 + 绕开部分 DOM API"，现代构建产物被整体放弃，代价极大。⇒ 必须提前问清（Q-D4）。

## 6 部署与服务器侧要求（易漏项）

静态托管即可，但**服务器必须正确配置**：

| 项 | 要求 | 原因 |
|---|---|---|
| MIME | `.wasm → application/wasm`、`.data`/`.symbols → application/octet-stream`、`.glb → model/gltf-binary`、`.gltf → model/gltf+json`、`.ktx2 → image/ktx2` | 缺 MIME 会导致 Unity 加载失败或 glb 被当文本处理 |
| 压缩 | 推荐服务器侧开 Brotli/gzip；若 Unity 构建已自带 `.br`/`.gz`，则服务器**不要二次压缩** | 双重压缩会损坏产物 |
| COOP/COEP | 仅当启用 WebAssembly 多线程时需要（`same-origin` / `require-corp`） | 决定能否用多线程（见 `01-unity-line.md` §3.2） |
| 缓存 | `.wasm`/`.data`/哈希产物用长缓存；`index.html` 用 no-cache | 否则更新后用户拿到旧壳 |
| 跨域 | 若三维资源放独立域/OSS，需 CORS 头 | 否则纹理/模型加载静默失败 |

## 7 Web 侧目录结构（**草案，待 Q-D5 确认**）

以下只是供讨论的草案，**不是决定**；最终目录必须体现"Unity 模块 / Three 模块 / 共享契约"三条边界：

```text
web/                      # Web 主站（与 NewStructureUnity/ 平级）
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  src/
    app/                  # 外壳：路由、布局、全局状态
    pages/                # 教学页面（按 TaskType 组织）
    viewer/               # 三维层：three 的 Viewer 封装、加载器、交互
    unity/                # Unity WebGL 宿主：加载器 + 桥接（Bridge）
    contracts/            # 双端共享契约（SceneState / TaskType / 数据 schema）
    assets/               # GLB / 贴图 / 数据 JSON
  public/                 # 静态资源与 Unity 构建产物落点
```

## 8 本线待回答问题（→ `../OPEN-QUESTIONS.md`）

- Q-D1：技术栈（构建 / 语言 / 框架 / 三维封装）。
- Q-D2：是否允许"UI 框架 + 裸 three"的默认组合。
- Q-D3：Web 与 Unity 产物是否同仓同站。
- Q-D4：目标浏览器基线（**可能推翻本文件全部结论**）。
- Q-D5：目录结构与是否承认上表草案。
