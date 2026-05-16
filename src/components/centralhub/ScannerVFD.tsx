import React, { useState } from 'react';
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

const GROUPS = [
  { id: 'ems', label: 'EMS', color: 'bg-emerald-500' },
  { id: 'schp', label: 'SCHP', color: 'bg-blue-500' },
  { id: 'law', label: 'LAW', color: 'bg-indigo-500' },
  { id: 'gov', label: 'GOV', color: 'bg-slate-500' },
  { id: 'mil', label: 'MIL', color: 'bg-rose-500' },
  { id: 'dmh', label: 'DMH', color: 'bg-amber-500' },
  { id: 'fire', label: 'FIRE', color: 'bg-orange-500' }
];

export function ScannerVFD() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeGroup, setActiveGroup] = useState('ems');
  const [volume, setVolume] = useState(70);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(true);

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
            
            {/* Real Audio Embed if playing */}
            {isPlaying && (
              <div className="absolute inset-0 z-0 opacity-0 pointer-events-none">
                <iframe 
                  src="https://scanner.sndjy.us/" 
                  className="w-full h-full"
                  allow="autoplay"
                />
              </div>
            )}

            {/* Matrix Text Area */}
            <div className="overflow-hidden relative z-10 w-full flex flex-col items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeGroup}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="text-7xl font-black tracking-[8px] vfd-text font-mono vfd-glow-anim uppercase">
                    {GROUPS.find(g => g.id === activeGroup)?.label}
                  </div>
                  <div className="text-xl vfd-text opacity-40 font-mono tracking-[4px]">
                    CH.02 :: ACTIVE
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
                      isPlaying && i <= (volume / 8) ? "bg-[#00ffd0] shadow-[0_0_8px_#00ffd0]" : "bg-black/40"
                    )} 
                   />
                 ))}
               </div>
               <div className="text-[9px] font-black vfd-text opacity-30 uppercase tracking-[0.3em]">
                  SCANNER_UPLINK :: SNDJY.US
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
                  {isPlaying ? 'SYSTEM_UPLINK: ACTIVE' : 'TOGGLE_SYSTEM: START'}
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
                   animate={{ width: `${volume}%` }}
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

      {/* Expanded Group Selector */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3 mt-2">
              {GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex flex-col items-center gap-2",
                    activeGroup === group.id
                      ? "bg-white/10 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10"
                      : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300"
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", activeGroup === group.id ? group.color : "bg-slate-800")} />
                  {group.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
