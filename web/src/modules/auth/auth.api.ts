import { request } from "@/lib/http";
import type {
  ServerAuthResponse,
  ServerChangePasswordResponse,
  ServerCurrentUserResponse,
  ServerUpdateCurrentUserResponse,
} from "@/modules/contracts";
import type { UpdateProfilePayload } from "@/modules/auth/profile-payload";

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = LoginPayload & {
  fullName: string;
  role: "STUDENT" | "LECTURER" | "OTHER";
};

type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
};

export function register(payload: RegisterPayload) {
  return request<ServerAuthResponse>("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function login(payload: LoginPayload) {
  return request<ServerAuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function getCurrentUser(token: string) {
  return request<ServerCurrentUserResponse>("/me", {
    token,
  });
}

export function updateCurrentUser(token: string, payload: UpdateProfilePayload) {
  return request<ServerUpdateCurrentUserResponse>("/me", {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function changeCurrentPassword(
  token: string,
  payload: ChangePasswordPayload,
) {
  return request<ServerChangePasswordResponse>("/me/password", {
    method: "PATCH",
    token,
    body: payload,
  });
}

type ForgotPasswordPayload = {
  email: string;
};

type ResetPasswordPayload = {
  token: string;
  password: string;
};

type ForgotPasswordResponse = {
  message: string;
};

type ResetPasswordResponse = {
  message: string;
};

export function forgotPassword(payload: ForgotPasswordPayload) {
  return request<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: payload,
  });
}

export function resetPassword(payload: ResetPasswordPayload) {
  return request<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}

export function googleLogin(idToken: string) {
  return request<ServerAuthResponse>("/auth/google", {
    method: "POST",
    body: { idToken },
  });
}
