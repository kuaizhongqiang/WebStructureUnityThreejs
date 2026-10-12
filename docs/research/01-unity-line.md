# 调研 01：Unity 线（复杂三维交互）

> 读者：AI 与人｜状态：2026-10-12 v0｜性质：技术调研，**结论中的 ★ 是当时的建议值，不是已决定项**。
> ⚠️ 本文的选型建议**已被 `../DECISIONS.md` 取代**：最终决定为 DEC-11（两份资产各自做）、DEC-12（Unity WebGL 嵌入）、DEC-13（基线实测待执行）、DEC-14（uGUI+TMP）、DEC-29（暂不新增包）。冲突时以 `DECISIONS.md` 为准。

## 1 现状事实（本仓库）

| 项 | 事实 | 证据 |
|---|---|---|
| 工程位置 | `NewStructureUnity/` | 目录存在 |
| Unity 版本 | **2022.3.53f1c1**（中国版） | `NewStructureUnity/ProjectSettings/ProjectVersion.txt:1` |
| 渲染管线 | URP 14.0.11 + universal-config 14.0.10 | `NewStructureUnity/Packages/manifest.json:7` |
| UI | `com.unity.ugui` 1.0.0 + TextMeshPro 3.0.7（**未使用 UI Toolkit**） | `manifest.json:9,11` |
| 其他包 | collab-proxy 2.12.4、ide.rider 3.0.34、ide.visualstudio 2.0.22、ide.vscode 1.2.5、test-framework 1.1.33、timeline 1.7.6、visualscripting 1.9.4 + 全部内置 modules | `manifest.json` |
| 包解析状态 | **已解析完成**：`Library/PackageCache` 48 个实体包（含 URP/Shadergraph/Burst/Mathematics 等依赖链），`Packages/packages-lock.json` 存在 | 实测 |
| 内容 | 仅 URP 模板资源：`Scenes/SampleScene.unity` + `Settings/URP-{Balanced,HighFidelity,Performant}*.asset` + `UniversalRenderPipelineGlobalSettings.asset`；**业务代码为零**，无 `Scripts/`、无 asmdef | 实测 |
| 版本控制 | git，`origin = https://github.com/kuaizhongqiang/WebStructureUnityThreejs.git`；**无 `.gitignore`**（`Library/` 等 2.7 万文件目前处于未忽略状态） | 实测 |
| 编辑器安装 | `2022.3.53f1c1` 在 `D:\Unity\2022.3.53f1\Editor\Unity.exe`，**已装 WebGL + Windows 64-bit 构建支持** | `%APPDATA%\UnityHub\editors-v2.json` |
| 参考工程 | `MCV_Module_0928` 与本工程**同为 2022.3.53f1c1 + URP 14.0.11**；其技术栈（uGUI+TMP、无 DI、纯 C#）已被验证可直接迁移 | `docs/research/04-reference-project-mcv.md` |

> 结论：**Unity 侧不需要"从零配环境"**，版本、管线、包缓存、构建后端都已就位；需要新建的是 `Assets/Scripts/` 与 asmdef 分层。

## 2 交付形态：Unity 部分怎么送到用户面前（**核心待决**）

| 方案 | 怎么做 | 优点 | 代价 | 适用 |
|---|---|---|---|---|
| **A. Unity WebGL 嵌入主站** ★建议先试 | Unity 发布 WebGL → 产物（`index.html` + `.wasm` + `.data` + `.framework.js`）由 Web 主站按需挂载到某个 `<div>` / `<iframe>` | 单一 Web 交付，符合 R-3"浏览器可直接运行"；与 Three.js 页面可共享外壳、UI、数据 | 包体大（首屏 MB 级）、WebGL 能力受限（见 §3）、移动端内存吃紧、首次加载慢 | 交互复杂度中等（装配/拆解/操作训练，无重物理与重后处理） |
| **B. Unity 独立 exe + Electron 壳** | Unity 发布 Windows 单机 → Electron 壳拉起 exe 或直接由壳内嵌；Web 端另有一份轻量版 | 性能与能力不受 WebGL 限制；契合 R-4"app 壳" | 默认形态变成"装客户端"，违背 R-3；**Web 与桌面成为两套三维实现，工作量翻倍** | 三维很重、且甲方接受桌面交付 |
| **C. 像素流（服务端渲染推流）** | Unity 跑在服务器，浏览器看视频 + 回传输入 | 客户端零门槛 | 服务器 GPU 成本、延迟、并发极低 | 本项目**不建议** |
| **D. 混合：Web 为主 + 桌面增强** | Web 版用 WebGL，Electron 壳版用同一份 Web 产物（仅壳不同） | 只有一套三维实现；Electron 只做壳，完全符合 R-4 的"壳"语义 | WebGL 的能力上限仍然存在 | ★**与 R-3/R-4 原文最吻合** |

