import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import { changeCurrentPassword } from "@/modules/auth/auth.api";
import { useAuthStore } from "@/modules/auth/useAuthStore";
import { AppShell } from "@/components/AppShell";

function isValidPassword(value: string) {
  return value.length >= 8;
}

export default function ChangePasswordScreen() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword.trim()) {
      setLocalError("Current password is required.");
      return;
    }

    if (!newPassword.trim()) {
      setLocalError("New password is required.");
      return;
    }

    if (!isValidPassword(newPassword)) {
      setLocalError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    if (!token) {
      setLocalError("You must be logged in to change your password.");
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);

    try {
      await changeCurrentPassword(token, {
        oldPassword: currentPassword,
        newPassword: newPassword,
      });
      setIsSuccess(true);
    } catch (error: any) {
      const msg = error?.message || "Failed to change password. Please check your current password and try again.";
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell title="Change Password">
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
        <div className="flex-1 flex flex-col px-6 pb-10 pt-6 max-w-md mx-auto w-full">
          <button
            onClick={() => navigate("/settings")}
            className="mb-8 h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-900 dark:text-slate-100" />
          </button>

          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Change password</h1>
          <p className="mb-10 text-slate-500 dark:text-slate-400">Update your password to keep your account secure.</p>

          {isSuccess ? (
            <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 p-6 shadow-sm">
              <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">Password changed</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your password has been updated successfully.
              </p>
              <button
                className="w-full h-12 flex items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                onClick={() => navigate("/settings")}
              >
                <span className="text-base font-bold text-white">Back to settings</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleChange} className="w-full">
              {/* Current password */}
              <div className="mb-4">
                <label className="mb-2 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                  Current Password
                </label>
                <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4">
                  <Lock size={20} className="text-slate-400 shrink-0" />
                  <input
                    type={showCurrent ? "text" : "password"}
                    placeholder="Enter current password"
                    className="ml-3 flex-1 text-base text-slate-900 dark:text-slate-100 bg-transparent outline-none"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setLocalError(null); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((p) => !p)}
                    className="ml-2 hover:opacity-80 transition-opacity focus:outline-none"
                  >
                    {showCurrent ? <EyeOff size={18} className="text-slate-400" /> : <Eye size={18} className="text-slate-400" />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="mb-4">
                <label className="mb-2 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                  New Password
                </label>
                <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4">
                  <Lock size={20} className="text-slate-400 shrink-0" />
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="Enter new password"
                    className="ml-3 flex-1 text-base text-slate-900 dark:text-slate-100 bg-transparent outline-none"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setLocalError(null); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((p) => !p)}
                    className="ml-2 hover:opacity-80 transition-opacity focus:outline-none"
                  >
                    {showNew ? <EyeOff size={18} className="text-slate-400" /> : <Eye size={18} className="text-slate-400" />}
                  </button>
                </div>
                {newPassword && (
                  <p className={`mt-1 ml-1 text-xs ${newPassword.length >= 8 ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {newPassword.length >= 8 ? "✓ Strong enough" : `${8 - newPassword.length} more characters needed`}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className="mb-6">
                <label className="mb-2 ml-1 text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                  Confirm New Password
                </label>
                <div className="h-14 flex flex-row items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4">
                  <Lock size={20} className="text-slate-400 shrink-0" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="ml-3 flex-1 text-base text-slate-900 dark:text-slate-100 bg-transparent outline-none"
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
                {confirmPassword && newPassword && (
                  <p className={`mt-1 ml-1 text-xs ${confirmPassword === newPassword ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                    {confirmPassword === newPassword ? "✓ Passwords match" : "Passwords do not match"}
                  </p>
                )}
              </div>

              {localError && (
                <p className="mb-4 px-1 text-sm text-red-600 dark:text-red-400">{localError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full h-14 flex items-center justify-center rounded-xl shadow-sm transition-colors ${
                  isSubmitting ? "bg-slate-400 dark:bg-slate-600 cursor-not-allowed" : "bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600"
                }`}
              >
                <span className="text-lg font-bold text-white">
                  {isSubmitting ? "Changing..." : "Change Password"}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
