import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { isApiClientError } from "@/lib/http";
import { useAuthStore } from "@/modules/auth/useAuthStore";
import * as ChatApi from "@/modules/chat/chat.api";
import type {
  ChatMessage,
  ChatThread,
  SendChatMessagePayload,
} from "@/modules/contracts";
import { useSyncStore } from "@/modules/sync/useSyncStore";
import { useConnectivityStore } from "@/modules/connectivity/useConnectivityStore";
import { streamLocalMessage } from "@/modules/chat/chat.local.api";

const EMPTY_ARRAY: any[] = [];

type PersistedChatStore = Partial<Pick<ChatStore, "activeThreadId">>;

type ChatStore = {
  hydrated: boolean;
  activeThreadId: string | null;
  status: "idle" | "loading" | "sending" | "error";
  errorMessage: string | null;
  threads: ChatThread[];
  draftMessages: ChatMessage[];
  messagesByChatId: Record<string, ChatMessage[]>;
  loadedChatIds: string[];
  contextUsageByChatId: Record<string, number>;
  loadChats: () => Promise<void>;
  loadChatMessages: (chatId: string) => Promise<void>;
  selectThread: (threadId: string) => Promise<void>;
  startFreshChat: () => void;
  sendMessage: (payload: SendChatMessagePayload) => Promise<void>;
  clearChatHistory: () => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  pinChat: (chatId: string, isPinned: boolean) => Promise<void>;
  messagesForActiveThread: () => ChatMessage[];
  clearError: () => void;
  reset: () => void;
  markHydrated: () => void;
};

function sortThreads(threads: ChatThread[]) {
  // First sort by pinned status (pinned first), then by lastMessageAt
  return [...threads].sort((left, right) => {
    if (left.isPinned && !right.isPinned) return -1;
    if (!left.isPinned && right.isPinned) return 1;
    return new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime();
  });
}

function mergeThread(threads: ChatThread[], chat: ChatThread) {
  const nextThreads = threads.filter((thread) => thread.id !== chat.id);
  return sortThreads([chat, ...nextThreads]);
}

