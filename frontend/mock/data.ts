import { ActionItem, ActivityItem, AttentionItem, Operation, Contact, Kpi, Stat, Survey } from "@/lib/types";

export const dashboardStats: Stat[] = [
  {
    label: "Active surveys",
    value: "24",
    delta: "+12.4%",
    tone: "positive",
    detail: "Across product feedback, onboarding, and customer quality loops.",
  },
  {
    label: "Operation reach",
    value: "182K",
    delta: "+8.1%",
    tone: "positive",
    detail: "Projected qualified contacts touched over the last 30 days.",
  },
  {
    label: "Completion rate",
    value: "64.8%",
    delta: "-1.2%",
    tone: "warning",
    detail: "Slightly softer on mobile voice-assisted sessions this week.",
  },
  {
    label: "AI sentiment alerts",
    value: "07",
    delta: "+3",
    tone: "danger",
    detail: "Flagged for review by the model quality and escalation pipeline.",
  },
];

export const dashboardKpis: Kpi[] = [
  {
    label: "Active Operations",
    value: "12",
    detail: "3 need pacing review before end of day.",
    tone: "positive",
  },
  {
    label: "Draft Surveys",
    value: "5",
    detail: "2 are waiting for final approval.",
    tone: "warning",
  },
  {
    label: "Contacts Uploaded Today",
    value: "4,280",
    detail: "640 still in validation.",
    tone: "neutral",
  },
  {
    label: "Completion Rate",
    value: "64.8%",
    detail: "Down 1.2% from yesterday's close.",
    tone: "warning",
  },
  {
    label: "Calls Waiting",
    value: "186",
    detail: "Queue is highest in EMEA follow-up.",
    tone: "warning",
  },
  {
    label: "Failed Jobs / Alerts",
    value: "7",
    detail: "2 contact imports and 5 call-job retries.",
    tone: "danger",
  },
];

export const surveys: Survey[] = [
  {
    id: "brand-health-q1",
    name: "Brand Health Pulse Q1",
    status: "Live",
    audience: "Enterprise customers",
    completions: 1284,
    responseRate: "72%",
    updatedAt: "2h ago",
    goal: "Track perception drift after pricing changes and support improvements.",
    channels: ["Voice AI", "Email", "In-app"],
    questions: 18,
    owner: "Mina Patel",
  },
  {
    id: "trial-conversion-audit",
    name: "Trial Conversion Audit",
    status: "Draft",
    audience: "New signups",
    completions: 0,
    responseRate: "0%",
    updatedAt: "6h ago",
    goal: "Validate where onboarding friction blocks trial-to-paid conversion.",
    channels: ["Email", "SMS"],
    questions: 14,
    owner: "Jordan Lee",
  },
  {
    id: "nps-retention-loop",
    name: "NPS Retention Loop",
    status: "Live",
    audience: "Renewal accounts",
    completions: 842,
    responseRate: "61%",
    updatedAt: "1d ago",
    goal: "Spot churn signals before renewal discussions begin.",
    channels: ["Voice AI", "Email"],
    questions: 11,
    owner: "Sophia Kim",
  },
  {
    id: "support-recovery-audit",
    name: "Support Recovery Audit",
    status: "Archived",
    audience: "Escalated tickets",
    completions: 356,
    responseRate: "58%",
    updatedAt: "5d ago",
    goal: "Measure post-resolution trust and escalation recovery quality.",
    channels: ["Phone", "SMS"],
    questions: 9,
    owner: "Ethan Ross",
  },
];

export const operations: Operation[] = [
  {
    id: "cx-activation-2026",
    name: "CX Activation Spring 2026",
    status: "Active",
    survey: "Brand Health Pulse Q1",
    budget: "$42,000",
    reach: "54K",
    conversion: "18.2%",
    updatedAt: "45m ago",
    owner: "Lena Morris",
    channels: ["Voice AI", "Email", "SMS"],
    summary: "High-priority enterprise engagement across strategic accounts and recent renewals.",
  },
  {
    id: "trial-lift-wave",
    name: "Trial Lift Wave",
    status: "Paused",
    survey: "Trial Conversion Audit",
    budget: "$19,500",
    reach: "18K",
    conversion: "12.7%",
    updatedAt: "3h ago",
    owner: "Jordan Lee",
    channels: ["Email", "SMS"],
    summary: "Paused to refine targeting and update fallback copy for low-intent cohorts.",
  },
  {
    id: "renewal-safeguard",
    name: "Renewal Safeguard",
    status: "Completed",
    survey: "NPS Retention Loop",
    budget: "$28,300",
    reach: "31K",
    conversion: "21.9%",
    updatedAt: "1d ago",
    owner: "Mina Patel",
    channels: ["Voice AI", "Email"],
    summary: "Completed retention-focused run with strong reactivation across at-risk renewals.",
  },
];

