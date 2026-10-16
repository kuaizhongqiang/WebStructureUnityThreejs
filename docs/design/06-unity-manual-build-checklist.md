# 06 · Unity WebGL 手动构建检查清单

> 用途：**人工构建时对着做**。产物要能直接进 `tools/pipeline/`（见 `05-unity-packaging-pipeline.md`）。
> 结论都来自本仓真实配置，不是通用 Unity 建议 —— 每条都标了"为什么"和"本仓当前值"。

## 0 一句话

构建本身不难，**难的是三件事**：① 压缩产物必须由服务器附 `Content-Encoding` 发出去；
② 重建后浏览器里可能还是旧场景（数据缓存）；③ 中文与 Addressables 内容的位置。
下面按"构建前 / 构建中 / 构建后"排。

## 1 构建前：本仓已定的值（**别改**，改了要同步改服务器）

读数来自 `NewStructureUnity/ProjectSettings/ProjectSettings.asset:786-809`：

| 设置 | 本仓当前值 | 含义与约束 |
|---|---|---|
| `webGLCompressionFormat` | ⚠️ **工程里当前是 `2 = Disabled`**（**本地自测态**，见 §7）；**交付值 = `0 = Brotli`** | 交付态产物是 `*.wasm.br` / `*.data.br` / `*.framework.js.br`；自测态下是未压缩的 `.wasm` / `.data` / `.framework.js`（2026-10-15 实测头部：`UnityWebData1.0` / `00 61 73 6D`） |
| `webGLDecompressionFallback` | **0 = 关** | ⚠️ **服务器必须自己附 `Content-Encoding: br`**。壳内置服务器已实现（`electron/server.js` 命中 `X.br` 就带编码）；将来换静态托管也必须配，否则浏览器拿到 Brotli 二进制当明文解析 → 白屏 |
| `webGLThreadsSupport` | **0 = 关** | 关着就**不需要** COOP/COEP。若你为了性能打开它 → 壳要 `WSU3_COOP_COEP=1`，且目标静态托管也必须发 COOP/COEP，否则 `SharedArrayBuffer` 拿不到 |
| `webGLDataCaching` | **1 = 开** | 会用 IndexedDB 缓存 `.data`。⚠️ **重建后可能仍跑旧场景** —— 见 §3；我们的加载器已按产物指纹加 `?v=` 规避 |
| `webGLNameFilesAsHashes` | 0 | 文件名 = 构建名（`Build/<name>.loader.js`）。改了也能用：加载器是从 loader 文件名反推三个 URL 的 |
| `webGLExceptionSupport` | 1 | 只支持显式抛出，体积友好。别为了调试改成 2（全量异常），那个会明显变大 |
| 内存 | 初始 32MB / 上限 2048MB / 几何增长 | 大场景若报 OOM，先看 §3 的排查 |
| `webGLTemplate` | `APPLICATION:Default` | 我们**不使用**它的 `index.html`（同页挂载，见 DEC-07），但 `Build/` 必须完整 |
| `insecureHttpOption` | ⚠️ **工程里当前是 `2 = AlwaysAllowed`**（**本地自测态**，见 §7）；**交付值 = `0 = NotAllowed`** | 允许明文 `http://` 拉 Addressables 内容 —— 出交付产物前必须关掉 |
| 质量档 `m_CurrentQuality` | **`2 = High`**（2026-10-15 由 `0 = Low` 改） | **WebGL 上运行时切档无效，构建时选哪档就是哪档** ⇒ 改档等于改画质与开销 |
| 平台模块 | WebGL 已装 ✓ | — |

## 2 构建前：三条红线（DEC-14 记录）

1. **中文必须预烘焙字形**：TMP 在 WebGL 上**不能动态补字**。场景里任何中文（按钮、标签、图例）所用字体资产必须**事先烘焙全部字形**；
   否则不是报错，而是**显示成方块/空白**，且在不同机器上表现还不一致。→ 首次构建前先确认字体资产的字符集覆盖了场景里出现的所有汉字。
2. **`StreamingAssets` 只能经 `UnityWebRequest` 读**：不要用 `File.ReadAllBytes` 这类同步 IO，WebGL 上没有文件系统。
3. **资源路径大小写敏感**：`Assets/Art/Model.fbx` 与 `assets/art/model.fbx` 是两回事（Windows 上本地跑得通、构建后 404）。

