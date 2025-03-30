import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <div className="w-[500px] h-[350px] bg-white dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden">
      <nav className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="space-x-4">
          <a href="index.html" className="font-medium hover:text-blue-500">Home</a>
          <a href="whitelist.html" className="font-medium hover:text-blue-500">Whitelist</a>
        </div>
        <button
          onClick={toggleDarkMode}
          className="text-sm px-3 py-1 border rounded-md text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </nav>
      <main className="p-4">
        <Component {...pageProps} />
      </main>
    </div>
  );
}