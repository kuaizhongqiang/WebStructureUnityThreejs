using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace WSU3.Core.Controllers
{
    /// <summary>
    /// 角色输入缓存：把 `PlayerInput` 回调的移动 / 视角 / 跳跃 / 冲刺值转存为字段，供控制器逐帧读取。
    /// 输入资产见同目录的 `StarterAssets.inputactions`（`Player` 动作表）。
    /// </summary>
    public class StarterAssetsInputs : MonoBehaviour
    {
        [Header("Character Input Values")]
        public Vector2 move;
        public Vector2 look;
        public bool jump;
        public bool sprint;

        [Header("Movement Settings")]
        public bool analogMovement;

        [Header("Mouse Cursor Settings")]
        public bool cursorLocked = true;
        public bool cursorInputForLook = true;

#if ENABLE_INPUT_SYSTEM
        public void OnMove(InputValue value)
        {
            MoveInput(value.Get<Vector2>());
        }

        public void OnLook(InputValue value)
        {
            // 转视角用的鼠标键：PC 是右键，WebGL 里用户手上只有左键 ⇒ 按平台切一个键
            int mouseButton = 1;
            if (Application.platform == RuntimePlatform.WebGLPlayer)
            {
                mouseButton = 0;
            }

            if (cursorInputForLook && Input.GetMouseButton(mouseButton))
            {
                LookInput(value.Get<Vector2>());
            }
            else
            {
                LookInput(Vector2.zero);
            }
        }

        public void OnJump(InputValue value)
        {
            JumpInput(value.isPressed);
        }

        public void OnSprint(InputValue value)
        {
            SprintInput(value.isPressed);
        }
#endif

        public void MoveInput(Vector2 newMoveDirection)
        {
            move = newMoveDirection;
        }

        public void LookInput(Vector2 newLookDirection)
        {
            look = newLookDirection;
        }

        public void JumpInput(bool newJumpState)
        {
            jump = newJumpState;
        }

        public void SprintInput(bool newSprintState)
        {
            sprint = newSprintState;
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            SetCursorState(cursorLocked);
        }

        private void SetCursorState(bool newState)
        {
            // 本工程不做鼠标锁定（Web / 壳里抢指针会与 Web 侧的交互冲突），保留空实现占位
        }
    }
}
