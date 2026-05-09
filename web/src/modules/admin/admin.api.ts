import { request } from "@/lib/http";

export type AdminStats = {
  totalUsers: number;
  onlineUsers: number;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
  lastActiveAt: string;
};

export async function getStats(token: string) {
  const data = await request<AdminStats>("/admin/stats", {
    token,
  });
  return data;
}

export async function getUsers(token: string) {
  const data = await request<{ users: AdminUser[] }>("/admin/users", {
    token,
  });
  return data.users;
}

export async function notifyUsers(
  token: string,
  payload: { subject: string; message: string; target: "email" | "in-app" | "both"; userIds?: string[] }
) {
  const data = await request<null>("/admin/notify", {
    method: "POST",
    token,
    body: payload,
  });
  return data;
}
