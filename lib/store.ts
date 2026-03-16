import { create } from "zustand";

export interface User {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  whatsappNumber?: string;
  profileImage?: string;
  isAdmin?: boolean;
  preferences: {
    theme: "light" | "dark";
    reminderTime: string;
    reminderType?: "daily" | "weekly" | "both";
    whatsappReminders: boolean;
  };
  stats: {
    totalHabits: number;
    totalCompletions: number;
    currentStreak: number;
    longestStreak: number;
  };
}

export interface Habit {
  _id: string;
  userId: string;
  name: string;
  description: string;
  category: string;
  color: string;
  frequency: string;
  target: {
    value: number;
    unit: string;
  };
  reminder: {
    enabled: boolean;
    time: string;
  };
  isActive: boolean;
  stats: {
    currentStreak: number;
    longestStreak: number;
    totalCompletions: number;
    completionRate: number;
  };
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  _hydrated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => {
  const storedToken =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (typeof window !== "undefined") {
    setTimeout(() => set({ _hydrated: true }), 0);
  }

  return {
    user: null,
    token: storedToken,
    loading: false,
    _hydrated: false,

    setUser: (user) => set({ user }),

    setToken: (token) => {
      set({ token });
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    },

    setLoading: (loading) => set({ loading }),

    login: (token: string, user: User) => {
      set({ token, user });
      localStorage.setItem("token", token);
    },

    logout: () => {
      set({ user: null, token: null });
      localStorage.removeItem("token");
    },
  };
});

interface HabitStore {
  habits: Habit[];
  selectedHabit: Habit | null;
  loading: boolean;
  setHabits: (habits: Habit[]) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (habit: Habit) => void;
  removeHabit: (habitId: string) => void;
  setSelectedHabit: (habit: Habit | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useHabitStore = create<HabitStore>((set) => ({
  habits: [],
  selectedHabit: null,
  loading: false,
  setHabits: (habits) => set({ habits }),
  addHabit: (habit) => set((state) => ({ habits: [...state.habits, habit] })),
  updateHabit: (habit) =>
    set((state) => ({
      habits: state.habits.map((h) => (h._id === habit._id ? habit : h)),
      selectedHabit:
        state.selectedHabit?._id === habit._id ? habit : state.selectedHabit,
    })),
  removeHabit: (habitId) =>
    set((state) => ({
      habits: state.habits.filter((h) => h._id !== habitId),
      selectedHabit:
        state.selectedHabit?._id === habitId ? null : state.selectedHabit,
    })),
  setSelectedHabit: (habit) => set({ selectedHabit: habit }),
  setLoading: (loading) => set({ loading }),
}));

interface UIStore {
  sidebarOpen: boolean;
  darkMode: boolean;
  setSidebarOpen: (open: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
}

function getInitialSidebarState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem('sidebar_open');
    if (saved === 'true' && window.innerWidth >= 768) return true;
  } catch {}
  return false;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: getInitialSidebarState(),
  darkMode: true,

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
    try { localStorage.setItem('sidebar_open', String(open)); } catch {}
  },

  setDarkMode: (dark) => set({ darkMode: dark }),

  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarOpen;
      try { localStorage.setItem('sidebar_open', String(next)); } catch {}
      return { sidebarOpen: next };
    }),

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));

interface AnalyticsStore {
  completionRate: number;
  totalHabits: number;
  recentCompletions: number;
  milestonesReached: number;
  setStats: (stats: {
    completionRate: number;
    totalHabits: number;
    recentCompletions: number;
    milestonesReached: number;
  }) => void;
}

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  completionRate: 0,
  totalHabits: 0,
  recentCompletions: 0,
  milestonesReached: 0,
  setStats: (stats) => set(stats),
}));
