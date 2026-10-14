# content/assets —— Three.js 侧大资产落点（**不进 git**）

依据：`docs/DECISIONS.md` **DEC-57**（大尺寸资产不进 git）与 **DEC-88**（采用既有实训工程的数据与资产）。
落点与取舍见 [`docs/design/03-layout-and-assets.md`](../../docs/design/03-layout-and-assets.md) §5、
[`docs/research/09-adopted-content-data.md`](../../docs/research/09-adopted-content-data.md) §5 与 [`docs/PLAN.md`](../../docs/PLAN.md) §2 的 P1-4。

## 子目录

| 目录 | 放什么 | 谁用 |
|---|---|---|
| `three/` | Three.js 侧资产：**glTF / GLB**（必要时用 Blender 从 FBX 转换） | Web 页面的**简单三维**（DEC-06） |
| `video/` | 原理页的**讲解视频**（`<videoName>.mp4`，与内容数据里的 `videoName` **同名**） | Web 页面的 `Principle` 任务页（DEC-99） |

> ⚠️ **Unity 侧的源资产不放这里**：Unity 要导入资产就必须放在它自己的 `Assets/` 下，
> 因此 Unity 侧（FBX / 贴图 / 预制体）落点是 **`NewStructureUnity/Assets/Models/**`**（**Plastic 管，git 忽略**）。
> 本目录只服务 **Web / Three.js 那一条线**，避免同一份资产在仓库里出现两次。

## 规则

1. **本目录下的文件一律不入 git**（`.gitignore` 用 `content/assets/**` 忽略，只放行本说明文件）。
2. **Unity 的 WebGL 构建产物不放这里** —— 那是 `unity/builds/<key>/`（由 `tools/pipeline/unity-stage.mjs` 搬入，DEC-79）。
3. 运行时 Web 侧要能取到这些文件：**已落地**在 `web/vite.config.ts` 的资产插件里 ——
   **dev 走中间件**（直接从本目录读盘）、**build 走拷贝**（→ `dist/assets/<树>/**`），两条路给同一个 URL 前缀
   （`/assets/three/`、`/assets/video/`）；`dist` 不进 git（原设想的独立脚本 `tools/pipeline/web-assets.mjs` 不再需要）。
   视频那棵树还会额外发一份 `_meta/index.json`（**构建时按目录内容现算**），它是"这个产物里到底有没有这段视频"的**唯一判据**。
4. 需要搬运或转换资产时，**先看** `docs/research/09-adopted-content-data.md` §4/§5 的可搬运性结论与剔除项，
   不要把设计稿（PSD）、演示帧、未压缩背景大图这类"体积大、对运行无用"的东西搬进来。
   搬运脚本按资产类型分家：模型/贴图 → `tools/pipeline/import-adopted-assets.mjs`，原理视频 → `tools/pipeline/import-principle-videos.mjs`
   （**不合并**：那边有"单图 ≥10 MB 剔除"规则，套到 30 MB 一段的视频上会把视频全剔掉）。
5. 资产命名跟内容数据的资源 key 对齐（见 `docs/design/08-content-data-adoption.md` §5）：
   **文件名一律小写**，`{器件}_{任务}_model` / `{器件}_info_{NN}`；视频是**内容里的 `videoName` 原样**（如 `01jcq_yl.mp4`）。
