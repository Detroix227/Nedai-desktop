import type {
  Chat,
  Documents,
  Message,
  Prisma,
  TimetableActivity,
  User,
} from "@prisma/client";
import {
  DocumentOrigin,
  DocumentStatus,
  DocumentVisibility,
  MessageRole,
} from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { ApiError } from "@/lib/api-error";
import prisma from "@/lib/prisma";
import { env } from "@/utils/env";
import { sendMessageSchema } from "@/api/v1/app/schemas/chat.schema";
import { serializeChat } from "@/api/v1/serializers/chat.serializer";
import { serializeMessage } from "@/api/v1/serializers/message.serializer";
import {
  buildContextBlock,
  buildRetrievalMetadata,
  dedupeSources,
  extractCompletionContent,
} from "@/api/v1/services/ai-response.util";
import ChatRetrievalService, {
  type RetrievedChunk,
} from "@/api/v1/services/chat-retrieval.service";
import {
  buildKnowledgeVaultContextBlock,
  buildTimetableContextBlock,
  buildUserContextBlock,
} from "@/api/v1/services/user-context.service";
import { getGeminiClient, GEMINI_CHAT_MODEL } from "@/lib/gemini";
import { isAssessmentRequest } from "@/utils/assessment-intent.util";
import {
  createChatEmbedding,
  buildHybridChatContext,
} from "@/api/v1/services/chat-embedding.service";
import {
  analyzeUserInteraction,
  getPersonalizedPromptModifier,
} from "@/api/v1/services/user-learning.service";

type PrismaLike = Pick<
  typeof prisma,
  "chat" | "message" | "user" | "documents" | "timetableActivity"
>;

type GeminiClientLike = GoogleGenerativeAI;

type SendMessagePayload = {
  chatId?: string;
  documentId?: string;
  content: string;
};

type ChatRetrievalServiceLike = {
  retrieveRelevantChunks: (
    userId: string,
    question: string,
    options?: {
      documentId?: string;
      documentIds?: string[];
      topK?: number;
      minScore?: number;
    },
  ) => Promise<RetrievedChunk[]>;
};

type AssistantSource = {
  subject: string;
  lessonTitle: string;
  sourcePath: string;
  pageNumber?: number;
};

type AssistantMetadata = {
  grounded: boolean;
  usedGeneralKnowledge: boolean;
  sources: AssistantSource[];
  retrieval: Array<{
    documentId: string;
    chunkId: string;
    score: number;
    excerpt: string;
  }>;
};

type ChatServiceOptions = {
  prisma?: PrismaLike;
  retrievalService?: ChatRetrievalServiceLike;
  getGeminiClient?: () => GeminiClientLike;
  historyLimit?: number;
  chatModel?: string;
  topK?: number;
  minScore?: number;
};

