import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";

import { AppShell } from "@/components/AppShell";
import { ChatInput, type HelperTone } from "@/components/ChatInput";
import { ChatMessageList } from "@/components/ChatMessageList";
import { useAuthStore } from "@/modules/auth/useAuthStore";
import { isAssessmentPrompt } from "@/modules/chat/assessmentIntent";
import { useChatStore } from "@/modules/chat/useChatStore";
import type { DocumentSummary } from "@/modules/contracts";
import * as DocumentApi from "@/modules/documents/document.api";
import { useDocumentStore } from "@/modules/documents/useDocumentStore";

const ATTACHMENT_REQUIRED_MESSAGE =
  "Tag a document with @ before requesting a quiz or exam.";

type HelperState = {
  text: string;
  tone: HelperTone;
} | null;

type ActiveDocumentMention = {
  query: string;
  start: number;
  end: number;
};

function getActiveDocumentMention(value: string): ActiveDocumentMention | null {
  const match = /(^|\s)@([^\s@]*)$/.exec(value);

  if (!match) {
    return null;
  }

  const mentionText = `@${match[2] ?? ""}`;
  const start = match.index + match[1].length;

  return {
    query: match[2] ?? "",
    start,
    end: start + mentionText.length,
  };
}

function removeDocumentMention(
  value: string,
  mention: ActiveDocumentMention | null,
) {
  if (!mention) {
    return value;
  }

  const before = value.slice(0, mention.start).trimEnd();
  const after = value.slice(mention.end).trimStart();

  return [before, after].filter(Boolean).join(" ").trim();
}

function filterDocuments(documents: DocumentSummary[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return documents;
  }

  return documents.filter((document) => {
    const title = document.title.toLowerCase();
    const originalFilename = document.originalFilename.toLowerCase();

    return title.includes(normalized) || originalFilename.includes(normalized);
  });
}

