import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/modules/auth/useAuthStore";
import { useUIStore } from "@/modules/ui/useUIStore";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const signIn = useAuthStore((state) => state.signIn);
  const googleSignIn = useAuthStore((state) => state.googleSignIn);
  const clearError = useAuthStore((state) => state.clearError);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const status = useAuthStore((state) => state.status);
  const isSubmitting = status === "loading";
  const activeError = localError || errorMessage;

  useEffect(() => {
    // Initialize Google Identity Services
    if ((window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
        callback: handleGoogleResponse,
      });
    }
  }, []);

  async function handleGoogleResponse(response: any) {
    try {
      await googleSignIn(response.credential);
      navigate("/chat");
    } catch (err) {
      console.error("Google Sign-In Error:", err);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (!email.trim() || !password.trim()) {
      setLocalError("Email and password are required.");
      return;
    }
    if (!isValidEmail(email)) {
      setLocalError("Enter a valid email address.");
      return;
    }
    setLocalError(null);
    try {
      await signIn({ email, password });
      navigate("/chat");
    } catch {}
  }

  const handleGoogleClick = () => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      alert("Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file.");
      return;
    }
    (window as any).google?.accounts.id.prompt();
  };

  return (
    <main className="flex-1 bg-white dark:bg-slate-950 min-h-screen flex flex-col transition-colors duration-300">
      <div className="flex-1 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center px-6 pb-10 pt-10 max-w-md mx-auto">
          
          {/* Logo */}
          <div className="mb-4 h-20 w-20 flex items-center justify-center">
            <img 
              src="/nedai-logo.png" 
              alt="NedAI Logo" 
              className="w-full h-full object-contain"
            />
          </div>

          <h1 className="mb-10 text-3xl font-bold text-slate-900 dark:text-white">
            NedAI
          </h1>

          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white w-full text-center">
            Welcome
          </h2>
          <p className="mb-10 px-4 text-center text-slate-500 dark:text-slate-400">
            Sign in to continue with your workspace.
          </p>

          <form className="w-full" onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block mb-2 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4">
                <Mail className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  className="ml-3 flex-1 text-base text-slate-900 dark:text-white bg-transparent outline-none w-full"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLocalError(null);
                  }}
                />
              </div>
            </div>

            <div className="mb-6">
              <div className="mx-1 mb-2 flex flex-row items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity">
                  Forgot password?
                </Link>
              </div>
              <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4">
                <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="........"
                  className="ml-3 flex-1 text-base text-slate-900 dark:text-white bg-transparent outline-none w-full"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLocalError(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:opacity-80 transition-opacity ml-2 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {activeError ? (
              <p className="mb-2 px-1 text-sm text-red-600 dark:text-red-400">
                {activeError}
              </p>
            ) : null}

            <button
              type="submit"
              className={`mt-8 w-full h-14 flex items-center justify-center rounded-xl shadow-sm transition-opacity ${
                isSubmitting ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed" : "bg-slate-900 dark:bg-white hover:opacity-90"
              }`}
              disabled={isSubmitting}
            >
              <span className={`text-lg font-bold ${isSubmitting ? "text-white" : "text-white dark:text-slate-900"}`}>
                {isSubmitting ? "Signing in..." : "Continue"}
              </span>
            </button>
          </form>

          <div className="w-full flex items-center my-6">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="px-4 text-sm font-medium text-slate-500 dark:text-slate-400">OR</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          <button
            onClick={handleGoogleClick}
            className="w-full h-14 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-md group"
          >
            <div className="flex items-center justify-center">
              <img src="/google-logo.png" alt="Google" className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
              <span className="text-base font-bold text-slate-700 dark:text-slate-300">
                Continue with Google
              </span>
            </div>
          </button>

          <div className="mb-6 mt-10 flex flex-row items-center gap-1 justify-center w-full">
            <span className="text-slate-500 dark:text-slate-400">
              Don't have an account?
            </span>
            <Link to="/signup" className="font-bold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
