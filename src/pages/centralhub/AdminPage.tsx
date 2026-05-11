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
  X,
  Plus,
  Edit2,
  Phone,
  Camera,
  Search,
  Bell
} from 'lucide-react';
import { useTerminal, AppTheme } from '../../context/TerminalContext';
import { 
  auth, 
  signIn, 
  updateGlobalSettings, 
  getReports, 
  doc, 
  onSnapshot, 
  db, 
  ShiftReport as ShiftReportType,
  PersonnelMember
} from '../../lib/firebase';
import { ALL_CAMERAS } from '../../lib/camsConstants';

export function AdminPage() {
  const { addNotification, notificationPermission, requestNotificationPermission, appTheme, setAppTheme } = useTerminal();
  const [showToast, setShowToast] = useState<string | null>(null);

  const THEMES: { id: AppTheme; name: string; color: string }[] = [
    { id: 'midnight', name: 'Midnight', color: '#3b82f6' },
    { id: 'emerald', name: 'Emerald', color: '#10b981' },
    { id: 'amber', name: 'Amber', color: '#f59e0b' },
    { id: 'slate', name: 'Slate', color: '#64748b' },
    { id: 'crimson', name: 'Crimson', color: '#ef4444' },
    { id: 'cyber', name: 'Cyber', color: '#06b6d4' },
    { id: 'royal', name: 'Royal', color: '#8b5cf6' },
    { id: 'forest', name: 'Forest', color: '#16a34a' },
    { id: 'arctic', name: 'Arctic', color: '#0ea5e9' },
    { id: 'desert', name: 'Desert', color: '#d97706' },
    { id: 'nebula', name: 'Nebula', color: '#a21caf' },
    { id: 'titanium', name: 'Titanium', color: '#64748b' },
    { id: 'neon', name: 'Neon', color: '#ff00ff' },
    { id: 'ghost', name: 'Ghost', color: '#ffffff' },
    { id: 'ocean', name: 'Ocean', color: '#0ea5e9' },
    { id: 'blood', name: 'Blood', color: '#991b1b' },
  ];

  // Shift Report Config States
  const [user, setUser] = useState(auth.currentUser);
  const [personnel, setPersonnel] = useState<PersonnelMember[]>([]);
  const [supervisors, setSupervisors] = useState<Record<string, string>>({});
  const [defaultCameraIds, setDefaultCameraIds] = useState<string[]>([]);
  const [archivedReports, setArchivedReports] = useState<ShiftReportType[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Personnel Form State
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonnelMember | null>(null);
  const [personForm, setPersonForm] = useState<{name: string, shift: 'A' | 'B' | 'C' | 'D' | 'Other', phone: string, certifications: {id: string, name: string, expirationDate: string, required: boolean}[]}>({
    name: '',
    shift: 'A',
    phone: '',
    certifications: []
  });

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
        if (data.personnel) setPersonnel(data.personnel);
        if (data.supervisors) setSupervisors(data.supervisors);
        if (data.defaultCameraIds) setDefaultCameraIds(data.defaultCameraIds);
      }
    });

    return () => unsubscribe();
  }, []);

  const savePersonnel = async () => {
    if (!personForm.name) return;
    
    let newPersonnel = [...personnel];
    if (editingPerson) {
      newPersonnel = newPersonnel.map(p => p.id === editingPerson.id ? { ...p, ...personForm } : p);
    } else {
      const newPerson: PersonnelMember = {
        id: crypto.randomUUID(),
        ...personForm
      };
      newPersonnel.push(newPerson);
    }
    
    setPersonnel(newPersonnel);
    if (user) await updateGlobalSettings({ personnel: newPersonnel });
    setShowPersonnelModal(false);
    setEditingPerson(null);
    setPersonForm({ name: '', shift: 'A', phone: '', certifications: [] });
    setShowToast("Personnel Updated");
  };

  const deletePerson = async (id: string) => {
    if (!window.confirm("Remove this member?")) return;
    const newPersonnel = personnel.filter(p => p.id !== id);
    setPersonnel(newPersonnel);
    if (user) await updateGlobalSettings({ personnel: newPersonnel });
  };

  const toggleCamera = async (camId: string) => {
    let newIds = [...defaultCameraIds];
    if (newIds.includes(camId)) {
      newIds = newIds.filter(id => id !== camId);
    } else {
      newIds.push(camId);
    }
    setDefaultCameraIds(newIds);
    if (user) await updateGlobalSettings({ defaultCameraIds: newIds });
  };

  const seedPersonnel = async () => {
    if (!user) return;
    if (personnel.length > 0 && !window.confirm("Personnel records already exist. This will append new records. Proceed?")) return;

    const seedData: PersonnelMember[] = [
      { id: crypto.randomUUID(), name: "Crystal Culbertson", shift: 'A' },
      { id: crypto.randomUUID(), name: "Courtney Fletcher", shift: 'A' },
      { id: crypto.randomUUID(), name: "Brian Blair", shift: 'A' },
      { id: crypto.randomUUID(), name: "Corrine Skelly", shift: 'B' },
      { id: crypto.randomUUID(), name: "Dayonna", shift: 'B' },
      { id: crypto.randomUUID(), name: "Joey Sanders", shift: 'C' },
      { id: crypto.randomUUID(), name: "Michael Senn", shift: 'C' },
      { id: crypto.randomUUID(), name: "Rea Roberson", shift: 'C' },
      { id: crypto.randomUUID(), name: "Erin Brandenburg", shift: 'D' },
      { id: crypto.randomUUID(), name: "Asha Williams", shift: 'D' },
      { id: crypto.randomUUID(), name: "Darren Chestein", shift: 'D' },
      { id: crypto.randomUUID(), name: "Donna Wiles", shift: 'Other' }
    ];

    const merged = [...personnel];
    seedData.forEach(s => {
      if (!merged.find(p => p.name === s.name)) {
        merged.push(s);
      }
    });

    setPersonnel(merged);
    await updateGlobalSettings({ personnel: merged });
    setShowToast("Shift Personnel Synchronized");
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
    <div className="space-y-12 pb-24 h-full overflow-y-auto pr-4 scrollbar-thin transition-colors duration-500">
      <header className="flex flex-wrap items-center justify-between gap-8 pb-10 border-b border-white/5 relative tactical-header-glow">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-2xl shadow-indigo-500/20 group hover:scale-110 transition-all duration-500">
             <Lock className="w-8 h-8 text-indigo-400 group-hover:animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase italic">System <span className="text-indigo-500 not-italic">Matrix</span></h1>
            <p className="text-slate-500 font-black mt-1 uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
              <Shield className="w-3 h-3 text-emerald-500" />
              Authenticated Administrative Protocols
            </p>
          </div>
        </div>
      </header>

      {!user && (
        <section className="tactical-card p-12 flex flex-col md:flex-row items-center justify-between gap-8 border-rose-500/20 bg-rose-500/[0.02]">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Security <span className="text-rose-500 not-italic">Barrier</span></h3>
            <p className="text-sm text-slate-400 mt-2 font-medium">Authentication required to access persistent orchestration nodes and roster databases.</p>
          </div>
          <button 
            onClick={async () => {
              try {
                await signIn();
                setShowToast("AUTHENTICATED_ACCESS_GRANTED");
              } catch (e: any) {
                setShowToast("AUTH_REJECTED");
              }
            }}
            className="tactical-btn-indigo px-10 py-5 shadow-indigo-500/30 min-w-[240px]"
          >
            Google Tactical Auth
          </button>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Personnel Management - Full Wide */}
        <div className="lg:col-span-12">
          <section className="tactical-card p-10 space-y-10">
            <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-white/5">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                  <User className="w-6 h-6 text-indigo-500" />
                  Fleet Personnel Array
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Database of active responders and tactical shifts</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  disabled={!user}
                  onClick={seedPersonnel}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                  title="Import from Hardcoded Seeds"
                >
                  Sync Buffer
                </button>
                <button 
                  disabled={!user}
                  onClick={() => {
                  setEditingPerson(null);
                  setPersonForm({ name: '', shift: 'A', phone: '', certifications: [] });
                  setShowPersonnelModal(true);
                }}
                className="tactical-btn-indigo px-8 py-3 text-[10px] shadow-indigo-500/20 disabled:opacity-30"
              >
                <Plus className="w-4 h-4" />
                Initialize Personnel
              </button>
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
              {['A', 'B', 'C', 'D', 'Other'].map(shift => (
                <div key={shift} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">{shift} Shift</h4>
                    <span className="text-[9px] font-mono text-slate-500 border border-white/10 px-2 py-0.5 rounded bg-black/20">{personnel.filter(p => p.shift === shift).length}</span>
                  </div>
                  <div className="space-y-3">
                    {personnel.filter(p => p.shift === shift).map(p => (
                      <div key={p.id} className="p-5 bg-black/20 border border-white/5 rounded-2xl group hover:border-indigo-500/40 transition-all duration-300 shadow-inner">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-black text-white uppercase tracking-tight truncate">{p.name}</div>
                            {p.phone && (
                              <div className="flex items-center gap-2 mt-2">
                                <Phone className="w-3 h-3 text-slate-600" />
                                <span className="text-[9px] font-mono text-slate-500 font-bold tracking-tight">{p.phone}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingPerson(p);
                                setPersonForm({ name: p.name, shift: p.shift, phone: p.phone || '', certifications: p.certifications || [] });
                                setShowPersonnelModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deletePerson(p.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Camera Config */}
        <div className="lg:col-span-8">
           <section className="tactical-card p-10 space-y-8">
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4 italic font-sans">
                  <Camera className="w-6 h-6 text-indigo-500" />
                  Orbital <span className="text-indigo-500 not-italic">Feeds</span>
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Links</span>
                  <span className="text-xs font-mono text-indigo-400 font-black border border-indigo-500/30 px-3 py-1 rounded-lg bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]">{defaultCameraIds.length}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {ALL_CAMERAS.map(cam => (
                  <button
                    key={cam.id}
                    disabled={!user}
                    onClick={() => toggleCamera(cam.id)}
                    className={`
                      p-5 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 group relative overflow-hidden
                      ${defaultCameraIds.includes(cam.id) 
                        ? 'bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-500/30' 
                        : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5'}
                    `}
                  >
                    <div className="relative z-10">
                       <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 group-hover:text-white transition-colors ${defaultCameraIds.includes(cam.id) ? 'text-white' : 'text-slate-500'}`}>CAM_{cam.id}</div>
                       <div className={`text-xs font-black uppercase leading-tight group-hover:translate-x-1 transition-transform ${defaultCameraIds.includes(cam.id) ? 'text-white' : 'text-slate-300'}`}>{cam.name}</div>
                    </div>
                    <div className={`text-[8px] font-black uppercase tracking-widest relative z-10 ${defaultCameraIds.includes(cam.id) ? 'text-indigo-200' : 'text-slate-600'}`}>
                      {defaultCameraIds.includes(cam.id) ? 'LINKED' : 'OFFLINE'}
                    </div>
                    {defaultCameraIds.includes(cam.id) && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] z-20" />
                    )}
                  </button>
                ))}
              </div>
           </section>
        </div>

        {/* System & Notifications */}
        <div className="lg:col-span-4 space-y-12">
          {/* App Theme Settings */}
          <section className="tactical-card p-10 space-y-8">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 italic">
              <Settings className="w-5 h-5 text-indigo-500" />
              Ambience <span className="text-indigo-500 not-italic">Sync</span>
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setAppTheme(theme.id);
                    setShowToast(`${theme.name.toUpperCase()} ENGINE ACTIVATED`);
                  }}
                  className={`
                    w-full flex items-center justify-between p-5 rounded-2xl border transition-all relative overflow-hidden group
                    ${appTheme === theme.id 
                      ? 'bg-white/10 border-white/20 shadow-xl' 
                      : 'bg-black/40 border-transparent hover:border-white/10'}
                  `}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12" 
                      style={{ backgroundColor: theme.color, boxShadow: `0 0 20px ${theme.color}33` }}
                    >
                      {appTheme === theme.id && <CheckCircle2 className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex flex-col items-start translate-y-0.5">
                      <span className={`text-xs font-black uppercase tracking-widest ${appTheme === theme.id ? 'text-white' : 'text-slate-400'}`}>
                        {theme.name}
                      </span>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">Core Engine_0{THEMES.indexOf(theme) + 1}</span>
                    </div>
                  </div>
                  
                  {appTheme === theme.id && (
                    <motion.div
                      layoutId="theme-active"
                      className="absolute inset-0 bg-white/[0.03] pointer-events-none"
                    />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Notification Settings */}
          <section className="tactical-card p-10 space-y-8 h-full">
            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 italic text-sans">
              <Bell className="w-5 h-5 text-indigo-500" />
              Alert <span className="text-indigo-500 not-italic">Matrix</span>
            </h3>
            <div className="space-y-8 leading-normal">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">System Integration</p>
                  <p className={`text-xs font-mono font-black mt-2 uppercase tracking-widest ${notificationPermission === 'granted' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    STATE: {notificationPermission.toUpperCase()}
                  </p>
                </div>
                {notificationPermission !== 'granted' && (
                  <button 
                    onClick={requestNotificationPermission}
                    className="tactical-btn-indigo px-6 py-3 text-[10px]"
                  >
                    Authorize
                  </button>
                )}
              </div>

              <div className="pt-8 border-t border-white/5 space-y-4">
                <button
                  onClick={() => {
                    addNotification('SYSTEM_READY // ALERT_CHANNEL_ESTABLISHED', 'success');
                  }}
                  className="w-full py-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <Activity className="w-4 h-4 text-emerald-500" />
                  INITIATE PING TEST
                </button>

                {window.self !== window.top && (
                  <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/30" />
                    <div className="flex gap-4">
                      <AlertCircle className="w-5 h-5 text-amber-500/80 shrink-0 mt-0.5" />
                      <div className="space-y-4">
                        <p className="text-[10px] text-amber-200/50 leading-relaxed uppercase font-black tracking-widest">
                          Warning: Organizational sandbox detected. Notifications may be isolated within the security container.
                        </p>
                        <a 
                          href={window.location.href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[10px] text-amber-500 font-black hover:text-amber-400 transition-colors uppercase tracking-[0.2em]"
                        >
                          <Maximize2 size={12} /> External Access Portal →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* History Feed */}
      <section className="tactical-card p-12 space-y-10">
        <div className="flex items-center justify-between border-b border-white/5 pb-8">
          <h3 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-6 italic">
            <History className="w-8 h-8 text-indigo-500" />
            Operational <span className="text-indigo-500 not-italic">Archive</span>
          </h3>
          <button 
            onClick={loadHistory}
            className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-all flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30">
              <Loader2 className={`w-4 h-4 text-indigo-400 ${loadingReports ? 'animate-spin' : ''}`} />
            </div>
            Vector Synchronization
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {archivedReports.length === 0 ? (
            <div className="col-span-full py-24 text-center text-slate-600 font-black uppercase tracking-[0.3em] text-sm border-2 border-dashed border-white/5 rounded-[3rem] bg-black/10">
               No established history found in this sector
            </div>
          ) : (
            archivedReports.map(report => (
              <div key={report.id} className="p-8 tactical-card bg-black/20 group hover:bg-white/5 duration-500 relative overflow-hidden">
                <div className="relative z-10 space-y-6">
                   <div className="flex items-center justify-between">
                      <span className="px-4 py-1.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] italic">{report.shift} SHIFT MATRIX</span>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">{report.date}</span>
                   </div>
                   <div className="space-y-2">
                     <h4 className="text-base font-black text-white uppercase italic tracking-tight">{report.name}</h4>
                     <p className="text-[11px] text-slate-500 line-clamp-3 uppercase tracking-tight font-medium leading-relaxed">{report.plainReport}</p>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Personnel Modal */}
      <AnimatePresence>
        {showPersonnelModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
              onClick={() => setShowPersonnelModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass-effect bg-bg-surface/90 rounded-[2.5rem] border border-white/10 p-10 space-y-8 shadow-2xl transition-colors duration-500"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <User className="w-6 h-6 text-indigo-400" />
                  {editingPerson ? 'Edit Personnel' : 'New Personnel'}
                </h3>
                <button onClick={() => setShowPersonnelModal(false)} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Full Name</label>
                  <input 
                    type="text" 
                    value={personForm.name}
                    onChange={e => setPersonForm({...personForm, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Shift Assignment</label>
                  <div className="grid grid-cols-5 gap-2">
                    {['A', 'B', 'C', 'D', 'Other'].map(s => (
                      <button 
                        key={s}
                        onClick={() => setPersonForm({...personForm, shift: s as any})}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${personForm.shift === s ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      value={personForm.phone}
                      onChange={e => setPersonForm({...personForm, phone: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="864-XXX-XXXX"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Certifications</label>
                    <button 
                      onClick={() => setPersonForm({...personForm, certifications: [...personForm.certifications, {id: crypto.randomUUID(), name: '', expirationDate: '', required: false}]})}
                      className="text-[10px] bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg uppercase font-bold tracking-widest hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Cert
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2 scrollbar-thin">
                    {personForm.certifications.map((cert, index) => (
                      <div key={cert.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 relative group">
                        <button 
                          onClick={() => {
                            const newCerts = [...personForm.certifications];
                            newCerts.splice(index, 1);
                            setPersonForm({...personForm, certifications: newCerts});
                          }}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <input 
                          type="text" 
                          value={cert.name}
                          onChange={e => {
                            const newCerts = [...personForm.certifications];
                            newCerts[index].name = e.target.value;
                            setPersonForm({...personForm, certifications: newCerts});
                          }}
                          className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Cert Name (e.g. CPR)"
                        />
                        <div className="flex items-center gap-2">
                          <input 
                            type="date" 
                            value={cert.expirationDate}
                            onChange={e => {
                              const newCerts = [...personForm.certifications];
                              newCerts[index].expirationDate = e.target.value;
                              setPersonForm({...personForm, certifications: newCerts});
                            }}
                            className="flex-1 bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
                          />
                          <label className="flex items-center gap-2 cursor-pointer bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                            <input 
                              type="checkbox" 
                              checked={cert.required}
                              onChange={e => {
                                const newCerts = [...personForm.certifications];
                                newCerts[index].required = e.target.checked;
                                setPersonForm({...personForm, certifications: newCerts});
                              }}
                              className="w-4 h-4 accent-indigo-500 rounded bg-white/5 border-white/10"
                            />
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Required</span>
                          </label>
                        </div>
                      </div>
                    ))}
                    {personForm.certifications.length === 0 && (
                      <div className="text-center py-6 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">No Certifications</span>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={savePersonnel}
                  className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  {editingPerson ? 'Update Member' : 'Enlist Personnel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[400] px-6 py-3 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-4 shadow-2xl"
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

export default AdminPage;
