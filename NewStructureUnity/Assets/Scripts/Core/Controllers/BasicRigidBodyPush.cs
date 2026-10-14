using UnityEngine;

namespace WSU3.Core.Controllers
{
    /// <summary>角色碰撞推动受击刚体：命中非运动学刚体时按强度施加水平冲量。</summary>
    public class BasicRigidBodyPush : MonoBehaviour
    {
        public LayerMask pushLayers;
        public bool canPush;
        [Range(0.5f, 5f)] public float strength = 1.1f;

        private void OnControllerColliderHit(ControllerColliderHit hit)
        {
            if (canPush) PushRigidBodies(hit);
        }

        private void PushRigidBodies(ControllerColliderHit hit)
        {
            // 参考文档：https://docs.unity3d.com/ScriptReference/CharacterController.OnControllerColliderHit.html

            // 只推非运动学的刚体
            Rigidbody body = hit.collider.attachedRigidbody;
            if (body == null || body.isKinematic) return;

            // 只推指定层
            var bodyLayerMask = 1 << body.gameObject.layer;
            if ((bodyLayerMask & pushLayers.value) == 0) return;

            // 不推自己脚下的东西
            if (hit.moveDirection.y < -0.3f) return;

            // 推力方向取自移动方向，只取水平分量
            Vector3 pushDir = new Vector3(hit.moveDirection.x, 0.0f, hit.moveDirection.z);

            // 施加冲量并计入强度
            body.AddForce(pushDir * strength, ForceMode.Impulse);
        }
    }
}
