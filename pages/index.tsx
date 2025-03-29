import React, {useState} from 'react';
export default function Home() {
  const [query, setQuery] = useState('');
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Searching for:', query);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Chrome Extension Popup</h1>
        <p>This popup is built with Next.js and styled with Tailwind CSS!</p>
      </div>
    </div>
  );
}