## 3 构建后：三个必查（按出问题概率排序）

### ① 压缩与 MIME：白屏的第一嫌疑

产物里应有 `Build/<name>.wasm.br`。**必须由服务器附 `Content-Encoding: br` 发出**（不要让浏览器把 Brotli 当明文）。
壳里跑 `node tools/pipeline/pack.mjs` 后是自动满足的；若你把 `web/dist` 丢到别的静态服务器，照着
`release-manifest.json` 的 `serving` 段配。

### ② 重建后仍是旧场景（数据缓存）

`webGLDataCaching = 1` 时，浏览器按 **URL** 缓存 `.data`。同名重建 → 命中旧缓存 → 你看到上一版的场景。
我们的加载器已经把产物指纹（`release-manifest.json` 里的 `treeSha256`）拼成 `?v=` 交给服务器，
所以走流水线时**不会**踩这个坑。
指纹的来源与三条链的口径见 `05-unity-packaging-pipeline.md` §3.5：**暂存链也已经带上它**
（`unity-stage.mjs` 起写进 `unity/builds/manifest.json`），所以 dev / 暂存这条路同样不会踩；
你只要重跑一次 `unity-stage.mjs`，界面刷新后 URL 里的 `?v=` 就换了，**不需要清 IndexedDB**。
反过来：若你手工往 `unity/builds/<key>/` 里塞/换了文件却没有重跑暂存脚本，dev 侧会按"新鲜度"
复核后现算一个反映当前目录的指纹（不会沿用旧值），所以也不必靠清站点数据。
排查时若怀疑是缓存：开发者工具 → Application → Storage → 清掉 IndexedDB 与 Cache Storage 再看。

### ③ Addressables 内容跑到了构建目录之外（用了才会遇到）

Addressables 1.22.3 已装（DEC-45）。**默认远端 LoadPath 是 `ServerData/[BuildTarget]`，它在工程根目录下，
不在 `Builds/<name>/` 里** —— 这样一来 Unity 产物搬进 `unity/builds/` 时内容会被落下，运行时表现为"模型加载不出来"。

两种正确做法（**首次真实构建**建议选前者，链路最短）：

- **A（推荐）**：本阶段不用 Addressables，场景直接引用资源 —— 产物自包含，什么都没有额外步骤。
- **B**：要用 Addressables，就把 profile 的 LoadPath 设为**打包进 StreamingAssets**（即
  `{UnityEngine.Application.streamingAssetsPath}` 下），这样内容会跟产物在一起，我们的暂存脚本会一并搬走。

若确实把内容留在了 `ServerData/WebGL`，暂存时显式带上：

```bash
node tools/pipeline/unity-stage.mjs --from NewStructureUnity/Builds/<name> \
  --key main --task-types 4,5,8,9 --extra NewStructureUnity/ServerData/WebGL
```

（`--extra` 会把该目录复制到暂存产物的**根**下；用 B 方案则不需要它。）

## 4 构建步骤

1. **关掉编辑器里的 Play 模式**，降到空闲（构建会占满 CPU；批处理构建更不允许编辑器里同时改工程 —— DEC-59：编辑器占用要协调）。
2. 确认场景与输出目录：`WSU3/Build/WebGL Baseline`（`Assets/Editor/BuildTools/WebGLBaselineBuild.cs`）输出到
   `Builds/webgl-baseline`，**场景 = `0_Setup` + `1_Content`**（2026-10-15 已修：原先写死的 `SampleScene` 在场景重组后
   已不存在 ⇒ 构建直接 Failed；另外 `EditorApplication.Exit(1)` **只在批处理模式生效**，交互模式下它会把整个编辑器退掉）。
   构建完读 `Builds/webgl-baseline/baseline-report.txt`（文件数 / 总字节，给容量核算用）。
   要做**按 key 输出**的正式交付构建，见 §5。
3. 构建完成后先看控制台尾部：`[WSU3] result=Succeeded fileCount=… totalBytes=…`，以及 `Builds/<name>/baseline-report.txt`。
4. 暂存进仓库（**不要手工拷进 `web/public/`**）：

