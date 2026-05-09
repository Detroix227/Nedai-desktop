import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  FolderOpen,
  MessageSquare,
  Plus,
  User,
  Menu,
  Settings,
  Trash2,
  ShieldAlert,
  Moon,
  Sun,
  Database,
} from "lucide-react";
import { useChatStore } from "@/modules/chat/useChatStore";
import { useUIStore } from "@/modules/ui/useUIStore";
import { useAuthStore } from "@/modules/auth/useAuthStore";
import { ChatItem } from "./ChatItem";
import { NotificationBell } from "./NotificationBell";

const STUDY_TOOLS = [
  {
    key: "chat",
    label: "Chat",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    key: "knowledge-vault",
    label: "Knowledge Vault",
    href: "/knowledge-vault",
    icon: FolderOpen,
  },
  {
    key: "local-vault",
    label: "Local Vault",
    href: "/local-vault",
    icon: Database,
  },
  {
    key: "timetable",
    label: "Timetable",
    href: "/timetable",
    icon: CalendarDays,
  },
  {
    key: "profile",
    label: "Profile",
    href: "/profile",
    icon: User,
  },
] as const;

export function Sidebar() {
  const threads = useChatStore((state) => state.threads);
  const activeThreadId = useChatStore((state) => state.activeThreadId);
  const selectThread = useChatStore((state) => state.selectThread);
  const startFreshChat = useChatStore((state) => state.startFreshChat);
  const clearChatHistory = useChatStore((state) => state.clearChatHistory);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebar, setCurrentSection, setSidebarCollapsed, theme, toggleTheme } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleMobileNav = () => {
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  };

  function handleSelectRecentThread(threadId: string) {
    navigate("/chat");
    void selectThread(threadId);
    handleMobileNav();
  }

  const activePath = location.pathname;

  return (
    <>
      {/* Collapsed Sidebar */}
      {isSidebarCollapsed && (
        <div className="w-16 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col h-[100dvh] sticky top-0 shrink-0 flex z-40">
          <div className="flex-1 flex flex-col items-center py-4 space-y-4">
            {/* Hamburger Menu Button */}
            <button
              onClick={toggleSidebar}
              className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition shadow-md"
            >
              <Menu size={20} className="text-white" strokeWidth={3} />
            </button>
            
            {/* Quick Access Icons */}
            <div className="flex flex-col space-y-3">
              {STUDY_TOOLS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                const handleClick = () => {
                  setCurrentSection(item.key);
                  navigate(item.href);
                };
                
                return (
                  <button
                    key={item.key}
                    onClick={handleClick}
                    className={`p-3 rounded-xl transition ${
                      isActive ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    title={item.label}
                  >
                    <Icon
                      size={18}
                      className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}
                      strokeWidth={2}
                    />
                  </button>
                );
              })}
              
              {/* Admin Icon */}
              {user?.role === "ADMIN" && (
                <button
                  onClick={() => {
                    setCurrentSection('admin');
                    navigate("/admin");
                  }}
                  className={`p-3 rounded-xl transition ${
                    location.pathname === "/admin" ? "bg-rose-50 dark:bg-rose-900/30" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  title="Admin Dashboard"
                >
                  <ShieldAlert
                    size={18}
                    className={location.pathname === "/admin" ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}
                    strokeWidth={2}
                  />
                </button>
              )}
              
              {/* Settings Icon - Separate from STUDY_TOOLS */}
              <button
                onClick={() => {
                  setCurrentSection('settings');
                  navigate("/settings");
                }}
                className={`p-3 rounded-xl transition ${
                  location.pathname === "/settings" ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title="Settings"
              >
                <Settings
                  size={18}
                  className={location.pathname === "/settings" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}
                  strokeWidth={2}
                />
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-3 rounded-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === 'dark' ? (
                  <Sun size={18} className="text-amber-500" strokeWidth={2} />
                ) : (
                  <Moon size={18} className="text-slate-500" strokeWidth={2} />
                )}
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <NotificationBell />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Expanded Sidebar */}
      {!isSidebarCollapsed && (
        <>
          {/* Mobile/Tablet Overlay */}
          <div 
            className="lg:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm" 
            onClick={() => setSidebarCollapsed(true)}
          />
          <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-[100dvh] fixed lg:sticky top-0 left-0 z-50 shrink-0 overflow-hidden shadow-2xl lg:shadow-none transition-transform">
          {/* Header - Fixed */}
          <div className="px-4 pt-4 pb-4 shrink-0">
            {/* Logo and Menu Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <img src="/nedai-symbol.png" alt="NedAI" className="w-8 h-8 object-contain" />
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">NedAI</span>
              </div>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Menu size={20} className="text-slate-600 dark:text-slate-400" strokeWidth={2} />
              </button>
            </div>
            
            
            {/* New Chat Button */}
            <button
              onClick={() => {
                startFreshChat();
                navigate("/chat");
                setCurrentSection('chat');
                handleMobileNav();
              }}
              className="w-full flex flex-row items-center justify-center rounded-xl bg-blue-600 py-3 shadow-md hover:bg-blue-700 transition"
            >
              <Plus size={20} className="text-white" strokeWidth={3} />
              <span className="ml-2 text-base font-bold text-white">
                New Chat
              </span>
            </button>
          </div>

          {/* Study Tools - Fixed */}
          <div className="px-4 pb-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Study Tools
            </h3>
            {STUDY_TOOLS.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href;

              const handleClick = () => {
                setCurrentSection(item.key);
                navigate(item.href);
                handleMobileNav();
              };

              return (
                <button
                  key={item.key}
                  onClick={handleClick}
                  className={`w-full mb-1 flex flex-row items-center rounded-xl p-3 transition ${
                    isActive ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}
                    strokeWidth={2}
                  />
                  <span
                    className={`ml-3 text-sm ${
                      isActive ? "font-semibold text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300 font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Recent Chats - Scrollable */}
          <div className="flex-1 px-4 mt-6 overflow-y-auto min-h-0">
            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 py-1 z-10 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Recent Chats
              </h3>
              {threads.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 transition"
                  title="Clear all chats"
                >
                  <Trash2 size={12} />
                  Clear all
                </button>
              )}
            </div>

            {threads.length === 0 ? (
              <p className="text-sm leading-6 text-slate-400 dark:text-slate-500">
                Your conversation history will appear here after the first
                message.
              </p>
            ) : (
              <div className="flex flex-col space-y-1 pb-4">
                {threads.map((thread) => (
                  <ChatItem
                    key={thread.id}
                    id={thread.id}
                    title={thread.title}
                    isActive={activeThreadId === thread.id}
                    isPinned={thread.isPinned}
                    onClick={() => handleSelectRecentThread(thread.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Clear Chat Confirmation Modal */}
          {showClearConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Clear all chats?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  This will permanently delete all your conversations. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      void clearChatHistory();
                      startFreshChat();
                      setShowClearConfirm(false);
                    }}
                    className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl transition text-sm"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Settings - Fixed at bottom */}
          <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
            {user?.role === "ADMIN" && (
              <button
                onClick={() => {
                  setCurrentSection('admin');
                  navigate("/admin");
                  handleMobileNav();
                }}
                className={`w-full flex flex-row items-center px-3 py-3 mb-2 rounded-xl transition ${
                  location.pathname === "/admin"
                    ? "bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-900/50"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <ShieldAlert
                  size={20}
                  className={location.pathname === "/admin" ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}
                  strokeWidth={2}
                />
                <span
                  className={`ml-3 text-sm font-semibold ${
                    location.pathname === "/admin"
                      ? "text-rose-700 dark:text-rose-400"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Admin Dashboard
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setCurrentSection('settings');
                navigate("/settings");
                handleMobileNav();
              }}
              className={`w-full flex flex-row items-center px-3 py-3 rounded-xl transition ${
                location.pathname === "/settings"
                  ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-900/50"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Settings
                size={20}
                className={location.pathname === "/settings" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}
                strokeWidth={2}
              />
              <span
                className={`ml-3 text-sm font-semibold ${
                  location.pathname === "/settings"
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Settings
              </span>
            </button>
          </div>
        </aside>
        </>
      )}
    </>
  );
}
