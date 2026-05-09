import type { Context } from "hono";
import { z } from "zod";

import prisma from "@/lib/prisma";
import respond from "@/utils/response.util";
import { sendNotificationEmail } from "@/lib/email";

export async function getStats(c: Context) {
  try {
    const totalUsers = await prisma.user.count();

    // Online users: active in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const onlineUsers = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: fifteenMinutesAgo,
        },
      },
    });

    return respond(c, 200, "Stats fetched successfully", {
      totalUsers,
      onlineUsers,
    });
  } catch (error) {
    console.error("[admin] getStats error:", error);
    return respond(c, 500, "Failed to fetch stats");
  }
}

export async function getUsers(c: Context) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        lastActiveAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return respond(c, 200, "Users fetched successfully", { users });
  } catch (error) {
    console.error("[admin] getUsers error:", error);
    return respond(c, 500, "Failed to fetch users");
  }
}

const NotifySchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  target: z.enum(["email", "in-app", "both"]),
  userIds: z.array(z.string()).optional(),
});

export async function notifyUsers(c: Context) {
  try {
    const body = await c.req.json();
    const result = NotifySchema.safeParse(body);

    if (!result.success) {
      return respond(c, 400, "Invalid payload", {
        errors: result.error.flatten().fieldErrors,
      });
    }

    const { subject, message, target, userIds } = result.data;
    
    // If userIds provided, target only those users; otherwise all users
    const where = userIds && userIds.length > 0 ? { id: { in: userIds } } : {};
    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true },
    });

    if (users.length === 0) {
      return respond(c, 400, "No users found to notify");
    }

    if (target === "in-app" || target === "both") {
      const notifications = users.map((user) => ({
        userId: user.id,
        title: subject,
        message: message,
      }));

      console.log(`[admin] Sending in-app notifications to ${users.length} users: ${users.map(u => u.email).join(', ')}`);
      await prisma.notification.createMany({
        data: notifications,
      });
    }

    if (target === "email" || target === "both") {
      const emails = users.map((u) => u.email);
      // We chunk emails to max 50 per Resend request
      const chunkSize = 50;
      try {
        for (let i = 0; i < emails.length; i += chunkSize) {
          const chunk = emails.slice(i, i + chunkSize);
          await sendNotificationEmail({
            to: chunk,
            subject,
            htmlBody: `<p>${message.replace(/\n/g, "<br/>")}</p>`,
          });
        }
      } catch (emailError) {
        console.error("[admin] Email send failed:", emailError);
        // If only email was requested, fail. If "both", continue since in-app was already sent.
        if (target === "email") {
          return respond(c, 500, "Failed to send email notifications. Email service may not be configured.");
        }
        // If "both", return partial success warning
        return respond(c, 200, "In-app notifications sent, but email notifications failed. Check RESEND_API_KEY configuration.");
      }
    }

    return respond(c, 200, "Notifications sent successfully");
  } catch (error) {
    console.error("[admin] notifyUsers error:", error);
    return respond(c, 500, "Failed to send notifications");
  }
}
