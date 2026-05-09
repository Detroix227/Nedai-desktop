import { Hono } from "hono";

import type { AppBindings } from "@/middleware/auth";
import {
  loginUser,
  registerUser,
  forgotPassword,
  resetPassword,
  googleLogin,
} from "@/api/v1/app/controllers/auth.controller";

const router = new Hono<AppBindings>();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
