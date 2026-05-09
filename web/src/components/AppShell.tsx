import React, { useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { useUIStore } from "@/modules/ui/useUIStore";
import { useConnectivityStore } from "@/modules/connectivity/useConnectivityStore";

export function AppShell({
  title,
  onHistory,
  children,
}: {
  title: string;
  onHistory?: () => void;
  children: React.ReactNode;
}) {
  const { theme } = useUIStore();

  const { checkConnection } = useConnectivityStore();

  useEffect(() => {
    // Initial check
    void checkConnection();

    // Set up 30-second heartbeat
    const interval = setInterval(() => {
      void checkConnection();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <div className={`flex h-[100dvh] overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-slate-900">
        <Header title={title} onHistory={onHistory} />
        <div className="flex-1 overflow-y-auto relative bg-slate-50/30 dark:bg-slate-900/50">
          {children}
        </div>
      </div>
    </div>
  );
}
