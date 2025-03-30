import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [query]);

  useEffect(() => {
    chrome.storage?.local.get(['searchQuery'], (result) => {
      if (result.searchQuery) {
        setQuery(result.searchQuery);
      }
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setQuery(value);
    chrome.storage?.local.set({ searchQuery: value });
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Searching for:', query);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-4">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white">PlaceHolder</h1>
      <form onSubmit={handleSearch} className="flex flex-col space-y-4 flex-grow">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={handleChange}
          placeholder="Type your query here..."
          className="w-full overflow-hidden p-4 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
