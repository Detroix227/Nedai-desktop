import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";

import { useAuthStore } from "@/modules/auth/useAuthStore";
import type { Notification } from "@/modules/contracts";
import * as NotificationApi from "@/modules/notification/notification.api";
import { Modal } from "@/components/Modal";
import { MarkdownMessage } from "@/components/MarkdownMessage";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const token = useAuthStore((state) => state.accessToken);

  const fetchNotifications = () => {
    if (!token) return;
    NotificationApi.getMyNotifications(token)
      .then((data) => setNotifications(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchNotifications();

    // Background polling: check for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications(); // Refresh when opening
      
      // Automatic mark as read
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      if (unreadCount > 0 && token) {
        NotificationApi.markAllAsRead(token).catch(console.error);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    }
  };

  useEffect(() => {
    // Click outside to close
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
      >
        <Bell size={24} className="text-slate-600 dark:text-slate-400" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-full ml-4 top-0 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden flex flex-col max-h-[500px]">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                You're all caught up!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      setSelectedNotification(notification);
                      setIsOpen(false);
                    }}
                    className={`p-4 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${
                      !notification.isRead ? "bg-blue-50/30 dark:bg-blue-900/20" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4
                        className={`text-sm font-semibold ${
                          !notification.isRead ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {notification.title}
                      </h4>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 leading-relaxed line-clamp-2">
                      {notification.message}
                    </p>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {new Date(notification.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title || "Notification"}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <CheckCircle2 size={14} className="text-blue-500" />
            <span>
              {selectedNotification && new Date(selectedNotification.createdAt).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
          
          <div className="max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
            <MarkdownMessage content={selectedNotification?.message || ""} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
