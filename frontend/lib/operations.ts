import { API_BASE_URL } from "@/lib/api";
import { COMPANY_ID } from "@/lib/company";
import { fetchCompanySurveys } from "@/lib/surveys";
import { Operation, OperationContact } from "@/lib/types";

type ApiErrorResponse = {
  code?: string;
  message?: string;
  details?: string[];
};

type SurveyReference = {
  id: string;
  name: string;
  status: Operation["surveyStatus"];
  goal: string | null;
  audience: string | null;
  updatedAt: string | null;
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

type OperationContactStatusApi = OperationContactApiResponse["status"];

type OperationContactPageApiResponse = {
  items: OperationContactApiResponse[];
  totalItems: number;
  totalPages: number;
  page: number;
  size: number;
};

type OperationContactSummaryApiResponse = {
  totalContacts: number;
  statusCounts: Array<{
    status: OperationContactStatusApi;
    count: number;
  }>;
  latestContacts: OperationContactApiResponse[];
};

type CreateOperationRequest = {
  name: string;
  surveyId: string;
  scheduledAt: string | null;
  createdByUserId: string | null;
};

type CreateOperationContactsRequest = {
  contacts: Array<{
    name: string;
    phoneNumber: string;
  }>;
};

export type OperationContactStatusSummary = {
  status: OperationContact["status"];
  count: number;
};

export type OperationContactSummary = {
  totalContacts: number;
  statusCounts: OperationContactStatusSummary[];
  latestContacts: OperationContact[];
};

export type OperationContactPage = {
  items: OperationContact[];
  totalItems: number;
  totalPages: number;
  page: number;
  size: number;
};

export async function fetchCompanyOperations(
  companyId: string = COMPANY_ID,
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
  companyId: string = COMPANY_ID,
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
  companyId: string = COMPANY_ID,
  init?: RequestInit,
): Promise<OperationContact[]> {
  const response = await fetchJson<OperationContactApiResponse[]>(
    `${API_BASE_URL}/api/v1/operations/${operationId}/contacts?companyId=${companyId}`,
    init,
    "operation contacts",
  );

  return response.map(mapOperationContactDtoToContact);
}

export async function fetchOperationContactsPage(
  operationId: string,
  options?: {
    companyId?: string;
    page?: number;
    size?: number;
    query?: string;
    status?: OperationContact["status"] | "All";
    init?: RequestInit;
  },
): Promise<OperationContactPage> {
  const companyId = options?.companyId ?? COMPANY_ID;
  const searchParams = new URLSearchParams({ companyId });

  searchParams.set("page", String(options?.page ?? 0));
  searchParams.set("size", String(options?.size ?? 25));

  if (options?.query?.trim()) {
    searchParams.set("query", options.query.trim());
  }

  const status = mapOperationContactStatusToApi(options?.status);
  if (status) {
    searchParams.set("status", status);
  }

  const response = await fetchJson<OperationContactPageApiResponse>(
    `${API_BASE_URL}/api/v1/operations/${operationId}/contacts/list?${searchParams.toString()}`,
    options?.init,
    "operation contacts page",
  );

  return {
    items: response.items.map(mapOperationContactDtoToContact),
    totalItems: response.totalItems,
    totalPages: response.totalPages,
    page: response.page,
    size: response.size,
  };
}

export async function fetchOperationContactSummary(
  operationId: string,
  options?: {
    companyId?: string;
    latestLimit?: number;
    init?: RequestInit;
  },
): Promise<OperationContactSummary> {
  const companyId = options?.companyId ?? COMPANY_ID;
  const latestLimit = options?.latestLimit ?? 5;
  const response = await fetchJson<OperationContactSummaryApiResponse>(
    `${API_BASE_URL}/api/v1/operations/${operationId}/contacts/summary?companyId=${companyId}&latestLimit=${latestLimit}`,
    options?.init,
    "operation contact summary",
  );

  return {
    totalContacts: response.totalContacts,
    statusCounts: response.statusCounts.map((item) => ({
      status: mapOperationContactStatus(item.status),
      count: item.count,
    })),
    latestContacts: response.latestContacts.map(mapOperationContactDtoToContact),
  };
}

export async function exportOperationContacts(
  operationId: string,
  companyId: string = COMPANY_ID,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/operations/${operationId}/contacts/export?companyId=${companyId}`, {
    headers: {
      Accept: "text/csv",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "operation contacts export"));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const fileNameMatch = disposition.match(/filename="?([^\"]+)"?/i);
  const fileName = fileNameMatch?.[1] ?? `operation-${operationId}-contacts.csv`;
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(objectUrl);
}

export async function createOperation(
  request: CreateOperationRequest,
  companyId: string = COMPANY_ID,
): Promise<OperationApiResponse> {
  return fetchJson<OperationApiResponse>(`${API_BASE_URL}/api/v1/operations?companyId=${companyId}`, {
    method: "POST",
    body: JSON.stringify(request),
  }, "operation");
}

export async function createOperationContacts(
  operationId: string,
  request: CreateOperationContactsRequest,
  companyId: string = COMPANY_ID,
): Promise<OperationContact[]> {
  const response = await fetchJson<OperationContactApiResponse[]>(
    `${API_BASE_URL}/api/v1/operations/${operationId}/contacts?companyId=${companyId}`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
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
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, resourceName));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readApiError(response: Response, resourceName: string): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    const details = payload.details?.filter(Boolean) ?? [];
    const fallback = `Failed to load ${resourceName} (${response.status})`;
    const message = payload.message?.trim() || fallback;
    return details.length > 0 ? `${message}: ${details.join(" ")}` : message;
  } catch {
    return `Failed to load ${resourceName} (${response.status})`;
  }
}

function mapOperationDtoToOperation(dto: OperationApiResponse, surveys: SurveyReference[]): Operation {
  const survey = surveys.find((item) => item.id === dto.surveyId);
  const updatedAtSource = dto.completedAt ?? dto.startedAt ?? dto.scheduledAt ?? dto.updatedAt;

  return {
    id: dto.id,
    name: dto.name,
    status: mapOperationStatus(dto.status),
    surveyId: dto.surveyId,
    survey: survey?.name ?? formatSurveyFallback(dto.surveyId),
    surveyStatus: survey?.status ?? null,
    surveyGoal: survey?.goal ?? null,
    surveyAudience: survey?.audience ?? null,
    surveyUpdatedAt: survey?.updatedAt ?? null,
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

function mapOperationContactStatusToApi(
  status: OperationContact["status"] | "All" | undefined,
): OperationContactStatusApi | null {
  switch (status) {
    case "Active":
      return "CALLING";
    case "Completed":
      return "COMPLETED";
    case "Failed":
      return "FAILED";
    case "Retry":
      return "RETRY";
    case "Invalid":
      return "INVALID";
    case "Pending":
      return "PENDING";
    case "All":
    case undefined:
    default:
      return null;
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


