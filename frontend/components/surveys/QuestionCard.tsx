"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChoiceOptionsEditor } from "@/components/surveys/ChoiceOptionsEditor";
import { MatrixQuestionEditor } from "@/components/surveys/MatrixQuestionEditor";
import { QuestionTypeSelector } from "@/components/surveys/QuestionTypeSelector";
import { RatingSettings } from "@/components/surveys/RatingSettings";
import { GripIcon, PlusIcon } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { applyQuestionRuleForm, parseQuestionRuleForm, type BranchMode } from "@/lib/survey-question-rules";
import {
  getQuestionTypeLabels,
  getRatingRange,
  isChoiceQuestion,
  isDropdownQuestion,
  isMatrixQuestion,
  isRatingQuestion,
  withChoiceOptions,
} from "@/lib/survey-builder";
import type { SurveyBuilderQuestion, SurveyQuestionType } from "@/lib/types";

type QuestionCardProps = {
  index: number;
  question: SurveyBuilderQuestion;
  branchTargets: SurveyBuilderQuestion[];
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  readOnly?: boolean;
  onUpdate: (question: SurveyBuilderQuestion) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onAddBelow: () => void;
  onAddDependent: () => void;
};

export function QuestionCard({
  index,
  question,
  branchTargets,
  isFirst,
  isLast,
  canRemove,
  readOnly = false,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
  onAddBelow,
  onAddDependent,
}: QuestionCardProps) {
  const { language } = useLanguage();
  const copy = getQuestionCardCopy(language);
  const questionTypeLabels = getQuestionTypeLabels(language);

  return (
    <article className="question-card">
      <div className="question-card-top">
        <div className="question-card-index">
          <GripIcon className="nav-icon" />
          <span>{copy.questionNumber(index + 1)}</span>
        </div>
        <div className="question-card-actions">
          <span className="question-type-chip">{questionTypeLabels[question.type]}</span>
          {question.required ? <span className="question-required-pill">{copy.required}</span> : null}
        </div>
      </div>

      <div className="question-editor-grid">
        <div className="question-main-column">
          <label className="builder-field">
            <span>{copy.questionTitle}</span>
            <input
              value={question.title}
              onChange={(event) => onUpdate({ ...question, title: event.target.value })}
              placeholder={copy.questionTitlePlaceholder}
              disabled={readOnly}
            />
          </label>

          <label className="builder-field">
            <span>{copy.helperText}</span>
            <textarea
              rows={3}
              value={question.description}
              onChange={(event) => onUpdate({ ...question, description: event.target.value })}
              placeholder={copy.helperTextPlaceholder}
              disabled={readOnly}
            />
          </label>

          <div className="question-preview-surface">
            {renderQuestionPreview(question, onUpdate, readOnly, language)}
          </div>
        </div>

        <div className="question-side-column">
          <QuestionTypeSelector
            value={question.type}
            onChange={(type) => onUpdate(withChoiceOptions(question, type, language))}
            disabled={readOnly}
          />

          <div className="builder-toggle-row">
            <div>
              <strong>{copy.requiredQuestion}</strong>
              <p>{copy.requiredQuestionDescription}</p>
            </div>
            <button
              type="button"
              className={["builder-toggle", question.required ? "is-active" : ""].filter(Boolean).join(" ")}
              onClick={() => onUpdate({ ...question, required: !question.required })}
              aria-pressed={question.required}
              disabled={readOnly}
            >
              <span />
            </button>
          </div>

          <TypeSpecificSettings question={question} language={language} />
          <QuestionRulesEditor
            question={question}
            branchTargets={branchTargets}
            onUpdate={onUpdate}
            readOnly={readOnly}
            language={language}
          />
        </div>
      </div>

      <div className="question-card-footer">
        <div className="question-order-actions">
          <button type="button" className="builder-ghost-button" onClick={onMoveUp} disabled={readOnly || isFirst}>
            {copy.moveUp}
          </button>
          <button type="button" className="builder-ghost-button" onClick={onMoveDown} disabled={readOnly || isLast}>
            {copy.moveDown}
          </button>
          <button
            type="button"
            className="builder-ghost-button danger-button"
            onClick={onRemove}
            disabled={readOnly || !canRemove}
          >
            {copy.delete}
          </button>
        </div>
      </div>

      <div className="question-insert-row">
        <button type="button" className="builder-inline-add" onClick={onAddBelow} disabled={readOnly}>
          <PlusIcon className="nav-icon" />
          {copy.addQuestionBelow}
        </button>
        <button type="button" className="builder-inline-add is-accent" onClick={onAddDependent} disabled={readOnly}>
          <PlusIcon className="nav-icon" />
          {isMatrixQuestion(question.type) ? copy.addDependentGrid : copy.addDependentQuestion}
        </button>
      </div>
    </article>
  );
}

