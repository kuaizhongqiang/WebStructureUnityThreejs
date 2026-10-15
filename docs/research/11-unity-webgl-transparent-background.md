# 11 · Unity WebGL 透明背景调研（Issue #49）

> 读者：AI 与负责人｜性质：**调研报告**（不改代码，先给方案）｜日期：2026-10-15。
> 目标：结构任务（`Structure`）的 Unity 画布当前背景不透明，排版稿口径是画布透明、由页面画壳（毛玻璃 `.ui-viewport`，DEC-124）。本报告回答"官方有没有开关、社区案例怎么做、我们该走哪条路"。
> 纪律提醒：**编辑器里加载 WebGL 产物看到的渲染结果不作数**（DEC-117），透明与否必须在**真 WebGL 产物**上验收。
>
> ⚠️ **路线已撤销（2026-10-15，DEC-158 / Issue #64）**：负责人已取消"结构站画布透明"这个需求 —— Unity 侧回到**单个 `MainCamera`**、不再做画布透明（三相机 + 合成那套已删）。本报告作为**调研档案**原样保留（将来若重新考虑可复用），**不要**照它去改工程；结构站三维区背景口径改由 Issue #65 单独定。

---

## 1 结论先行

1. **Unity 2022.3 与 Unity 6（6000）都没有官方"透明背景"开关。** 官方 WebGL Player Settings 与 WebGL 模板文档里，与背景有关的只有 `BACKGROUND_COLOR`（纯色）与 `BACKGROUND_FILENAME`（启动背景图），都不支持透明语义。
2. **社区成熟做法是一条"三层全通"的链条**：引擎层（相机 alpha=0 清屏）→ 模板/上下文层（canvas CSS 透明 + WebGL context `alpha:true`）→ 页面层（宿主 DOM 不遮盖）。任何一层掉链子，画布就是黑的。
3. **最大杀手是后处理**：URP 后处理最终输出 shader（`UberPost.shader`）把 alpha 写死为 1，会无声地抵消全部透明配置。我们项目当前 URP 配置**未开后处理卷**（结构任务场景无 Volume），这条暂时不构成障碍，但要在验收清单里盯着。
4. **建议路线（第 5 节）**：相机 Solid Color alpha=0 + 自定义 WebGL 模板（canvas 透明）+ 真产物实测；**不动**后处理 shader，必要时再上 `.jslib` 兜底。预估改动小、可回退。

---

## 2 官方文档口径（Unity 2022.3 / Unity 6）

| 检查点 | 结论 | 来源 |
|---|---|---|
| WebGL Player Settings 有无透明选项 | **无**。Resolution and Presentation 只有 Default Canvas Width/Height、Run In Background；Rendering 分组无 Alpha/Transparent 项 | Unity 2023.3 官方手册 `class-PlayerSettingsWebGL` |
| WebGL 模板有无透明语义 | **无**。背景相关内部变量只有 `BACKGROUND_COLOR`（hex 三元组，无 alpha）与 `BACKGROUND_FILENAME`；Default 模板用 CSS `background: url(...)` 铺背景图 | Unity 2022.3 官方手册 `webgl-templates` |
| 官方给的扩展点 | **自定义模板**（`Assets/WebGLTemplates/<名>/index.html`，支持 `{{{ 宏 }}}` 与 `#if/#endif` 条件编译）+ **浏览器脚本交互**（`.jslib`）—— 这正是社区方案的官方依据 | 同上 |

> 顺带：团结引擎（Tuanjie）有官方"透明图层"支持（面向 QNX/微信小游戏形态），但那是另一条引擎线，与本项目 2022.3 无关，不展开。

---

## 3 社区案例的共识做法（三层全通）

综合 Unity 官方开发者社区问答（2022.3.62 后处理案例）与多篇实践文（CSDN 三层机制详解等），可靠配方是：

### 3.1 引擎层（Unity 侧）
- **相机**：`Clear Flags = Solid Color`，`backgroundColor = (0, 0, 0, 0)`（alpha 必须为 0）；
- **Color Space**：多个案例报告 **Linear 色彩空间下 WebGL 透明会出问题**（模型发黑 / alpha 计算异常），案例多建议 Gamma。⚠️ 本项目契约与 URP 资产均按 Linear 建（DEC-01 起），**为透明降级到 Gamma 不可接受** —— 这一点要在真产物上实测 Linear 的实际表现，遇到问题优先考虑第 3.3 的兜底而不是降级色彩空间；
- **后处理**：URP 后处理输出把 alpha 写死 1（`UberPost.shader` 的 `return half4(color, 1.0)`）。当前项目未启用后处理卷 ⇒ 无影响；将来若开 Bloom 等，需改该 shader 保留源 alpha（社区方案）或关 HDR。

