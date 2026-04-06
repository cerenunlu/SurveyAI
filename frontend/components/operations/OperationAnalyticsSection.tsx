"use client";

import { KpiCard } from "@/components/ui/KpiCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { getAnalyticsEmptyState, getAnalyticsKpisCompact, getQuestionChartPresentation } from "@/lib/operation-detail";
import { Operation, OperationAnalytics } from "@/lib/types";

export type OperationAnalyticsView = "overview" | "health" | "questions" | "audience";

type OperationAnalyticsSectionProps = {
  operation: Operation | null;
  analytics: OperationAnalytics | null;
  contactCount: number;
  isLoading: boolean;
  view: OperationAnalyticsView;
};

const CHART_COLORS = ["#5aa7ff", "#74c0fc", "#8ce99a", "#ffd166", "#f4978e", "#b197fc", "#63e6be", "#ffa94d"];

function getQuestionTypeLabel(questionType: OperationAnalytics["questionSummaries"][number]["questionType"]) {
  switch (questionType) {
    case "OPEN_ENDED":
      return "Acik uclu";
    case "MULTI_CHOICE":
      return "Coklu secim";
    case "RATING":
      return "Puan";
    case "SINGLE_CHOICE":
    default:
      return "Tekli secim";
  }
}

export function OperationAnalyticsSection({
  operation,
  analytics,
  contactCount,
  isLoading,
  view,
}: OperationAnalyticsSectionProps) {
  const emptyState = getAnalyticsEmptyState(operation?.status ?? "Draft", contactCount);
  const kpis = getAnalyticsKpisCompact(operation, analytics);
  const demographicBreakdowns = analytics?.audienceBreakdowns ?? [];

  const titleByView: Record<OperationAnalyticsView, string> = {
    overview: "Yanit Analizi",
    health: "Genel bakis",
    questions: "Soru Bazli Yanitlar",
    audience: "Kitleye Gore Dagilim",
  };

  const renderEmptyState = () => (
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
  );

  const renderOutcomeBreakdown = () => (
    <article className="operation-chart-card">
      <div className="operation-chart-head">
        <div>
          <span className="operation-kicker">Durum dagilimi</span>
          <h3>Yurutme sonucu kirilimi</h3>
        </div>
        {analytics?.partialData ? <span className="operation-live-pill">Canli / Kismi</span> : null}
      </div>
      {analytics && analytics.outcomeBreakdown.some((item) => item.count > 0) ? (
        renderBarRows(analytics.outcomeBreakdown)
      ) : (
        <div className="operation-mini-empty">Dagilim olusmasi icin yurutme sonuclari bekleniyor.</div>
      )}
    </article>
  );

  const renderInsights = () => (
    <article className="operation-chart-card">
      <div className="operation-chart-head">
        <div>
          <span className="operation-kicker">One cikan icgoruler</span>
          <h3>Ozet yorum</h3>
        </div>
      </div>
      <div className="operation-insight-card">
        <strong>{analytics?.insightSummary ?? "Bu operasyonda henuz ozet uretilecek kadar veri yok."}</strong>
        <p>
          {analytics?.insightSummary
            ? "Bu metin mevcut operasyon verisinden uretilen kisa bir yonlendirme ozeti sunar."
            : "Ilk cagri ve yanit kayitlari geldikce burada kisa operasyon ozeti gorunur."}
        </p>
      </div>
      {analytics && analytics.insightItems.length > 0 ? (
        <div className="operation-contact-glimpse-list">
          {analytics.insightItems.map((item) => (
            <div key={item.key} className="operation-contact-glimpse-item">
              <div>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
              <span className="operation-live-pill">
                {item.tone === "warning" ? "Izle" : item.tone === "positive" ? "Pozitif" : "Hazir"}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="operation-response-health">
        <div className="operation-response-health-item">
          <span>Cevap orani (kisi bazli)</span>
          <strong>%{analytics?.responseRate ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Yanit veren kisi</span>
          <strong>{analytics?.respondedContacts ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Tam yanit</span>
          <strong>{analytics?.completedResponses ?? 0}</strong>
        </div>
      </div>
    </article>
  );

  const renderQuestionInsights = () => (
    <div className="operation-question-stack">
      <div className="section-header">
        <div className="section-copy">
          <h2>Soru Bazli Yanitlar</h2>
          <p>Her soru, tipi ve katilim seviyesiyle birlikte daha net bir cevap ozeti halinde sunulur.</p>
        </div>
      </div>
      <div className="operation-inline-filter-row" aria-label="Analiz yardimci filtreleri">
        <span className="operation-inline-filter-pill">Tum sorular</span>
        <span className="operation-inline-filter-pill">Yanita gore sirali</span>
        <span className="operation-inline-filter-pill">Canli veriyle uyumlu</span>
      </div>
      {analytics && analytics.questionSummaries.length > 0 ? (
        <div className="operation-question-grid">
          {analytics.questionSummaries.map((summary) => {
            const presentation = getQuestionChartPresentation(summary);
            const hasData = summary.breakdown.some((item) => item.count > 0);

            return (
              <article key={summary.questionId} className="operation-question-card">
                <div className="operation-chart-head">
                  <div>
                    <span className="operation-kicker">{`Soru ${summary.questionOrder}`}</span>
                    <h3>{summary.questionTitle}</h3>
                  </div>
                  <span className="operation-question-meta">%{summary.responseRate} kapsama</span>
                </div>
                <div className="operation-question-stat-row">
                  <span className="operation-inline-filter-pill is-type">{getQuestionTypeLabel(summary.questionType)}</span>
                  <span className="operation-inline-filter-pill">{summary.answeredCount} yanitlayan</span>
                  <span className="operation-inline-filter-pill">{summary.respondedContactCount} yanit veren kisi</span>
                  {summary.averageRating !== null ? (
                    <span className="operation-inline-filter-pill is-emphasis">Ort. {summary.averageRating.toFixed(1)}</span>
                  ) : null}
                </div>
                {summary.dropOffCount > 0 ? (
                  <div className="operation-question-support-row">
                    <span>Bu sorudan sonra akistan cikan</span>
                    <strong>{summary.dropOffCount} kisi</strong>
                    <small>%{summary.dropOffRate}</small>
                  </div>
                ) : null}
                {hasData ? renderSummaryChart(summary) : <div className="operation-mini-empty">{presentation.empty}</div>}
                {summary.sampleResponses.length > 0 ? (
                  <div className="operation-open-response-list">
                    {summary.sampleResponses.map((response, index) => (
                      <div key={`${summary.questionId}-sample-${index}`} className="operation-open-response-item">
                        {response}
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="operation-mini-empty">Bu ankette henuz soru bazli gosterilecek cevap verisi yok.</div>
      )}
    </div>
  );

  const renderAudienceDistribution = () => (
    <div className="operation-analytics-stack">
      <div className="operation-analytics-grid operation-analytics-grid-audience">
        <article className="operation-chart-card">
          <div className="operation-chart-head">
            <div>
              <span className="operation-kicker">Demografik dagilim</span>
              <h3>Yanitlardan uretilen kirilimlar</h3>
            </div>
          </div>
          {demographicBreakdowns.length > 0 ? (
            <div className="operation-question-grid">
              {demographicBreakdowns.map((group) => (
                <article key={group.key} className="operation-question-card">
                  <div className="operation-chart-head">
                    <div>
                      <span className="operation-kicker">{group.questionCode}</span>
                      <h3>{group.label}</h3>
                    </div>
                    <span className="operation-question-meta">{group.answeredCount} yanit</span>
                  </div>
                  {group.breakdown.length > 0 ? renderAudienceChart(group.breakdown, group.answeredCount, group.label) : (
                    <div className="operation-mini-empty">Bu soru icin dagilim olusturacak kadar gecerli cevap bulunmuyor.</div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="operation-audience-empty-state">
              <strong>Demografik kirilim olusmadi</strong>
              <p>Bu operasyona bagli ankette yas, sehir veya cinsiyet gibi demografik soru bulunmuyor ya da cevaplar kirilim uretmek icin yeterli degil.</p>
              <div className="operation-response-health operation-response-health-extended">
                <div className="operation-response-health-item">
                  <span>Hedef kitle</span>
                  <strong>{operation?.surveyAudience?.trim() || "Tanimsiz"}</strong>
                </div>
                <div className="operation-response-health-item">
                  <span>Toplam yanit</span>
                  <strong>{analytics?.totalResponses ?? 0}</strong>
                </div>
                <div className="operation-response-health-item">
                  <span>Demografik soru</span>
                  <strong>0</strong>
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="operation-chart-card">
          <div className="operation-chart-head">
            <div>
              <span className="operation-kicker">Kitle baglami</span>
              <h3>Bagli anket ozetleri</h3>
            </div>
          </div>
          <div className="operation-contact-glimpse-list">
            <div className="operation-contact-glimpse-item">
              <div>
                <strong>Demografik soru durumu</strong>
                <span>{demographicBreakdowns.length > 0 ? `${demographicBreakdowns.length} demografik soru analytics'e baglandi.` : "Analytics'te demografik soru tespit edilmedi."}</span>
              </div>
            </div>
            <div className="operation-contact-glimpse-item">
              <div>
                <strong>Hedef kitle</strong>
                <span>{operation?.surveyAudience?.trim() || "Hedef kitle bilgisi henuz tanimli degil."}</span>
              </div>
            </div>
            <div className="operation-contact-glimpse-item">
              <div>
                <strong>Anket hedefi</strong>
                <span>{operation?.surveyGoal?.trim() || "Anket hedef ozeti tanimlanmamis."}</span>
              </div>
            </div>
            <div className="operation-contact-glimpse-item">
              <div>
                <strong>Operasyon sahibi</strong>
                <span>{operation?.owner?.trim() || "Sahip bilgisi bulunmuyor."}</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );

  const renderOverview = () => (
    renderQuestionInsights()
  );

  const renderHealthMetrics = () => (
    <article className="operation-chart-card">
      <div className="operation-chart-head">
        <div>
          <span className="operation-kicker">Saglik gostergeleri</span>
          <h3>Cagri operasyon durumu</h3>
        </div>
      </div>
      <div className="operation-response-health operation-response-health-extended">
        <div className="operation-response-health-item">
          <span>Hazirlanan is</span>
          <strong>{analytics?.totalPreparedJobs ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Cagri denemesi</span>
          <strong>{analytics?.totalCallsAttempted ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Kuyrukta</span>
          <strong>{analytics?.queuedJobs ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Aktif is</span>
          <strong>{analytics?.inProgressJobs ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Basarisiz cagrilar</span>
          <strong>{analytics?.failedCallJobs ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Atlanan cagrilar</span>
          <strong>{analytics?.skippedCallJobs ?? 0}</strong>
        </div>
      </div>
    </article>
  );

  const renderHealthStatus = () => (
    <article className="operation-chart-card">
      <div className="operation-chart-head">
        <div>
          <span className="operation-kicker">Oran ozeti</span>
          <h3>Temas ve yanit kalitesi</h3>
        </div>
      </div>
      <div className="operation-response-health operation-response-health-extended">
        <div className="operation-response-health-item">
          <span>Cevap orani (kisi bazli)</span>
          <strong>%{analytics?.responseRate ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Yanit veren kisi</span>
          <strong>{analytics?.respondedContacts ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Tamamlama orani (yanit bazli)</span>
          <strong>%{analytics?.completionRate ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Tam yanit</span>
          <strong>{analytics?.completedResponses ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Kismi yanit</span>
          <strong>{analytics?.partialResponses ?? 0}</strong>
        </div>
        <div className="operation-response-health-item">
          <span>Ortalama soru tamamlama</span>
          <strong>%{analytics?.averageCompletionPercent ?? 0}</strong>
        </div>
      </div>
    </article>
  );

  const renderHealth = () => (
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
        {renderOutcomeBreakdown()}
        {renderInsights()}
      </div>
      <div className="operation-analytics-grid">
        {renderHealthMetrics()}
        {renderHealthStatus()}
      </div>
    </div>
  );

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="operation-empty-state">
          <strong>Analitik yukleniyor</strong>
          <p>Operasyona ait cagri ve yanit toplamlari getiriliyor.</p>
        </div>
      );
    }

    if (!analytics || (analytics.totalResponses === 0 && analytics.totalPreparedJobs === 0)) {
      return renderEmptyState();
    }

    switch (view) {
      case "health":
        return renderHealth();
      case "questions":
        return renderQuestionInsights();
      case "audience":
        return renderAudienceDistribution();
      case "overview":
      default:
        return renderOverview();
    }
  };

  function renderSummaryChart(summary: OperationAnalytics["questionSummaries"][number]) {
    switch (summary.chartKind) {
      case "CHOICE":
      case "BINARY":
        return renderBarRows(summary.breakdown);
      case "RATING":
        return renderRatingScaleChart(summary.breakdown, summary.answeredCount, summary.averageRating);
      case "MULTI_CHOICE":
        return renderBarRows(summary.breakdown);
      case "OPEN_ENDED":
      default:
        return renderOpenEndedState();
    }
  }

  function renderAudienceChart(
    breakdown: OperationAnalytics["audienceBreakdowns"][number]["breakdown"],
    answeredCount: number,
    title: string,
  ) {
    return breakdown.length <= 5 ? renderDonutChart(breakdown, answeredCount, title) : renderBarRows(breakdown);
  }

  function renderDonutChart(
    breakdown: Array<{ label: string; count: number; percentage: number }>,
    total: number,
    title: string,
  ) {
    const visibleItems = breakdown.filter((item) => item.count > 0);
    const gradient = visibleItems.length > 0
      ? `conic-gradient(${visibleItems
        .map((item, index, items) => {
          const start = items.slice(0, index).reduce((sum, current) => sum + current.percentage, 0);
          const end = start + item.percentage;
          return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${end}%`;
        })
        .join(", ")})`
      : "conic-gradient(#dbe7f2 0% 100%)";

    return (
      <div className="operation-summary-chart-grid">
        <div className="operation-summary-donut-chart" style={{ background: gradient }} aria-label={`${title} dagilim grafigi`}>
          <div className="operation-summary-donut-center">
            <strong>{total}</strong>
            <span>yanit</span>
          </div>
        </div>
        <div className="operation-summary-chart-stack">
          <div className="operation-summary-chart-legend">
            {visibleItems.map((item, index) => (
              <div key={`${title}-${item.label}`} className="operation-summary-legend-row">
                <span className="operation-summary-legend-dot" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                <strong>{item.label}</strong>
                <span>{item.count}</span>
                <span>%{item.percentage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderRatingScaleChart(
    breakdown: Array<{ label: string; count: number; percentage: number }>,
    _total: number,
    averageRating: number | null,
  ) {
    const score = averageRating !== null ? Math.max(0, Math.min(10, averageRating)) : null;

    return (
      <div className="operation-rating-scale-chart">
        <div className="operation-rating-scale-stat operation-rating-scale-stat-single">
          <div className="operation-rating-scale-copy">
            <span>Ortalama puan</span>
            <div className="operation-rating-scale-scoreline">
              <strong>{score !== null ? score.toFixed(1) : "-"}</strong>
              <small>/10</small>
            </div>
          </div>
          <div className="operation-rating-scale-meter" aria-label="Ortalama puan olcegi">
            <div className="operation-rating-scale-meter-track">
              <div
                className="operation-rating-scale-meter-fill"
                style={{ width: `${score !== null ? score * 10 : 0}%` }}
              />
            </div>
            <div className="operation-rating-scale-meter-ticks">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        </div>
        {breakdown.length > 0 ? renderBarRows(breakdown) : null}
      </div>
    );
  }

  function renderBarRows(items: Array<{ label: string; count: number; percentage: number }>) {
    return (
      <div className="operation-bar-list compact">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="operation-bar-row">
            <div className="operation-bar-copy">
              <strong>{item.label}</strong>
              <span>{item.count}</span>
            </div>
            <div className="operation-bar-track">
              <div
                className="operation-bar-fill"
                style={{
                  width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%`,
                  background: `linear-gradient(90deg, ${CHART_COLORS[index % CHART_COLORS.length]}, rgba(185, 215, 251, 0.98))`,
                }}
              />
            </div>
            <span className="operation-bar-value">%{item.percentage}</span>
          </div>
        ))}
      </div>
    );
  }

  function renderOpenEndedState() {
    return (
      <div className="operation-mini-empty">
        Acik uclu sorular Google Forms&apos;ta oldugu gibi ornek yanit listesiyle gosterilir.
      </div>
    );
  }

  return <SectionCard title={titleByView[view]}>{renderBody()}</SectionCard>;
}
