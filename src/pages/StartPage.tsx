import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, UserCheck, Shield, Activity, Terminal, Map as MapIcon, Camera, FileText, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WeatherDashboard } from '../components/WeatherDashboard';
import { useTerminal } from '../context/TerminalContext';

export function StartPage() {
  const { systemAdvisory } = useTerminal();
  const [shift, setShift] = useState(() => localStorage.getItem('selectedShift') || 'A');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    localStorage.setItem('selectedShift', shift);
  }, [shift]);

  const shifts = ['A', 'B', 'C', 'D'];

  const quickLinks = [
    { icon: Activity, label: 'Tone Test', path: '/tone-test', color: 'indigo', domain: 'tonetest.sndjy.us', desc: 'Audio signal verification and hardware diagnostics.' },
    { icon: Terminal, label: 'Unit Posting', path: '/unit-posting', color: 'emerald', domain: 'console.sndjy.us', desc: 'Real-time resource allocation and unit management.' },
    { icon: MapIcon, label: 'Distance Map', path: '/distance-map', color: 'amber', domain: 'work.sndjy.us/map', desc: 'Geographic visualization and route optimization.' },
    { icon: Camera, label: 'Cameras', path: '/cameras', color: 'rose', domain: 'dotcamera.sndjy.us', desc: 'Live visual surveillance and perimeter monitoring.' },
    { icon: FileText, label: 'Shift Report', path: '/shift-report', color: 'cyan', domain: 'report.sndjy.us', desc: 'Incident documentation and shift hand-off records.' },
  ];

  return (
    <div className="container mx-auto p-10 max-w-7xl space-y-12 py-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-bold text-white tracking-tight">Operations Console</h1>
          <p className="text-slate-400 mt-2 uppercase tracking-[0.2em] text-xs font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Active Shift Selection</span>
          <div className="flex p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 gap-1">
            {shifts.map((s) => (
              <button
                key={s}
                onClick={() => setShift(s)}
                className={`
                  w-12 h-10 flex items-center justify-center rounded-xl font-bold transition-all duration-300
                  ${shift === s 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                `}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-50">
        {/* Date Selection Card */}
        <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Calendar className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Operations Date</h2>
                <p className="text-sm text-slate-400">Set the active tracking period</p>
              </div>
            </div>
            
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-16 bg-black/20 border border-white/10 rounded-2xl px-6 text-white font-mono text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all uppercase"
            />
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-xs font-bold tracking-widest text-slate-500 uppercase">
             <span>Designated Date</span>
             <span className="text-indigo-400">{date}</span>
          </div>
        </section>

        {/* Advisory Panel */}
        <section className="backdrop-blur-md bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-8">
          <h4 className="text-indigo-300 font-bold uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Current Dispatch Advisory
          </h4>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-1.5 h-12 bg-indigo-500 rounded-full flex-shrink-0"></div>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                Active shift designated as <span className="text-white font-bold underline decoration-indigo-500 decoration-2 underline-offset-4">SHIFT {shift}</span>. 
                All logs will be auto-tagged with this identifier.
              </p>
            </div>
            <div className="flex gap-4 border border-white/5 bg-white/5 p-4 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "{systemAdvisory}"
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-8 relative z-0">
        <h2 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-2">
           <Activity className="w-3 h-3 text-indigo-400" />
           Regional Environmental Monitoring
        </h2>
        <WeatherDashboard />
      </div>
    </div>
  );
}
