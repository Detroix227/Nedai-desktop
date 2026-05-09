import { create } from "zustand";

type SyncState = {
  status: "idle" | "syncing" | "error";
  lastSyncedAt: string | null;
  errorMessage: string | null;
  chatCount: number;
  startSync: () => void;
  setChatCount: (count: number) => void;
  markSynced: () => void;
  markError: (message: string) => void;
  reset: () => void;
};

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",
  lastSyncedAt: null,
  errorMessage: null,
  chatCount: 0,
  startSync: () =>
    set({
      status: "syncing",
      errorMessage: null,
    }),
  setChatCount: (count) => set({ chatCount: count }),
  markSynced: () =>
    set({
      status: "idle",
      lastSyncedAt: new Date().toISOString(),
      errorMessage: null,
    }),
  markError: (message) =>
    set({
      status: "error",
      errorMessage: message,
    }),
  reset: () =>
    set({
      status: "idle",
      lastSyncedAt: null,
      errorMessage: null,
      chatCount: 0,
    }),
}));