function TypeSpecificSettings({
  question,
  language,
}: {
  question: SurveyBuilderQuestion;
  language: "tr" | "en";
}) {
  const copy = getQuestionCardCopy(language);

  if (isRatingQuestion(question.type)) {
    return <RatingSettings type={question.type} />;
  }

  if (isMatrixQuestion(question.type)) {
    return (
      <div className="builder-field-group">
        <strong>{copy.matrixBehavior}</strong>
        <p className="muted">{copy.matrixBehaviorDescription}</p>
      </div>
    );
  }

  if (question.type === "date") {
    return (
      <div className="builder-field-group">
        <strong>{copy.dateBehavior}</strong>
        <p className="muted">{copy.dateBehaviorDescription}</p>
      </div>
    );
  }

  if (question.type === "full_name") {
    return (
      <div className="builder-field-group">
        <strong>{copy.structuredField}</strong>
        <p className="muted">{copy.structuredFieldDescription}</p>
      </div>
    );
  }

  if (question.type === "phone") {
    return (
      <div className="builder-field-group">
        <strong>{copy.phoneFormat}</strong>
        <p className="muted">{copy.phoneFormatDescription}</p>
      </div>
    );
  }

  if (question.type === "number") {
    return (
      <div className="builder-field-group">
        <strong>{copy.numericInput}</strong>
        <p className="muted">{copy.numericInputDescription}</p>
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="builder-field-group">
        <strong>{copy.selectionBehavior}</strong>
        <p className="muted">{copy.selectionBehaviorDescription}</p>
      </div>
    );
  }

  if (question.type === "dropdown") {
    return (
      <div className="builder-field-group">
        <strong>{copy.dropdownBehavior}</strong>
        <p className="muted">{copy.dropdownBehaviorDescription}</p>
      </div>
    );
  }

  return (
    <div className="builder-field-group">
      <strong>{copy.fieldBehavior}</strong>
      <p className="muted">{getInputHelp(question.type, language)}</p>
    </div>
  );
}

