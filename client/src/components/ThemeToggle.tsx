import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg
                 bg-gray-200 dark:bg-gray-700
                 hover:bg-gray-300 dark:hover:bg-gray-600
                 transition-colors duration-200
                 focus:outline-none focus:ring-2 focus:ring-offset-2
                 focus:ring-indigo-500 dark:focus:ring-indigo-400"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <MoonIcon className="h-5 w-5 text-gray-700" />
      ) : (
        <SunIcon className="h-5 w-5 text-yellow-400" />
      )}
    </button>
  );
}
