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
  const trendMax = analytics ? Math.max(...analytics.responseTrend.map((item) => item.count), 1) : 1;

  return (
    <SectionCard
      title="Operasyon Analitiği"
      description="Çağrı sonuçları, katılım oranları ve soru bazlı dağılımlar bu operasyon yüzeyinde gerçek veriden beslenir."
    >
      {isLoading ? (
        <div className="operation-empty-state">
          <strong>Analitik yükleniyor</strong>
          <p>Operasyona ait çağrı ve yanıt toplamları getiriliyor.</p>
        </div>
      ) : !analytics || (analytics.totalResponses === 0 && analytics.totalPreparedJobs === 0) ? (
        <div className="operation-empty-state operation-analytics-empty">
          <strong>{emptyState.title}</strong>
          <p>{emptyState.description}</p>
          {operation?.status === "Ready" && analytics ? (
            <div className="operation-analytics-preflight">
              <div className="operation-contact-status-card">
                <span>Toplam kişi</span>
                <strong>{analytics.totalContacts}</strong>
              </div>
              <div className="operation-contact-status-card">
                <span>Hazır iş</span>
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
                  <span className="operation-kicker">Durum dağılımı</span>
                  <h3>Yürütme sonucu kırılımı</h3>
                </div>
                {analytics.partialData ? <span className="operation-live-pill">Canlı / Kısmi</span> : null}
              </div>
              {analytics.outcomeBreakdown.some((item) => item.count > 0) ? (
                <div className="operation-bar-list">
                  {analytics.outcomeBreakdown.map((item) => (
                    <div key={item.key} className="operation-bar-row">
                      <div className="operation-bar-copy">
                        <strong>{item.label}</strong>
                        <span>{item.count} kayıt</span>
                      </div>
                      <div className="operation-bar-track">
                        <div
                          className="operation-bar-fill"
                          style={{ width: `${Math.max(item.percentage, item.count > 0 ? 6 : 0)}%` }}
                        />
                      </div>
                      <span className="operation-bar-value">%{item.percentage}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="operation-mini-empty">Dağılım oluşması için yürütme sonuçları bekleniyor.</div>
              )}
            </article>

            <article className="operation-chart-card">
              <div className="operation-chart-head">
                <div>
                  <span className="operation-kicker">Öne çıkan içgörüler</span>
                  <h3>Özet yorum</h3>
                </div>
              </div>
              <div className="operation-insight-card">
                <strong>{analytics.insightSummary ?? "Bu operasyonda henüz özet üretilecek kadar veri yok."}</strong>
                <p>
                  {analytics.insightSummary
                    ? "Bu metin mevcut operasyon verisinden üretilen kısa bir yönlendirme özeti sunar."
                    : "İlk çağrı ve yanıt kayıtları geldikçe burada kısa operasyon özeti görünür."}
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
                      <span className="operation-live-pill">
                        {item.tone === "warning" ? "İzle" : item.tone === "positive" ? "Pozitif" : "Hazır"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="operation-response-health">
                <div className="operation-response-health-item">
                  <span>Cevap oranı</span>
                  <strong>%{analytics.responseRate}</strong>
                </div>
                <div className="operation-response-health-item">
                  <span>Katılım oranı</span>
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
                <span className="operation-kicker">Zaman görünümü</span>
                <h3>Yanıt akışı trendi</h3>
              </div>
            </div>
            {analytics.responseTrend.length > 0 ? (
              <div className="operation-trend-bars">
                {analytics.responseTrend.map((point) => {
                  const height = Math.max((point.count / trendMax) * 100, point.count > 0 ? 18 : 4);
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
              <div className="operation-mini-empty">Zaman bazlı trend için yeterli cevap verisi bulunmuyor.</div>
            )}
          </article>

          <div className="operation-question-stack">
            <div className="section-header">
              <div className="section-copy">
                <h2>Soru Bazlı İçgörüler</h2>
                <p>Gerçek yanıtlar yalnızca ilgili veri bulunduğunda grafiğe dönüşür, aksi halde net boş durum mesajı gösterilir.</p>
              </div>
            </div>
            {analytics.questionSummaries.length > 0 ? (
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
                        <span>{summary.answeredCount} yanıt</span>
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
                                <div
                                  className="operation-bar-fill"
                                  style={{ width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%` }}
                                />
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
                          <span>Örnek yanıtlar</span>
                          <span>{summary.sampleResponses.join(" | ")}</span>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="operation-mini-empty">Bu ankette henüz soru bazlı gösterilecek cevap verisi yok.</div>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
