import { Operation, OperationAnalytics, OperationAnalyticsQuestionSummary } from "@/lib/types";

type OperationLifecycleStatus = Extract<Operation["status"], "Draft" | "Ready" | "Running" | "Completed" | "Failed">;

export const OPERATION_STATUS_BADGE_CONFIG: Record<OperationLifecycleStatus, { tone: "neutral" | "ready" | "live" | "success" | "danger"; label: string }> = {
  Draft: { tone: "neutral", label: "Taslak" },
  Ready: { tone: "ready", label: "Hazir" },
  Running: { tone: "live", label: "Yurutuluyor" },
  Completed: { tone: "success", label: "Tamamlandi" },
  Failed: { tone: "danger", label: "Basarisiz" },
};

export function getOperationStatusConfig(operation: Operation | null, contactCount: number) {
  const status = (operation?.status ?? "Draft") as OperationLifecycleStatus;
  const badge = OPERATION_STATUS_BADGE_CONFIG[status];

  switch (status) {
    case "Draft":
      return {
        badge,
        title: "Hazirlik tamamlanmadi",
        summary: "Bu operasyon henuz yurutmeye acilacak noktada degil.",
        nextStepTitle: contactCount > 0 ? "Eksik onkosullari tamamla" : "Kisi yukle",
        nextStepText: !operation?.readiness.surveyPublished
          ? "Bagli anketin yayin durumunu netlestirin. Yayinlanmamis anketle akis baslatilmaz."
          : contactCount === 0
            ? "Bir sonraki mantikli adim kisi yuklemek. En az bir kisi olmadan akis baslatilamaz."
            : "Hazirlik listesinde kalan blokajlari kapatarak operasyonu Hazir durumuna tasiyin.",
      };
    case "Ready":
      return {
        badge,
        title: "Operasyon baslatmaya hazir",
        summary: "Tum temel onkosullar tamam. Bu sayfa artik operasyonun baslatma ve ilk izleme yuzeyi.",
        nextStepTitle: "Akisi baslat",
        nextStepText: "Akis baslatildiginda cagri isleri hazirlanir ve cevap analitigi bu sayfada canli guncellenir.",
      };
    case "Running":
      return {
        badge,
        title: "Canli operasyon yurutuluyor",
        summary: "Bu operasyon aktif calisiyor. Ilk bakista durum, is akisi ve donen cevaplar gorunmeli.",
        nextStepTitle: "Yurutmeyi izle",
        nextStepText: "Baslatma yeniden acilmaz. Bu asamada isleri ve canli sonuc dagilimlarini takip edin.",
      };
    case "Completed":
      return {
        badge,
        title: "Operasyon tamamlandi",
        summary: "Yurutme kapandi. Bu sayfa sonuc ozeti ve soru bazli icgoruler icin ana kontrol yuzeyi olmaya devam eder.",
        nextStepTitle: "Sonuclari kullan",
        nextStepText: "Sonuclari inceleyin, disa aktarim alin ve gerekirse daha detayli analytics akisina gecin.",
      };
    case "Failed":
      return {
        badge,
        title: "Operasyon durdu",
        summary: "Yurutme sirasinda bir problem yasandi; buna ragmen toplanan veri saklandi.",
        nextStepTitle: "Guvenli inceleme",
        nextStepText: "Sorunlu isleri acin, toplanan kismi veriyi inceleyin ve gerekirse operasyonu yeniden hazirlayin.",
      };
  }
}

export function getAnalyticsEmptyState(status: Operation["status"], contactCount: number) {
  switch (status) {
    case "Draft":
      return {
        title: "Henuz cagri sonucu yok",
        description: "Analitik paneller, yurutme baslayip gorusme yanitlari gelmeye basladiginda burada gorunur.",
      };
    case "Ready":
      return {
        title: "Yurutme oncesi gorunum",
        description: `${contactCount} kisi icin operasyon hazir. Cevap grafikleri akis basladiktan sonra dolar.`,
      };
    case "Running":
      return {
        title: "Canli veri bekleniyor",
        description: "Ilk yanitlar geldikce durum dagilimlari ve soru bazli paneller otomatik guncellenir.",
      };
    case "Failed":
      return {
        title: "Kismi veri yok",
        description: "Bu hata durumunda henuz gosterilecek cevap verisi birikmedi.",
      };
    case "Completed":
    default:
      return {
        title: "Sonuc verisi yok",
        description: "Bu operasyon tamamlanmis olsa da cevap kaydi bulunmuyor.",
      };
  }
}

export function getPrimaryAction(operation: Operation | null, isStarting: boolean) {
  if (!operation) {
    return { label: "Yukleniyor", disabled: true };
  }

  if (operation.status === "Ready") {
    return { label: isStarting ? "Akis baslatiliyor..." : "Akisi baslat", disabled: isStarting };
  }

  if (operation.status === "Draft") {
    return {
      label: operation.readiness.contactsLoaded ? "Onkosullari tamamla" : "Kisi yukle",
      disabled: true,
    };
  }

  return { label: "Akis zaten acik", disabled: true };
}

export function getAnalyticsKpis(operation: Operation | null, analytics: OperationAnalytics | null) {
  if (!operation || !analytics) {
    return [];
  }

  const isFinished = operation.status === "Completed";
  const isRunning = operation.status === "Running";
  const isFailed = operation.status === "Failed";

  return [
    {
      label: isRunning ? "Toplam aranmis kisi" : "Hazirlanan kisi havuzu",
      value: String(analytics.totalCallsAttempted || analytics.totalContacts),
      detail: `${analytics.totalContacts} toplam kisi`,
      tone: "neutral" as const,
    },
    {
      label: "Tamamlanan gorusme",
      value: String(analytics.completedResponses),
      detail: isRunning ? "Canli olarak artar" : "Tamamlanan cevap kayitlari",
      tone: "positive" as const,
    },
    {
      label: isFinished ? "Tamamlanma orani" : "Katilim orani",
      value: `%${Math.round((isFinished ? analytics.completionRate : analytics.participationRate) * 10) / 10}`,
      detail: isFailed ? "Kismi veri bazinda hesaplandi" : "Operasyon geneli",
      tone: isFailed ? "warning" as const : "positive" as const,
    },
    {
      label: "Basarisiz / yanitsiz",
      value: String(analytics.failedCallJobs + analytics.abandonedResponses + analytics.invalidResponses),
      detail: "Izleme gerektiren sonuclar",
      tone: isFailed ? "danger" as const : "warning" as const,
    },
  ];
}

export function getQuestionChartPresentation(summary: OperationAnalyticsQuestionSummary) {
  switch (summary.chartKind) {
    case "RATING":
      return {
        eyebrow: "Rating dagilimi",
        empty: summary.emptyStateMessage ?? "Puan verisi geldikce dagilim olusur.",
      };
    case "BINARY":
      return {
        eyebrow: "Evet / Hayir dagilimi",
        empty: summary.emptyStateMessage ?? "Ikili cevap dagilimi henuz olusmadi.",
      };
    case "MULTI_CHOICE":
      return {
        eyebrow: "Coklu secim dagilimi",
        empty: summary.emptyStateMessage ?? "Coklu secim dagilimi henuz olusmadi.",
      };
    case "OPEN_ENDED":
      return {
        eyebrow: "Acik uclu sinyal",
        empty: summary.emptyStateMessage ?? "Acik uclu yanit sinyali henuz olusmadi.",
      };
    case "CHOICE":
    default:
      return {
        eyebrow: "Secenek dagilimi",
        empty: summary.emptyStateMessage ?? "Secenek dagilimi henuz olusmadi.",
      };
  }
}
