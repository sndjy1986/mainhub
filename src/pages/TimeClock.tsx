import React, { useState } from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';

export default function TimeClockPage() {
  const url = "https://scheduling.esosuite.net/eps/main/TimeClock.ashx?db=priorityambulance";
  const [iframeError, setIframeError] = useState(false);

  return (
    <div className="w-full h-full bg-bg-main flex flex-col transition-colors duration-500">
      <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0">
        <h2 className="text-white font-black uppercase tracking-widest text-xs">ESO Time Clock</h2>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
        </div>
        
        <h2 className="text-2xl font-black text-white tracking-tight mb-4">External Portal Required</h2>
        
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-10 leading-relaxed">
          Due to strict organizational security policies (X-Frame-Options), the ESO Time Clock platform blocks embedding inside third-party dashboards. You must access it directly.
        </p>
        
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95 flex items-center gap-3"
        >
          <ExternalLink className="w-5 h-5" /> Launch Secure Time Clock
        </a>
      </div>
    </div>
  );
}
