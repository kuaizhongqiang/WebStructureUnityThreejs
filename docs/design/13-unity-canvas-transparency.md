# 13 · 结构任务画布透明（三台相机 + 场景内手工合成）

> 读者：AI 与人｜性质：**设计文档（生效）**｜日期：2026-10-15｜来源：负责人 2026-10-15 的方案讨论 + 拍板
> （DEC-151 方案 → DEC-152/153/154 实现细则 → **DEC-155 相机分工改为三台** → **DEC-156 拾取口径**）。
> 背景调研（官方口径、社区做法、坑清单）见 [`../research/11-unity-webgl-transparent-background.md`](../research/11-unity-webgl-transparent-background.md)；**冲突时以 `../DECISIONS.md` 为准**。
> ⚠️ 验收纪律：**必须看真 WebGL 产物**（DEC-117）—— 编辑器里加载 WebGL 产物看到的颜色/黑底不作数。

---

## 1 要解决什么

结构任务（TaskType 8）的 Unity 画布原本**不透明**，把页面的毛玻璃面板与底图全挡住了；
目标形态是排版稿口径：**画布透明 + 页面画壳**（毛玻璃 `.ui-viewport`，DEC-124；Info 页的 Three 画布已是这个形态，DEC-98）。

难点不在"设个透明"，而在**既要后处理、又要 alpha**：后处理链的最后一步会把 alpha 写成 1
（调研报告 §3.1 已定案），所以"相机背景 alpha=0"这一招在开后处理时会被无声吃掉。

---

## 2 方案（负责人拍板：三台相机分工 + 场景内手工合成）

### 2.1 三台相机各干什么

| 相机 | 父子 / tag | 掩码 | 职责 | RT | 后处理 |
|---|---|---|---|---|---|
| **主相机** | 根物体 / tag `MainCamera` | `55`（层 0,1,2,4,5，**不含模型**） | 渲染到**屏幕**（清屏 + 那几层）；`Camera.main` 就是它 | **空** | 与透明无关，**不动**（见 §4.4） |
| **颜色相机** `ColorCamera` | 主相机的**子对象** / tag 实测 `MainCamera` ⚠️ | `183` = 55 **+ 层 7** | **颜色路**：把**模型**渲染进 `Color` RT | `Color` 1920×1080 | **结构任务必须关**（§4.4） |
| **alpha 相机** `AlphaCamera` | 主相机的**子对象** / `Untagged` | `128`（**仅层 7**） | 只出 **alpha 通道**（A 来源） | `Alpha` 1920×1080 | **关**（走不了后处理 ⇒ alpha 不会被写死；清屏是 SolidColor + `alpha=0`） |

> 一句话：把"要后处理的 RGB"和"要干净的 A"**分两台相机取**，alpha 就绕开了后处理对它的破坏；
> 而**这两台都渲染到 RT、都不渲染到屏幕**，屏幕上的东西由合成层（§2.2）统一画出来。
>
> ⚠️ **主相机的输出会被合成层整块覆盖**（§5.2 的覆盖式写入 `Blend One Zero`），所以它**不参与**透明与合成；
> 它保留的角色是"`Camera.main` / 屏幕有一个正常相机 / 把它那几层画出来"。
> ⚠️ **主相机不承担颜色路**（DEC-151 曾这么定，**已由 DEC-155 取代**）：主相机一挂 `targetTexture`，
> 它的 `pixelWidth/pixelHeight` 就变成 RT 尺寸，**`ScreenPointToRay` 会按 RT 尺寸折算屏幕像素 ⇒ 拾取整体失效**
> （实测画布正中偏 20.6°，见 §4.3）。把颜色路摘到子相机上，主相机回到"无 RT"状态，这条坑才被绕开。
>
> ⚠️ **颜色相机的清屏不重要**：背景那些像素的 RGB 取自颜色路、A 取自 alpha 路，而 alpha 路在背景是 `a≈0` ⇒
> 合成时 `rgb*a = 0`，天空盒颜色会被乘掉（这正是不必给颜色相机做"透明清屏"的原因）。

### 2.2 合成与输出（**接线全部在场景里手工挂**）

1. `1_Content` 里有一个 **`OutputCanvas`（Screen Space - Overlay）+ RawImage**；
2. RawImage 挂材质资产 `AlphaComposite.mat`（shader = `WSU3/UI/CanvasAlphaComposite`，带**两张 `texture2D`**）：
   `_ColorTex` ← `Color` RT、`_AlphaTex` ← `Alpha` RT；
