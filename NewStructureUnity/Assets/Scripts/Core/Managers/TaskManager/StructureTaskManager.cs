using System.Collections;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Core.DataStruct;
using WSU3.Core.Managers.FunctionManager;
using WSU3.Core.Models;
using WSU3.Core.Models.Addressable;
using WSU3.Core.Steps;

namespace WSU3.Core.Managers.TaskManager
{
    /// <summary>
    /// 结构任务（<see cref="TaskType.Structure"/>）的装配：**按 prefabKey 取预制体 → 实例化 → 交给步骤系统**。
    ///
    /// 依据：docs/design/12（资源包链路）、docs/design/10（步骤系统）、DEC-87（三条链路 + 实例登记）、
    /// docs/PLAN.md P2-8 的结构任务落地表（本条对应它的 d 步）。
    ///
    /// 三件事的归属（不要互相抢）：
    ///   · **取件**（下载 / 加载预制体）→ <see cref="AddressableManager"/>，本类只按包 id 要；
    ///   · **实例化与实例归属**（谁实例化了谁、卸载时先销毁谁）→ 也走 <see cref="AddressableManager"/>，纪律②；
    ///   · **挂载点与步骤驱动** → 本类。
    ///
    /// 本类是 **MonoBehaviour，挂在内容场景的节点上**（`1_Content` 下的 `StructureTaskManager`）——
    /// 它自己不开协程，干活由 <see cref="FunctionManager.TaskFlowManager"/> 的泵推进。
    ///
    /// ⚠ 步骤数据的落点（docs/TODO.md D-14）还没定：本类按"**预制体自带 StepManager 子树**"实现
    /// （源预制体上那张 simpleSteps 是唯一的步骤定义，由脚本从它生成 Unity 步骤节点）。
    /// 预制体里还没有这棵子树时，本类**只实例化、不假装跑流程**，并在 Console 里把原因与去处说清楚。
    /// </summary>
    public class StructureTaskManager : TaskManagerBase<StructureTaskManager>
    {
        private const string LogTag = "[Structure]";

        /// <summary>当前已实例化的结构件（未进入时为 null）。</summary>
        GameObject m_Instance;

        /// <summary>当前结构件的步骤导演（预制体子树里的那一个）。</summary>
        StepManager m_Step;

        /// <summary>实例的挂载根（首次进入时解析一次并缓存）。</summary>
        Transform m_Root;

        public override TaskType TaskType => TaskType.Structure;

        /// <summary>当前是否已装配（诊断用）。</summary>
        public bool HasInstance => m_Instance != null;

        /// <summary>当前实例的步骤导演（没有则为 null —— "没有步骤数据"是当前已知状态，不是异常）。</summary>
        public StepManager Step => m_Step;

        public override IEnumerator StartTaskRoutine(string clipId)
        {
            StopTask();   // 幂等重入：切任务时可能上一次还没退干净

            if (string.IsNullOrEmpty(clipId))
            {
                Debug.LogError($"{LogTag} 未给 clipId，无法装配（它来自 scene:enter 的 projectId）");
                yield break;
            }

            string packageId = ResolvePackageId(clipId);
            AddressableManager addressables = GlobalManager.AddressableManager;

            if (!addressables.TryGetConfig(packageId, out PackageConfigSO config) || config == null)
            {
                Debug.LogError($"{LogTag} 包登记表里没有 {packageId}（clip={clipId}）—— 结构件取不到，装配中止。\n" +
                               $"   先跑菜单 WSU3/Pack/一键打 AA 包（全部）生成包与登记表；登记表现有 clip：" +
                               $"{string.Join("、", addressables.GetClipIds())}");
                yield break;
            }

            GameObject prefab = null;
            yield return addressables.LoadAssetRoutine<GameObject>(config, loaded => prefab = loaded);

            if (prefab == null)
            {
                Debug.LogError($"{LogTag} 取件失败：{packageId}（链路 {config.PackageType}）。装配中止，不产出半成品实例。");
                yield break;
            }

            m_Instance = addressables.InstantiatePrefab(prefab, config.id, ResolveRoot());
            if (m_Instance == null) yield break;

            // 步骤：预制体自带 StepManager 子树时直接驱动它
            m_Step = m_Instance.GetComponentInChildren<StepManager>();

            if (m_Step == null)
            {
                Debug.LogWarning(
                    $"{LogTag} {packageId} 已实例化，但预制体里没有 StepManager 子树 —— 点击零件与拆装动画都不会推进。\n" +
                    "   步骤数据的落点还没定（docs/TODO.md D-14）：要由脚本把源预制体上那张 simpleSteps 生成成 Unity 步骤节点。\n" +
                    "   这是**已知未闭合项**，不是加载失败。");
                yield break;
            }

            // WHY: 步骤系统按"场景内唯一导演"设计，后到的那个会自我停用且不再被 Update 驱动；
            //      那种情况下 StartExecution 只会在一个永不推进的泵里压协程 —— 必须喊出来，而不是静默不动。
            if (!m_Step.enabled)
            {
                Debug.LogError(
                    $"{LogTag} 预制体里的 StepManager 被场景内已存在的 {nameof(StepManager)} 顶掉了（后者会自我停用）—— " +
                    "步骤不会推进。请让内容场景不常驻 StepManager，结构件才是唯一导演。");
                yield break;
            }

            m_Step.StartExecution();
            Debug.Log($"{LogTag} {packageId} 已实例化并开始执行步骤（共 {m_Step.TotalStepCount} 步）");
        }

        public override void StopTask()
        {
            if (m_Step != null)
            {
                // 先停流程（它会重置全部条件状态并收掉 DOM 面板），再销毁物体
                m_Step.StopExecution();
                m_Step = null;
            }

            if (m_Instance != null)
            {
                // 反注册 + 销毁都走包管理器：实例登记表在它手里（纪律②：卸载包前先销毁该包实例，否则材质变粉）
                GlobalManager.AddressableManager.ReleaseInstance(m_Instance, true);
                m_Instance = null;
            }
        }

        /// <summary>
        /// 该 clip 的结构件用哪个包配置 id。
        ///
        /// ① 内容数据里有 <c>prefabKey</c> 就以它为准（docs/design/04 §2.1：三维资源只写 key，路径由登记表解析）；
        /// ② 内容数据还没装载（docs/PLAN.md P2-6e）时按命名规则推导 ——
        ///    <c>clip_contactor</c> → <c>contactor</c> → <c>contactor_structure_model</c>，
        ///    与 ProjectData.json 里写的键值逐字符一致（两条路得到的是同一个字符串，不会漂）。
        /// </summary>
        private static string ResolvePackageId(string clipId)
        {
            ProjectClip clip = GlobalManager.CurrentProjectClip;
            if (clip != null && clip.structure != null && !string.IsNullOrEmpty(clip.structure.prefabKey))
                return clip.structure.prefabKey;

            return ContentNaming.ConfigId(
                ContentNaming.DeviceOf(clipId), ContentNaming.TaskStructure, ContentNaming.ResourceModel);
        }

        /// <summary>实例的挂载根：场景里有就复用、没有就运行时建一个（见 <see cref="DataStructMapping.GetStructureRoot"/>）。</summary>
        private Transform ResolveRoot()
        {
            if (m_Root != null) return m_Root;
            m_Root = DataStructMapping.GetStructureRoot();
            return m_Root;
        }
    }
}
