import { FileText, Sparkles, Pencil, Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { MarkdownMessage } from "@/components/MarkdownMessage";
import { TypingBubble } from "@/components/TypingBubble";
import type { ChatMessage } from "@/modules/contracts";
import { useChatStore } from "@/modules/chat/useChatStore";

type Props = {
  messages: ChatMessage[];
  isStreaming?: boolean;
};

function UserMessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editMessage = useChatStore((state) => state.editMessage);
  const status = useChatStore((state) => state.status);
  const isSending = status === "sending";

  // Keep editText in sync when the message content changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditText(message.content);
    }
  }, [message.content, isEditing]);

  // Auto-resize textarea and focus on edit start
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      // Place cursor at end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  function handleEditStart() {
    setEditText(message.content);
    setIsEditing(true);
  }

  function handleCancel() {
    setEditText(message.content);
    setIsEditing(false);
  }

  async function handleSave() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.content) {
      handleCancel();
      return;
    }
    setIsEditing(false);
    await editMessage(message.id, trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  }

  const canEdit = !isSending && !isStreaming && message.deliveryState !== "pending";

  if (isEditing) {
    return (
      <div className="flex flex-col items-end max-w-[92%] sm:max-w-[85%]">
        <div className="w-full rounded-2xl bg-slate-100 dark:bg-slate-700 border-2 border-blue-400 dark:border-blue-500 shadow-md overflow-hidden">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => {
              setEditText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            className="w-full bg-transparent px-4 pt-3 pb-1 text-[15px] text-slate-900 dark:text-slate-100 leading-relaxed resize-none outline-none custom-scrollbar"
            style={{ maxHeight: "200px" }}
          />
          <div className="flex items-center justify-end gap-2 px-3 pb-2 pt-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-auto">
              Enter to save · Esc to cancel
            </span>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              <X size={13} strokeWidth={2.5} />
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={!editText.trim() || editText.trim() === message.content}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Check size={13} strokeWidth={2.5} />
              Save & Resend
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-end max-w-[92%] sm:max-w-[85%]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-end gap-2">
        {/* Edit button — appears on hover, to the left of the bubble */}
        <div
          className={`transition-all duration-150 ${
            isHovered && canEdit ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
          }`}
        >
          <button
            onClick={handleEditStart}
            title="Edit message"
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm"
          >
            <Pencil size={13} strokeWidth={2.5} />
          </button>
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 text-[15px] leading-relaxed shadow-sm ${
            message.deliveryState === "failed"
              ? "bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800"
              : "bg-slate-200 dark:bg-slate-700"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {message.document && (
            <div className="flex flex-row items-center bg-white dark:bg-slate-800 rounded-xl px-3 py-2 mt-3 border border-slate-200 dark:border-slate-700 select-none">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mr-3 shrink-0">
                <FileText size={16} className="text-blue-600" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-blue-900 dark:text-blue-100 truncate">
                  {message.document.title}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {message.deliveryState === "failed" && (
        <span className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">Not sent</span>
      )}
    </div>
  );
}

export function ChatMessageList({ messages, isStreaming = false }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollSignature = useMemo(
    () =>
      messages
        .map((message) => `${message.id}:${message.content.length}`)
        .join("|"),
    [messages],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
      block: "end",
    });
  }, [scrollSignature, isStreaming]);

  return (
    <div className="px-4 pt-4 pb-8 space-y-6">
      {messages.map((message) => {
        const isUser = message.role === "user";
        const isPendingAssistant =
          message.role === "assistant" &&
          message.deliveryState === "pending" &&
          message.content === "";

        return (
          <div
            key={message.id}
            className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
          >
            {isUser ? (
              <UserMessageBubble message={message} isStreaming={isStreaming} />
            ) : (
              <div className="flex flex-row w-full max-w-[95%] sm:max-w-3xl lg:max-w-4xl gap-2 sm:gap-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-1">
                  <Sparkles size={18} className="text-blue-600" />
                </div>

                <div className="flex-1 pt-1 min-w-0">
                  {isPendingAssistant ? (
                    <TypingBubble />
                  ) : (
                    <MarkdownMessage content={message.content} />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} aria-hidden className="h-px w-full shrink-0" />
    </div>
  );
}
