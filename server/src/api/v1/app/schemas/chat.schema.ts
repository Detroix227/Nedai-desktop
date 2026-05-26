import { z } from "zod";

export const chatParamsSchema = z
  .object({
    chatId: z.string().uuid("Chat ID must be a valid UUID"),
  })
  .strict();

export const sendMessageSchema = z
  .object({
    chatId: z.string().uuid("Chat ID must be a valid UUID").optional(),
    documentId: z.string().uuid("Document ID must be a valid UUID").optional(),
    content: z
      .string()
      .trim()
      .min(1, "Message content is required")
      .max(8000, "Message content must be 8000 characters or fewer"),
  })
  .strict();

export const messageParamsSchema = z
  .object({
    messageId: z.string().uuid("Message ID must be a valid UUID"),
  })
  .strict();

export const editMessageSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(8000, "Content must be 8000 characters or fewer"),
  })
  .strict();

export type ChatParams = z.infer<typeof chatParamsSchema>;
export type MessageParams = z.infer<typeof messageParamsSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
