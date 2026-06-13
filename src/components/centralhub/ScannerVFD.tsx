import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Square, 
  Volume2, 
  Activity,
  Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface RadioCall {
  id: number;
  dateTime: string;
  groupId: number;
  groupLabel: string;
  label: string;
  name: string;
  talkgroup: number;
}

const VFDLine = ({ text = "", length, sizeClass = "text-3xl md:text-5xl lg:text-6xl" }: { text?: string, length: number, sizeClass?: string }) => {
  const safeText = typeof text === 'string' ? text : String(text || "");
  let s = safeText.substring(0, length).toUpperCase();
  const padLeft = Math.floor((length - s.length) / 2);
  const padRight = length - s.length - padLeft;
  const chars = (' '.repeat(padLeft) + s + ' '.repeat(padRight)).split('');

  return (
    <div className="flex gap-[2px] md:gap-1 justify-center w-full max-w-full overflow-hidden">
      {chars.map((char, i) => {
        const isSpace = char === ' ';
        return (
          <div key={i} className={cn(
            "relative flex items-center justify-center bg-[#020a0c] rounded-[2px] md:rounded-md border border-[#00ffd0]/10 px-1 md:px-2 py-1 md:py-2 font-mono leading-none shadow-inner", 
            sizeClass
          )}>
            {/* Unlit Segment */}
            <span className="absolute inset-0 flex items-center justify-center text-[#00ffd0] opacity-[0.25] select-none font-bold">8</span>
            
            {/* Lit Segment */}
            <span 
              className={cn(
                "relative z-10 transition-all duration-75 font-bold", 
                isSpace ? 'opacity-0 text-transparent' : 'opacity-100 text-[#00ffd0] drop-shadow-[0_0_8px_rgba(0,255,208,0.8)]'
              )} 
            >
                {isSpace ? '8' : char}
            </span>
          </div>
        );
      })}
    </div>
  )
}

