"use client";

import { KpiCard } from "@/components/ui/KpiCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { getAnalyticsEmptyState, getAnalyticsKpis, getQuestionChartPresentation } from "@/lib/operation-detail";
import { Operation, OperationAnalytics } from "@/lib/types";

type OperationAnalyticsSectionProps = {
  operation: Operation | null;
  analytics: OperationAnalytics | null;
  contactCount: number;
  isLoading: boolean;
};

export function OperationAnalyticsSection({
  operation,
  analytics,
  contactCount,
  isLoading,
}: OperationAnalyticsSectionProps) {
  const emptyState = getAnalyticsEmptyState(operation?.status ?? "Draft", contactCount);
  const kpis = getAnalyticsKpis(operation, analytics);

  return (
    <SectionCard
      title="Operasyon Analitigi"
      description="Cagri kaynakli sonuc dagilimlari, katilim sinyalleri ve soru bazli icgoruler ayni operasyon yuzeyinde kalir."
    >
      {isLoading ? (
        <div className="operation-empty-state">
          <strong>Analitik yukleniyor</strong>
          <p>Operasyona ait cevap ve yurutme toplamlari getiriliyor.</p>
        </div>
      ) : !analytics || (analytics.totalResponses === 0 && analytics.totalPreparedJobs === 0) ? (
        <div className="operation-empty-state operation-analytics-empty">
          <strong>{emptyState.title}</strong>
          <p>{emptyState.description}</p>
          {operation?.status === "Ready" && analytics ? (
            <div className="operation-analytics-preflight">
              <div className="operation-contact-status-card">
                <span>Toplam kisi</span>
                <strong>{analytics.totalContacts}</strong>
              </div>
              <div className="operation-contact-status-card">
                <span>Hazir is</span>
                <strong>{analytics.totalPreparedJobs}</strong>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="operation-analytics-stack">
          <div className="operation-kpi-grid">
            {kpis.map((item) => (
              <KpiCard
                key={item.label}
                label={item.label}
                value={item.value}
                detail={item.detail}
                tone={item.tone}
              />
            ))}
          </div>

          <div className="operation-analytics-grid">
            <article className="operation-chart-card">
              <div className="operation-chart-head">
                <div>
                  <span className="operation-kicker">Durum dagilimi</span>
                  <h3>Yurutme sonucu kirilimi</h3>
                </div>
                {analytics.partialData ? <span className="operation-live-pill">Canli / Kismi</span> : null}
              </div>
              {analytics.outcomeBreakdown.some((item) => item.count > 0) ? (
                <div className="operation-bar-list">
                  {analytics.outcomeBreakdown.map((item) => (
                    <div key={item.key} className="operation-bar-row">
                      <div className="operation-bar-copy">
                        <strong>{item.label}</strong>
                        <span>{item.count} kayit</span>
                      </div>
                      <div className="operation-bar-track">
                        <div className="operation-bar-fill" style={{ width: `${Math.max(item.percentage, item.count > 0 ? 6 : 0)}%` }} />
                      </div>
                      <span className="operation-bar-value">%{item.percentage}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="operation-mini-empty">Dagilim olusmasi icin yurutme sonuclari bekleniyor.</div>
              )}
            </article>

            <article className="operation-chart-card">
              <div className="operation-chart-head">
                <div>
                  <span className="operation-kicker">One cikan icgoruler</span>
                  <h3>Ozet yorum</h3>
                </div>
              </div>
              <div className="operation-insight-card">
                <strong>{analytics.insightSummary ?? "AI analiz ozeti bu alana baglanabilir."}</strong>
                <p>
                  {analytics.insightSummary
                    ? "Bu metin mevcut operasyon verisinden uretilen yonlendirici ozet gorevi gorur."
                    : "Ileride AI destekli ozet veya kural bazli yorum bu bolume beslenebilir."}
                </p>
              </div>
              {analytics.insightItems.length > 0 ? (
                <div className="operation-contact-glimpse-list">
                  {analytics.insightItems.map((item) => (
                    <div key={item.key} className="operation-contact-glimpse-item">
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </div>
                      <span className={`operation-live-pill ${item.tone === "warning" ? "" : ""}`}>
                        {item.tone === "warning" ? "Izle" : item.tone === "positive" ? "Pozitif" : "Hazir"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="operation-response-health">
                <div className="operation-response-health-item">
                  <span>Cevap orani</span>
                  <strong>%{analytics.responseRate}</strong>
                </div>
                <div className="operation-response-health-item">
                  <span>Temas orani</span>
                  <strong>%{analytics.contactReachRate}</strong>
                </div>
                <div className="operation-response-health-item">
                  <span>Katilim</span>
                  <strong>%{analytics.participationRate}</strong>
                </div>
                <div className="operation-response-health-item">
                  <span>Ortalama tamamlama</span>
                  <strong>%{analytics.averageCompletionPercent}</strong>
                </div>
              </div>
            </article>
          </div>

          <article className="operation-chart-card">
            <div className="operation-chart-head">
              <div>
                <span className="operation-kicker">Zaman gorunumu</span>
                <h3>Yanit akisi trendi</h3>
              </div>
            </div>
            {analytics.responseTrend.length > 0 ? (
              <div className="operation-trend-bars">
                {analytics.responseTrend.map((point) => {
                  const max = Math.max(...analytics.responseTrend.map((item) => item.count), 1);
                  const height = Math.max((point.count / max) * 100, point.count > 0 ? 18 : 4);
                  return (
                    <div key={point.label} className="operation-trend-bar">
                      <div className="operation-trend-column">
                        <div className="operation-trend-fill" style={{ height: `${height}%` }} />
                      </div>
                      <strong>{point.count}</strong>
                      <span>{point.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="operation-mini-empty">Zaman bazli trend icin yeterli cevap verisi bulunmuyor.</div>
            )}
          </article>

          <div className="operation-question-stack">
            <div className="section-header">
              <div className="section-copy">
                <h2>Soru Bazli Icgoruler</h2>
                <p>En onemli cevaplanan sorular, uygun grafik tipiyle kompakt kartlarda gosterilir.</p>
              </div>
            </div>
            <div className="operation-question-grid">
              {analytics.questionSummaries.map((summary) => {
                const presentation = getQuestionChartPresentation(summary);
                const hasData = summary.breakdown.some((item) => item.count > 0);

                return (
                  <article key={summary.questionId} className="operation-question-card">
                    <div className="operation-chart-head">
                      <div>
                        <span className="operation-kicker">{presentation.eyebrow}</span>
                        <h3>{summary.questionTitle}</h3>
                      </div>
                      <span className="operation-question-meta">%{summary.responseRate}</span>
                    </div>
                    <div className="operation-question-submeta">
                      <span>Soru {summary.questionOrder}</span>
                      <span>{summary.answeredCount} yanit</span>
                      {summary.averageRating !== null ? <span>Ort. {summary.averageRating}</span> : null}
                    </div>
                    {hasData ? (
                      <div className="operation-bar-list compact">
                        {summary.breakdown.map((item) => (
                          <div key={`${summary.questionId}-${item.key}`} className="operation-bar-row">
                            <div className="operation-bar-copy">
                              <strong>{item.label}</strong>
                              <span>{item.count}</span>
                            </div>
                            <div className="operation-bar-track">
                              <div className="operation-bar-fill" style={{ width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%` }} />
                            </div>
                            <span className="operation-bar-value">%{item.percentage}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="operation-mini-empty">{presentation.empty}</div>
                    )}
                    {summary.sampleResponses.length > 0 ? (
                      <div className="operation-question-submeta">
                        <span>Ornek yanitlar</span>
                        <span>{summary.sampleResponses.join(" | ")}</span>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
