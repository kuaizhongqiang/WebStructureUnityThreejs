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
        │  → 逐文件 sha256 + 字节数 → unity/builds/manifest.json
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
| `unity/builds/manifest.json` | Unity 清单：每个构建的关键文件、字节数、`sha256`、时间 | 否 |
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
