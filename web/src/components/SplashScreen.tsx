import { Loader2 } from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white transition-opacity duration-500">
      <div className="flex flex-col items-center mb-24">
        <div className="w-40 h-40 bg-[#0F1E21] rounded-3xl p-5 flex justify-center items-center mb-6 shadow-xl shadow-slate-200">
          <img 
            src="/nedai-logo.png" 
            alt="NedAI Logo" 
            className="w-full h-full object-contain"
          />
        </div>

        <h1 className="text-5xl font-bold text-[#312E81] mb-2">
          NedAI
        </h1>
        <h2 className="text-sm font-semibold text-[#93C5FD] tracking-[0.25em]">
          INTELLIGENCE & CONNECTION
        </h2>
      </div>

      <div className="absolute bottom-16 flex flex-col items-center">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="mt-3 text-base text-slate-400 font-medium animate-pulse">
          Initializing...
        </span>
      </div>
    </div>
  );
}
