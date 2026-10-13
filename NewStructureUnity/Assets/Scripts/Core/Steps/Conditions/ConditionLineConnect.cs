using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using WSU3.Core.Interactive;
using WSU3.Core.Steps.Lines;

namespace WSU3.Core.Steps.Conditions
{
    /// <summary>
    /// 连线配对条件（任务四"电路连接"的核心交互）：**先点源端点、再点目标端点**，全部配对成功即完成。
    ///
    /// 两种线分得很清楚（口径见 `docs/design/10` §7）：
    ///   · **临时线**：选中源之后还没配对的提示 —— 本期只记录"选中了哪一个源"，鼠标跟随留到
    ///     连线手感专项（见 `docs/design/10-step-system.md` 的待办）；
    ///   · **常驻线**：配对成功后画出来，**在本步骤内**一直留着（不回退、不重画）。
    ///     但**跳转会全员归位**：配对与常驻线一起清空 —— 这是与"跳转从 P0S0 重置、状态永远一致"
    ///     对齐的有意取舍（连线不跨跳转保留）。这一步作为跳转**前缀**时，快进会把配对的线补齐画出，
    ///     呈现"已连完"的姿态。
    ///
    /// 端点是交互物（`InteractiveObjBase`），点击由 `InteractiveManager` 统一派发；
    /// 本条件不自己订阅事件，等 `StepManager` 转发（见 `ConditionBase.OnInteraction`）。
    /// </summary>
    [Serializable]
    public class ConditionLineConnect : ConditionBase
    {
        /// <summary>一对端点：先点 <see cref="source"/>，再点 <see cref="target"/>。</summary>
        [Serializable]
        public class LinePair
        {
            [Tooltip("源端点：先点它")]
            public InteractiveObjBase source;
            [Tooltip("目标端点：再点它即配对成功")]
            public InteractiveObjBase target;
        }

        [Header("配对表")]
        [Tooltip("所有要连的配对；全部完成才算这一步完成")]
        [SerializeField] private List<LinePair> pairs = new List<LinePair>();

        [Header("外观")]
        [Tooltip("由步骤负责揭示连线区：Prepare 隐藏端点、Waiting 显示、完成后再隐藏")]
        [SerializeField] private bool toggleEndpointsActive = true;
        [SerializeField] private Color lineColor = new Color(0.2f, 0.9f, 0.4f, 1f);
        [Tooltip("线宽（世界单位）")]
        [SerializeField] private float lineWidth = 0.01f;
        [Tooltip("线材质：留空则按 Sprites/Default → URP Unlit → Unlit/Color 逐个试")]
        [SerializeField] private Material lineMaterial;

        private readonly List<bool> paired = new List<bool>();
        private int selectedIndex = -1;
        private LineConnectBoard board;

        public override ConditionType Type => ConditionType.LineConnect;

        /// <summary>配对总数。</summary>
        public int PairCount => pairs.Count;

        /// <summary>已完成配对数。</summary>
        public int PairedCount
        {
            get
            {
                int count = 0;
                for (int i = 0; i < paired.Count; i++)
                {
                    if (paired[i]) count++;
                }
                return count;
            }
        }

        /// <summary>当前选中的源（-1 = 没选）。</summary>
        public int SelectedIndex => selectedIndex;

        /// <summary>运行期填配对表（内容装配与测试用）。</summary>
        public void SetPairs(IEnumerable<LinePair> value)
        {
            pairs.Clear();
            if (value == null) return;
            foreach (LinePair pair in value)
            {
                pairs.Add(pair);
            }
        }

        // ── 三阶段 ────────────────────────────────────────────────────────

        protected override IEnumerator OnPrepare()
        {
            BuildRuntimeState();
            ClearPairs();
            CloseBoard();
            ShowEndpoints(false);
            yield break;
        }

        protected override IEnumerator OnWaiting()
        {
            BuildRuntimeState();

            if (pairs.Count == 0)
            {
                Debug.LogWarning($"[Step] {step?.Path} 的连线条件没有配对表，已按「立即完成」处理。");
                yield break;
            }

            ShowEndpoints(true);
            EnsureBoard();

            yield return WaitUntilOrForceComplete(AllPaired);
        }

        public override IEnumerator FastComplete()
        {
            // 连线的快进：把配对的线**真的画出来**（呈现"已连完"），再走基类的定格末帧
            BuildRuntimeState();
            for (int i = 0; i < paired.Count; i++)
            {
                paired[i] = true;
            }

            // 没有配对表就别建空画板（每次跳转都会在步骤节点下留一个空对象）
            if (pairs.Count > 0)
            {
                EnsureBoard();
                RedrawAll();
            }

            yield return base.FastComplete();
        }

