import { ArrowUp, FileText, Plus, Square, X, ImageIcon, FileUp } from "lucide-react";
import { useRef, useEffect, useState } from "react";

import type { DocumentSummary } from "@/modules/contracts";

export type DocumentSuggestionStatus = "idle" | "loading" | "ready" | "empty";
export type HelperTone = "neutral" | "success" | "error";

type Props = {
  disabled?: boolean;
  isGenerating?: boolean;
  value: string;
  helperText?: string;
  helperTone?: HelperTone;
  onChangeText: (message: string) => void;
  onSend?: () => void;
  onStop?: () => void;
  onAttach?: () => void;
  onAttachImage?: () => void;
  selectedDocument?: DocumentSummary | null;
  onClearSelectedDocument?: () => void;
  showDocumentSuggestions?: boolean;
  documentSuggestions?: DocumentSummary[];
  documentSuggestionStatus?: DocumentSuggestionStatus;
  onSelectDocument?: (document: DocumentSummary) => void;
  className?: string;
  brainMode?: 'cloud' | 'local';
  onToggleBrainMode?: () => void;
};

function getDocumentStatusDescription(document: DocumentSummary) {
  if (document.status === "PROCESSING" || document.status === "UPLOADED") {
    return "Processing. Wait before attaching.";
  }

  if (document.status === "FAILED") {
    return document.processingError || "Processing failed. Re-upload or retry.";
  }

  return `${document.sourceType} file`;
}

export function ChatInput({
  disabled = false,
  isGenerating = false,
  value,
  helperText,
  helperTone = "neutral",
  onChangeText,
  onSend,
  onStop,
  onAttach,
  onAttachImage,
  selectedDocument,
  onClearSelectedDocument,
  showDocumentSuggestions = false,
  documentSuggestions = [],
  documentSuggestionStatus = "idle",
  onSelectDocument,
  className = "",
  brainMode: _brainMode,
  onToggleBrainMode: _onToggleBrainMode,
}: Props) {
  const hasSendableText = value.trim().length > 0 && !disabled && !isGenerating;
  const hasSuggestions = documentSuggestions.length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const inputLocked = disabled || isGenerating;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px"; // base height
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + "px";
    }
  }, [value]);

  const helperColors = {
    error: "text-red-600 dark:text-red-400",
    success: "text-green-700 dark:text-green-400",
    neutral: "text-slate-500 dark:text-slate-400",
  };

  return (
    <div className={`px-4 pt-2 pb-6 bg-transparent shrink-0 ${className}`}>
      <div className="w-full max-w-4xl mx-auto flex flex-col relative">
        {selectedDocument && (
          <div className="flex flex-row items-center justify-between rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-3 py-2.5 mb-3 w-fit">
            <div className="flex flex-row items-center mr-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-800 mr-2.5 shrink-0">
                <FileText size={16} className="text-blue-600" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col max-w-[200px]">
                <span className="text-blue-900 dark:text-blue-100 text-sm font-bold truncate">
                  {selectedDocument.title}
                </span>
                <span className="text-blue-600 dark:text-blue-300 text-xs mt-0.5 truncate">
                  {selectedDocument.sourceType} attached
                </span>
              </div>
            </div>
            <button
              onClick={onClearSelectedDocument}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <X size={16} className="text-slate-500 dark:text-slate-400" strokeWidth={2.4} />
            </button>
          </div>
        )}

        {helperText && (
          <p className={`text-xs mb-2 leading-relaxed ${helperColors[helperTone]}`}>
            {helperText}
          </p>
        )}

        {showDocumentSuggestions && (
          <div className="absolute bottom-full left-0 right-0 mb-3 max-h-[240px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl flex flex-col z-50">
            <div className="flex flex-row items-center justify-between mb-2 pb-1">
              <span className="text-slate-900 dark:text-slate-100 text-sm font-bold">Attach a document</span>
              {documentSuggestionStatus === "loading" && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {hasSuggestions ? (
              <div className="overflow-y-auto max-h-[190px] flex flex-col space-y-1 pr-1 custom-scrollbar">
                {documentSuggestions.map((document) => {
                  const isSelectable = document.status === "READY";

                  return (
                    <button
                      key={document.id}
                      disabled={!isSelectable}
                      onClick={() => isSelectable && onSelectDocument?.(document)}
                      className={`flex flex-row items-center rounded-2xl px-3 py-2.5 text-left transition-colors ${
                        isSelectable ? "hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer" : "opacity-70 cursor-not-allowed"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-700 mr-3 shrink-0">
                        <FileText
                          size={16}
                          className={isSelectable ? "text-blue-600" : "text-slate-400"}
                          strokeWidth={2.2}
                        />
                      </div>
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold truncate">
                          {document.title}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs leading-none mt-1 truncate">
                          {getDocumentStatusDescription(document)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          isSelectable
                            ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {document.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed px-1 pb-1">
                {documentSuggestionStatus === "loading"
                  ? "Searching your uploaded documents..."
                  : documentSuggestionStatus === "empty"
                    ? "No matching documents found. Try another name or upload one with +."
                    : "No uploaded documents yet. Use + to upload a PDF or DOCX file."}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-row items-end gap-3 w-full relative">
          {showAttachMenu && (
            <div className="absolute bottom-14 left-0 z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[200px]">
              <button
                onClick={() => {
                  setShowAttachMenu(false);
                  onAttach?.();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <FileUp size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Upload Document</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">PDF or DOCX file</p>
                </div>
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-700 mx-3" />
              <button
                onClick={() => {
                  setShowAttachMenu(false);
                  onAttachImage?.();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <ImageIcon size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Upload Image</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG or WEBP</p>
                </div>
              </button>
            </div>
          )}

          <button
            disabled={inputLocked}
            onClick={() => setShowAttachMenu((prev) => !prev)}
            className={`w-[42px] h-[42px] shrink-0 rounded-full flex items-center justify-center border transition-colors disabled:opacity-50 ${
              showAttachMenu
                ? "bg-slate-900 border-slate-900"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Plus
              size={24}
              className={showAttachMenu ? "text-white" : "text-slate-400"}
              strokeWidth={2.5}
            />
          </button>

          <div className="flex-1 flex flex-row items-end bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl pl-4 pr-2 py-2 min-h-[52px] focus-within:border-blue-300 dark:focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all">
            <textarea
              ref={textareaRef}
              disabled={inputLocked}
              value={value}
              onChange={(e) => onChangeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (hasSendableText) onSend?.();
                }
              }}
              placeholder={isGenerating ? "Thinking" : "Message NedAI..."}
              className="flex-1 bg-transparent border-0 resize-none outline-none text-slate-900 dark:text-slate-100 text-base py-1.5 custom-scrollbar disabled:opacity-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              style={{ maxHeight: "120px" }}
            />

            <div className="flex flex-row items-center shrink-0 ml-2 h-[34px]">
              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop generating"
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 shadow-md transition-all"
                >
                  <Square size={16} className="text-white fill-white" strokeWidth={0} />
                </button>
              ) : (
                <button
                  disabled={!hasSendableText}
                  onClick={onSend}
                  className={`w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all ${
                    hasSendableText
                      ? "bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 shadow-md transform hover:scale-105 active:scale-95"
                      : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                  }`}
                >
                  <ArrowUp size={20} className="text-white" strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
