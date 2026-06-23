import React, { useState } from 'react';
import { Search } from 'lucide-react';

export function GoogleSearchWidget() {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query.trim())}`, '_blank');
      setQuery('');
    }
  };

  return (
    <div className="h-full flex flex-col justify-center items-center p-8 bg-black/20">
      <div className="w-full max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3 text-slate-500 justify-center mb-6">
          <Search className="w-5 h-5 text-indigo-500" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em]">Global Database Query</h2>
        </div>
        
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ENTER SEARCH QUERY..."
            className="w-full bg-black/40 border-2 border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-black/60 transition-all"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <button
              type="submit"
              disabled={!query.trim()}
              className="p-2 bg-indigo-500 text-white rounded-lg opacity-0 group-focus-within:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform translate-x-2 group-focus-within:translate-x-0"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
