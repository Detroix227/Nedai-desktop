import { create } from 'zustand';

interface ConnectivityState {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  checkConnection: () => Promise<void>;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true, // Default to true, heartbeat will correct it
  isChecking: false,
  lastChecked: null,
  checkConnection: async () => {
    // 1. First, check the browser's native online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ isOnline: false, lastChecked: new Date(), isChecking: false });
      return;
    }

    set({ isChecking: true });
    try {
      // 2. Try a simple health check GET request to the server
      const response = await fetch(`${import.meta.env.VITE_SERVER_ORIGIN}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000), 
      });
      
      set({ isOnline: response.ok, lastChecked: new Date(), isChecking: false });
    } catch (error) {
      // 3. If fetch fails (e.g. server is down or network dns resolution fails), user is offline
      set({ isOnline: false, lastChecked: new Date(), isChecking: false });
    }
  },
}));
