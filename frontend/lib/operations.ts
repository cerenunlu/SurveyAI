import { API_BASE_URL } from "@/lib/api";
import { DASHBOARD_COMPANY_ID } from "@/lib/company";
import { fetchCompanySurveys } from "@/lib/surveys";
import { Operation, OperationContact } from "@/lib/types";

type SurveyReference = {
  id: string;
  name: string;
};

type OperationApiResponse = {
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

type OperationContactApiResponse = {
  id: string;
  companyId: string;
  operationId: string;
  name: string;
  phoneNumber: string;
  status: "PENDING" | "CALLING" | "COMPLETED" | "FAILED" | "RETRY" | "INVALID";
  createdAt: string;
  updatedAt: string;
};

export async function fetchCompanyOperations(
  companyId: string = DASHBOARD_COMPANY_ID,
  init?: RequestInit,
): Promise<Operation[]> {
  const [operationsResponse, surveys] = await Promise.all([
    fetchJson<OperationApiResponse[]>(`${API_BASE_URL}/api/v1/operations?companyId=${companyId}`, init, "operations"),
    fetchCompanySurveys(companyId, init),
  ]);

  return operationsResponse.map((dto) => mapOperationDtoToOperation(dto, surveys));
}

export async function fetchOperationById(
  operationId: string,
  companyId: string = DASHBOARD_COMPANY_ID,
  init?: RequestInit,
): Promise<Operation> {
  const [operationResponse, surveys] = await Promise.all([
    fetchJson<OperationApiResponse>(`${API_BASE_URL}/api/v1/operations/${operationId}?companyId=${companyId}`, init, "operation"),
    fetchCompanySurveys(companyId, init),
  ]);

  return mapOperationDtoToOperation(operationResponse, surveys);
}

export async function fetchOperationContacts(
  operationId: string,
  companyId: string = DASHBOARD_COMPANY_ID,
  init?: RequestInit,
): Promise<OperationContact[]> {
  const response = await fetchJson<OperationContactApiResponse[]>(
    `${API_BASE_URL}/api/v1/operations/${operationId}/contacts?companyId=${companyId}`,
    init,
    "operation contacts",
  );

  return response.map(mapOperationContactDtoToContact);
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

function mapOperationDtoToOperation(dto: OperationApiResponse, surveys: SurveyReference[]): Operation {
  const survey = surveys.find((item) => item.id === dto.surveyId);
  const updatedAtSource = dto.completedAt ?? dto.startedAt ?? dto.scheduledAt ?? dto.updatedAt;

  return {
    id: dto.id,
    name: dto.name,
    status: mapOperationStatus(dto.status),
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

function mapOperationContactDtoToContact(dto: OperationContactApiResponse): OperationContact {
  return {
    id: dto.id,
    name: dto.name,
    phoneNumber: dto.phoneNumber,
    status: mapOperationContactStatus(dto.status),
    createdAt: formatDateTime(dto.createdAt),
    updatedAt: formatDateTime(dto.updatedAt),
  };
}

function mapOperationStatus(status: OperationApiResponse["status"]): Operation["status"] {
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

function mapOperationContactStatus(status: OperationContactApiResponse["status"]): OperationContact["status"] {
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

function formatReach(dto: OperationApiResponse): string {
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

function buildChannels(status: OperationApiResponse["status"]): string[] {
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

function buildSummary(dto: OperationApiResponse, surveyName?: string): string {
  const statusLabel = mapOperationStatus(dto.status);
  const scheduleLabel = formatDateTime(dto.scheduledAt);
  const surveyLabel = surveyName ?? formatSurveyFallback(dto.surveyId);

  return `${statusLabel} operation linked to ${surveyLabel} with schedule ${scheduleLabel}.`;
}


