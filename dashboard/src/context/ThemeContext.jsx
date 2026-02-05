/**
 * ThemeContext - Dark mode support with system preference detection
 * Usage: const { isDark, toggleTheme } = useTheme();
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Initialize from localStorage or system preference
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      // Then check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sync with document and localStorage
  useEffect(() => {
    // Save preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Apply to document
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e) => {
      // Only auto-switch if user hasn't manually set preference
      const manualPreference = localStorage.getItem('theme-manual');
      if (!manualPreference) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Toggle theme (marks as manual preference)
  const toggleTheme = useCallback(() => {
    localStorage.setItem('theme-manual', 'true');
    setIsDark((prev) => !prev);
  }, []);

  // Set specific theme
  const setTheme = useCallback((theme) => {
    localStorage.setItem('theme-manual', 'true');
    setIsDark(theme === 'dark');
  }, []);

  // Reset to system preference
  const resetToSystem = useCallback(() => {
    localStorage.removeItem('theme-manual');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(systemPrefersDark);
  }, []);

  const value = {
    isDark,
    toggleTheme,
    setTheme,
    resetToSystem,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
