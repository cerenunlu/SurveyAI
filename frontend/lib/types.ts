import { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
};

export type Stat = {
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "warning" | "danger";
  detail: string;
};

export type Kpi = {
  label: string;
  value: string;
  detail: string;
  tone: "positive" | "warning" | "danger" | "neutral";
};

export type Survey = {
  id: string;
  name: string;
  status: "Live" | "Draft" | "Archived";
  audience: string;
  completions: number;
  responseRate: string;
  updatedAt: string;
  goal: string;
  channels: string[];
  questions: number;
  owner: string;
};

export type SurveyQuestionType =
  | "short_text"
  | "long_text"
  | "yes_no"
  | "single_choice"
  | "multi_choice"
  | "dropdown"
  | "rating_1_5"
  | "rating_1_10"
  | "date"
  | "full_name"
  | "number"
  | "phone";

export type SurveyQuestionOption = {
  id: string;
  label: string;
  code?: string;
  value?: string;
};

export type SurveyBuilderQuestion = {
  id: string;
  code: string;
  type: SurveyQuestionType;
  title: string;
  description: string;
  required: boolean;
  retryPrompt?: string;
  branchConditionJson?: string;
  settingsJson?: string;
  options?: SurveyQuestionOption[];
};

export type SurveyBuilderSurvey = {
  id: string;
  name: string;
  summary: string;
  status: "Draft" | "Live" | "Archived";
  updatedAt: string;
  questionCount: number;
  languageCode: string;
  introPrompt: string;
  closingPrompt: string;
  maxRetryPerQuestion: number;
  questions: SurveyBuilderQuestion[];
};

export type Operation = {
  id: string;
  name: string;
  status: "Draft" | "Ready" | "Running" | "Completed" | "Failed" | "Scheduled" | "Paused" | "Cancelled";
  surveyId: string;
  survey: string;
  surveyStatus: Survey["status"] | null;
  surveyGoal: string | null;
  surveyAudience: string | null;
  surveyUpdatedAt: string | null;
  budget: string;
  reach: string;
  conversion: string;
  updatedAt: string;
  owner: string;
  channels: string[];
  summary: string;
  readiness: {
    surveyLinked: boolean;
    surveyPublished: boolean;
    contactsLoaded: boolean;
    startableState: boolean;
    readyToStart: boolean;
    blockingReasons: string[];
  };
  executionSummary: {
    totalCallJobs: number;
    pendingCallJobs: number;
    completedCallJobs: number;
    newlyPreparedCallJobs: number;
  };
  startedAt: string | null;
  completedAt: string | null;
  scheduledAt: string | null;
};

export type OperationContact = {
  id: string;
  name: string;
  phoneNumber: string;
  status: "Active" | "Completed" | "Failed" | "Retry" | "Invalid" | "Pending";
  createdAt: string;
  updatedAt: string;
};

export type CallJob = {
  id: string;
  operationContactId: string;
  personName: string;
  phoneNumber: string;
  status: "Queued" | "InProgress" | "Completed" | "Failed" | "Skipped";
  rawStatus: string;
  attemptCount: number;
  maxAttempts: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lastResultSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  name: string;
  company: string;
  role: string;
  status: "Active" | "Paused" | "Completed";
  lastTouch: string;
  score: string;
  region: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  status: "Active" | "Draft" | "Paused" | "Completed" | "Failed" | "Pending";
};

export type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  owner: string;
  status: "Live" | "Draft" | "Archived" | "Active" | "Paused" | "Failed" | "Pending";
};

export type ActionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
};

export type TableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};


