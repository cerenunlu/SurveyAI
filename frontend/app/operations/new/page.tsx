"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePageHeaderOverride } from "@/components/layout/PageHeaderContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ContactIcon, OperationIcon, PlayIcon, SurveyIcon } from "@/components/ui/Icons";
import { createOperation, createOperationContacts } from "@/lib/operations";
import {
  ACCEPTED_OPERATION_CONTACT_FILE_TYPES,
  OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT,
  buildPreviewRows,
  createEmptyImportSummary,
  downloadOperationContactsTemplate,
  type ImportPreviewRow,
  type ImportSummary,
} from "@/lib/operation-contact-import";
import { fetchSurveyBuilderSurvey } from "@/lib/survey-builder-api";
import { fetchCompanySurveys } from "@/lib/surveys";
import type { Survey, SurveyBuilderSurvey } from "@/lib/types";

type ContactMode = "later" | "now";

type FormErrors = {
  name?: string;
  surveyId?: string;
};

type SubmitIntent = "draft" | "create";
type SubmitPhase = "idle" | "creating" | "importing";

type PreparationItem = {
  key: string;
  title: string;
  detail: string;
  status: "Ready" | "Warning" | "Pending";
  label: string;
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
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent | null>(null);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary>(createEmptyImportSummary());
  const [importError, setImportError] = useState<string | null>(null);

  usePageHeaderOverride({
    title: "Yeni Operasyon Tasarimi",
    subtitle: "Operasyon kimligini, bagli anketi ve kisi planini ayni karar ekraninda netlestirin.",
  });

  const publishedSurveys = useMemo(() => surveys.filter((survey) => survey.status === "Live"), [surveys]);

  const selectedSurvey = useMemo(
    () => publishedSurveys.find((survey) => survey.id === selectedSurveyId) ?? null,
    [publishedSurveys, selectedSurveyId],
  );

  const previewRows = useMemo(() => importRows.slice(0, OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT), [importRows]);
  const validImportRows = useMemo(() => importRows.filter((row) => row.isValid), [importRows]);

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

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setImportError(null);
    setImportRows([]);
    setImportSummary(createEmptyImportSummary());
    setSelectedFileName(file?.name ?? null);

    if (!file) {
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("Dosyada okunabilir bir sayfa bulunamadi.");
      }

      const firstSheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
      });

      const { previewRows: nextImportRows, summary } = buildPreviewRows(rows);
      setImportRows(nextImportRows);
      setImportSummary(summary);

      if (summary.totalRows === 0 && summary.ignoredRows === 0) {
        setImportError("Dosyada veri satiri bulunamadi.");
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Dosya okunamadi.");
    } finally {
      event.target.value = "";
    }
  }

  async function submitOperation(intent: SubmitIntent) {
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
      setSubmitPhase("creating");

      const createdOperation = await createOperation({
        name: trimmedName,
        surveyId: selectedSurveyId,
        scheduledAt: null,
        createdByUserId: null,
      });

      const searchParams = new URLSearchParams();
      searchParams.set("created", "1");

      if (contactMode === "now") {
        searchParams.set("importRequested", "1");

        if (validImportRows.length > 0) {
          setSubmitPhase("importing");

          try {
            const importedContacts = await createOperationContacts(createdOperation.id, {
              contacts: validImportRows.map((row) => ({
                name: row.name,
                phoneNumber: row.normalizedPhoneNumber,
              })),
            });

            if (importedContacts.length > 0) {
              searchParams.set("imported", String(importedContacts.length));
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Gecerli kisiler operasyona aktarilamadi.";
            searchParams.set("importError", message);
          }
        }

        if (importSummary.invalidRows > 0) {
          searchParams.set("invalid", String(importSummary.invalidRows));
        }

        if (importSummary.ignoredRows > 0) {
          searchParams.set("ignored", String(importSummary.ignoredRows));
        }
      } else {
        searchParams.set("contacts", "skipped");
      }

      router.push(`/operations/${createdOperation.id}?${searchParams.toString()}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Operasyon olusturulamadi.");
      setIsSubmitting(false);
      setSubmitIntent(null);
      setSubmitPhase("idle");
    }
  }

  const trimmedOperationName = operationName.trim();
  const surveyQuestionCount = selectedSurveyDetail
    ? `${selectedSurveyDetail.questions.length} soru`
    : isLoadingSurveyDetail && selectedSurveyId
      ? "Soru bilgisi yukleniyor"
      : "Soru ozeti hazir degil";
  const surveyLanguage = selectedSurveyDetail?.languageCode?.toUpperCase() ?? selectedSurvey?.audience ?? "-";
  const surveyStatus = selectedSurveyDetail?.status ?? selectedSurvey?.status ?? "Live";
  const personStatus =
    contactMode === "now"
      ? importSummary.validRows > 0
        ? `${importSummary.validRows} kisi ilk dalgaya hazir`
        : selectedFileName
          ? "Dogrulama sonrasi baglanacak"
          : "Toplu import dosyasi bekleniyor"
      : "Kisi listesi sonraki adima birakildi";
  const isSubmitDisabled = isSubmitting || isLoadingSurveys || publishedSurveys.length === 0;
  const isImportVisible = contactMode === "now";
  const actionLabel =
    submitPhase === "creating"
      ? intentLabel(submitIntent, "creating")
      : submitPhase === "importing"
        ? "Gecerli kisiler yeni operasyona baglaniyor..."
        : null;

  const preparationItems = useMemo<PreparationItem[]>(
    () => [
      {
        key: "name",
        title: "Operasyon kimligi",
        detail: trimmedOperationName
          ? "Operasyon adi ekipler tarafindan ayirt edilebilir durumda."
          : "Operasyonun ekip icinde taniyacagi net bir ada ihtiyaci var.",
        status: trimmedOperationName ? "Ready" : "Warning",
        label: trimmedOperationName ? "Hazir" : "Eksik",
      },
      {
        key: "survey",
        title: "Yayinlanmis anket baglantisi",
        detail: selectedSurvey
          ? `${selectedSurvey.name} operasyon icin secildi.`
          : "Operasyonu baslatmak icin yayinlanmis bir anket secilmeli.",
        status: selectedSurvey ? "Ready" : "Warning",
        label: selectedSurvey ? "Baglandi" : "Secim bekliyor",
      },
      {
        key: "contacts",
        title: "Kisi stratejisi",
        detail:
          contactMode === "later"
            ? "Kisi listesi daha sonra baglanacak; bu secim operasyon olusturmaya engel degil."
            : validImportRows.length > 0
              ? `${validImportRows.length} kisi ilk import icin gecerli gorunuyor.`
              : selectedFileName
                ? "Dosya secildi ancak gecerli satir sayisi netlesmedi."
                : "Toplu import dosyasi bekleniyor.",
        status:
          contactMode === "later" || validImportRows.length > 0
            ? "Ready"
            : selectedFileName
              ? "Pending"
              : "Pending",
        label:
          contactMode === "later"
            ? "Planlandi"
            : validImportRows.length > 0
              ? "Hazir"
              : "Bekliyor",
      },
      {
        key: "note",
        title: "Hazirlik notu",
        detail: operationNote.trim()
          ? "Baglam notu ekip ici iletisim icin hazir."
          : "Baglam notu istege bagli; operasyon kapsaminda netlik saglayabilir.",
        status: operationNote.trim() ? "Ready" : "Pending",
        label: operationNote.trim() ? "Girildi" : "Istege bagli",
      },
    ],
    [contactMode, operationNote, selectedFileName, selectedSurvey, trimmedOperationName, validImportRows.length],
  );

  const readiness = useMemo(() => {
    const completed = preparationItems.filter((item) => item.status === "Ready").length;

    if (completed >= 3) {
      return {
        label: "Hazir",
        status: "Ready" as const,
        detail: "Operasyon tanimi, anket baglantisi ve ilk uygulama karari netlesti.",
      };
    }

    if (completed >= 2) {
      return {
        label: "Kismen hazir",
        status: "Warning" as const,
        detail: "Operasyon olusturulabilir; yine de hazirlik maddelerinin bir bolumu takibe ihtiyac duyuyor.",
      };
    }

    return {
      label: "Hazirlikta",
      status: "Pending" as const,
      detail: "Temel tanim ve anket secimi tamamlanmadan operasyon kalici olarak acilmamali.",
    };
  }, [preparationItems]);

  return (
    <PageContainer hideBackRow>
      <div className="ops-create-shell">
        <div className="ops-create-top-row">
          <Link href="/operations" className="button-secondary compact-button">
            Operasyonlara don
          </Link>
          <StatusBadge status={readiness.status} label={readiness.label} />
        </div>

        <section className="ops-summary-strip ops-create-summary-strip">
          <StatCard
            label="Yayinlanmis anket"
            value={publishedSurveys.length}
            detail="Operasyona baglanabilir aktif anket havuzu."
            icon={<SurveyIcon className="nav-icon" />}
          />
          <StatCard
            label="Secilen sablon"
            value={selectedSurvey ? surveyQuestionCount : "-"}
            detail={selectedSurvey ? selectedSurvey.name : "Henuz operasyona baglanacak anket secilmedi."}
            icon={<OperationIcon className="nav-icon" />}
          />
          <StatCard
            label="Kisi plani"
            value={contactMode === "now" ? validImportRows.length : "Sonra"}
            detail={personStatus}
            icon={<ContactIcon className="nav-icon" />}
          />
          <StatCard
            label="Hazirlik seviyesi"
            value={readiness.label}
            detail={readiness.detail}
            icon={<PlayIcon className="nav-icon" />}
          />
        </section>

        <div className="ops-two-column-layout ops-create-layout">
          <div className="ops-create-main">
            <SectionCard eyebrow="Brif" title="Operasyon Kimligi" description="Operasyonu net, izlenebilir ve ekip diline uygun bir cercevede tanimlayin.">
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
                    placeholder="Kapsam, segment veya ekip icin karar notunu ekleyin."
                  />
                  <span>Bu alan su an backend create istegine gitmez; ekip ici hazirlik baglami olarak kullanilir.</span>
                </label>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Baglanti"
              title="Anket Baglantisi"
              description="Operasyon yalnizca yayinlanmis anketlerle calisabilir. Taslaklar burada secilemez."
              action={
                <Link href="/surveys/new" className="button-secondary compact-button">
                  Yeni Anket
                </Link>
              }
            >
              <div className="survey-form-fields">
                {loadError ? (
                  <div className="operation-inline-message is-danger">
                    <strong>Anketler yuklenemedi</strong>
                    <span>{loadError}</span>
                  </div>
                ) : isLoadingSurveys ? (
                  <div className="operation-inline-message">
                    <strong>Yayinlanmis anketler yukleniyor</strong>
                    <span>Operasyona baglanabilir sablonlar sirket havuzundan getiriliyor.</span>
                  </div>
                ) : publishedSurveys.length === 0 ? (
                  <div className="operation-inline-message">
                    <strong>Kullanilabilir yayinlanmis anket yok</strong>
                    <span>Yeni bir operasyon acmadan once en az bir anketi yayinlamaniz gerekiyor.</span>
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
                  <div className="operation-survey-summary ops-create-survey-summary">
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

                    <p className="ops-create-inline-note">
                      {selectedSurvey.goal || "Bu anketin kisa operasyon baglami henuz eklenmedi."}
                    </p>
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard eyebrow="Kisiler" title="Kisi Yukleme Stratejisi" description="Kisi listesini simdi baglayabilir veya operasyonu acip sonrasinda tamamlayabilirsiniz.">
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
                    <span>CSV veya XLSX dosyasini simdi yukleyin; gecerli kisiler operasyon olustuktan hemen sonra baglanir.</span>
                  </button>
                </div>

                {isImportVisible ? (
                  <>
                    <div className="operation-inline-message is-accent">
                      <strong>Toplu import ilk dalgaya baglanacak</strong>
                      <span>Burada dogrulanan gecerli kisiler, operasyon olustuktan hemen sonra yeni kayda aktarilir.</span>
                    </div>

                    <div className="operation-bulk-import">
                      <div className="operation-upload-placeholder">
                        <strong>Toplu kisi yukleme</strong>
                        <p>CSV veya Excel dosyasi secin. Beklenen kolonlar: `adSoyad` ve `telefonNumarasi`.</p>
                      </div>

                      <label className="builder-field">
                        <strong>Dosya secimi</strong>
                        <input type="file" accept={ACCEPTED_OPERATION_CONTACT_FILE_TYPES} onChange={(event) => void handleFileSelection(event)} />
                        <span>{selectedFileName ? `Secilen dosya: ${selectedFileName}` : "Desteklenen formatlar: .csv ve .xlsx"}</span>
                      </label>

                      <div className="operation-bulk-import-actions">
                        <button type="button" className="button-secondary compact-button" onClick={downloadOperationContactsTemplate}>
                          Ornek sablon indir
                        </button>
                      </div>

                      {(importSummary.totalRows > 0 || importSummary.ignoredRows > 0) && !importError ? (
                        <div className="operation-import-stats">
                          <div className="operation-import-stat">
                            <span>Toplam satir</span>
                            <strong>{importSummary.totalRows}</strong>
                          </div>
                          <div className="operation-import-stat">
                            <span>Gecerli</span>
                            <strong>{importSummary.validRows}</strong>
                          </div>
                          <div className="operation-import-stat">
                            <span>Gecersiz</span>
                            <strong>{importSummary.invalidRows}</strong>
                          </div>
                          <div className="operation-import-stat">
                            <span>Bos gecilen</span>
                            <strong>{importSummary.ignoredRows}</strong>
                          </div>
                        </div>
                      ) : null}

                      {importRows.length > 0 ? (
                        <div className="operation-import-preview">
                          <div className="operation-import-preview-head">
                            <strong>Onizleme</strong>
                            <span>Ilk {Math.min(importRows.length, OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT)} satir gosteriliyor.</span>
                          </div>
                          <div className="operation-import-table-wrap">
                            <table className="operation-import-table">
                              <thead>
                                <tr>
                                  <th>Satir</th>
                                  <th>Ad soyad</th>
                                  <th>Telefon</th>
                                  <th>Durum</th>
                                </tr>
                              </thead>
                              <tbody>
                                {previewRows.map((row) => (
                                  <tr key={row.rowNumber} className={row.isValid ? "is-valid" : "is-invalid"}>
                                    <td>{row.rowNumber}</td>
                                    <td>{row.name || "-"}</td>
                                    <td>{row.phoneNumber || "-"}</td>
                                    <td>{row.isValid ? "Hazir" : row.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}

                      {importSummary.invalidRows > 0 && !importError ? (
                        <div className="operation-inline-message is-danger compact">
                          <strong>Gecersiz satirlar import edilmeyecek</strong>
                          <span>Sadece gecerli satirlar yeni operasyona baglanir. Dilerseniz gecersiz satirlari duzeltip tekrar yukleyebilirsiniz.</span>
                        </div>
                      ) : null}

                      {importError ? (
                        <div className="operation-inline-message is-danger compact">
                          <strong>Toplu yukleme sorunu</strong>
                          <span>{importError}</span>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="operation-inline-message">
                    <strong>Kisi listesi daha sonra eklenebilir</strong>
                    <span>Bu tercih operasyonu hemen acar. Kisi importu, operasyon detayindaki mevcut akistan daha sonra devam edebilir.</span>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <aside className="ops-create-side">
            <SectionCard eyebrow="Analiz" title="Hazirlik Degerlendirmesi" description="Sistem, operasyonu acmadan once ana karar noktalarini burada ozetler." action={<StatusBadge status={readiness.status} label={readiness.label} />}>
              <div className="ops-create-checklist">
                {preparationItems.map((item) => (
                  <div key={item.key} className="ops-create-check-row">
                    <div className="ops-create-check-copy">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <StatusBadge status={item.status} label={item.label} />
                  </div>
                ))}
              </div>

              {actionLabel ? (
                <div className="operation-inline-message is-accent compact">
                  <strong>Akis isleniyor</strong>
                  <span>{actionLabel}</span>
                </div>
              ) : null}

              {submitError ? (
                <div className="operation-inline-message is-danger compact">
                  <strong>Olusturma tamamlanamadi</strong>
                  <span>{submitError}</span>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard eyebrow="Ozet" title="Operasyon Ozeti" description="Olusturulacak kaydin sahaya nasil cikacagini bu panelden hizla kontrol edin.">
              <div className="operation-summary-list">
                <div className="operation-summary-row">
                  <span>Operasyon adi</span>
                  <strong>{trimmedOperationName || "Henuz ad verilmedi"}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Secilen anket</span>
                  <strong>{selectedSurvey?.name ?? "Henuz anket secilmedi"}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Durum</span>
                  <strong>{readiness.label}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Kisi plani</span>
                  <strong>{personStatus}</strong>
                </div>
              </div>

              <div className="operation-summary-helper ops-create-summary-helper">
                <strong>Sonraki adim</strong>
                <p>
                  {contactMode === "now"
                    ? "Operasyon once backendde olusturulur, sonra onizlemede gecerli gorunen kisiler ilk dalga olarak otomatik baglanir."
                    : "Operasyon olusturulduktan sonra kisi yukleme, operasyon detay ekranindaki mevcut akistan devam eder."}
                </p>
              </div>

              {operationNote.trim() ? (
                <div className="ops-create-note">
                  <strong>Hazirlik notu</strong>
                  <p>{operationNote}</p>
                </div>
              ) : null}
            </SectionCard>
          </aside>
        </div>

        <div className="operation-action-bar panel-card ops-create-action-bar">
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
              {isSubmitting && submitIntent === "draft"
                ? submitPhase === "importing"
                  ? "Taslak olustu, kisiler baglaniyor..."
                  : "Taslak olusturuluyor..."
                : "Taslak olarak olustur"}
            </button>
            <button
              type="button"
              className="button-primary compact-button"
              onClick={() => void submitOperation("create")}
              disabled={isSubmitDisabled}
            >
              {isSubmitting && submitIntent === "create"
                ? submitPhase === "importing"
                  ? "Operasyon olustu, kisiler baglaniyor..."
                  : "Operasyon olusturuluyor..."
                : "Operasyonu olustur"}
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function intentLabel(intent: SubmitIntent | null, phase: "creating") {
  if (phase === "creating") {
    return intent === "draft" ? "Taslak operasyon backendde olusturuluyor..." : "Operasyon backendde olusturuluyor...";
  }

  return "Akis isleniyor...";
}
