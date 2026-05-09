import { Hono } from "hono";

import type { AppBindings } from "@/middleware/auth";
import { requireAuth } from "@/middleware/auth";
import {
  clearChats,
  deleteChat,
  getChatMessages,
  listChats,
  pinChat,
  renameChat,
  sendMessage,
  streamMessage,
} from "@/api/v1/app/controllers/chat.controller";

const router = new Hono<AppBindings>();

router.use("*", requireAuth);
router.get("/", listChats);
router.delete("/", clearChats);
router.get("/:chatId/messages", getChatMessages);
router.delete("/:chatId", deleteChat);
router.patch("/:chatId", renameChat);
router.patch("/:chatId/pin", pinChat);
router.post("/messages", sendMessage);
router.post("/messages/stream", streamMessage);

export default router;