3. shader 里 **`rgb` 取自颜色路、`a` 取自 alpha 路**，合成出"带 alpha 的整幅画面"；
4. 这一层合成结果就是最终要透到网页上的画面 → 再走"最后一公里"（§5.5）。
   Overlay 画布**不参与相机渲染** ⇒ 不会把合成画面自己再拍进 RT（无自拍回环）✅。

### 2.3 层隔离

三台相机的 `culling mask` 定义的是"画面里可见的集合"：

- **层 7 = `ShowObj`**：**模型**（8 个结构件预制体的零件都改到了这一层）。三台里只有颜色相机与 alpha 相机看得到它
  ⇒ 模型**只经合成那条路可见**；
- **层 6 = `NoRender`**：那 6 个 `Cube` 所在层，**没有任何相机渲染它** —— 这是**有意**的（2026-10-15 定案）；
- 层 0/1/2/4/5 上只有灯光 / 光探针 / 管理器 / Overlay 画布（**无渲染物**）。

规则记牢：**颜色路能看到、alpha 路看不到的"渲染物"**，合成后 alpha=0 ⇒ **被整块抠掉**。
将来往两台掩码不一致的层上放可见物体，必须把两台掩码调成一致。

### 2.4 拾取走哪台相机（**"谁出画面谁负责拾取"**）

`InteractiveManager` 的拾取相机 = `CameraManager.GetPickCamera()` = **颜色相机**（它挂着 RT ⇒ 它才是"你看到的那幅画"），
射线用**归一化视口坐标**而不是屏幕像素 —— 理由与实测见 §4.3。
颜色相机缺席/没挂 RT 时退回主相机（那时屏幕上的画面就是主相机自己出的）。

---

## 3 相对更早两轮讨论的修正

| 更早的说法 | **改为** | 为什么 |
|---|---|---|
| 需要三台相机（主 / 颜色 / alpha） | 中途**改成两台**（主相机兼任颜色路） | 当时觉得"主相机本来就带后处理又负责射线，再单开一台取 RGB 是多余的" |
| 两台（主相机兼任颜色路） | **晚定案：回到三台**（主相机回屏幕与交互，**新开 `ColorCamera` 子相机做颜色路**） | 主相机一挂 RT，`pixelWidth/pixelHeight` = RT 尺寸 ⇒ `ScreenPointToRay` 折算错位、拾取整体失效（§4.3 实测 20.6°）。把颜色路摘给子相机，主相机回到无 RT，坑自然消失 |
| 改 `FocusRotationControl` 预制体，让它同时驱动虚拟相机的 FOV（否则主相机与取图相机位置会不一致） | **放弃这条**：结构站**相机不动**，不需要"逐帧跟虚拟相机对齐 FOV/位置"这一套 | 结构站是静态机位；为它去改一个"跟相机走"的操控预制体，属于把别的场景的机制塞进来 |
| alpha 相机由操控层的预制体承载 | **alpha / 颜色相机都做成 `Resources/MainCamera.prefab` 的主相机子对象**，代码通过 **`CameraManager`** 取 | 子对象天然继承主相机的位置/旋转 ⇒ 对齐问题从"逐帧同步"降级为"预制体里一次性对齐" |
| 合成器做成一个"一般类"、由 `CameraManager` 创建并逐帧驱动 | **已移除**：合成完全由场景资产完成（RawImage + 材质 + 两张 RT），代码侧只剩"相机取用 + 后处理策略 + 拾取" | 负责人 2026-10-15 指定"接线全部手工挂"，动态创建/赋值的实现已删 |

---

## 4 硬约束（从代码 / 预制体读出来的，必须遵守）

### 4.1 ⚠️ 子相机不能带 `MainCamera` 标签

`CameraManager.GetMainCamera()` **按标签 `MainCamera` 收集**相机，并且**发现多于一台时会把多余的 `DestroyImmediate` 掉**
（历史口径："主相机只许有一台"）。而 **`ColorCamera` 实测继承了 `MainCamera` 标签**（它的 GameObject 是从主相机复制出来的）——
按老口径它会在启动自检时**被当场删掉**，"画布透明"整条链断掉，现场只留一句"少了一台相机"。

