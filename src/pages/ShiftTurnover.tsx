import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clipboard, 
  CheckCircle2, 
  Circle, 
  X, 
  Save, 
  FileText,
  AlertCircle,
  Truck,
  User,
  Calendar,
  Activity,
  History,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useTerminal } from '../context/TerminalContext';
import { db, handleFirestoreError } from '../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const STORAGE_KEY = "shiftReportDraft_v2";

interface TurnoverData {
  timesCompleted: boolean;
  dqcCompleted: boolean;
  trashTakenOut: boolean;
  computersRestarted: boolean;
  specialEvents: string;
  systemStatusLevel: string;
}

export default function ShiftTurnover({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { terminalUser } = useTerminal();
  const [reportData, setReportData] = useState<any>(null);
  const [turnoverData, setTurnoverData] = useState<TurnoverData>({
    timesCompleted: false,
    dqcCompleted: false,
    trashTakenOut: false,
    computersRestarted: false,
    specialEvents: '',
    systemStatusLevel: 'Normal'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setReportData(JSON.parse(saved));
    }
  }, []);

  const handleToggle = (key: keyof TurnoverData) => {
    setTurnoverData(prev => ({ 
      ...prev, 
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key] 
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalData = {
        meta: {
          name: reportData?.name || 'Unknown',
          alssup: reportData?.alssup || 'None',
          medsup: reportData?.medsup || 'None',
          date: reportData?.date || format(new Date(), 'yyyy-MM-dd'),
          zuluUnits: `${reportData?.zuluPrimary || ''} / ${reportData?.zuluSecondary || ''}`,
          shift: reportData?.shift || 'Unknown'
        },
        checks: {
          timesCompleted: turnoverData.timesCompleted,
          dqcCompleted: turnoverData.dqcCompleted,
          trashTakenOut: turnoverData.trashTakenOut,
          computersRestarted: turnoverData.computersRestarted
        },
        specialEvents: turnoverData.specialEvents,
        systemStatusLevel: turnoverData.systemStatusLevel,
        submittedAt: serverTimestamp(),
        submittedBy: terminalUser?.username || 'Operator'
      };

      await addDoc(collection(db, 'shift_turnovers'), finalData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      handleFirestoreError(e, 'create' as any, 'shift_turnovers');
    } finally {
      setIsSaving(false);
    }
  };

  const containerClass = isEmbedded ? "" : "max-w-4xl mx-auto p-6 md:p-12 font-sans selection:bg-indigo-500/30";

  return (
    <div className={containerClass}>
      {!isEmbedded && (
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <History className="w-5 h-5 text-white" />
               </div>
               <h1 className="text-4xl font-black text-white uppercase italic tracking-tight">Shift <span className="text-indigo-500 not-italic">Turnover</span></h1>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-13 italic">Operational Handover Protocol</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Sync Ready</span>
             </div>
          </div>
        </header>
      )}

      {isEmbedded && (
        <div className="mt-20 mb-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
            <h2 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.5em] italic">Turnover Protocol</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Left Column: Pulled Data */}
        <section className="space-y-6">
          <div className="tactical-card p-8 bg-[#101014]/60 backdrop-blur-xl border-indigo-500/20">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-8 border-b border-white/5 pb-4 flex items-center gap-3">
              <Clipboard className="w-3.5 h-3.5" /> Shift Metadata
            </h2>
            
            <div className="space-y-6">
              <StaticField icon={User} label="Name" value={reportData?.name || 'PENDING'} />
              <StaticField icon={Activity} label="ALSSUP" value={reportData?.alssup || 'PENDING'} />
              <StaticField icon={User} label="MEDSUP" value={reportData?.medsup || 'PENDING'} />
              <StaticField icon={Calendar} label="Date" value={reportData?.date || 'PENDING'} />
              <StaticField icon={Truck} label="Zulu Units" value={`${reportData?.zuluPrimary || ''} ${reportData?.zuluSecondary ? '/ ' + reportData.zuluSecondary : ''}`.trim() || 'NONE'} />
            </div>
          </div>
        </section>

        {/* Right Column: Checkboxes & Inputs */}
        <section className="space-y-6">
          <div className="tactical-card p-8">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-8 border-b border-white/5 pb-4 flex items-center gap-3">
              <CheckCircle2 className="w-3.5 h-3.5" /> Handover Checks
            </h2>

            <div className="space-y-4">
              <ToggleButton 
                label="Times Completed" 
                active={turnoverData.timesCompleted} 
                onClick={() => handleToggle('timesCompleted')} 
              />
              <ToggleButton 
                label="DQC Completed" 
                active={turnoverData.dqcCompleted} 
                onClick={() => handleToggle('dqcCompleted')} 
              />
              <ToggleButton 
                label="Trash Taken Out" 
                active={turnoverData.trashTakenOut} 
                onClick={() => handleToggle('trashTakenOut')} 
              />
              <ToggleButton 
                label="Computers Restarted" 
                active={turnoverData.computersRestarted} 
                onClick={() => handleToggle('computersRestarted')} 
              />
            </div>

            <div className="mt-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">System Status Level</label>
                <select 
                  value={turnoverData.systemStatusLevel}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, systemStatusLevel: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white outline-none focus:border-indigo-500/50 transition-all"
                >
                  <option value="Normal">Level: Normal</option>
                  <option value="Elevated">Level: Elevated</option>
                  <option value="Critical">Level: Critical</option>
                  <option value="Overdrive">Level: Overdrive</option>
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="tactical-card p-8 mb-12">
        <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-4 flex items-center gap-3">
          <AlertCircle className="w-3.5 h-3.5" /> Special Events & Briefing
        </h2>
        <textarea 
          value={turnoverData.specialEvents}
          onChange={(e) => setTurnoverData(prev => ({ ...prev, specialEvents: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-sm font-mono text-white min-h-[150px] outline-none focus:border-indigo-500/50 transition-all"
          placeholder="Briefing notes for the incoming shift..."
        />
      </section>

      <div className="flex items-center justify-between gap-6">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] italic">
          * Ensure all terminal nodes are synchronized before final submission.
        </p>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="tactical-btn-indigo px-12 py-4 shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group h-14 min-w-[200px]"
        >
          {isSaving ? (
            <Activity className="w-5 h-5 animate-spin" />
          ) : showSuccess ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>LOGGED</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
               <Save size={18} />
               <span>COMPLETE TURNOVER</span>
               <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function StaticField({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="group/field">
      <div className="flex items-center gap-2 mb-2 ml-1">
        <Icon size={12} className="text-slate-600 group-hover/field:text-indigo-400 transition-colors" />
        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
      </div>
      <div className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-xs font-black text-white group-hover/field:border-indigo-500/20 transition-all">
        {value}
      </div>
    </div>
  );
}

function ToggleButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${
        active 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-white' 
          : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
      }`}
    >
      <span className={`text-[11px] font-black uppercase tracking-widest ${active ? 'text-emerald-400' : ''}`}>{label}</span>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
        active ? 'bg-emerald-500 text-white' : 'bg-white/10'
      }`}>
        {active ? <CheckCircle2 size={14} /> : <Circle size={14} className="opacity-20" />}
      </div>
    </button>
  );
}
