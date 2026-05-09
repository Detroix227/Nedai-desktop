import { useEffect, useRef } from "react";
import { FileText, Trash2, Image, FileUp, ImageIcon } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useAuthStore } from "@/modules/auth/useAuthStore";
import { useDocumentStore } from "@/modules/documents/useDocumentStore";

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeVaultScreen() {
  const token = useAuthStore((state) => state.accessToken);
  const documents = useDocumentStore((state) => state.documents);
  const quota = useDocumentStore((state) => state.quota);
  const status = useDocumentStore((state) => state.status);
  const errorMessage = useDocumentStore((state) => state.errorMessage);
  const loadDocuments = useDocumentStore((state) => state.loadDocuments);
  const uploadDocument = useDocumentStore((state) => state.uploadDocument);
  const deleteDocument = useDocumentStore((state) => state.deleteDocument);
  const uploadProgress = useDocumentStore((state) => state.uploadProgress);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      void loadDocuments(token);
    }
  }, [loadDocuments, token]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    try {
      const mimeType = file.type || 
        (file.name.toLowerCase().endsWith(".pdf") 
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

      await uploadDocument(token, {
        uri: URL.createObjectURL(file),
        name: file.name,
        file: file,
        mimeType,
      });
    } catch (error) {
      console.error("Upload failed:", error);
    }
    
    event.target.value = '';
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    try {
      const mimeType = file.type || "image/png";
      await uploadDocument(token, {
        uri: URL.createObjectURL(file),
        name: file.name,
        file: file,
        mimeType,
      });
    } catch (error) {
      console.error("Image upload failed:", error);
    }
    
    event.target.value = '';
  }

  async function handleDelete(documentId: string) {
    if (!token) return;
    try {
      await deleteDocument(token, documentId);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }

  return (
    <AppShell
      title="Knowledge Vault"
    >
      <div className="flex flex-col w-full max-w-6xl mx-auto p-6">
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

        {/* Header Section */}
        <div className="rounded-3xl bg-slate-900 p-6 mb-6">
          <h1 className="text-xl font-semibold text-white mb-2">
            Uploaded files
          </h1>
          <p className="text-sm leading-6 text-slate-300 mb-4">
            Upload PDF, DOCX, or image files (PNG, JPG, WEBP). Images are automatically described by AI and become searchable in chat.
          </p>
          {quota && (
            <p className="text-sm text-slate-200">
              {quota.usedDocuments}/{quota.maxDocuments} documents,{" "}
              {formatBytes(quota.usedBytes)}/{formatBytes(quota.maxBytes)} used
            </p>
          )}
        </div>

        {/* Upload Buttons */}
        <div className="mb-6 flex gap-3">
          {/* Upload Document */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={status === "uploading"}
            className={`flex-1 relative overflow-hidden rounded-2xl px-5 py-4 flex items-center gap-3 transition border ${
              status === "uploading"
                ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                : "bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <FileUp size={20} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">
                {status === "uploading" ? `Uploading ${uploadProgress}%` : "Upload Document"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">PDF or DOCX file</p>
            </div>
            {status === "uploading" && (
              <div
                className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
          </button>

          {/* Upload Image */}
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={status === "uploading"}
            className={`flex-1 relative overflow-hidden rounded-2xl px-5 py-4 flex items-center gap-3 transition border ${
              status === "uploading"
                ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                : "bg-white border-purple-200 hover:bg-purple-50 hover:border-purple-300"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <ImageIcon size={20} className="text-purple-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">Upload Image</p>
              <p className="text-xs text-slate-500 mt-0.5">PNG, JPG or WEBP</p>
            </div>
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        {/* Documents List */}
        <div className="flex-1">
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                      {(document.sourceType as string) === 'IMAGE' && (document as any).storagePath ? (
                        <img
                          src={(document as any).storagePath}
                          alt={document.title}
                          className="w-full max-w-[200px] h-28 object-cover rounded-xl mb-3 border border-slate-100"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : null}
                      <h3 className="text-base font-semibold text-slate-900 mb-1">
                        {document.title}
                      </h3>
                      <p className="text-sm text-slate-500 mb-2">
                        {document.originalFilename}
                      </p>
                      <p className="text-xs text-slate-400">
                        {document.sourceType} - {formatBytes(document.byteSize)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50">
                        {(document.sourceType as string) === 'IMAGE'
                          ? <Image size={16} className="text-purple-500" />
                          : <FileText size={16} className="text-blue-500" />}
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        document.status === 'READY' 
                          ? 'bg-green-100 text-green-700'
                          : document.status === 'PROCESSING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {document.status}
                      </span>
                    </div>
                  </div>

                  {document.processingError && (
                    <p className="mt-3 text-sm text-red-600">
                      {document.processingError}
                    </p>
                  )}

                  <button
                    onClick={() => handleDelete(document.id)}
                    className="mt-4 flex items-center px-3 py-2 bg-red-50 hover:bg-red-100 rounded-full transition"
                  >
                    <Trash2 size={14} className="text-red-600 mr-1" />
                    <span className="text-xs font-semibold text-red-700">
                      Delete
                    </span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-8 text-center">
              <FileText size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500">
                Your uploaded PDFs, DOCX, and image files will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