**建议默认**：**A + D 组合** —— Unity 发布 WebGL，Web 主站默认加载；Electron 壳加载**同一份 Web 产物**，只提供窗口/离线/本地能力。方案 B/C 仅在实测证明 WebGL 撑不住时再启用（见 `../OPEN-QUESTIONS.md` Q-C1/Q-E3）。

## 3 Unity WebGL 的关键限制清单（决定能不能选 A）

以下分三档标注可信度，**打 ⚠️ 的必须在立项前实测**（`../OPEN-QUESTIONS.md` Q-C2）。

### 3.1 确定受限（公认）

- **不能写盘**：`System.IO` 文件写入不可用；`Application.persistentDataPath` 由 Emscripten 映射到浏览器 IndexedDB，容量与行为都受浏览器控制。参考工程同结论：`MCV_Module_0928\Docs\design_ai\Data.md:50`（WebGL 不能写盘）、`Docs\design_human\Score.md:25`（网页版成绩只留内存）。
- **不能用原生 Socket / 多进程**：只能 `UnityWebRequest`；没有后台线程池意义上的"进程"。
- **资源必须走 HTTP(S)**：`StreamingAssets` 不能按文件路径读，必须 `UnityWebRequest`（`Data.md:52`）。
- **资源只读 ⇒ TMP 动态补字不可用**：中文字体必须**预先烘焙/打包全量字形**（`Docs\design_ai\Localization.md:557`）。这直接影响包体与字体策略，**中文教育软件尤其要提前算账**。
- **大小写敏感**：bundle / 资源路径大小写必须严格一致（`Docs\design_ai\BundlePipeline.md:38` 因此规定 bundle 名末段小写）。
- **音频需用户手势**：浏览器自动播放策略，首次音频播放必须由用户点击触发。
- **纹理压缩格式不通用**：桌面的 DXT/DXT5 在 WebGL 上依赖扩展可用性；URP WebGL 常用 ASTC（WebGL2）或保持未压缩（吃内存）。
- **Compute Shader 不可用**（WebGL 无此能力）⇒ 依赖 Compute 的后处理/粒子/GPU 计算方案要换掉。

### 3.2 ⚠️ 需实测（版本相关）

- **多线程 / SharedArrayBuffer**：若启用需要响应头 `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`，且受浏览器与部署环境限制。**若部署环境改不了响应头，就必须按单线程设计**。
- **首屏体积与加载时间**：与内容量强相关，实测基线（空 URP 场景 + 中文全字库）必须先量一次，再谈内容预算。
- **移动端浏览器**：iOS Safari 的 Wasm 内存上限与后台回收策略最严，是否纳入支持范围需明确（Q-D4/Q-E4）。
- **后处理 / 抗锯齿 / 阴影**：URP 在 WebGL2 上的实际帧率必须在目标机型上量，不能凭桌面表现推断。

### 3.3 对我们设计的硬性推论

1. **中文全字库 + 内容资源 ⇒ 包体是首要敌人**，必须从第一天就设计"分包 + 按需加载"，不能最后才优化。
2. **所有运行期数据走 JSON over HTTP**（与参考工程"JSON 为运行期唯一真源"完全一致），不要设想本地文件写入。
3. **响应头可改不可改，是部署环境的决定性约束**，必须尽早问清楚（Q-E1）。

## 4 Unity ↔ Web 的通信机制（候选）

