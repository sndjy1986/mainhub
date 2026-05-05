import React from 'react';

export default function TimeClockPage() {
  const url = "https://scheduling.esosuite.net/eps/main/TimeClock.ashx?db=priorityambulance";

  return (
    <div className="w-full h-full bg-[#0f172a] flex flex-col">
      <div className="p-4 bg-slate-900 border-b border-white/5 flex justify-between items-center shrink-0">
        <h2 className="text-white font-black uppercase tracking-widest text-xs">ESO Time Clock</h2>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-indigo-500/20"
        >
          Open in New Tab
        </a>
      </div>
      <div className="flex-1 relative">
        <iframe 
          src={url}
          className="w-full h-full border-0"
          title="Time Clock"
          allow="payment; geolocation; microphone; camera; display-capture; autoplay; clipboard-read; clipboard-write"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
          <p className="text-white/40 text-xs font-mono uppercase">External Frame Security Active</p>
          <p className="text-white/20 text-[10px] font-mono mt-1 italic">Use button above if clock does not appear</p>
        </div>
      </div>
    </div>
  );
}
