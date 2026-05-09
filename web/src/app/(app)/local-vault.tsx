import { FileText, Trash2, FileUp, Cpu, HardDrive, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalVaultStore } from "@/modules/documents/useLocalVaultStore";

export default function LocalVaultScreen() {
  const { documents, isIndexing, addDocument, removeDocument } = useLocalVaultStore();


  const triggerLocalPicker = async () => {
    // This requires adding 'openFileDialog' to preload.js
    // For now, I'll assume we can pass a dummy path or if the user provides it.
    // I will add the openFileDialog to preload in the next step.
    if (window.electronAPI && (window.electronAPI as any).openFileDialog) {
       const result = await (window.electronAPI as any).openFileDialog();
       if (result && result.path) {
         await addDocument(result.path, result.name);
       }
    } else {
        alert("Native file picker not yet connected. Please check your desktop configuration.");
    }
  };

  return (
    <AppShell title="Local Vault (Henry)">
      <div className="flex flex-col w-full max-w-4xl mx-auto p-6">
        {/* Henry Status Card */}
        <div className="rounded-3xl bg-blue-600 p-8 mb-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Cpu size={24} />
              </div>
              <h1 className="text-2xl font-bold">Henry's Brain</h1>
            </div>
            <p className="text-blue-50 text-lg mb-6 leading-relaxed max-w-2xl">
              Documents added here are stored and processed <b>locally on your computer</b>. 
              Henry uses these to provide offline context during your chats.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm">
                <HardDrive size={14} />
                <span>Offline Storage</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm">
                <Info size={14} />
                <span>Private & Secure</span>
              </div>
            </div>
          </div>
          {/* Decorative background icon */}
          <Cpu size={200} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Your Local Library</h2>
          <button
            onClick={triggerLocalPicker}
            disabled={isIndexing}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition shadow-lg disabled:opacity-50"
          >
            <FileUp size={20} />
            {isIndexing ? "Indexing..." : "Add to Henry"}
          </button>
        </div>

        {/* Warning for Desktop only */}
        {!window.electronAPI && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-amber-700">
              <b>Desktop Required:</b> The Local Vault only works when running the NedAI Desktop application. 
              In the browser, please use the standard Knowledge Vault.
            </p>
          </div>
        )}

        {/* Document List */}
        <div className="grid gap-4">
          {documents.length > 0 ? (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-blue-600">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{doc.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {doc.path}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        doc.status === 'indexed' ? 'bg-green-100 text-green-700' : 
                        doc.status === 'indexing' ? 'bg-blue-100 text-blue-700 animate-pulse' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {doc.status}
                      </span>
                      {doc.chunks && (
                        <span className="text-xs text-slate-400">
                          {doc.chunks} fragments
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          ) : (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                <HardDrive size={32} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No local documents indexed yet.<br/>
                Add files to help Henry learn about your specific needs.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
