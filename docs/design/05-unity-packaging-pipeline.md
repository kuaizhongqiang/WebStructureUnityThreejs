# 05 · Unity 产物与打包流水线

> 状态：**已定方向并已实现**（2026-10-12，DEC-79）；**"单构建多任务"（DEC-81）已于 2026-10-13 落地** ——
> 清单写 `taskTypes[]`、加载器按"第一个声明包含该 taskType 的构建"选件（见 §3.2，实现于 `tools/pipeline/*` 与 `web/src/stores/runtime.ts`）。
> 相关既有决策：DEC-06（技术栈归属）、DEC-07/DEC-12（同页挂载 + 协议握手）、DEC-22（本机静态服务器验证 MIME/压缩/缓存）、
> DEC-23（内容与资源物理分开）、DEC-44（基线构建）、DEC-53/DEC-71（移动端先试再回退）、DEC-57（大资产不进 git）、
> DEC-77（壳打包）、**DEC-81（一个 Unity 构建承载全部 Unity 类任务）**、DEC-82（内容数据两份）。

## 1 一句话

**Unity 由人手动构建（必须），但"进不进发布包"必须由流水线**决定、**校验**、并**写进清单** ——
这样"壳包里到底有没有 Unity"永远是一个**可查询的事实**，而不是靠人去翻目录。

## 2 三段式：构建 → 暂存 → 打包

```
① Unity 侧人工构建（编辑器关闭，DEC-59）                      NEWStructureUnity/Builds/<name>/
        │  WSU3/Build/WebGL Baseline 菜单
        ▼
② 暂存 + 校验（仓库内，不进 git）                             unity/builds/<key>/
        │  node tools/pipeline/unity-stage.mjs --from … --key main --task-types 4,5,8,9
        │  → 逐文件 sha256 + 字节数 + treeSha256（整树指纹）→ unity/builds/manifest.json
        ▼
③ 打包（一条命令，含清单）                                    electron/release/*.exe
           node tools/pipeline/pack.mjs
           = 校验暂存 → web build → 写 release-manifest.json → electron-builder
```

**为什么中间要有一层"暂存"**（而不是让 Unity 直接吐到 `web/public/`）：

| 理由 | 说明 |
|---|---|
| 物理分开（DEC-23） | 内容 JSON 走 `web/dist`，Unity 资源走 `resources/unity`。将来若改成按需下载/换 CDN，**不用搬文件**，只换一个根目录。 |
| 不进 git（DEC-57） | `unity/builds/` 被忽略；一次 WebGL 构建几十到几百 MB，绝不能进版本库。 |
| 不重复搬运 | 若放到 `web/public/`，Vite 每次构建都会把它整份复制进 `dist/`，再被 electron-builder 复制一次。 |
| 可校验 | 暂存时算好 `sha256`，打包前**重算比对**；Unity 产物静默损坏（Brotli 截断）是真实存在的坑。 |

## 3 约定

### 3.1 目录

| 路径 | 用途 | 进 git？ |
|---|---|---|
| `NewStructureUnity/Builds/<name>/` | Unity 编辑器的构建输出（人手动产生） | **否** |
| `unity/builds/<key>/` | **暂存区**：流水线搬进来的 Unity 产物，`<key>` 是**构建名**（DEC-81 后建议固定为 `main`，不再是任务键） | **否** |
| `unity/builds/manifest.json` | Unity 清单：每个构建的关键文件、字节数、逐文件 `sha256`、**整树指纹 `treeSha256`**、时间 | 否 |
| `web/dist/release-manifest.json` | **发布清单**：这次包里到底有什么（Web / 内容 / Unity / 服务端约定） | 否（随产物） |

### 3.2 构建名与 TaskType（DEC-81，**已实现**）

**一个构建承载多个 TaskType**（换任务只换资源包、不重建实例）：

| 环节 | 现在怎么做 |
|---|---|
| 暂存命令 | `unity-stage.mjs --from … --key main --task-types 4,5,8,9`（`--task-types` 必填；`--task-type` 已废弃但兼容） |
| 清单字段 | 每项 `taskTypes: number[]`（升序去重）。**旧清单的单值 `taskType` 仍被读取**，兼容已经打出去的包 |
| 加载器选件 | `web/src/stores/runtime.ts` 的 `pickUnityBuild`：**第一个声明包含该 `taskType` 的构建**；`electron/main.js` 同一口径 |
| 暂存时校验 | `taskTypes` 的值会与 `content/contracts/snapshot.json` 里的 `TaskType` 序号比对，写错直接拒绝暂存 |

