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
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Inbox
} from 'lucide-react';
import { format } from 'date-fns';
import { useTerminal } from '../context/TerminalContext';
import { db, handleFirestoreError, PersonnelMember } from '../lib/firebase';
import { addDoc, collection, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { TEAM_MEMBERS, ALSSUP_OPTIONS, MEDSUP_OPTIONS } from '../lib/shiftConstants';

const STORAGE_KEY = "shiftReportDraft_v2";

interface TurnoverData {
  date: string;
  currentTeamLead: string;
  oncomingTeamLead: string;
  alssup: string;
  medsup: string;
  zuluPrimary: string;
  zuluSecondary: string;

  // Handover Checks
  floorsVacuumed: boolean;
  computersRestarted: boolean;
  wipedDown: boolean;
  timesDqc: boolean;

  // Other Issues
  unitsOut: string;
  badCalls: string;
  busyAreas: string;

  systemStatusLevel: string;
  specialEvents: string;
}

export default function ShiftTurnover({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { terminalUser } = useTerminal();
  const [personnel, setPersonnel] = useState<PersonnelMember[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  
  const [turnoverData, setTurnoverData] = useState<TurnoverData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    currentTeamLead: '',
    oncomingTeamLead: '',
    alssup: '',
    medsup: '',
    zuluPrimary: '',
    zuluSecondary: '',
    floorsVacuumed: false,
    computersRestarted: false,
    wipedDown: false,
    timesDqc: false,
    unitsOut: '',
    badCalls: '',
    busyAreas: '',
    systemStatusLevel: 'Normal',
    specialEvents: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync active personnel list and load shift report draft
  useEffect(() => {
    // 1. Sync personnel
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.personnel) {
          setPersonnel(data.personnel);
        }
      }
    });

    // 2. Load draft
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setReportData(draft);
        setTurnoverData(prev => ({
          ...prev,
          date: draft.date || prev.date,
          currentTeamLead: draft.name || prev.currentTeamLead,
          alssup: draft.alssup || prev.alssup,
          medsup: draft.medsup || prev.medsup,
          zuluPrimary: draft.zuluPrimary || prev.zuluPrimary,
          zuluSecondary: draft.zuluSecondary || prev.zuluSecondary,
        }));
      } catch (err) {
        console.error("Draft load error:", err);
      }
    }

    return () => unsubscribe();
  }, []);

  const SHIFT_LEADS = [
    { name: 'Corrine Skelly', email: 'cskelly@medshore.com' },
    { name: 'Erin Brandenburg', email: 'ebrandenburg@medshore.com' },
    { name: 'Joseph Sanders', email: 'jsanders@medshore.com' },
    { name: 'Crystal Culbertson', email: 'cculbertson@medshore.com' }
  ];

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
          date: turnoverData.date,
          currentTeamLead: turnoverData.currentTeamLead || 'PENDING',
          oncomingTeamLead: turnoverData.oncomingTeamLead || 'PENDING',
          alssup: turnoverData.alssup || 'None',
          medsup: turnoverData.medsup || 'None',
          zuluUnits: `${turnoverData.zuluPrimary || ''} ${turnoverData.zuluSecondary ? '/ ' + turnoverData.zuluSecondary : ''}`.trim() || 'NONE'
        },
        checks: {
          floorsVacuumed: turnoverData.floorsVacuumed,
          computersRestarted: turnoverData.computersRestarted,
          wipedDown: turnoverData.wipedDown,
          timesDqc: turnoverData.timesDqc
        },
        otherIssues: {
          unitsOut: turnoverData.unitsOut,
          badCalls: turnoverData.badCalls,
          busyAreas: turnoverData.busyAreas
        },
        specialEvents: turnoverData.specialEvents,
        systemStatusLevel: turnoverData.systemStatusLevel,
        submittedAt: serverTimestamp(),
        submittedBy: terminalUser?.username || 'Operator'
      };

      await addDoc(collection(db, 'shift_turnovers'), finalData);
      
      const copyText = `TURNOVER REPORT
Date: ${finalData.meta.date}
Current Team Lead: ${finalData.meta.currentTeamLead}
Oncoming Team Lead: ${finalData.meta.oncomingTeamLead}

SUPERVISORS
ALSSUP: ${finalData.meta.alssup}
MEDSUP: ${finalData.meta.medsup}

ZULU ON-CALL
Zulu Units: ${finalData.meta.zuluUnits}

CHECKS
Floors Vacuumed: ${finalData.checks.floorsVacuumed ? "Yes" : "No"}
Computers Restarted: ${finalData.checks.computersRestarted ? "Yes" : "No"}
Wiped Down: ${finalData.checks.wipedDown ? "Yes" : "No"}
Times & DQC: ${finalData.checks.timesDqc ? "Yes" : "No"}

OTHER ISSUES
Units Out: ${finalData.otherIssues.unitsOut || "None"}
Bad Calls: ${finalData.otherIssues.badCalls || "None"}
Busy Areas: ${finalData.otherIssues.busyAreas || "None"}

System Level: ${finalData.systemStatusLevel}

SPECIAL EVENTS & BRIEFING
${finalData.specialEvents || "None"}
`;
      await navigator.clipboard.writeText(copyText);
      alert("Turnover report has been copied to the clipboard!\n\nEmail window is launching with the oncoming Team Lead and Supervisor pre-loaded.");

      // Email formatting & launch
      const oncomingLeadObj = SHIFT_LEADS.find(p => p.name === turnoverData.oncomingTeamLead);
      const oncomingEmail = oncomingLeadObj?.email || '';
      
      const emailsList = [
        oncomingEmail, 
        "gwilliams@medshore.com"
      ].filter(Boolean).join(";");
      
      const formatDateForSubject = (dateStr: string) => {
        if (!dateStr) return "";
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const [y, m, d] = parts;
        return `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`;
      };

      const subject = `Shift Turnover Report - ${formatDateForSubject(turnoverData.date)}`;
      const body = `*** FULL TURNOVER REPORT COPIED TO CLIPBOARD ***\n\nSummary:\n- Current Lead: ${turnoverData.currentTeamLead}\n- Oncoming Lead: ${turnoverData.oncomingTeamLead}\n- Date: ${turnoverData.date}\n\nClick here and press Ctrl+V to paste the detailed handover report.`;
      
      const mailto = `mailto:${encodeURIComponent(emailsList)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;

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
        {/* Left Column: Shift Info & Supervisors & Zulu */}
        <section className="space-y-6">
          <div className="tactical-card p-8 bg-[#101014]/60 backdrop-blur-xl border-indigo-500/20 space-y-6">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 border-b border-white/5 pb-4 flex items-center gap-3">
              <Clipboard className="w-3.5 h-3.5" /> Shift Info
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1 block">Date</label>
                <input 
                  type="date"
                  value={turnoverData.date}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1 block">Current Team Lead</label>
                <select 
                  value={turnoverData.currentTeamLead}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, currentTeamLead: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500/50 transition-all"
                >
                  <option className="bg-[#1a1a24] text-white" value="">-- SELECT CURRENT TEAM LEAD --</option>
                  {SHIFT_LEADS.map(lead => (
                    <option className="bg-[#1a1a24] text-white" key={lead.name} value={lead.name}>{lead.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1 block">Oncoming Team Lead</label>
                <select 
                  value={turnoverData.oncomingTeamLead}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, oncomingTeamLead: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500/50 transition-all"
                >
                  <option className="bg-[#1a1a24] text-white" value="">-- SELECT ONCOMING TEAM LEAD --</option>
                  {SHIFT_LEADS.map(lead => (
                    <option className="bg-[#1a1a24] text-white" key={lead.name} value={lead.name}>{lead.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] pt-4 mb-4 border-b border-white/5 pb-4 flex items-center gap-3">
              <Activity className="w-3.5 h-3.5" /> Supervisors
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1 block">ALSSUP</label>
                <select 
                  value={turnoverData.alssup}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, alssup: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500/50 transition-all"
                >
                  <option className="bg-[#1a1a24] text-white" value="">-- SELECT --</option>
                  {ALSSUP_OPTIONS.map(opt => (
                    <option className="bg-[#1a1a24] text-white" key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1 block">Med Sup</label>
                <select 
                  value={turnoverData.medsup}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, medsup: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500/50 transition-all"
                >
                  <option className="bg-[#1a1a24] text-white" value="">-- SELECT --</option>
                  {MEDSUP_OPTIONS.map(opt => (
                    <option className="bg-[#1a1a24] text-white" key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] pt-4 mb-4 border-b border-white/5 pb-4 flex items-center gap-3">
              <Truck className="w-3.5 h-3.5" /> Zulu On-Call
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1 block">Primary</label>
                <input 
                  type="text"
                  value={turnoverData.zuluPrimary}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, zuluPrimary: e.target.value }))}
                  placeholder="ZULU Primary"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1 block">Secondary</label>
                <input 
                  type="text"
                  value={turnoverData.zuluSecondary}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, zuluSecondary: e.target.value }))}
                  placeholder="ZULU Secondary"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Checkboxes & Other Issues */}
        <section className="space-y-6">
          <div className="tactical-card p-8 space-y-6">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 border-b border-white/5 pb-4 flex items-center gap-3">
              <CheckCircle2 className="w-3.5 h-3.5" /> Handover Checks
            </h2>

            <div className="space-y-3">
              <ToggleButton 
                label="Floors Vacuumed" 
                active={turnoverData.floorsVacuumed} 
                onClick={() => handleToggle('floorsVacuumed')} 
              />
              <ToggleButton 
                label="Computers Restarted" 
                active={turnoverData.computersRestarted} 
                onClick={() => handleToggle('computersRestarted')} 
              />
              <ToggleButton 
                label="Wiped Down" 
                active={turnoverData.wipedDown} 
                onClick={() => handleToggle('wipedDown')} 
              />
              <ToggleButton 
                label="Times & DQC" 
                active={turnoverData.timesDqc} 
                onClick={() => handleToggle('timesDqc')} 
              />
            </div>

            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] pt-4 mb-4 border-b border-white/5 pb-4 flex items-center gap-3">
              <ShieldAlert className="w-3.5 h-3.5" /> Other Issues
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1 block">Units Out</label>
                <input 
                  type="text"
                  value={turnoverData.unitsOut}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, unitsOut: e.target.value }))}
                  placeholder="Units Out briefing..."
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1 block">Bad Calls</label>
                <input 
                  type="text"
                  value={turnoverData.badCalls}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, badCalls: e.target.value }))}
                  placeholder="Bad Calls log..."
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1 block">Busy Areas</label>
                <input 
                  type="text"
                  value={turnoverData.busyAreas}
                  onChange={(e) => setTurnoverData(prev => ({ ...prev, busyAreas: e.target.value }))}
                  placeholder="Busy Areas notes..."
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">System Status Level</label>
              <select 
                value={turnoverData.systemStatusLevel}
                onChange={(e) => setTurnoverData(prev => ({ ...prev, systemStatusLevel: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white outline-none focus:border-indigo-500/50 transition-all"
              >
                <option className="bg-[#1a1a24] text-white" value="Normal">Level: Normal</option>
                <option className="bg-[#1a1a24] text-white" value="Elevated">Level: Elevated</option>
                <option className="bg-[#1a1a24] text-white" value="Critical">Level: Critical</option>
                <option className="bg-[#1a1a24] text-white" value="Overdrive">Level: Overdrive</option>
              </select>
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
          className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-sm font-mono text-white min-h-[120px] outline-none focus:border-indigo-500/50 transition-all"
          placeholder="Briefing notes for the oncoming shift..."
        />
      </section>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] italic leading-relaxed">
            * SUBMITTING WILL SYNC FLIGHT NODE, COPY PLAIN REPORT, AND LAUNCH PRE-ADDRESSED OUTLOOK COMPOSE WINDOW.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="tactical-btn-indigo px-10 py-4 shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group h-14 min-w-[240px] shrink-0"
        >
          {isSaving ? (
            <Activity className="w-5 h-5 animate-spin" />
          ) : showSuccess ? (
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>LOGGED & SENT</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 justify-center">
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

function ToggleButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${
        active 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
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