export function ScannerVFD() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [status, setStatus] = useState<'STANDBY' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('STANDBY');
  const [activeCall, setActiveCall] = useState<RadioCall | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const lastPlayedIdRef = useRef<number>(0);
  const pollIntervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setStatus('STANDBY');
      setActiveCall(null);
      return;
    }

    setStatus('CONNECTING');
    
    // Initial fetch to get the current latest ID so we don't play the past calls wildly
    fetch('/api/scanner/latest')
      .then(res => {
         if (!res.ok) throw new Error(`HTTP ${res.status}`);
         return res.json();
      })
      .then((data: RadioCall[]) => {
         setStatus('CONNECTED');
         setErrorMsg('');
         if (data && data.length > 0) {
            lastPlayedIdRef.current = data[0].id;
            setActiveCall(data[0]); // Just display the latest call immediately
         }
      })
      .catch(e => {
         console.warn("API init error:", e);
         setStatus('ERROR');
         setErrorMsg(e instanceof Error ? e.message : String(e));
      });

    const poll = async () => {
      try {
        const res = await fetch('/api/scanner/latest');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: RadioCall[] = await res.json();
        
        setErrorMsg('');
        if (data && data.length > 0) {
          const latest = data[0];
          
          if (latest.id > lastPlayedIdRef.current) {
             lastPlayedIdRef.current = latest.id;
             handleNewCall(latest);
          }
        }
      } catch (err) {
        console.warn("Polling error:", err);
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    };

    pollIntervalRef.current = window.setInterval(poll, 3000);

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const handleNewCall = (call: RadioCall) => {
    setActiveCall(call);

    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // We construct the audio endpoint to the scanner URL
    const audioUrl = `https://scanner.sndjy.us/audio/${call.id}.m4a`;
    const audio = new Audio(audioUrl);
    audio.volume = volume / 100;
    
    // Listen for ended so we can clear active UI if desired, but retaining it looks cooler
    audio.play().catch(e => console.warn("Audio play blocked", e));
    audioRef.current = audio;
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  return (
    <div className="flex flex-col gap-4">
      {/* VFD Container */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative bg-[#0a0a0c] border border-white/5 rounded-[2rem] p-4 md:p-8 shadow-2xl overflow-hidden">
          {/* Subtle grid pattern for extra "tech" feel */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

          {/* VFD Display Surface */}
          <div className="relative z-10 vfd-panel rounded-lg p-6 md:p-10 min-h-[220px] flex flex-col justify-center items-center">
            {/* VFD Scanline Overlay */}
            <div className="vfd-overlay" />

            {/* Matrix Text Area */}
            <div className="relative z-10 w-full flex flex-col items-center gap-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCall ? activeCall.id : 'idle'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 w-full"
                >
                  <VFDLine 
                    text={activeCall ? (activeCall.name || activeCall.label || 'VOICE UPLINK') : 'STANDBY'} 
                    length={16} 
                    sizeClass="text-2xl sm:text-4xl md:text-5xl"
                  />
                  <VFDLine 
                    text={activeCall ? `TG:${activeCall.talkgroup} ${activeCall.groupLabel || ''}` : 'AWAITING UPLINK'} 
                    length={20} 
                    sizeClass="text-lg sm:text-lg md:text-2xl"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Status Indicators - VFD Style */}
            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between z-10">
               <div className="flex items-center gap-1">
                 {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                   <div 
                    key={i} 
                    className={cn(
                      "w-1.5 h-1.5 transition-all duration-300",
                      isPlaying && i <= (volume / 8) ? "bg-[#00ffd0] shadow-[0_0_8px_#00ffd0]" : "bg-black/40",
                      activeCall && isPlaying && i <= (volume / 8) && i % 2 === 0 ? "animate-pulse" : ""
                    )} 
                   />
                 ))}
               </div>
               <div className="text-[9px] font-black text-[#00ffd0] opacity-40 uppercase tracking-[0.3em] font-mono">
                  UPLINK :: {status}
               </div>
            </div>
          </div>

          {/* Tactical Controls */}
          <div className="mt-8 flex items-center justify-between gap-6">
            <div className="flex gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn(
                  "h-14 px-8 rounded-2xl flex items-center gap-4 transition-all duration-500 border shadow-2xl active:scale-95 group",
                  isPlaying 
                    ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]" 
                    : "bg-white/5 border-white/10 text-cyan-400/60 hover:text-cyan-400 hover:border-cyan-400/50"
                )}
              >
                <div className={cn(
                  "w-3 h-3 rounded-full transition-all duration-500",
                  isPlaying ? "bg-black animate-pulse" : "bg-cyan-400/40 group-hover:bg-cyan-400"
                )} />
                <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">
                  {isPlaying ? 'LINK: ACTIVE' : 'ESTABLISH LINK'}
                </span>
                {isPlaying ? <Square size={16} /> : <Play size={16} className="ml-1" />}
              </button>
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 active:scale-95",
                  isExpanded ? "bg-white/10 text-white" : ""
                )}
              >
                <Layers size={20} />
              </button>
            </div>

            {/* Volume Slider - VFD Style */}
            <div className="hidden md:flex flex-1 items-center gap-4 px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl">
               <Volume2 size={16} className="text-slate-600" />
               <div className="relative flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                 <motion.div 
                   className="absolute left-0 top-0 h-full bg-cyan-400/40"
                   animate={{ width: `${Math.max(5, volume)}%` }}
                 />
                 <input 
                   type="range" 
                   min="0" 
                   max="100" 
                   value={volume}
                   onChange={(e) => setVolume(parseInt(e.target.value))}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                 />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Data Parser Diagnostics */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-6 border border-white/10 bg-black/40 rounded-2xl text-[10px] uppercase font-mono text-cyan-500/70 tracking-widest leading-relaxed">
              <div className="mb-2 text-white font-bold flex items-center gap-2 tracking-[0.3em] opacity-50">
                 <Activity size={12} /> Live API Diagnostic Stream
              </div>
              <div className="space-y-1">
                 {errorMsg && <div className="text-red-400 mb-2">ERR: {errorMsg}</div>}
                 {activeCall ? (
                    <div className="mt-4 space-y-1 border-white/10">
                      <div className="text-white">Active Intercept Data:</div>
                      <div>ID: {activeCall.id}</div>
                      <div>SYS_ID: {activeCall.groupId} / {activeCall.groupLabel || "Unknown"}</div>
                      <div>TG: {activeCall.talkgroup}</div>
                      <div>DATE: {activeCall.dateTime}</div>
                      <div>TAG: {activeCall.label || "N/A"} / {activeCall.name || "N/A"}</div>
                    </div>
                 ) : (
                    <div className="mt-4 opacity-50 italic">Awaiting transmission packets...</div>
                 )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

