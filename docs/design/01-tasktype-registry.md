# 设计 01：TaskType 登记表

> 读者：AI 与人｜状态：2026-10-12 v0（**草案，待确认**）｜依据：`../DECISIONS.md` DEC-06（分流）、DEC-09（枚举继承）、DEC-39（本文由 AI 起草）。
> 纪律：**`TaskType` 是技术栈的唯一开关**。这里登记的是"每个 `TaskType` 被怎样承载"，**不得在别处重复判断技术栈**。

## 1 登记表

| `TaskType` | 值 | 技术栈 | 页面骨架 | 默认相机 | 资源加载 | 进入指令 | 完成事件 | 移动端（微信内置） |
|---|---|---|---|---|---|---|---|---|
| `None` 空类型 | 0 | Three | 占位页 | 轨道 | 无 | `task:enter` | — | 允许 |
| `Purpose` 任务目的 | 1 | Three | 图文 + 单模型 | 轨道旋转 | 单 GLB | `purpose:enter` | `purpose:done` | 允许 |
| `Equipment` 实验仪器 | 2 | Three | 仪器清单 + 模型切换 | 轨道旋转 | 多 GLB（按需） | `equipment:enter` | `equipment:done` | 允许 |
| `Principle` 实验原理 | 3 | Three | 图文/动画示意 | 轨道旋转 | GLB / 贴图 | `principle:enter` | `principle:done` | 允许 |
| `Test` 小测验 | 6 | Three | 题目表单（可带小模型） | 轨道（可选） | 可选 GLB | `test:enter` | `test:submit` | 允许 |
| `Info` 简介 | 7 | Three | 左三维 + 右图文（DEC-98：与排版稿 C6 同构） | 轨道（右键不平移） | 单 GLB + base/normal/mask 后加载 | `info:enter` | — | 允许 |
| `Exam` 考核 | 10 | Three | 题目表单 | 可选 | 无 | `exam:enter` | `exam:submit` | 允许 |
| `LineConnection` 电路连接 | 4 | **Unity** | 全屏画布 + 悬浮工具条 | 正交 / 俯视 | 分包按需 | `line:enter` | `line:complete` | **尝试加载 → 失败提示**（DEC-53） |
| `Training` 仿真实验 | 5 | **Unity** | 全屏画布 + 步骤面板 | 自由 / 跟随 | 分包按需 | `training:enter` | `training:complete` | 同上 |
| `Structure` 结构 | 8 | **Unity** | 全屏画布 + 部件树 | 正交 / 爆炸 | 分包按需 | `structure:enter` | `structure:done` | 同上 |
| `Inspection` 检测 | 9 | **Unity** | 全屏画布 + 仪表读数 | 第一人称 / 漫游 | 分包按需 | `inspection:enter` | `inspection:done` | 同上 |

规则：
1. **技术栈归属的唯一落点**是 `web/src/contracts/task-type.ts` 的 `TASK_TYPE_STACK`（已被 `contracts.spec.ts` 钉住）。本表是它的说明文档，**不是第二份实现**。
2. **进入指令 / 完成事件是硬约束**（DEC-40）：每个 `TaskType` 至少要有一进一出，否则不算落地；`None` / `Info` 这类无交互的可以只有进入。
3. **"完成事件"必须有语义**：要么带分数/进度，要么明确"只是看完了"，不许含糊。

## 2 三条横向规则（对所有 TaskType 生效）

### 2.1 真源与指令（DEC-08）
- 当前 `SceneState` / `TaskType` / 内容数据**只在 Web 侧**；
- Web → Unity 只发**指令**；Unity → Web 只发**事件**；
- Unity **不得**自己保存"当前任务"，也**不得**对外提供"查询当前任务"的同步接口。

### 2.2 生命周期（防泄漏）
- Three.js 侧：`Viewer` 由页面创建，离开时**必须** `dispose()`（已有实现与冒烟覆盖）；
- Unity 侧：进入时创建实例，离开时**必须** `Quit()` 并清空桥的订阅（`UnityBridge.detach()`）；
- 反复切换同一 `TaskType` **不得**叠加实例（冒烟里"Unity → Three 切回"用例已钉住 Three 侧，Unity 侧待补）。

### 2.3 移动端策略（DEC-49 / DEC-53）
- 承诺范围：**Android 微信内置浏览器**；
- Three 类（上表前 7 行）：允许，但取保守参数（像素比 ≤1.5、关闭重后处理、限制纹理尺寸）；
- Unity 类（后 4 行）：**先尝试加载**，按下述条件判定失败后提示"请在电脑浏览器中打开"，并**释放已申请资源**：
  1. 加载超时（建议 20~30s，阈值待第三轮确认）；
  2. `createUnityInstance` reject / wasm 内存不足；
  3. 无 WebGL2 上下文。

## 3 与参照工程的对应关系

- 参照工程 `SensorSimulationTrainingSoftware_v1.0_2026` 只实现了 6 个 `TaskType`（`Purpose/Equipment/Principle/LineConnection/Training/Test`），**无** `Info/Structure/Inspection/Exam`。
- 我们按 DEC-36 用 **11 个**：多出的 4 个是新类型，**没有既有内容可参考**，需要按其语义（简介 / 结构 / 检测 / 考核）各自定义最简骨架。
- 交互类型（DEC-38）：以参照工程现成的 10 类交互为直接参考（点击 / 接线 / 旋钮 / 按钮 / 数显 / 显隐 / 答题 / 漫游点击 / 轨道浏览 / 长按高亮），**移植边界见 DEC-38 的 §11.1**（可移植算法，不可照搬目录与管理器骨架）。
