import { create } from 'zustand';

interface UIState {
  // Sidebar collapse state
  isSidebarCollapsed: boolean;
  currentSection: string;
  theme: 'light' | 'dark';
  
  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentSection: (section: string) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial states
  isSidebarCollapsed: true,
  currentSection: 'chat',
  theme: (typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark') ? 'dark' : 'light',

  // Actions
  toggleSidebar: () => {
    const { isSidebarCollapsed } = get();
    set({ isSidebarCollapsed: !isSidebarCollapsed });
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ isSidebarCollapsed: collapsed });
  },

  setCurrentSection: (section: string) => {
    set({ currentSection: section });
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme: newTheme });
  },
}));
