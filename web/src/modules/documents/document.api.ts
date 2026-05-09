import { request } from "@/lib/http";
import type {
  ServerGetDocumentResponse,
  ServerListDocumentsResponse,
  ServerReprocessDocumentResponse,
} from "@/modules/contracts";

type ListDocumentsOptions = {
  documentName?: string;
};

function buildListDocumentsPath(options?: ListDocumentsOptions) {
  if (!options?.documentName?.trim()) {
    return "/documents";
  }

  const searchParams = new URLSearchParams({
    documentName: options.documentName.trim(),
  });

  return `/documents?${searchParams.toString()}`;
}

export function listDocuments(token: string, options?: ListDocumentsOptions) {
  return request<ServerListDocumentsResponse>(buildListDocumentsPath(options), {
    token,
  });
}

export function getDocument(token: string, documentId: string) {
  return request<ServerGetDocumentResponse>(`/documents/${documentId}`, {
    token,
  });
}

export function deleteDocument(token: string, documentId: string) {
  return request<Record<string, never>>(`/documents/${documentId}`, {
    method: "DELETE",
    token,
  });
}

export function reprocessDocument(token: string, documentId: string) {
  return request<ServerReprocessDocumentResponse>(
    `/documents/${documentId}/reprocess`,
    {
      method: "POST",
      token,
    },
  );
}
