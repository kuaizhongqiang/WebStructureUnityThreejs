# 调研 05：依赖清单与拉取方案

> 读者：AI 与人｜状态：2026-10-12 v0｜性质：**执行计划 + 执行结果**。
> 执行结果：Q-G1/Q-G2/Q-G3 已由 DEC-29 / DEC-30 / DEC-31 落定 —— Unity 侧**未新增任何包**（§2.1 结论：原依赖已全解析）；Web 侧**已安装并验证通过**（见 `07-web-scaffold.md`，注意 TS 必须用 5.9.3，DEC-33）。

## 1 环境事实（2026-10-12 实测）

| 项 | 值 | 备注 |
|---|---|---|
| OS / Shell | Windows，PowerShell 5.1 | `.ps1` 需全 ASCII（中文注释会因无 BOM 解码失败） |
| Node | **v24.19.0** | 满足现代 Vite/Vue/React 要求 |
| npm | **11.17.0**，已配 `proxy=http://127.0.0.1:10808`、`registry=https://registry.npmjs.org/` | **实测可查包**（three 0.186.1 等） |
| pnpm | **11.7.0** | 可用；若用 pnpm 需另配 `pnpm config set proxy` |
| git | 2.53.0.windows.2 | 远程 `https://github.com/kuaizhongqiang/WebStructureUnityThreejs.git` |
| Python | 3.12.0 | 本项目暂不需要 |
| Unity 编辑器 | **2022.3.53f1c1** @ `D:\Unity\2022.3.53f1\Editor\Unity.exe`，**已装 WebGL + Windows 64-bit 支持** | 与本工程 `ProjectVersion.txt` 一致 |
| Unity 包源 | `https://packages.unity.cn`（Unity 中国版官方源，见 `packages-lock.json` 的 `url` 字段） | **实测可达**（HTTP 200） |
| Unity 包缓存 | `Library/PackageCache` 48 个实体包 + `Packages/packages-lock.json` 存在 | **manifest 中全部依赖已解析完毕，Unity 侧当前无需拉取任何东西** |

## 2 Unity 侧

### 2.1 现状核对（已在位，无需动作）

`NewStructureUnity/Packages/manifest.json` 当前 10 个具名包 + 31 个内置 module，全部已在 `Library/PackageCache` 落地：URP 14.0.11 + universal-config 14.0.10 + core 14.0.11 + shadergraph 14.0.11、TMP 3.0.7、ugui 1.0.0、timeline 1.7.6、test-framework 1.1.33、visualscripting 1.9.4、collab-proxy 2.12.4、ide.rider 3.0.34、ide.visualstudio 2.0.22、ide.vscode 1.2.5，以及依赖链 burst 1.8.18 / mathematics 1.2.6 / ext.nunit 1.0.6 / searcher 4.9.2。

⇒ **结论：Unity 侧依赖"已经拉取好"**。除非要新增下面的候选包，否则不需要任何联网动作。

### 2.2 与参考工程 `MCV_Module_0928` 的差异（参考工程已在用、我们还没有）

| 包 | 参考工程版本 | 用途 | 对本项目的必要性 |
|---|---|---|---|
| `com.unity.addressables` | 1.22.3 | 资源分包与按需加载 | ★**很可能必须**：WebGL 包体是首要约束，Unity 侧需要分包加载机制（见 `01-unity-line.md` §3.3） |
| `com.unity.inputsystem` | 1.11.2 | 新输入系统 | 视复杂三维的输入复杂度（拆装/拖拽/视角） |
| `com.unity.nuget.newtonsoft-json` | 3.2.1 | 复杂 JSON 契约序列化 | 视双端契约复杂度；若只用简单 DTO，`JsonUtility` 够用 |
| `com.unity.cinemachine` | 2.10.7 | 相机运镜（漫游/巡检） | 视是否要做 `Roaming` 类场景 |
| `com.unity.textmeshpro` | 3.0.9（我们 3.0.7） | 文本 | 可选对齐，无功能必要 |
| `com.coplaydev.unity-mcp`（git main） | git 源 | 让 AI 直接操作 Unity 编辑器（建物体/改脚本/跑测试） | **开发效率项**，不属交付依赖；若要用，需确认团队已装 Unity MCP |

> ⚠️ 上一行 `unity-mcp` 是 **git 源**依赖，不走 `packages.unity.cn`，需要 git 网络可达（本机 git 可用）。

### 2.3 需要额外调研的候选（**包名/版本均未实测，不得直接写入 manifest**）

| 需求 | 候选 | 状态 |
|---|---|---|
| Unity 导入 GLB（消费 DCC 导出的资产） | glTF 导入插件（官方 `com.unity.cloud.gltfast` 与社区 `com.atteneder.gltfast` 两条线，包名与版本随版本迁移有变化） | **待查证**，取决于 Q-C1 的资产源决定 |
| Unity 导出 GLB 给 Three.js | glTF 导出插件（UnityGLTF 系） | **待查证**，取决于 Q-C1 |

