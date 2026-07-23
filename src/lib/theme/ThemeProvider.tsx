'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_IMMORTAL_THEME,
  isImmortalTheme,
  THEME_STORAGE_KEY,
  type ImmortalTheme,
} from './theme';

type ThemeContextValue = {
  theme: ImmortalTheme;
  setTheme: (theme: ImmortalTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ImmortalTheme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = 'dark';
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] =
    useState<ImmortalTheme>(DEFAULT_IMMORTAL_THEME);

  useEffect(() => {
    let cancelled = false;
    let next = DEFAULT_IMMORTAL_THEME;

    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      next = isImmortalTheme(stored)
        ? stored
        : DEFAULT_IMMORTAL_THEME;
    } catch {
      // localStorage có thể bị chặn; dùng theme mặc định.
    }

    applyTheme(next);

    // Hoãn cập nhật state sang microtask để không gọi setState đồng bộ
    // trực tiếp trong effect theo rule React 19.
    queueMicrotask(() => {
      if (!cancelled) {
        setThemeState(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((next: ImmortalTheme) => {
    setThemeState(next);
    applyTheme(next);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Vẫn áp dụng được theme trong phiên hiện tại.
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useImmortalTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useImmortalTheme must be used inside ThemeProvider');
  }

  return context;
}
