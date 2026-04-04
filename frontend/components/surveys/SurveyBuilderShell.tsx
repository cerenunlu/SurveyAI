"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { usePageHeaderOverride } from "@/components/layout/PageHeaderContext";
import { PageBackButton } from "@/components/navigation/PageBackButton";
import { EmptyBuilderState } from "@/components/surveys/EmptyBuilderState";
import { QuestionCard } from "@/components/surveys/QuestionCard";
import { SurveyBuilderToolbar } from "@/components/surveys/SurveyBuilderToolbar";
import { SurveyPreviewPanel } from "@/components/surveys/SurveyPreviewPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { AnalyticsIcon, EyeIcon, PlayIcon, PlusIcon, SurveyIcon } from "@/components/ui/Icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { saveSurveyBuilderSurvey, type BuilderSaveAction } from "@/lib/survey-builder-api";
import { createQuestion, isChoiceQuestion, questionTypeLabels } from "@/lib/survey-builder";
import type { SurveyBuilderQuestion, SurveyBuilderSurvey, SurveyQuestionType } from "@/lib/types";

type ReadinessRow = {
  key: string;
  title: string;
  detail: string;
  label: string;
  status: "Ready" | "Warning" | "Pending";
};

export function SurveyBuilderShell({
  initialSurvey,
  mode,
  showSummaryStrip = true,
  showToolbar = true,
  showTopRow = true,
  showPreviewPanel = true,
  showQuestionList = true,
  readOnly = false,
}: {
  initialSurvey: SurveyBuilderSurvey;
  mode: "create" | "edit";
  showSummaryStrip?: boolean;
  showToolbar?: boolean;
  showTopRow?: boolean;
  showPreviewPanel?: boolean;
  showQuestionList?: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [survey, setSurvey] = useState<SurveyBuilderSurvey>(initialSurvey);
  const [activeAction, setActiveAction] = useState<BuilderSaveAction | null>(null);
  const [isCreatingDraftCopy, setIsCreatingDraftCopy] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error" | null>(null);
  const isPublished = survey.status === "Live";
  const isReadOnly = readOnly || isPublished;

  const questionStats = useMemo(() => buildQuestionStats(survey), [survey]);

  const readiness = useMemo(() => buildReadinessRows(survey, questionStats, isPublished), [isPublished, questionStats, survey]);

  function updateQuestion(nextQuestion: SurveyBuilderQuestion) {
    if (isReadOnly) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    setSurvey((current) => ({
      ...current,
      questionCount: current.questions.length,
      questions: current.questions.map((question) => (question.id === nextQuestion.id ? nextQuestion : question)),
    }));
  }

  function addQuestion(type: SurveyQuestionType = "short_text") {
    if (isReadOnly) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    setSurvey((current) => {
      const nextQuestion = createQuestion(type, current.questions.length + 1);
      const nextQuestions = [...current.questions, nextQuestion];

      return {
        ...current,
        questionCount: nextQuestions.length,
        questions: nextQuestions,
      };
    });
  }

  function addQuestionAfter(afterId: string, type: SurveyQuestionType = "short_text") {
    if (isReadOnly) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    setSurvey((current) => {
      const index = current.questions.findIndex((question) => question.id === afterId);
      if (index < 0) {
        return current;
      }

      const nextQuestion = createQuestion(type, current.questions.length + 1);
      const nextQuestions = [...current.questions];
      nextQuestions.splice(index + 1, 0, nextQuestion);

      return {
        ...current,
        questionCount: nextQuestions.length,
        questions: nextQuestions,
      };
    });
  }

  function reorderQuestion(id: string, direction: -1 | 1) {
    if (isReadOnly) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    setSurvey((current) => {
      const index = current.questions.findIndex((question) => question.id === id);
      const target = index + direction;

      if (index < 0 || target < 0 || target >= current.questions.length) {
        return current;
      }

      const nextQuestions = [...current.questions];
      const [item] = nextQuestions.splice(index, 1);
      nextQuestions.splice(target, 0, item);

      return {
        ...current,
        questionCount: nextQuestions.length,
        questions: nextQuestions,
      };
    });
  }

  function removeQuestion(id: string) {
    if (isReadOnly) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    setSurvey((current) => {
      if (current.questions.length <= 1) {
        return current;
      }

      const nextQuestions = current.questions.filter((question) => question.id !== id);

      return {
        ...current,
        questionCount: nextQuestions.length,
        questions: nextQuestions,
      };
    });
  }

  async function handlePersist(action: BuilderSaveAction) {
    if (isReadOnly) {
      return;
    }

    setActiveAction(action);
    setFeedbackMessage(null);
    setFeedbackTone(null);

    try {
      const result = await saveSurveyBuilderSurvey(survey, action);
      setSurvey(result.survey);
      setFeedbackMessage(resolvePersistMessage(action, result.survey.status));
      setFeedbackTone("success");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Kaydetme sirasinda bir hata olustu.");
      setFeedbackTone("error");
    } finally {
      setActiveAction(null);
    }
  }

  const handleCreateDraftCopy = useCallback(async () => {
    try {
      setIsCreatingDraftCopy(true);
      setFeedbackMessage(null);
      setFeedbackTone(null);

      const copiedSurvey = buildDraftCopySurvey(survey);
      const result = await saveSurveyBuilderSurvey(copiedSurvey, "draft");

      router.push(`/surveys/${result.survey.id}`);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Taslak kopya olusturulamadi.");
      setFeedbackTone("error");
    } finally {
      setIsCreatingDraftCopy(false);
    }
  }, [router, survey]);

  const headerAction = useMemo(
    () => mode === "edit" && isPublished && !readOnly ? (
      <div className="survey-header-action-cluster">
      <div className="survey-header-action-buttons">
        <Link href="/surveys/new" className="button-secondary compact-button survey-header-button is-new">
          <PlusIcon className="nav-icon" />
          Yeni anket
        </Link>
        <button
          type="button"
          className="button-secondary compact-button survey-header-button is-copy"
          onClick={() => void handleCreateDraftCopy()}
          disabled={isCreatingDraftCopy}
        >
          <SurveyIcon className="nav-icon" />
          {isCreatingDraftCopy ? "Kopya hazirlaniyor..." : "Taslak Kopya Olustur"}
        </button>
      </div>
        <div className="survey-header-notice" role="note" aria-label="Yayin uyarisi">
          <SurveyIcon className="nav-icon" />
          <div>
            <strong>Yayinlandi</strong>
            <span>Yayinlanmis anketlerde degisiklik yapilamaz. Devam etmek icin bu anketin taslak bir kopyasi uzerinden ilerleyebilirsiniz.</span>
          </div>
        </div>
      </div>
    ) : null,
    [handleCreateDraftCopy, isCreatingDraftCopy, isPublished, mode, readOnly],
  );

  usePageHeaderOverride({
    title: mode === "create" ? "Yeni Anket Tasarimi" : survey.name.trim() || "Anket Tasarimi",
    subtitle:
      mode === "create"
        ? "Sorulari, gorusme metinlerini ve yayin hazirligini tek calisma alaninda yonetin."
        : survey.summary.trim()
          ? survey.summary.trim()
          : "Anket yapisini ve operasyon baglamini ayni akista guncelleyin.",
    action: showTopRow ? headerAction : null,
  });

  return (
    <div className="page-container survey-builder-page ops-builder-shell">
      {showTopRow ? (
        <div className="ops-create-top-row ops-builder-top-row">
          <PageBackButton />
          <StatusBadge status={readiness.status} label={readiness.label} />
        </div>
      ) : null}

      {showSummaryStrip ? (
        <section className="ops-summary-strip ops-builder-summary-strip">
          <StatCard
            label="Anket durumu"
            value={resolveStatusLabel(survey.status)}
            detail={mode === "create" ? "Yeni tasarim akisi taslak olarak baslar." : "Mevcut anketin yasam durumu."}
            icon={<SurveyIcon className="nav-icon" />}
          />
          <StatCard
            label="Soru mimarisi"
            value={questionStats.total}
            detail={
              questionStats.total > 0
                ? `${questionStats.distinctTypes} farkli tip, ${questionStats.required} zorunlu soru`
                : "Ilk soruyu ekleyerek akis mimarisini baslatin."
            }
            icon={<AnalyticsIcon className="nav-icon" />}
          />
          <StatCard
            label="Dil ve tekrar"
            value={`${(survey.languageCode || "tr").toUpperCase()} / ${survey.maxRetryPerQuestion}`}
            detail="Soru basi tekrar sayisi sesli gorusmedeki ikinci deneme sayisini belirler."
            icon={<PlayIcon className="nav-icon" />}
          />
          <StatCard
            label="Onizleme hazirligi"
            value={survey.introPrompt.trim() && survey.closingPrompt.trim() ? "Hazir" : "Eksik"}
            detail="Acilis ve kapanis mesajlari canli gorusme ritmini belirler."
            icon={<EyeIcon className="nav-icon" />}
          />
        </section>
      ) : null}

      <div className="ops-two-column-layout ops-builder-workspace">
        <div className="ops-builder-main">
          <div className="ops-builder-question-area">
            {showToolbar ? (
              <SurveyBuilderToolbar
                survey={survey}
                mode={mode}
                onAddQuestion={() => addQuestion()}
                onPersist={handlePersist}
                activeAction={activeAction}
                feedbackMessage={feedbackMessage}
                feedbackTone={feedbackTone}
                readOnly={isReadOnly}
              />
            ) : null}

            {showQuestionList ? (
              <section className="builder-canvas-shell panel-card ops-builder-canvas-shell">
                <div className="builder-canvas-header ops-builder-canvas-head">
                  {!isReadOnly ? (
                    <div className="builder-quick-add">
                      {([
                        "short_text",
                        "single_choice",
                        "multi_choice",
                        "dropdown",
                        "rating_1_5",
                        "date",
                      ] as SurveyQuestionType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          className="builder-quick-chip"
                          onClick={() => addQuestion(type)}
                          disabled={activeAction !== null}
                        >
                          <PlusIcon className="nav-icon" />
                          {questionTypeLabels[type]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {survey.questions.length > 0 ? (
                  <div className="builder-question-list">
                    {survey.questions.map((question, index) => (
                      <QuestionCard
                        key={question.id}
                        index={index}
                        question={question}
                        isFirst={index === 0}
                        isLast={index === survey.questions.length - 1}
                        canRemove={survey.questions.length > 1}
                        readOnly={isReadOnly}
                        onUpdate={updateQuestion}
                        onMoveUp={() => reorderQuestion(question.id, -1)}
                        onMoveDown={() => reorderQuestion(question.id, 1)}
                        onRemove={() => removeQuestion(question.id)}
                        onAddBelow={() => addQuestionAfter(question.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyBuilderState onAdd={() => addQuestion()} disabled={isReadOnly || activeAction !== null} />
                )}

                {!isReadOnly ? (
                  <div className="builder-bottom-actions ops-builder-bottom-actions">
                    <button
                      type="button"
                      className="button-secondary compact-button"
                      onClick={() => addQuestion()}
                      disabled={activeAction !== null}
                    >
                      <PlusIcon className="nav-icon" />
                      Yeni soru ekle
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </div>

        <aside className="ops-builder-side">
          {showPreviewPanel ? <SurveyPreviewPanel survey={survey} /> : null}

          <SectionCard
            eyebrow="Kontrol"
            title="Yayin Hazirligi"
            description="Sistem, anketin sahaya cikmadan once dikkat edilmesi gereken noktalarini burada toplar."
            action={<StatusBadge status={readiness.status} label={readiness.label} />}
          >
            <div className="ops-builder-governance-list">
              {readiness.rows.map((row) => (
                <div key={row.key} className="ops-builder-governance-row">
                  <div className="ops-builder-governance-copy">
                    <strong>{row.title}</strong>
                    <span>{row.detail}</span>
                  </div>
                  <StatusBadge status={row.status} label={row.label} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Ozet"
            title="Anket Ozeti"
            description="Bu panel, operasyon ekiplerinin sahaya neyin cikacagini tek bakista kontrol etmesini saglar."
          >
            <div className="ops-builder-summary-grid">
              <div className="ops-builder-summary-item">
                <span>Son guncelleme</span>
                <strong>{survey.updatedAt}</strong>
              </div>
              <div className="ops-builder-summary-item">
                <span>Zorunlu soru</span>
                <strong>{questionStats.required}</strong>
              </div>
              <div className="ops-builder-summary-item">
                <span>Secimli soru</span>
                <strong>{questionStats.choice}</strong>
              </div>
              <div className="ops-builder-summary-item">
                <span>Olcek sorusu</span>
                <strong>{questionStats.rating}</strong>
              </div>
            </div>

            <div className="ops-builder-notes">
              <div className="ops-builder-note-card">
                <strong>Kullanim baglami</strong>
                <p>{survey.summary.trim() || "Bu anket icin operasyon baglami henuz yazilmadi."}</p>
              </div>
              <div className="ops-builder-note-card">
                <strong>Akis kapsami</strong>
                <p>
                  {survey.questions.length > 0
                    ? `Acilis, ${survey.questions.length} soru ve kapanisla ilerleyen bir gorusme akisi tanimli.`
                    : "Acilis ve kapanis mesajlarini ekledikten sonra ilk soru ile akisi baslatabilirsiniz."}
                </p>
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function buildReadinessRows(survey: SurveyBuilderSurvey, questionStats: ReturnType<typeof buildQuestionStats>, isPublished: boolean) {
  const rows: ReadinessRow[] = [
    {
      key: "brief",
      title: "Anket brifi",
      detail: survey.name.trim() && survey.summary.trim()
        ? "Baslik ve kullanim ozeti operasyon ekipleri icin okunabilir durumda."
        : "Baslik ve ozet alani eksiksiz doldurulursa anket yeniden kullanimda daha net olur.",
      label: survey.name.trim() && survey.summary.trim() ? "Hazir" : "Eksik",
      status: survey.name.trim() && survey.summary.trim() ? "Ready" : "Warning",
    },
    {
      key: "scripts",
      title: "Acilis ve kapanis metinleri",
      detail: survey.introPrompt.trim() && survey.closingPrompt.trim()
        ? "Gorusme ritmi icin acilis ve kapanis metinleri tanimli."
        : "En az bir akis metni eksik; gorusmenin tonu sahada net olmayabilir.",
      label: survey.introPrompt.trim() && survey.closingPrompt.trim() ? "Hazir" : "Eksik",
      status: survey.introPrompt.trim() && survey.closingPrompt.trim() ? "Ready" : "Warning",
    },
    {
      key: "questions",
      title: "Soru butunlugu",
      detail:
        questionStats.total > 0 && questionStats.blankTitles === 0
          ? `${questionStats.total} soru basliklandirildi ve akis okunabilir durumda.`
          : "En az bir soru ekleyin ve her soruya operasyonel bir baslik verin.",
      label: questionStats.total > 0 && questionStats.blankTitles === 0 ? "Hazir" : "Bekliyor",
      status: questionStats.total > 0 && questionStats.blankTitles === 0 ? "Ready" : "Pending",
    },
    {
      key: "options",
      title: "Secenek tutarliligi",
      detail:
        questionStats.optionGaps === 0
          ? "Secimli soru tiplerinde bos veya eksik secenek gorunmuyor."
          : `${questionStats.optionGaps} secimli soruda secenek kontrolu gerekiyor.`,
      label: questionStats.optionGaps === 0 ? "Hazir" : "Riskli",
      status: questionStats.optionGaps === 0 ? "Ready" : "Warning",
    },
  ];

  const readyCount = rows.filter((row) => row.status === "Ready").length;
  const status = isPublished ? "Active" : readyCount >= 4 ? "Ready" : readyCount >= 2 ? "Warning" : "Pending";
  const label = isPublished ? "Yayinda" : readyCount >= 4 ? "Hazir" : readyCount >= 2 ? "Kismen hazir" : "Hazirlikta";

  return {
    rows,
    status,
    label,
  };
}

function buildQuestionStats(survey: SurveyBuilderSurvey) {
  const required = survey.questions.filter((question) => question.required).length;
  const choice = survey.questions.filter((question) => isChoiceQuestion(question.type)).length;
  const rating = survey.questions.filter((question) => question.type === "rating_1_5" || question.type === "rating_1_10").length;
  const blankTitles = survey.questions.filter((question) => !question.title.trim()).length;
  const optionGaps = survey.questions.filter((question) => {
    if (!isChoiceQuestion(question.type)) {
      return false;
    }

    if ((question.options?.length ?? 0) === 0) {
      return true;
    }

    return (question.options ?? []).some((option) => !option.label.trim());
  }).length;

  return {
    total: survey.questions.length,
    required,
    choice,
    rating,
    blankTitles,
    optionGaps,
    distinctTypes: new Set(survey.questions.map((question) => question.type)).size,
  };
}

function resolveStatusLabel(status: SurveyBuilderSurvey["status"]) {
  switch (status) {
    case "Live":
      return "Yayinda";
    case "Archived":
      return "Arsivde";
    case "Draft":
    default:
      return "Taslak";
  }
}

function resolvePersistMessage(action: BuilderSaveAction, status: SurveyBuilderSurvey["status"]) {
  if (action === "publish" || status === "Live") {
    return "Anket yayinlandi.";
  }

  if (action === "draft") {
    return "Taslak kaydedildi.";
  }

  return "Degisiklikler kaydedildi.";
}

function buildDraftCopySurvey(survey: SurveyBuilderSurvey): SurveyBuilderSurvey {
  return {
    ...survey,
    id: `draft-copy-${globalThis.crypto.randomUUID()}`,
    name: `${survey.name.trim() || "Anket"} - Taslak Kopya`,
    status: "Draft",
    createdAt: "Henuz olusmadi",
    publishedAt: null,
    updatedAt: "Bugun",
    questions: survey.questions.map((question, questionIndex) => ({
      ...question,
      id: `draft-question-${globalThis.crypto.randomUUID()}`,
      options: question.options?.map((option, optionIndex) => ({
        ...option,
        id: `draft-option-${questionIndex + 1}-${optionIndex + 1}-${globalThis.crypto.randomUUID()}`,
      })),
    })),
    questionCount: survey.questions.length,
  };
}
