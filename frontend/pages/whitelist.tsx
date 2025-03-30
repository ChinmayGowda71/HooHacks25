import { useEffect, useState } from 'react';
import { Trash2, Globe } from 'lucide-react'; // optional icons

export default function Whitelist() {
  const [item, setItem] = useState('');
  const [items, setItems] = useState<string[]>([]);

  // Load from chrome.storage.local on mount
  useEffect(() => {
    chrome.storage.local.get(['whitelist'], (result) => {
      if (result.whitelist) {
        setItems(result.whitelist);
      }
    });
  }, []);

  // Save to chrome.storage.local when items change
  useEffect(() => {
    chrome.storage.local.set({ whitelist: items });
  }, [items]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addItem(item);
    setItem('');
  };

  const addItem = (newItem: string) => {
    const trimmed = newItem.trim();
    if (!trimmed || items.includes(trimmed)) return;
    setItems((prev) => [...prev, trimmed]);
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCurrentTab = () => {
    chrome.tabs?.query({ active: true, currentWindow: true }, async (tabs) => {
      const url = tabs[0]?.url;
      if (url) {
        try {
          const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
          addItem(tab.url);
        } catch (err) {
          console.error('Invalid URL:', url);
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Whitelist</h1>

      <form onSubmit={handleAdd} className="flex space-x-2">
        <input
          type="text"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="Add to whitelist..."
          className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 transition"
        >
          Add
        </button>
        <button
          type="button"
          onClick={handleAddCurrentTab}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-500 transition"
        >
          Add Current Tab
        </button>
      </form>

      <ul className="list-disc list-inside text-gray-700 dark:text-gray-200 space-y-1">
        {items.map((entry, idx) => (
          <li key={idx} className="flex justify-between items-center">
            <span className="truncate">{entry}</span>
            <button
              onClick={() => handleRemove(idx)}
              className="ml-4 text-red-500 hover:text-red-700 dark:hover:text-red-400"
              aria-label="Remove item"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
