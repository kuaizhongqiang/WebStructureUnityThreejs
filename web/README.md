# web/ — Web 侧工程（Three.js 简单三维交互 + 教学外壳）

> 本目录的决策依据：`../docs/DECISIONS.md`（DEC-15 / DEC-16 / DEC-17 / DEC-18 / DEC-19 / DEC-33）。
> 落地与验收记录：`../docs/research/07-web-scaffold.md`。

## 技术栈

| 层 | 选型 | 决策 |
|---|---|---|
| 构建 | Vite 8.3.4 | DEC-15 |
| 语言 | TypeScript **5.9.3**（**不要升到 7.x**，`vue-tsc` 不兼容） | DEC-33 |
| UI 外壳 | Vue 3.5 + Vue Router（hash 模式）+ Pinia | DEC-15 / DEC-16 |
| 三维 | **裸 `three` 0.186**（自己封装 `Viewer`，不用 R3F / TresJS） | DEC-15 |
| 测试 | Vitest（契约快照测试） | DEC-27 |

## 命令

```powershell
npm install
npm run dev        # 开发服务器 http://127.0.0.1:5273
npm run typecheck  # vue-tsc --noEmit
npm test           # vitest run（契约快照测试）
npm run smoke      # 三维渲染冒烟：真实 Chromium 打开页面做 12 项断言（含"不是白屏"）
npm run build      # 类型检查 + 生产构建 → dist/
npm run preview    # 预览生产产物
```

子路径部署：设 `VITE_BASE=/sim/` 后构建（默认 `./` 相对路径）。

## 目录职责

| 路径 | 职责 | 纪律 |
|---|---|---|
| `src/contracts/` | **双端共享契约**（`SceneState` / `TaskType` / 中文标签 / 分流映射 / 协议版本） | 只许往后追加；改值必须同步改 C# 侧并让 `contracts.spec.ts` 通过（DEC-09 / DEC-10） |
| `src/viewer/` | 裸 three 封装 | 谁创建谁 `dispose()`；渲染循环由 `Viewer` 独占 |
| `src/unity/` | Unity WebGL 桥 | 消息全 JSON、带版本号、不提供状态查询、退出显式 `detach()`（DEC-07 / DEC-08 / DEC-12） |
| `src/stores/` | 会话**真源** | 状态变更必须发事件；不暴露"查询当前状态"给跨模块调用方（DEC-08） |
| `src/pages/` | 教学页面 | 按 `TaskType` 组织；进入 Unity 类任务时按 DEC-06 分流 |
| `src/router/` | 路由 | hash 模式，免服务器 rewrite |

## 未完成（别当成已做）

- Unity WebGL 产物挂载与真实桥通信（等 Unity 侧构建与 DEC-13 基线实测）
- "三维能渲染出画面"的自动化冒烟（DEC-27 第 3 条）
- ESLint / Prettier（待第二轮 Q-R2-D5 决定）
- 真实 GLB 与内容数据（DEC-11：两份资产各自做，Three 侧资产尚未制作）
