import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Activity, 
  Terminal, 
  Map as MapIcon, 
  Camera, 
  FileText,
  AlertTriangle,
  Zap,
  Radio,
  Siren,
  Settings2,
  Lock,
  UserCheck,
  Clock as ClockIcon,
  Phone
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTerminal } from '../../context/TerminalContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Start Page', path: '/' },
  { icon: Activity, label: 'Tone Test', path: '/tone-test' },
  { icon: Terminal, label: 'Unit Posting', path: '/unit-posting' },
  { icon: MapIcon, label: 'Distance Map', path: '/distance-map' },
  { icon: Camera, label: 'Cameras', path: '/cameras' },
  { icon: FileText, label: 'Shift Report', path: '/shift-report' },
  { icon: ClockIcon, label: 'Time Clock', path: '/time-clock' },
  { icon: Phone, label: 'Directory', path: '/directory' },
];

export function Sidebar() {
  const { 
    manualEmergencyMode, 
    setManualEmergencyMode, 
    emergencyOpacity, 
    setEmergencyOpacity 
  } = useTerminal();

  return (
    <div className="w-64 h-screen backdrop-blur-xl bg-white/5 border-r border-white/10 flex flex-col fixed left-0 top-0 z-50 overflow-y-auto overflow-x-hidden">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">D</div>
          <span className="text-xl font-bold tracking-tight text-white uppercase">Dispatch Ops <span className="text-indigo-400">Central</span></span>
        </div>
      </div>
      
      <nav className="flex-1 px-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
              ${isActive 
                ? 'bg-white/10 text-white border border-white/10' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}
            `}
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="nav-active"
                    className="absolute inset-0 bg-indigo-500/10 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-6 space-y-6">
        {/* Emergency Controls in Sidebar */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
           <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Strobes</span>
                <span className={`text-[10px] font-bold uppercase transition-colors ${manualEmergencyMode ? 'text-rose-400' : 'text-slate-400'}`}>
                  {manualEmergencyMode ? 'Overdrive' : 'Standby'}
                </span>
              </div>
              <button
                onClick={() => setManualEmergencyMode(!manualEmergencyMode)}
                className={`
                  w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300
                  ${manualEmergencyMode 
                    ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'}
                `}
              >
                <Siren className={`w-5 h-5 ${manualEmergencyMode ? 'animate-pulse' : ''}`} />
              </button>
           </div>
           
           <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-500">
                <span>Intensity</span>
                <span className="font-mono text-indigo-400">{(emergencyOpacity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={emergencyOpacity}
                onChange={(e) => setEmergencyOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
           </div>
        </div>

        {/* User Profile & Admin Access */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/5 rounded-xl">
             <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <UserCheck className="w-4 h-4 text-indigo-400" />
             </div>
             <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">Dispatch Ops</span>
                <span className="text-[8px] font-bold text-slate-500 truncate lowercase">sndjy1986@gmail.com</span>
             </div>
          </div>

          <Link 
            to="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-indigo-400 transition-colors border border-dashed border-white/5 hover:border-indigo-500/30 group"
          >
            <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Admin Interface</span>
          </Link>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">System Status</p>
          <div className="flex items-center gap-2 text-emerald-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium">All Systems Nominal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
// sync
