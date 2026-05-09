import { History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/modules/auth/useAuthStore";

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
  
  const handleProfileClick = () => {
    navigate("/profile");
  };
  return (
    <header className="flex flex-row items-center justify-between px-4 pt-4 pb-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="flex flex-row items-center shrink-1">
        <div className="flex items-center justify-center mr-3">
          <img src="/nedai-text-logo.png" alt="NedAI" className="h-8 object-contain" />
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
          <div className="mr-3 h-10 w-10 flex shrink-0 items-center justify-center rounded-full bg-orange-100">
            <span className="text-sm font-bold text-orange-700">
              {initials}
            </span>
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {displayName}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
              {user?.email ?? "No active session"}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}
