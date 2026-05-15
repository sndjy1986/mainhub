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
  Table,
  Lock,
  UserCheck,
  Clock as ClockIcon,
  Phone,
  Calendar,
  CreditCard,
  LogOut
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useTerminal } from '../../context/TerminalContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Start Page', path: '/' },
  { icon: Activity, label: 'Tone Test', path: '/tone-test' },
  { icon: Terminal, label: 'Unit Posting', path: '/unit-posting' },
  { icon: MapIcon, label: 'Distance Map', path: '/distance-map' },
  { icon: FileText, label: 'Shift Report', path: '/shift-report' },
  { icon: Calendar, label: 'Coroner Schedule', path: 'https://drive.google.com/file/d/1Lq3m5KIhkwP7zQZu9RTKlXRO18BPhx1A/view?usp=drive_link', external: true },
  { icon: Table, label: 'Daily Worksheet', path: 'https://docs.google.com/spreadsheets/d/1-4Uwh00g4orCaOQoOrLIcRkamAhdxrBNhVVOt2IEOoY/edit?gid=534085027#gid=534085027', external: true },
  { icon: CreditCard, label: 'PayCom Online', path: 'https://www.paycomonline.net/v4/ee/web.php/app/login', external: true },
  { icon: Camera, label: 'Cameras', path: '/cameras' },
  { icon: ClockIcon, label: 'Time Clock', path: '/time-clock' },
  { icon: Phone, label: 'Directory', path: '/directory' },
];

export function Sidebar() {
  const { 
    manualEmergencyMode, 
    setManualEmergencyMode, 
    emergencyOpacity, 
    setEmergencyOpacity,
    terminalUser,
    logoutTerminalUser,
    firebaseUser
  } = useTerminal();

  return (
    <div className="w-64 h-screen bg-bg-main/80 backdrop-blur-2xl border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 overflow-y-auto overflow-x-hidden transition-colors duration-500 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
      
      <div className="p-8 relative">
        <div className="flex items-center gap-3 mb-10 group">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-all duration-500">D</div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-[0.2em] text-text-main uppercase leading-none">Dispatch</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] mt-1">Terminal</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 relative">
        <div className="px-4 mb-4">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-dim">Core Command</span>
        </div>
        {navItems.map((item) => (
          item.external ? (
            <a
              key={item.path}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-text-dim hover:bg-white/5 hover:text-text-main border border-transparent group relative"
            >
              <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
              <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
            </a>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative
                  ${isActive ? 'text-text-main font-black' : 'text-text-dim hover:text-text-main'}
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-4 h-4 flex-shrink-0 transition-colors relative z-10", isActive ? "text-indigo-500" : "group-hover:text-indigo-300")} />
                  <span className="text-[11px] font-black uppercase tracking-widest relative z-10">{item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="nav-active"
                      className="absolute inset-0 bg-white/10 border border-white/5 rounded-xl shadow-inner shadow-indigo-500/10"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        ))}
      </nav>

      <div className="px-4 py-6 space-y-4 relative">
        <div className="px-4">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-dim">System Link</span>
        </div>
        {/* Emergency Controls in Sidebar */}
        <div className="p-4 bg-black/5 border border-white/10 rounded-2xl space-y-4 shadow-inner">
           <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-text-dim">Strobes</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${manualEmergencyMode ? 'text-rose-500 glow-text-indigo' : 'text-text-dim'}`}>
                  {manualEmergencyMode ? 'Overdrive' : 'Standby'}
                </span>
              </div>
              <button
                onClick={() => setManualEmergencyMode(!manualEmergencyMode)}
                className={`
                  w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-500 border
                  ${manualEmergencyMode 
                    ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]' 
                    : 'bg-white/5 border-white/5 text-text-dim hover:border-white/10 hover:text-text-main'}
                `}
              >
                <Siren className={`w-4 h-4 ${manualEmergencyMode ? 'animate-pulse' : ''}`} />
              </button>
           </div>
           
           <div className="space-y-2">
              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.3em] text-text-dim">
                <span>Power Level</span>
                <span className="font-mono text-indigo-500">{(emergencyOpacity * 100).toFixed(0)}%</span>
              </div>
              <div className="relative h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-indigo-500 shadow-[0_0_100px_rgba(99,102,241,0.5)]"
                  animate={{ width: `${emergencyOpacity * 100}%` }}
                />
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={emergencyOpacity}
                  onChange={(e) => setEmergencyOpacity(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
           </div>
        </div>

        {/* User Profile & Admin Access */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-4 py-3 bg-black/5 border border-white/10 rounded-2xl group shadow-inner">
             <div className="flex items-center gap-3 min-w-0">
               <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:border-indigo-500/40 transition-all">
                  <UserCheck className="w-4 h-4 text-indigo-500" />
               </div>
               <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-main truncate">
                    {terminalUser?.username || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Dispatcher'}
                  </span>
                  <span className="text-[8px] font-bold text-text-dim truncate leading-none mt-1 uppercase">
                    {terminalUser?.role || (firebaseUser ? 'Root Admin' : 'Operator')}
                  </span>
               </div>
             </div>
             <button 
              onClick={async () => {
                if (window.confirm("TERMINATE SESSION?")) {
                  logoutTerminalUser();
                  if (firebaseUser) {
                    const { auth } = await import('../../lib/firebase');
                    await auth.signOut();
                  }
                }
              }}
              className="p-2 text-text-dim hover:text-rose-500 transition-colors"
              title="Terminate Session"
             >
               <LogOut size={14} />
             </button>
          </div>

          <Link 
            to="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-text-dim hover:text-indigo-400 transition-all border border-transparent hover:bg-indigo-500/5 group"
          >
            <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Matrix Auth</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
// sync
