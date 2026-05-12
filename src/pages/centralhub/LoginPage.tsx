import React, { useState } from 'react';
import { useTerminal } from '../../context/TerminalContext';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Terminal, Shield, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function LoginPage() {
  const { loginTerminalUser } = useTerminal();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      // Use Firebase Email/Password Auth
      // We append a suffix to allow "usernames"
      const email = username.toLowerCase().includes('@') ? username : `${username.toLowerCase()}@dispatcher.terminal`;
      const { signInWithEmailAndPassword, auth } = await import('../../lib/firebase');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        // Fetch role from Firestore
        const userRef = doc(db, 'terminal_users', username.toLowerCase());
        const userSnap = await getDoc(userRef);
        const role = userSnap.exists() ? userSnap.data().role : 'dispatcher';

        setStatus('success');
        setTimeout(() => {
          loginTerminalUser(username.toLowerCase(), role);
        }, 800);
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('CREDENTIAL_MISMATCH // ACCESS_DENIED');
      } else {
        setErrorMsg('SYSTEM_ERROR // UPLINK_FAILURE');
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="tactical-card p-10 space-y-10 border-indigo-500/20 bg-black/40 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Shield className="w-8 h-8 text-indigo-400 relative z-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                Sector <span className="text-indigo-500 not-italic">Login</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">
                Authenticating Tactical Node Access
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-4">
              <div className="space-y-2 group">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Operator ID</label>
                <div className="relative">
                  <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="off"
                    placeholder="Enter ID..."
                    className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-12 text-white font-mono text-sm focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Access Protocol</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-12 text-white font-mono text-sm focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-slate-700"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {status === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-3"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className={`
                w-full h-16 rounded-[2rem] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 group relative overflow-hidden
                ${status === 'success' 
                  ? 'bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)]' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:scale-[1.02] active:scale-95 disabled:opacity-50'}
              `}
            >
              {status === 'loading' ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : status === 'success' ? (
                <>ACCESS_GRANTED <div className="w-2 h-2 rounded-full bg-white animate-ping" /></>
              ) : (
                <>
                  Establish Connection 
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Meta */}
          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Uplink Active</span>
            </div>
            <span className="text-[8px] font-mono text-slate-700 tracking-tighter uppercase font-bold">Node V.02_Alpha</span>
          </div>
        </div>

        <p className="mt-8 text-center text-[9px] text-zinc-600 uppercase tracking-[0.4em] font-black">
          Unauthorized attempts will be logged by the system matrix
        </p>
      </motion.div>
    </div>
  );
}
