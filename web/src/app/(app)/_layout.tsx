import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/modules/auth/useAuthStore';
import { useChatStore } from '@/modules/chat/useChatStore';
import { useDocumentStore } from '@/modules/documents/useDocumentStore';
import { SplashScreen } from '@/components/SplashScreen';

export default function AppLayout() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const bootstrapSession = useAuthStore((state) => state.bootstrapSession);
  
  const resetChat = useChatStore((state) => state.reset);
  const resetDocuments = useDocumentStore((state) => state.resetSession);
  const location = useLocation();

  useEffect(() => {
    if (hydrated && !bootstrapped) {
      bootstrapSession();
    }
  }, [hydrated, bootstrapped, bootstrapSession]);

  // Inactivity Auto-Logout (2 hours)
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.accessToken);
  useEffect(() => {
    if (!isAuthenticated) return;

    const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000;
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
      }, INACTIVITY_LIMIT);
    };

    resetTimer();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, logout]);

  // Heartbeat: update lastActiveAt every 5 minutes so the admin "online" counter is accurate
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const ping = () => {
      fetch('/api/v1/users/me/heartbeat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => { /* silent fail */ });
    };

    ping(); // ping immediately on mount
    const intervalId = setInterval(ping, 5 * 60 * 1000); // every 5 minutes

    return () => clearInterval(intervalId);
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated) {
      resetChat();
      resetDocuments();
    }
  }, [isAuthenticated, resetChat, resetDocuments]);

  if (!hydrated || !bootstrapped) {
    return <SplashScreen />; 
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
