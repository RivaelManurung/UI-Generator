"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const THEME_KEY = "dashboardcraft_admin_theme";

type AdminThemeContextValue = {
  dark: boolean;
  toggle: () => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue>({
  dark: false,
  toggle: () => {},
});

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

/**
 * AdminThemeProvider owns the admin light/dark preference (persisted in
 * localStorage) and renders a Toaster whose theme follows it. Because sonner
 * portals to <body> (outside .admin-interface), the toast colors are set
 * explicitly here rather than inherited from the admin tokens.
 */
export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(window.localStorage.getItem(THEME_KEY) === "dark");
  }, []);

  const toggle = () =>
    setDark((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {
        /* ignore storage errors */
      }
      return next;
    });

  // Toasts render via the single global <Toaster> in components/providers.tsx.
  return <AdminThemeContext.Provider value={{ dark, toggle }}>{children}</AdminThemeContext.Provider>;
}