const CHAT_TITLE_LIMIT = 60;
const QUIZ_ATTACHMENT_REQUIRED_MESSAGE =
  "Tag a document with @ before requesting a quiz or exam, then retry.";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 3).trimEnd()}...`;
}

function buildChatTitle(content: string) {
  const normalized = normalizeWhitespace(content);

  if (!normalized) {
    return "New chat";
  }

  return truncateText(normalized, CHAT_TITLE_LIMIT);
}

function stripMetadataFromContent(content: string): string {
  // Remove common metadata patterns that leaked into old AI responses
  const metadataPatterns = [
    /^Subject:\s*.+$/gim,
    /^Lesson:\s*.+$/gim,
    /^Path:\s*.+$/gim,
    /^Page:\s*.+$/gim,
    /^Similarity:\s*.+$/gim,
    /^Source \d+$/gim,
    /https:\/\/pub-[a-z0-9]+\.r2\.dev\/uploads\/[a-f0-9-]+\/[a-f0-9-]+\.png/gi,
  ];

  let cleaned = content;
  for (const pattern of metadataPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Clean up multiple newlines
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

function mapHistoryMessage(message: Message) {
  const content = message.role === "ASSISTANT"
    ? stripMetadataFromContent(message.content)
    : message.content;

  return {
    role: message.role.toLowerCase() as "system" | "user" | "assistant",
    content,
  };
}

function toErrorRecord(error: unknown) {
  if (typeof error === "object" && error !== null) {
    return error as Record<string, unknown>;
  }

  return null;
}

function getNestedMessage(value: unknown) {
  const record = toErrorRecord(value);

  if (!record || typeof record.message !== "string") {
    return undefined;
  }

  return record.message;
}

function logChatStageError(
  stage: "retrieval" | "provider" | "streaming",
  error: unknown,
  context: {
    userId?: string;
    chatId?: string;
    messageId?: string;
    model?: string;
  },
) {
  const errorRecord = toErrorRecord(error);

  console.error(`[chat:${stage}] request failed`, {
    ...(context.userId ? { userId: context.userId } : {}),
    ...(context.chatId ? { chatId: context.chatId } : {}),
    ...(context.messageId ? { messageId: context.messageId } : {}),
    ...(context.model ? { model: context.model } : {}),
    name: error instanceof Error ? error.name : undefined,
    message:
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : undefined,
    status:
      typeof errorRecord?.status === "number" ? errorRecord.status : undefined,
    code: typeof errorRecord?.code === "string" ? errorRecord.code : undefined,
    cause: getNestedMessage(errorRecord?.cause),
    upstream: toErrorRecord(errorRecord?.error) ?? undefined,
  });
}

type SelectedDocument = Pick<
  Documents,
  "id" | "title" | "sourceType" | "status"
>;

export class ChatServiceImpl {
  private readonly prisma: PrismaLike;
  private readonly retrievalService: ChatRetrievalServiceLike;
  private readonly getGeminiClient: () => GeminiClientLike;
  private readonly historyLimit: number;
  private readonly chatModel: string;
  private readonly topK: number;
  private readonly minScore: number;

  constructor(options: ChatServiceOptions = {}) {
    this.prisma = options.prisma ?? prisma;
    this.retrievalService = options.retrievalService ?? ChatRetrievalService;
    this.getGeminiClient = options.getGeminiClient ?? getGeminiClient;
    this.chatModel = options.chatModel ?? GEMINI_CHAT_MODEL;
    this.historyLimit = options.historyLimit ?? env.CHAT_HISTORY_LIMIT;
    this.topK = options.topK ?? env.CHAT_RETRIEVAL_TOP_K;
    this.minScore = options.minScore ?? env.CHAT_RETRIEVAL_MIN_SCORE;
  }

  public async listChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return chats.map(serializeChat);
  }

  public async getChatMessages(userId: string, chatId: string) {
    const chat = await this.getOwnedChat(userId, chatId);
    const messages = await this.prisma.message.findMany({
      where: {
        chatId: chat.id,
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            sourceType: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      chat: serializeChat(chat),
      messages: messages.map(serializeMessage),
    };
  }

  public async clearChats(userId: string) {
    await this.prisma.chat.deleteMany({
      where: {
        userId,
      },
    });
  }

  public async sendMessage(userId: string, payload: unknown) {
    const data = sendMessageSchema.parse(payload) as SendMessagePayload;
    const selectedDocument = data.documentId
      ? await this.getSelectedDocument(userId, data.documentId)
      : null;

    if (isAssessmentRequest(data.content) && !selectedDocument) {
      throw new ApiError(400, QUIZ_ATTACHMENT_REQUIRED_MESSAGE);
    }

    let chat = data.chatId
      ? await this.getOwnedChat(userId, data.chatId)
      : await this.prisma.chat.create({
          data: {
            userId,
            title: "New chat",
          },
        });

    const userMessage = await this.prisma.message.create({
      data: {
        chatId: chat.id,
        role: MessageRole.USER,
        content: data.content,
        documentId: selectedDocument?.id,
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            sourceType: true,
          },
        },
      },
    });

    // Create embedding for user message (async, non-blocking)
    createChatEmbedding({
      userId,
      chatId: chat.id,
      messageId: userMessage.id,
      role: "user",
      content: data.content,
    }).catch(console.error);

    const nextTitle =
      chat.title === "New chat" ? buildChatTitle(data.content) : chat.title;
    chat = await this.prisma.chat.update({
      where: {
        id: chat.id,
      },
      data: {
        title: nextTitle,
      },
    });

    // Use hybrid RAG context instead of just recent history
    // This combines recent messages with semantically relevant older messages
    let retrievedChunks: RetrievedChunk[];

    // 1. Determine if we should perform retrieval
    const isGreeting = /^(hi|hello|hey|greetings|morning|afternoon|evening)(\s|$)/i.test(data.content.trim());
    const shouldRetrieve = data.content.trim().length > 10 && !isGreeting;

    const allUsedDocumentIds = await this.prisma.message
      .findMany({
        where: {
          chatId: chat.id,
          documentId: { not: null },
        },
        select: {
          documentId: true,
        },
      })
      .then((msgs) =>
        Array.from(new Set(msgs.map((m) => m.documentId as string))),
      );

    try {
      if (shouldRetrieve || selectedDocument) {
        // HYBRID RETRIEVAL:
        // We always search all documents to allow "Automatic Learning,"
        // but if the user used a @ tag, we ensure that specific document
        // gets more weight (higher topK).
        const retrievalOptions = { 
          documentIds: undefined, // Search across ALL ready documents
          topK: selectedDocument ? Math.max(this.topK, 12) : this.topK, 
          minScore: 0.25 
        };

        retrievedChunks = await this.retrievalService.retrieveRelevantChunks(
          userId,
          data.content,
          retrievalOptions,
        );

        // If a document was specifically tagged, we do an extra "Deep Dive" 
        // into that document and combine the results.
        if (selectedDocument) {
          const deepDiveChunks = await this.retrievalService.retrieveRelevantChunks(
            userId,
            data.content,
            { documentId: selectedDocument.id, topK: 10, minScore: 0.1 }
          );
          retrievedChunks = [...retrievedChunks, ...deepDiveChunks];
        }
      } else {
        retrievedChunks = [];
      }
    } catch (error) {
      logChatStageError("retrieval", error, {
        userId,
        chatId: chat.id,
      });
      throw error;
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    // Get personalized prompt modifier based on user learning profile
    const personalization = await getPersonalizedPromptModifier(userId);

    const [timetableActivities, readyDocuments] = await Promise.all([
      this.prisma.timetableActivity.findMany({
        where: {
          userId,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      this.prisma.documents.findMany({
        where: {
          userId,
          visibility: DocumentVisibility.PRIVATE,
          origin: DocumentOrigin.USER_UPLOAD,
          status: DocumentStatus.READY,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const client = this.getGeminiClient();
    const promptMessages = [
      {
        role: "system" as const,
        content:
          `You are NedAI, an adaptive study assistant. You have 6 response modalities. Analyze the user's message and automatically select the most appropriate modality:

