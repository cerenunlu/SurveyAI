export const tr = {
  shell: {
    brandSubtitle: "Arastirma Operasyonlari",
    sidebar: {
      expand: "Genislet",
      collapse: "Daralt",
      navigation: "Gezinme",
      dailyFocus: "Gunluk Odak",
      readinessTitle: "Operasyonel hazirlik",
      readinessDescription:
        "Sorunlari onceliklendirmek icin paneli kullanin; ardindan is akisini yurutmeye baslamak icin anketler, operasyonlar, kisiler ve arama operasyonlarina gecin.",
      closeNavigation: "Gezinmeyi kapat",
    },
    topbar: {
      menu: "Menu",
      searchPlaceholder: "Anket, operasyon, kisi ara...",
      notifications: "Bildirimler",
      createSurvey: "Anket olustur",
      languageLabel: "Dil",
      tr: "TR",
      en: "EN",
    },
    pageMeta: {
      dashboard: {
        title: "Operasyonlara Genel Bakis",
        subtitle:
          "Operasyon sagligini, anket hazirligini, kisi akislarini ve operasyonel sorunlari tek bir kontrol katmanindan takip edin.",
      },
      surveys: {
        title: "Anketler",
        subtitle: "Anket taslaklarini, yayin durumunu ve canli program envanterini yonetin.",
      },
      operations: {
        title: "Operasyonlar",
        subtitle: "Lansman hazirligini, aktif tempoyu ve cok kanalli yurutmeyi izleyin.",
      },
      contacts: {
        title: "Kisiler",
        subtitle: "Kisi dosyalarini dogrulanmis, segmentlenmis ve operasyon atamasina hazir tutun.",
      },
      analytics: {
        title: "Analitik",
        subtitle: "Portfoy genelinde tamamlanma, yanit artisi ve teslimat performansini inceleyin.",
      },
      callingOps: {
        title: "Arama Operasyonlari",
        subtitle: "Kuyruk hacmini, arama isleri hazirligini ve koordinator dikkat noktalarini izleyin.",
      },
      surveyCreate: {
        title: "Yeni Anket",
        subtitle: "Baslik, aciklama ve soru akisini tek bir duzenleme ekraninda hazirlayin.",
      },
      surveyDetail: {
        title: "Anket Detayi",
        subtitle: "Anket sagligini, yanit durumunu ve operasyonel notlari inceleyin.",
      },
      operationCreate: {
        title: "Yeni Operasyon",
        subtitle: "Yayinlanmis bir anket secin ve cagri sureci icin yeni bir operasyon hazirlayin.",
      },
      operationDetail: {
        title: "Operasyon Detayi",
        subtitle: "Tempoyu, kanal karmasini ve yasam dongusu hareketlerini tek ekranda gorun.",
      },
      operationJobs: {
        title: "Call Job Izleme",
        subtitle: "Operasyonun hazirlanan cagri islerini, durumlarini ve sonuclarini takip edin.",
      },
    },
    navigation: {
      dashboard: { label: "Panel", description: "Operasyon ozeti" },
      surveys: { label: "Anketler", description: "Taslaklar ve canli calismalar" },
      operations: { label: "Operasyonlar", description: "Lansman ve tempo" },
      contacts: { label: "Kisiler", description: "Yuklemeler ve dogrulama" },
      analytics: { label: "Analitik", description: "Performans ve trendler" },
      callingOps: { label: "Arama Operasyonlari", description: "Kuyruklar ve arama isleri" },
    },
    common: {
      viewAll: "Tumunu gor",
      open: "Ac",
      all: "Tum",
      active: "Aktif",
      paused: "Duraklatildi",
      completed: "Tamamlandi",
      draft: "Taslak",
      archived: "Arsivlendi",
      loading: "Yukleniyor",
      unavailable: "Su anda kullanilamiyor",
    },
    status: {
      live: "Canli",
      draft: "Taslak",
      archived: "Arsivlendi",
      active: "Aktif",
      ready: "Hazir",
      running: "Yurutuluyor",
      scheduled: "Planlandi",
      paused: "Duraklatildi",
      completed: "Tamamlandi",
      cancelled: "Iptal edildi",
      failed: "Basarisiz",
      retry: "Tekrar dene",
      invalid: "Gecersiz",
      pending: "Beklemede",
      queued: "Kuyrukta",
      inProgress: "Suruyor",
      skipped: "Atlandi",
    },
  },
  dashboard: {
    kpis: {
      surveysDetail: "Sirket genelinde erisilebilir anket kayitlari.",
      operationsDetail: "Panelde listelenen aktif operasyon envanteri.",
      contactsDetail: "Operasyonlardan yuklenen kisi kayitlari.",
    },
    hero: {
      eyebrow: "Urun Gorunumu",
      title: "Canli urun kayitlariyla beslenen temiz bir panel",
      description:
        "Bu genel bakis yalnizca backend destekli anket, operasyon ve kisi envanterini gosterir; boylece panel demo metriklerine kaymadan faydali kalir.",
      openSurveys: "Anketleri ac",
      openOperations: "Operasyonlari ac",
      openContacts: "Kisileri ac",
      surveysSynced: "Anketler",
      operationsSynced: "Operasyonlar",
      contactsSynced: "Kisiler",
      syncedSuffix: "senkronize",
    },
    unavailable: {
      title: "Bazi veriler gecici olarak kullanilamiyor",
      description: "Asagida yalnizca basariyla yuklenen backend bolumleri gosteriliyor.",
      nowUnavailable: "Su anda kullanilamiyor",
      single: "{{section}} backend uzerinden yuklenemedi.",
      multiple: "{{sections}} backend uzerinden tam olarak yuklenemedi.",
      surveys: "Anketler",
      operations: "Operasyonlar",
      contacts: "Kisiler",
    },
    sections: {
      recentSurveys: {
        title: "Son Anketler",
        description: "Backend tarafindan dondurulen en guncel anket kayitlari.",
        emptyTitle: "Henuz anket yok",
        emptyDescription: "Backend tarafinda olusturulan anket kayitlari burada gorunecek.",
      },
      recentOperations: {
        title: "Son Operasyonlar",
        description: "Backend API tarafindan desteklenen mevcut operasyon envanteri.",
        emptyTitle: "Henuz operasyon yok",
        emptyDescription: "Backend uzerinde olusturulan operasyon kayitlari burada gorunecek.",
      },
      recentContacts: {
        title: "Son Kisiler",
        description: "Backend'de saklanan operasyon kisi kayitlarindan yuklenen kisiler.",
        action: "Kisileri ac",
        emptyTitle: "Henuz kisi yok",
        emptyDescription: "Backend kayitlari hazir oldugunda yuklenen operasyon kisileri burada gorunecek.",
      },
      operationalAnalytics: {
        title: "Operasyonel Analitik",
        description: "Backend destekli throughput ve kalite metrikleri icin ayrilmistir.",
        emptyTitle: "Henuz mevcut degil",
        emptyDescription: "Tamamlanma, uyari ve arama operasyonu metrikleri backend gercek toplamlari sunana kadar gizli kalir.",
      },
    },
  },
  surveys: {
    hero: {
      eyebrow: "Anket Programlari",
      title: "Platformdaki her anket is akisi icin duzenli bir envanter.",
      description:
        "Bu sayfayi liste yonetimi, izleme ve detay navigasyonu icin temel merkez olarak kullanin. Yapisi gelecekteki filtreleme, arama ve backend veri baglantilari icin bilincli olarak tekrar kullanilabilir tutuldu.",
      createSurvey: "Anket olustur",
      importBlueprint: "Taslak ice aktar",
      chips: ["Canli durum rozetleri", "Tekrar kullanilabilir tablo bolumleri", "Duyarli kartlar ve tablolar"],
    },
    table: {
      title: "Anket portfoyu",
      description: "Backend API ile desteklenen canli anket envanteri.",
      columns: {
        survey: "Anket",
        status: "Durum",
        audience: "Kitle",
        completions: "Tamamlanma",
        responseRate: "Yanit orani",
        action: "Ac",
      },
      filters: {
        all: "Tumu",
        live: "Canli",
        draft: "Taslak",
        archived: "Arsivlendi",
      },
      states: {
        errorTitle: "Anketler yuklenemedi",
        loadingTitle: "Anketler yukleniyor",
        loadingDescription: "Backend'den en guncel anket envanteri getiriliyor.",
        emptyTitle: "Henuz anket yok",
        emptyDescription: "Bu sirket icin hicbir anket kaydi dondurulmedi.",
        synced: "{{count}} anket / backend'den senkronize edildi",
        export: "Listeyi disa aktar",
        viewDetail: "Detayi gor",
      },
    },
    extras: {
      momentumTitle: "Portfoy ivmesi",
      momentumDescription: "Tamamlanma ve yanit artisi icin yer tutucu grafik.",
      chartTitle: "Haftalik anket aktivitesi",
      chartSubtitle: "Aktif programlardaki canli tamamlanma hacmi",
      designNotesTitle: "Tasarim notlari",
      designNotesDescription: "Bu temelde yansitilan frontend odakli rehberlik.",
      notes: [
        "Buyuk yuvarlatilmis paneller, hafif isilti ve premium derinlik.",
        "Tablolar ve dikey icerikler icin mobil oncelikli yerlesim davranisi.",
        "Jenerik yonetim paneli varsayimlarindan kacinan temiz koyu palet.",
        "Daha sonra backend baglantilarina hazir tekrar kullanilabilir bilesen yuzeyleri.",
      ],
    },
    detail: {
      eyebrow: "Anket Detayi",
      duplicateSurvey: "Anketi kopyala",
      healthTitle: "Anket sagligi",
      healthDescription: "Temel performans metrikleri ve yer tutucu grafik.",
      healthChartTitle: "Tamamlanma ve etkilesim",
      healthChartSubtitle: "Kitle: {{audience}} / {{questions}} soru",
      snapshotTitle: "Ozet",
      snapshotDescription: "Meta veriler ve hizli metrikler icin tekrar kullanilabilir ozet blogu.",
      labels: {
        owner: "Sorumlu",
        audience: "Kitle",
        completions: "Tamamlanma",
        responseRate: "Yanit orani",
        updated: "Guncellendi",
      },
      highlightsTitle: "YZ izleme ozetleri",
      highlightsDescription: "Ileride uretilecek icgoruler icin tasarlanan premium detay karti.",
      notesTitle: "Operasyonel notlar",
      notesDescription: "Zaman cizelgesi olaylari ve gelecekteki backend baglantilari icin ayrildi.",
      notes: [
        "Soru sirasi, istege bagli uzun yanitlardan once erken sinyal toplamayi optimize eder.",
        "Sesli YZ akisi, tamamlanmalarda e-postadan 11 puan daha iyi performans gosteriyor.",
        "Mobil kullanicilarda acik metin istemleri kisaltildiginda tamamlanma kalitesi gucleniyor.",
      ],
    },
  },
  operations: {
    hero: {
      eyebrow: "Operasyon Motoru",
      title: "Tek bir premium kontrol yuzeyinde cok kanalli teslimat ve tempo.",
      description:
        "Operasyonlar gorunumu modern analitik is akislari icin ayarlandi: yuksek sinyal yogunlugu, temiz hiyerarsi ve gelecekteki otomasyon katmanlari icin tekrar kullanilabilir yapilar.",
      launchOperation: "Operasyon olustur",
      segmentBuilder: "Segment olusturucu",
      chips: ["Sesli YZ ile erisim", "E-posta ve SMS orkestrasyonu", "Durum duyarli detay gorunumleri"],
    },
    table: {
      title: "Operasyon envanteri",
      description: "Backend API ile desteklenen canli operasyon envanteri.",
      columns: {
        operation: "Operasyon",
        status: "Durum",
        survey: "Anket",
        reach: "Erisim",
        conversion: "Donusum",
        action: "Ac",
      },
      states: {
        errorTitle: "Operasyonlar yuklenemedi",
        loadingTitle: "Operasyonlar yukleniyor",
        loadingDescription: "Backend'den en guncel operasyon envanteri getiriliyor.",
        emptyTitle: "Henuz operasyon yok",
        emptyDescription: "Bu sirket icin hicbir operasyon kaydi dondurulmedi.",
        synced: "{{count}} operasyon / backend'den senkronize edildi",
        viewDetail: "Detayi gor",
      },
      filters: {
        allStages: "Tum asamalar",
        active: "Aktif",
        paused: "Duraklatildi",
      },
    },
    extras: {
      reachTitle: "Erisim egilimi",
      reachDescription: "Tutarli gorsel dille kanal performansi yer tutucusu.",
      reachChartTitle: "Teslimat hacmi",
      reachChartSubtitle: "Haftalik cok kanalli egilim",
      channelMixTitle: "Kanal karmasi",
      channelMixDescription: "Gercek kanal analitigi icin gelecege hazir kart alani.",
      channelMix: [
        ["Sesli YZ", "Bu hafta en yuksek donusum verimliligi"],
        ["E-posta", "Kurumsal besleme icin en iyi erisim"],
        ["SMS", "Kisa pencerelerde en guclu hatirlatici performansi"],
      ],
    },
  },
  contacts: {
    hero: {
      eyebrow: "Kisiler",
      title: "CRM gibi degil, urun kalitesinde hissettiren kitle zekasi.",
      description:
        "Bu kisiler sayfasi; daha sonra segmentasyon ve zenginlestirmeye genisleyebilecek tekrar kullanilabilir tablolar, durum isaretleyicileri ve kart bolumleriyle bilincli olarak sik bir analitik yuzey olarak kurgulandi.",
      addContacts: "Kisi ekle",
      createSegment: "Segment olustur",
      chips: ["Segmente hazir ornek veri", "Duyarli tablo kabugu", "Durum duyarli kitle kartlari"],
    },
    table: {
      title: "Kitle listesi",
      description: "Mobil ve masaustu kullanimina uygun temiz ve okunabilir tablo.",
      columns: {
        contact: "Kisi",
        region: "Bolge",
        score: "Uyum puani",
        lastTouch: "Son temas",
        status: "Durum",
      },
      filters: {
        all: "Tum kisiler",
        active: "Aktif",
        paused: "Duraklatildi",
        completed: "Tamamlandi",
      },
      meta: "4 ornek kisi / premium kitle calisma alani temeli",
    },
    extras: {
      trendTitle: "Kitle kalite trendi",
      trendDescription: "Buyume ve kalite puanlamasi icin yer tutucu gorsellestirme.",
      trendChartTitle: "Uyum puani sagligi",
      trendChartSubtitle: "Ornek segment kalite ilerleyisi",
      insightsTitle: "Segment icgoruleri",
      insightsDescription: "Zenginlestirme ve yonlendirme mantigi icin gelecege hazir panel.",
      insights: [
        "Kuzey Amerika kurumsal liderlerinde etkilesim olasiligi en yuksek seviyede.",
        "Son duraklamalar, onboard asamasindaki iletisime odaklaniyor.",
        "Yuksek puanli profiller CS ve buyume operasyonlari fonksiyonlarinda yogunlasiyor.",
      ],
    },
  },
  analytics: {
    hero: {
      eyebrow: "Analitik",
      title: "Tek gorunumde portfoy performansi",
      description:
        "Anket ve operasyon detay sayfalarina inmeden once tamamlanma oranlarini, teslimat ciktilarini ve operasyon donusum trendlerini karsilastirin.",
      openOperations: "Operasyonlari ac",
      openSurveys: "Anketleri ac",
    },
    sections: {
      performanceTitle: "Performans Trendi",
      performanceDescription: "Aktif arastirma operasyonlarindaki gunluk hacim.",
      performanceChartTitle: "Tamamlanma hacmi",
      performanceChartSubtitle: "Son 12 oturumdaki aktif calismalar",
      priorityTitle: "Oncelikli okumalar",
      priorityDescription: "Gun sonu raporlamasi oncesinde kontrol edilmesi gereken sinyaller.",
      reads: [
        ["Tamamlanma orani yumusadi", "Mobil destekli oturumlar haftalik hedefin altinda.", "Paused"],
        ["Kurumsal operasyon artisi", "CX Activation Spring 2026 taban cizginin uzerinde performans gosteriyor.", "Active"],
        ["Kisi kalite riski", "Dogrulama hatalari arama isleri hazirligini etkiliyor.", "Pending"],
      ],
    },
  },
  callingOps: {
    hero: {
      eyebrow: "Arama Operasyonlari",
      title: "Kuyruk ve is hazirligi",
      description:
        "Bu yer tutucu, arama operasyonlarini gezinmede gorunur tutar ve koordinatorler icin kuyruk sagligi ile is uretimi takibi icin net bir giris noktasi sunar.",
      uploadContacts: "Kisileri yukle",
      reviewOperations: "Operasyonlari incele",
    },
    queue: {
      title: "Kuyruk Izleme",
      description: "Yaklasan arama is akislari icin operasyonel yer tutucular.",
      items: [
        {
          title: "EMEA takip kuyrugu",
          detail: "186 kisi arama isi olusturulmasini bekliyor.",
          owner: "Koordinator ekibi",
        },
        {
          title: "Kuzey Amerika geri aramalari",
          detail: "Kalite guvence tamamlandi ve sonraki cagri paketi icin hazir.",
          owner: "Arama KG",
        },
        {
          title: "Perakende toparlama partisi 08",
          detail: "Basarisiz paketleme sonrasi yeniden deneme gerekiyor.",
          owner: "Operasyon otomasyonu",
        },
      ],
    },
  },
  common: {
    weekdaysShort: ["Pzt", "Sali", "Cars", "Pers", "Cum", "Cts"],
    fallback: {
      unavailable: "Kullanilamiyor",
    },
  },
} as const;