⇒ Q-C1 回答为"DCC（Blender）为源"时，**第一条才需要**；回答为"Unity 为源导出"时，第二条必须。

### 2.4 若确认新增包，拉取与验证方式

1. 改 `NewStructureUnity/Packages/manifest.json`（**唯一允许手编的方式**），一个包一行；
2. 让 Unity 解析：推荐用**编辑器打开工程**（会自动解析并写 `packages-lock.json`）；
   - 命令行等价做法（**需先确认编辑器未打开**，且属于重操作，执行前会向你确认）：
     `& "<Unity 编辑器>\Unity.exe" -batchmode -quit -projectPath "<仓库根>\NewStructureUnity" -logFile -`
3. 验证：`Library/PackageCache` 出现对应包目录、`packages-lock.json` 出现条目、Unity 控制台无包解析错误。

## 3 Web 侧

### 3.1 前提

Web 工程**尚不存在**，且技术栈未定（Q-D1）。**在 Q-D1 回答前不执行任何安装**——先装后改栈是纯浪费。

### 3.2 ★推荐栈对应的依赖清单（版本为 2026-10-12 实测 latest，实际锁版本由首次 `install` 决定）

运行依赖：

| 包 | 版本 | 用途 |
|---|---|---|
| `three` | 0.186.1 | 三维渲染 |
| `vue` | 3.5.43 | UI 外壳（若选 Vue） |
| `pinia` | 4.0.3 | 状态（与"事件驱动状态"纪律配套） |

开发依赖：

| 包 | 版本 | 用途 |
|---|---|---|
| `vite` | 8.3.4 | 构建与开发服务器 |
| `typescript` | 7.0.2 | ⚠️ 原生重写线，**与生态的兼容性未实测**，可能需要降到 5.x 稳定线 |
| `@types/three` | 0.186.0 | three 类型 |
| `vue-tsc` | 待查 | 模板类型检查（若用 Vue） |
| `eslint` | 10.12.0 | 规范 |
| `vitest` | 5.0.3 | 单测 |
| `playwright` | 1.64.0 | E2E / 三维渲染冒烟（可选） |
| `sass` | 1.105.1 | 样式（可选） |

Electron 壳分支（**仅在 Q-E5 确认后**）：`electron` 44.7.0。

### 3.3 拉取方式（确认 Q-D1 后执行）

```powershell
# 在仓库根的 web/ 目录（目录名待 Q-F2 确认）
npm install            # 或 pnpm install
npm run build          # 必须能产出可部署产物，才算"依赖拉取成功"
npx tsc --noEmit       # 类型检查
```

**若目标是"最小验证依赖可用"**（推荐先做这一步，而不是直接搭全套）：只装 `three` + `vite` + `typescript` + `@types/three`，跑通"能渲染一个 GLB"再往上加。

### 3.4 拉取成功的验收标准

1. `npm run build` 成功，产物可在静态服务器（如 `npx serve dist`）打开；
2. `npx tsc --noEmit` 无错；
3. `three` 的一个最小场景能渲染出画面（不是白屏）；
4. `package-lock.json` 入库，版本可复现。

## 4 阻塞点（依赖拉取被什么卡住）

| 阻塞 | 卡住谁 | 对应的问 |
|---|---|---|
| Web 技术栈未定 | 全部 Web 依赖 | Q-D1 / Q-D2 |
| 浏览器基线未明 | 是否要 ES5 降级、能否用 wasm/WebGL2 ⇒ **可能整体换栈** | Q-D4 |
| Unity 部件交付形态未定 | Unity 侧候选包（Addressables 等） | Q-C1 |
| 三维资产源未定 | glTF 导入/导出插件 | Q-C1 |
| 目录名/结构未定 | 装在哪、git 怎么组织 | Q-F2 |

## 5 附：本机已知坑（避免重复踩）

1. **PowerShell 5.1 中文**：无 BOM 的 UTF-8 `.ps1` 会按 ANSI 解码 ⇒ 脚本里写中文注释会语法报错；脚本一律全 ASCII。
2. **npm 走代理**：本机 npm 已配 `http.proxy=http://127.0.0.1:10808`，实测可用；若某次拉取卡死，先确认代理进程在跑。
3. **`curl` 在 PowerShell 里是 `Invoke-WebRequest` 的别名**，需要真 curl 时写 `curl.exe`。
4. **Unity 包源是中国源**（`packages.unity.cn`），不要照抄国际文档里的 `packages.unity.com` 处理方式；实测本机直连可达。
5. **Unity 工程所在的 `Library/` 目前未被 git 忽略**（见 Q-F1），在补 `.gitignore` 之前**不要 `git add .`**。
