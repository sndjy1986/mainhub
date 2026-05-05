import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Save, AlertCircle, Terminal, Lock, Info, Radio, Activity } from 'lucide-react';
import { useTerminal } from '../../context/TerminalContext';

export function AdminPage() {
  const { systemAdvisory, setSystemAdvisory } = useTerminal();
  const [advisoryInput, setAdvisoryInput] = useState(systemAdvisory);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setSystemAdvisory(advisoryInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <>
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

      <div className="grid grid-cols-1 gap-8">
        {/* System Advisory Configuration */}
        <section className="backdrop-blur-md bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-8 overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Radio className="w-32 h-32 text-indigo-400" />
           </div>

           <div className="space-y-2 relative">
             <h3 className="text-xl font-bold text-white flex items-center gap-3">
               <Terminal className="w-5 h-5 text-indigo-400" />
               Global System Advisory
             </h3>
             <p className="text-sm text-slate-400">This message will broadcast across all operational consoles in real-time.</p>
           </div>

           <div className="space-y-4 relative">
              <textarea
                value={advisoryInput}
                onChange={(e) => setAdvisoryInput(e.target.value)}
                placeholder="Enter new system-wide advisory message..."
                className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-6 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium leading-relaxed resize-none"
              />
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supports plain text broadcasting</span>
                </div>
                <button
                  onClick={handleSave}
                  disabled={advisoryInput === systemAdvisory && !isSaved}
                  className={`
                    flex items-center gap-3 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all
                    ${isSaved 
                      ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                      : advisoryInput === systemAdvisory
                        ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                        : 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-xl shadow-indigo-500/20 active:scale-95'}
                  `}
                >
                  {isSaved ? (
                    <>
                      <Shield className="w-4 h-4" />
                      Broadcast Deployed
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Commit Change
                    </>
                  )}
                </button>
              </div>
           </div>

           <div className="pt-6 flex gap-4 border-t border-white/5">
              <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex-1 flex items-start gap-4">
                 <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                 <div>
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">Administrative Note</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed uppercase">
                       Changes to the advisory are volatile and will persist until the next environment restart unless synced to a permanent data store.
                    </p>
                 </div>
              </div>
           </div>
        </section>

        {/* System Hardware Diagnostics Placeholder */}
        <section className="bg-black/20 border border-white/5 rounded-3xl p-8 border-dashed flex flex-col items-center justify-center text-center opacity-40">
           <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-slate-500" />
           </div>
           <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Extended Admin Tools Locked</h4>
           <p className="text-[10px] text-slate-600 uppercase tracking-tight mt-1">Requires biometric verification (hardware link failure)</p>
        </section>
      </div>
    </>
  );
}
export default AdminPage;
