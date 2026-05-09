import type { Context } from "hono";

import type { AppBindings } from "@/middleware/auth";
import AuthService from "@/api/v1/services/auth.service";
import respond from "@/utils/response.util";

export async function registerUser(c: Context<AppBindings>) {
  const body = await c.req.json();
  const result = await AuthService.register(body);

  return respond(c, 201, "Registration successful", result);
}

export async function loginUser(c: Context<AppBindings>) {
  const body = await c.req.json();
  const result = await AuthService.login(body);

  return respond(c, 200, "Login successful", result);
}

export async function forgotPassword(c: Context<AppBindings>) {
  const body = await c.req.json();
  const result = await AuthService.forgotPassword(body.email);

  return respond(c, 200, result.message);
}

export async function resetPassword(c: Context<AppBindings>) {
  const body = await c.req.json();
  const result = await AuthService.resetPassword(body.token, body.password);

  return respond(c, 200, result.message);
}

export async function googleLogin(c: Context<AppBindings>) {
  const { idToken } = await c.req.json();
  const result = await AuthService.googleLogin(idToken);

  return respond(c, 200, "Google login successful", result);
}
