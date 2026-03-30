import { API_BASE_URL, apiFetch } from "@/lib/api";
import { requireCompanyId, requireCurrentUserId } from "@/lib/auth";
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

type OperationApiStatus = "DRAFT" | "READY" | "RUNNING" | "COMPLETED" | "FAILED" | "SCHEDULED" | "PAUSED" | "CANCELLED";

type OperationApiResponse = {
  id: string;
  companyId: string;
  surveyId: string;
  name: string;
  status: OperationApiStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
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
    newlyPreparedCallJobs: number;
  };
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
  createdByUserId?: string | null;
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
  companyId?: string,
  init?: RequestInit,
): Promise<Operation[]> {
  const resolvedCompanyId = requireCompanyId(companyId);
  const [operationsResponse, surveys] = await Promise.all([
    fetchJson<OperationApiResponse[]>(`${API_BASE_URL}/api/v1/operations?companyId=${resolvedCompanyId}`, init, "operations"),
    fetchCompanySurveys(resolvedCompanyId, init),
  ]);

  return operationsResponse.map((dto) => mapOperationDtoToOperation(dto, surveys));
}

export async function fetchOperationById(
  operationId: string,
  companyId?: string,
  init?: RequestInit,
): Promise<Operation> {
  const resolvedCompanyId = requireCompanyId(companyId);
  const [operationResponse, surveys] = await Promise.all([
    fetchJson<OperationApiResponse>(`${API_BASE_URL}/api/v1/operations/${operationId}?companyId=${resolvedCompanyId}`, init, "operation"),
    fetchCompanySurveys(resolvedCompanyId, init),
  ]);

  return mapOperationDtoToOperation(operationResponse, surveys);
}

export async function startOperation(
  operationId: string,
  companyId?: string,
): Promise<Operation> {
  const resolvedCompanyId = requireCompanyId(companyId);
  const [operationResponse, surveys] = await Promise.all([
    fetchJson<OperationApiResponse>(`${API_BASE_URL}/api/v1/operations/${operationId}/start?companyId=${resolvedCompanyId}`, {
      method: "POST",
    }, "operation start"),
    fetchCompanySurveys(resolvedCompanyId),
  ]);

  return mapOperationDtoToOperation(operationResponse, surveys);
}

export async function fetchOperationContacts(
  operationId: string,
  companyId?: string,
  init?: RequestInit,
): Promise<OperationContact[]> {
  const resolvedCompanyId = requireCompanyId(companyId);
  const response = await fetchJson<OperationContactApiResponse[]>(
    `${API_BASE_URL}/api/v1/operations/${operationId}/contacts?companyId=${resolvedCompanyId}`,
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
  const companyId = requireCompanyId(options?.companyId);
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
  const companyId = requireCompanyId(options?.companyId);
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
  companyId?: string,
): Promise<void> {
  const resolvedCompanyId = requireCompanyId(companyId);
  const response = await apiFetch(`${API_BASE_URL}/api/v1/operations/${operationId}/contacts/export?companyId=${resolvedCompanyId}`, {
    headers: {
      Accept: "text/csv",
    },
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
  companyId?: string,
): Promise<OperationApiResponse> {
  const resolvedCompanyId = requireCompanyId(companyId);
  return fetchJson<OperationApiResponse>(`${API_BASE_URL}/api/v1/operations?companyId=${resolvedCompanyId}`, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      createdByUserId: requireCurrentUserId(request.createdByUserId),
    }),
  }, "operation");
}

export async function createOperationContacts(
  operationId: string,
  request: CreateOperationContactsRequest,
  companyId?: string,
): Promise<OperationContact[]> {
  const resolvedCompanyId = requireCompanyId(companyId);
  const response = await fetchJson<OperationContactApiResponse[]>(
    `${API_BASE_URL}/api/v1/operations/${operationId}/contacts?companyId=${resolvedCompanyId}`,
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
  const response = await apiFetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
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
    const fallback = `${resourceName} yuklenemedi (${response.status})`;
    const message = payload.message?.trim() || fallback;
    return details.length > 0 ? `${message}: ${details.join(" ")}` : message;
  } catch {
    return `${resourceName} yuklenemedi (${response.status})`;
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
    budget: "Hazirlaniyor",
    reach: formatReach(dto.status, dto.startedAt, dto.completedAt),
    conversion: dto.executionSummary.totalCallJobs > 0 ? `${dto.executionSummary.pendingCallJobs} bekleyen is` : "Henuz yok",
    updatedAt: formatDateTime(updatedAtSource),
    owner: formatOwner(dto.createdByUserId),
    channels: buildChannels(dto.status),
    summary: buildSummary(dto, survey?.name),
    readiness: dto.readiness,
    executionSummary: dto.executionSummary,
    startedAt: dto.startedAt,
    completedAt: dto.completedAt,
    scheduledAt: dto.scheduledAt,
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

function mapOperationStatus(status: OperationApiStatus): Operation["status"] {
  switch (status) {
    case "READY":
      return "Ready";
    case "RUNNING":
      return "Running";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "SCHEDULED":
      return "Scheduled";
    case "PAUSED":
      return "Paused";
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
    return "Planlanmadi";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Guncel";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSurveyFallback(surveyId: string): string {
  return `Anket ${surveyId.slice(0, 8)}`;
}

function formatOwner(createdByUserId: string | null): string {
  if (!createdByUserId) {
    return "Atanmadi";
  }

  return `Kullanici ${createdByUserId.slice(0, 8)}`;
}

function formatReach(status: OperationApiStatus, startedAt: string | null, completedAt: string | null): string {
  if (status === "COMPLETED" && completedAt) {
    return "Tamamlandi";
  }

  if (status === "RUNNING" || startedAt) {
    return "Yurutuluyor";
  }

  if (status === "READY" || status === "SCHEDULED") {
    return "Hazir";
  }

  if (status === "FAILED") {
    return "Mudahale gerekli";
  }

  return "Hazirlaniyor";
}

function buildChannels(status: OperationApiStatus): string[] {
  switch (status) {
    case "RUNNING":
      return ["Ses operasyoni", "Kuyruk hazir"];
    case "READY":
      return ["Baslatmaya hazir", "Anket bagli"];
    case "COMPLETED":
      return ["Yurutme tamamlandi"];
    case "FAILED":
      return ["Hata incelemesi"];
    case "PAUSED":
      return ["Duraklatildi"];
    case "CANCELLED":
      return ["Kapatildi"];
    case "SCHEDULED":
      return ["Planlandi"];
    case "DRAFT":
    default:
      return ["Hazirlik asamasi"];
  }
}

function buildSummary(dto: OperationApiResponse, surveyName?: string): string {
  const surveyLabel = surveyName ?? formatSurveyFallback(dto.surveyId);

  if (dto.status === "RUNNING") {
    return `${surveyLabel} icin yurutme acildi. ${dto.executionSummary.pendingCallJobs} is kuyrukta bekliyor.`;
  }

  if (dto.readiness.readyToStart) {
    return `${surveyLabel} bagli, kisiler yuklu. Operasyon baslatmaya hazir.`;
  }

  if (dto.readiness.blockingReasons.length > 0) {
    return dto.readiness.blockingReasons[0];
  }

  return `${surveyLabel} icin operasyon hazirlikta.`;
}