```bash
node tools/pipeline/unity-stage.mjs --from NewStructureUnity/Builds/<name> --key main --task-types 4,5,8,9 --bridge
node tools/pipeline/unity-verify.mjs      # 逐文件重算 sha256
node tools/pipeline/pack.mjs --skip-web   # 只重打包（web 产物没变时）
```

## 5 还缺的一块：桥（首次真实构建会看到"待握手"）

加载器（`web/src/unity/UnityLoader.ts`）会**注入 loader → 建画布 → 调 `createUnityInstance`**，这一步与桥无关，能成功；
但**协议握手要 Unity 侧主动调** `window.__WSU3_BRIDGE__.onReady('<版本>')`（DEC-07）。

**当前 `NewStructureUnity/` 里没有任何 `.jslib`，也没有 `WebBridge` 接收脚本** ⇒ 首次真实构建的表现是：
**画面挂上了、状态条显示"待握手"**。这不是打包坏了，是桥还没实现（`design/02-bridge-protocol.md` 仍是草案）。

两个选择：

- **先只验画面**：暂存时加 `--bridge` 的反面即默认（不声明），壳冒烟会把"挂载成功"单独判为通过，但日志与报告里
  `handshake=false` **写得很清楚**（不掩盖）。
- **顺手把桥做掉**：加 `.jslib` + 一个接收脚本（挂在 `WebBridge` 对象上，方法 `OnWebMessage`），
  暂存时加 `--bridge` → 壳冒烟会**要求**握手成功。这段很小，但属于 Unity 侧改动，必须**双渠道提交**（git + Plastic，DEC-60）。

## 6 与"单一事实源"的关系

- Unity 侧的改动（`.cs` / `.jslib` / `ProjectSettings`）**必须双渠道提交**（DEC-60）。
- 构建产物（`Builds/`、`ServerData/`）**一律不进 git**（DEC-57）；只进 `unity/builds/`（也进 git 的忽略）。
- 每个 key 对应哪个 TaskType 见 `05-unity-packaging-pipeline.md` §3.2；**一个 key 只服务一个 TaskType**。

## 7 本地拿静态服务器自测（VS Code Live Server 之类）：要改哪些设置，**测完必须改回来**

§1 的两条值是为**交付形态**定的（Brotli + 壳服务器附 `Content-Encoding`）。
拿一个"不会做内容协商"的静态服务器（VS Code Live Server、`http.server` 等）跑真产物时，
下面两条**必须临时改**，否则一定失败——而且失败现象很容易被误诊成"包坏了"：

| 设置 | 交付值 | 本地自测临时值 | 不改会怎样 |
|---|---|---|---|
| `webGLCompressionFormat` | **0 = Brotli** | **2 = Disabled** | Live Server 不会对 `.br` 附 `Content-Encoding` ⇒ 浏览器把 Brotli 当明文解析 ⇒ **白屏 / 加载失败** |
| `insecureHttpOption` | **0 = NotAllowed** | **2 = AlwaysAllowed** | AB 地址是明文 `http://…` ⇒ **UnityWebRequest 被这条策略挡下**，而播放器自己的文件是 JS loader 拉的、不走 UnityWebRequest ⇒ **播放器起得来、只有 AB 下载失败，且 `error` 可能为空**（2026-10-14 实测踩到，见 `../DECISIONS.md` §27 / DEC-116） |

⚠️ **这两条是"本地自测"设置，不是交付设置**：忘了改回来，压缩关掉会让首屏体积明显变大，
`AlwaysAllowed` 也会把"允许明文 HTTP"带进交付产物。改了就一定在提交前恢复成 §1 的值。

⚠️ **现状（2026-10-15 收尾读盘）**：工程里 `webGLCompressionFormat = 2` 与 `insecureHttpOption = 2`
**当前就是自测态**（且这两个值早已在版本库里，不是某次未提交的临时改动）⇒
**出交付产物前必须按上面的"交付值"改回**，已登记为 GitHub Issue #59（§1 表里两处 ⚠️ 就是这条的索引）。

> 另一条路（**不用改任何设置**）：用壳的静态服务器跑 —— `node tools/pipeline/pack.mjs` 之后跑打包产物，
> 或按 `release-manifest.json` 的 `serving` 段自己配一个会附 `Content-Encoding` 的服务器。
> 这样验的就是**交付形态本身**，比 Live Server 更接近真实。
