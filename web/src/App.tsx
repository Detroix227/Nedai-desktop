import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import IntroScreen from './app/(auth)/intro';
import LoginScreen from './app/(auth)/login';
import SignupScreen from './app/(auth)/signup';
import ForgotPasswordScreen from './app/(auth)/forgot-password';
import ResetPasswordScreen from './app/(auth)/reset-password';
import AppLayout from './app/(app)/_layout';
import HomeScreen from './app/(app)/index';
import KnowledgeVaultScreen from './app/(app)/knowledge-vault';
import TimetableScreen from './app/(app)/timetable';
import ProfileScreen from './app/(app)/profile';
import SettingsScreen from './app/(app)/settings';
import AdminDashboard from './app/(app)/admin';
import ChangePasswordScreen from './app/(app)/change-password';
import NotificationsScreen from './app/(app)/notifications';
import LocalVaultScreen from './app/(app)/local-vault';
import { useAuthStore } from './modules/auth/useAuthStore';
import './index.css';

function App() {
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  useEffect(() => {
    // Listen for auth tokens from the desktop shell (Deep Linking)
    if (window.electronAPI && window.electronAPI.onAuthToken) {
      window.electronAPI.onAuthToken((token: string) => {
        console.log('[DeepLink] Received token from shell');
        refreshProfile(token);
      });
    }
  }, [refreshProfile]);

  return (
    <HashRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<IntroScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        
        {/* Protected App Routes */}
        <Route element={<AppLayout />}>
          <Route path="/chat" element={<HomeScreen />} />
          <Route path="/knowledge-vault" element={<KnowledgeVaultScreen />} />
          <Route path="/timetable" element={<TimetableScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/change-password" element={<ChangePasswordScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="/local-vault" element={<LocalVaultScreen />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Catch-all: any unknown path → /intro */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
