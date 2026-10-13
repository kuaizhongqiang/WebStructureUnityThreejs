// ============================================================================
// 双端共享契约（C# 侧）：Unity ↔ Web 桥消息类型。
// Web 侧镜像：web/src/contracts/bridge.ts
// 基准快照：content/contracts/snapshot.json 的 messageTypes
//
// 纪律（docs/DECISIONS.md DEC-85）：
//   1. 常量**声明顺序就是契约顺序**（先 Web→Unity 组，再 Unity→Web 组），新增只能往后追加；
//   2. 字符串拼写是契约：写错一个字母不会有编译期报错，只会表现为"消息石沉大海"；
//   3. 改本文件必须同批改 web/src/contracts/bridge.ts 与快照，否则门禁 tools/check-contracts.mjs 会拦下。
//
// 信封（所有消息统一）：{ type, version, seq, payload }；语义与错误码见 docs/design/02-bridge-protocol.md。
// ============================================================================

namespace WSU3.Contracts
{
    /// <summary>桥消息类型清单。读法：先看下面两组数组，再看各自常量。</summary>
    public static class BridgeMessageType
    {
        /// <summary>协议版本：握手时与 Web 侧比对，不匹配要明确报错（DEC-07，不静默降级）。</summary>
        public const int ProtocolVersion = 1;

        // ── Web → Unity（声明顺序 = 契约顺序）──────────────────────────
        public const string AppInit = "app:init";
        public const string PreloadTask = "preload:task";
        public const string PreloadCancel = "preload:cancel";
        public const string SceneEnter = "scene:enter";
        public const string SceneExit = "scene:exit";
        public const string ViewFocus = "view:focus";
        public const string UiSetLocale = "ui:set-locale";
        public const string UiSetQuality = "ui:set-quality";
        public const string InputEnable = "input:enable";
        public const string RuntimeResume = "runtime:resume";
        public const string DebugPing = "debug:ping";
        /// <summary>
        /// 教学面板回执：Web 侧把 `ui:request` 弹的面板结果回给 Unity 的步骤条件。
        /// 没有它，`ConditionUI` / `ConditionQuestion` 只能"发出去就再也等不到结果"。
        /// </summary>
        public const string UiResult = "ui:result";

        // ── Unity → Web（声明顺序 = 契约顺序）──────────────────────────
        public const string UnityReady = "unity:ready";
        public const string UnityProgress = "unity:progress";
        public const string AssetsReady = "assets:ready";
        public const string SceneReady = "scene:ready";
        public const string SceneExited = "scene:exited";
        public const string StepChanged = "step:changed";
        public const string TaskCompleted = "task:completed";
        public const string ScoreReport = "score:report";
        public const string ObjectPicked = "object:picked";
        public const string UiRequest = "ui:request";
        public const string UnityError = "unity:error";
        public const string DebugPong = "debug:pong";

        /// <summary>Web 会发给 Unity 的消息（订阅用）。</summary>
        public static readonly string[] FromWeb =
        {
            AppInit, PreloadTask, PreloadCancel, SceneEnter, SceneExit,
            ViewFocus, UiSetLocale, UiSetQuality, InputEnable, RuntimeResume, DebugPing,
            UiResult,
        };

        /// <summary>Unity 会发给 Web 的消息（发送用）。</summary>
        public static readonly string[] FromUnity =
        {
            UnityReady, UnityProgress, AssetsReady, SceneReady, SceneExited,
            StepChanged, TaskCompleted, ScoreReport, ObjectPicked, UiRequest,
            UnityError, DebugPong,
        };

        /// <summary>该 type 是否由 Web 发出。</summary>
        public static bool IsFromWeb(string type)
        {
            if (string.IsNullOrEmpty(type)) return false;
            for (int i = 0; i < FromWeb.Length; i++)
            {
                if (FromWeb[i] == type) return true;
            }
            return false;
        }
    }
}