| 方案 | 机制 | 评价 |
|---|---|---|
| **JS 插件桥（.jslib）+ SendMessage 回传** ★建议 | Unity 侧写 `.jslib` 暴露 `window.XXXBridge.*`；JS 侧调 `unityInstance.SendMessage(go, method, payload)` 回传 | 双向、可控、可版本化。**推荐**：统一用一个"桥 MonoBehaviour"做消息分发，payload 一律 JSON 字符串（避免 SendMessage 只能传单参数的坑） |
| 纯 `Application.ExternalCall` / `ExternalEval` | Unity 单向调用页面 JS | 已废弃（deprecated），且是全局函数名污染，**不建议** |
| iframe + `postMessage` | Unity 放在 `<iframe>`，Web 主站与 iframe 用 `postMessage` | 隔离好、跨域安全模型清晰；代价是多一层封装与坐标系/焦点处理 |
| 共享后端（经服务器中转） | 双方各自与后端 WS/HTTP 通信 | 延迟大、链路长；仅在"多客户端协同"场景才合理 |

**建议默认**：**同页 `.jslib` 桥 + 单点分发 + JSON payload**；若最终决定嵌入 iframe，则外加一层 `postMessage` 适配（协议保持一致）。

## 5 三维资产管线（R-6 分流的隐藏成本）

Unity 与 Three.js **必须共享同一批模型**，否则同一个设备要做两遍、且两端必然不一致。可选项：

| 方案 | 流程 | 优点 | 风险 |
|---|---|---|---|
| **DCC 中立（Blender）为源** ★建议 | 建模/材质/动画在 Blender，导出 GLB → Unity 用 glTF 导入、Three.js 用 GLTFLoader | 真正的单一资产源；两端一致 | 需要 Blender 流程与规范；Unity 侧材质需重映射到 URP |
| Unity 为源，导出 GLB 给 Web | Unity 装配好 → 用 glTF 导出插件产出 GLB + 语义文件 | 复用既有 Unity 装配成果 | 导出保真度问题多（见下）；Unity 材质/Shader 无法完整导出 |
| 双份各自做 | Unity 一份、Web 一份 | 各自最优 | **成本翻倍、必然走偏，不建议** |

**团队既往经验（另一项目，非本项目事实）**：Unity 预制体 → GLB（含层级/材质/动画）+ **sidecar 语义 JSON**（描述部件可点性、引线、标签）的管线已经被跑通过；其**已知坑**是"模型在浏览器里看起来不对"，典型表现为：**尺寸不对、朝向反了、贴图丢失、动画不播、点击没反应、引线不出现**。⇒ 本项目若走该路线，**必须把"sidecar 语义文件"当一等契约**，不要指望 GLB 自带全部交互语义。

## 6 Unity 侧 UI 与代码分层

- **UI**：★建议沿用 **uGUI + TextMeshPro**（与参考工程一致，团队熟练度高、WebGL 上验证过；UI Toolkit 在 2022.3 的运行时与 WebGL 组合缺少本团队验证）。
- **代码分层**：★建议**借鉴**参考工程的心智（Controller 非 MonoBehaviour、Panel 纯被动、View 不引用 Controller、事件总线），但**按本项目重新设计目录与程序集**，不照搬（R-1）。
- **asmdef**：★建议从第一天就分 Runtime / Editor 两个程序集起步，避免后期大面积重组。

## 7 依赖影响（Unity 侧）

现状：**包已齐全且已解析，暂时不必新增任何包**。可能新增的候选全部列在 `05-dependency-plan.md`，包括 Addressables（按需加载）、Input System（新输入）、Newtonsoft.Json（复杂 JSON 契约）、glTF 导入/导出插件。**在 Q-C3 回答前不新增任何包。**

## 8 本线待回答问题（→ `../OPEN-QUESTIONS.md`）

- Q-B1：复杂 / 简单三维的判定标准。
- Q-C1：Unity 部件交付形态最终选 A/D 还是 B（是否需要桌面级性能）。
- Q-C2：WebGL 实测基线（体积 / 帧率 / 移动端 / 响应头可否改）。
- Q-C3：Unity 侧允许新增哪些包、三维资产源在哪。
