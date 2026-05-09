import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User as UserIcon, Mail, Lock, Eye, EyeOff } from "lucide-react";

import { useAuthStore } from "@/modules/auth/useAuthStore";
import { useUIStore } from "@/modules/ui/useUIStore";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignupScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "LECTURER">("STUDENT");
  const [localError, setLocalError] = useState<string | null>(null);
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const signUp = useAuthStore((state) => state.signUp);
  const googleSignIn = useAuthStore((state) => state.googleSignIn);
  const clearError = useAuthStore((state) => state.clearError);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const status = useAuthStore((state) => state.status);
  const isSubmitting = status === "loading";
  const activeError = localError || errorMessage;
  const navigate = useNavigate();

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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    clearError();

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setLocalError("Full name, role, email, and password are required.");
      return;
    }

    if (fullName.trim().length < 2) {
      setLocalError("Full name must be at least 2 characters.");
      return;
    }

    if (!isValidEmail(email)) {
      setLocalError("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    setLocalError(null);

    try {
      await signUp({ fullName, role, email, password });
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

          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white text-center">
            Create account
          </h2>
          <p className="mb-10 px-4 text-center text-slate-500 dark:text-slate-400">
            Set up your account and continue building from the app shell.
          </p>

          <form onSubmit={handleSignup} className="w-full flex-1 flex flex-col">
            <div className="mb-5">
              <label className="mb-2 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                Full Name
              </label>
              <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4">
                <UserIcon size={20} className="text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="John Doe"
                  className="ml-3 flex-1 text-base text-slate-900 dark:text-white bg-transparent outline-none"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setLocalError(null);
                    clearError();
                  }}
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                Role
              </label>
              <div className="flex flex-row">
                {(
                  [
                    { label: "Student", value: "STUDENT" },
                    { label: "Lecturer", value: "LECTURER" },
                  ] as const
                ).map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => {
                      setRole(option.value);
                      setLocalError(null);
                      clearError();
                    }}
                    className={`mr-3 flex-1 rounded-xl px-4 py-3 transition-colors ${role === option.value ? "bg-blue-600" : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                  >
                    <span
                      className={`text-center text-sm font-semibold ${role === option.value ? "text-white" : "text-slate-700 dark:text-slate-300"}`}
                    >
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                Email Address
              </label>
              <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4">
                <Mail size={20} className="text-slate-500 dark:text-slate-400" />
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  className="ml-3 flex-1 text-base text-slate-900 dark:text-white bg-transparent outline-none"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLocalError(null);
                    clearError();
                  }}
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                Password
              </label>
              <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4">
                <Lock size={20} className="text-slate-500 dark:text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="........"
                  className="ml-3 flex-1 text-base text-slate-900 dark:text-white bg-transparent outline-none"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLocalError(null);
                    clearError();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="p-1"
                >
                  {showPassword ? (
                    <EyeOff size={20} className="text-slate-500 dark:text-slate-400" />
                  ) : (
                    <Eye size={20} className="text-slate-500 dark:text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {activeError && (
              <span className="mb-2 px-1 text-sm text-red-600">
                {activeError}
              </span>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`mt-4 h-14 w-full flex items-center justify-center rounded-xl shadow-sm transition-colors ${
                isSubmitting ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed" : "bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100"
              }`}
            >
              <span className={`text-lg font-bold ${isSubmitting ? "text-white" : "text-white dark:text-slate-900"}`}>
                {isSubmitting ? "Creating account..." : "Create Account"}
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
                Sign up with Google
              </span>
            </div>
          </button>

          <div className="mb-6 mt-auto flex flex-row pt-10">
            <span className="text-slate-500 dark:text-slate-400 mr-1">
              Already have an account?
            </span>
            <Link to="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