function QuestionRulesEditor({
  question,
  branchTargets,
  onUpdate,
  readOnly,
  language,
}: {
  question: SurveyBuilderQuestion;
  branchTargets: SurveyBuilderQuestion[];
  onUpdate: (question: SurveyBuilderQuestion) => void;
  readOnly: boolean;
  language: "tr" | "en";
}) {
  const copy = getQuestionCardCopy(language);
  const branchQuestionChoices = useMemo(
    () =>
      branchTargets
        .filter((target) => target.id !== question.id)
        .map((target, targetIndex) => ({
          code: target.code?.trim(),
          label: buildBranchTargetLabel(target, targetIndex, language),
        }))
        .filter((target): target is { code: string; label: string } => Boolean(target.code)),
    [branchTargets, question.id, language],
  );
  const deriveFormFromQuestion = useCallback(() => {
    const parsed = parseQuestionRuleForm(question);
    const referenceQuestion = branchTargets.find((target) => target.code?.trim() === parsed.branchQuestionCode.trim());
    return parseQuestionRuleForm(question, referenceQuestion);
  }, [branchTargets, question]);
  const [form, setForm] = useState(deriveFormFromQuestion);
  const [isBranchConfigOpen, setIsBranchConfigOpen] = useState(() => deriveFormFromQuestion().branchMode !== "none");
  const previousQuestionIdRef = useRef(question.id);
  const previousSyncTokenRef = useRef("");
  const syncToken = `${question.id}|${question.code}|${question.settingsJson ?? ""}|${question.branchConditionJson ?? ""}`;

  useEffect(() => {
    if (previousSyncTokenRef.current === syncToken) {
      return;
    }

    const nextForm = deriveFormFromQuestion();
    setForm(nextForm);
    const questionChanged = previousQuestionIdRef.current !== question.id;
    if (questionChanged || nextForm.branchMode !== "none") {
      setIsBranchConfigOpen(nextForm.branchMode !== "none");
    }
    previousQuestionIdRef.current = question.id;
    previousSyncTokenRef.current = syncToken;
  }, [deriveFormFromQuestion, question.id, syncToken]);

  const selectedBranchTarget = branchTargets.find((target) => target.code?.trim() === form.branchQuestionCode.trim());
  const branchSummary = buildBranchSummary(form, language, selectedBranchTarget);
  const linkedQuestionLabel = selectedBranchTarget ? buildBranchTargetLabel(selectedBranchTarget, 0, language) : "";
  const isOpenEnded = question.type === "short_text" || question.type === "long_text";
  const hasBranchRule = form.branchMode !== "none";
  const hasGraphGrouping = Boolean(form.groupTitle.trim() || form.groupCode.trim() || form.rowLabel.trim());
  const canUseMatrix = (isChoiceQuestion(question.type) || isRatingQuestion(question.type)) && !isMatrixQuestion(question.type);
  const isMatrixLinkedQuestion = isMatrixRuleTarget(selectedBranchTarget);
  const selectedAnswerValues = new Set(splitReadableValues(form.branchSelectedOptionCodes).map(normalizeTextToken));

  function patch(patchState: Partial<ReturnType<typeof parseQuestionRuleForm>>) {
    const nextForm = { ...form, ...patchState };
    setForm(nextForm);
    const nextBranchTarget = branchTargets.find((target) => target.code?.trim() === nextForm.branchQuestionCode.trim());
    onUpdate(applyQuestionRuleForm(question, nextForm, nextBranchTarget));
  }

  function toggleAnswer(answerLabel: string) {
    const normalizedAnswerLabel = normalizeTextToken(answerLabel);
    const nextValues = splitReadableValues(form.branchSelectedOptionCodes).filter(
      (value) => normalizeTextToken(value) !== normalizedAnswerLabel,
    );
    if (!selectedAnswerValues.has(normalizedAnswerLabel)) {
      nextValues.push(answerLabel);
    }
    patch({ branchSelectedOptionCodes: nextValues.join(", ") });
  }

  return (
    <div className="builder-field-group question-rules-panel">
      <strong>{copy.flowSettings}</strong>
      <p className="muted">{copy.flowSettingsDescription}</p>

      <div className="builder-toggle-row">
        <div>
          <strong>{copy.linkToPreviousAnswer}</strong>
          <p>{copy.linkToPreviousAnswerDescription}</p>
        </div>
        <button
          type="button"
          className={["builder-toggle", isBranchConfigOpen ? "is-active" : ""].filter(Boolean).join(" ")}
          onClick={() => {
            if (isBranchConfigOpen) {
              setIsBranchConfigOpen(false);
              patch({
                branchMode: "none",
                branchQuestionCode: "",
                branchGroupCode: "",
                branchRowCode: "",
                branchSameRowCode: false,
                branchSelectedOptionCodes: "",
              });
              return;
            }

            setIsBranchConfigOpen(true);
            if (!hasBranchRule) {
              patch({ branchMode: "skipIf" });
            }
          }}
          aria-pressed={isBranchConfigOpen}
          disabled={readOnly}
        >
          <span />
        </button>
      </div>

      {isBranchConfigOpen ? (
        <>
          {linkedQuestionLabel ? (
            <div className="builder-relationship-banner">
              <strong>{copy.dependentQuestionBannerTitle}</strong>
              <p>
                {language === "tr"
                  ? `Bu soru, ${linkedQuestionLabel} sorusuna bağlı çalışır. İsterseniz aşağıdan bu ilişkiyi düzenleyebilirsiniz.`
                  : `This question runs as a follow-up to ${linkedQuestionLabel}. You can refine that relationship below if needed.`}
              </p>
            </div>
          ) : null}

          <div className="builder-rule-summary">
            <strong>{language === "tr" ? "Bu koşul nasıl çalışır?" : "How this rule works"}</strong>
            <p>
              {language === "tr"
                ? "Önce hangi soruya bakılacağını seçin, sonra bu sorunun hangi cevaplarda sorulacağını ya da atlanacağını belirleyin."
                : "Choose which previous question to check, then decide when this question should be asked or skipped."}
            </p>
          </div>

          <label className="builder-field">
            <span>{copy.whenShouldThisQuestionBeAsked}</span>
            <select
              value={form.branchMode}
              onChange={(event) => patch({ branchMode: event.target.value as BranchMode })}
              disabled={readOnly}
            >
              <option value="skipIf">{copy.skipInThisCase}</option>
              <option value="askIf">{copy.askOnlyInThisCase}</option>
            </select>
          </label>

          {branchSummary ? (
            <div className="builder-rule-summary">
              <strong>{copy.systemSummary}</strong>
              <p>{branchSummary}</p>
            </div>
          ) : null}

          <div className="question-rule-grid">
            <label className="builder-field">
              <span>{language === "tr" ? "Önce hangi soruya bakalım?" : "Which previous question should we check?"}</span>
              <select
                value={form.branchQuestionCode}
                onChange={(event) =>
                  patch(buildBranchTargetSelectionPatch(event.target.value, branchTargets))
                }
                disabled={readOnly || branchQuestionChoices.length === 0}
              >
                <option value="">
                  {branchQuestionChoices.length === 0
                    ? language === "tr"
                      ? "Önce üstte bir soru ekleyin"
                      : "Add a question above first"
                    : language === "tr"
                      ? "Bir önceki soru seçin"
                      : "Choose a previous question"}
                </option>
                {branchQuestionChoices.map((target) => (
                  <option key={target.code} value={target.code}>
                    {target.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isMatrixLinkedQuestion ? (
            <div className="builder-toggle-row">
              <div>
                <strong>{language === "tr" ? "Aynı kişi / aynı satır için uygula" : "Apply to the same person / row"}</strong>
                <p>
                  {language === "tr"
                    ? "Seçtiğiniz önceki soru bir tablo sorusunun parçasıysa, bu koşulu aynı kişi ya da aynı madde için uygulayabilirsiniz."
                    : "If the selected previous question belongs to a matrix question, apply this rule to the same person or item."}
                </p>
              </div>
              <button
                type="button"
                className={["builder-toggle", form.branchSameRowCode ? "is-active" : ""].filter(Boolean).join(" ")}
                onClick={() => patch({ branchSameRowCode: !form.branchSameRowCode, branchRowCode: "" })}
                aria-pressed={form.branchSameRowCode}
                disabled={readOnly}
              >
                <span />
              </button>
            </div>
          ) : null}

          {isMatrixLinkedQuestion && !form.branchSameRowCode ? (
            <label className="builder-field">
              <span>{language === "tr" ? "Belirli bir kişi / satır için mi?" : "Is this for a specific person / row?"}</span>
              <input
                value={form.branchRowCode}
                onChange={(event) => patch({ branchRowCode: event.target.value })}
                placeholder={language === "tr" ? "Örnek: levent_uysal" : "Example: levent_uysal"}
                disabled={readOnly}
              />
              <span className="builder-field-help">
                {language === "tr"
                  ? "Aynı satıra göre çalışmayacaksa, koşulu belirli bir kişi veya maddeye bağlamak için bu alanı kullanın."
                  : "Use this only if the rule should target a specific person or item instead of the same row."}
              </span>
            </label>
          ) : null}

          {selectedBranchTarget?.options?.length ? (
            <div className="builder-field-group builder-answer-picker">
              <strong>{language === "tr" ? "Hangi cevaplarda?" : "For which answers?"}</strong>
              <p className="muted">
                {language === "tr"
                  ? "Aşağıdan bir veya birden fazla cevap seçin."
                  : "Choose one or more answers below."}
              </p>
              <div className="builder-answer-chip-grid">
                {selectedBranchTarget.options.map((option) => {
                  const isSelected = selectedAnswerValues.has(normalizeTextToken(option.label));
                  return (
                    <button
                      key={`${selectedBranchTarget.id}-${option.id}`}
                      type="button"
                      className={["builder-answer-chip", isSelected ? "is-active" : ""].filter(Boolean).join(" ")}
                      onClick={() => toggleAnswer(option.label)}
                      disabled={readOnly}
                      aria-pressed={isSelected}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <label className="builder-field">
              <span>{copy.forWhichAnswers}</span>
              <textarea
                rows={2}
                value={form.branchSelectedOptionCodes}
                onChange={(event) => patch({ branchSelectedOptionCodes: event.target.value })}
                placeholder={copy.forWhichAnswersPlaceholder}
                disabled={readOnly}
              />
              <span className="builder-field-help">{copy.forWhichAnswersHelp}</span>
            </label>
          )}
        </>
      ) : null}

      {canUseMatrix ? (
        <>
          <div className="builder-toggle-row">
            <div>
              <strong>{copy.useAsMatrixRow}</strong>
              <p>{copy.useAsMatrixRowDescription}</p>
            </div>
            <button
              type="button"
              className={["builder-toggle", hasGraphGrouping ? "is-active" : ""].filter(Boolean).join(" ")}
              onClick={() =>
                patch(
                  hasGraphGrouping
                    ? { groupCode: "", groupTitle: "", rowLabel: "" }
                    : { groupCode: form.groupCode, groupTitle: form.groupTitle || question.title, rowLabel: form.rowLabel || question.title },
                )
              }
              aria-pressed={hasGraphGrouping}
              disabled={readOnly}
            >
              <span />
            </button>
          </div>

          {hasGraphGrouping ? (
            <div className="builder-field-group">
              <div className="builder-rule-summary">
                <strong>{copy.matrixLogic}</strong>
                <p>{copy.matrixLogicDescription}</p>
              </div>

              <label className="builder-field">
                <span>{copy.sharedChartTitle}</span>
                <input
                  value={form.groupTitle}
                  onChange={(event) => patch({ groupTitle: event.target.value })}
                  placeholder={copy.sharedChartTitlePlaceholder}
                  disabled={readOnly}
                />
              </label>

              <label className="builder-field">
                <span>{copy.rowName}</span>
                <input
                  value={form.rowLabel}
                  onChange={(event) => patch({ rowLabel: event.target.value })}
                  placeholder={copy.rowNamePlaceholder}
                  disabled={readOnly}
                />
              </label>
            </div>
          ) : null}
        </>
      ) : null}

      {isOpenEnded ? (
        <div className="builder-field-group">
          <strong>{copy.openAnswerAnalysis}</strong>
          <p className="muted">{copy.openAnswerAnalysisDescription}</p>
        </div>
      ) : null}

      <div className="builder-field-group">
        <strong>{copy.specialAnswerDetection}</strong>
        <p className="muted">{copy.specialAnswerDetectionDescription}</p>
      </div>
    </div>
  );
}

function buildBranchTargetLabel(question: SurveyBuilderQuestion, index: number, language: "tr" | "en"): string {
  const baseCode = question.code?.trim() || (language === "tr" ? `Soru ${index + 1}` : `Question ${index + 1}`);
  const baseTitle = question.title?.trim();
  return baseTitle ? `${baseCode} - ${baseTitle}` : baseCode;
}

function buildBranchSummary(
  form: ReturnType<typeof parseQuestionRuleForm>,
  language: "tr" | "en",
  referenceQuestion?: SurveyBuilderQuestion,
): string | null {
  if (form.branchMode === "none") {
    return null;
  }

  const questionLabel = referenceQuestion?.title?.trim() || referenceQuestion?.code?.trim() || form.branchQuestionCode.trim();

  if (language === "en") {
    const source = questionLabel
      ? `when checking ${questionLabel}`
      : form.branchGroupCode.trim()
        ? `in group ${form.branchGroupCode.trim()}`
        : "in the linked previous question";
    const rowText = form.branchSameRowCode
      ? "for the same person or row"
      : form.branchRowCode.trim()
        ? `for row ${form.branchRowCode.trim()}`
        : "";
    const answers = splitReadableValues(form.branchSelectedOptionCodes);
    const answerText = answers.length > 0
      ? `if "${answers.join('", "')}" is selected`
      : "if the related condition is met";

    return form.branchMode === "skipIf"
      ? `This question is skipped ${source}${rowText ? ` ${rowText}` : ""} ${answerText}.`
      : `This question is asked ${source}${rowText ? ` ${rowText}` : ""} ${answerText}.`;
  }

  const source = questionLabel
    ? `${questionLabel} sorusunda`
    : form.branchGroupCode.trim()
      ? `${form.branchGroupCode.trim()} grubunda`
      : "bağlı önceki soruda";
  const rowText = form.branchSameRowCode
    ? "aynı kişi ya da satır için"
    : form.branchRowCode.trim()
      ? `${form.branchRowCode.trim()} satırı için`
      : "";
  const answers = splitReadableValues(form.branchSelectedOptionCodes);
  const answerText = answers.length > 0
    ? `"${answers.join('", "')}" cevabı verilirse`
    : "ilgili koşul sağlanırsa";

  return form.branchMode === "skipIf"
    ? `Bu soru, ${source}${rowText ? ` ${rowText}` : ""} ${answerText} sorulmaz.`
    : `Bu soru, ${source}${rowText ? ` ${rowText}` : ""} ${answerText} sorulur.`;
}

function splitReadableValues(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeTextToken(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function isMatrixRuleTarget(question?: SurveyBuilderQuestion): boolean {
  if (question && isMatrixQuestion(question.type)) {
    return true;
  }
  if (!question?.settingsJson) {
    return false;
  }

  try {
    const settings = JSON.parse(question.settingsJson) as Record<string, unknown>;
    return Boolean(settings.groupCode || settings.rowCode || settings.matrixType);
  } catch {
    return false;
  }
}

function buildBranchTargetSelectionPatch(
  targetCode: string,
  branchTargets: SurveyBuilderQuestion[],
): Partial<ReturnType<typeof parseQuestionRuleForm>> {
  const selectedTarget = branchTargets.find((target) => target.code?.trim() === targetCode.trim());
  const isMatrixTarget = isMatrixQuestion(selectedTarget?.type ?? "short_text") || isMatrixRuleTarget(selectedTarget);
  return {
    branchQuestionCode: targetCode,
    branchGroupCode: getMatrixGroupCode(selectedTarget) ?? "",
    branchSameRowCode: isMatrixTarget,
    branchRowCode: "",
    branchSelectedOptionCodes: "",
  };
}

function getMatrixGroupCode(question?: SurveyBuilderQuestion): string | null {
  if (!question?.settingsJson) {
    return isMatrixQuestion(question?.type ?? "short_text") && question?.code?.trim()
      ? question.code.trim()
      : null;
  }

  try {
    const settings = JSON.parse(question.settingsJson) as Record<string, unknown>;
    if (typeof settings.groupCode === "string" && settings.groupCode.trim()) {
      return settings.groupCode.trim();
    }
    if ((typeof settings.matrixType === "string" || isMatrixQuestion(question.type)) && question.code?.trim()) {
      return question.code.trim();
    }
    return null;
  } catch {
    return isMatrixQuestion(question.type) && question.code?.trim() ? question.code.trim() : null;
  }
}

function getInputHelp(type: SurveyQuestionType, language: "tr" | "en") {
  switch (type) {
    case "long_text":
      return language === "tr"
        ? "Daha uzun yorumlar için geniş bir metin alanı kullanılır."
        : "A larger text area is used for longer comments.";
    case "short_text":
      return language === "tr"
        ? "Tek satırlık hızlı yanıtlar için kullanılır."
        : "Used for quick single-line answers.";
    default:
      return language === "tr"
        ? "Bu alan tipi için ek ayarlar sonraki sürümlerde genişletilebilir."
        : "Additional settings for this field type can be expanded in later versions.";
  }
}

function renderQuestionPreview(
  question: SurveyBuilderQuestion,
  onUpdate: (question: SurveyBuilderQuestion) => void,
  readOnly: boolean,
  language: "tr" | "en",
) {
  if (isChoiceQuestion(question.type)) {
    if (isDropdownQuestion(question.type)) {
      return (
        <div className="choice-preview-stack">
          <div className="builder-select-mock">
            <span>{language === "tr" ? "Bir seçenek seçin" : "Select an option"}</span>
            <span aria-hidden="true">v</span>
          </div>
          <ChoiceOptionsEditor
            type={question.type}
            options={question.options ?? []}
            onChange={(options) => onUpdate({ ...question, options })}
            disabled={readOnly}
          />
        </div>
      );
    }

    return (
      <ChoiceOptionsEditor
        type={question.type}
        options={question.options ?? []}
        onChange={(options) => onUpdate({ ...question, options })}
        disabled={readOnly}
      />
    );
  }

  if (isMatrixQuestion(question.type)) {
    return (
      <MatrixQuestionEditor
        type={question.type}
        rows={question.matrixRows ?? []}
        columns={question.options ?? []}
        onRowsChange={(matrixRows) => onUpdate({ ...question, matrixRows })}
        onColumnsChange={(options) => onUpdate({ ...question, options })}
        disabled={readOnly}
      />
    );
  }

  if (isRatingQuestion(question.type)) {
    return (
      <div className="choice-pill-row">
        {getRatingRange(question.type).map((value) => (
          <span key={value} className="choice-pill">
            {value}
          </span>
        ))}
      </div>
    );
  }

  if (question.type === "date") {
    return <div className="builder-input-mock">GG / AA / YYYY</div>;
  }

  if (question.type === "full_name") {
    return (
      <div className="name-grid-preview">
        <div className="builder-input-mock">{language === "tr" ? "Ad" : "First name"}</div>
        <div className="builder-input-mock">{language === "tr" ? "Soyad" : "Last name"}</div>
      </div>
    );
  }

  if (question.type === "phone") {
    return <div className="builder-input-mock">+90 5XX XXX XX XX</div>;
  }

  if (question.type === "number") {
    return <div className="builder-input-mock">0</div>;
  }

  return (
    <div className="builder-input-mock">
      {question.type === "long_text"
        ? language === "tr"
          ? "Uzun yanıt alanı"
          : "Long answer area"
        : language === "tr"
          ? "Yanıtınızı yazın"
          : "Write your answer"}
    </div>
  );
}

function getQuestionCardCopy(language: "tr" | "en") {
  if (language === "en") {
    return {
      required: "Required",
      questionTitle: "Question title",
      questionTitlePlaceholder: "Write the question in the operation language",
      helperText: "Helper text",
      helperTextPlaceholder: "Add short guidance or context if needed",
      requiredQuestion: "Required question",
      requiredQuestionDescription: "Do not let this step be skipped without an answer.",
      moveUp: "Move up",
      moveDown: "Move down",
      delete: "Delete",
      addQuestionBelow: "Add question below",
      addDependentQuestion: "Add follow-up question",
      addDependentGrid: "Add follow-up grid",
      matrixBehavior: "Grid behavior",
      matrixBehaviorDescription: "This question is built as a single grid with rows and either shared answer options or a shared rating scale.",
      dateBehavior: "Date behavior",
      dateBehaviorDescription: "This question is shown as a date picker.",
      structuredField: "Structured field",
      structuredFieldDescription: "The preview shows separate first name and last name fields.",
      phoneFormat: "Phone format",
      phoneFormatDescription: "The participant sees a phone-friendly input field.",
      numericInput: "Numeric input",
      numericInputDescription: "This field only accepts numeric values.",
      selectionBehavior: "Selection behavior",
      selectionBehaviorDescription: "This question uses fixed Yes and No options.",
      dropdownBehavior: "Dropdown behavior",
      dropdownBehaviorDescription: "It takes one answer and appears as a dropdown in the preview.",
      fieldBehavior: "Field behavior",
      flowSettings: "Flow settings",
      flowSettingsDescription: "By default this question is asked to everyone. You can change that behavior below if needed.",
      linkToPreviousAnswer: "Link this question to a previous answer",
      linkToPreviousAnswerDescription: "Turn this on if the question should only be asked after certain previous answers.",
      whenShouldThisQuestionBeAsked: "When should this question be asked?",
      skipInThisCase: "Skip in this case",
      askOnlyInThisCase: "Ask only in this case",
      systemSummary: "System summary",
      dependsOnWhichQuestion: "Which previous question does it depend on?",
      noSpecificQuestionSelected: "No specific question selected",
      applyToSameRow: "Apply to the same person / row",
      applyToSameRowDescription: "In grid follow-up questions, use the same person or item as the previous row.",
      forWhichRow: "For which person / item?",
      forWhichRowPlaceholder: "Use this to target a fixed row instead of the same row",
      forWhichAnswers: "For which answers?",
      forWhichAnswersPlaceholder: "Example: I do not know, I have never heard of them",
      forWhichAnswersHelp: "It is enough to type the option label. The system will try to map it to the correct answer code when saving.",
      useAsMatrixRow: "Use this as a row in a grid question",
      useAsMatrixRowDescription: "Turn this on to report repeated questions with the same options in a single chart.",
      matrixLogic: "Grid logic",
      matrixLogicDescription: "This question is reported as one row of a shared chart with similar questions.",
      sharedChartTitle: "Shared question / chart title",
      sharedChartTitlePlaceholder: "Example: How well do you know the following candidates?",
      rowName: "Name of this row",
      rowNamePlaceholder: "Example: Levent Uysal",
      openAnswerAnalysis: "Open answer analysis",
      openAnswerAnalysisDescription: "Open-ended answers are automatically grouped by the system and shown alongside the raw answer list in analytics.",
      specialAnswerDetection: "Special answer detection",
      specialAnswerDetectionDescription: "Expressions such as I don't know, pass, or I do not want to answer are detected automatically by the system.",
      dependentQuestionBannerTitle: "Linked follow-up",
      questionNumber: (value: number) => `Question ${value}`,
    };
  }

  return {
    required: "Zorunlu",
    questionTitle: "Soru başlığı",
    questionTitlePlaceholder: "Soruyu operasyon dilinde yazın",
    helperText: "Yardımcı metin",
    helperTextPlaceholder: "Gerekiyorsa kısa yönlendirme veya bağlam ekleyin",
    requiredQuestion: "Zorunlu soru",
    requiredQuestionDescription: "Bu adım yanıtsız geçilemesin.",
    moveUp: "Yukarı al",
    moveDown: "Aşağı al",
    delete: "Sil",
    addQuestionBelow: "Alta soru ekle",
    addDependentQuestion: "Bağlı soru ekle",
    addDependentGrid: "Bağlı takip tablosu ekle",
    matrixBehavior: "Tablo davranışı",
    matrixBehaviorDescription: "Bu soru satırlar ve ortak cevap seçenekleri ya da ortak bir derecelendirme ölçeği ile tek bir tablo gibi kurulur.",
    dateBehavior: "Tarih davranışı",
    dateBehaviorDescription: "Bu soru tarih seçici olarak görüntülenir.",
    structuredField: "Yapısal alan",
    structuredFieldDescription: "Ön izlemede ad ve soyad ayrı alanlar olarak sunulur.",
    phoneFormat: "Telefon biçimi",
    phoneFormatDescription: "Katılımcıya telefon girişine uygun bir alan gösterilir.",
    numericInput: "Sayısal giriş",
    numericInputDescription: "Bu alan yalnızca sayısal değer kabul eder.",
    selectionBehavior: "Seçim davranışı",
    selectionBehaviorDescription: "Sabit Evet ve Hayır seçenekleriyle ilerler.",
    dropdownBehavior: "Açılır menü davranışı",
    dropdownBehaviorDescription: "Tek seçim alır ve ön izlemede açılır liste olarak görünür.",
    fieldBehavior: "Alan davranışı",
    flowSettings: "Akış ayarları",
    flowSettingsDescription: "Bu soru varsayılan olarak herkese sorulur. Gerekirse aşağıda bu davranışı değiştirebilirsiniz.",
    linkToPreviousAnswer: "Bu soruyu önceki bir cevaba bağla",
    linkToPreviousAnswerDescription: "Örneğin bir soruyu sadece tanıdığı kişilere sormak istiyorsanız bunu açın.",
    whenShouldThisQuestionBeAsked: "Bu soru ne zaman sorulsun?",
    skipInThisCase: "Şu durumda atla",
    askOnlyInThisCase: "Sadece şu durumda sor",
    systemSummary: "Sistem özeti",
    dependsOnWhichQuestion: "Hangi önceki soruya bağlı?",
    noSpecificQuestionSelected: "Belirli bir soru seçmedim",
    applyToSameRow: "Aynı kişi / aynı satır için uygula",
    applyToSameRowDescription: "Matris takip sorularında önceki sorudaki aynı kişi ya da maddeye bakılsın.",
    forWhichRow: "Hangi kişi / madde için?",
    forWhichRowPlaceholder: "Aynı satır yerine sabit bir satır tanımlamak için",
    forWhichAnswers: "Hangi cevaplarda?",
    forWhichAnswersPlaceholder: "Örnek: Tanımıyorum, Hiç duymadım",
    forWhichAnswersHelp: "Seçenek adını yazmanız yeterli. Sistem kaydederken doğru cevap kodunu eşleştirmeye çalışır.",
    useAsMatrixRow: "Bunu bir matris sorusunun satırı olarak kullan",
    useAsMatrixRowDescription: "Aynı seçeneklerle tekrar eden soruları tek bir grafikte göstermek için bunu açın.",
    matrixLogic: "Matris mantığı",
    matrixLogicDescription: "Bu soru tek başına değil, benzer sorularla aynı grafikte bir satır olarak raporlanır.",
    sharedChartTitle: "Ortak soru / grafik başlığı",
    sharedChartTitlePlaceholder: "Örnek: Aşağıdaki adayları ne kadar tanıyorsunuz?",
    rowName: "Bu satırın adı",
    rowNamePlaceholder: "Örnek: Levent Uysal",
    openAnswerAnalysis: "Açık cevap analizi",
    openAnswerAnalysisDescription: "Açık uçlu cevaplar analiz ekranında sistem tarafından otomatik olarak gruplanır ve ham cevap listesiyle birlikte gösterilir.",
    specialAnswerDetection: "Özel yanıt algılama",
    specialAnswerDetectionDescription: "Bilmiyorum, pas geçiyorum veya cevap vermek istemiyorum gibi ifadeler sistem tarafından otomatik olarak algılanır.",
    dependentQuestionBannerTitle: "Bağlı takip sorusu",
    questionNumber: (value: number) => `Soru ${value}`,
  };
}
