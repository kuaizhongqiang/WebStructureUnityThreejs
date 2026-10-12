using System;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

// ⚠️ 本文件所在的目录叫 BuildTools 而不是 Build：
// NewStructureUnity/ignore.conf 里 Build/build/Builds/builds 都是"任意深度匹配"，
// 任何名为 Build 的目录会被 Plastic SCM 静默排除（本项目早期实测确认过）。
// 同理 Builds/ 是构建产物目录，两个版本控制系统都已忽略。

namespace WSU3.Editor.BuildTools
{
    /// <summary>
    /// DEC-44：WebGL 基线实测。产出体积数字，供容量预算使用。
    /// 批处理用法：
    ///   Unity.exe -batchmode -quit -projectPath &lt;工程&gt; -buildTarget WebGL
    ///     -executeMethod WSU3.Editor.BuildTools.WebGLBaselineBuild.RunBaseline -logFile -
    /// </summary>
    public static class WebGLBaselineBuild
    {
        private const string OutputDir = "Builds/webgl-baseline";
        private const string ScenePath = "Assets/Scenes/SampleScene.unity";

        [MenuItem("WSU3/Build/WebGL Baseline")]
        public static void RunBaseline()
        {
            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = OutputDir,
                target = BuildTarget.WebGL,
                options = BuildOptions.None,
            };

            DateTime started = DateTime.Now;
            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;
            double wallSeconds = (DateTime.Now - started).TotalSeconds;

            Debug.Log("[WSU3] ===== WebGL baseline =====");
            Debug.Log($"[WSU3] result={summary.result} errors={summary.totalErrors} warnings={summary.totalWarnings}");
            Debug.Log($"[WSU3] totalSizeBytes={summary.totalSize}");
            Debug.Log($"[WSU3] buildReportTime={summary.totalTime}");
            Debug.Log($"[WSU3] wallClockSeconds={wallSeconds:0.0}");
            Debug.Log($"[WSU3] outputDir={OutputDir}");

            if (!Directory.Exists(OutputDir))
            {
                Debug.LogError("[WSU3] 构建产物目录不存在，构建很可能失败。");
                EditorApplication.Exit(1);
                return;
            }

            FileInfo[] files = new DirectoryInfo(OutputDir)
                .GetFiles("*", SearchOption.AllDirectories)
                .OrderByDescending(f => f.Length)
                .ToArray();

            long total = files.Sum(f => f.Length);
            var builder = new StringBuilder();
            builder.AppendLine($"result={summary.result}");
            builder.AppendLine($"wallClockSeconds={wallSeconds:0.0}");
            builder.AppendLine($"buildReportTime={summary.totalTime}");
            builder.AppendLine($"fileCount={files.Length}");
            builder.AppendLine($"totalBytes={total}");
            builder.AppendLine("--- files (desc by size) ---");
            foreach (FileInfo file in files)
            {
                string relative = Path.GetRelativePath(OutputDir, file.FullName).Replace('\\', '/');
                builder.AppendLine($"{file.Length}\t{relative}");
            }

            string reportPath = Path.Combine(OutputDir, "baseline-report.txt");
            File.WriteAllText(reportPath, builder.ToString(), new UTF8Encoding(false));

            Debug.Log($"[WSU3] fileCount={files.Length} totalBytes={total}");
            Debug.Log($"[WSU3] report written to {reportPath}");
            Debug.Log("[WSU3] ===== end =====");

            if (summary.result != BuildResult.Succeeded)
            {
                EditorApplication.Exit(1);
            }
        }
    }
}
