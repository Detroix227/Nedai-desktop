import { useEffect, useState } from "react";
import { Bell, CheckCircle2, ArrowLeft, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { useAuthStore } from "@/modules/auth/useAuthStore";
import type { Notification } from "@/modules/contracts";
import * as NotificationApi from "@/modules/notification/notification.api";
import { Modal } from "@/components/Modal";
import { MarkdownMessage } from "@/components/MarkdownMessage";

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = (showLoading = false) => {
    if (!token) return;
    if (showLoading) setLoading(true);
    
    NotificationApi.getMyNotifications(token)
      .then((data) => {
        setNotifications(data);
        setLoading(false);

        // Automatic mark as read when the user sees them
        const unreadCount = data.filter((n) => !n.isRead).length;
        if (unreadCount > 0) {
          NotificationApi.markAllAsRead(token).catch(console.error);
          // Optimistically update local state
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
      })
      .catch((err) => {
        console.error("Failed to load notifications:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotifications(true); // Initial load with spinner

    // Background polling: check for new notifications every 30 seconds
    const interval = setInterval(() => fetchNotifications(false), 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await NotificationApi.markAllAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  return (
    <AppShell title="Notifications">
      <div className="flex flex-col w-full max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition"
            >
              <CheckCircle2 size={18} />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500 dark:text-slate-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Bell size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No notifications yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                When you receive updates from the admin, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => setSelectedNotification(notification)}
                  className={`p-5 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                    !notification.isRead ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      !notification.isRead 
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" 
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                    }`}>
                      <Megaphone size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className={`font-semibold text-base ${
                          !notification.isRead 
                            ? "text-slate-900 dark:text-slate-100" 
                            : "text-slate-700 dark:text-slate-300"
                        }`}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                          {new Date(notification.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      
                      <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-relaxed line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title || "Notification"}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <Megaphone size={14} />
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
    </AppShell>
  );
}