Unity 承载的 4 个 TaskType：电路连接 `LineConnection`=4、仿真实验 `Training`=5、结构 `Structure`=8、检测 `Inspection`=9。
**当前形态**：这 4 个由**同一个构建**（`main`）承载；若某类任务确实需要完全不同的场景（如漫游），再追加一个独立构建
（届时"第一个声明命中的"这条规则就派上用场）。

**没有声明 `taskTypes` 的构建永远不会被选中** —— 这是故意的：宁可显示"产物未就位"，也不挂上一个不知道能不能干活的构建。

### 3.3 Unity 构建输出必须包含

```
index.html                     ← 入口（我们只取它的 TemplateData 与文件名参考，不直接用它）
Build/<name>.loader.js         ← 官方 loader（注入它，再调 createUnityInstance）
Build/<name>.framework.js(+.br)
Build/<name>.wasm(+.br)        ← 主程序；缺失直接判失败
Build/<name>.data(+.br)        ← 资源
StreamingAssets/**             ← 可选（TMP 字体等，必须经 UnityWebRequest 读）
```
校验只强制 `loader.js` + `framework.js` + `wasm` + `data`（允许 `.br/.gz` 后缀形式）。

### 3.4 服务端约定（把 DEC-22 的"MIME/压缩/缓存清单"落实）

壳内置服务器（`electron/server.js`）与将来目标静态服务器都必须满足：

| 项 | 要求 |
|---|---|
| MIME | `.wasm → application/wasm`（错则 `instantiateStreaming` 直接失败）；`.data/.unityweb/.mem → application/octet-stream`；Three 侧 `.glb → model/gltf-binary`；原理视频 `.mp4 → video/mp4`（**写错 `<video>` 直接拒播**） |
| Range | **视频必须支持 `Range`**（`206` + `Content-Range`，越界回 `416`）：没有它进度条拖不动 —— Safari 完全不响应，Chrome 退化成"每次 seek 整段重下"（DEC-99） |
| 预压缩 | 存在 `X.br`/`X.gz` 且客户端接受时，直接命中并附 `Content-Encoding`（**不要**让浏览器先下未压缩版） |
| 缓存 | 带指纹的产物（`.wasm` 有 hash 后缀、vite 的 `/assets/<名>-<hash>.js`）→ 长缓存 `immutable`；**不带指纹的资产树**（`/assets/three/**`、`/assets/video/**`，名字固定）→ **`no-cache` + `ETag`/`Last-Modified`**（每次重验证：既不读到旧文件，也不把 30 MB 视频每次重下一遍）；`index.html` 与清单 → `no-cache` |
| COOP/COEP | **默认关**。仅当构建启用了多线程（`SharedArrayBuffer`）才需要；壳里用 `WSU3_COOP_COEP=1` 打开（DEC-13 口径：先测再开） |

`release-manifest.json` 的 `serving` 段把上面这张表**写进产物**，部署方照抄即可。

### 3.5 产物指纹 `treeSha256` 从哪来（**三条链必须是同一个值**）

**为什么必须有**：Unity 的 `webGLDataCaching = 1` 会按 `.data` 的 **URL** 把包存进 IndexedDB。
加载器（`web/src/unity/UnityLoader.ts` 的 `resolveUrls()`）拿 `treeSha256` 的前 12 位拼 `?v=`，
URL 变了才会去取新包。**指纹缺失或没变 ⇒ URL 不变 ⇒ 重建 + 重暂存之后浏览器仍然跑上一版场景**，
现场表现是"构建明明成功了，画面还是旧的"，只能靠清站点数据救（症状与排查见 `06` §3②）。

| 链 | 谁计算 | 落在哪 |
|---|---|---|
| 暂存链（dev / 打包共用） | `tools/pipeline/unity-stage.mjs` 调 `lib/tree-hash.mjs` | `unity/builds/manifest.json` 的每项 `treeSha256` |
| 发布链 | `tools/pipeline/pack.mjs` | `web/dist/release-manifest.json` 的 `unity.builds[].treeSha256` |
| dev 链 | `web/vite.config.ts` 合成发布清单时，见下 | dev 的 `/release-manifest.json` |

**算法只有一份**（`tools/pipeline/lib/tree-hash.mjs`）：对树内文件按路径字典序排序后，
逐个把"相对路径 + 该文件内容的 sha256"喂进同一个哈希，取 `digest('hex')`。
`web/src/unity/release-manifest.ts` 里那份现算实现与它逐位一致 —— 三处任何一处自己另写一份，
就会出现"同一份产物两个指纹"，而指纹的唯一用途恰恰是判断"是不是同一份"。

