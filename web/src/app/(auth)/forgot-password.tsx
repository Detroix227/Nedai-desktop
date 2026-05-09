import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, MailOpen } from "lucide-react";
import { forgotPassword } from "@/modules/auth/auth.api";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setLocalError("Email is required.");
      return;
    }

    if (!isValidEmail(email)) {
      setLocalError("Enter a valid email address.");
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);

    try {
      await forgotPassword({ email: email.trim() });
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Forgot password error:", error);
      const message = error?.message || "Failed to send reset link. Please try again.";
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex-1 bg-white min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="flex-1 flex flex-col px-6 pb-10 pt-6 max-w-md mx-auto w-full">
          <button
            onClick={() => navigate(-1)}
            className="mb-8 h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={24} className="text-[#0F172A]" />
          </button>

          <h1 className="mb-2 text-3xl font-bold text-slate-900">
            Reset password
          </h1>

          <p className="mb-10 text-slate-500">
            Enter your email address to receive instructions on how to reset your password.
          </p>

          {isSuccess ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
                <MailOpen size={24} className="text-green-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">
                Check your inbox
              </h2>
              <p className="text-slate-600">
                We have sent a password reset link to <span className="font-semibold text-slate-900">{email}</span>. Please follow the instructions in the email.
              </p>

              <button
                className="w-full mt-6 h-12 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors"
                onClick={() => navigate("/login")}
              >
                <span className="text-base font-bold text-white">
                  Back to login
                </span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="w-full">
              <div className="mb-6">
                <label className="mb-2 ml-1 text-sm font-semibold text-slate-700 block">
                  Email Address
                </label>
                <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
                  <Mail size={20} className="text-[#64748B]" />
                  <input
                    type="email"
                    placeholder="name@email.com"
                    className="ml-3 flex-1 text-base text-slate-900 bg-transparent outline-none"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setLocalError(null);
                    }}
                  />
                </div>
              </div>

              {localError && (
                <p className="mb-4 px-1 text-sm text-red-600">
                  {localError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`mt-4 w-full h-14 flex items-center justify-center rounded-xl shadow-sm transition-colors ${
                  isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                <span className="text-lg font-bold text-white">
                  {isSubmitting ? "Sending link..." : "Send Reset Link"}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
