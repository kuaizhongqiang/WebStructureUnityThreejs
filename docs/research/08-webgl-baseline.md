# 调研 08：WebGL 基线实测结果

> 读者：AI 与人｜状态：2026-10-12（**已实测**）｜依据：`../DECISIONS.md` DEC-44（现在做基线实测）/ DEC-63。
> 目的：把 DEC-02 的"包体是首要敌人"从口号变成数字，作为内容资源预算的依据。

## 1 构建条件（事实）

| 项 | 值 |
|---|---|
| Unity | 2022.3.53f1c1（中国版），`D:\Unity\2022.3.53f1\Editor\Unity.exe` |
| 工程 | `NewStructureUnity/`，URP **14.0.11** |
| 场景 | `Assets/Scenes/SampleScene.unity`（**URP 模板空场景**，无业务内容、无自定义脚本） |
| 已装包 | 新增 `com.unity.addressables@1.22.3`、`com.coplaydev.unity-mcp`（git 源）；其余为 URP/TMP/UGUI/Timeline/VisualScripting 等 |
| 构建方式 | 批处理：`-batchmode -quit -buildTarget WebGL -executeMethod WSU3.Editor.BuildTools.WebGLBaselineBuild.RunBaseline` |
| 压缩格式 | **Brotli**（产物为 `.br`；`index.html` / `loader.js` 不压缩） |
| 输出 | `NewStructureUnity/Builds/webgl-baseline/`（已被 `.gitignore` 与 `ignore.conf` 双忽略） |

## 2 结果

**构建成功**：`result=Succeeded`，**0 errors / 2 warnings**。⚠️ 这 2 条 warning 的正文**未逐条确认**（首次失败那次的日志里可见 URP shader fallback 类提示，推测同类，非阻断）—— 下次构建请把 `LogWarningFormat` 的正文一并留档。

| 指标 | 值 |
|---|---|
| 构建耗时（Unity 报告） | **3 分 08 秒** |
| 构建耗时（墙钟） | **188.9 秒** |
| 产物文件数 | **18** |
| 产物磁盘合计 | **8,812,159 B ≈ 8.40 MiB** |
| Unity 报告的 `totalSize` | 8,811,547 B（与磁盘合计一致） |

### 2.1 逐文件（按大小降序，前 6 项即全部实载内容）

| 字节 | 文件 | 说明 |
|---|---|---|
| 5,392,210 | `Build/webgl-baseline.wasm.br` | **IL2CPP 编译产物（Brotli 压缩后 5.14 MiB）** |
| 3,307,795 | `Build/webgl-baseline.data.br` | 资源与元数据（3.15 MiB） |
| 69,778 | `Build/webgl-baseline.framework.js.br` | 运行时框架（68 KiB） |
| 20,642 | `Build/webgl-baseline.loader.js` | 加载器（未压缩） |
| 5,450 | `index.html` | 模板页（未压缩） |
| ≈15,000 | `TemplateData/*`（12 个小文件/图） | 模板样式、logo、进度条图标 |

### 2.2 关键结论

1. **空场景的引擎底座 ≈ 8.3 MiB（wasm + data 两项合计 8,700,005 B）**。
2. 与 DEC-02 的容量预算对比：内容资源预计 **250~360 MB**，引擎底座占 **约 2~3%** ⇒ **真正的敌人仍然是内容资源，不是引擎**。这条实测支持了"先用 Three.js 承载简单三维、只把复杂三维交给 Unity"的分工（DEC-06）。
3. 该数字**还有压缩空间**：本次是**未做代码剥离优化**的模板工程（含 VisualScripting / Timeline / TMP 全量）。后续可用托管代码剥离等级、移除未用模块、ASTC 纹理等继续压。
4. **首次构建 3 分钟**（含创建 IL2CPP 缓存）；Library 热态下第二次仍约 3 分钟（188.9s），说明构建时间主要在 IL2CPP + Brotli，**CI/打包频率要被算进工程成本**。

## 3 ⚠️ 实测中踩到并已解决的坑（本机环境相关，必须记住）

**症状**：第一次构建 `result=Failed, errors=3`，尾部只有 `Build/webgl-baseline.data.br`，缺少 `.wasm` / `framework.js` / `index.html`；日志里三处相同报错：

```text
Building Builds\webgl-baseline\index.html failed with output:
D:\CodeBuddy CN\resources\app\extensions\genie\out\vendor\shim\node-safe-delete-shim.cjs:981
require('module').syncBuiltinESMExports?.();
^
SyntaxError: Unexpected token '.'
```

**根因**：**IDE（CodeBuddy）向 shell 注入了 `NODE_OPTIONS=--require=".../node-language-shim.cjs"`**，我从前述 shell 启动 Unity 时这个环境变量被继承。Unity 的 WebGL 构建链内部调用的是**较老的 Node 运行时**，无法解析该 shim 里的可选链（`?.`）语法，于是模板压缩/生成步骤整体失败 —— **不是工程问题，是启动环境被污染**。

**修法**：启动 Unity 前清掉该变量：

```powershell
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
& "D:\Unity\2022.3.53f1\Editor\Unity.exe" -batchmode -quit -projectPath <工程> `
  -buildTarget WebGL -executeMethod WSU3.Editor.BuildTools.WebGLBaselineBuild.RunBaseline -logFile <日志>
```

**推论（对后续所有 Unity 批处理都成立）**：从 IDE 终端启动 Unity 必须清 `NODE_OPTIONS`；否则任何依赖 Node 的 Unity 构建步骤（WebGL 模板生成、部分包工具）会以"语法错误"这种极具误导性的形式失败。

## 4 复现方式

```powershell
# 编辑器必须先关闭（DEC-59 / DEC-66）
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
& "<Unity 编辑器>\Unity.exe" -batchmode -quit `
  -projectPath "<仓库根>\NewStructureUnity" `
  -buildTarget WebGL `
  -executeMethod WSU3.Editor.BuildTools.WebGLBaselineBuild.RunBaseline `
  -logFile "$env:TEMP\wsu3-webgl-build.log"
# 结果汇总写在 NewStructureUnity/Builds/webgl-baseline/baseline-report.txt
```

同一入口在编辑器里也有菜单：**`WSU3/Build/WebGL Baseline`**。

## 5 未做（不要当成已做）

| 项 | 说明 |
|---|---|
| 浏览器里实际打开并测加载时间/帧率 | 本次只构建并统计体积；**首屏加载时间与运行帧率尚未测**（需要把产物挂到静态服务器，属于下一步） |
| 移动端（微信内置浏览器）实测 | DEC-70 要求真机验收，尚未进行 |
| 代码剥离 / 模块裁剪后的二次基线 | 见 §2.2 第 3 条 |
| Addressables 分组实际生效 | 已装包但尚未配置分组（等第一个 Unity 件开工） |
