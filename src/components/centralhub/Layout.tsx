import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { useTerminal } from '../../context/TerminalContext';
import { EmergencyBackground } from './EmergencyBackground';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signIn, googleProvider } from '../../lib/firebase';
import { Shield, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { emergencyLevel } = useTerminal();
  const [user, setUser] = useState<any>(auth.currentUser);
  const [authError, setAuthError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    return auth.onAuthStateChanged((u) => setUser(u));
  }, []);

  const handleLogin = async () => {
    try {
      setAuthError(null);
      await signIn();
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError(`Domain not authorized: ${window.location.hostname}. Please add it to your Firebase Console.`);
      } else {
        setAuthError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 relative overflow-hidden font-sans">
      {/* Decorative Background Elements (Original) */}
      <div className="fixed top-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/05 rounded-full blur-[120px] pointer-events-none"></div>

      <EmergencyBackground />
      
      <Sidebar />
      <main className="pl-64 min-h-screen relative z-10">
        {!user ? (
          <div className="flex w-full h-full min-h-screen items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/5 border border-white/10 backdrop-blur-xl p-10 rounded-3xl flex flex-col items-center max-w-md w-full"
            >
              <Shield className="w-16 h-16 text-indigo-500 mb-6" />
              <h1 className="text-2xl font-bold text-white mb-2">Authentication Required</h1>
              <p className="text-slate-400 mb-8 text-center">
                Secure access is required to view the dispatch console. Please sign in with your authorized account.
              </p>
              
              {authError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-500 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                onClick={handleLogin}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                Sign In to Access
              </button>
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
// sync

