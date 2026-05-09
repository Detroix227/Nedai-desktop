import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { resetPassword } from "@/modules/auth/auth.api";

function isValidPassword(value: string) {
  return value.length >= 8;
}

export default function ResetPasswordScreen() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setLocalError("Invalid or missing reset token.");
      return;
    }

    if (!password.trim()) {
      setLocalError("Password is required.");
      return;
    }

    if (!isValidPassword(password)) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);

    try {
      await resetPassword({ token, password });
      setIsSuccess(true);
    } catch (error: any) {
      const msg = error?.message || "Failed to reset password. The link may have expired.";
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex-1 bg-white min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="flex-1 flex flex-col px-6 pb-10 pt-6 max-w-md mx-auto w-full">
          <button
            onClick={() => navigate("/login")}
            className="mb-8 h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-900" />
          </button>

          <h1 className="mb-2 text-3xl font-bold text-slate-900">Set new password</h1>
          <p className="mb-10 text-slate-500">Enter your new password below.</p>

          {/* Invalid / missing token */}
          {!token ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
              <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
                <XCircle size={24} className="text-red-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">Invalid reset link</h2>
              <p className="text-slate-600 mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                className="block w-full h-12 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors text-center"
              >
                <span className="text-base font-bold text-white">Request new link</span>
              </Link>
            </div>

          ) : isSuccess ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">Password reset successful</h2>
              <p className="text-slate-600 mb-6">
                Your password has been updated. You can now log in with your new password.
              </p>
              <button
                className="w-full h-12 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors"
                onClick={() => navigate("/login")}
              >
                <span className="text-base font-bold text-white">Go to login</span>
              </button>
            </div>

          ) : (
            <form onSubmit={handleReset} className="w-full">
              {/* New password */}
              <div className="mb-4">
                <label className="mb-2 ml-1 text-sm font-semibold text-slate-700 block">
                  New Password
                </label>
                <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
                  <Lock size={20} className="text-slate-400 shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="ml-3 flex-1 text-base text-slate-900 bg-transparent outline-none"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setLocalError(null); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="ml-2 hover:opacity-80 transition-opacity focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} className="text-slate-400" /> : <Eye size={18} className="text-slate-400" />}
                  </button>
                </div>
                {password && (
                  <p className={`mt-1 ml-1 text-xs ${password.length >= 8 ? "text-green-600" : "text-slate-400"}`}>
                    {password.length >= 8 ? "✓ Strong enough" : `${8 - password.length} more characters needed`}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className="mb-6">
                <label className="mb-2 ml-1 text-sm font-semibold text-slate-700 block">
                  Confirm Password
                </label>
                <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
                  <Lock size={20} className="text-slate-400 shrink-0" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="ml-3 flex-1 text-base text-slate-900 bg-transparent outline-none"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setLocalError(null); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="ml-2 hover:opacity-80 transition-opacity focus:outline-none"
                  >
                    {showConfirm ? <EyeOff size={18} className="text-slate-400" /> : <Eye size={18} className="text-slate-400" />}
                  </button>
                </div>
                {confirmPassword && password && (
                  <p className={`mt-1 ml-1 text-xs ${confirmPassword === password ? "text-green-600" : "text-red-500"}`}>
                    {confirmPassword === password ? "✓ Passwords match" : "Passwords do not match"}
                  </p>
                )}
              </div>

              {localError && (
                <p className="mb-4 px-1 text-sm text-red-600">{localError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full h-14 flex items-center justify-center rounded-xl shadow-sm transition-colors ${
                  isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                <span className="text-lg font-bold text-white">
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </span>
              </button>

              <p className="mt-6 text-center text-sm text-slate-500">
                Link expired?{" "}
                <Link to="/forgot-password" className="font-semibold text-blue-600 hover:opacity-80">
                  Request a new one
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
