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
  Search
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
  ShiftReport as ShiftReportType,
  PersonnelMember
} from '../../lib/firebase';
import { ALL_CAMERAS } from '../../lib/camsConstants';

export function AdminPage() {
  const { systemAdvisory, setSystemAdvisory } = useTerminal();
  const [advisoryInput, setAdvisoryInput] = useState(systemAdvisory);
  const [isSaved, setIsSaved] = useState(false);

  // Shift Report Config States
  const [user, setUser] = useState(auth.currentUser);
  const [backgroundStyle, setBackgroundStyle] = useState<'glow' | 'emergency'>('glow');
  const [lightIntensity, setLightIntensity] = useState<number>(0.5);
  const [personnel, setPersonnel] = useState<PersonnelMember[]>([]);
  const [supervisors, setSupervisors] = useState<Record<string, string>>({});
  const [defaultCameraIds, setDefaultCameraIds] = useState<string[]>([]);
  const [archivedReports, setArchivedReports] = useState<ShiftReportType[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

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
        if (data.backgroundStyle) setBackgroundStyle(data.backgroundStyle);
        if (typeof data.lightIntensity === 'number') setLightIntensity(data.lightIntensity);
        if (data.personnel) setPersonnel(data.personnel);
        if (data.supervisors) setSupervisors(data.supervisors);
        if (data.defaultCameraIds) setDefaultCameraIds(data.defaultCameraIds);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveAdvisory = () => {
    setSystemAdvisory(advisoryInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

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
    <div className="space-y-12 pb-24 h-full overflow-y-auto pr-4 scrollbar-thin">
      <header className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
           <Lock className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">System Configuration</h1>
          <p className="text-slate-400 mt-1 uppercase tracking-[0.2em] text-[10px] font-black flex items-center gap-2">
            <Shield className="w-3 h-3 text-emerald-500" />
            Authenticated Administrative Console
          </p>
        </div>
      </header>

      {!user && (
        <section className="backdrop-blur-md bg-rose-500/5 border border-rose-500/10 rounded-[2rem] p-8 flex items-center justify-between gap-8">
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Authentication Required</h3>
            <p className="text-xs text-slate-400 mt-1 italic">Sign in to manage persistent configuration and personnel roster.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Personnel Management - Full Wide */}
        <div className="lg:col-span-12">
          <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-4">
                  <User className="w-6 h-6 text-indigo-400" />
                  Operations Personnel
                </h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-2">Manage roster, shifts, and contact information</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  disabled={!user}
                  onClick={seedPersonnel}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl font-bold uppercase tracking-widest text-xs hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                  title="Import from Legacy Constants"
                >
                  Sync Shift Data
                </button>
                <button 
                  disabled={!user}
                  onClick={() => {
                  setEditingPerson(null);
                  setPersonForm({ name: '', shift: 'A', phone: '', certifications: [] });
                  setShowPersonnelModal(true);
                }}
                className="flex items-center gap-3 px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-400 transition-all disabled:opacity-50 shadow-xl shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                Add Personnel
              </button>
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {['A', 'B', 'C', 'D', 'Other'].map(shift => (
                <div key={shift} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{shift} Shift</h4>
                    <span className="text-[10px] font-mono text-indigo-400">{personnel.filter(p => p.shift === shift).length}</span>
                  </div>
                  <div className="space-y-2">
                    {personnel.filter(p => p.shift === shift).map(p => (
                      <div key={p.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-indigo-500/30 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-bold text-white">{p.name}</div>
                            {p.phone && (
                              <div className="flex items-center gap-2 mt-1">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span className="text-[10px] font-mono text-slate-400">{p.phone}</span>
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
                              className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deletePerson(p.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
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
           <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Camera className="w-5 h-5 text-brand-indigo" />
                  Default Camera Array
                </h3>
                <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">{defaultCameraIds.length} Initialized</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {ALL_CAMERAS.map(cam => (
                  <button
                    key={cam.id}
                    disabled={!user}
                    onClick={() => toggleCamera(cam.id)}
                    className={`p-4 rounded-2xl border transition-all text-left group ${defaultCameraIds.includes(cam.id) ? 'bg-indigo-500 border-indigo-400 shadow-xl shadow-indigo-500/20' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                  >
                    <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${defaultCameraIds.includes(cam.id) ? 'text-indigo-200' : 'text-slate-500'}`}>SENSOR_{cam.id.toUpperCase()}</div>
                    <div className={`text-xs font-bold leading-tight ${defaultCameraIds.includes(cam.id) ? 'text-white' : 'text-slate-300'}`}>{cam.name}</div>
                  </button>
                ))}
              </div>
           </section>
        </div>

        {/* Other System Settings */}
        <div className="lg:col-span-4 space-y-12">
          {/* Visual Settings */}
          <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <Activity className="w-5 h-5 text-brand-indigo" />
              Interface Settings
            </h3>
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Theme Engine</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => user && updateGlobalSettings({ backgroundStyle: 'glow' })}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${backgroundStyle === 'glow' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  Slate Glow
                </button>
                <button 
                  onClick={() => user && updateGlobalSettings({ backgroundStyle: 'emergency' })}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${backgroundStyle === 'emergency' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  Emergency
                </button>
              </div>
            </div>
          </section>

          {/* System Advisory */}
          <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-4 overflow-hidden relative group">
             <div className="space-y-2 relative">
               <h3 className="text-lg font-bold text-white flex items-center gap-3">
                 <Terminal className="w-5 h-5 text-indigo-400" />
                 Global Advisory
               </h3>
             </div>
             <textarea
                value={advisoryInput}
                onChange={(e) => setAdvisoryInput(e.target.value)}
                className="w-full h-24 bg-black/40 border border-white/10 rounded-2xl p-4 text-slate-200 text-xs font-medium resize-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSaveAdvisory}
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg ${isSaved ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-400 active:scale-95'}`}
              >
                {isSaved ? 'Deployed' : 'Commit Advisory'}
              </button>
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
               No historical data available
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
              className="relative w-full max-w-md glass-effect bg-black/80 rounded-[2.5rem] border border-white/10 p-10 space-y-8 shadow-2xl"
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
