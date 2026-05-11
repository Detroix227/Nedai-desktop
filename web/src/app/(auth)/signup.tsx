import { useEffect } from "react";
import { ExternalLink, UserPlus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/modules/ui/useUIStore";

export default function SignupScreen() {
  const theme = useUIStore((state) => state.theme);
  const navigate = useNavigate();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleBrowserSignup = () => {
    const productionUrl = "https://nedai-web.vercel.app/signup?redirect=desktop";
    window.open(productionUrl, '_blank');
  };

  return (
    <main className="flex-1 bg-white dark:bg-slate-950 min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300 relative">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold text-sm uppercase tracking-widest">Back</span>
      </button>

      <div className="max-w-md w-full text-center">
        <div className="relative h-20 w-20 mx-auto mb-8 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
          <UserPlus size={40} />
        </div>

        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          Join NedAI
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10">
          To ensure security and verify your student status, account creation is handled on our official web portal.
        </p>

        <button
          onClick={handleBrowserSignup}
          className="group flex items-center justify-center gap-3 w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>Create Account in Browser</span>
          <ExternalLink size={20} className="opacity-50 group-hover:opacity-100" />
        </button>

        <p className="mt-8 text-sm text-slate-400 dark:text-slate-600">
          Already have an account? <span className="text-blue-500 font-bold cursor-pointer hover:underline" onClick={() => navigate('/login')}>Log in.</span>
        </p>
      </div>
    </main>
  );
}