export const contacts: Contact[] = [
  {
    id: "c-1001",
    name: "Ava Thompson",
    company: "Northstar Finance",
    role: "VP Customer Success",
    status: "Active",
    lastTouch: "Today, 09:42",
    score: "91",
    region: "North America",
  },
  {
    id: "c-1002",
    name: "Daniel Ortega",
    company: "Orbital Commerce",
    role: "Growth Operations Lead",
    status: "Paused",
    lastTouch: "Yesterday, 16:18",
    score: "76",
    region: "Europe",
  },
  {
    id: "c-1003",
    name: "Naomi Fischer",
    company: "Velora Cloud",
    role: "Head of Experience",
    status: "Completed",
    lastTouch: "Mar 24, 11:05",
    score: "88",
    region: "EMEA",
  },
  {
    id: "c-1004",
    name: "Chris Bennett",
    company: "Summit Energy",
    role: "Director of Service",
    status: "Active",
    lastTouch: "Mar 27, 08:11",
    score: "83",
    region: "APAC",
  },
];

export const detailHighlights = [
  { label: "Voice AI coverage", value: "92%" },
  { label: "Automation confidence", value: "High" },
  { label: "Median completion time", value: "04:32" },
  { label: "Drop-off risk", value: "Low" },
];

export const recentOperators = ["Mina Patel", "Jordan Lee", "Sophia Kim"];

export const surveysNeedingAttention: AttentionItem[] = [
  {
    id: "trial-conversion-audit",
    title: "Trial Conversion Audit",
    detail: "Draft has no publishing owner and needs intro prompt review.",
    owner: "Jordan Lee",
    status: "Draft",
  },
  {
    id: "nps-retention-loop",
    title: "NPS Retention Loop",
    detail: "Live survey completion rate fell below target in renewal cohort.",
    owner: "Sophia Kim",
    status: "Live",
  },
  {
    id: "support-recovery-audit",
    title: "Support Recovery Audit",
    detail: "Archived program still linked to a paused recovery operation.",
    owner: "Ethan Ross",
    status: "Archived",
  },
];

export const contactUploadQueue: AttentionItem[] = [
  {
    id: "northstar-enterprise",
    title: "Northstar Finance upload",
    detail: "220 records blocked by duplicate phone formatting.",
    owner: "Contacts team",
    status: "Pending",
  },
  {
    id: "orbital-prospects",
    title: "Orbital Commerce prospects",
    detail: "Validation passed; waiting for operation assignment.",
    owner: "Growth ops",
    status: "Active",
  },
  {
    id: "summit-renewals",
    title: "Summit Energy renewals",
    detail: "19 records flagged as invalid before call job generation.",
    owner: "Data QA",
    status: "Failed",
  },
];

export const recentActivity: ActivityItem[] = [
  {
    id: "activity-1",
    title: "CX Activation Spring 2026 resumed",
    detail: "Voice AI channel restarted after script update.",
    time: "14 min ago",
    status: "Active",
  },
  {
    id: "activity-2",
    title: "Contacts upload finished validation",
    detail: "1,240 retail records are ready for operation mapping.",
    time: "32 min ago",
    status: "Completed",
  },
  {
    id: "activity-3",
    title: "Trial Conversion Audit saved as draft",
    detail: "Survey builder changes need approval before publish.",
    time: "1h ago",
    status: "Draft",
  },
  {
    id: "activity-4",
    title: "Call job generation failed",
    detail: "Retry needed for EMEA follow-up contacts batch 08.",
    time: "1h ago",
    status: "Failed",
  },
];

export const dashboardAlerts: AttentionItem[] = [
  {
    id: "alert-1",
    title: "Call queue backlog in EMEA",
    detail: "186 contacts are waiting and SLA risk begins in 2 hours.",
    owner: "Calling ops",
    status: "Pending",
  },
  {
    id: "alert-2",
    title: "Paused operation with live survey",
    detail: "Trial Lift Wave is paused while its linked draft survey is still incomplete.",
    owner: "Jordan Lee",
    status: "Paused",
  },
  {
    id: "alert-3",
    title: "Import validation failures",
    detail: "Two uploads need contact cleanup before they can be assigned.",
    owner: "Data QA",
    status: "Failed",
  },
];

export const nextStepActions: ActionItem[] = [
  {
    id: "next-1",
    title: "Create a survey draft",
    detail: "Start a new study brief for the next client wave.",
    href: "/surveys",
    cta: "New Survey",
  },
  {
    id: "next-2",
    title: "Publish a survey",
    detail: "Move approved drafts into operation-ready status.",
    href: "/surveys",
    cta: "Review Drafts",
  },
  {
    id: "next-3",
    title: "Upload contacts to a operation",
    detail: "Finish today's pending imports and assign them to live outreach.",
    href: "/contacts",
    cta: "Open Contacts",
  },
  {
    id: "next-4",
    title: "Start call job generation",
    detail: "Clear waiting queue items before the next coordinator shift.",
    href: "/calling-ops",
    cta: "Open Calling Ops",
  },
];
