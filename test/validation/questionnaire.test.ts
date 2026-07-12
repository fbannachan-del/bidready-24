import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  nextQuestionId,
  pruneHiddenAnswers,
  validateQuestionnaire,
  visibleQuestions,
  type QuestionDefinition,
  type QuestionnaireAnswer,
} from "../../lib/validation/questionnaire";

const questions: QuestionDefinition[] = [
  { id: "has_insurance", type: "boolean", required: true },
  {
    id: "insurance_limit",
    type: "single",
    required: true,
    options: ["5m", "10m", "20m"],
    visibleWhen: [{ questionId: "has_insurance", operator: "equals", value: true }],
  },
  {
    id: "upload_certificate",
    type: "boolean",
    required: true,
    visibleWhen: [{ questionId: "insurance_limit", operator: "equals", value: "10m" }],
  },
  {
    id: "explain_gap",
    type: "text",
    required: true,
    visibleWhen: [{ questionId: "has_insurance", operator: "equals", value: false }],
  },
];

describe("conditional questionnaire traversal", () => {
  it("asks the first unanswered visible question and terminates", () => {
    let answers: Record<string, QuestionnaireAnswer> = {};
    assert.equal(nextQuestionId(questions, answers), "has_insurance");
    answers = { has_insurance: true };
    assert.equal(nextQuestionId(questions, answers), "insurance_limit");
    answers.insurance_limit = "10m";
    assert.equal(nextQuestionId(questions, answers), "upload_certificate");
    answers.upload_certificate = true;
    assert.equal(nextQuestionId(questions, answers), null);
    assert.equal(validateQuestionnaire(questions, answers).valid, true);
  });

  it("does not expose a nested child when its parent question is hidden", () => {
    const visible = visibleQuestions(questions, {
      has_insurance: false,
      insurance_limit: "10m",
      upload_certificate: true,
    }).map((question) => question.id);
    assert.deepEqual(visible, ["has_insurance", "explain_gap"]);
  });

  it("prunes stale branch answers when the controlling answer changes", () => {
    const pruned = pruneHiddenAnswers(questions, {
      has_insurance: false,
      insurance_limit: "10m",
      upload_certificate: true,
      explain_gap: "New certificate ordered",
    });
    assert.deepEqual(pruned, { has_insurance: false, explain_gap: "New certificate ordered" });
  });

  it("does not allow hidden answers to make an incomplete questionnaire valid", () => {
    const result = validateQuestionnaire(questions, {
      has_insurance: false,
      insurance_limit: "10m",
      upload_certificate: true,
    });
    assert.equal(result.valid, false);
    assert.deepEqual(result.missingQuestionIds, ["explain_gap"]);
  });

  it("rejects wrong answer types and values outside configured options", () => {
    assert.deepEqual(validateQuestionnaire(questions, { has_insurance: "yes" }).invalidQuestionIds, ["has_insurance"]);
    assert.deepEqual(validateQuestionnaire(questions, { has_insurance: true, insurance_limit: "£10m" }).invalidQuestionIds, ["insurance_limit"]);
  });

  it("rejects duplicate, orphan, self-referencing, and cyclic definitions", () => {
    assert.throws(() => visibleQuestions([{ id: "a", type: "text" }, { id: "a", type: "text" }], {}), /Duplicate/);
    assert.throws(() => visibleQuestions([{ id: "a", type: "text", visibleWhen: [{ questionId: "missing", operator: "exists" }] }], {}), /unknown/);
    assert.throws(() => visibleQuestions([{ id: "a", type: "text", visibleWhen: [{ questionId: "a", operator: "exists" }] }], {}), /itself/);
    assert.throws(() => visibleQuestions([
      { id: "a", type: "text", visibleWhen: [{ questionId: "b", operator: "exists" }] },
      { id: "b", type: "text", visibleWhen: [{ questionId: "a", operator: "exists" }] },
    ], {}), /cycle/);
  });

  it("bounds questionnaire size to prevent adversarial traversal", () => {
    const tooMany = Array.from({ length: 201 }, (_, index): QuestionDefinition => ({ id: `q${index}`, type: "text" }));
    assert.throws(() => visibleQuestions(tooMany, {}), /exceeds/);
  });
});