**当前处置**：`GetMainCamera()` 把**"另一台 MainCamera 相机的后代"排除在外**（忽略、不删、打一条 WARNING），
其余重复的主相机仍按老口径去掉 —— 这是对标签纪律的**兜底**，不是放宽纪律。
**遗留建议（待负责人）**：把 `ColorCamera` 的 tag 改成 `Untagged`（与 `AlphaCamera` 一致），兜底分支就永远不会走。

### 4.2 `Resources/MainCamera.prefab` 的实测现状（2026-10-15 读盘 + 实例化读回）

| 字段 | 主相机 | ColorCamera | AlphaCamera |
|---|---|---|---|
| 父子关系 | 根物体（tag `MainCamera`） | **主相机的子对象**（tag `MainCamera` ⚠️ 见 §4.1） | **主相机的子对象**（tag `Untagged` ✅） |
| FOV / near / far | 42 / 0.3 / 1000 | 42 / 0.3 / 1000 ✅ | 42 / 0.3 / 1000 ✅ |
| 正交 / ortho size | 否 / 5 | 否 / 5 ✅ | 否 / 5 ✅ |
| 清屏 | Skybox（alpha=1） | Skybox（背景像素最终被 `a=0` 乘掉） | SolidColor，alpha=**0** |
| `cullingMask` | `55`（层 0,1,2,4,5） | `183`（+ **层 7 `ShowObj`**） | `128`（**仅层 7**） |
| URP 后处理 | `1`（开，与透明无关，**不动**） | `1`（开）→ 结构任务由代码关（§4.4） | `0`（关）✅ |
| AA | SMAA | SMAA | 无 ✅（alpha 路要硬边，这组合是对的） |
| `targetTexture` | **空** ✅（渲染到屏幕） | `Color` RT | `Alpha` RT |
| depth | 0 | 0 | 1 |
| 其它 | 一个 `AudioListener` | 无 ✅ | 无 ✅（重复的那个已删） |

**合成目标（实测）**：`1_Content` 的 `OutputCanvas`（Overlay）+ 其上的 RawImage，`m_Material` = `AlphaComposite.mat`
（shader 就是 `WSU3/UI/CanvasAlphaComposite`）⇒ **着色器被材质资产引用，打包不会被裁** ✅；RawImage 的 `m_RaycastTarget` 已关。

### 4.3 相机参数一致性 + **拾取口径**（2026-10-15 实测后定案）

**参数一致性**：两台**取图**相机（颜色 / alpha）的投影参数（FOV / 是否正交与正交尺寸 / 近远裁剪面 / aspect）**必须一致** ——
差一点点就是模型边缘一圈光圈或毛边。当前两者都挂 1920×1080 的 RT（aspect 都取 RT 的 1.7778）且 FOV/near/far 逐项相同 ✅；
静态机位 ⇒ 预制体里一次性对齐即可（将来若相机会动或有 FOV 缩放，按 §7 处理）。
**主相机不参与拾取与合成**，所以它的 aspect（跟画布走）**不需要**与取图相机一致。

**拾取口径**：`InteractiveManager.RaycastTarget()` 用 `CameraManager.GetPickCamera()` + **归一化视口坐标**：

```csharp
Vector3 mouse = Input.mousePosition;
Ray ray = cam.ViewportPointToRay(new Vector3(mouse.x / Screen.width, mouse.y / Screen.height, 0f));
```

⚠️ **不能再用 `cam.ScreenPointToRay(Input.mousePosition)`**：它是按**相机自己的 `pixelWidth/pixelHeight`**
把屏幕像素折成 NDC 的，而**挂了 `targetTexture` 的相机这两个值就是 RT 的尺寸**（不是画布尺寸）。
编辑器内实测（相机 fov 42，画布按浏览器实测的 942×679）：

| 拾取相机 | 画布正中 | `uv.x=0.25` | `uv.x=0.15` |
|---|---|---|---|
| 主相机挂着 1920×1080 RT（**旧结构**） | **偏 20.59°（还指到左下）** | — | — |
| 主相机（无 RT）+ `ScreenPointToRay` | 0°（**因为编辑器 Game view 恰好是 1920×1080**） | 偏 3.93° | 偏 5.09° |
| **颜色相机 + `ViewportPointToRay`（现口径）** | 0° | **0°** | **0°** |

