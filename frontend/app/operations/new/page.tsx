"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createOperation } from "@/lib/operations";
import { fetchSurveyBuilderSurvey } from "@/lib/survey-builder-api";
import { fetchCompanySurveys } from "@/lib/surveys";
import type { Survey, SurveyBuilderSurvey } from "@/lib/types";

type ContactMode = "later" | "now";

type FormErrors = {
  name?: string;
  surveyId?: string;
};

export default function NewOperationPage() {
  const router = useRouter();
  const [operationName, setOperationName] = useState("");
  const [operationNote, setOperationNote] = useState("");
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [contactMode, setContactMode] = useState<ContactMode>("later");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyDetail, setSelectedSurveyDetail] = useState<SurveyBuilderSurvey | null>(null);
  const [isLoadingSurveys, setIsLoadingSurveys] = useState(true);
  const [isLoadingSurveyDetail, setIsLoadingSurveyDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<"draft" | "create" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const publishedSurveys = useMemo(
    () => surveys.filter((survey) => survey.status === "Live"),
    [surveys],
  );

  const selectedSurvey = useMemo(
    () => publishedSurveys.find((survey) => survey.id === selectedSurveyId) ?? null,
    [publishedSurveys, selectedSurveyId],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadSurveys() {
      try {
        setIsLoadingSurveys(true);
        setLoadError(null);
        const nextSurveys = await fetchCompanySurveys(undefined, { signal: controller.signal });
        setSurveys(nextSurveys);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Anketler yuklenemedi.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSurveys(false);
        }
      }
    }

    void loadSurveys();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedSurveyId) {
      setSelectedSurveyDetail(null);
      return;
    }

    const controller = new AbortController();

    async function loadSurveyDetail() {
      try {
        setIsLoadingSurveyDetail(true);
        const detail = await fetchSurveyBuilderSurvey(selectedSurveyId, undefined, { signal: controller.signal });
        setSelectedSurveyDetail(detail);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSelectedSurveyDetail(null);
        setSubmitError(error instanceof Error ? error.message : "Secilen anket ozeti yuklenemedi.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSurveyDetail(false);
        }
      }
    }

    void loadSurveyDetail();

    return () => controller.abort();
  }, [selectedSurveyId]);

  async function submitOperation(intent: "draft" | "create") {
    const nextErrors: FormErrors = {};
    const trimmedName = operationName.trim();

    if (!trimmedName) {
      nextErrors.name = "Operasyon adi gerekli.";
    }

    if (!selectedSurveyId) {
      nextErrors.surveyId = "Yayinlanmis bir anket secin.";
    }

    setErrors(nextErrors);
    setSubmitError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitIntent(intent);

      const createdOperation = await createOperation({
        name: trimmedName,
        surveyId: selectedSurveyId,
        scheduledAt: null,
        createdByUserId: null,
      });

      router.push(`/operations/${createdOperation.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Operasyon olusturulamadi.");
    } finally {
      setIsSubmitting(false);
      setSubmitIntent(null);
    }
  }

  const surveyQuestionCount = selectedSurveyDetail
    ? `${selectedSurveyDetail.questions.length} soru`
    : isLoadingSurveyDetail && selectedSurveyId
      ? "Soru bilgisi yukleniyor"
      : "Soru ozeti hazir degil";

  const surveyLanguage = selectedSurveyDetail?.languageCode?.toUpperCase() ?? selectedSurvey?.audience ?? "-";
  const surveyStatus = selectedSurveyDetail?.status ?? selectedSurvey?.status ?? "Live";
  const personStatus = contactMode === "now" ? "Kisi yuklemesi bekleniyor" : "Henuz kisi yuklenmedi";
  const isSubmitDisabled = isSubmitting || isLoadingSurveys || publishedSurveys.length === 0;

  return (
    <PageContainer>
      <div className="operation-create-shell">
        <header className="operation-create-header panel-card">
          <div>
            <p className="builder-panel-kicker">Operation Setup</p>
            <h1>Yeni Operasyon</h1>
            <p>Yayinlanmis bir anket secin ve cagri sureci icin yeni bir operasyon hazirlayin.</p>
          </div>
        </header>

        <div className="operation-create-layout">
          <div className="operation-create-main">
            <section className="panel-card survey-form-card operation-create-card">
              <div className="survey-form-card-head operation-create-card-head">
                <div>
                  <p className="builder-panel-kicker">Operation Info</p>
                  <h2>Operasyon bilgileri</h2>
                  <p>Operasyonu ekip icinde kolay ayirt edilecek net bir adla olusturun.</p>
                </div>
              </div>

              <div className="survey-form-fields">
                <label className="builder-field">
                  <strong>Operasyon adi</strong>
                  <input
                    value={operationName}
                    onChange={(event) => {
                      setOperationName(event.target.value);
                      if (errors.name) {
                        setErrors((current) => ({ ...current, name: undefined }));
                      }
                    }}
                    placeholder="Orn. Mart 2026 memnuniyet arama akisi"
                    aria-invalid={Boolean(errors.name)}
                  />
                  <span>Kisa, operasyonel ve ekiplerin aninda taniyacagi bir isim kullanin.</span>
                  {errors.name ? <span className="field-error-message">{errors.name}</span> : null}
                </label>

                <label className="builder-field">
                  <strong>Aciklama / Not</strong>
                  <textarea
                    rows={4}
                    value={operationNote}
                    onChange={(event) => setOperationNote(event.target.value)}
                    placeholder="Operasyon kapsamı, segment notu veya ekip icin kisa baglam ekleyin."
                  />
                  <span>Bu alan MVP adiminda backend create istegine dahil edilmiyor; yalnizca hazirlik notu olarak sunuluyor.</span>
                </label>
              </div>
            </section>

            <section className="panel-card survey-form-card operation-create-card">
              <div className="survey-form-card-head operation-create-card-head">
                <div>
                  <p className="builder-panel-kicker">Published Survey</p>
                  <h2>Anket secimi</h2>
                  <p>Operasyonlar yalnizca yayinlanmis anketlerle baslatilabilir. Taslak anketler burada listelenmez.</p>
                </div>
              </div>

              <div className="survey-form-fields">
                {loadError ? (
                  <div className="operation-inline-message is-danger">
                    <strong>Anketler yuklenemedi</strong>
                    <span>{loadError}</span>
                  </div>
                ) : isLoadingSurveys ? (
                  <div className="operation-inline-message">
                    <strong>Yayinlanmis anketler yukleniyor</strong>
                    <span>Backend uzerinden operasyona uygun anketler getiriliyor.</span>
                  </div>
                ) : publishedSurveys.length === 0 ? (
                  <div className="operation-inline-message">
                    <strong>Kullanilabilir yayinlanmis anket yok</strong>
                    <span>Operasyon olusturmadan once en az bir anket yayinlamaniz gerekiyor.</span>
                  </div>
                ) : (
                  <label className="builder-field">
                    <strong>Yayinlanmis anket</strong>
                    <select
                      value={selectedSurveyId}
                      onChange={(event) => {
                        setSelectedSurveyId(event.target.value);
                        setSubmitError(null);
                        if (errors.surveyId) {
                          setErrors((current) => ({ ...current, surveyId: undefined }));
                        }
                      }}
                      aria-invalid={Boolean(errors.surveyId)}
                    >
                      <option value="">Anket secin</option>
                      {publishedSurveys.map((survey) => (
                        <option key={survey.id} value={survey.id}>
                          {survey.name}
                        </option>
                      ))}
                    </select>
                    <span>Liste sadece backend tarafinda `PUBLISHED` durumda olan anketleri gosterir.</span>
                    {errors.surveyId ? <span className="field-error-message">{errors.surveyId}</span> : null}
                  </label>
                )}

                {selectedSurvey ? (
                  <div className="operation-survey-summary">
                    <div className="operation-survey-summary-head">
                      <div>
                        <strong>{selectedSurvey.name}</strong>
                        <span>Operasyona baglanacak yayinlanmis anket</span>
                      </div>
                      <StatusBadge status={surveyStatus} />
                    </div>

                    <div className="operation-summary-metrics">
                      <div className="mini-metric">
                        <span>Soru sayisi</span>
                        <strong>{surveyQuestionCount}</strong>
                      </div>
                      <div className="mini-metric">
                        <span>Dil</span>
                        <strong>{surveyLanguage}</strong>
                      </div>
                      <div className="mini-metric">
                        <span>Durum</span>
                        <strong>{surveyStatus}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="panel-card survey-form-card operation-create-card">
              <div className="survey-form-card-head operation-create-card-head">
                <div>
                  <p className="builder-panel-kicker">Contact Readiness</p>
                  <h2>Kisi hazirligi</h2>
                  <p>Kisileri hemen yuklemek zorunda degilsiniz. Operasyon olustuktan sonra bu adimi tamamlayabilirsiniz.</p>
                </div>
              </div>

              <div className="survey-form-fields">
                <div className="operation-choice-grid" role="radiogroup" aria-label="Kisi hazirligi secimi">
                  <button
                    type="button"
                    className={contactMode === "later" ? "operation-choice-card is-active" : "operation-choice-card"}
                    onClick={() => setContactMode("later")}
                    aria-pressed={contactMode === "later"}
                  >
                    <strong>Kisileri daha sonra ekle</strong>
                    <span>Operasyonu once olusturun, kisi listesini sonraki adimda baglayin.</span>
                  </button>

                  <button
                    type="button"
                    className={contactMode === "now" ? "operation-choice-card is-active" : "operation-choice-card"}
                    onClick={() => setContactMode("now")}
                    aria-pressed={contactMode === "now"}
                  >
                    <strong>Kisileri simdi yukle</strong>
                    <span>Bu adimda sadece hazirlik bilgisi gosterilir; tam yukleme akisi sonraki iterasyonda gelecek.</span>
                  </button>
                </div>

                {contactMode === "now" ? (
                  <div className="operation-inline-message is-accent">
                    <strong>Kisi yukleme bu adimda hafif tutuldu</strong>
                    <span>Operasyon olusturulduktan sonra detay sayfasindan kisi yukleme ve dogrulama surecine devam edebilirsiniz.</span>
                  </div>
                ) : (
                  <div className="operation-inline-message">
                    <strong>Kisi listesi daha sonra eklenebilir</strong>
                    <span>Bu secim operasyonu taslak olarak hazirlar ve cagri oncesi kisi baglama esnekligi birakir.</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="operation-create-side">
            <section className="panel-card operation-summary-panel">
              <div className="section-header operation-summary-header">
                <div className="section-copy">
                  <h2>Operasyon Ozeti</h2>
                  <p>Olusturulacak kaydin temel operasyon durusunu burada aninda kontrol edin.</p>
                </div>
                <StatusBadge status="Draft" />
              </div>

              <div className="operation-summary-list">
                <div className="operation-summary-row">
                  <span>Operasyon adi</span>
                  <strong>{operationName.trim() || "Henuz ad verilmedi"}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Secilen anket</span>
                  <strong>{selectedSurvey?.name ?? "Henuz anket secilmedi"}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Durum</span>
                  <strong>Taslak</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Kisi durumu</span>
                  <strong>{personStatus}</strong>
                </div>
              </div>

              <div className="operation-summary-helper">
                <strong>Sonraki adim</strong>
                <p>Operasyon olusturulduktan sonra kisi yukleyebilir ve cagri surecine hazirlayabilirsiniz.</p>
              </div>

              {submitError ? (
                <div className="operation-inline-message is-danger compact">
                  <strong>Olusturma tamamlanamadi</strong>
                  <span>{submitError}</span>
                </div>
              ) : null}
            </section>
          </aside>
        </div>

        <div className="operation-action-bar panel-card">
          <Link href="/operations" className="button-secondary compact-button">
            Iptal
          </Link>
          <div className="operation-action-group">
            <button
              type="button"
              className="button-secondary compact-button"
              onClick={() => void submitOperation("draft")}
              disabled={isSubmitDisabled}
            >
              {isSubmitting && submitIntent === "draft" ? "Taslak olusturuluyor..." : "Taslak olarak olustur"}
            </button>
            <button
              type="button"
              className="button-primary compact-button"
              onClick={() => void submitOperation("create")}
              disabled={isSubmitDisabled}
            >
              {isSubmitting && submitIntent === "create" ? "Operasyon olusturuluyor..." : "Operasyonu olustur"}
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

