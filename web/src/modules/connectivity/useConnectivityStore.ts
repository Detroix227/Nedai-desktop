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
      // 2. Try a simple HEAD request to the server (faster than GET)
      const response = await fetch(`${import.meta.env.VITE_SERVER_ORIGIN}/health`, {
        method: 'HEAD',
        cache: 'no-store',
        // Short timeout: if the server is so slow it doesn't respond in 5s, 
        // we might as well use local mode on desktop, but on web we'll stay optimistic.
        signal: AbortSignal.timeout(5000), 
      });
      
      set({ isOnline: response.ok, lastChecked: new Date(), isChecking: false });
    } catch (error) {
      // 3. Fallback: If fetch fails but navigator says we're online,
      // stay online — respect the user's brain mode toggle instead of auto-switching.
      set({ isOnline: true, lastChecked: new Date(), isChecking: false });
    }
  },
}));
