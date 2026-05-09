export interface IElectronAPI {
  pingServer: () => Promise<boolean>;
  ingestFile: (path: string) => Promise<number>;
  queryLocalBrain: (query: string) => Promise<string>;
  onBootstrapStatus: (callback: (status: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI | undefined;
  }
}
