using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace WSU3.Editor.Common
{
    // WHY: 两条铁律不可拆 ——
    //      ① 先构建到 Temp 中转，只把 **bundle 本体**（不带 .manifest、不带清单 bundle）拷进 StreamingAssets；
    //      ② <c>sweepStale</c> 为真时，先删目标目录里不属于本次产出的文件（否则上一版的包会一直躺在产物里，
    //         而运行期按 bundle 名取件，旧包永远没人发现）。
    /// <summary>把 <c>AssetBundleBuild[]</c> 构建产物落到 <c>{outputRoot}/{bundle 名首段}/</c>（Temp 中转、只拷本体、清残留）。</summary>
    public static class BundleBuilder
    {
        // WHY: 必须**一次 BuildAssetBundles 调用**建出全部包 ——
        //      Unity 的"同一资产被显式分配后不再复制"只在同一次调用内成立：
        //      实测把被引用的资源和引用方分成两次构建时，资源会被**复制**进引用方的包（体积翻倍），
        //      同一次调用里同时声明两包才只记依赖。故入口只提供一个"一次构建 + 各落各自目录"的重载。
        /// <summary>
        /// 一次 <c>BuildAssetBundles</c> 构建全部 <paramref name="builds"/>，每个 bundle 本体按自己的目录段落到
        /// <c>{outputRoot}/{目录段}/</c>，残留清理**按目录各自**进行。
        /// </summary>
        public static BuildOutcome Build(string outputRoot, string tempRoot,
                                         AssetBundleBuild[] builds, bool sweepStale, string logTag)
        {
            var outcome = new BuildOutcome
            {
                Lines = new List<string>(),
                Missing = new List<string>(),
                Removed = new List<string>(),
            };

            if (builds == null || builds.Length == 0) return outcome;

            if (Directory.Exists(tempRoot)) FileUtil.DeleteFileOrDirectory(tempRoot);
            Directory.CreateDirectory(tempRoot);

            AssetBundleManifest manifest = BuildPipeline.BuildAssetBundles(
                tempRoot, builds, BuildAssetBundleOptions.ChunkBasedCompression, EditorUserBuildSettings.activeBuildTarget);

            bool ok = manifest != null;

            long total = 0;
            // WHY: 按目录段分组，为的是"残留清理按目录各自进行" —— 拿全部 bundle 名去清某一个目录会删掉别的流水线的产物。
            var perDir = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

            foreach (AssetBundleBuild build in builds)
            {
                string dirSegment = BundleDirSegment(build.assetBundleName);
                if (string.IsNullOrEmpty(dirSegment))
                {
                    outcome.Missing.Add(build.assetBundleName);
                    outcome.Lines.Add($"   {build.assetBundleName}  缺失（bundle 名不是「目录段/文件名段」，算不出落盘目录）");
                    Debug.LogError($"{logTag} 构建失败：bundle 名不合法 {build.assetBundleName}（须形如 Content/clip_contactor）");
                    continue;
                }

                string targetDir = Path.Combine(outputRoot, dirSegment);
                Directory.CreateDirectory(targetDir);

                string src = Path.Combine(tempRoot, build.assetBundleName);
                string dst = Path.Combine(targetDir, Path.GetFileName(build.assetBundleName));

                if (!File.Exists(src))
                {
                    outcome.Missing.Add(build.assetBundleName);
                    outcome.Lines.Add($"   {build.assetBundleName}  缺失");
                    Debug.LogError($"{logTag} 构建失败：产物缺失 {src}");
                    continue;
                }

                File.Copy(src, dst, true);
                var info = new FileInfo(dst);
                total += info.Length;
                outcome.Lines.Add($"   {dirSegment}/{Path.GetFileName(dst)}  {info.Length / 1024f:N1} KB  ({build.assetNames.Length} 项)");

                if (!perDir.TryGetValue(dirSegment, out List<string> keep))
                {
                    keep = new List<string>();
                    perDir[dirSegment] = keep;
                }
                keep.Add(Path.GetFileName(build.assetBundleName));
            }

            // WHY: 残留清理 gate 在「构建成功且产物齐全」之后 —— 构建失败时目标目录可能是唯一的可用产物来源，
            //      在失败现场再动一次目录只会把排查线索也清掉。
            if (sweepStale && ok && outcome.Missing.Count == 0)
            {
                foreach (KeyValuePair<string, List<string>> kvp in perDir)
                    outcome.Removed.AddRange(SweepStale(Path.Combine(outputRoot, kvp.Key), kvp.Value));
            }

            FileUtil.DeleteFileOrDirectory(tempRoot);
            AssetDatabase.Refresh();

            outcome.BundleCount = builds.Length - outcome.Missing.Count;
            outcome.TotalBytes = total;
            outcome.Ok = ok && outcome.Missing.Count == 0;
            return outcome;
        }

        /// <summary>bundle 名的目录段（<c>Content/clip_contactor</c> → <c>Content</c>）；不是两段式时返回 null。</summary>
        public static string BundleDirSegment(string bundleName)
        {
            if (string.IsNullOrEmpty(bundleName)) return null;

            string[] parts = bundleName.Split('/');
            return parts.Length == 2 && parts[0].Length > 0 && parts[1].Length > 0 ? parts[0] : null;
        }

        /// <summary>清掉 <c>targetDir</c> 里不在 <c>keepFileNames</c> 内的文件（连同 <c>.meta</c>），返回被删资产路径。</summary>
        public static List<string> SweepStale(string targetDir, IEnumerable<string> keepFileNames)
        {
            var removed = new List<string>();
            if (!Directory.Exists(targetDir)) return removed;

            var keep = new HashSet<string>(keepFileNames ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);
            string dir = targetDir.Replace('\\', '/');

            foreach (string file in Directory.GetFiles(dir))
            {
                string name = Path.GetFileName(file);
                if (name.EndsWith(".meta", StringComparison.OrdinalIgnoreCase)) continue;   // .meta 跟本体一起处理
                if (keep.Contains(name)) continue;

                // WHY: 走 AssetDatabase.DeleteAsset —— 直接 File.Delete 会留下孤立 .meta，Import 时一串告警
                string assetPath = dir + "/" + name;
                if (!AssetDatabase.DeleteAsset(assetPath))
                {
                    File.Delete(file);
                    string meta = file + ".meta";
                    if (File.Exists(meta)) File.Delete(meta);
                }

                removed.Add(assetPath);
            }

            return removed;
        }
    }

    /// <summary>构建结果（见 <see cref="BundleBuilder.Build"/>）。</summary>
    public struct BuildOutcome
    {
        /// <summary>构建成功且产物齐全（清单非空、无缺失本体）。</summary>
        public bool Ok;

        /// <summary>成功拷贝的本体数。</summary>
        public int BundleCount;

        /// <summary>拷贝产物的总字节数。</summary>
        public long TotalBytes;

        /// <summary>逐包明细行（<c>目录/文件名  大小 KB  (N 项)</c>）。</summary>
        public List<string> Lines;

        /// <summary>Temp 里缺产物（构建失败）的 bundle 名。</summary>
        public List<string> Missing;

        /// <summary><c>sweepStale</c> 清掉的残留资产路径。</summary>
        public List<string> Removed;
    }
}
