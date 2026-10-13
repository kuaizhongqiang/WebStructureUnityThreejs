// Unity WebGL ↔ Web 外壳 的 JS 侧桥（Unity → Web 方向）。
//
// 依据：docs/design/02-bridge-protocol.md（信封与消息清单）、docs/design/09-startup-orchestration.md（启动编排）、
//       web/src/unity/UnityBridge.ts（Web 侧的对应实现）。
//
// 方向说明：
//   Web → Unity  由 Unity 官方的 instance.SendMessage("WebBridge", "OnWebMessage", json) 完成（不需要本文件）；
//   Unity → Web  由本文件把字符串交给页面上的 window.__WSU3_BRIDGE__（名字是契约，写在 web/src/unity/UnityBridge.ts）。
//
// 纪律：页面桥缺席时**只告警不抛异常** —— 丢一条消息不该把整个三维场景拖崩。

mergeInto(LibraryManager.library, {
  // 握手：Unity 就绪，上报协议版本（Web 侧版本不符会明确报错，不做静默降级）。
  Wsu3Bridge_Ready: function (versionPtr) {
    var version = UTF8ToString(versionPtr);
    var bridge = typeof window !== 'undefined' ? window.__WSU3_BRIDGE__ : undefined;
    if (bridge && typeof bridge.onReady === 'function') {
      bridge.onReady(version);
    } else {
      console.warn('[wsu3] 页面桥未就绪，握手消息丢弃：' + version);
    }
  },

  // 通用业务消息：json 是完整信封 { type, version, seq, payload } 的字符串。
  Wsu3Bridge_Post: function (jsonPtr) {
    var json = UTF8ToString(jsonPtr);
    var bridge = typeof window !== 'undefined' ? window.__WSU3_BRIDGE__ : undefined;
    if (bridge && typeof bridge.post === 'function') {
      try {
        bridge.post(json);
      } catch (e) {
        console.error('[wsu3] 桥处理消息失败：' + e);
      }
    } else {
      console.warn('[wsu3] 页面桥未就绪，消息丢弃：' + json);
    }
  },

  // 引擎加载进度（0~1）。单独一条通道，因为它在"协议还没开始"的阶段就要能上报。
  Wsu3Bridge_Progress: function (progressPtr) {
    var progress = UTF8ToString(progressPtr);
    var bridge = typeof window !== 'undefined' ? window.__WSU3_BRIDGE__ : undefined;
    if (bridge && typeof bridge.onProgress === 'function') {
      bridge.onProgress(progress);
    }
  },
});