读法：**"编辑器里好用"是假象** —— Game view 是 1920×1080，恰好等于 RT 尺寸，两种写法都退化成"对"；
浏览器里画布是视口尺寸（≠1920×1080），旧写法整片偏掉，表现就是"**点击无效、移入也没有高光**"
（悬停与点击共用这一条射线 ⇒ 两个症状一起出现）。
`ViewportPointToRay` 只认"画面里的比例"，与 RT 尺寸、画布尺寸都无关，正好对上"合成把 RT 拉伸铺满画布"的显示口径
（相机**没挂 RT** 时两者等价，实测 0.00° ⇒ 对其它任务类型零行为变化）。

**为什么不用"把主相机 aspect 对齐 RT"来修**：那会把主相机自己渲染到屏幕的画面拉歪
（层 0/1/2/4/5 与清屏），而且依赖"以后每个人都要记得保持两台相机 aspect 同步"；换成"谁出画面谁拾取"是自洽的。

另：`Physics.Raycast(ray, out hit, dist)` **不带 `layerMask`** ⇒ 默认全层；只要模型不在 `Ignore Raycast`（层 2）就打得中。

### 4.4 ⚠️ **颜色相机**的后处理：结构任务必须关（规定）

**URP 的后处理（UberPost）会把 alpha 写死成 1** —— 颜色相机就是颜色路，它一开后处理，合成出来的画面在整个画布上都是
**不透明**的，网页那侧再怎么改样式都是黑底/不透。**2026-10-15 实测踩过**，而且它有个很坑的表象：

> **Web 上是黑块，编辑器里却"看着是透明的"** —— 因为编辑器 Game view 背后是中性底板，"没写进去的像素"看起来像透明。

**规定**（负责人 2026-10-15；目标相机由 DEC-155 更正为**颜色相机**）：**`TaskType.Structure` 一律把颜色相机的后处理关掉**，
其它任务类型保持预制体原值。落点与口径：

- `CameraManager.ApplyPostProcessingPolicy(taskType)` —— 结构 ⇒ 关；其它 / 退出（`TaskType.None`）⇒ 回到 `Init` 时读到的**原值**；
- 直接开关：`CameraManager.SetColorCameraPostProcessing(bool)` / 读回 `ReadColorCameraPostProcessing()`；
- 调用点：`TaskFlowManager` 的 `EnterRoutine`（`scene:enter` 后）与 `ExitRoutineCore`（退出即回默认）；
- 用 URP 的正式属性 `UniversalAdditionalCameraData.renderPostProcessing`（`WSU3.Core` 已引用 `Unity.RenderPipelines.Universal.Runtime`）；
- **主相机的后处理不动**：它只把层 0/1/2/4/5 与清屏画到屏幕，而那一片会被合成的覆盖式写入整块盖掉 ⇒ 与透明无关。

---

## 5 技术前提（不满足就会"看着像透明、实际翻车"）

### 5.1 接线分工与两张 RT

> ⚠️ **口径（负责人 2026-10-15 指定）**：两张 RT、合成材质、以及"贴图挂到材质上"这件事，
> **全部在场景/预制体里手工挂好**；代码**不**动态创建 RT、**不**往相机 `targetTexture` 上挂、
> **不**给 RawImage / 材质赋任何值（早先那版"运行期动态创建并接线"的实现已按要求移除）。
>
> **代价要知道**：RT 是**资产、尺寸固定 1920×1080**，不跟视口 ⇒ 画布比例不是 16:9 时**画面会被拉伸**
> （拾取已按"拉伸后的画面"对齐，见 §4.3；观感问题见 §7.7）。

