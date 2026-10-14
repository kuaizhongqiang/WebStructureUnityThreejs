using System.Collections.Generic;
using WSU3.Core.Models.Addressable;

namespace WSU3.Editor.BuildTools
{
    // WHY: id 必须是内容数据里**实际写的键值**（docs/design/04 §2.1：三维资源只写 key）；
    //      clipId / device / bundleName 由主流程统一补 —— Provider 自己拼会错位。
    /// <summary>待打包的一条内容资源：内容 AB 流水线的中间产物。</summary>
    public class ContentResourceEntry
    {
        /// <summary>包配置 id（= 内容数据里的键值）。</summary>
        public string id;

        /// <summary>资源工程路径（<c>Assets/...</c>）。为空表示"内容数据要求，但素材缺失"。</summary>
        public string assetPath;

        /// <summary>Error 级：阻塞构建（素材缺失 / id 不符合命名规则 / 重复占用 id 等）。</summary>
        public bool isError;

        /// <summary>Warning 级：只进对账报告，不参与打包（素材有而内容数据未引用）。</summary>
        public bool isExtra;

        // WHY: 资源类型必须准 —— 运行期按它选泛型加载，图集是 Sprite 子资产，用 Object 取只会拿到 Texture2D。
        /// <summary>资源类型：运行期按它选泛型加载。</summary>
        public ContentAssetKind kind = ContentAssetKind.Prefab;

        /// <summary>对账报告里的备注（缺失原因 / 来源说明等）。</summary>
        public string note;

        public ContentResourceEntry() { }

        public ContentResourceEntry(string id, string assetPath, string note = null,
                                    ContentAssetKind kind = ContentAssetKind.Prefab)
        {
            this.id = id;
            this.assetPath = assetPath;
            this.note = note;
            this.kind = kind;
        }
    }

    // WHY: 这是"一个 ProjectClip 打包哪些资源"的**唯一扩展点** —— 新增一类内容 = 加一个实现
    //      + 在 ContentPipeline.ContentProviders 里登记一行；漏登记不会被打包（且对账报告里看不到它）。
    /// <summary>内容资源提供者（编辑器侧契约）：收集单个项目待打包的资源条目。</summary>
    public interface IContentProvider
    {
        /// <summary>对账报告里的来源名（如 <c>StructureModel</c>）。</summary>
        string Name { get; }

        // WHY: 内容数据是唯一源 —— 素材缺失的项**也要产出**（assetPath 留空），
        //      只产出已存在的素材会让对账漏掉"数据要了、素材没有"这类最该报的问题。
        /// <summary>收集该项目的资源条目。</summary>
        IEnumerable<ContentResourceEntry> Collect(ClipDto clip, string device);
    }
}