### 3.2 上下文/模板层
- **WebGL context 需要 `alpha: true`**：emscripten/Unity 创建 context 时的属性，决定浏览器合成器是否给画布 alpha 通道。社区做法是在自定义模板的 `createUnityInstance` 前后配置，或 `.jslib` 里确保；
- **canvas CSS**：`#unity-canvas { background: transparent; }` —— Unity 生成的 canvas 自带内联背景样式，模板层或 JS 要盖掉；
- **每帧清屏**：Unity 默认每帧 `gl.clear`。相机 alpha=0 时 clearColor 本身是透明的，正常链路不需要拦 `gl.clear`；**只有当 clear 的 alpha 被引擎写成 1 时**才需要 `.jslib` 拦截（当 `clearColor.a === 0` 时跳过 clear）—— 这是兜底手段，不是第一步。

### 3.3 页面层（我们自己的壳）
- 画布父容器不能自带不透明底（我们产品侧 `.app-viewport` 是透明画布 + 页面画壳，口径已对齐 Info 页 `ModelStage`，DEC-98）；
- 层叠上下文坑：canvas 父级 `position: relative` 会隔离 body 背景 —— 我们画布挂在面板内，透明的是 canvas 自身而非依赖 body，无此问题；
- `file://` 协议下 alpha 被浏览器禁用（"Alpha channel is disabled in file:// protocol"）—— 我们一律走 http 服务（dev 中间件 / 壳静态服务器），天然满足。

### 3.4 已知坑清单（案例汇总）

| 症状 | 根因 | 对策 |
|---|---|---|
| 配置全对但背景仍黑 | **后处理把 alpha 写成 1** | 关后处理 / 改 `UberPost.shader` 保留 alpha |
| Linear 色彩空间下发黑 / 过曝 | WebGL 下 Linear + 透明的兼容性问题 | 实测；必要时 `.jslib` 兜底，不降级色彩空间 |
| 画布上多一层白/黑 | canvas 内联背景样式没盖掉 | 模板/JS 强制 `background: transparent` |
| 透明区域闪烁 | MSAA/抗锯齿与 alpha 合成冲突 | 关 Anti Aliasing 试 |
| 帧率下降（案例实测 ≈6.5%） | 每帧 alpha 混合 | 结构任务负载小，可接受；不达标再优化 |

---

## 4 对照本项目的现状盘点

| 检查项 | 现状 | 差距 |
|---|---|---|
| 相机 Clear Flags / 背景 alpha | 结构任务相机由 D-13/D-21 线负责，当前未按透明配置 | 要改 |
| WebGL 模板 | 用的是流水线默认产物（`WebGLBaselineBuild`），模板未定制 | 要加自定义模板（`Assets/WebGLTemplates/`），并在构建编排里选中 |
| canvas 内联背景 | 加载器 `UnityLoader.ts` 创建的 canvas 自带 Unity 默认样式 | 页面/加载器侧盖成透明（JS 侧一处） |
| 后处理 | 结构任务场景无 Volume，URP Renderer 未见后处理栈 | 无差距；验收时盯 |
| 色彩空间 | Linear（项目基线） | 真产物实测透明表现；不降级 |
| 与 #35（相机背景板）的关系 | 背景板 = 相机前贴一张底图（CameraBg.LoadBgTextures 桩） | 两个方案二选一或组合，**待负责人拍板**（Issue #49 已注明） |

---

## 5 建议路线（供拍板）

1. **方案 A：真透明（推荐先试）** —— 相机 alpha=0 + 自定义 WebGL 模板（canvas 透明）+ 加载器盖背景样式；真 WebGL 产物上验毛玻璃透出。改动面：Unity 侧 1 个模板目录 + 1 处 PlayerSettings 引用 + 壳侧 1 行 CSS；可回退。
2. **方案 B：背景板贴图** —— 接通 D-20 的 `CameraBg.LoadBgTextures`，把底图当纹理铺在相机前。不依赖浏览器 alpha 合成，兼容性最稳，但"底图"变成 Unity 侧资产，排版稿的毛玻璃质感靠贴图模拟。
3. **兜底（仅当 A 失败且仍要 A）**：`.jslib` 拦 `gl.clear`（clearColor.a===0 时跳过）± 改 `UberPost.shader` 保留 alpha。改动侵入 Unity 运行时，放最后。

**验收口径**（无论哪个方案）：真 WebGL 产物 + `npm run dev`/打包 exe 上，结构任务画布四周毛玻璃与页面背景可见、模型本体渲染正常、EditMode 与冒烟全绿；编辑器内观察不作数（DEC-117）。

---

## 6 来源清单

- Unity 2022.3 官方手册 · WebGL templates（无透明开关；自定义模板/宏/条件编译是官方扩展点）
- Unity 2023.3（Unity 6）官方手册 · WebGL Player settings（无透明选项；官方指向模板自定义 + browser scripting）
- Unity 官方开发者社区问答：2022.3.62 后处理无法透明（`UberPost.shader` alpha 写死 1；关 HDR / 改 shader 两条路）
- CSDN 实践文：三层协作机制（引擎层 / 模板层 / 浏览器层）、`.jslib` 拦截清屏与 UTF-8 无 BOM 坑、Linear 色彩空间坑、`file://` 禁 alpha、性能实测（帧率 ≈-6.5%）
