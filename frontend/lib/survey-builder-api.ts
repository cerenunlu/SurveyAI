import { API_BASE_URL, apiFetch } from "@/lib/api";
import { requireCompanyId, requireCurrentUserId } from "@/lib/auth";
import type { SurveyBuilderQuestion, SurveyBuilderSurvey, SurveyQuestionOption, SurveyQuestionType } from "@/lib/types";

type SurveyStatusDto = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type QuestionTypeDto = "SINGLE_CHOICE" | "MULTI_CHOICE" | "OPEN_ENDED" | "RATING";

type ApiErrorResponse = {
  code?: string;
  message?: string;
  details?: string[];
};

type SurveyApiResponse = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  status: SurveyStatusDto;
  languageCode: string;
  introPrompt: string | null;
  closingPrompt: string | null;
  maxRetryPerQuestion: number | null;
  sourceProvider: "GOOGLE_FORMS" | "FILE_UPLOAD" | null;
  sourceExternalId: string | null;
  sourceFileName: string | null;
  sourcePayloadJson: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

type SurveyQuestionOptionApiResponse = {
  id: string;
  questionId: string;
  companyId: string;
  optionOrder: number;
  optionCode: string;
  label: string;
  value: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type SurveyQuestionApiResponse = {
  id: string;
  surveyId: string;
  companyId: string;
  code: string;
  questionOrder: number;
  questionType: QuestionTypeDto;
  title: string;
  description: string | null;
  required: boolean;
  retryPrompt: string | null;
  branchConditionJson: string | null;
  settingsJson: string | null;
  sourceExternalId: string | null;
  sourcePayloadJson: string | null;
  options: SurveyQuestionOptionApiResponse[];
  createdAt: string;
  updatedAt: string;
};

type CreateSurveyRequest = {
  name: string;
  description: string | null;
  languageCode: string;
  introPrompt: string | null;
  closingPrompt: string | null;
  maxRetryPerQuestion: number;
  createdByUserId: string;
  sourceProvider?: string | null;
  sourceExternalId?: string | null;
  sourceFileName?: string | null;
  sourcePayloadJson?: string | null;
};

type UpdateSurveyRequest = Omit<CreateSurveyRequest, "createdByUserId"> & {
  status: SurveyStatusDto;
};

type UpsertSurveyQuestionRequest = {
  code: string;
  questionOrder: number;
  questionType: QuestionTypeDto;
  title: string;
  description: string | null;
  required: boolean;
  retryPrompt: string | null;
  branchConditionJson: string;
  settingsJson: string;
  sourceExternalId?: string | null;
  sourcePayloadJson?: string | null;
};

type UpsertSurveyQuestionOptionRequest = {
  optionOrder: number;
  optionCode: string;
  label: string;
  value: string;
  active: boolean;
};

type BuilderSettings = {
  builderType?: SurveyQuestionType;
  ratingScale?: 5 | 10;
};

export type BuilderSaveAction = "save" | "draft" | "publish";

export type ImportedSurveyDataResult = {
  surveyId: string;
  operationId: string;
  surveyName: string;
  operationName: string;
  questionCount: number;
  importedResponseCount: number;
  warnings: string[];
};

export type BuilderSaveResult = {
  survey: SurveyBuilderSurvey;
  message: string;
};

export async function fetchSurveyBuilderSurvey(
  surveyId: string,
  companyId?: string,
  init?: RequestInit,
): Promise<SurveyBuilderSurvey> {
  const resolvedCompanyId = requireCompanyId(companyId);
  const [survey, questions] = await Promise.all([
    fetchJson<SurveyApiResponse>(`${API_BASE_URL}/api/v1/companies/${resolvedCompanyId}/surveys/${surveyId}`, {
      ...init,
      method: "GET",
    }),
    fetchJson<SurveyQuestionApiResponse[]>(`${API_BASE_URL}/api/v1/companies/${resolvedCompanyId}/surveys/${surveyId}/questions`, {
      ...init,
      method: "GET",
    }),
  ]);

  return mapApiSurveyToBuilder(survey, questions);
}

export async function saveSurveyBuilderSurvey(
  survey: SurveyBuilderSurvey,
  action: BuilderSaveAction,
  companyId?: string,
): Promise<BuilderSaveResult> {
  const resolvedCompanyId = requireCompanyId(companyId);
  const persistedSurvey = isUuid(survey.id);
  const syncAction = survey.status === "Draft" ? "draft" : action;
  let surveyResponse: SurveyApiResponse;

  if (persistedSurvey) {
    surveyResponse = await updateSurvey(resolvedCompanyId, survey.id, buildSurveyUpdateRequest(survey, syncAction));
  } else {
    surveyResponse = await createSurvey(resolvedCompanyId, buildSurveyCreateRequest(survey));
  }

  const surveyId = surveyResponse.id;
  const existingQuestions = await listSurveyQuestions(resolvedCompanyId, surveyId);
  const syncedQuestions = await syncQuestions(resolvedCompanyId, surveyId, survey.questions, existingQuestions);

  let finalizedSurvey = mapApiSurveyToBuilder(surveyResponse, syncedQuestions);

  if (action === "publish") {
    surveyResponse = await updateSurvey(resolvedCompanyId, surveyId, buildSurveyUpdateRequest(finalizedSurvey, "publish"));
    finalizedSurvey = {
      ...finalizedSurvey,
      status: mapSurveyStatusToBuilder(surveyResponse.status),
      updatedAt: formatDateTime(surveyResponse.updatedAt),
    };
  } else if (!persistedSurvey || survey.status === "Draft" || action === "draft") {
    surveyResponse = await updateSurvey(resolvedCompanyId, surveyId, buildSurveyUpdateRequest(finalizedSurvey, "draft"));
    finalizedSurvey = {
      ...finalizedSurvey,
      status: mapSurveyStatusToBuilder(surveyResponse.status),
      updatedAt: formatDateTime(surveyResponse.updatedAt),
    };
  }

  return {
    survey: finalizedSurvey,
    message: buildSuccessMessage(action, finalizedSurvey.status),
  };
}

async function syncQuestions(
  companyId: string,
  surveyId: string,
  localQuestions: SurveyBuilderQuestion[],
  existingQuestions: SurveyQuestionApiResponse[],
): Promise<SurveyQuestionApiResponse[]> {
  const existingById = new Map(existingQuestions.map((question) => [question.id, question]));
  const localPersistedIds = new Set(localQuestions.filter((question) => existingById.has(question.id)).map((question) => question.id));

  for (const existingQuestion of existingQuestions) {
    if (!localPersistedIds.has(existingQuestion.id)) {
      await deleteQuestion(companyId, surveyId, existingQuestion.id);
    }
  }

  const remainingExistingQuestions = existingQuestions.filter((question) => localPersistedIds.has(question.id));

  for (let index = 0; index < remainingExistingQuestions.length; index += 1) {
    const existingQuestion = remainingExistingQuestions[index];
    await updateQuestion(companyId, surveyId, existingQuestion.id, {
      code: existingQuestion.code,
      questionOrder: 1000 + index,
      questionType: existingQuestion.questionType,
      title: existingQuestion.title,
      description: existingQuestion.description,
      required: existingQuestion.required,
      retryPrompt: existingQuestion.retryPrompt,
      branchConditionJson: normalizeJsonString(existingQuestion.branchConditionJson),
      settingsJson: normalizeJsonString(existingQuestion.settingsJson),
    });
  }

  const syncedQuestions: SurveyQuestionApiResponse[] = [];

  for (let index = 0; index < localQuestions.length; index += 1) {
    const localQuestion = localQuestions[index];
    const currentOrder = index + 1;
    const existingQuestion = existingById.get(localQuestion.id);
    const questionRequest = buildQuestionRequest(localQuestion, currentOrder);

    if (existingQuestion && questionRequest.questionType === "OPEN_ENDED" && hasActiveOptions(existingQuestion.options)) {
      for (const option of existingQuestion.options) {
        await deleteOption(companyId, surveyId, existingQuestion.id, option.id);
      }
    }

    const savedQuestion = existingQuestion
      ? await updateQuestion(companyId, surveyId, existingQuestion.id, questionRequest)
      : await createQuestion(companyId, surveyId, questionRequest);

    const syncedOptions = await syncQuestionOptions(companyId, surveyId, savedQuestion, localQuestion.options ?? []);
    syncedQuestions.push({
      ...savedQuestion,
      options: syncedOptions,
    });
  }

  return syncedQuestions;
}

async function syncQuestionOptions(
  companyId: string,
  surveyId: string,
  question: SurveyQuestionApiResponse,
  localOptions: SurveyQuestionOption[],
): Promise<SurveyQuestionOptionApiResponse[]> {
  if (question.questionType !== "SINGLE_CHOICE" && question.questionType !== "MULTI_CHOICE") {
    if (question.options.length > 0) {
      for (const option of question.options) {
        await deleteOption(companyId, surveyId, question.id, option.id);
      }
    }
    return [];
  }

  const existingById = new Map(question.options.map((option) => [option.id, option]));
  const localPersistedIds = new Set(localOptions.filter((option) => existingById.has(option.id)).map((option) => option.id));

  for (const option of question.options) {
    if (!localPersistedIds.has(option.id)) {
      await deleteOption(companyId, surveyId, question.id, option.id);
    }
  }

  const remainingOptions = question.options.filter((option) => localPersistedIds.has(option.id));
  for (let index = 0; index < remainingOptions.length; index += 1) {
    const option = remainingOptions[index];
    await updateOption(companyId, surveyId, question.id, option.id, {
      optionOrder: 1000 + index,
      optionCode: option.optionCode,
      label: option.label,
      value: option.value,
      active: option.active,
    });
  }

  const syncedOptions: SurveyQuestionOptionApiResponse[] = [];
  for (let index = 0; index < localOptions.length; index += 1) {
    const localOption = localOptions[index];
    const optionRequest = buildOptionRequest(localOption, index + 1);
    const existingOption = existingById.get(localOption.id);
    const savedOption = existingOption
      ? await updateOption(companyId, surveyId, question.id, existingOption.id, optionRequest)
      : await createOption(companyId, surveyId, question.id, optionRequest);

    syncedOptions.push(savedOption);
  }

  return syncedOptions;
}

function buildSurveyCreateRequest(survey: SurveyBuilderSurvey): CreateSurveyRequest {
  return {
    name: requireText(survey.name, "Survey name is required"),
    description: toNullableText(survey.summary),
    languageCode: sanitizeLanguageCode(survey.languageCode),
    introPrompt: toNullableText(survey.introPrompt),
    closingPrompt: toNullableText(survey.closingPrompt),
    maxRetryPerQuestion: normalizeRetryCount(survey.maxRetryPerQuestion),
    createdByUserId: requireCurrentUserId(),
    sourceProvider: survey.source?.provider,
    sourceExternalId: toNullableText(survey.source?.externalId),
    sourceFileName: toNullableText(survey.source?.fileName),
    sourcePayloadJson: toNullableText(survey.source?.payloadJson),
  };
}

export async function importSurveyBuilderData(
  surveyId: string,
  file: File,
  options?: {
    companyId?: string;
    operationName?: string;
  },
): Promise<ImportedSurveyDataResult> {
  const companyId = requireCompanyId(options?.companyId);
  const formData = new FormData();
  formData.set("file", file);
  if (options?.operationName?.trim()) {
    formData.set("operationName", options.operationName.trim());
  }

  const response = await apiFetch(
    `${API_BASE_URL}/api/v1/companies/${companyId}/surveys/${surveyId}/imports/completed-results`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as ImportedSurveyDataResult;
}

function buildSurveyUpdateRequest(survey: SurveyBuilderSurvey, action: BuilderSaveAction): UpdateSurveyRequest {
  return {
    name: requireText(survey.name, "Survey name is required"),
    description: toNullableText(survey.summary),
    languageCode: sanitizeLanguageCode(survey.languageCode),
    introPrompt: toNullableText(survey.introPrompt),
    closingPrompt: toNullableText(survey.closingPrompt),
    maxRetryPerQuestion: normalizeRetryCount(survey.maxRetryPerQuestion),
    sourceProvider: survey.source?.provider,
    sourceExternalId: toNullableText(survey.source?.externalId),
    sourceFileName: toNullableText(survey.source?.fileName),
    sourcePayloadJson: toNullableText(survey.source?.payloadJson),
    status: resolveTargetSurveyStatus(survey, action),
  };
}

function buildQuestionRequest(question: SurveyBuilderQuestion, questionOrder: number): UpsertSurveyQuestionRequest {
  const parsedSettings = parseBuilderSettings(question.settingsJson);
  const mergedSettings: BuilderSettings = {
    ...parsedSettings,
    builderType: question.type,
  };

  if (question.type === "rating_1_5") {
    mergedSettings.ratingScale = 5;
  }
  if (question.type === "rating_1_10") {
    mergedSettings.ratingScale = 10;
  }

  return {
    code: normalizeQuestionCode(question, questionOrder),
    questionOrder,
    questionType: mapBuilderQuestionTypeToApi(question.type),
    title: requireText(question.title, "Question title is required"),
    description: toNullableText(question.description),
    required: question.required,
    retryPrompt: toNullableText(question.retryPrompt),
    branchConditionJson: normalizeJsonString(question.branchConditionJson),
    settingsJson: JSON.stringify(mergedSettings),
    sourceExternalId: toNullableText(question.sourceExternalId),
    sourcePayloadJson: toNullableText(question.sourcePayloadJson),
  };
}

function buildOptionRequest(option: SurveyQuestionOption, optionOrder: number): UpsertSurveyQuestionOptionRequest {
  const normalizedLabel = requireText(option.label, "Option label is required");
  const optionCode = normalizeOptionCode(option, optionOrder);
  return {
    optionOrder,
    optionCode,
    label: normalizedLabel,
    value: normalizeOptionValue(option, optionOrder),
    active: true,
  };
}

function mapApiSurveyToBuilder(
  survey: SurveyApiResponse,
  questions: SurveyQuestionApiResponse[],
): SurveyBuilderSurvey {
  const mappedQuestions = questions
    .slice()
    .sort((left, right) => left.questionOrder - right.questionOrder)
    .map(mapApiQuestionToBuilder);

  return {
    id: survey.id,
    name: survey.name,
    summary: survey.description ?? "",
    status: mapSurveyStatusToBuilder(survey.status),
    createdAt: formatDateTime(survey.createdAt),
    publishedAt: survey.status === "PUBLISHED" ? formatDateTime(survey.updatedAt) : null,
    updatedAt: formatDateTime(survey.updatedAt),
    questionCount: mappedQuestions.length,
    languageCode: survey.languageCode,
    introPrompt: survey.introPrompt ?? "",
    closingPrompt: survey.closingPrompt ?? "",
    maxRetryPerQuestion: survey.maxRetryPerQuestion ?? 2,
    source: survey.sourceProvider
      ? {
          provider: survey.sourceProvider,
          externalId: survey.sourceExternalId ?? undefined,
          fileName: survey.sourceFileName ?? undefined,
          payloadJson: survey.sourcePayloadJson ?? undefined,
        }
      : undefined,
    questions: mappedQuestions,
  };
}

function mapApiQuestionToBuilder(question: SurveyQuestionApiResponse): SurveyBuilderQuestion {
  const settings = parseBuilderSettings(question.settingsJson);
  const builderType = mapApiQuestionTypeToBuilder(question.questionType, settings);

  return {
    id: question.id,
    code: question.code,
    type: builderType,
    title: question.title,
    description: question.description ?? "",
    required: question.required,
    retryPrompt: question.retryPrompt ?? "",
    branchConditionJson: normalizeJsonString(question.branchConditionJson),
    settingsJson: normalizeJsonString(question.settingsJson),
    sourceExternalId: question.sourceExternalId ?? undefined,
    sourcePayloadJson: question.sourcePayloadJson ?? undefined,
    options: mapQuestionOptions(question.options),
  };
}

function mapQuestionOptions(options: SurveyQuestionOptionApiResponse[]): SurveyQuestionOption[] | undefined {
  if (options.length === 0) {
    return undefined;
  }

  return options
    .filter((option) => option.active)
    .sort((left, right) => left.optionOrder - right.optionOrder)
    .map((option) => ({
      id: option.id,
      label: option.label,
      code: option.optionCode,
      value: option.value,
    }));
}

function mapApiQuestionTypeToBuilder(questionType: QuestionTypeDto, settings: BuilderSettings): SurveyQuestionType {
  if (settings.builderType) {
    return settings.builderType;
  }

  switch (questionType) {
    case "MULTI_CHOICE":
      return "multi_choice";
    case "RATING":
      return settings.ratingScale === 5 ? "rating_1_5" : "rating_1_10";
    case "SINGLE_CHOICE":
      return "single_choice";
    case "OPEN_ENDED":
    default:
      return "short_text";
  }
}

function mapBuilderQuestionTypeToApi(type: SurveyQuestionType): QuestionTypeDto {
  if (type === "single_choice" || type === "dropdown" || type === "yes_no") {
    return "SINGLE_CHOICE";
  }
  if (type === "multi_choice") {
    return "MULTI_CHOICE";
  }
  if (type === "rating_1_5" || type === "rating_1_10") {
    return "RATING";
  }
  return "OPEN_ENDED";
}

function mapSurveyStatusToBuilder(status: SurveyStatusDto): SurveyBuilderSurvey["status"] {
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

function resolveTargetSurveyStatus(survey: SurveyBuilderSurvey, action: BuilderSaveAction): SurveyStatusDto {
  if (action === "publish") {
    return "PUBLISHED";
  }
  if (action === "draft") {
    return "DRAFT";
  }

  if (survey.status === "Live") {
    return "PUBLISHED";
  }
  if (survey.status === "Archived") {
    return "ARCHIVED";
  }
  return "DRAFT";
}

function parseBuilderSettings(payload: string | null | undefined): BuilderSettings {
  if (!payload) {
    return {};
  }

  try {
    const parsed = JSON.parse(payload) as BuilderSettings;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeJsonString(payload: string | null | undefined): string {
  if (!payload || !payload.trim()) {
    return "{}";
  }

  try {
    return JSON.stringify(JSON.parse(payload));
  } catch {
    return "{}";
  }
}

function normalizeQuestionCode(question: SurveyBuilderQuestion, index: number): string {
  const raw = question.code?.trim() || `question_${index}_${slugify(question.title)}`;
  return normalizeCode(raw, `question_${index}`);
}

function normalizeOptionCode(option: SurveyQuestionOption, index: number): string {
  const raw = option.code?.trim() || `option_${index}_${slugify(option.label)}`;
  return normalizeCode(raw, `option_${index}`);
}

function normalizeOptionValue(option: SurveyQuestionOption, index: number): string {
  const raw = option.value?.trim() || slugify(option.label);
  const normalized = normalizeCode(raw, `option_${index}`).toLowerCase();
  return normalized.slice(0, 255);
}

function normalizeCode(value: string, fallback: string): string {
  const collapsed = value
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!collapsed) {
    return fallback;
  }

  return collapsed.slice(0, 100);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sanitizeLanguageCode(value: string): string {
  const normalized = requireText(value || "tr", "Language code is required").toLowerCase();
  return normalized.slice(0, 10);
}

function normalizeRetryCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 2;
  }

  return Math.min(10, Math.max(0, Math.round(value)));
}

function requireText(value: string | null | undefined, message: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(message);
  }
  return normalized;
}

function toNullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function hasActiveOptions(options: SurveyQuestionOptionApiResponse[]): boolean {
  return options.some((option) => option.active);
}

function buildSuccessMessage(action: BuilderSaveAction, status: SurveyBuilderSurvey["status"]): string {
  if (action === "publish" || status === "Live") {
    return "Anket yayınlandı.";
  }
  if (action === "draft") {
    return "Taslak kaydedildi.";
  }
  return "Değişiklikler kaydedildi.";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Az önce güncellendi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

async function createSurvey(companyId: string, body: CreateSurveyRequest): Promise<SurveyApiResponse> {
  return fetchJson<SurveyApiResponse>(`${API_BASE_URL}/api/v1/companies/${companyId}/surveys`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function updateSurvey(companyId: string, surveyId: string, body: UpdateSurveyRequest): Promise<SurveyApiResponse> {
  return fetchJson<SurveyApiResponse>(`${API_BASE_URL}/api/v1/companies/${companyId}/surveys/${surveyId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

async function listSurveyQuestions(companyId: string, surveyId: string): Promise<SurveyQuestionApiResponse[]> {
  return fetchJson<SurveyQuestionApiResponse[]>(`${API_BASE_URL}/api/v1/companies/${companyId}/surveys/${surveyId}/questions`, {
    method: "GET",
  });
}

async function createQuestion(
  companyId: string,
  surveyId: string,
  body: UpsertSurveyQuestionRequest,
): Promise<SurveyQuestionApiResponse> {
  return fetchJson<SurveyQuestionApiResponse>(`${API_BASE_URL}/api/v1/companies/${companyId}/surveys/${surveyId}/questions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function updateQuestion(
  companyId: string,
  surveyId: string,
  questionId: string,
  body: UpsertSurveyQuestionRequest,
): Promise<SurveyQuestionApiResponse> {
  return fetchJson<SurveyQuestionApiResponse>(
    `${API_BASE_URL}/api/v1/companies/${companyId}/surveys/${surveyId}/questions/${questionId}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

async function deleteQuestion(companyId: string, surveyId: string, questionId: string): Promise<void> {
  await fetchJson<void>(`${API_BASE_URL}/api/v1/companies/${companyId}/surveys/${surveyId}/questions/${questionId}`, {
    method: "DELETE",
  });
}

async function createOption(
  companyId: string,
  surveyId: string,
  questionId: string,
  body: UpsertSurveyQuestionOptionRequest,
): Promise<SurveyQuestionOptionApiResponse> {
  return fetchJson<SurveyQuestionOptionApiResponse>(
    `${API_BASE_URL}/api/v1/companies/${companyId}/surveys/${surveyId}/questions/${questionId}/options`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

async function updateOption(
  companyId: string,
  surveyId: string,
  questionId: string,
  optionId: string,
  body: UpsertSurveyQuestionOptionRequest,
): Promise<SurveyQuestionOptionApiResponse> {
  return fetchJson<SurveyQuestionOptionApiResponse>(
    `${API_BASE_URL}/api/v1/companies/${companyId}/surveys/${surveyId}/questions/${questionId}/options/${optionId}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

async function deleteOption(companyId: string, surveyId: string, questionId: string, optionId: string): Promise<void> {
  await fetchJson<void>(
    `${API_BASE_URL}/api/v1/companies/${companyId}/surveys/${surveyId}/questions/${questionId}/options/${optionId}`,
    {
      method: "DELETE",
    },
  );
}

async function fetchJson<T>(input: string, init: RequestInit): Promise<T> {
  const response = await apiFetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    const details = payload.details?.filter(Boolean) ?? [];
    const message = payload.message?.trim() || `Request failed (${response.status})`;
    return details.length > 0 ? `${message}: ${details.join(" ")}` : message;
  } catch {
    return `Request failed (${response.status})`;
  }
}









