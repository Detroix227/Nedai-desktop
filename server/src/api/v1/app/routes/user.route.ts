import { Hono } from "hono";

import { requireAuth, type AppBindings } from "@/middleware/auth";
import {
  changeCurrentPassword,
  getCurrentUser,
  updateCurrentUser,
  heartbeat,
} from "@/api/v1/app/controllers/user.controller";

const router = new Hono<AppBindings>();

router.use("/me", requireAuth);
router.use("/me/*", requireAuth);
router.get("/me", getCurrentUser);
router.patch("/me", updateCurrentUser);
router.patch("/me/password", changeCurrentPassword);
router.post("/me/heartbeat", heartbeat);

export default router;
