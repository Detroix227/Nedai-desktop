function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function deriveServerOrigin(apiBaseUrl: string) {
  const normalizedApiBaseUrl = trimTrailingSlashes(apiBaseUrl);

  return normalizedApiBaseUrl.replace(/\/api\/v1$/, "");
}

function deriveUploadThingUrl(serverOrigin: string, apiBaseUrl: string) {
  if (serverOrigin) {
    return `${trimTrailingSlashes(serverOrigin)}/api/uploadthing`;
  }

  const normalizedApiBaseUrl = trimTrailingSlashes(apiBaseUrl);

  if (/\/api\/v1$/.test(normalizedApiBaseUrl)) {
    return normalizedApiBaseUrl.replace(/\/api\/v1$/, "/api/uploadthing");
  }

  return "";
}

export const API_BASE_URL = import.meta.env.PROD 
  ? "https://nedai-server-yrta.onrender.com/api/v1" 
  : (import.meta.env.VITE_API_BASE_URL?.trim() ?? "");

export const SERVER_ORIGIN = import.meta.env.PROD
  ? "https://nedai-server-yrta.onrender.com"
  : trimTrailingSlashes(
      import.meta.env.VITE_SERVER_ORIGIN?.trim() ?? deriveServerOrigin(API_BASE_URL),
    );
export const UPLOADTHING_URL = deriveUploadThingUrl(SERVER_ORIGIN, API_BASE_URL);