- **⚠️ 前提第一条（2026-10-15 实测定案）：URP 的相机 RT 默认**没有 **alpha 通道**。
  URP 源码 `UniversalRenderPipeline.cs` 里写得很直白：
  ```csharp
  bool needsAlphaChannel = Graphics.preserveFramebufferAlpha;
  cameraData.cameraTargetDescriptor = CreateRenderTextureDescriptor(..., needsAlphaChannel, ...);
  ```
  本工程渲染器资产原本又是 `IntermediateTextureMode = Always`（每次相机渲染都过一张中间纹理）⇒
  中间纹理按"无 alpha"格式分配 ⇒ **相机清屏设的 `alpha=0` 与写入的 alpha 一起被丢掉**（读回来恒为 1）
  ⇒ alpha 路永远是"不透" ⇒ **画布整片不透明**，而且它会把"混合方式改对、后处理关掉"这些努力全部吃掉
  （**实测踩过整整一轮**：症状是 Web 上黑块、编辑器里却"看着是透明的"）。
  **⇒ 工程要打开 `preserveFramebufferAlpha`**，**并且**把渲染器资产的 `IntermediateTextureMode` 从 `Always` 改成
  **`Auto`**（本工程三个渲染器资产**已改**：`m_IntermediateTextureMode: 1 → 0`）：
  这样"无后处理"的相机（结构站两台取图相机都是）就**直接渲染进我们自己的 `ARGB32` RT**，alpha 得以保留，
  而且**编辑器里也能正确显示**（只开 player setting 时，编辑器下这条不生效、编辑器里看仍是黑底 —— 实测踩过）。
  ⚠️ **实测更正（2026-10-15 收尾读盘）**：`ProjectSettings.asset` 里 `preserveFramebufferAlpha` 当前是 **`0`** ——
  此前 DEC-153 记的"本工程已置 1"与工程不符。按上面的机制推断，改成 `Auto` 之后"无后处理的相机"**不再经中间纹理、
  直接渲染进我们自己的 `ARGB32` RT**，这条 player setting 可能已不起决定作用；但**没有实测证据**，故列入 §7 待验：
  真产物上先看画布是否真透明，**若不透明，第一步就是把这条置 `1` 再验一次**。
- **两张 RT 的资产参数（实测）**：`ARGB32`、`1920×1080`、`sRGB` 标记关、mip 关；`Color` RT 的 AA = 4、`Alpha` RT 的 AA = 1
  （alpha 路要硬边）。**不要 HDR**（alpha 不可靠）。

### 5.2 合成配方：**取样同参照工程，混合故意用覆盖式**（2026-10-15 实测定案）

- **取样结构与参照工程 `ColorAlphaUIShader` 一致**：`_ColorTex` 取 RGB、`_AlphaTex` 取 A、UV 走
  `TRANSFORM_TEX(v.texcoord, _ColorTex)`；stencil / `_ColorMask` / UI clip 宏同形。
  （三份 shader 都在 `Assets/Shaders/UI/`：`CanvasAlphaComposite` 主用 / `CanvasAlphaCompositeRef` 工程内参照版 /
  `ColorAlphaUIShader` 负责人给的参照工程原文。）
- **混合故意不同**：本工程用 **`Blend One Zero` + 预乘输出** `(rgb*a, a)`。三条依据：
  1. 参照工程用 `SrcAlpha OneMinusSrcAlpha` + 非预乘输出，背景处 `a=0` 等于"**什么都不写**" ⇒
     **它依赖显示端一开始是透明黑**；
  2. 实测本工程的显示端**保不住**这个透明黑：两台取图相机都渲染到 RT、屏幕那台又被合成盖住，
     清屏相机的 `alpha=0` 到不了最终画布 ⇒ 背景会保留 backbuffer 的**不透明黑**（Web 黑块 + 相机动作拖影）；
  3. 覆盖式由我们自己写 `(0,0,0,0)`，**不看显示端的脸色** ⇒ 背景稳定为透明；而预乘正是
     网页 `premultipliedAlpha: true` 要的形态。
- **alpha 源已实测正确**（这是能把问题收口到显示端的关键证据）：诊断模式
  （URL `?wsu3_alphaDebug=1`，把 alpha 画成颜色）实测 **绿(透)=0.949 / 红(不透)=0.049**
  ⇒ 背景 95% 是 `a≈0`、模型轮廓是 `a≈1`。
- **诊断手段（已随实现移除，思路留档）**：曾用一个 `_AlphaDebug` 开关把 alpha 画成颜色并强制不透明
  （URL `?wsu3_alphaDebug=1`）——**不受网页合成影响**，于是能一眼判出"alpha 是在取样前丢的、
  还是在写显示端时丢的"。**实测结论：alpha 源是对的（背景 95% `a≈0`、模型轮廓 `a≈1`），缺口在显示端。**

