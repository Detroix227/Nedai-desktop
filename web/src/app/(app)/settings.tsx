import { LogOut, User, Key, Bell, Shield, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useAuthStore } from "@/modules/auth/useAuthStore";
import { useUIStore } from "@/modules/ui/useUIStore";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SettingItem({
  icon: Icon,
  title,
  description,
  onClick,
  danger = false,
}: {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full mb-3 rounded-2xl border ${
        danger 
          ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40" 
          : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800"
      } px-4 py-4 text-left transition-colors`}
    >
      <div className="flex items-center">
        <Icon size={20} className={`${danger ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"} mr-3`} />
        <div>
          <h4 className={`text-base font-semibold ${danger ? "text-rose-700 dark:text-rose-300" : "text-slate-800 dark:text-slate-200"}`}>
            {title}
          </h4>
          <p className={`mt-1 text-sm leading-5 ${danger ? "text-rose-600 dark:text-rose-400/80" : "text-slate-500 dark:text-slate-400"}`}>
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
  }

  function handleProfileSettings() {
    navigate("/profile");
  }

  function handleChangePassword() {
    navigate("/change-password");
  }

  function handleNotifications() {
    navigate("/notifications");
  }

  return (
    <AppShell
      title="Settings"
    >
      <div className="flex flex-col w-full max-w-6xl mx-auto p-6">
        {/* Account Settings */}
        <Section title="Account">
          <SettingItem
            icon={User}
            title="Profile Settings"
            description="Manage your personal information and academic profile"
            onClick={handleProfileSettings}
          />
          <SettingItem
            icon={Key}
            title="Change Password"
            description="Update your password without leaving your account settings"
            onClick={handleChangePassword}
          />
        </Section>

        {/* Application Settings */}
        <Section title="Application">
          <SettingItem
            icon={Bell}
            title="Notifications"
            description="View your notifications from admin"
            onClick={handleNotifications}
          />
          <SettingItem
            icon={theme === 'dark' ? Sun : Moon}
            title={theme === 'dark' ? "Light Mode" : "Dark Mode"}
            description="Toggle between dark and light mode"
            onClick={toggleTheme}
          />
          <SettingItem
            icon={Shield}
            title="Privacy & Security"
            description="Manage your privacy settings and security preferences"
            onClick={() => {
              // TODO: Implement privacy settings
              alert("Privacy settings coming soon!");
            }}
          />
        </Section>


        <Section title="Account Actions">
          <SettingItem
            icon={LogOut}
            title="Log Out"
            description="Sign out of your account and return to login"
            onClick={handleLogout}
          />
        </Section>

      </div>
    </AppShell>
  );
}
