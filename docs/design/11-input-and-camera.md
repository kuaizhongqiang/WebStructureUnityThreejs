# 设计 11：底层操控层（输入控制器与相机）

> 读者：AI 与人｜状态：2026-10-14 v0（**本轮新落**）｜依据：`../DECISIONS.md` DEC-69（移植边界）、DEC-107（本轮决定）、DEC-84（输入闸门语义、`activeInputHandler`）；
> 来源工程的行为规格**原文**（14 份 `.md`，未改写、含它自己的旧命名）见 `../research/10-input-controller-specs/`。

## 1 它是什么

Unity 侧的**三维操控层**：三维世界里的"怎么动"—— 第一人称 / 第三人称 / 聚焦环绕三种相机与角色控制器、输入缓存、相机背景板。

**它不负责**：三维拾取与交互（在 `docs/design/03` §2 的 `Core/Interactive` + `InteractiveManager` 里），也不负责任务流程（`Core/Managers/TaskManager`）。

## 2 落点与命名（本工程的目录与命名，不是来源的目录布局）

| 东西 | 落点 | 说明 |
|---|---|---|
| 代码（7 个 `.cs`） | `NewStructureUnity/Assets/Scripts/Core/Controllers/` | 程序集 `WSU3.Core`、命名空间 `WSU3.Core.Controllers` |
| 输入资产 | 同目录 `StarterAssets.inputactions` | `Player` 动作表；`PlayerInput` 以 **Send Messages** 模式回调 `OnMove/OnLook/OnJump/OnSprint` |
| 角色预制体 | `Assets/Prefabs/Characters/FirstPersonController.prefab` | 角色 + 3 个组件 + 自己的虚拟相机（Cinemachine） |
| 相机 rig | `Assets/Prefabs/Camera/MainCameraRig.prefab` | 含 `CinemachineBrain` + URP 相机数据 + 背景板 `bg` |
| 背景板材质与 Shader | `Assets/Model/Public/Materials/CamBg.mat`、`Assets/Shaders/Models/CamBgUnlitShader.shadergraph` | 随 rig 的 GUID 闭包一起搬入 |
| 结构站背景板（**用的不是上面那份 rig**） | `Assets/Resources/MainCamera.prefab` 的子物体 `BgPlate`（内置 Quad + `CameraBg`，local z = 10） | 结构站用的是精简相机（DEC-158 后只剩一台）；板子随主题换材质，见 §4 的 `CameraBg` 行与 DEC-159 / DEC-160 |
| 行为规格原文 | `docs/research/10-input-controller-specs/**` | 来源工程 14 份 `.md` 原文照录，**只作对照** |
| 搬运 / 移植脚本 | `tools/pipeline/import-input-controller.mjs`、`tools/pipeline/port-input-controller.mjs` | 可重跑、幂等 |
| 清单 | `content/asset-input-controller-report.json` | 来源 / 目标 / 字节 / sha256 / 状态 + 未解析引用 |

## 3 移植不等于照搬（与来源工程的差异）

边界来自 DEC-69：**只搬单个交互脚本的算法**，落到本工程自己的目录与命名；不搬来源那套管理器骨架与目录布局。

| 项 | 来源工程 | 本工程 | 为什么 |
|---|---|---|---|
| 控制器登记 | 全局输入管理器（`Global*Mgr` 那套） | **`InputControllerBase` 自带的静态注册表**（`RegisterController` / `UnregisterController` / `GetController<T>` / `ClearControllers`） | 骨架不搬；登记也不必"等管理器实例化" |
| 相机取用 | 全局相机管理器（还会自己实例化相机） | `GlobalManager.MainCamera`（就绪由 `CameraManager` 负责） | 本工程已有唯一的相机取用口 |
| 逐帧闸门 | 无 | 基类 `Update` 里判 `InputGate.ShouldProcessInput` | DEC-84：模态面板打开 / 容器不可见时**不操控** |
| 日志 | 自带日志门面 | `Debug.Log*` | 本工程没有那套门面 |
| 空设备守卫 | 滚轮缩放直接解引用 `Mouse.current`（无鼠标设备时**空引用崩**） | 补 `Mouse.current == null` 守卫（与同文件 `HandleRot` / `HandleResetInput` 一致） | 触屏设备、或运行时输入后端尚未切到新输入系统时**不崩**（实测踩到过：`Mouse.current` 为 null） |
| 命名空间 | `MCV_Module.InputController.*` | `WSU3.Core.Controllers` | ⚠️ **不能叫 `WSU3.Core.Input`**：那样 `WSU3.*` 里所有裸 `Input.GetMouseButton*`（旧版 Input）会被解析成命名空间（命名空间优先于 using 导入的类型），拾取代码整片打红 |
| 输入后端 | 只开新输入 | **Both**（`ProjectSettings` 的 `activeInputHandler: 2`） | 旧版 Input 的拾取继续可用（DEC-107） |

