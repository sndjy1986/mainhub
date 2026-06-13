import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Square, 
  Volume2, 
  Radio, 
  ChevronDown, 
  ChevronUp, 
  Wifi, 
  Activity,
  Layers,
  Search,
  Maximize2
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Talkgroup {
  id: number;
  alpha: string;
  description: string;
  tag: string;
}

interface System {
  id: number;
  label: string;
  talkgroups?: Talkgroup[];
}

interface Call {
  id: number;
  system: number;
  talkgroup: number;
  freq?: number;
  length?: number;
}

export function ScannerVFD() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [wsStatus, setWsStatus] = useState<'DISCONNECTED' | 'CONNECTED'>('DISCONNECTED');
  const [config, setConfig] = useState<{ systems: System[] } | null>(null);
  const [activeCall, setActiveCall] = useState<{ call: Call, url: string, tg: Talkgroup | null, sys: System | null } | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('SYS');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setWsStatus('DISCONNECTED');
      setActiveCall(null);
      return;
    }

    const connectWS = () => {
      const ws = new WebSocket('wss://scanner.sndjy.us/');
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('CONNECTED');
        ws.send(JSON.stringify(["VER"]));
        ws.send(JSON.stringify(["CFG"]));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            if (data[0] === 'CFG' && data[1]) {
              setConfig(data[1]);
            } else if (data[0] === 'CAL' && data[1]) {
               const callStr = data[1];
               handleNewCall(callStr);
            }
          }
        } catch (e) {
          console.warn("WS Parse Error", e);
        }
      };

      ws.onclose = () => {
        setWsStatus('DISCONNECTED');
        if (isPlaying) {
           setTimeout(connectWS, 3000); // Reconnect loop
        }
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isPlaying]);

  const handleNewCall = (call: Call) => {
    // Attempt to lookup
    let sysData: System | null = null;
    let tgData: Talkgroup | null = null;

    setConfig(prevConfig => {
      if (prevConfig?.systems) {
         sysData = prevConfig.systems.find((s) => s.id === call.system) || null;
         if (sysData?.talkgroups) {
           tgData = sysData.talkgroups.find((t) => t.id === call.talkgroup) || null;
         }
      }
      return prevConfig;
    });

    const audioUrl = `https://scanner.sndjy.us/audio/${call.id}.m4a`;
    setActiveCall({ call, url: audioUrl, sys: sysData, tg: tgData });

    if (tgData?.alpha) setActiveGroup(tgData.alpha.substring(0, 5));

    // Play Audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    audio.volume = volume / 100;
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
        
        <div className="relative bg-[#0a0a0c] border border-white/5 rounded-[2rem] p-8 shadow-2xl overflow-hidden">
          {/* Subtle grid pattern for extra "tech" feel */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

          {/* VFD Display Surface */}
          <div className="relative z-10 vfd-panel rounded-lg p-10 min-h-[220px] flex flex-col justify-center items-center">
            {/* VFD Scanline Overlay */}
            <div className="vfd-overlay" />

            {/* Matrix Text Area */}
            <div className="overflow-hidden relative z-10 w-full flex flex-col items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCall ? activeCall.call.id : 'idle'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <div className="text-5xl md:text-7xl font-black tracking-[4px] md:tracking-[8px] vfd-text font-mono uppercase" style={{ textShadow: activeCall ? '0 0 20px #00ffd0, 0 0 40px #00ffd0' : 'none' }}>
                    {activeCall && activeCall.tg ? activeCall.tg.alpha : activeCall ? `SYS:${activeCall.sys?.label || activeCall.call.system}` : activeGroup}
                  </div>
                  <div className="text-lg md:text-xl vfd-text opacity-50 font-mono tracking-[4px] uppercase mt-2">
                    {activeCall ? (
                       <span>TG:{activeCall.call.talkgroup} {activeCall.tg?.tag ? `:: ${activeCall.tg.tag}` : ''}</span>
                    ) : (
                       <span>STANDBY :: SCANNING</span>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Status Indicators - VFD Style */}
            <div className="absolute bottom-4 left-10 right-10 flex items-center justify-between z-10">
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
               <div className="text-[9px] font-black vfd-text opacity-40 uppercase tracking-[0.3em]">
                  SCANNER_UPLINK :: {wsStatus}
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
                    ? "bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/40" 
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
            <div className="flex-1 flex items-center gap-4 px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl">
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
                 <div>Systems Parsed: <span className="text-white">{config?.systems?.length || 0}</span></div>
                 {activeCall && (
                    <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
                      <div className="text-white">Active Intercept Data:</div>
                      <div>ID: {activeCall.call.id}</div>
                      <div>SYS: {activeCall.call.system} / {activeCall.sys?.label || "Unknown"}</div>
                      <div>TG: {activeCall.call.talkgroup} / {activeCall.tg?.alpha || "Generic"}</div>
                      <div>TAG: {activeCall.tg?.tag || "N/A"}</div>
                    </div>
                 )}
                 {!activeCall && <div className="mt-4 opacity-50 italic">Awaiting transmission packets...</div>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
