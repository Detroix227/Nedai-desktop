import { Loader2, Download } from 'lucide-react';
import { useAuthStore } from '@/modules/auth/useAuthStore';

export function SplashScreen() {
  const status = useAuthStore((state) => state.bootstrapStatus);
  const progress = useAuthStore((state) => state.bootstrapProgress);

  const getStatusText = () => {
    switch (status) {
      case 'pulling': return 'Downloading Local Brain...';
      case 'initializing': return 'Starting Henry...';
      case 'ready': return 'Ready!';
      case 'error-pull-failed': return 'Download failed. Check connection.';
      default: return 'Initializing...';
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white transition-opacity duration-500">
      <div className="flex flex-col items-center mb-24">
        <div className="w-40 h-40 bg-[#0F1E21] rounded-3xl p-5 flex justify-center items-center mb-6 shadow-xl shadow-slate-200">
          <img 
            src="nedai-symbol.png" 
            alt="NedAI Logo" 
            className="w-full h-full object-contain scale-125"
          />
        </div>

        <h1 className="text-5xl font-bold text-[#312E81] mb-2">
          NedAI
        </h1>
        <h2 className="text-sm font-semibold text-[#93C5FD] tracking-[0.25em]">
          INTELLIGENCE & CONNECTION
        </h2>
      </div>

      <div className="absolute bottom-16 flex flex-col items-center w-64">
        {status === 'pulling' ? (
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3 text-blue-600">
              <Download className="w-5 h-5 animate-bounce" />
              <span className="text-lg font-bold">{progress}%</span>
            </div>
            {/* Progress Bar Container */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        )}
        <span className="mt-4 text-sm text-slate-400 font-bold uppercase tracking-widest text-center px-4">
          {getStatusText()}
        </span>
      </div>
    </div>
  );
}