**dev 链：怎么"发现产物变了"**（`web/src/unity/release-manifest.ts` + `web/vite.config.ts`，Issue #60）。
合成发布清单时分两层，别混：

| 层 | 读什么 | 判什么 |
|---|---|---|
| **廉价签名**（每请求，约 80 次 `stat`，几毫秒） | 产物目录里每个文件的**路径 + 大小 + mtime**，外加暂存清单的 mtime 与声明字段 | "这一轮还要不要做内容复核" |
| **内容复核**（只在签名变了时做） | 逐文件 sha256 比对（`isTreeFingerprintFresh`） | "清单里那个指纹还算不算数" |

- 签名**没变** ⇒ 直接复用暂存清单里的 `treeSha256`（零重算，dev 每次刷新页面都要问一次）。
- 签名**变了** ⇒ 逐文件复核：内容逐字节相同就照旧复用（**不白换 URL**）；有差异才按同一算法现算覆盖。
- **为什么签名里必须有 mtime**（这是这条链的关键，不是保险）：本仓的产物只由**受控流程**产生 ——
  Unity 走编辑器菜单/构建脚本、暂存走 `unity-stage.mjs`（先删目录再整份拷回），
  **每次都会重写产物文件** ⇒ mtime 必变。
  而**只看大小会漏**：重建后恰好等长的改写（压缩产物抖动、脚本常量改一位）会让大小不变，
  于是签名不变、继续发旧指纹、浏览器按旧 URL 命中 IndexedDB 旧包 —— 正是 Issue #60 那个症状，
  只是触发条件更窄。浏览器的一次请求与这些写入在时间上不可能落在同一拍，所以等长改写也不会被吞掉。
- 所以 dev 侧**永远**给出一个反映当前暂存目录内容的指纹（字段缺失、手工塞文件、等长改写都覆盖），
  与"清不清站点数据"无关；而"重新暂存同一份产物"只会多触发一次复核，不会白换 URL。
- 回归用例：`web/src/unity/release-manifest.spec.ts`（等长改写、仅 mtime 变、签名确定性）
  与 `npm run verify:fingerprint`（真浏览器：同尺寸变体 ⇒ 指纹与 `?v=` 必换；仅 mtime 变 ⇒ URL 不变）。

> 口径变更的代价：改 `lib/tree-hash.mjs` 的算法 = 已发布包与新产物的指纹不再可比，
> 属破坏性变更，要同批改三处调用方并在这里写明。

## 4 命令

```bash
# ② 暂存一次 Unity 构建（可重复执行，覆盖同名 key）
#    --task-types 声明这个构建能承载哪些 TaskType（DEC-81；一个构建承载全部 Unity 类任务）
node tools/pipeline/unity-stage.mjs \
  --from NewStructureUnity/Builds/webgl --key main --task-types 4,5,8,9 --bridge

# 只校验（打包前跑，CI 里也跑；没有暂存内容时明确报告"未包含"而不是静默通过）
node tools/pipeline/unity-verify.mjs

# 没有 Unity 时也能验证流水线本身：生成一个"形状正确"的桩构建（默认就承载 4,5,8,9）
node tools/pipeline/make-stub-unity.mjs --key main --task-types 4,5,8,9 --stage

# ③ 一键打包（校验 → web build → 发布清单 → exe）
node tools/pipeline/pack.mjs
```

## 5 应用侧怎么用它

- 启动时读 `/release-manifest.json`（壳与本机服务器都直接给得到）。
- 进入 Unity 类任务时：**清单里有该 TaskType 的构建才去挂载**；否则显示"产物未就位"并给出上表里的暂存命令 ——
  **不要再出现"页面以为有 Unity、其实没有"这种中间态**（这正是本次要修的问题）。
- 挂载走 `web/src/unity/UnityLoader.ts`：注入 loader → `createUnityInstance` → 实例交给 `UnityBridge` 握手
  → 退出时必须 `Quit()`（DEC-12）；超时 25s、重试 1 次（DEC-71）。

## 6 明确没做（别当成已完成）

1. **CI 不构建 Unity**：需要 IL2CPP + 编辑器授权（`research/08` 记录一次约 189s）。CI 只跑 `unity-verify`。
2. **没有 CDN / 按需下载**：DEC-05/DEC-35 运行环境未定，本期一律"本地整包"。
3. **没有包体预算门禁**：DEC-02 的 250~360MB 预算只有文字，没有脚本；现有门禁只管单文件 10MB（DEC-65）。
4. **没有资源登记表（`content/asset-registry.json`）**：那是 three 侧模型的清单，与 Unity 分属两条线，仍未落地。
