const localApiBaseUrl = "http://localhost:8080";
const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? inferPublicApiBaseUrl();
const internalApiBaseUrl = process.env.INTERNAL_API_BASE_URL ?? publicApiBaseUrl;

export const API_BASE_URL = typeof window === "undefined" ? internalApiBaseUrl : publicApiBaseUrl;

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
    cache: "no-store",
  });
}

function inferPublicApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return localApiBaseUrl;
  }

  const { protocol, hostname } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return localApiBaseUrl;
  }

  if (hostname.includes("-frontend-")) {
    return `${protocol}//${hostname.replace("-frontend-", "-backend-")}`;
  }

  if (hostname.includes("frontend")) {
    return `${protocol}//${hostname.replace("frontend", "backend")}`;
  }

  return localApiBaseUrl;
}
