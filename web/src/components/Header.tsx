import { History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/modules/auth/useAuthStore";
import { useConnectivityStore } from "@/modules/connectivity/useConnectivityStore";

export function Header({
  title,
  onHistory,
}: {
  title: string;
  onHistory?: () => void;
}) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const displayName = user?.fullName || user?.email || "NedAI User";
  const initials = displayName.slice(0, 1).toUpperCase();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  
  const handleProfileClick = () => {
    navigate("/profile");
  };
  return (
    <header className="flex flex-row items-center justify-between px-4 pt-4 pb-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="flex flex-row items-center shrink-1">
        <div className="flex items-center justify-center mr-3">
          <img src="nedai-text-logo.png" alt="NedAI" className="h-8 object-contain" />
        </div>
        <div>
          <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400 block">
            NedAI Workspace
          </span>
          <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex flex-row items-center gap-2">
        {onHistory && (
          <button
            onClick={onHistory}
            className="flex flex-row items-center px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <History size={16} className="text-slate-500 dark:text-slate-400" strokeWidth={2} />
            <span className="ml-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">History</span>
          </button>
        )}

        {/* User Profile - Clickable to navigate to profile */}
        <button
          onClick={handleProfileClick}
          className="flex flex-row items-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2 py-2 transition cursor-pointer"
        >
          <div className="relative mr-3 h-10 w-10 flex shrink-0 items-center justify-center rounded-full bg-orange-100">
            <span className="text-sm font-bold text-orange-700">
              {initials}
            </span>
            {/* Pulse Indicator */}
            <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`} />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {displayName}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                {user?.email ?? "No active session"}
              </span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30' 
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </button>
      </div>
    </header>
  );
}
