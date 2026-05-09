import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface LocalDocument {
  id: string;
  name: string;
  path: string;
  status: "indexed" | "indexing" | "error";
  chunks?: number;
  addedAt: string;
}

interface LocalVaultState {
  documents: LocalDocument[];
  isIndexing: boolean;
  addDocument: (path: string, name: string) => Promise<void>;
  removeDocument: (id: string) => void;
}

export const useLocalVaultStore = create<LocalVaultState>()(
  persist(
    (set) => ({
      documents: [],
      isIndexing: false,
      addDocument: async (path: string, name: string) => {
        // NOTE: Standard <input type="file"> doesn't give the full path for security.
        // We use window.electronAPI.openFileDialog instead.
        const id = Math.random().toString(36).substring(7);
        const newDoc: LocalDocument = {
          id,
          name,
          path,
          status: "indexing",
          addedAt: new Date().toISOString(),
        };

        set((state) => ({
          documents: [newDoc, ...state.documents],
          isIndexing: true,
        }));

        try {
          if (window.electronAPI) {
            const chunks = await window.electronAPI.ingestFile(path);
            set((state) => ({
              documents: state.documents.map((d) =>
                d.id === id ? { ...d, status: "indexed", chunks } : d
              ),
              isIndexing: false,
            }));
          }
        } catch (error) {
          console.error("Local indexing failed:", error);
          set((state) => ({
            documents: state.documents.map((d) =>
              d.id === id ? { ...d, status: "error" } : d
            ),
            isIndexing: false,
          }));
        }
      },
      removeDocument: (id: string) => {
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
        }));
        // Note: Currently engine.js doesn't support deleting from LanceDB easily
        // via IPC, but we can add that later if needed.
      },
    }),
    {
      name: "nedai-local-vault",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