⇒ 结论：合成 shader 用 **`Blend One Zero`**，直接写 alpha；因为这张 RawImage 铺满整个画布，覆盖是安全的。
⚠️ 改了之后**编辑器 Game view 的背景会显示成黑色**（编辑器不做 alpha 合成），这是**预期**，判据在浏览器/真产物。

### 5.3 效果与材质的归属

- **描边类效果（HighlightPlus）**要挂在**颜色相机**那一侧，且要与 alpha 相机不打架（alpha 相机只负责"哪里是模型"）。
  ⚠️ HighlightPlus 的 URP 集成是**按渲染器挂的 RendererFeature**（本工程三份渲染器资产各 1 处），会跟着每台相机跑 ——
  描边最终在合成画面里长什么样，**要按 §8 在真产物上看**。
- **alpha 路的取法二选一**（未决，见 §7）：直接取该相机帧的 alpha（当前做法，简单，但透明/特效物件会出问题），
  或给一个 **override 材质只出覆盖率**（更稳，多一个极简 shader）。

### 5.4 代价（要认账）

多一次**全屏场景渲染**（alpha 路）+ 两张 1920×1080 RT 的显存。alpha 路可以换极简 shader 省一点，
但**分辨率不建议降**——降了就和颜色路对不齐。

### 5.5 最后一公里（**实测已基本满足，2026-10-15 更正**）

原判断是"要自己开上下文 alpha + 改模板 + 画布 CSS"。**实测推翻了它的一半**：

- **上下文 `alpha` 是 Unity 自己开的，且是真的**。官方文档明确 `webglContextAttributes` 只允许改
  `powerPreference` / `premultipliedAlpha` / `preserveDrawingBuffer` —— **`alpha` 不开放**，正因为由 Unity 自己决定。
- 本工程**不走 Unity 构建产物里的 `index.html`**：加载器自己建 canvas 并调 `createUnityInstance`
  （`web/src/unity/UnityLoader.ts`），所以"默认模板那段不透明底样式"根本不参与 ⇒ **画布 CSS 与宿主不遮盖这两件天然满足**。

**实测证据**（真构建 + 真浏览器，2026-10-15）：在结构任务页挂起 Unity 后读取画布上下文创建属性，得到
`alpha: true`、`premultipliedAlpha: true`、`antialias: true`、`depth: true`、`stencil: false`、`preserveDrawingBuffer: false`；
同一时刻画布的计算背景是 `rgba(0, 0, 0, 0)`、父容器也是 `rgba(0, 0, 0, 0)`。

⇒ **结论**：剩下的事**只有 Unity 侧一件** —— 把"带正确 alpha 的画面"写进这块画布。
Web 侧不需要加模板、不需要改上下文（若将来要动，只能动 `premultipliedAlpha` / `preserveDrawingBuffer` 这两项）。

⚠️ 但 **`premultipliedAlpha: true` 这条是硬口径**：网页按预乘 alpha 合成 ⇒ 合成输出必须是**已预乘**的颜色（见 §5.2），
否则模型边缘会发暗/发白。这一条现在是**实测确认**，不是推测。

---

## 6 分工与接口

| 谁 | 做什么 |
|---|---|
| **负责人** | `Resources/MainCamera.prefab`（三台相机的父子关系 / 参数 / **掩码** / `targetTexture`）、**层设定**（`ShowObj` = 7）、**两张 RT（资产）+ 合成材质 + 合成 RawImage 的接线全部手工挂**、8 个结构件预制体的层 |
| **AI（本工程侧）** | 相机取用入口（`CameraManager.GetMainCamera / GetColorCamera / GetAlphaCamera / GetPickCamera`）、合成 UI shader（`WSU3/UI/CanvasAlphaComposite` 主用 / `…Ref` 参照版）、**任务类型驱动的后处理策略**（`ApplyPostProcessingPolicy` + `TaskFlowManager`）、**拾取口径**（`InteractiveManager.RaycastTarget`，§4.3）。~~合成器~~ / ~~显示端清屏相机~~ 均已按负责人要求移除 |

**实现形态（已定）**：**代码侧没有合成器** —— 合成是场景资产（RawImage + 材质 + 两张 RT）；
代码只做三件事：**按名字关键字取相机**（子相机挂在主相机下 ⇒ 先找子对象、再退回全局按名字找，找不到时报错并列出候选）、
**按任务类型开关颜色相机后处理**、**用"出画面的那台相机"+ 归一化视口坐标做拾取**。

