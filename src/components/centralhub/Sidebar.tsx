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
  LogOut,
  ExternalLink,
  Link as LinkIcon,
  Timer
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useTerminal } from '../../context/TerminalContext';
import { onSnapshot, doc, db } from '../../lib/firebase';
import type { SidebarLink as SidebarLinkType } from '../../lib/firebase';

const iconMap: Record<string, any> = {
  LayoutDashboard, Activity, Terminal, MapIcon, Camera, FileText, 
  AlertTriangle, Zap, Radio, Siren, Settings2, Table, Lock, 
  UserCheck, ClockIcon, Phone, Calendar, CreditCard, ExternalLink, LinkIcon, Timer
};

const CORE_COMMANDS = [
  { icon: 'LayoutDashboard', label: 'Start Page', path: '/', id: 'start' },
  { icon: 'Activity', label: 'Tone Test', path: '/tone-test', id: 'tone' },
  { icon: 'Terminal', label: 'Unit Posting', path: '/unit-posting', id: 'unit' },
  { icon: 'FileText', label: 'Shift Report', path: '/shift-report', id: 'report' },
  { icon: 'MapIcon', label: 'Distance Map', path: '/distance-map', id: 'dist' },
  { icon: 'Camera', label: 'Cameras', path: '/cameras', id: 'cams' },
  { icon: 'Timer', label: 'Timers', path: '/timers', id: 'timers' },
];

const PORTAL_LINKS = [
  { icon: 'ClockIcon', label: 'Time Clock', path: '/time-clock', id: 'clock' },
  { icon: 'Phone', label: 'Directory', path: '/directory', id: 'dir' },
  { icon: 'Calendar', label: 'Coroner Schedule', path: 'https://drive.google.com/file/d/1Lq3m5KIhkwP7zQZu9RTKlXRO18BPhx1A/view?usp=drive_link', external: true, id: 'coroner' },
  { icon: 'Table', label: 'Daily Worksheet', path: 'https://docs.google.com/spreadsheets/d/1-4Uwh00g4orCaOQoOrLIcRkamAhdxrBNhVVOt2IEOoY/edit?gid=534085027#gid=534085027', external: true, id: 'worksheet' },
  { icon: 'CreditCard', label: 'PayCom Online', path: 'https://www.paycomonline.net/v4/ee/web.php/app/login', external: true, id: 'paycom' },
];

export function Sidebar() {
  const [customLinks, setCustomLinks] = React.useState<SidebarLinkType[]>([]);
  const { 
    manualEmergencyMode, 
    setManualEmergencyMode, 
    emergencyOpacity, 
    setEmergencyOpacity,
    terminalUser,
    logoutTerminalUser,
    firebaseUser,
    appTheme
  } = useTerminal();

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (s) => {
      if (s.exists()) {
        const data = s.data();
        if (data.sidebarLinks) {
          setCustomLinks(data.sidebarLinks);
        }
      }
    });
    return () => unsub();
  }, []);

  const bouncyProps = {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.95 },
    transition: { type: "spring", stiffness: 400, damping: 10 } as const
  };

  return (
    <div 
      className="w-64 h-screen bg-bg-main border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 overflow-y-auto overflow-x-hidden transition-colors duration-500 shadow-2xl"
      data-theme={appTheme}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
      
      <div className="p-8 relative">
        <motion.div 
          className="flex items-center gap-3 mb-4 group cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 } as const}
        >
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg group-hover:shadow-indigo-500/50 transition-all duration-500",
            appTheme === 'midnight' ? 'bg-blue-600' : 'bg-indigo-600'
          )} style={{ backgroundColor: 'var(--header-logo-color)' }}>D</div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-[0.2em] text-text-main uppercase leading-none">Dispatch</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] mt-1" style={{ color: 'var(--brand-accent)' }}>Terminal</span>
          </div>
        </motion.div>
      </div>
      
      <nav className="flex-1 px-4 space-y-8 relative">
        {/* Core Commands Section */}
        <div>
          <div className="px-4 mb-4 flex items-center gap-2">
            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400">Core Command</span>
          </div>
          <div className="space-y-1">
            {CORE_COMMANDS.map((item) => {
              const IconComponent = iconMap[item.icon] || LinkIcon;
              return (
                <motion.div key={item.path} {...bouncyProps}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative
                        ${isActive ? 'text-text-main font-black' : 'text-text-dim hover:text-text-main'}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <IconComponent className={cn("w-4 h-4 flex-shrink-0 transition-colors relative z-10", isActive ? "text-indigo-500" : "group-hover:text-indigo-300")} />
                        <span className="text-[11px] font-black uppercase tracking-widest relative z-10">{item.label}</span>
                        {isActive && (
                          <motion.div 
                            layoutId="nav-active"
                            className="absolute inset-0 bg-white/10 border border-white/5 rounded-xl shadow-inner shadow-indigo-500/10"
                            initial={false}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 } as const}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Links Section */}
        <div>
          <div className="px-4 mb-4 flex items-center gap-2">
            <div className="w-1 h-3 bg-emerald-500 rounded-full" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">Portal Links</span>
          </div>
          <div className="space-y-1">
            {PORTAL_LINKS.map((item) => {
              const IconComponent = iconMap[item.icon] || LinkIcon;
              return item.external ? (
                <motion.a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...bouncyProps}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-text-dim hover:bg-white/5 hover:text-text-main border border-transparent group relative"
                >
                  <IconComponent className="w-4 h-4 flex-shrink-0 group-hover:text-emerald-400 transition-colors" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.a>
              ) : (
                <motion.div key={item.path} {...bouncyProps}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative
                        ${isActive ? 'text-text-main font-black' : 'text-text-dim hover:text-text-main'}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <IconComponent className={cn("w-4 h-4 flex-shrink-0 transition-colors relative z-10", isActive ? "text-emerald-500" : "group-hover:text-emerald-300")} />
                        <span className="text-[11px] font-black uppercase tracking-widest relative z-10">{item.label}</span>
                        {isActive && (
                          <motion.div 
                            layoutId="nav-active-portal"
                            className="absolute inset-0 bg-white/10 border border-white/5 rounded-xl shadow-inner shadow-emerald-500/10"
                            initial={false}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 } as const}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                </motion.div>
              );
            })}
          </div>
        </div>
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
          <motion.div 
            {...bouncyProps}
            className="flex items-center justify-between px-4 py-3 bg-black/5 border border-white/10 rounded-2xl group shadow-inner"
          >
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
          </motion.div>

          <motion.div {...bouncyProps}>
            <Link 
              to="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-text-dim hover:text-indigo-400 transition-all border border-transparent hover:bg-indigo-500/5 group w-full"
            >
              <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">Matrix Auth</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
// sync
