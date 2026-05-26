import type { Context } from "hono";
import { stream } from "hono/streaming";

import type { AppBindings } from "@/middleware/auth";
import { getJwtPayload } from "@/middleware/auth";
import ChatService from "@/api/v1/services/chat.service";
import { chatParamsSchema, messageParamsSchema, editMessageSchema } from "@/api/v1/app/schemas/chat.schema";
import respond from "@/utils/response.util";

export async function listChats(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const chats = await ChatService.listChats(payload.sub);

  return respond(c, 200, "Chats fetched successfully", {
    chats,
  });
}

export async function getChatMessages(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const params = chatParamsSchema.parse(c.req.param());
  const result = await ChatService.getChatMessages(payload.sub, params.chatId);

  return respond(c, 200, "Chat messages fetched successfully", result);
}

export async function sendMessage(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const body = await c.req.json();
  const result = await ChatService.sendMessage(payload.sub, body);

  return respond(c, 201, "Message sent successfully", result);
}

export async function streamMessage(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const body = await c.req.json();

  let result: Awaited<ReturnType<typeof ChatService.sendMessage>>;
  try {
    result = await ChatService.sendMessage(payload.sub, body);
  } catch (error: any) {
    console.error("[streamMessage] sendMessage failed:", error?.message ?? error);
    throw error; // Let Hono's error handler return 500/4xx
  }

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  return stream(c, async (s) => {
    try {
      // Send initial message data
      const initialData = JSON.stringify({
        type: "init",
        chat: result.chat,
        userMessage: result.userMessage,
        assistantMessage: result.assistantMessage,
        contextUsage: result.contextUsage,
      });
      await s.write(`data: ${initialData}\n\n`);

      // Stream the AI response chunks
      if (result.stream) {
        for await (const chunk of result.stream) {
          const data = JSON.stringify({ type: "chunk", content: chunk });
          await s.write(`data: ${data}\n\n`);
        }
      }

      // Send completion
      const doneData = JSON.stringify({ type: "done" });
      await s.write(`data: ${doneData}\n\n`);
    } catch (error: any) {
      console.error("[streamMessage] stream error:", error?.message ?? error);
      const errorData = JSON.stringify({ type: "error", message: "Streaming failed" });
      await s.write(`data: ${errorData}\n\n`).catch(() => {});
    }
  });
}

export async function clearChats(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  await ChatService.clearChats(payload.sub);

  return c.body(null, 204);
}

export async function deleteChat(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const params = chatParamsSchema.parse(c.req.param());
  await ChatService.deleteChat(payload.sub, params.chatId);

  return respond(c, 200, "Chat deleted successfully", { success: true });
}

export async function renameChat(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const params = chatParamsSchema.parse(c.req.param());
  const body = await c.req.json();
  const chat = await ChatService.renameChat(payload.sub, params.chatId, body.title);

  return respond(c, 200, "Chat renamed successfully", { chat });
}

export async function pinChat(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const params = chatParamsSchema.parse(c.req.param());
  const body = await c.req.json();
  const chat = await ChatService.pinChat(payload.sub, params.chatId, body.isPinned);

  return respond(c, 200, "Chat pin status updated", { chat });
}

export async function editMessage(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const params = messageParamsSchema.parse(c.req.param());
  const rawBody = await c.req.json();
  const body = editMessageSchema.parse(rawBody);

  let result: Awaited<ReturnType<typeof ChatService.editMessage>>;
  try {
    result = await ChatService.editMessage(payload.sub, params.messageId, body.content);
  } catch (error: any) {
    console.error("[editMessage] editMessage failed:", error?.message ?? error);
    throw error;
  }

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  return stream(c, async (s) => {
    try {
      const initialData = JSON.stringify({
        type: "init",
        chat: result.chat,
        userMessage: result.userMessage,
        assistantMessage: result.assistantMessage,
        contextUsage: result.contextUsage,
      });
      await s.write(`data: ${initialData}\n\n`);

      if (result.stream) {
        for await (const chunk of result.stream) {
          const data = JSON.stringify({ type: "chunk", content: chunk });
          await s.write(`data: ${data}\n\n`);
        }
      }

      const doneData = JSON.stringify({ type: "done" });
      await s.write(`data: ${doneData}\n\n`);
    } catch (error: any) {
      console.error("[editMessage] stream error:", error?.message ?? error);
      const errorData = JSON.stringify({ type: "error", message: "Streaming failed" });
      await s.write(`data: ${errorData}\n\n`).catch(() => {});
    }
  });
}
