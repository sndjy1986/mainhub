import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Save, 
  AlertCircle, 
  Terminal, 
  Lock, 
  Info, 
  Radio, 
  Activity, 
  User, 
  Settings, 
  History, 
  Truck, 
  Clock, 
  Trash2, 
  Loader2, 
  Maximize2,
  Mail,
  CheckCircle2,
  X
} from 'lucide-react';
import { useTerminal } from '../../context/TerminalContext';
import { 
  auth, 
  signIn, 
  updateGlobalSettings, 
  getReports, 
  doc, 
  onSnapshot, 
  db, 
  ShiftReport as ShiftReportType 
} from '../../lib/firebase';
import { TEAM_MEMBERS, MEDSUP_MAP } from '../../lib/shiftConstants';

export function AdminPage() {
  const { systemAdvisory, setSystemAdvisory } = useTerminal();
  const [advisoryInput, setAdvisoryInput] = useState(systemAdvisory);
  const [isSaved, setIsSaved] = useState(false);

  // Shift Report Config States
  const [user, setUser] = useState(auth.currentUser);
  const [backgroundStyle, setBackgroundStyle] = useState<'glow' | 'emergency'>('glow');
  const [lightIntensity, setLightIntensity] = useState<number>(0.5);
  const [employees, setEmployees] = useState<string[]>(TEAM_MEMBERS);
  const [supervisors, setSupervisors] = useState<Record<string, string>>(MEDSUP_MAP);
  const [archivedReports, setArchivedReports] = useState<ShiftReportType[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  // Track auth state
  useEffect(() => {
    return auth.onAuthStateChanged((u) => setUser(u));
  }, []);

  // Sync with Firestore Global Settings
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.backgroundStyle) setBackgroundStyle(data.backgroundStyle);
        if (typeof data.lightIntensity === 'number') setLightIntensity(data.lightIntensity);
        if (data.employees) setEmployees(data.employees);
        if (data.supervisors) setSupervisors(data.supervisors);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveAdvisory = () => {
    setSystemAdvisory(advisoryInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingReports(true);
    try {
      const reports = await getReports();
      if (reports) setArchivedReports(reports);
    } catch (e) {
      console.error(e);
      setShowToast("Failed to load history");
    } finally {
      setLoadingReports(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadHistory();
  }, [user, loadHistory]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="space-y-12">
      <header className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
           <Lock className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Admin Interface</h1>
          <p className="text-slate-400 mt-1 uppercase tracking-[0.2em] text-[10px] font-black flex items-center gap-2">
            <Shield className="w-3 h-3 text-emerald-500" />
            Clearance Level 5 - System Administrative Access
          </p>
        </div>
      </header>

      {/* Authentication Tool */}
      {!user && (
        <section className="backdrop-blur-md bg-rose-500/5 border border-rose-500/10 rounded-[2rem] p-8 flex items-center justify-between gap-8">
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Authentication Required</h3>
            <p className="text-xs text-slate-400 mt-1 italic">Sign in to manage persistent configuration and operations roster.</p>
          </div>
          <button 
            onClick={async () => {
              try {
                await signIn();
                setShowToast("Authenticated Successfully");
              } catch (e: any) {
                setShowToast("Authentication failed");
              }
            }}
            className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-500/20"
          >
            Google Sign In
          </button>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column */}
        <div className="space-y-12">
          {/* System Advisory Configuration */}
          <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Radio className="w-24 h-24 text-indigo-400" />
             </div>

             <div className="space-y-2 relative">
               <h3 className="text-lg font-bold text-white flex items-center gap-3">
                 <Terminal className="w-5 h-5 text-indigo-400" />
                 System Advisory
               </h3>
               <p className="text-xs text-slate-400">Broadcast messages across all consoles.</p>
             </div>

             <div className="space-y-4 relative">
                <textarea
                  value={advisoryInput}
                  onChange={(e) => setAdvisoryInput(e.target.value)}
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-medium resize-none"
                />
                <button
                  onClick={handleSaveAdvisory}
                  className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg ${isSaved ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-400 active:scale-95'}`}
                >
                  {isSaved ? 'Broadcast Deployed' : 'Commit Change'}
                </button>
             </div>
          </section>

          {/* Visual Settings */}
          <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <Activity className="w-5 h-5 text-brand-indigo" />
              Interface Settings
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Global Theme Mode</p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setBackgroundStyle('glow');
                      if (user) updateGlobalSettings({ backgroundStyle: 'glow' });
                    }}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${backgroundStyle === 'glow' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    Slate Glow
                  </button>
                  <button 
                    onClick={() => {
                      setBackgroundStyle('emergency');
                      if (user) updateGlobalSettings({ backgroundStyle: 'emergency' });
                    }}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${backgroundStyle === 'emergency' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    Emergency
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ambience Intensity</p>
                  <span className="text-indigo-400 font-mono font-bold">{Math.round(lightIntensity * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.05" 
                  value={lightIntensity} 
                  onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                  onMouseUp={() => user && updateGlobalSettings({ lightIntensity })}
                  className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-12">
          {/* Team Roster Management */}
          <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 flex flex-col h-[500px]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <User className="w-5 h-5 text-indigo-400" />
                Operations Roster
              </h3>
              <button 
                onClick={() => {
                  const name = window.prompt("Enter new employee name:");
                  if (name && name.trim()) {
                    const newList = [...employees, name.trim()].sort();
                    setEmployees(newList);
                    if (user) updateGlobalSettings({ employees: newList });
                  }
                }}
                className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
              <AnimatePresence>
                {employees.map(emp => (
                  <motion.div 
                    key={emp}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-indigo-500/50 transition-all"
                  >
                    <span className="text-xs font-bold text-white">{emp}</span>
                    <button 
                      onClick={() => {
                        if (window.confirm(`Delete ${emp}?`)) {
                          const newList = employees.filter(e => e !== emp);
                          setEmployees(newList);
                          if (user) updateGlobalSettings({ employees: newList });
                        }
                      }}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          {/* Supervisor Management */}
          <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <Truck className="w-5 h-5 text-emerald-400" />
                Supervisors
              </h3>
              <button 
                onClick={() => {
                  const name = window.prompt("Enter new supervisor name:");
                  if (name && name.trim()) {
                    const email = window.prompt(`Enter email for ${name}:`);
                    const newSups = { ...supervisors, [name.trim()]: (email || "").trim() };
                    setSupervisors(newSups);
                    if (user) updateGlobalSettings({ supervisors: newSups });
                  }
                }}
                className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(supervisors).map(([name, email]) => (
                <div key={name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group">
                  <div>
                    <div className="text-xs font-bold text-white">{name}</div>
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">{email || 'No Email'}</div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => {
                        const newEmail = window.prompt(`Update email for ${name}:`, supervisors[name]);
                        if (newEmail !== null) {
                          const newSups = { ...supervisors, [name]: newEmail.trim() };
                          setSupervisors(newSups);
                          if (user) updateGlobalSettings({ supervisors: newSups });
                        }
                      }}
                      className="p-2 text-slate-500 hover:text-indigo-400"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`Delete supervisor ${name}?`)) {
                          const newSups = { ...supervisors };
                          delete newSups[name];
                          setSupervisors(newSups);
                          if (user) updateGlobalSettings({ supervisors: newSups });
                        }
                      }}
                      className="p-2 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* History Feed */}
      <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-4">
            <History className="w-6 h-6 text-indigo-400" />
            Operations Archive
          </h3>
          <button 
            onClick={loadHistory}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all flex items-center gap-2"
          >
            <Loader2 className={`w-3 h-3 ${loadingReports ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {archivedReports.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-600 font-black uppercase tracking-widest text-xs border-2 border-dashed border-white/5 rounded-[2rem]">
               No historical data available in current cycle
            </div>
          ) : (
            archivedReports.map(report => (
              <div key={report.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                <div className="relative z-10">
                   <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest">{report.shift} SHIFT</span>
                      <span className="text-[10px] text-slate-500 font-mono">{report.date}</span>
                   </div>
                   <h4 className="text-sm font-bold text-white mb-2">{report.name}</h4>
                   <p className="text-[10px] text-slate-400 line-clamp-2 uppercase tracking-tight">{report.plainReport.slice(0, 100)}...</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-4 shadow-2xl"
          >
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-white">{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
      `}} />
    </div>
  );
}

// Missing Lucide Icons needed for existing code if not already imported
const PlusCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
);

export default AdminPage;