function mergeMessages(
  existingMessages: ChatMessage[],
  nextMessages: ChatMessage[],
) {
  const messagesById = new Map<string, ChatMessage>();

  for (const message of existingMessages) {
    messagesById.set(message.id, message);
  }

  for (const message of nextMessages) {
    messagesById.set(message.id, message);
  }

  return [...messagesById.values()].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function removeMessagesById(messages: ChatMessage[], messageIds: string[]) {
  const ids = new Set(messageIds);
  return messages.filter((message) => !ids.has(message.id));
}

function replaceMessageDeliveryState(
  messages: ChatMessage[],
  messageId: string,
  deliveryState: ChatMessage["deliveryState"],
) {
  return messages.map((message) =>
    message.id === messageId ? { ...message, deliveryState } : message,
  );
}

function createOptimisticMessage({
  id,
  chatId,
  role,
  content,
  createdAt,
}: Pick<ChatMessage, "id" | "chatId" | "role" | "content" | "createdAt">) {
  return {
    id,
    chatId,
    role,
    content,
    createdAt,
    documentId: (content as any).documentId, // dummy check or pass as obj
    deliveryState: "pending" as const,
  };
}

function buildChatErrorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function requireAccessToken() {
  const token = useAuthStore.getState().accessToken;

  if (!token) {
    throw new Error("Missing access token");
  }

  return token;
}

function handleChatError(error: unknown) {
  if (isApiClientError(error) && error.status === 401) {
    useAuthStore.getState().logout();
  }

  return buildChatErrorMessage(error);
}

export const useChatStore = create<ChatStore>()(
  persist<ChatStore, [], [], PersistedChatStore>(
    (set, get) => ({
      hydrated: false,
      activeThreadId: null,
      status: "idle",
      errorMessage: null,
      threads: [],
      draftMessages: [],
      messagesByChatId: {},
      loadedChatIds: [],
      contextUsageByChatId: {},
      loadChats: async () => {
        set({
          status: "loading",
          errorMessage: null,
        });
        useSyncStore.getState().startSync();

        try {
          const token = requireAccessToken();
          const response = await ChatApi.listChats(token);
          const currentActiveThreadId = get().activeThreadId;
          const hasActiveThread = response.chats.some(
            (thread) => thread.id === currentActiveThreadId,
          );
          const nextActiveThreadId =
            currentActiveThreadId && hasActiveThread
              ? currentActiveThreadId
              : currentActiveThreadId === null
                ? null
                : (response.chats[0]?.id ?? null);

          set({
            threads: response.chats,
            activeThreadId: nextActiveThreadId,
            draftMessages: nextActiveThreadId ? [] : get().draftMessages,
            status: "idle",
            errorMessage: null,
          });
          useSyncStore.getState().setChatCount(response.chats.length);
          useSyncStore.getState().markSynced();

          if (
            nextActiveThreadId &&
            !get().loadedChatIds.includes(nextActiveThreadId)
          ) {
            await get().loadChatMessages(nextActiveThreadId);
          }
        } catch (error) {
          const errorMessage = handleChatError(error);

          set({
            status: "error",
            errorMessage,
          });
          useSyncStore.getState().markError(errorMessage);
        }
      },
      loadChatMessages: async (chatId) => {
        set({
          status: "loading",
          errorMessage: null,
          draftMessages: [],
        });
        useSyncStore.getState().startSync();

        try {
          const token = requireAccessToken();
          const response = await ChatApi.getChatMessages(token, chatId);

          set((state) => ({
            activeThreadId: chatId,
            threads: mergeThread(state.threads, response.chat),
            messagesByChatId: {
              ...state.messagesByChatId,
              [chatId]: response.messages,
            },
            loadedChatIds: state.loadedChatIds.includes(chatId)
              ? state.loadedChatIds
              : [...state.loadedChatIds, chatId],
            status: "idle",
            errorMessage: null,
          }));
          useSyncStore.getState().setChatCount(get().threads.length);
          useSyncStore.getState().markSynced();
        } catch (error) {
          const errorMessage = handleChatError(error);

          set({
            status: "error",
            errorMessage,
          });
          useSyncStore.getState().markError(errorMessage);
        }
      },
      selectThread: async (threadId) => {
        set({
          activeThreadId: threadId,
          errorMessage: null,
          draftMessages: [],
        });

        if (!get().loadedChatIds.includes(threadId)) {
          await get().loadChatMessages(threadId);
        }
      },
      startFreshChat: () =>
        set({
          activeThreadId: null,
          draftMessages: [],
          errorMessage: null,
          status: "idle",
        }),
      sendMessage: async (payload) => {
        const trimmed = payload.content.trim();

        if (!trimmed) {
          return;
        }

        const activeThreadId = get().activeThreadId;
        const optimisticChatId = activeThreadId ?? "__draft__";
        const timestamp = Date.now();
        const optimisticUserMessage = createOptimisticMessage({
          id: `temp-user-${timestamp}`,
          chatId: optimisticChatId,
          role: "user",
          content: trimmed,
          createdAt: new Date(timestamp).toISOString(),
        });
        (optimisticUserMessage as any).documentId = payload.documentId;
        (optimisticUserMessage as any).document = payload.document;

        const optimisticAssistantMessage = createOptimisticMessage({
          id: `temp-assistant-${timestamp}`,
          chatId: optimisticChatId,
          role: "assistant",
          content: "",
          createdAt: new Date(timestamp + 1).toISOString(),
        });

        set((state) => {
          if (activeThreadId) {
            const existingMessages =
              state.messagesByChatId[activeThreadId] ?? [];

            return {
              status: "sending" as const,
              errorMessage: null,
              messagesByChatId: {
                ...state.messagesByChatId,
                [activeThreadId]: mergeMessages(existingMessages, [
                  optimisticUserMessage,
                  optimisticAssistantMessage,
                ]),
              },
            };
          }

          return {
            status: "sending" as const,
            errorMessage: null,
            draftMessages: mergeMessages(state.draftMessages, [
              optimisticUserMessage,
              optimisticAssistantMessage,
            ]),
          };
        });
        useSyncStore.getState().startSync();

        return new Promise<void>(async (resolve, reject) => {
          const token = requireAccessToken();
          let realChatId: string | null = null;
          let realAssistantMessageId: string | null = null;
          let streamingContent = "";
          const isOnline = useConnectivityStore.getState().isOnline;

          // --- OFFLINE / LOCAL PIVOT (Desktop Only) ---
          if (!isOnline && window.electronAPI) {
            await streamLocalMessage(
              { content: trimmed },
              (event) => {
                if (event.type === "chunk") {
                  streamingContent += event.content;
                  set((state) => ({
                    draftMessages: state.draftMessages.map((m) =>
                      m.id === optimisticAssistantMessage.id ? { ...m, content: streamingContent } : m
                    ),
                  }));
                }
              },
              () => resolve()
            );
            return;
          }

          // --- CLOUD MODE (Web and Online Desktop) ---
          ChatApi.streamMessage(
            token,
            {
              ...(activeThreadId ? { chatId: activeThreadId } : {}),
              content: trimmed,
              ...(payload.documentId ? { documentId: payload.documentId } : {}),
            },
            (event) => {
              if (event.type === "init") {
                realChatId = event.chat.id;
                realAssistantMessageId = event.assistantMessage.id;
                const optimisticIds = [
                  optimisticUserMessage.id,
                  optimisticAssistantMessage.id,
                ];

                set((state) => {
                  const remainingDraftMessages = removeMessagesById(
                    state.draftMessages,
                    optimisticIds,
                  );
                  const existingMessages = activeThreadId
                    ? removeMessagesById(
                        state.messagesByChatId[event.chat.id] ??
                          state.messagesByChatId[activeThreadId] ??
                          [],
                        optimisticIds,
                      )
                    : remainingDraftMessages;

                  return {
                    activeThreadId: event.chat.id,
                    threads: mergeThread(state.threads, event.chat),
                    draftMessages: [],
                    messagesByChatId: {
                      ...state.messagesByChatId,
                      [event.chat.id]: mergeMessages(existingMessages, [
                        event.userMessage,
                        { ...event.assistantMessage, content: "" },
                      ]),
                    },
                    loadedChatIds: state.loadedChatIds.includes(event.chat.id)
                      ? state.loadedChatIds
                      : [...state.loadedChatIds, event.chat.id],
                    contextUsageByChatId: {
                      ...state.contextUsageByChatId,
                      [event.chat.id]: event.contextUsage ?? 0,
                    },
                  };
                });
                useSyncStore.getState().setChatCount(get().threads.length);
              } else if (
                event.type === "chunk" &&
                realChatId &&
                realAssistantMessageId
              ) {
                // Append chunk to the assistant message content live
                streamingContent += event.content;
                const chatId = realChatId;
                const assistantMsgId = realAssistantMessageId;
                const content = streamingContent;

                set((state) => ({
                  messagesByChatId: {
                    ...state.messagesByChatId,
                    [chatId]: (state.messagesByChatId[chatId] ?? []).map(
                      (msg) =>
                        msg.id === assistantMsgId
                          ? { ...msg, content }
                          : msg,
                    ),
                  },
                }));
              } else if (event.type === "done") {
                set({ status: "idle", errorMessage: null });
                useSyncStore.getState().markSynced();
                resolve();
              } else if (event.type === "error") {
                reject(new Error(event.message || "Streaming failed"));
              }
            },
            (error) => {
              const errorMessage = handleChatError(error);

              set((state) => {
                if (activeThreadId) {
                  const existingMessages =
                    state.messagesByChatId[activeThreadId] ?? [];
                  const withoutAssistantPlaceholder = removeMessagesById(
                    existingMessages,
                    [optimisticAssistantMessage.id],
                  );

                  return {
                    status: "error" as const,
                    errorMessage,
                    messagesByChatId: {
                      ...state.messagesByChatId,
                      [activeThreadId]: replaceMessageDeliveryState(
                        withoutAssistantPlaceholder,
                        optimisticUserMessage.id,
                        "failed",
                      ),
                    },
                  };
                }

                const withoutAssistantPlaceholder = removeMessagesById(
                  state.draftMessages,
                  [optimisticAssistantMessage.id],
                );

                return {
                  status: "error" as const,
                  errorMessage,
                  draftMessages: replaceMessageDeliveryState(
                    withoutAssistantPlaceholder,
                    optimisticUserMessage.id,
                    "failed",
                  ),
                };
              });
              useSyncStore.getState().markError(errorMessage);
              reject(error);
            },
          );
        });
      },
      clearChatHistory: async () => {
        set({
          status: "loading",
          errorMessage: null,
        });
        useSyncStore.getState().startSync();

        try {
          const token = requireAccessToken();
          await ChatApi.clearChatHistory(token);

          set({
            activeThreadId: null,
            threads: [],
            draftMessages: [],
            messagesByChatId: {},
            loadedChatIds: [],
            status: "idle",
            errorMessage: null,
          });
          useSyncStore.getState().setChatCount(0);
          useSyncStore.getState().markSynced();
        } catch (error) {
          const errorMessage = handleChatError(error);

          set({
            status: "error",
            errorMessage,
          });
          useSyncStore.getState().markError(errorMessage);
          throw error;
        }
      },
      deleteChat: async (chatId: string) => {
        useSyncStore.getState().startSync();
        try {
          const token = requireAccessToken();
          await ChatApi.deleteChat(token, chatId);

          set((state) => ({
            threads: state.threads.filter((t) => t.id !== chatId),
            messagesByChatId: { ...state.messagesByChatId, [chatId]: [] },
            activeThreadId: state.activeThreadId === chatId ? null : state.activeThreadId,
          }));
          useSyncStore.getState().setChatCount(get().threads.length);
          useSyncStore.getState().markSynced();
        } catch (error) {
          const errorMessage = handleChatError(error);
          set({ errorMessage, status: "error" });
          throw error;
        }
      },
      renameChat: async (chatId: string, title: string) => {
        useSyncStore.getState().startSync();
        try {
          const token = requireAccessToken();
          const response = await ChatApi.renameChat(token, chatId, title);

          set((state) => ({
            threads: state.threads.map((t) =>
              t.id === chatId ? { ...t, title: response.chat.title } : t
            ),
          }));
          useSyncStore.getState().markSynced();
        } catch (error) {
          const errorMessage = handleChatError(error);
          set({ errorMessage, status: "error" });
          throw error;
        }
      },
      pinChat: async (chatId: string, isPinned: boolean) => {
        useSyncStore.getState().startSync();
        try {
          const token = requireAccessToken();
          const response = await ChatApi.pinChat(token, chatId, isPinned);

          set((state) => {
            const updatedThreads = state.threads.map((t) =>
              t.id === chatId ? { ...t, isPinned: response.chat.isPinned } : t
            );
            return {
              threads: sortThreads(updatedThreads),
            };
          });
          useSyncStore.getState().markSynced();
        } catch (error) {
          const errorMessage = handleChatError(error);
          set({ errorMessage, status: "error" });
          throw error;
        }
      },
      messagesForActiveThread: () => {
        const state = get();
        const threadId = state.activeThreadId;

        if (!threadId) {
          return state.draftMessages;
        }

        return state.messagesByChatId[threadId] ?? EMPTY_ARRAY;
      },
      clearError: () => set({ errorMessage: null, status: "idle" }),
      reset: () => {
        set({
          activeThreadId: null,
          status: "idle",
          errorMessage: null,
          threads: [],
          draftMessages: [],
          messagesByChatId: {},
          loadedChatIds: [],
        });
        useSyncStore.getState().reset();
      },
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "nedai-chat-store",
      storage: createJSONStorage(() => localStorage),
      partialize: () => ({
        // We purposefully don't persist activeThreadId to ensure that the app
        // starts with a fresh chat session on every cold start.
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
