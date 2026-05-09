import { Hono } from "hono";

import { requireAuth, requireAdmin, type AppBindings } from "@/middleware/auth";
import {
  getStats,
  getUsers,
  notifyUsers,
} from "@/api/v1/app/controllers/admin.controller";

const router = new Hono<AppBindings>();

router.use("/*", requireAuth, requireAdmin);

router.get("/stats", getStats);
router.get("/users", getUsers);
router.post("/notify", notifyUsers);

export default router;
