export type QuestionnaireAnswer = string | number | boolean | string[];

export type ConditionClause = {
  questionId: string;
  operator: "equals" | "not_equals" | "includes" | "exists";
  value?: QuestionnaireAnswer;
};

export type QuestionDefinition = {
  id: string;
  type: "text" | "number" | "boolean" | "single" | "multi" | "date";
  required?: boolean;
  options?: string[];
  visibleWhen?: ConditionClause[];
};

export type QuestionnaireValidation = {
  valid: boolean;
  visibleQuestionIds: string[];
  missingQuestionIds: string[];
  invalidQuestionIds: string[];
};

function assertDefinition(definitions: QuestionDefinition[]): void {
  if (definitions.length === 0) throw new Error("Questionnaire must contain at least one question");
  if (definitions.length > 200) throw new Error("Questionnaire exceeds 200 questions");
  const ids = new Set<string>();
  for (const question of definitions) {
    if (!question.id || ids.has(question.id)) throw new Error(`Duplicate or empty question id: ${question.id}`);
    ids.add(question.id);
    if (["single", "multi"].includes(question.type) && (!question.options || question.options.length === 0)) {
      throw new Error(`Question ${question.id} requires options`);
    }
  }
  for (const question of definitions) {
    for (const condition of question.visibleWhen ?? []) {
      if (!ids.has(condition.questionId)) throw new Error(`Question ${question.id} references unknown question ${condition.questionId}`);
      if (condition.questionId === question.id) throw new Error(`Question ${question.id} cannot depend on itself`);
    }
  }

  const edges = new Map(definitions.map((question) => [question.id, (question.visibleWhen ?? []).map((c) => c.questionId)]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Questionnaire contains a visibility cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of edges.get(id) ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  definitions.forEach((question) => visit(question.id));
}

function conditionMatches(condition: ConditionClause, answers: Record<string, QuestionnaireAnswer>): boolean {
  const answer = answers[condition.questionId];
  if (condition.operator === "exists") return answer !== undefined && answer !== "" && (!Array.isArray(answer) || answer.length > 0);
  if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) return false;
  if (condition.operator === "includes") return Array.isArray(answer) && answer.includes(String(condition.value));
  if (condition.operator === "equals") return answer === condition.value;
  return answer !== condition.value;
}

function answerIsValid(question: QuestionDefinition, answer: QuestionnaireAnswer | undefined): boolean {
  if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) return !question.required;
  if (question.type === "boolean") return typeof answer === "boolean";
  if (question.type === "number") return typeof answer === "number" && Number.isFinite(answer);
  if (question.type === "multi") {
    return Array.isArray(answer) && answer.every((value) => question.options?.includes(value));
  }
  if (question.type === "single") return typeof answer === "string" && Boolean(question.options?.includes(answer));
  if (question.type === "date") return typeof answer === "string" && !Number.isNaN(Date.parse(answer));
  return typeof answer === "string" && answer.trim().length > 0;
}

export function visibleQuestions(
  definitions: QuestionDefinition[],
  answers: Record<string, QuestionnaireAnswer>,
): QuestionDefinition[] {
  assertDefinition(definitions);
  const byId = new Map(definitions.map((question) => [question.id, question]));
  const memo = new Map<string, boolean>();
  const isVisible = (question: QuestionDefinition): boolean => {
    const cached = memo.get(question.id);
    if (cached !== undefined) return cached;
    const visible = (question.visibleWhen ?? []).every((condition) => {
      const dependency = byId.get(condition.questionId);
      return Boolean(dependency && isVisible(dependency) && conditionMatches(condition, answers));
    });
    memo.set(question.id, visible);
    return visible;
  };
  return definitions.filter(isVisible);
}

export function validateQuestionnaire(
  definitions: QuestionDefinition[],
  answers: Record<string, QuestionnaireAnswer>,
): QuestionnaireValidation {
  const visible = visibleQuestions(definitions, answers);
  const visibleIds = new Set(visible.map((question) => question.id));
  const missingQuestionIds: string[] = [];
  const invalidQuestionIds: string[] = [];
  for (const question of visible) {
    const answer = answers[question.id];
    const missing = answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0);
    if (missing && question.required) missingQuestionIds.push(question.id);
    else if (!missing && !answerIsValid(question, answer)) invalidQuestionIds.push(question.id);
  }
  return {
    valid: missingQuestionIds.length === 0 && invalidQuestionIds.length === 0,
    visibleQuestionIds: [...visibleIds],
    missingQuestionIds,
    invalidQuestionIds,
  };
}

export function nextQuestionId(
  definitions: QuestionDefinition[],
  answers: Record<string, QuestionnaireAnswer>,
): string | null {
  const result = validateQuestionnaire(definitions, answers);
  const blocked = new Set([...result.missingQuestionIds, ...result.invalidQuestionIds]);
  return result.visibleQuestionIds.find((id) => blocked.has(id)) ?? null;
}

/** Removes answers whose questions became hidden after a controlling answer changed. */
export function pruneHiddenAnswers(
  definitions: QuestionDefinition[],
  answers: Record<string, QuestionnaireAnswer>,
): Record<string, QuestionnaireAnswer> {
  const visible = new Set(visibleQuestions(definitions, answers).map((question) => question.id));
  return Object.fromEntries(Object.entries(answers).filter(([id]) => visible.has(id)));
}
