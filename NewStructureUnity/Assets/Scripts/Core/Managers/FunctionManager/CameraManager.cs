using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Managers.FunctionManager
{
    public class CameraManager : FunctionManagerBase
    {
        public override void Init(Action isInitComplete = null)
        {
            GlobalManager.MainCamera = GetMainCamera();
            isInit = true;
            isInitComplete?.Invoke();
        }

        public override void OnDespose()
        {
            
        }

        public static Camera GetMainCamera()
        {
            var list = Camera.allCameras;
            var mains = new List<Camera>();
            for (int i = 0; i < list.Length; i++)
            {
                if (list[i].gameObject.tag == "MainCamera")
                    mains.Add(list[i]);
            }

            if (mains.Count == 1) return mains[0];
            else if (mains.Count > 1)
            {
                // 移除直到只剩余一个mainCamera
                for (int i = 1; i < mains.Count; i++)
                {
                    GameObject.DestroyImmediate(mains[i].gameObject);
                }
                return mains[0];
            }
            else
            {
                Debug.LogError("There is no main camera");
                return CreateMainCamera();
            }
        }
        static Camera CreateMainCamera()
        {
            GameObject prefab = Resources.Load<GameObject>("MainCamera");
            if (prefab == null)
            {
                Debug.LogError("There is no prefab named MainCamera");
                return null;
            }
            Camera cam = GameObject.Instantiate(prefab,GlobalManager.Instance.transform).GetComponent<Camera>();

            return cam;
        }
    }
}
