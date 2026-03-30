import { API_BASE_URL, apiFetch } from "@/lib/api";
import { requireCompanyId } from "@/lib/auth";
import { Survey } from "@/lib/types";

type SurveyApiResponse = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  languageCode: string;
  introPrompt: string | null;
  closingPrompt: string | null;
  maxRetryPerQuestion: number | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchCompanySurveys(
  companyId?: string,
  init?: RequestInit,
): Promise<Survey[]> {
  const resolvedCompanyId = requireCompanyId(companyId);
  const response = await apiFetch(`${API_BASE_URL}/api/v1/companies/${resolvedCompanyId}/surveys`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load surveys (${response.status})`);
  }

  const data = (await response.json()) as SurveyApiResponse[];
  return data.map(mapSurveyDtoToSurvey);
}

function mapSurveyDtoToSurvey(dto: SurveyApiResponse): Survey {
  return {
    id: dto.id,
    name: dto.name,
    goal: dto.description?.trim() || "No description provided yet.",
    status: mapSurveyStatus(dto.status),
    audience: dto.languageCode.toUpperCase(),
    completions: 0,
    responseRate: "0%",
    updatedAt: formatUpdatedAt(dto.updatedAt),
    channels: [],
    questions: 0,
    owner: "Unassigned",
  };
}

function mapSurveyStatus(status: SurveyApiResponse["status"]): Survey["status"] {
  switch (status) {
    case "PUBLISHED":
      return "Live";
    case "ARCHIVED":
      return "Archived";
    case "DRAFT":
    default:
      return "Draft";
  }
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