        protected override void OnCompleteHide()
        {
            selectedIndex = -1;
            if (toggleEndpointsActive) ShowEndpoints(false);
        }

        protected override void OnReset()
        {
            BuildRuntimeState();
            ClearPairs();

            // 归位连"揭示"一起收回去：端点是这一步拉起来的，跳走之后不该继续亮着
            if (toggleEndpointsActive) ShowEndpoints(false);

            CloseBoard();
        }

        private void ClearPairs()
        {
            for (int i = 0; i < paired.Count; i++)
            {
                paired[i] = false;
            }

            selectedIndex = -1;
        }

        // ── 交互 ──────────────────────────────────────────────────────────

        public override void OnInteraction(GlobalInteractionEventData e)
        {
            if (e == null || e.Type != GlobalInteractionType.Click) return;

            // 点空白：取消选中（取消连线语义）
            if (e.Target == null)
            {
                selectedIndex = -1;
                return;
            }

            // ① 选中的源 + 它的目标 → 配对成功
            if (selectedIndex >= 0 && selectedIndex < pairs.Count && pairs[selectedIndex].target == e.Target)
            {
                CompletePair(selectedIndex);
                selectedIndex = -1;
                return;
            }

            // ② 点到某个未完成配对的源 → 选中（或换选）
            int sourceIndex = FindUnpairedSource(e.Target);
            if (sourceIndex >= 0)
            {
                selectedIndex = sourceIndex;
                return;
            }

            // ③ 其他（含点错的目标）：取消选中，别让"选中态"赖在屏幕上
            selectedIndex = -1;
        }

        // ── 内部 ──────────────────────────────────────────────────────────

        private void BuildRuntimeState()
        {
            while (paired.Count < pairs.Count) paired.Add(false);
            if (paired.Count > pairs.Count) paired.RemoveRange(pairs.Count, paired.Count - pairs.Count);
        }

        private bool AllPaired()
        {
            if (paired.Count == 0) return true;
            for (int i = 0; i < paired.Count; i++)
            {
                if (!paired[i]) return false;
            }
            return true;
        }

        private int FindUnpairedSource(InteractiveObjBase obj)
        {
            for (int i = 0; i < pairs.Count; i++)
            {
                if (i < paired.Count && paired[i]) continue;
                if (pairs[i].source == obj) return i;
            }
            return -1;
        }

        private void CompletePair(int index)
        {
            if (index < 0 || index >= paired.Count) return;
            paired[index] = true;
            DrawPair(index);
        }

        private void EnsureBoard()
        {
            if (board != null) return;

            var boardObject = new GameObject("LineConnectBoard");
            if (step != null)
            {
                // 挂在步骤节点下：归位时随画板一起清掉，不污染场景根
                boardObject.transform.SetParent(step.transform, false);
            }
            board = boardObject.AddComponent<LineConnectBoard>();
            board.Configure(lineMaterial, lineColor, lineWidth);

            if (!board.CanRender)
            {
                Debug.LogWarning(
                    $"[Step] {step?.Path} 的连线画板没有可用材质，本次只跑配对逻辑、不画线。" +
                    "请在条件上指定 lineMaterial。");
            }

            RedrawAll();
        }

        private void RedrawAll()
        {
            if (board == null) return;

            board.ClearLines();
            for (int i = 0; i < paired.Count; i++)
            {
                if (paired[i]) DrawPair(i);
            }
        }

        private void DrawPair(int index)
        {
            if (board == null || index < 0 || index >= pairs.Count) return;

            LinePair pair = pairs[index];
            if (pair == null || pair.source == null || pair.target == null) return;

            board.AddLine(pair.source.transform, pair.target.transform);
        }

        private void ShowEndpoints(bool value)
        {
            if (!toggleEndpointsActive) return;

            for (int i = 0; i < pairs.Count; i++)
            {
                LinePair pair = pairs[i];
                if (pair == null) continue;
                if (pair.source != null) pair.source.gameObject.SetActive(value);
                if (pair.target != null) pair.target.gameObject.SetActive(value);
            }
        }

        private void CloseBoard()
        {
            if (board == null) return;
            Destroy(board.gameObject);
            board = null;
        }

        private static void Destroy(GameObject target)
        {
            if (target == null) return;

            if (Application.isPlaying) UnityEngine.Object.Destroy(target);
            else UnityEngine.Object.DestroyImmediate(target);
        }
    }
}
