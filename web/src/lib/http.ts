import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";

import { API_BASE_URL } from "@/lib/env";
import type { ApiErrorPayload, ApiResponse } from "@/modules/contracts";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

function isFormDataBody(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

export class ApiClientError extends Error {
  status: number;
  data?: ApiErrorPayload["data"];

  constructor(status: number, message: string, data?: ApiErrorPayload["data"]) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

function ensureApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new ApiClientError(
      500,
      "Missing EXPO_PUBLIC_API_URL. Update nedai-app/.env and restart Expo.",
    );
  }
}

const httpClient = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: {
    Accept: "application/json",
  },
});

function getAxiosErrorPayload(error: AxiosError<ApiErrorPayload>) {
  const responseData = error.response?.data;

  if (
    responseData &&
    typeof responseData === "object" &&
    "message" in responseData
  ) {
    return responseData;
  }

  return null;
}

function buildRequestUrl(path: string) {
  return `${API_BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function getApiErrorPayload(value: unknown) {
  if (value && typeof value === "object" && "message" in value) {
    return value as ApiErrorPayload;
  }

  return null;
}

function getApiSuccessPayload<T>(value: unknown) {
  if (value && typeof value === "object" && "data" in value) {
    return value as ApiResponse<T>;
  }

  return null;
}

async function requestFormData<T>(
  path: string,
  config: Omit<RequestInit, "body"> & { body: FormData },
) {
  const response = await fetch(buildRequestUrl(path), config);

  if (response.status === 204) {
    return {} as T;
  }

  const rawBody = await response.text();
  const parsedBody = rawBody ? (JSON.parse(rawBody) as unknown) : null;

  if (!response.ok) {
    const payload = getApiErrorPayload(parsedBody);

    throw new ApiClientError(
      response.status,
      payload?.message || `Request failed with status ${response.status}`,
      payload?.data,
    );
  }

  const envelope = getApiSuccessPayload<T>(parsedBody);

  if (!envelope) {
    throw new ApiClientError(response.status, "Invalid server response");
  }

  if (envelope.success === false) {
    throw new ApiClientError(response.status, envelope.message, undefined);
  }

  return envelope.data;
}

export async function request<T>(path: string, options: RequestOptions = {}) {
  ensureApiBaseUrl();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body !== undefined && !isFormDataBody(options.body)) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const config: AxiosRequestConfig = {
    url: path,
    method: options.method ?? "GET",
    headers,
    data: options.body,
  };

  try {
    if (isFormDataBody(options.body)) {
      return await requestFormData<T>(path, {
        method: options.method ?? "GET",
        headers,
        body: options.body,
      });
    }

    const response = await httpClient.request<ApiResponse<T>>(config);

    if (response.status === 204) {
      return {} as T;
    }

    const envelope = response.data;

    if (!envelope || typeof envelope !== "object" || !("data" in envelope)) {
      throw new ApiClientError(response.status, "Invalid server response");
    }

    if (envelope.success === false) {
      throw new ApiClientError(response.status, envelope.message, undefined);
    }

    return envelope.data;
  } catch (error) {
    if (axios.isAxiosError<ApiErrorPayload>(error)) {
      const payload = getAxiosErrorPayload(error);

      throw new ApiClientError(
        error.response?.status ?? 0,
        payload?.message || error.message || "Unable to reach the server",
        payload?.data,
      );
    }

    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApiClientError(0, error.message || "Unable to reach the server");
    }

    throw new ApiClientError(0, "Unable to reach the server");
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
