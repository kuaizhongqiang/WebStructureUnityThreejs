using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Managers.FunctionManager
{
    public class AudioManager : FunctionManagerBase
    {
        Dictionary<AudioTunnelType, AudioSource> audioTunnels = new Dictionary<AudioTunnelType, AudioSource>();
        public override void Init(Action isInitComplete = null)
        {
            foreach (AudioTunnelType type in Enum.GetValues(typeof(AudioTunnelType)))
            {
                AudioSource audioSource = GetAudioSource(type);
                audioSource.volume = 1;
            }
            isInit = true;
            isInitComplete?.Invoke();
        }

        public override void OnDespose()
        {
            
        }

        AudioSource GetAudioSource(AudioTunnelType type)
        {
            if (audioTunnels.ContainsKey(type))
            {
                return audioTunnels[type];
            }
            else
            {
                AudioSource audioSource = new GameObject("AudioSource_" + type).AddComponent<AudioSource>();
                audioSource.transform.SetParent(GlobalManager.Instance.transform);
                audioSource.playOnAwake = false;
                audioTunnels.Add(type, audioSource);
                return audioSource;
            }            
        }
    }
    [Serializable]
    public enum AudioTunnelType
    {
        [InspectorName("说话")]
        Speaking = 0,
        [InspectorName("背景音乐")]
        Bgm = 1,
        [InspectorName("音效")]
        Effect = 2,
    }
}
