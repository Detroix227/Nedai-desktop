import { request } from "@/lib/http";
import type {
  SendChatMessagePayload,
  ServerDeleteChatResponse,
  ServerGetChatMessagesResponse,
  ServerListChatsResponse,
  ServerSendMessageResponse,
  ServerUpdateChatResponse,
} from "@/modules/contracts";
import { API_BASE_URL } from "@/lib/env";

export function listChats(token: string) {
  return request<ServerListChatsResponse>("/chats", {
    token,
  });
}

export function getChatMessages(token: string, chatId: string) {
  return request<ServerGetChatMessagesResponse>(`/chats/${chatId}/messages`, {
    token,
  });
}

export function sendMessage(token: string, payload: SendChatMessagePayload) {
  return request<ServerSendMessageResponse>("/chats/messages", {
    method: "POST",
    token,
    body: payload,
  });
}

export function clearChatHistory(token: string) {
  return request<Record<string, never>>("/chats", {
    method: "DELETE",
    token,
  });
}

export function deleteChat(token: string, chatId: string) {
  return request<ServerDeleteChatResponse>(`/chats/${chatId}`, {
    method: "DELETE",
    token,
  });
}

export function renameChat(token: string, chatId: string, title: string) {
  return request<ServerUpdateChatResponse>(`/chats/${chatId}`, {
    method: "PATCH",
    token,
    body: { title },
  });
}

export function pinChat(token: string, chatId: string, isPinned: boolean) {
  return request<ServerUpdateChatResponse>(`/chats/${chatId}/pin`, {
    method: "PATCH",
    token,
    body: { isPinned },
  });
}


type StreamEvent =
  | { type: "init"; chat: any; userMessage: any; assistantMessage: any; contextUsage: number }
  | { type: "chunk"; content: string }
  | { type: "error"; message: string }
  | { type: "done" };

export function streamMessage(
  token: string,
  payload: SendChatMessagePayload,
  onEvent: (event: StreamEvent) => void,
  onError?: (error: Error) => void,
): () => void {
  const url = `${API_BASE_URL.replace(/\/+$/, "")}/chats/messages/stream`;

  // Use fetch with ReadableStream instead of EventSource to support POST with body
  const abortController = new AbortController();

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is null");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const data = trimmed.slice(6);
              if (data) {
                try {
                  const event = JSON.parse(data) as StreamEvent;
                  onEvent(event);
                } catch (e) {
                  console.error("Failed to parse SSE data:", data);
                }
              }
            }
          }
        }

        if (done) break;
      }

      buffer += decoder.decode();
      const trailing = buffer.trim();
      if (trailing.startsWith("data: ")) {
        const data = trailing.slice(6);
        if (data) {
          try {
            const event = JSON.parse(data) as StreamEvent;
            onEvent(event);
          } catch (e) {
            console.error("Failed to parse SSE data:", data);
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        console.error("Stream error:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.status,
          response: error.response,
        });
        onError?.(error);
      }
    });

  return () => abortController.abort();
}

export function streamEditMessage(
  token: string,
  messageId: string,
  newContent: string,
  onEvent: (event: StreamEvent) => void,
  onError?: (error: Error) => void,
): () => void {
  const url = `${API_BASE_URL.replace(/\/+$/, "")}/chats/messages/${messageId}/edit`;
  const abortController = new AbortController();

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content: newContent }),
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is null");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const data = trimmed.slice(6);
              if (data) {
                try {
                  const event = JSON.parse(data) as StreamEvent;
                  onEvent(event);
                } catch (e) {
                  console.error("Failed to parse SSE data:", data);
                }
              }
            }
          }
        }

        if (done) break;
      }

      buffer += decoder.decode();
      const trailing = buffer.trim();
      if (trailing.startsWith("data: ")) {
        const data = trailing.slice(6);
        if (data) {
          try {
            const event = JSON.parse(data) as StreamEvent;
            onEvent(event);
          } catch (e) {
            console.error("Failed to parse SSE data:", data);
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        onError?.(error);
      }
    });

  return () => abortController.abort();
}
