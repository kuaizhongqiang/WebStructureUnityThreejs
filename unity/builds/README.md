# unity/builds —— Unity 产物暂存区

**这个目录里正常的产物不进 git**（DEC-57：大资产不入库），只保留本说明与占位。
它同时也是打包时的 `extraResources` 源目录，所以**必须存在**（哪怕是空的）。

## 放什么

每个 Unity 构建一个子目录，键名与 TaskType 对应（见 `docs/design/05-unity-packaging-pipeline.md`）：

| 子目录 | TaskType |
|---|---|
| `line-connection/` | 4 电路连接 |
| `training/` | 5 仿真实验 |
| `structure/` | 8 结构 |
| `inspection/` | 9 检测 |

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
  --from NewStructureUnity/Builds/webgl-baseline --key training --task-type 5

# 没有真 Unity 时，先验流水线是否通（生成形状正确的桩构建）
node tools/pipeline/make-stub-unity.mjs --key training --task-type 5 --stage

# 校验 + 一键打包（含发布清单）
node tools/pipeline/unity-verify.mjs
node tools/pipeline/pack.mjs
```

`unity-stage.mjs` 会写 `manifest.json`（逐文件 sha256 + 字节数）；`unity-verify.mjs` 在打包前重算比对，
**Unity 产物被截断/改坏会在打包前就被拦住**，不会拖到浏览器里表现为白屏。
