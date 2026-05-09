import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { isApiClientError } from "@/lib/http";
import * as DocumentApi from "@/modules/documents/document.api";
import {
  confirmUpload,
  presignUpload,
  uploadToR2,
} from "@/modules/documents/uploadthing";
import type { DocumentQuota, DocumentSummary } from "@/modules/contracts";

type DocumentStore = {
  hydrated: boolean;
  status: "idle" | "loading" | "uploading" | "error";
  uploadProgress: number;
  errorMessage: string | null;
  documents: DocumentSummary[];
  quota: DocumentQuota | null;
  loadDocuments: (
    token: string,
    options?: { silent?: boolean },
  ) => Promise<void>;
  uploadDocument: (
    token: string,
    file: { uri: string; name: string; mimeType: string; file?: File },
  ) => Promise<void>;
  deleteDocument: (
    token: string,
    documentId: string,
  ) => Promise<void>;
  reprocessDocument: (token: string, documentId: string) => Promise<void>;
  clearError: () => void;
  resetSession: () => void;
  markHydrated: () => void;
};

function getErrorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      status: "idle",
      uploadProgress: 0,
      errorMessage: null,
      documents: [],
      quota: null,
      loadDocuments: async (token, options) => {
        const silent = options?.silent === true;

        if (!silent) {
          set({ status: "loading", errorMessage: null });
        }

        try {
          const response = await DocumentApi.listDocuments(token);
          set((state) => ({
            status:
              silent && state.status === "uploading" ? "uploading" : "idle",
            errorMessage: silent ? state.errorMessage : null,
            documents: response.documents,
            quota: response.quota,
          }));
        } catch (error) {
          if (silent) {
            throw error;
          }

          set({
            status: "error",
            errorMessage: getErrorMessage(error),
          });
        }
      },
      uploadDocument: async (token, file) => {
        set({ status: "uploading", uploadProgress: 0, errorMessage: null });

        try {
          const uploadFile = file.file instanceof File
            ? file.file
            : (() => { throw new Error("Missing File object."); })();

          // Step 1 — get presigned R2 URL from our server
          const { uploadUrl, fileKey, publicUrl } = await presignUpload(token, {
            fileName: uploadFile.name,
            mimeType: uploadFile.type || file.mimeType,
            fileSize: uploadFile.size,
          });

          // Step 2 — upload directly to R2 (with progress)
          await uploadToR2(uploadUrl, uploadFile, (pct) => {
            set({ uploadProgress: pct });
          });

          // Step 3 — confirm with our server to create the DB record
          await confirmUpload(token, {
            file: {
              name: uploadFile.name,
              size: uploadFile.size,
              type: uploadFile.type || file.mimeType,
              key: fileKey,
              publicUrl,
            },
          });

          await get().loadDocuments(token);
          set({ uploadProgress: 0, status: "idle" });
        } catch (error) {
          set({
            status: "error",
            uploadProgress: 0,
            errorMessage: getErrorMessage(error),
          });
          throw error;
        }
      },
      deleteDocument: async (token, documentId) => {
        set({ status: "loading", errorMessage: null });

        try {
          await DocumentApi.deleteDocument(token, documentId);
          set((state) => ({
            status: "idle",
            documents: state.documents.filter(
              (document) => document.id !== documentId,
            ),
          }));
          await get().loadDocuments(token);
        } catch (error) {
          set({
            status: "error",
            errorMessage: getErrorMessage(error),
          });
        }
      },
      reprocessDocument: async (token, documentId) => {
        set({ status: "loading", errorMessage: null });

        try {
          await DocumentApi.reprocessDocument(token, documentId);
          await get().loadDocuments(token);
        } catch (error) {
          set({
            status: "error",
            errorMessage: getErrorMessage(error),
          });
        }
      },
      clearError: () => set({ errorMessage: null, status: "idle" }),
      resetSession: () =>
        set({
          documents: [],
          quota: null,
          errorMessage: null,
          status: "idle",
        }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "nedai-document-store",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
