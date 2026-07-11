"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@supabase/supabase-js";

interface ThemeStore {
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "hertz-theme" }
  )
);

interface ViewStore {
  homeView: "list" | "kanban";
  setHomeView: (view: "list" | "kanban") => void;
  homeStatusFilter: string;
  setHomeStatusFilter: (filter: string) => void;
}

export const useViewStore = create<ViewStore>()(
  persist(
    (set) => ({
      homeView: "list",
      setHomeView: (homeView) => set({ homeView }),
      homeStatusFilter: "all",
      setHomeStatusFilter: (homeStatusFilter) => set({ homeStatusFilter }),
    }),
    { name: "hertz-view" }
  )
);

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
