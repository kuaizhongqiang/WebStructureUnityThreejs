// 编辑器 / 单测 与 非 WebGL 平台 下的出站通道实现：**空实现**。
//
// 为什么是空实现而不是报错：编辑器里没有页面桥，报错会把"在编辑器里跑一遍看逻辑"这条路堵死；
// 真正的验证手段是 WebChannel.Sent 事件（单测订阅它断言发了什么），以及 WebGL 构建里的真桥。
// 与 WebChannel.Native.cs 互斥（见那个文件的说明）。

#if !(UNITY_WEBGL && !UNITY_EDITOR)

namespace WSU3.Web
{
    public static partial class WebChannel
    {
        private static void Wsu3Bridge_Ready(string version)
        {
        }

        private static void Wsu3Bridge_Post(string json)
        {
        }

        private static void Wsu3Bridge_Progress(string progress)
        {
        }
    }
}

#endif
