"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePageHeaderOverride } from "@/components/layout/PageHeaderContext";
import { KeyValueList } from "@/components/ui/KeyValueList";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchOperationById, fetchOperationCallJobDetail, retryOperationCallJob } from "@/lib/operations";
import { CallJobAttempt, CallJobDetail, Operation } from "@/lib/types";

export default function OperationJobDetailPage() {
  const params = useParams<{ id: string; jobId: string }>();
  const operationId = params.id;
  const callJobId = params.jobId;
  const [operation, setOperation] = useState<Operation | null>(null);
  const [detail, setDetail] = useState<CallJobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retryErrorMessage, setRetryErrorMessage] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  const pageHeader = useMemo(
    () => ({
      title: detail?.personName ?? "Cagri isi detayi",
      subtitle: detail ? `${detail.operationName} operasyonu icindeki tekil yurütme kaydi.` : "Cagri isi detayi yukleniyor.",
    }),
    [detail],
  );

  usePageHeaderOverride(pageHeader);

  useEffect(() => {
    if (!operationId || !callJobId) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setIsMissing(false);

        const [nextOperation, nextDetail] = await Promise.all([
          fetchOperationById(operationId, undefined, { signal: controller.signal }),
          fetchOperationCallJobDetail(operationId, callJobId, undefined, { signal: controller.signal }),
        ]);

        setOperation(nextOperation);
        setDetail(nextDetail);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Cagri isi detayi yuklenemedi.";
        if (message.includes("(404)")) {
          setIsMissing(true);
          return;
        }

        setErrorMessage(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [callJobId, operationId]);

  if (isMissing) {
    notFound();
  }

  async function handleRetry() {
    if (!detail?.retryable) {
      return;
    }

    try {
      setIsRetrying(true);
      setRetryMessage(null);
      setRetryErrorMessage(null);
      const nextDetail = await retryOperationCallJob(operationId, callJobId);
      setDetail(nextDetail);
      setRetryMessage("Yeni deneme kaydi olusturuldu. Guncel durum asagidaki zaman cizelgesine islendi.");
    } catch (error) {
      setRetryErrorMessage(error instanceof Error ? error.message : "Yeniden deneme baslatilamadi.");
    } finally {
      setIsRetrying(false);
    }
  }

  const responseStatus = detail?.surveyResponse?.status ?? (detail?.partialResponseDataExists ? "Kismi veri var" : "Yanıt yok");
  const responseDetail = detail?.surveyResponse
    ? detail.surveyResponse.usableResponse
      ? `${detail.surveyResponse.validAnswerCount} gecerli cevap islenmis.`
      : `Yanit kaydi var fakat kullanilabilir eslesen cevap sayisi ${detail.surveyResponse.validAnswerCount}.`
    : detail?.partialResponseDataExists
      ? "Transcript veya kisitli veri mevcut, ama bagli bir survey_response secilemiyor."
      : "Bu is icin henuz survey_response kaydi yok.";

  return (
    <PageContainer>
      {errorMessage ? (
        <section className="panel-card">
          <div className="operation-inline-message is-danger">
            <strong>Cagri isi detayi yuklenemedi</strong>
            <span>{errorMessage}</span>
          </div>
        </section>
      ) : null}

      {retryErrorMessage ? (
        <section className="panel-card">
          <div className="operation-inline-message is-danger compact">
            <strong>Yeniden deneme baslatilamadi</strong>
            <span>{retryErrorMessage}</span>
          </div>
        </section>
      ) : null}

      {retryMessage ? (
        <section className="panel-card">
          <div className="operation-inline-message is-accent compact">
            <strong>Yeniden deneme kaydedildi</strong>
            <span>{retryMessage}</span>
          </div>
        </section>
      ) : null}

      <section className="hero-card is-compact operation-workspace-hero">
        <div className="operation-workspace-hero-head">
          <div>
            <div className="eyebrow">Call Job Detail</div>
            <h2 className="hero-title">{detail?.personName ?? "Cagri isi yukleniyor"}</h2>
            <p className="hero-text">
              {detail
                ? `${detail.operationName} icindeki tekil cagri isi, deneme gecmisi ve survey response iliskisi bu yuzeyde bir araya gelir.`
                : "Secili cagri isi, deneme gecmisi ve geri donen veri yukleniyor."}
            </p>
          </div>
          <div className="operation-hero-status-cluster">
            <StatusBadge status={detail?.status ?? "Pending"} />
            <span className={detail?.retryable ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
              {detail?.retryable ? "Retry uygun" : "Retry kapali"}
            </span>
          </div>
        </div>
        <div className="chip-row">
          <span className="chip">Operasyon: {detail?.operationName ?? operation?.name ?? "Yukleniyor"}</span>
          <span className="chip">Anket: {detail?.surveyName ?? operation?.survey ?? "Yukleniyor"}</span>
          <span className="chip">Telefon: {detail?.phoneNumber ?? "-"}</span>
          <span className="chip">Deneme: {detail ? `${detail.attemptCount} / ${detail.maxAttempts}` : "..."}</span>
        </div>
      </section>

      {isLoading || !detail ? (
        <section className="panel-card">
          <div className="list-item">
            <div>
              <strong>Cagri isi detayi yukleniyor</strong>
              <span>Attempt gecmisi, transcript ve response baglantisi backend uzerinden getiriliyor.</span>
            </div>
          </div>
        </section>
      ) : (
        <div className="operation-workspace-grid call-job-detail-grid">
          <div className="operation-workspace-main">
            <SectionCard
              title="Operasyonel ozet"
              description="Job durumu, hata gorunurlugu ve retry kontrolu ayni yerde tutulur."
              action={(
                <div className="operation-top-actions">
                  <Link href={`/operations/${operationId}/jobs`} className="button-secondary compact-button">
                    Listeye don
                  </Link>
                  <button
                    type="button"
                    className="button-primary compact-button"
                    disabled={!detail.retryable || isRetrying}
                    onClick={() => void handleRetry()}
                  >
                    {isRetrying ? "Yeniden deneniyor..." : "Guvenli retry"}
                  </button>
                </div>
              )}
            >
              <KeyValueList
                items={[
                  { label: "Olusturulma", value: detail.createdAt },
                  { label: "Son guncelleme", value: detail.updatedAt },
                  { label: "Planlanan zaman", value: detail.scheduledFor },
                  { label: "Tekrar uygunlugu", value: detail.retryable ? "Uygun" : "Uygun degil" },
                  { label: "Failure reason", value: detail.failureReason ?? "Kayitli neden yok" },
                  { label: "Son hata", value: detail.lastErrorMessage ?? "Kayitli hata yok" },
                ]}
              />
            </SectionCard>

            <SectionCard
              title="Response ve transcript"
              description="Bu cagri isinin kullanilabilir survey verisi uretip uretmedigi burada net gorunur."
            >
              <div className="stack-list">
                <div className="detail-row">
                  <span>Survey response durumu</span>
                  <strong>{responseStatus}</strong>
                </div>
                <div className="detail-row">
                  <span>Kullanilabilir veri</span>
                  <strong>{responseDetail}</strong>
                </div>
                <div className="detail-row">
                  <span>Provider referansi</span>
                  <strong>{detail.latestProviderCallId ?? "Provider call id yok"}</strong>
                </div>
                <div className="detail-row">
                  <span>Transcript referansi</span>
                  <strong>{detail.latestTranscriptStorageKey ?? "Transcript storage key yok"}</strong>
                </div>
              </div>

              <div className="section-card-body">
                <div className="list-item">
                  <div>
                    <strong>Transcript ozeti</strong>
                    <span>{detail.transcriptSummary ?? "Ozet uretilmemis."}</span>
                  </div>
                </div>
                <div className="call-job-transcript">
                  <strong>Transcript blok</strong>
                  <pre>{detail.transcriptText ?? "Bu is icin transcript metni henuz mevcut degil."}</pre>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Attempt gecmisi"
              description="Her retry ayni job altinda yeni bir execution attempt olarak saklanir."
            >
              <div className="call-job-attempt-list">
                {detail.attempts.length === 0 ? (
                  <div className="operation-empty-state">
                    <strong>Kayitli attempt yok</strong>
                    <p>Job olusturulmus fakat henuz provider tarafina giden bir execution attempt kaydi gorunmuyor.</p>
                  </div>
                ) : (
                  detail.attempts.map((attempt) => (
                    <article key={attempt.id} className="list-item call-job-attempt-card">
                      <div className="call-job-attempt-head">
                        <div>
                          <strong>Attempt #{attempt.attemptNumber}{attempt.latest ? " · son deneme" : ""}</strong>
                          <span>{formatAttemptStatus(attempt)} · {attempt.provider}</span>
                        </div>
                        <span className={attempt.surveyResponse?.usableResponse ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
                          {attempt.surveyResponse
                            ? attempt.surveyResponse.usableResponse ? "Usable response" : "Response var"
                            : attempt.failureReason ? "Failed / response yok" : "Result bekleniyor"}
                        </span>
                      </div>
                      <div className="call-job-attempt-meta">
                        <span>Dialed: {attempt.dialedAt}</span>
                        <span>Connected: {attempt.connectedAt}</span>
                        <span>Ended: {attempt.endedAt}</span>
                        <span>Provider call id: {attempt.providerCallId ?? "-"}</span>
                        <span>Sure: {attempt.durationSeconds ?? 0} sn</span>
                      </div>
                      {attempt.failureReason ? (
                        <div className="operation-inline-message is-danger compact">
                          <strong>Attempt failure</strong>
                          <span>{attempt.failureReason}</span>
                        </div>
                      ) : null}
                      <div className="call-job-attempt-body">
                        <div className="detail-row">
                          <span>Transcript key</span>
                          <strong>{attempt.transcriptStorageKey ?? "Kayit yok"}</strong>
                        </div>
                        <div className="detail-row">
                          <span>Survey response</span>
                          <strong>
                            {attempt.surveyResponse
                              ? `${attempt.surveyResponse.status} · ${attempt.surveyResponse.validAnswerCount} gecerli cevap`
                              : "Bagli response yok"}
                          </strong>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </SectionCard>
          </div>

          <aside className="operation-workspace-side">
            <SectionCard
              title="Iliski baglami"
              description="Bu job kaydinin operasyon, anket ve response iliskileri tek bakista gorunsun."
            >
              <KeyValueList
                items={[
                  { label: "Operasyon", value: detail.operationName },
                  { label: "Anket", value: detail.surveyName },
                  { label: "Job raw status", value: detail.rawStatus },
                  { label: "Ilk attempt mi", value: detail.firstAttempt ? "Evet" : "Hayir" },
                  { label: "Retry gecmisi", value: detail.retried ? "Var" : "Yok" },
                  { label: "Partial veri", value: detail.partialResponseDataExists ? "Var" : "Yok" },
                ]}
              />
            </SectionCard>

            <SectionCard
              title="Kenar durumlar"
              description="Bu yuzey bekleyen, basarisiz, tamamlanmis ve yarim veri durumlarini ayrik gostermelidir."
            >
              <div className="stack-list">
                <div className="detail-row">
                  <span>Failed ve transcript yok</span>
                  <strong>{detail.failed && !detail.transcriptText ? "Bu kayda uyuyor" : "Hayir"}</strong>
                </div>
                <div className="detail-row">
                  <span>Completed ve response var</span>
                  <strong>{detail.rawStatus === "COMPLETED" && detail.surveyResponse ? "Evet" : "Hayir"}</strong>
                </div>
                <div className="detail-row">
                  <span>Completed ama usable cevap yok</span>
                  <strong>{detail.rawStatus === "COMPLETED" && detail.surveyResponse && !detail.surveyResponse.usableResponse ? "Evet" : "Hayir"}</strong>
                </div>
                <div className="detail-row">
                  <span>Queued ve result bekleniyor</span>
                  <strong>{detail.status === "Queued" && !detail.surveyResponse ? "Evet" : "Hayir"}</strong>
                </div>
                <div className="detail-row">
                  <span>Coklu retry gecmisi</span>
                  <strong>{detail.attemptCount > 1 ? `${detail.attemptCount} attempt` : "Hayir"}</strong>
                </div>
              </div>
            </SectionCard>
          </aside>
        </div>
      )}
    </PageContainer>
  );
}

function formatAttemptStatus(attempt: CallJobAttempt): string {
  switch (attempt.status) {
    case "INITIATED":
      return "Hazirlaniyor";
    case "RINGING":
      return "Ring";
    case "IN_PROGRESS":
      return "Suruyor";
    case "COMPLETED":
      return "Tamamlandi";
    case "FAILED":
      return "Basarisiz";
    case "NO_ANSWER":
      return "Cevap yok";
    case "BUSY":
      return "Mesgul";
    case "VOICEMAIL":
      return "Sesli mesaja dustu";
    case "CANCELLED":
      return "Iptal edildi";
    default:
      return attempt.status;
  }
}
