# unity/builds —— Unity 产物暂存区

**这个目录里正常的产物不进 git**（DEC-57：大资产不入库），只保留本说明与占位。
它同时也是打包时的 `extraResources` 源目录，所以**必须存在**（哪怕是空的）。

## 放什么

**一个构建可以承载多个 TaskType**（DEC-81）——所以子目录名是**构建名**，不再是任务键。
建议固定用 `main`（一套 WebGL 构建覆盖所有 Unity 侧任务；换任务只换资源包、不重建实例）：

| 子目录 | 承载的 TaskType |
|---|---|
| `main/` | `4 电路连接`、`5 仿真实验`、`8 结构`、`9 检测`（按实际构建声明） |

清单里每个构建写 `taskTypes: number[]`（**升序去重**），暂存时会与契约快照的 `TaskType` 序号比对，写错直接拒绝。
页面侧按"**第一个声明包含该 taskType 的构建**"选件（`web/src/stores/runtime.ts`），两代清单都为空 ⇒ **不认定**（宁可显示"产物未就位"）。

> 历史口径：`--task-type 5` / `--key training` 这种"一构建一任务"的写法仍被兼容（已打出去的包不必重打），
> 但**新构建一律用 `--task-types`**。

每个子目录里是 Unity WebGL 构建输出的**原样结构**：

```
index.html
Build/<name>.loader.js
Build/<name>.framework.js(.br)
Build/<name>.wasm(.br)
Build/<name>.data(.br)
StreamingAssets/**         ← 可选
```

## 怎么放

```bash
# Unity 编辑器里构建（菜单 WSU3/Build/WebGL Baseline，构建前必须关编辑器，DEC-59）
node tools/pipeline/unity-stage.mjs \
  --from NewStructureUnity/Builds/webgl-baseline --key main --task-types 4,5,8,9

# 没有真 Unity 时，先验流水线是否通（生成形状正确的桩构建）
node tools/pipeline/make-stub-unity.mjs --key main --task-types 4,5,8,9 --stage

# 校验 + 一键打包（含发布清单）
node tools/pipeline/unity-verify.mjs
node tools/pipeline/pack.mjs
```

`unity-stage.mjs` 会写 `manifest.json`（逐文件 sha256 + 字节数）；`unity-verify.mjs` 在打包前重算比对，
**Unity 产物被截断/改坏会在打包前就被拦住**，不会拖到浏览器里表现为白屏。
细则见 `docs/design/05-unity-packaging-pipeline.md`。
