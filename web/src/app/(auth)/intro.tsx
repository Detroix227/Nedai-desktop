import { Navigate } from 'react-router-dom';
import { Sparkles, BrainCircuit, CalendarDays, GraduationCap, ChevronRight, Sun, Moon } from 'lucide-react';
import { useEffect } from 'react';
import { useAuthStore } from '@/modules/auth/useAuthStore';
import { useUIStore } from '@/modules/ui/useUIStore';

export default function IntroScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { theme, toggleTheme } = useUIStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Navbar */}
      <nav className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="nedai-symbol.png" 
              alt="NedAI Logo" 
              className="w-10 h-10 object-contain"
            />
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">NedAI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-2"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-amber-500" strokeWidth={2.5} />
              ) : (
                <Moon size={20} className="text-slate-600" strokeWidth={2.5} />
              )}
            </button>
            
            <button 
              onClick={() => window.open('https://nedai.app/login?redirect=desktop', '_blank')}
              className="text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white transition px-4 py-2"
            >
              Sign In
            </button>
            <button 
              onClick={() => window.open('https://nedai.app/signup?redirect=desktop', '_blank')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-full transition shadow-sm"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-32 flex flex-col items-center text-center">
          <h1 className="text-7xl md:text-9xl font-black text-slate-900 dark:text-white tracking-tighter mb-8">
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
              NedAI
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed mb-12 font-medium">
            Your personal AI-powered academic assistant. Automate your schedule, store your knowledge, and study smarter.
          </p>
          <button 
            onClick={() => window.open('https://nedai.app/signup?redirect=desktop', '_blank')}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold px-8 py-4 rounded-full flex items-center gap-2 transition transform hover:scale-105 shadow-xl text-lg"
          >
            Get Started for Free <ChevronRight size={20} strokeWidth={3} />
          </button>
        </section>

        {/* Detailed Sections */}
        <section className="bg-white dark:bg-slate-900 py-24 border-y border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Everything you need to succeed</h2>
              <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                Powerful tools designed specifically for students and educators to save time and boost productivity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              
              {/* Feature 1 */}
              <div className="flex flex-col">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6 shadow-inner">
                  <BrainCircuit className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Context-Aware AI Chat</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Stop scrolling through hundreds of pages. Upload your lecture slides, notes, and textbooks, and let NedAI read them for you. Ask questions, request summaries, and get highly accurate answers grounded entirely in your own course materials. No more hallucinated facts.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6 shadow-inner">
                  <GraduationCap className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">The Knowledge Vault</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  A powerful, centralized storage system for your academic life. Keep all your PDFs, Word documents, and images organized in one place. NedAI automatically indexes everything you upload, making it instantly searchable and available for your AI chat sessions.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6 shadow-inner">
                  <CalendarDays className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Automated Timetable</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Managing your schedule has never been easier. View your classes in a beautiful calendar interface. Best of all, you can simply upload an image or document of your class schedule, and NedAI will use vision processing to automatically extract and populate your timetable.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-col">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6 shadow-inner">
                  <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Instant Generation</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Prepare for exams with zero friction. Ask NedAI to generate multiple-choice quizzes, flashcards, and comprehensive study guides based on your specific curriculum. The AI adapts to your learning pace and focuses on the materials you provide.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="bg-slate-50 dark:bg-slate-950 py-32 text-center px-6">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight">Ready to upgrade your workflow?</h2>
          <button 
            onClick={() => window.open('https://nedai.app/signup?redirect=desktop', '_blank')}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-5 rounded-full transition transform hover:scale-105 shadow-xl text-xl"
          >
            Create Your Free Account
          </button>
        </section>
        
        {/* Footer */}
        <footer className="w-full bg-slate-900 text-slate-400 py-8 text-center border-t border-slate-800">
          <p className="text-sm font-medium">© {new Date().getFullYear()} NedAI. All rights reserved.</p>
        </footer>

      </div>
    </div>
  );
}
