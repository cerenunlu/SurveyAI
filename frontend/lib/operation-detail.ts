import { Operation, OperationAnalytics, OperationAnalyticsQuestionSummary } from "@/lib/types";

type OperationLifecycleStatus = Extract<Operation["status"], "Draft" | "Ready" | "Running" | "Completed" | "Failed">;

export const OPERATION_STATUS_BADGE_CONFIG: Record<OperationLifecycleStatus, { tone: "neutral" | "ready" | "live" | "success" | "danger"; label: string }> = {
  Draft: { tone: "neutral", label: "Taslak" },
  Ready: { tone: "ready", label: "Hazır" },
  Running: { tone: "live", label: "Yürütülüyor" },
  Completed: { tone: "success", label: "Tamamlandı" },
  Failed: { tone: "danger", label: "Başarısız" },
};

export function getOperationStatusConfig(operation: Operation | null, contactCount: number) {
  const status = (operation?.status ?? "Draft") as OperationLifecycleStatus;
  const badge = OPERATION_STATUS_BADGE_CONFIG[status];

  switch (status) {
    case "Draft":
      return {
        badge,
        title: "Hazırlık tamamlanmadı",
        summary: "Bu operasyon henüz yürütmeye açılacak noktada değil.",
        nextStepTitle: contactCount > 0 ? "Eksik önkoşulları tamamla" : "Kişi yükle",
        nextStepText: !operation?.readiness.surveyPublished
          ? "Bağlı anketin yayın durumunu netleştirin. Yayınlanmamış anketle akış başlatılmaz."
          : contactCount === 0
            ? "Bir sonraki mantıklı adım kişi yüklemek. En az bir kişi olmadan akış başlatılamaz."
            : "Hazırlık listesinde kalan blokajları kapatarak operasyonu Hazır durumuna taşıyın.",
      };
    case "Ready":
      return {
        badge,
        title: "Operasyon başlatmaya hazır",
        summary: "Tüm temel önkoşullar tamam. Bu sayfa artık operasyonun başlatma ve ilk izleme yüzeyi.",
        nextStepTitle: "Akışı başlat",
        nextStepText: "Akış başlatıldığında çağrı işleri hazırlanır ve cevap analitiği bu sayfada canlı güncellenir.",
      };
    case "Running":
      return {
        badge,
        title: "Canlı operasyon yürütülüyor",
        summary: "Bu operasyon aktif çalışıyor. İlk bakışta durum, iş akışı ve dönen cevaplar görünmeli.",
        nextStepTitle: "Yürütmeyi izle",
        nextStepText: "Başlatma yeniden açılmaz. Bu aşamada işleri ve canlı sonuç dağılımlarını takip edin.",
      };
    case "Completed":
      return {
        badge,
        title: "Operasyon tamamlandı",
        summary: "Yürütme kapandı. Bu sayfa sonuç özeti ve soru bazlı içgörüler için ana kontrol yüzeyi olmaya devam eder.",
        nextStepTitle: "Sonuçları kullan",
        nextStepText: "Sonuçları inceleyin, dışa aktarım alın ve gerekirse daha detaylı analytics akışına geçin.",
      };
    case "Failed":
      return {
        badge,
        title: "Operasyon durdu",
        summary: "Yürütme sırasında bir problem yaşandı; buna rağmen toplanan veri saklandı.",
        nextStepTitle: "Güvenli inceleme",
        nextStepText: "Sorunlu işleri açın, toplanan kısmi veriyi inceleyin ve gerekirse operasyonu yeniden hazırlayın.",
      };
  }
}

export function getAnalyticsEmptyState(status: Operation["status"], contactCount: number) {
  switch (status) {
    case "Draft":
      return {
        title: "Henüz çağrı sonucu yok",
        description: "Analitik paneller, yürütme başlayıp görüşme yanıtları gelmeye başladığında burada görünür.",
      };
    case "Ready":
      return {
        title: "Yürütme öncesi görünüm",
        description: `${contactCount} kişi için operasyon hazır. Cevap grafikleri akış başladıktan sonra dolar.`,
      };
    case "Running":
      return {
        title: "Canlı veri bekleniyor",
        description: "İlk yanıtlar geldikçe durum dağılımları ve soru bazlı paneller otomatik güncellenir.",
      };
    case "Failed":
      return {
        title: "Kısmi veri yok",
        description: "Bu hata durumunda henüz gösterilecek cevap verisi birikmedi.",
      };
    case "Completed":
    default:
      return {
        title: "Sonuç verisi yok",
        description: "Bu operasyon tamamlanmış olsa da cevap kaydı bulunmuyor.",
      };
  }
}

export function getPrimaryAction(operation: Operation | null, isStarting: boolean) {
  if (!operation) {
    return { label: "Yükleniyor", disabled: true };
  }

  if (operation.status === "Ready") {
    return { label: isStarting ? "Akış başlatılıyor..." : "Akışı başlat", disabled: isStarting };
  }

  if (operation.status === "Draft") {
    return {
      label: operation.readiness.contactsLoaded ? "Önkoşulları tamamla" : "Kişi yükle",
      disabled: true,
    };
  }

  return { label: "Akış zaten açık", disabled: true };
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
      label: isRunning ? "Toplam aranmış kişi" : "Hazırlanan kişi havuzu",
      value: String(analytics.totalCallsAttempted || analytics.totalContacts),
      detail: `${analytics.totalContacts} toplam kişi`,
      tone: "neutral" as const,
    },
    {
      label: "Tamamlanan görüşme",
      value: String(analytics.completedResponses),
      detail: isRunning ? "Canlı olarak artar" : "Tamamlanan cevap kayıtları",
      tone: "positive" as const,
    },
    {
      label: isFinished ? "Tamamlanma oranı" : "Katılım oranı",
      value: `%${Math.round((isFinished ? analytics.completionRate : analytics.participationRate) * 10) / 10}`,
      detail: isFailed ? "Kısmi veri bazında hesaplandı" : "Operasyon geneli",
      tone: isFailed ? "warning" as const : "positive" as const,
    },
    {
      label: "Başarısız / yanıtsız",
      value: String(analytics.failedCallJobs + analytics.abandonedResponses + analytics.invalidResponses),
      detail: "İzleme gerektiren sonuçlar",
      tone: isFailed ? "danger" as const : "warning" as const,
    },
  ];
}

export function getQuestionChartPresentation(summary: OperationAnalyticsQuestionSummary) {
  switch (summary.chartKind) {
    case "RATING":
      return {
        eyebrow: "Rating dağılımı",
        empty: summary.emptyStateMessage ?? "Puan verisi geldikçe dağılım oluşur.",
      };
    case "BINARY":
      return {
        eyebrow: "Evet / Hayır dağılımı",
        empty: summary.emptyStateMessage ?? "İkili cevap dağılımı henüz oluşmadı.",
      };
    case "MULTI_CHOICE":
      return {
        eyebrow: "Çoklu seçim dağılımı",
        empty: summary.emptyStateMessage ?? "Çoklu seçim dağılımı henüz oluşmadı.",
      };
    case "OPEN_ENDED":
      return {
        eyebrow: "Açık uçlu sinyal",
        empty: summary.emptyStateMessage ?? "Açık uçlu yanıt sinyali henüz oluşmadı.",
      };
    case "CHOICE":
    default:
      return {
        eyebrow: "Seçenek dağılımı",
        empty: summary.emptyStateMessage ?? "Seçenek dağılımı henüz oluşmadı.",
      };
  }
}
