export interface IElectronAPI {
  pingServer: () => Promise<boolean>;
  ingestFile: (path: string) => Promise<number>;
  queryLocalBrain: (query: string) => Promise<string>;
  onBootstrapStatus: (callback: (status: string) => void) => void;
  onAuthToken: (callback: (token: string) => void) => void;
  openFileDialog: () => Promise<{ path: string; name: string } | null>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI | undefined;
  }
}
