import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Users, Activity, Send, ArrowLeft, CheckSquare, Square } from "lucide-react";

import { useAuthStore } from "@/modules/auth/useAuthStore";
import * as AdminApi from "@/modules/admin/admin.api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);

  const [stats, setStats] = useState<AdminApi.AdminStats | null>(null);
  const [users, setUsers] = useState<AdminApi.AdminUser[]>([]);
  
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"email" | "in-app" | "both">("both");
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.role !== "ADMIN" || !token) return;

    AdminApi.getStats(token).then(setStats).catch(console.error);
    AdminApi.getUsers(token).then(setUsers).catch(console.error);
  }, [user, token]);

  if (user?.role !== "ADMIN") {
    return <Navigate to="/chat" replace />;
  }

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSending(true);
    try {
      const userIds = selectedUserIds.size > 0 ? Array.from(selectedUserIds) : undefined;
      await AdminApi.notifyUsers(token, { subject, message, target, userIds });
      
      const targetCount = userIds ? userIds.length : users.length;
      const targetNames = userIds 
        ? users.filter(u => userIds.includes(u.id)).map(u => u.fullName).join(", ")
        : "All Users";
      
      setSuccessMsg(`Successfully notified ${targetCount} user(s): ${targetNames}`);
      setSubject("");
      setMessage("");
      setSelectedUserIds(new Set()); // Reset selection after send
    } catch (error) {
      console.error(error);
      alert("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const selectAllUsers = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950 p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Admin Dashboard</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Manage users and send announcements.</p>
          </div>
          <button
            onClick={() => navigate("/chat")}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm font-medium"
          >
            <ArrowLeft size={18} />
            Back to App
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-xl mr-5">
              <Users size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Users</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.totalUsers ?? "..."}</h2>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 rounded-xl mr-5">
              <Activity size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Online Now</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.onlineUsers ?? "..."}</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Notify Form */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Send size={20} className="text-blue-600" /> Send Notification
            </h2>
            <form onSubmit={handleNotify} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Update: New Feature!"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Message</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 min-h-[120px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Type your announcement here..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Send Via</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition bg-white dark:bg-slate-900">
                    <input type="radio" checked={target === "both"} onChange={() => setTarget("both")} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Both (Email & In-App)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition bg-white dark:bg-slate-900">
                    <input type="radio" checked={target === "email"} onChange={() => setTarget("email")} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Only</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition bg-white dark:bg-slate-900">
                    <input type="radio" checked={target === "in-app"} onChange={() => setTarget("in-app")} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">In-App Only</span>
                  </label>
                </div>
              </div>
              
              {successMsg && <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl border border-emerald-100 dark:border-emerald-800">{successMsg}</div>}

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Sending..." : "Blast Notification"}
              </button>
            </form>
          </div>

          {/* Users Table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Registered Users ({users.length})</h2>
              <button
                onClick={selectAllUsers}
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                {selectedUserIds.size === users.length && users.length > 0 ? (
                  <><CheckSquare size={18} /> Deselect All</>
                ) : (
                  <><Square size={18} /> Select All ({selectedUserIds.size} selected)</>
                )}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-10"></th>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Joined</th>
                    <th className="px-6 py-4 font-semibold">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {users.map((u) => {
                    const lastActive = new Date(u.lastActiveAt);
                    const isOnline = Date.now() - lastActive.getTime() < 15 * 60 * 1000;
                    const isSelected = selectedUserIds.has(u.id);
                    
                    return (
                      <tr 
                        key={u.id} 
                        onClick={() => toggleUserSelection(u.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="text-slate-400 hover:text-blue-600 transition">
                            {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{u.fullName}</div>
                          <div className="text-slate-500 dark:text-slate-400">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400' : u.role === 'LECTURER' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap dark:text-slate-300">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            {isOnline ? 'Online' : lastActive.toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading users...</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