export default function HomeScreen() {
  const token = useAuthStore((state) => state.accessToken);
  const activeThreadId = useChatStore((state) => state.activeThreadId);
  const threads = useChatStore((state) => state.threads);
  const status = useChatStore((state) => state.status);
  const errorMessage = useChatStore((state) => state.errorMessage);
  const messages = useChatStore(
    useShallow((state) => state.messagesForActiveThread()),
  );
  const loadChats = useChatStore((state) => state.loadChats);
  const sendMessage = useChatStore((state) => state.sendMessage);
  
  const documents = useDocumentStore((state) => state.documents);
  const loadDocuments = useDocumentStore((state) => state.loadDocuments);
  const uploadDocument = useDocumentStore((state) => state.uploadDocument);
  const brainMode = useChatStore((state) => state.brainMode);
  const toggleBrainMode = useChatStore((state) => state.toggleBrainMode);
  const [composerText, setComposerText] = useState("");
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentSummary | null>(null);
  const [helperState, setHelperState] = useState<HelperState>(null);
  const [forceSuggestionOpen, setForceSuggestionOpen] = useState(false);
  const [remoteSuggestionStatus, setRemoteSuggestionStatus] = useState<
    "idle" | "loading" | "done"
  >("idle");
  const [remoteSuggestionResults, setRemoteSuggestionResults] = useState<
    DocumentSummary[] | null
  >(null);
  const hasConversation = messages.length > 0;
  const isLoading = status === "loading";
  const isSending = status === "sending";
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const activeMention = useMemo(
    () => getActiveDocumentMention(composerText),
    [composerText],
  );
  const showDocumentSuggestions = forceSuggestionOpen || activeMention !== null;
  const localSuggestionResults = useMemo(
    () => filterDocuments(documents, activeMention?.query ?? ""),
    [activeMention?.query, documents],
  );
  const suggestionResults =
    activeMention?.query.trim() && remoteSuggestionResults !== null
      ? remoteSuggestionResults
      : localSuggestionResults;
  const documentSuggestionStatus = !showDocumentSuggestions
    ? "idle"
    : remoteSuggestionStatus === "loading"
      ? "loading"
      : suggestionResults.length > 0
        ? "ready"
        : "empty";
  const previousActiveThreadIdRef = useRef<string | null>(activeThreadId);
  const pendingFreshThreadFromSendRef = useRef(false);
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadDocuments(token, { silent: true });
  }, [loadDocuments, token]);

  useEffect(() => {
    if (!showDocumentSuggestions) {
      setRemoteSuggestionStatus("idle");
      setRemoteSuggestionResults(null);
      return;
    }

    const query = activeMention?.query.trim() ?? "";

    if (!token || !query) {
      setRemoteSuggestionStatus("idle");
      setRemoteSuggestionResults(null);
      return;
    }

    setRemoteSuggestionStatus("idle");
    setRemoteSuggestionResults(null);

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    const timeoutId = setTimeout(() => {
      setRemoteSuggestionStatus("loading");

      void DocumentApi.listDocuments(token, { documentName: query })
        .then((response) => {
          if (searchRequestIdRef.current !== requestId) {
            return;
          }

          setRemoteSuggestionResults(response.documents);
          setRemoteSuggestionStatus("done");
        })
        .catch(() => {
          if (searchRequestIdRef.current !== requestId) {
            return;
          }

          setRemoteSuggestionResults([]);
          setRemoteSuggestionStatus("done");
        });
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [activeMention?.query, showDocumentSuggestions, token]);

  useEffect(() => {
    if (!selectedDocument) {
      return;
    }

    const nextDocument =
      documents.find((doc: DocumentSummary) => doc.id === selectedDocument.id) ?? null;

    if (!nextDocument) {
      setSelectedDocument(null);
      return;
    }

    if (nextDocument !== selectedDocument) {
      setSelectedDocument(nextDocument);
    }
  }, [documents, selectedDocument]);

  useEffect(() => {
    if (composerText.trim().length === 0 && activeMention === null) {
      setForceSuggestionOpen(false);
    }
  }, [activeMention, composerText]);

  useEffect(() => {
    const previousThreadId = previousActiveThreadIdRef.current;

    if (previousThreadId === activeThreadId) {
      return;
    }

    if (
      pendingFreshThreadFromSendRef.current &&
      previousThreadId === null &&
      activeThreadId
    ) {
      pendingFreshThreadFromSendRef.current = false;
      previousActiveThreadIdRef.current = activeThreadId;
      return;
    }

    pendingFreshThreadFromSendRef.current = false;
    previousActiveThreadIdRef.current = activeThreadId;
    setSelectedDocument(null);
    setForceSuggestionOpen(false);
    setHelperState(null);
  }, [activeThreadId]);

  function setComposerDraft(nextValue: string) {
    setComposerText(nextValue);
    setHelperState(null);
    setForceSuggestionOpen(
      (isOpen) =>
        isOpen && !selectedDocument && isAssessmentPrompt(nextValue.trim()),
    );
  }

  async function handleSend() {
    const trimmed = composerText.trim();

    if (!trimmed) {
      return;
    }

    if (isAssessmentPrompt(trimmed) && !selectedDocument) {
      setHelperState({
        text: ATTACHMENT_REQUIRED_MESSAGE,
        tone: "error",
      });
      setForceSuggestionOpen(true);
      return;
    }

    pendingFreshThreadFromSendRef.current = activeThreadId === null;

    // Clear input immediately so user sees it disappear while AI is thinking
    setComposerText("");
    setHelperState(null);
    setForceSuggestionOpen(false);

    try {
      await sendMessage({
        content: trimmed,
        ...(selectedDocument
          ? {
              documentId: selectedDocument.id,
              document: {
                id: selectedDocument.id,
                title: selectedDocument.title,
                sourceType: selectedDocument.sourceType,
              },
            }
          : {}),
      });
      setSelectedDocument(null);
    } catch {
      pendingFreshThreadFromSendRef.current = false;
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    handleAttachFile(file, token);
    
    // reset input to allow re-upload of same file
    event.target.value = '';
  }

  async function handleAttachFile(file: File, token: string, isImage = false) {
    try {
      const mimeType = file.type || 
        (file.name.toLowerCase().endsWith(".pdf") 
          ? "application/pdf"
          : file.name.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/)
            ? "image/png"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

      await uploadDocument(token, {
        uri: URL.createObjectURL(file),
        name: file.name,
        file: file,
        mimeType,
      });
      setHelperState({
        text: isImage
          ? "Image uploading. AI will describe it and make it searchable."
          : "Upload accepted. Tag it with @ after processing completes.",
        tone: "success",
      });
    } catch (error) {
      setHelperState({
        text:
          error instanceof Error ? error.message : "Upload failed.",
        tone: "error",
      });
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    handleAttachFile(file, token, true);
    event.target.value = '';
  }

  function handleSelectDocument(document: DocumentSummary) {
    setSelectedDocument(document);
    setComposerText((currentValue) =>
      removeDocumentMention(
        currentValue,
        getActiveDocumentMention(currentValue),
      ),
    );
    setHelperState({
      text: `${document.title} attached.`,
      tone: "success",
    });
    setForceSuggestionOpen(false);
  }

  const helperText =
    helperState?.text ??
    errorMessage ??
    (isSending
      ? "NedAI is replying..."
      : isLoading
        ? "Syncing chats from the server..."
        : "Type @ to tag an uploaded document.");
  const helperTone = helperState?.tone ?? (errorMessage ? "error" : "neutral");

  // Since Sidebar handles chat list, we don't need a history bottom sheet
  const handleOpenHistory = undefined; 

  return (
    <AppShell
      title="Chat"
      onHistory={handleOpenHistory}
    >
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto overflow-hidden relative">
        {/* Scrollable message area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {hasConversation ? (
            <ChatMessageList messages={messages} />
          ) : isLoading && threads.length > 0 ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium text-base flex flex-row items-center gap-2">
                <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin"/> Loading conversation...
              </span>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="w-[240px] h-[240px] rounded-full bg-white dark:bg-slate-800 shadow-xl shadow-blue-500/10 flex items-center justify-center mb-8 border border-slate-50 dark:border-slate-700 overflow-hidden">
                <img src="nedai-text-logo.png" alt="NedAI" className="w-[140%] max-w-none object-contain" />
              </div>
              <h2 className="text-[28px] font-bold text-slate-800 dark:text-slate-100 text-center mb-8 max-w-sm leading-tight">
                What would you like to work on today?
              </h2>
            </div>
          )}
        </div>

        {/* Hidden File Inputs */}
        <input 
          type="file" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
        <input
          type="file"
          ref={imageInputRef}
          style={{ display: 'none' }}
          onChange={handleImageChange}
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        />

        <div className="p-4 md:px-8 md:pb-8 shrink-0 relative">
          <ChatInput
            disabled={isSending}
            value={composerText}
            onChangeText={setComposerDraft}
            onAttach={() => fileInputRef.current?.click()}
            onAttachImage={() => imageInputRef.current?.click()}
            onSend={handleSend}
            helperText={helperText}
            helperTone={helperTone}
            selectedDocument={selectedDocument}
            onClearSelectedDocument={() => {
              setSelectedDocument(null);
              setHelperState(null);
            }}
            showDocumentSuggestions={showDocumentSuggestions}
            documentSuggestions={suggestionResults}
            documentSuggestionStatus={documentSuggestionStatus}
            onSelectDocument={handleSelectDocument}
            brainMode={brainMode}
            onToggleBrainMode={toggleBrainMode}
          />
        </div>
      </div>
    </AppShell>
  );
}

