// WebGL 平台下的出站通道实现：三个 .jslib 原生调用。
//
// 与 WebChannel.Editor.cs 是**互斥的一对**：本文件只在 WebGL 播放器（非编辑器）编译。
// 拆文件的原因：静态检查工具读不懂 #if，若把两个分支写进同一个文件，同名方法会被误判为"重复签名"。

#if UNITY_WEBGL && !UNITY_EDITOR

using System.Runtime.InteropServices;

namespace WSU3.Web
{
    public static partial class WebChannel
    {
        [DllImport("__Internal")]
        private static extern void Wsu3Bridge_Ready(string version);

        [DllImport("__Internal")]
        private static extern void Wsu3Bridge_Post(string json);

        [DllImport("__Internal")]
        private static extern void Wsu3Bridge_Progress(string progress);
    }
}

#endif
