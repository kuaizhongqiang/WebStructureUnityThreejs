/**
 * QuestionType / QuestionUsage —— 双端共享契约（Web 侧）。
 *
 * 契约来源（**双端同批维护**）：本仓 C# 侧 `NewStructureUnity/Assets/Scripts/Contracts/EnumAll.cs`。
 * 两侧各自手写，靠 `tools/check-contracts.mjs` 与基准快照三方比对（DEC-10 / DEC-67）。
 *
 * 纪律（docs/DECISIONS.md DEC-83 / DEC-09）：
 *   - 只许**往后追加**，不得插值、改序、改名；中文标签逐字保持；
 *   - **名字是数据契约**：内容 JSON 里枚举写成**名字**（如 `"questionType": "SingleChoice"`），
 *     不写序号 —— 这是采用既有内容数据的既有口径（docs/design/08-content-data-adoption.md）。
 */

export const QUESTION_TYPE_CONTRACT_VERSION = 1

/** 题型。`None` 是占位，保证 0 不被占用。 */
export enum QuestionType {
  None = 0,
  SingleChoice = 1,
  MultipleChoice = 2,
  TrueFalse = 3,
  FillInBlank = 4,
}

/** 中文标签，与 C# 侧 `[InspectorName]` 逐字一致。 */
export const QUESTION_TYPE_LABELS: Readonly<Record<QuestionType, string>> = {
  [QuestionType.None]: '空类型',
  [QuestionType.SingleChoice]: '单选',
  [QuestionType.MultipleChoice]: '多选',
  [QuestionType.TrueFalse]: '判断',
  [QuestionType.FillInBlank]: '填空',
}

/** 题目用途：决定一道题是进考核抽题池还是挂在步骤里。 */
export enum QuestionUsage {
  /** 考核抽题池（默认）。 */
  Exam = 0,
  /** 步骤内答题，不进考核池。 */
  Step = 1,
}

export const QUESTION_USAGE_LABELS: Readonly<Record<QuestionUsage, string>> = {
  [QuestionUsage.Exam]: '考核',
  [QuestionUsage.Step]: '步骤',
}

export const QUESTION_TYPES: readonly QuestionType[] = [
  QuestionType.None,
  QuestionType.SingleChoice,
  QuestionType.MultipleChoice,
  QuestionType.TrueFalse,
  QuestionType.FillInBlank,
]

export const QUESTION_USAGES: readonly QuestionUsage[] = [QuestionUsage.Exam, QuestionUsage.Step]

export function isQuestionType(value: unknown): value is QuestionType {
  return typeof value === 'number' && value in QUESTION_TYPE_LABELS
}