**刻意保留的行为规格**：
- 控制器常驻 + 切视角 = 切 `IsActive`，**不要**重复挂载同类；
- `DelayInit` 里用协程等相机就绪，**禁止**在 `Awake` 直连；
- 缩放改 **Cinemachine 虚拟相机的 `m_Lens.FieldOfView`**（惯性 0.15 s），**不改** `Camera.fieldOfView`；子类移动时置 `IsMoving` 触发 FOV 复位。

## 4 每个文件各自做什么

| 类 | 一句话 | 关键依赖 |
|---|---|---|
| `FirstPersonController` | 第一人称：`CharacterController` 移动 / 跳跃 / 重力 + 俯仰夹取 + 瞬移（`Transport`） | `PlayerInput`、`StarterAssetsInputs`、自己的虚拟相机 |
| `ThirdPersonController` | 第三人称：同样的移动 + 环绕跟随 | 同上 |
| `FocusRotationControl` | 聚焦环绕：右键拖拽绕目标环绕带惯性、平滑换目标、双击复位 | 虚拟相机 + 目标 `Transform` |
| `CameraBg` | 相机背景板：按 FOV / 宽高比缩放平面 + 双纹理淡入切换 + **按主题换材质**（订阅 `ui:set-theme` 落地的事件，见下） | 背景图：`CamBg.mat` 的 `_Texture_1/_Texture_2/_TexOrColor/_CutTex`；主题材质两枚**序列化引用**：`Assets/Materials/Background/CamBgGradient.mat`（深色）/ `CamBgGradientLight.mat`（亮色），shader `WSU3/Background/CamBgGradientUnlit` |
| `StarterAssetsInputs` | 输入缓存（`move/look/jump/sprint`） | `#if ENABLE_INPUT_SYSTEM` 分支 |
| `BasicRigidBodyPush` | 角色撞到刚体时按层与强度施加水平冲量 | `CharacterController.OnControllerColliderHit` |

## 5 接入现状（**本层只到"代码与资产在位、能编译"**）

⚠️ 还没进任何场景与流程，验收也没做。四处未闭合（`../TODO.md` 有对应条目）：

1. **没进场景**：`1_Content` 里没有角色实例；`MainCameraRig` 也没被实例化。
   ⚠️ **本条 2026-10-16 更正一处**（Play 实测）：`Resources/MainCamera.prefab` 上那枚 MonoBehaviour 的字段是 `m_DefaultBlend` / `m_CameraCutEvent` / `m_UpdateMethod` —— **就是 `CinemachineBrain`**（早期按文本搜 `CinemachineBrain` 字样命中 0 次，是因为预制体按 GUID 存脚本、搜不到字样，DEC-142 的"未检出"据此更正）。实测场景里**确有一台 vcam**（`Virtual Camera`，priority 10），它由**器件预制体自带**（8 个结构件预制体的那台位置逐字符相同：local `(0, 1.08, -4.66)`），Brain 生效后主相机跟着它走 ⇒ **结构站的实际取景是"器件预制体说了算"**（相机到模型约 4.78 单位）。
   但**操控层三个控制器仍没进场景**（实测 `FocusRotationControl` / `InputControllerBase` 实例数均为 0）⇒ 缩放与视角控制**依旧不生效**（缺的是"控制器接线"，不再是 brain）。
2. **相机背景的取图入口：经拍板不做**（2026-10-16，**DEC-161**，Issue #35 关闭）—— 结构站三维区背景已改为**程序化径向渐变板**（DEC-160），双纹理那套口径没有消费方，因此不再接取图入口；`CameraBg.LoadBgTextures()` 保持桩的形态（启动告警一次、不做静默降级），搬运进来的 `CamBg.mat` / `CamBgUnlitShader.shadergraph` 原样留存。
3. **角色材质缺失是继承来的**：角色 `Capsule` 的材质引用在**来源工程里就是断的**（清单 `unresolved` 里那条 guid），搬过来仍是空材质。
4. **没有任何实机验收**：三条控制器、瞬移、聚焦环绕都**没跑过**（没接线就跑不了）。

## 6 纪律

- 搬运**只读**来源工程；`docs/research/10/` 是**原文档案**，实现以本工程的 `.cs` 为准。
- 重跑 `import-input-controller.mjs` **不会覆盖**移植后的代码（按 GUID 已在目标工程跳过）；
  `port-input-controller.mjs` 是可重跑的机械改写（命名空间 / 来源 using / 日志），
  **算法之外的适配一律手写，并写进本文**。
