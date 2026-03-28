export const en = {
  shell: {
    brandSubtitle: "Research Operations",
    sidebar: {
      expand: "Expand",
      collapse: "Collapse",
      navigation: "Navigation",
      dailyFocus: "Daily Focus",
      readinessTitle: "Operational readiness",
      readinessDescription:
        "Use the dashboard to triage issues, then move into surveys, campaigns, contacts, and calling workflows to execute.",
      closeNavigation: "Close navigation",
    },
    topbar: {
      menu: "Menu",
      searchPlaceholder: "Search surveys, campaigns, contacts...",
      notifications: "Notifications",
      createSurvey: "Create Survey",
      languageLabel: "Language",
      tr: "TR",
      en: "EN",
    },
    pageMeta: {
      dashboard: {
        title: "Operations Overview",
        subtitle:
          "Track campaign health, survey readiness, contact flow, and operational issues from one control layer.",
      },
      surveys: {
        title: "Surveys",
        subtitle: "Manage survey drafts, publishing status, and live program inventory.",
      },
      campaigns: {
        title: "Campaigns",
        subtitle: "Monitor launch readiness, active pacing, and cross-channel execution.",
      },
      contacts: {
        title: "Contacts",
        subtitle: "Keep contact files validated, segmented, and ready for campaign assignment.",
      },
      analytics: {
        title: "Analytics",
        subtitle: "Review completions, response lift, and delivery performance across the portfolio.",
      },
      callingOps: {
        title: "Calling Ops",
        subtitle: "Watch queue volume, call job readiness, and coordinator attention points.",
      },
      surveyDetail: {
        title: "Survey Detail",
        subtitle: "Inspect survey health, response posture, and operational notes.",
      },
      campaignDetail: {
        title: "Campaign Detail",
        subtitle: "Review pacing, channel mix, and lifecycle movement in one view.",
      },
    },
    navigation: {
      dashboard: { label: "Dashboard", description: "Operations overview" },
      surveys: { label: "Surveys", description: "Drafts and live studies" },
      campaigns: { label: "Campaigns", description: "Launch and pacing" },
      contacts: { label: "Contacts", description: "Uploads and validation" },
      analytics: { label: "Analytics", description: "Performance and trends" },
      callingOps: { label: "Calling Ops", description: "Queues and call jobs" },
    },
    common: {
      viewAll: "View all",
    },
    status: {
      live: "Live",
      draft: "Draft",
      archived: "Archived",
      active: "Active",
      paused: "Paused",
      completed: "Completed",
      cancelled: "Cancelled",
      failed: "Failed",
      retry: "Retry",
      invalid: "Invalid",
      pending: "Pending",
    },
  },
  dashboard: {
    hero: {
      eyebrow: "Product Overview",
      title: "A clean dashboard built from live product records",
      description:
        "This overview only surfaces backend-backed inventory for surveys, campaigns, and contacts so the dashboard stays useful without drifting into demo metrics.",
      openSurveys: "Open Surveys",
      openCampaigns: "Open Campaigns",
      openContacts: "Open Contacts",
      surveysSynced: "Surveys",
      campaignsSynced: "Campaigns",
      contactsSynced: "Contacts",
      syncedSuffix: "synced",
    },
    unavailable: {
      title: "Some data is temporarily unavailable",
      description: "Only successfully loaded backend sections are shown below.",
      nowUnavailable: "Unavailable right now",
      single: "{{section}} could not be loaded from the backend.",
      multiple: "{{sections}} could not be fully loaded from the backend.",
      surveys: "Surveys",
      campaigns: "Campaigns",
      contacts: "Contacts",
    },
    sections: {
      recentSurveys: {
        title: "Recent Surveys",
        description: "Latest survey records returned by the backend.",
        emptyTitle: "No surveys yet",
        emptyDescription: "Survey records will appear here as soon as they exist in the backend.",
      },
      recentCampaigns: {
        title: "Recent Campaigns",
        description: "Current campaign inventory backed by the backend API.",
        emptyTitle: "No campaigns yet",
        emptyDescription: "Campaign records will show up here once they are created in the backend.",
      },
      recentContacts: {
        title: "Recent Contacts",
        description: "Contacts loaded from campaign contact records already stored in the backend.",
        action: "Open contacts",
        emptyTitle: "No contacts yet",
        emptyDescription: "Uploaded campaign contacts will appear here when backend records are available.",
      },
      operationalAnalytics: {
        title: "Operational Analytics",
        description: "Reserved for backend-backed throughput and quality metrics.",
        emptyTitle: "Not available yet",
        emptyDescription: "Completion, alerting, and call-operation metrics stay hidden until the backend exposes real aggregates.",
      },
    },
  },
  surveys: {
    hero: {
      eyebrow: "Survey Programs",
      title: "A polished inventory for every survey workflow in the platform.",
      description:
        "Use this page as the core foundation for list management, monitoring, and drill-down navigation. The structure is intentionally reusable for future filtering, search, and backend data hooks.",
      createSurvey: "Create Survey",
      importBlueprint: "Import Blueprint",
      chips: ["Live status badges", "Reusable table sections", "Responsive cards + tables"],
    },
    table: {
      title: "Survey portfolio",
      description: "Live survey inventory powered by the backend API.",
      columns: {
        survey: "Survey",
        status: "Status",
        audience: "Audience",
        completions: "Completions",
        responseRate: "Response rate",
        action: "Open",
      },
      filters: {
        all: "All",
        live: "Live",
        draft: "Draft",
        archived: "Archived",
      },
      states: {
        errorTitle: "Unable to load surveys",
        loadingTitle: "Loading surveys",
        loadingDescription: "Fetching the latest survey inventory from the backend.",
        emptyTitle: "No surveys yet",
        emptyDescription: "No survey records were returned for this company.",
        synced: "{{count}} surveys / synced from backend",
        export: "Export List",
        viewDetail: "View detail",
      },
    },
    extras: {
      momentumTitle: "Portfolio momentum",
      momentumDescription: "Placeholder chart for completions and response lift.",
      chartTitle: "Weekly survey activity",
      chartSubtitle: "Live completion throughput across active programs",
      designNotesTitle: "Design notes",
      designNotesDescription: "Frontend-specific guidance reflected in this foundation.",
      notes: [
        "Rounded large panels with subtle glow and premium depth.",
        "Mobile-first layout behavior for tables and stacked content.",
        "Clean dark palette that avoids generic admin-dashboard defaults.",
        "Reusable component surfaces ready for backend wiring later.",
      ],
    },
  },
  campaigns: {
    hero: {
      eyebrow: "Campaign Engine",
      title: "Cross-channel delivery and pacing in one premium control surface.",
      description:
        "The campaigns view is tuned for modern analytics workflows: high signal density, clean hierarchy, and reusable structures for future automation layers.",
      launchCampaign: "Launch Campaign",
      segmentBuilder: "Segment Builder",
      chips: ["Voice AI outreach", "Email + SMS orchestration", "Status-aware detail views"],
    },
    table: {
      title: "Campaign inventory",
      description: "Live campaign inventory powered by the backend API.",
      columns: {
        campaign: "Campaign",
        status: "Status",
        survey: "Survey",
        reach: "Reach",
        conversion: "Conversion",
        action: "Open",
      },
      states: {
        errorTitle: "Unable to load campaigns",
        loadingTitle: "Loading campaigns",
        loadingDescription: "Fetching the latest campaign inventory from the backend.",
        emptyTitle: "No campaigns yet",
        emptyDescription: "No campaign records were returned for this company.",
        synced: "{{count}} campaigns / synced from backend",
        viewDetail: "View detail",
      },
      filters: {
        allStages: "All stages",
        active: "Active",
        paused: "Paused",
      },
    },
    extras: {
      reachTitle: "Reach trajectory",
      reachDescription: "Channel performance placeholder with consistent visual treatment.",
      reachChartTitle: "Delivery volume",
      reachChartSubtitle: "Weekly multi-channel trajectory",
      channelMixTitle: "Channel mix",
      channelMixDescription: "Future-ready card area for real channel analytics.",
      channelMix: [
        ["Voice AI", "Highest conversion efficiency this week"],
        ["Email", "Best reach for enterprise nurture"],
        ["SMS", "Strongest reminder performance in short windows"],
      ],
    },
  },
  contacts: {
    hero: {
      eyebrow: "Contacts",
      title: "Audience intelligence designed to feel product-grade, not CRM-generic.",
      description:
        "This contacts page is intentionally framed as a sleek analytics surface with reusable tables, status markers, and card sections that will scale into segmentation and enrichment later.",
      addContacts: "Add Contacts",
      createSegment: "Create Segment",
      chips: ["Segment-ready mock data", "Responsive table shell", "Status-aware audience cards"],
    },
    table: {
      title: "Audience roster",
      description: "Clean, readable table tuned for mobile and desktop usage alike.",
      columns: {
        contact: "Contact",
        region: "Region",
        score: "Fit score",
        lastTouch: "Last touch",
        status: "Status",
      },
      filters: {
        all: "All contacts",
        active: "Active",
        paused: "Paused",
        completed: "Completed",
      },
      meta: "4 mock contacts / premium audience workspace foundation",
    },
    extras: {
      trendTitle: "Audience quality trend",
      trendDescription: "Placeholder visualization for growth and quality scoring.",
      trendChartTitle: "Fit score health",
      trendChartSubtitle: "Sample segment quality progression",
      insightsTitle: "Segment insights",
      insightsDescription: "Future-ready panel for enrichment and routing logic.",
      insights: [
        "North America enterprise leaders show the highest engagement probability.",
        "Recent pauses are clustered around onboarding-stage outreach.",
        "High-scoring profiles are concentrated in CS and growth operations functions.",
      ],
    },
  },
  analytics: {
    hero: {
      eyebrow: "Analytics",
      title: "Portfolio performance in one view",
      description:
        "Compare completion rates, delivery output, and campaign conversion trends before drilling into survey and campaign detail pages.",
      openCampaigns: "Open Campaigns",
      openSurveys: "Open Surveys",
    },
    sections: {
      performanceTitle: "Performance Trend",
      performanceDescription: "Daily throughput across active research operations.",
      performanceChartTitle: "Completion throughput",
      performanceChartSubtitle: "Active studies over the last 12 sessions",
      priorityTitle: "Priority Reads",
      priorityDescription: "Signals to check before end-of-day reporting.",
      reads: [
        ["Completion rate softened", "Mobile-assisted sessions are below weekly target.", "Paused"],
        ["Enterprise campaign lift", "CX Activation Spring 2026 is outperforming baseline.", "Active"],
        ["Contact quality risk", "Validation failures are skewing call-job readiness.", "Pending"],
      ],
    },
  },
  callingOps: {
    hero: {
      eyebrow: "Calling Ops",
      title: "Queue and job readiness",
      description:
        "This placeholder keeps calling operations visible in navigation and gives coordinators a clear landing point for queue health and job-generation follow-up.",
      uploadContacts: "Upload Contacts",
      reviewCampaigns: "Review Campaigns",
    },
    queue: {
      title: "Queue Watch",
      description: "Operational placeholders for upcoming calling workflows.",
      items: [
        {
          title: "EMEA follow-up queue",
          detail: "186 contacts waiting for call-job generation.",
          owner: "Coordinator team",
        },
        {
          title: "North America callbacks",
          detail: "QA complete and ready for the next dialer batch.",
          owner: "Call QA",
        },
        {
          title: "Retail recovery batch 08",
          detail: "Retry required after failed job packaging.",
          owner: "Ops automation",
        },
      ],
    },
  },
  common: {
    weekdaysShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    fallback: {
      unavailable: "Unavailable",
    },
  },
} as const;