1. REFLECTIVE - Use when user expresses emotions, stress, frustration, or personal struggles. Be empathetic, validate feelings, mirror emotions. Example phrases: "I hear you, that sounds tough", "I understand this is challenging".

2. ANALYTICAL - Use for complex concepts, math, science, logic problems. Be the genius classmate. Use LaTeX ($...$ or $$...$$) for formulas. Explain the "why" behind concepts in depth.

3. GUIDE - Use when user asks "how do I...", "what should I...", needs direction. Be the senior mentor. Give actionable strategies, step-by-step guidance, and "next best actions".

4. LIVELY - Use when user shares wins, progress, or asks for encouragement. Be the hype-man. Show high energy, genuine excitement, celebrate achievements.

5. CONCISE - Use for simple factual questions or when user seems rushed. Be the quick-fix expert. Direct, polite, zero fluff. Get straight to the answer.

6. CHALLENGER - Use when user is procrastinating, making excuses, or needs accountability. Be the tough coach. No-nonsense, call out excuses gently but firmly, push for action.

RULES:
- Prefer study context when relevant. Answer using general knowledge when no context applies. NEVER say "No relevant study context was retrieved" or mention context availability.
- Do not invent sources. Keep answers clear, educational, Markdown-formatted.
- For quizzes/exams: generate directly in chat as Markdown, tell student to reply with answers.
- Adapt tone based on the modality you selected.
- CRITICAL: NEVER output metadata patterns like "Subject:", "Lesson:", "Path:", "Page:", "Similarity:", "Source X", or URLs from retrieved documents. Only output the actual educational content.${personalization}`,
      },
      {
        role: "system" as const,
        content: buildUserContextBlock(user),
      },
      {
        role: "system" as const,
        content: buildTimetableContextBlock(timetableActivities),
      },
      {
        role: "system" as const,
        content: buildKnowledgeVaultContextBlock(readyDocuments),
      },
      ...(selectedDocument
        ? [
            {
              role: "system" as const,
              content: `Active tagged document: ${selectedDocument.title} (${selectedDocument.sourceType})`,
            },
          ]
        : []),
      {
        role: "system" as const,
        content: `Retrieved context:\n\n${buildContextBlock(retrievedChunks)}`,
      },
      // Hybrid chat context: recent messages + semantically relevant RAG results
      ...(await buildHybridChatContext(userId, chat.id, data.content, 5, 3)),
      {
        role: "user" as const,
        content: data.content,
      },
    ];

    let completion: any;

    let assistantContent = "";
    const sources = dedupeSources(retrievedChunks);
    const assistantMetadata: AssistantMetadata = {
      grounded: retrievedChunks.length > 0,
      usedGeneralKnowledge: retrievedChunks.length === 0,
      sources,
      retrieval: buildRetrievalMetadata(retrievedChunks),
    };

    // Create placeholder assistant message first
    const assistantMessage = await this.prisma.message.create({
      data: {
        chatId: chat.id,
        role: MessageRole.ASSISTANT,
        content: "", // Will be updated as streaming progresses
        citationsJson: assistantMetadata as Prisma.JsonObject,
      },
    });

    // Start streaming the AI response
    const stream = await this.streamAIResponse(
      client,
      promptMessages,
      assistantMessage.id,
      userId,
      chat.id,
      data.content,
    );

    chat = await this.prisma.chat.update({
      where: {
        id: chat.id,
      },
      data: {
        title: chat.title,
      },
    });

    const promptCharCount = promptMessages.reduce(
      (sum, m) => sum + m.content.length,
      0,
    );
    const estimatedTokens = Math.ceil(promptCharCount / 4);
    const contextCapacity = 8192; // Default for Llama3-70b-8192
    const contextUsage = Math.min(
      100,
      Math.ceil((estimatedTokens / contextCapacity) * 100),
    );

    return {
      chat: serializeChat(chat),
      userMessage: serializeMessage(userMessage),
      assistantMessage: serializeMessage(assistantMessage),
      answer: {
        answer: "", // Will be filled by streaming
        grounded: assistantMetadata.grounded,
        usedGeneralKnowledge: assistantMetadata.usedGeneralKnowledge,
        sources: assistantMetadata.sources,
      },
      contextUsage,
      stream, // Include the stream for SSE
    };
  }

  private async *streamAIResponse(
    client: GeminiClientLike,
    promptMessages: any[],
    messageId: string,
    userId: string,
    chatId: string,
    userQuery: string,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const model = client.getGenerativeModel({
        model: this.chatModel,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
        },
      });

      // Convert messages to Gemini format
      const history = promptMessages.slice(0, -1).map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const lastMessage = promptMessages[promptMessages.length - 1];

      const chat = model.startChat({
        history,
      });

      let fullContent = "";

      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        const content = chunk.text() || "";
        if (content) {
          fullContent += content;
          yield content;

          // Update message in DB periodically (every 50 chars to reduce DB load)
          if (fullContent.length % 50 === 0) {
            await this.prisma.message.update({
              where: { id: messageId },
              data: { content: fullContent },
            });
          }
        }
      }

      // Final update with complete content
      await this.prisma.message.update({
        where: { id: messageId },
        data: { content: fullContent },
      });

      // Create embedding for assistant response and analyze for learning
      if (fullContent) {
        await createChatEmbedding({
          userId,
          chatId,
          messageId,
          role: "assistant",
          content: fullContent,
        });

        await analyzeUserInteraction(userId, userQuery, fullContent);
      }
    } catch (error) {
      logChatStageError("streaming", error, { messageId });
      throw new ApiError(502, "AI streaming failed");
    }
  }

  public async deleteChat(userId: string, chatId: string) {
    await this.getOwnedChat(userId, chatId);

    await this.prisma.chat.delete({
      where: {
        id: chatId,
      },
    });
  }

  public async renameChat(userId: string, chatId: string, title: string) {
    await this.getOwnedChat(userId, chatId);

    const chat = await this.prisma.chat.update({
      where: {
        id: chatId,
      },
      data: {
        title,
      },
    });

    return serializeChat(chat);
  }

  public async pinChat(userId: string, chatId: string, isPinned: boolean) {
    await this.getOwnedChat(userId, chatId);

    const chat = await this.prisma.chat.update({
      where: {
        id: chatId,
      },
      data: {
        isPinned,
      },
    });

    return serializeChat(chat);
  }

  private async getOwnedChat(userId: string, chatId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        userId,
      },
    });

    if (!chat) {
      throw new ApiError(404, "Chat not found");
    }

    return chat;
  }

  private async getSelectedDocument(userId: string, documentId: string) {
    const document = await this.prisma.documents.findFirst({
      where: {
        id: documentId,
        userId,
        visibility: DocumentVisibility.PRIVATE,
        origin: DocumentOrigin.USER_UPLOAD,
      },
      select: {
        id: true,
        title: true,
        sourceType: true,
        status: true,
      },
    });

    if (!document) {
      throw new ApiError(404, "Document not found");
    }

    if (document.status !== DocumentStatus.READY) {
      throw new ApiError(
        409,
        "Selected document is not ready yet. Choose another file or wait for processing.",
      );
    }

    return document;
  }
}

const ChatService = new ChatServiceImpl();

export default ChatService;
