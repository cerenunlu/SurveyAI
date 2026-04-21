import { Operation, OperationAnalytics, OperationAnalyticsQuestionSummary } from "@/lib/types";

type OperationLifecycleStatus = Extract<
  Operation["status"],
  "Draft" | "Ready" | "Scheduled" | "Running" | "Paused" | "Completed" | "Failed" | "Cancelled"
>;

export const OPERATION_STATUS_BADGE_CONFIG: Record<
  OperationLifecycleStatus,
  { tone: "neutral" | "ready" | "live" | "warning" | "success" | "danger"; label: string }
> = {
  Draft: { tone: "neutral", label: "Taslak" },
  Ready: { tone: "ready", label: "Hazir" },
  Scheduled: { tone: "ready", label: "Planlandi" },
  Running: { tone: "live", label: "Yurutuluyor" },
  Paused: { tone: "warning", label: "Duraklatildi" },
  Completed: { tone: "success", label: "Tamamlandi" },
  Failed: { tone: "danger", label: "Basarisiz" },
  Cancelled: { tone: "warning", label: "Iptal edildi" },
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
    case "Scheduled":
      return {
        badge,
        title: "Operasyon yeniden baslatilmaya hazir",
        summary: "Gecmis cagri verileri temizlendi. Kisi listesi korunarak akis sifirlandi.",
        nextStepTitle: "Akisi yeniden baslat",
        nextStepText: "Baslattiginizda kisiler icin yeni cagri isleri olusturulur ve operasyon bastan ilerler.",
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
    case "Paused":
      return {
        badge,
        title: "Operasyon duraklatildi",
        summary: "Aktif gorusme bittikten sonra sistem yeni cagrilara gecmez. Hazir oldugunuzda devam ettirebilirsiniz.",
        nextStepTitle: "Akisi devam ettir",
        nextStepText: "Devam ettir aksiyonu siradaki bekleyen cagri isini yeniden kuyruga alir.",
      };
    case "Failed":
      return {
        badge,
        title: "Operasyon durdu",
        summary: "Yurutme sirasinda bir problem yasandi; buna ragmen toplanan veri saklandi.",
        nextStepTitle: "Guvenli inceleme",
        nextStepText: "Sorunlu isleri acin, toplanan kismi veriyi inceleyin ve gerekirse operasyonu yeniden hazirlayin.",
      };
    case "Cancelled":
      return {
        badge,
        title: "Operasyon iptal edildi",
        summary: "Akis manuel olarak sonlandirildi. Yeni cagrilar bu durumdayken baslamaz.",
        nextStepTitle: "Durumu gozden gecir",
        nextStepText: "Gerekirse yeni bir operasyon acin veya operasyonu yeniden planlayin.",
      };
    default:
      return {
        badge: OPERATION_STATUS_BADGE_CONFIG.Draft,
        title: "Durum bilgisi guncelleniyor",
        summary: "Operasyon durumu okunuyor.",
        nextStepTitle: "Bekleyin",
        nextStepText: "Durum bilgisi yuklenirken bu kart guvenli varsayilan icerikle gosterilir.",
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
    case "Scheduled":
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
    case "Cancelled":
      return {
        title: "Operasyon iptal edildi",
        description: "Iptal edilen operasyonlarda yeni veri akisi olmaz.",
      };
    case "Paused":
      return {
        title: "Akis duraklatildi",
        description: "Mevcut gorusme tamamlandiktan sonra yeni cagriya gecilmez. Devam ettirdiginizde veri akisi surer.",
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
    return { label: "Akisi baslat", disabled: true, hint: "Operasyon bilgisi yukleniyor.", intent: "start" as const };
  }

  if (operation.status === "Ready") {
    return {
      label: isStarting ? "Akis baslatiliyor..." : "Akisi baslat",
      disabled: isStarting,
      hint: "Operasyon hazir. Akisi bu aksiyondan baslatabilirsiniz.",
      intent: "start" as const,
    };
  }

  if (operation.status === "Scheduled") {
    return {
      label: isStarting ? "Akis baslatiliyor..." : "Akisi yeniden baslat",
      disabled: isStarting,
      hint: "Operasyon sifirlandi. Kisi listesi korunarak akisi yeniden baslatabilirsiniz.",
      intent: "start" as const,
    };
  }

  if (operation.status === "Draft") {
    return {
      label: "Akisi baslat",
      disabled: true,
      hint: operation.readiness.blockingReasons[0]
        ?? (operation.readiness.contactsLoaded ? "Baslatmadan once onkosullari tamamlayin." : "Baslatmadan once kisi yukleyin."),
      intent: "start" as const,
    };
  }

  if (operation.status === "Running") {
    return {
      label: "Durdur",
      disabled: false,
      hint: "Mevcut gorusme tamamlandiktan sonra yeni cagrilar baslatilmaz.",
      intent: "pause" as const,
    };
  }

  if (operation.status === "Paused") {
    return {
      label: "Devam ettir",
      disabled: false,
      hint: "Duraklatilan operasyonu siradaki bekleyen cagridan devam ettirir.",
      intent: "resume" as const,
    };
  }

  if (operation.status === "Completed") {
    return {
      label: "Akis tamamlandi",
        disabled: true,
      hint: "Tamamlanan operasyonlarda baslatma aksiyonu yeniden acilmaz.",
      intent: "start" as const,
    };
  }

  if (operation.status === "Failed") {
    return {
      label: "Akis durdu",
      disabled: true,
      hint: "Operasyon hata ile durdu. Detaylari inceleyip yeniden hazirlamaniz gerekir.",
      intent: "start" as const,
    };
  }

  if (operation.status === "Cancelled") {
    return {
      label: "Operasyon iptal edildi",
      disabled: true,
      hint: "Iptal edilen operasyon bu ekrandan yeniden baslatilamaz.",
      intent: "start" as const,
    };
  }

  return {
    label: "Akisi baslat",
    disabled: true,
    hint: "Bu durumdayken akis baslatilamaz.",
    intent: "start" as const,
  };
}

export function getAnalyticsKpis(operation: Operation | null, analytics: OperationAnalytics | null) {
  if (!operation || !analytics) {
    return [];
  }

  const isRunning = operation.status === "Running";
  const isFailed = operation.status === "Failed";
  const hasResponses = analytics.totalResponses > 0;

  return [
    {
      label: "Toplam kisi",
      value: String(analytics.totalContacts),
      detail: "Operasyona yuklenen kisiler",
      tone: "neutral" as const,
    },
    {
      label: "Toplam cagri isi",
      value: String(analytics.totalCallJobs),
      detail: `${analytics.totalPreparedJobs} hazir is kaydi`,
      tone: "neutral" as const,
    },
    {
      label: "Cagri denemesi",
      value: String(analytics.totalCallsAttempted),
      detail: isRunning ? "Canli olarak artar" : "Kuyruktan cikan isler",
      tone: "neutral" as const,
    },
    {
      label: "Tamamlanan cagri",
      value: String(analytics.totalCompletedCalls),
      detail: "Basariyla kapanan aramalar",
      tone: "positive" as const,
    },
    {
      label: "Basarisiz cagri",
      value: String(analytics.failedCallJobs),
      detail: "Takip gerektiren cagri isleri",
      tone: isFailed ? "danger" as const : "warning" as const,
    },
    {
      label: "Toplam yanit",
      value: String(analytics.respondedContacts),
      detail: `${analytics.completedResponses} tam yanit, ${analytics.partialResponses} kismi yanit`,
      tone: hasResponses ? "positive" as const : "neutral" as const,
    },
    {
      label: "Tamamlanma orani",
      value: `%${analytics.completionRate}`,
      detail: hasResponses ? "Tamamlanan yanit / toplam yanit" : "Henuz yanit yok",
      tone: hasResponses ? "positive" as const : "neutral" as const,
    },
    {
      label: "Cevap orani",
      value: `%${analytics.personResponseRate}`,
      detail: "Yanit veren kisi / hedef kisi",
      tone: isFailed ? "warning" as const : "positive" as const,
    },
  ];
}

export function getAnalyticsKpisCompact(operation: Operation | null, analytics: OperationAnalytics | null) {
  if (!operation || !analytics) {
    return [];
  }

  const isRunning = operation.status === "Running";
  const isFailed = operation.status === "Failed";
  const hasResponses = analytics.totalResponses > 0;
  const riskLoad = analytics.failedCallJobs + analytics.skippedCallJobs;

  return [
    {
      label: "Hedef kisi",
      value: String(analytics.totalContacts),
      detail: "",
      tone: "neutral" as const,
    },
    {
      label: "Cagri denemesi",
      value: String(analytics.totalCallsAttempted),
      detail: isRunning ? "Canli olarak artar" : `${analytics.queuedJobs} kuyrukta, ${analytics.inProgressJobs} aktif`,
      tone: "neutral" as const,
    },
    {
      label: "Yanit veren kisi",
      value: String(analytics.respondedContacts),
      detail: `${analytics.completedResponses} tam yanit, ${analytics.partialResponses} kismi yanit`,
      tone: hasResponses ? "positive" as const : "neutral" as const,
    },
    {
      label: "Cevap orani",
      value: `%${analytics.personResponseRate}`,
      detail: hasResponses
        ? `Yanit veren kisi / hedef kisi, %${analytics.completionRate} tamamlanan yanit`
        : "Yanit veren kisi / hedef kisi",
      tone: isFailed || riskLoad > 0 ? "warning" as const : "positive" as const,
    },
  ];
}

export function getQuestionChartPresentation(summary: OperationAnalyticsQuestionSummary) {
  switch (summary.chartKind) {
    case "RATING":
      return {
        eyebrow: "Puan dagilimi",
        empty: summary.emptyStateMessage ?? "Puan verisi geldikce dagilim olusur.",
      };
    case "NUMBER":
      return {
        eyebrow: "Sayisal dagilim",
        empty: summary.emptyStateMessage ?? "Sayisal veriler geldikce dagilim olusur.",
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
        eyebrow: "Acik uclu yanitlar",
        empty: summary.emptyStateMessage ?? "Bu soru icin henuz gosterilecek dagilim yok.",
      };
    case "CHOICE":
    default:
      return {
        eyebrow: "Secenek dagilimi",
        empty: summary.emptyStateMessage ?? "Secenek dagilimi henuz olusmadi.",
      };
  }
}
