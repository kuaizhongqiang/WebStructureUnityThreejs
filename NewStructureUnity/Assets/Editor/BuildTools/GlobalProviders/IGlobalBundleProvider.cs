using System.Collections.Generic;
using WSU3.Core.Models.Addressable;

namespace WSU3.Editor.BuildTools
{
    // WHY: 全局包 = **不属任何项目**的包（UI / 字体 / 相机背景这类），
    //      与内容包的区别只有一处：它的包配置 <c>clipId</c> 一律留空
    //      （<see cref="WSU3.Core.Managers.FunctionManager.AddressableManager.GetConfigsByClip"/> 对空 clipId 返回空表，
    //      所以全局包天然常驻、不会被"按 clip 装卸"的链路带走）。其余（校验 / 写配置 / 同步登记表 / 构建 / 清残留）全部复用同一套流水线。
    /// <summary>待打包的一条全局资源：全局包流水线的中间产物（与项目无关）。</summary>
    public class GlobalResourceEntry
    {
        /// <summary>包配置 id（= 运行期取件键）。</summary>
        public string id;

        /// <summary>资源工程路径（<c>Assets/...</c>）。</summary>
        public string assetPath;

        /// <summary>资源类型：运行期按它选泛型加载。</summary>
        public ContentAssetKind kind = ContentAssetKind.Prefab;

        /// <summary>对账报告里的备注（来源说明等）。</summary>
        public string note;

        public GlobalResourceEntry() { }

        public GlobalResourceEntry(string id, string assetPath, string note = null,
                                   ContentAssetKind kind = ContentAssetKind.Prefab)
        {
            this.id = id;
            this.assetPath = assetPath;
            this.note = note;
            this.kind = kind;
        }
    }

    // WHY: 这是"再加一个全局包"的**唯一扩展点** —— 加一个实现 + 在 ContentPipeline.GlobalProviders 里登记一行。
    //      它存在的理由：全局包每加一个都要重走"收集 → 校验 → 写配置 → 同步登记表 → 构建 → 清残留"这同一段流程，
    //      让每个包各写一个专用工具等于把这段流程抄 N 份、N 份各自会漂。
    /// <summary>全局包提供者（编辑器侧契约）：一个组一组资源，不按项目收集。</summary>
    public interface IGlobalBundleProvider
    {
        /// <summary>对账报告里的来源名与日志 tag（如 <c>UI</c>）。</summary>
        string Name { get; }

        /// <summary>本包的包配置目录（与内容包分目录，避免"按本次产出清残留"互相误删）。</summary>
        string ConfigDir { get; }

        // WHY: 直接当 Addressables 分组名用，须以 WSU3_ 开头（清理残留只动这一族，见 ContentNaming.IsManagedGroup）。
        //      迁 AA 后**不再有"末段必须小写否则 404"那条纪律** —— AA 地址不经文件系统。
        /// <summary>Addressables 分组名（如 <c>WSU3_UI</c>）。</summary>
        string BundleName { get; }

        /// <summary>收集本包的全部资源条目。</summary>
        IEnumerable<GlobalResourceEntry> Collect();
    }
}
