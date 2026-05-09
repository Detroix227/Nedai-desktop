import type { Context } from "hono";

import prisma from "@/lib/prisma";
import respond from "@/utils/response.util";
import { getJwtPayload } from "@/middleware/auth";

export async function getMyNotifications(c: Context) {
  try {
    const payload = getJwtPayload(c);

    const notifications = await prisma.notification.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: "desc" },
    });

    return respond(c, 200, "Notifications fetched successfully", {
      notifications,
    });
  } catch (error) {
    console.error("[notifications] getMyNotifications error:", error);
    return respond(c, 500, "Failed to fetch notifications");
  }
}

export async function markAsRead(c: Context) {
  try {
    const payload = getJwtPayload(c);
    const id = c.req.param("id");

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== payload.sub) {
      return respond(c, 404, "Notification not found");
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return respond(c, 200, "Notification marked as read");
  } catch (error) {
    console.error("[notifications] markAsRead error:", error);
    return respond(c, 500, "Failed to mark notification as read");
  }
}

export async function markAllAsRead(c: Context) {
  try {
    const payload = getJwtPayload(c);

    await prisma.notification.updateMany({
      where: { userId: payload.sub, isRead: false },
      data: { isRead: true },
    });

    return respond(c, 200, "All notifications marked as read");
  } catch (error) {
    console.error("[notifications] markAllAsRead error:", error);
    return respond(c, 500, "Failed to mark all notifications as read");
  }
}
