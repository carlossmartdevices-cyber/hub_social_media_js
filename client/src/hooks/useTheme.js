import { useEffect, useState } from 'react';
/**
 * Custom hook to manage dark/light theme with localStorage persistence
 */
export function useTheme() {
    const [theme, setTheme] = useState(() => {
        // Check localStorage first
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });
    useEffect(() => {
        const root = window.document.documentElement;
        // Remove both classes
        root.classList.remove('light', 'dark');
        // Add current theme class
        root.classList.add(theme);
        // Save to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);
    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };
    const setLightTheme = () => setTheme('light');
    const setDarkTheme = () => setTheme('dark');
    return {
        theme,
        toggleTheme,
        setLightTheme,
        setDarkTheme,
        isDark: theme === 'dark',
    };
}
