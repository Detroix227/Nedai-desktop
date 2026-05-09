import { useEffect } from "react";
import { ExternalLink, ShieldCheck, Cpu, Globe } from "lucide-react";
import { useUIStore } from "@/modules/ui/useUIStore";

export default function LoginScreen() {
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleBrowserLogin = () => {
    // This will open the default system browser
    // In a real production app, we'd use the actual URL
    const productionUrl = "https://nedai-web.vercel.app/login?redirect=desktop";
    window.open(productionUrl, '_blank');
  };

  return (
    <main className="flex-1 bg-white dark:bg-slate-950 min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-md w-full text-center">
        {/* Logo Animation Container */}
        <div className="relative mb-8 inline-block">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative h-24 w-24 mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 p-4">
             <img 
                src="/nedai-text-logo.png" 
                alt="NedAI Logo" 
                className="w-full h-full object-contain scale-125"
              />
          </div>
        </div>

        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
          NedAI Desktop
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10 text-lg">
          Sync your workspace and activate Henry.
        </p>

        {/* Action Card */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col gap-4">
            <button
              onClick={handleBrowserLogin}
              className="group relative flex items-center justify-between w-full h-16 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={24} className="group-hover:rotate-12 transition-transform" />
                <span>Secure Login</span>
              </div>
              <ExternalLink size={20} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            <p className="text-xs text-slate-400 dark:text-slate-500 px-4">
              We'll open your secure browser to verify your account and sync your data safely.
            </p>
          </div>

          <div className="my-8 flex items-center">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Desktop Features</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Desktop Perks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <Cpu size={20} className="text-blue-500" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Local Henry</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <Globe size={20} className="text-blue-500" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Cloud Sync</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-10 text-sm text-slate-400 dark:text-slate-600">
          First time here? <span className="text-blue-500 font-bold cursor-pointer hover:underline" onClick={handleBrowserLogin}>Create an account on the web.</span>
        </p>
      </div>
    </main>
  );
}
