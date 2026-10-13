# content/assets —— Three.js 侧大资产落点（**不进 git**）

依据：`docs/DECISIONS.md` **DEC-57**（大尺寸资产不进 git）与 **DEC-88**（采用既有实训工程的数据与资产）。
落点与取舍见 [`docs/design/03-layout-and-assets.md`](../../docs/design/03-layout-and-assets.md) §5、
[`docs/research/09-adopted-content-data.md`](../../docs/research/09-adopted-content-data.md) §5 与 [`docs/PLAN.md`](../../docs/PLAN.md) §2 的 P1-4。

## 子目录

| 目录 | 放什么 | 谁用 |
|---|---|---|
| `three/` | Three.js 侧资产：**glTF / GLB**（必要时用 Blender 从 FBX 转换） | Web 页面的**简单三维**（DEC-06） |

> ⚠️ **Unity 侧的源资产不放这里**：Unity 要导入资产就必须放在它自己的 `Assets/` 下，
> 因此 Unity 侧（FBX / 贴图 / 预制体）落点是 **`NewStructureUnity/Assets/Models/**`**（**Plastic 管，git 忽略**）。
> 本目录只服务 **Web / Three.js 那一条线**，避免同一份资产在仓库里出现两次。

## 规则

1. **本目录下的文件一律不入 git**（`.gitignore` 用 `content/assets/**` 忽略，只放行本说明文件）。
2. **Unity 的 WebGL 构建产物不放这里** —— 那是 `unity/builds/<key>/`（由 `tools/pipeline/unity-stage.mjs` 搬入，DEC-79）。
3. 运行时 Web 侧要能取到这些文件：构建**前**由 `tools/pipeline/web-assets.mjs`（待实现，见 `docs/PLAN.md` P1-5）
   把 `content/assets/three/**` 拷进 `web/dist/assets/three/**`；`dist` 不进 git。
4. 需要搬运或转换资产时，**先看** `docs/research/09-adopted-content-data.md` §4/§5 的可搬运性结论与剔除项，
   不要把设计稿（PSD）、演示帧、未压缩背景大图这类"体积大、对运行无用"的东西搬进来。
5. 资产命名跟内容数据的资源 key 对齐（见 `docs/design/08-content-data-adoption.md` §5）：
   **文件名一律小写**，`{器件}_{任务}_model` / `{器件}_info_{NN}`。
