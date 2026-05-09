import { request } from "@/lib/http";
import type { ServerGetNotificationsResponse } from "@/modules/contracts";

export async function getMyNotifications(token: string) {
  const data = await request<ServerGetNotificationsResponse>("/notifications", {
    token,
  });
  return data.notifications;
}

export async function markAsRead(token: string, notificationId: string) {
  await request<null>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    token,
  });
}

export async function markAllAsRead(token: string) {
  await request<null>("/notifications/read-all", {
    method: "PATCH",
    token,
  });
}
