import { Hono } from "hono";

import { requireAuth, type AppBindings } from "@/middleware/auth";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} from "@/api/v1/app/controllers/notification.controller";

const router = new Hono<AppBindings>();

router.use("/*", requireAuth);

router.get("/", getMyNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