---

## 7 未决项（登记，不自行拍板）

1. ~~颜色相机是否独立存在~~ → **已定（DEC-155）**：**三台**（主相机 = 屏幕 + 交互；`ColorCamera` 子对象 = 颜色路；
   `AlphaCamera` 子对象 = alpha 路）。
2. ~~合成目标的摆放与材质资产~~ → **已定**：`OutputCanvas`（Overlay）+ 其上的 RawImage + `AlphaComposite.mat` 材质资产。
3. ~~模型层与掩码~~ → **已定**：模型在层 7（`ShowObj`），主 `55` / 颜色 `183` / alpha `128`（差异层上无渲染物，安全）。
4. ~~层 6 上的 6 个 `Cube`~~ → **已定**：层 6 = `NoRender`，**有意不渲染**。
5. **alpha 路的取法**：当前是"直接取帧 alpha"；若出现透明件/特效边缘问题，再上 override 覆盖率材质。
6. **质量项**：颜色路清屏仍为 Skybox（AA 会把天空盒颜色混进模型边缘 ⇒ 边缘可能有光圈），可选改深色实色；
   `Alpha` RT 的 `HDR` 可关；边缘若仍不满意可上"RT 建大一号、合成时缩小"的超采样。
7. **RT 固定 1920×1080 ⇒ 画布比例不是 16:9 时画面被拉伸**：拾取已对齐（§4.3），但**观感**未处理。
   要不要改回"跟随视口的动态 RT"，待负责人定（口径见 §5.1）。
8. **`ColorCamera` 的 tag**：实测是 `MainCamera`，现由 `GetMainCamera()` 兜底排除（§4.1）；
   建议改成 `Untagged`，把兜底分支留给真正的意外。
9. **`preserveFramebufferAlpha` 到底要不要开**：当前是 `0`（与 DEC-153 的记载不符，见 §5.1 的实测更正）。
   机制上 `IntermediateTextureMode = Auto` + "两台取图相机都不带后处理"应当已经够用 ⇒ **先用真产物判**：
   画布真透明就不必开；不透明就把它置 `1` 再验一次，并把结果写回 DEC-153 的后续条目。

---

## 8 验收清单

1. 真 WebGL 产物 + `npm run dev` / 打包 exe：进结构任务，**画布四周毛玻璃与底图可见**，模型本体渲染正常（无发黑、无边缘光圈）；
2. 带后处理的效果（若开）**在透明前提下仍生效**；
3. **拾取**：点部件能高亮（**特别试靠边的部件**）、悬停能出提示条、`object:picked` 上页面（部件树那行亮起来）；
4. **程序化验收**：`cd web && npm run verify:unity`（`tools/verify-unity-transparency.mjs`，需要 dev 服务 + 真产物）——
   逐条判：上下文 `alpha=true` / `premultipliedAlpha=true`、画布与容器背景透明、画布区域截图**不是一整块黑**且**有明暗层次**；
   截图落 `web/tools/smoke/artifacts/unity-transparent.png` 供人工核对；
5. EditMode 用例与 Web 冒烟全过；
6. **颜色相机的后处理必须是"关"**（结构任务）：Unity 日志里能直接看到 ——
   `[CameraManager] 颜色相机后处理 → 关（…）`；看不到这条就说明构建/脚本不是这一版（照 §8.7 重新出产物再验）；
7. 编辑器内观察**不作为验收证据**（DEC-117）—— 尤其这一条：**编辑器里"看着透"完全可能是假象**（背后是中性底板），
   而 Web 上是黑块（§4.4 实测）。同理，§4.3 那个拾取 bug 在编辑器里**恰好看不出来**（Game view = 1920×1080 = RT 尺寸）。

---

## 9 落地状态（2026-10-15 晚）

- **已完成**：三台相机的预制体接线（负责人）、层隔离（模型 = `ShowObj`）、两张 RT + 合成材质 + `OutputCanvas`（负责人）、
  工程开关（`preserveFramebufferAlpha` + 渲染器 `IntermediateTextureMode = Auto`）、合成 shader 三份、
  相机取用入口 + 后处理策略 + **拾取口径**（AI）；dev 真产物联调打通、构建已重出并暂存。
- **待做**：§8 的真产物逐条验收（画布透明 + 拾取 + 描边）、§7 的未决项。
