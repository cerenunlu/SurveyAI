import { API_BASE_URL, DEFAULT_COMPANY_ID } from "@/lib/api";
import { fetchCompanySurveys } from "@/lib/surveys";
import { Campaign, CampaignContact } from "@/lib/types";

type SurveyReference = {
  id: string;
  name: string;
};

type CampaignApiResponse = {
  id: string;
  companyId: string;
  surveyId: string;
  name: string;
  status: "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

type CampaignContactApiResponse = {
  id: string;
  companyId: string;
  campaignId: string;
  name: string;
  phoneNumber: string;
  status: "PENDING" | "CALLING" | "COMPLETED" | "FAILED" | "RETRY" | "INVALID";
  createdAt: string;
  updatedAt: string;
};

export async function fetchCompanyCampaigns(
  companyId: string = DEFAULT_COMPANY_ID,
  init?: RequestInit,
): Promise<Campaign[]> {
  const [campaignsResponse, surveys] = await Promise.all([
    fetchJson<CampaignApiResponse[]>(`${API_BASE_URL}/api/v1/companies/${companyId}/campaigns`, init, "campaigns"),
    fetchCompanySurveys(companyId, init),
  ]);

  return campaignsResponse.map((dto) => mapCampaignDtoToCampaign(dto, surveys));
}

export async function fetchCampaignById(
  campaignId: string,
  companyId: string = DEFAULT_COMPANY_ID,
  init?: RequestInit,
): Promise<Campaign> {
  const [campaignResponse, surveys] = await Promise.all([
    fetchJson<CampaignApiResponse>(`${API_BASE_URL}/api/v1/companies/${companyId}/campaigns/${campaignId}`, init, "campaign"),
    fetchCompanySurveys(companyId, init),
  ]);

  return mapCampaignDtoToCampaign(campaignResponse, surveys);
}

export async function fetchCampaignContacts(
  campaignId: string,
  companyId: string = DEFAULT_COMPANY_ID,
  init?: RequestInit,
): Promise<CampaignContact[]> {
  const response = await fetchJson<CampaignContactApiResponse[]>(
    `${API_BASE_URL}/api/v1/companies/${companyId}/campaigns/${campaignId}/contacts`,
    init,
    "campaign contacts",
  );

  return response.map(mapCampaignContactDtoToContact);
}

async function fetchJson<T>(
  input: string,
  init: RequestInit | undefined,
  resourceName: string,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${resourceName} (${response.status})`);
  }

  return (await response.json()) as T;
}

function mapCampaignDtoToCampaign(dto: CampaignApiResponse, surveys: SurveyReference[]): Campaign {
  const survey = surveys.find((item) => item.id === dto.surveyId);
  const updatedAtSource = dto.completedAt ?? dto.startedAt ?? dto.scheduledAt ?? dto.updatedAt;

  return {
    id: dto.id,
    name: dto.name,
    status: mapCampaignStatus(dto.status),
    survey: survey?.name ?? formatSurveyFallback(dto.surveyId),
    budget: "Not available",
    reach: formatReach(dto),
    conversion: "N/A",
    updatedAt: formatDateTime(updatedAtSource),
    owner: formatOwner(dto.createdByUserId),
    channels: buildChannels(dto.status),
    summary: buildSummary(dto, survey?.name),
  };
}

function mapCampaignContactDtoToContact(dto: CampaignContactApiResponse): CampaignContact {
  return {
    id: dto.id,
    name: dto.name,
    phoneNumber: dto.phoneNumber,
    status: mapCampaignContactStatus(dto.status),
    createdAt: formatDateTime(dto.createdAt),
    updatedAt: formatDateTime(dto.updatedAt),
  };
}

function mapCampaignStatus(status: CampaignApiResponse["status"]): Campaign["status"] {
  switch (status) {
    case "RUNNING":
    case "SCHEDULED":
      return "Active";
    case "PAUSED":
      return "Paused";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "DRAFT":
    default:
      return "Draft";
  }
}

function mapCampaignContactStatus(status: CampaignContactApiResponse["status"]): CampaignContact["status"] {
  switch (status) {
    case "CALLING":
      return "Active";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "RETRY":
      return "Retry";
    case "INVALID":
      return "Invalid";
    case "PENDING":
    default:
      return "Pending";
  }
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatSurveyFallback(surveyId: string): string {
  return `Survey ${surveyId.slice(0, 8)}`;
}

function formatOwner(createdByUserId: string | null): string {
  if (!createdByUserId) {
    return "Unassigned";
  }

  return `User ${createdByUserId.slice(0, 8)}`;
}

function formatReach(dto: CampaignApiResponse): string {
  if (dto.status === "COMPLETED" && dto.completedAt) {
    return "Closed";
  }

  if (dto.startedAt) {
    return "In progress";
  }

  if (dto.scheduledAt) {
    return "Scheduled";
  }

  return "Planned";
}

function buildChannels(status: CampaignApiResponse["status"]): string[] {
  switch (status) {
    case "RUNNING":
      return ["Voice AI", "Email", "SMS"];
    case "SCHEDULED":
      return ["Email", "SMS"];
    case "PAUSED":
      return ["Voice AI", "Email"];
    case "COMPLETED":
      return ["Voice AI"];
    case "CANCELLED":
    case "DRAFT":
    default:
      return ["Configuration pending"];
  }
}

function buildSummary(dto: CampaignApiResponse, surveyName?: string): string {
  const statusLabel = mapCampaignStatus(dto.status);
  const scheduleLabel = formatDateTime(dto.scheduledAt);
  const surveyLabel = surveyName ?? formatSurveyFallback(dto.surveyId);

  return `${statusLabel} campaign linked to ${surveyLabel} with schedule ${scheduleLabel}.`;
}
