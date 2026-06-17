import React, { useState } from 'react';
import { useTerminal } from '../../context/TerminalContext';
import { Shield, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MatrixPasscodeGateProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  title?: string;
  description?: string;
}

export function MatrixPasscodeGate({ 
  children, 
  allowedRoles = ['root', 'admin', 'shift_lead'],
  title = "ELEVATED SYSTEM OVERRIDE",
  description = "Operational clearance is required to view shift logs, fleet parameters, or personnel files. Input authorization passcode."
}: MatrixPasscodeGateProps) {
  const { terminalUser, firebaseUser, loginTerminalUser } = useTerminal();
  const [passcode, setPasscode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const currentRole = terminalUser?.role || (firebaseUser ? 'admin' : null);
  const isAuthorized = currentRole && allowedRoles.includes(currentRole.toLowerCase());

  if (isAuthorized) {
    return <>{children}</>;
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;

    setStatus('loading');
    setErrorMsg('');

    setTimeout(() => {
      const cleanPass = passcode.trim();
      if (cleanPass === 'Russell1') {
        loginTerminalUser('sndjy', 'root');
        setStatus('success');
      } else if (cleanPass.toLowerCase() === 'lead123') {
        loginTerminalUser('Shift Lead', 'shift_lead');
        setStatus('success');
      } else if (cleanPass.toLowerCase() === 'williams' || cleanPass === 'Williams911') {
        loginTerminalUser('G. Williams', 'shift_lead');
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg('ACCESS_DENIED // INVALID_PASSCODE');
      }
    }, 450);
  };

  return (
    <div className="flex items-center justify-center p-6 min-h-[60vh] relative z-10">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="tactical-card p-8 space-y-6 border-indigo-500/20 bg-brand-panel/80 backdrop-blur-3xl shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative">
              <Lock className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">
                {title}
              </h2>
              <p className="text-[9px] text-text-dim font-black uppercase tracking-[0.3em]">
                Secure Sector Access protocol
              </p>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 text-center leading-relaxed font-semibold uppercase tracking-wide">
            {description}
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-dim uppercase tracking-widest block text-center">Clearance Keycard / passcode</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input 
                  type="password" 
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="ENTER ACCESS KEY..."
                  className="w-full h-12 bg-black/40 border border-white/5 rounded-xl px-12 text-center text-text-main font-mono text-xs tracking-[0.25em] focus:border-indigo-500/50 outline-none transition-all placeholder:text-text-dim/30 hover:border-white/10"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {status === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/15 flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group text-[10px]"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  OVERRIDE SECURITY 
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
