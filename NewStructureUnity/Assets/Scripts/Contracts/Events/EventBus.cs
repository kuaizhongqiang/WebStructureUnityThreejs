using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Contracts.Events
{
    public static class EventBus<T> where T : class
    {
        private static readonly List<Action<T>> s_Subscribers = new List<Action<T>>();
        private static readonly object s_Lock = new object();
        // WHY: 订阅列表未变化时复用快照数组，避免每次 Publish 分配 ToArray；s_Revision 由 Subscribe/Unsubscribe/Clear 递增。
        private static Action<T>[] s_Snapshot = new Action<T>[0];
        private static int s_Revision;
        private static int s_SnapshotRevision = -1;

        /// <summary>订阅事件</summary>
        public static void Subscribe(Action<T> handler)
        {
            lock (s_Lock)
            {
                if (!s_Subscribers.Contains(handler))
                {
                    s_Subscribers.Add(handler);
                    s_Revision++;
                }
            }
        }

        /// <summary>取消订阅</summary>
        public static void Unsubscribe(Action<T> handler)
        {
            lock (s_Lock)
            {
                if (s_Subscribers.Contains(handler))
                {
                    s_Subscribers.Remove(handler);
                    s_Revision++;
                }
            }
        }

        /// <summary>发布事件 —— 通知所有订阅者</summary>
        public static void Publish(T eventData)
        {
            Action<T>[] handlers;
            lock (s_Lock)
            {
                if (s_SnapshotRevision != s_Revision)
                {
                    s_Snapshot = s_Subscribers.ToArray();
                    s_SnapshotRevision = s_Revision;
                }
                handlers = s_Snapshot;
            }

            for (int i = 0; i < handlers.Length; i++)
            {
                try
                {
                    handlers[i]?.Invoke(eventData);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[EventBus] 事件处理异常 [{typeof(T).Name}]: {ex.Message}");
                }
            }
        }

        /// <summary>清空所有订阅（场景切换时使用）</summary>
        public static void Clear()
        {
            lock (s_Lock)
            {
                if (s_Subscribers.Count > 0)
                {
                    s_Subscribers.Clear();
                    s_Revision++;
                }
            }
        }

        /// <summary>当前订阅者数量</summary>
        public static int SubscriberCount
        {
            get
            {
                lock (s_Lock)
                {
                    return s_Subscribers.Count;
                }
            }
        }
    }
}
