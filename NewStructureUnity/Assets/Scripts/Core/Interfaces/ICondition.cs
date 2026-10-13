using System;

namespace WSU3.Core.Interfaces
{
    public interface ICondition
    {
        void Init();
        void StartCondition();
        void WaitingCondition(Action isComplete);
        void FinishCondition();
    }
}
