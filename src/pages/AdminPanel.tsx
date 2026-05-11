import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile, UserRole, AppSettings } from '../types';
import { Shield, UserPlus, Trash2, Loader2, CheckCircle2, DatabaseZap, Siren, ToggleLeft as Toggle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { seedInitialData } from '../lib/seed';
import { cn } from '../lib/utils';
import { useAuthRole as useRole } from '../hooks/useAuthRole';

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [isSeeding, setIsSeeding] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const { isAdmin } = useRole();

  useEffect(() => {
    let unsubSettings: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        if (!unsubSettings) {
          unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
            if (snapshot.exists()) {
              setSettings({ id: snapshot.id, ...snapshot.data() } as AppSettings);
            } else {
              setSettings({ emergencyMode: false });
            }
          }, (error) => {
              handleFirestoreError(error, OperationType.GET, 'settings/global');
          });
        }
        
        if (!unsubUsers) {
          unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
            setUsers(data);
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'users');
          });
        }
      } else {
        setUsers([]);
        setLoading(false);
        if (unsubSettings) {
          unsubSettings();
          unsubSettings = null;
        }
        if (unsubUsers) {
          unsubUsers();
          unsubUsers = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubSettings) unsubSettings();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const toggleEmergencyMode = async () => {
    if (!isAdmin) return;
    const path = 'settings/global';
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        emergencyMode: !settings?.emergencyMode,
        emergencyBackgroundOpacity: settings?.emergencyBackgroundOpacity ?? 15,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleSeed = async () => {
    if (!isAdmin) return;
    setIsSeeding(true);
    try {
      await seedInitialData();
      alert('Initial data seeded successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'seed');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !isAdmin) return;
    
    const path = 'users/new';
    try {
      const id = btoa(newEmail).replace(/\//g, '_').replace(/\+/g, '-');
      await setDoc(doc(db, 'users', id), {
        email: newEmail,
        role: newRole
      });
      setNewEmail('');
      setNewRole('viewer');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleRemoveUser = async (id: string) => {
    if (!isAdmin) return;
    const path = `users/${id}`;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-text-muted">
        <Shield className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-xs">Authorization Required</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-bg-surface rounded-lg border border-border-subtle shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-bg-surface border-b border-border-subtle flex items-center justify-between transition-colors duration-500">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-brand-blue" />
            <h2 className="font-bold text-white text-sm uppercase tracking-widest">Admin Control Module</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button
                onClick={toggleEmergencyMode}
                title={settings?.emergencyMode ? 'Disable Emergency Lights' : 'Enable Emergency Lights'}
                className={cn(
                  "p-1.5 rounded border transition-all duration-500",
                  settings?.emergencyMode 
                    ? "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,44,44,0.3)]" 
                    : "bg-bg-main text-text-muted border-border-subtle hover:text-brand-blue"
                )}
              >
                <Siren className={cn("w-3.5 h-3.5", settings?.emergencyMode && "animate-pulse")} />
              </button>
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="flex items-center gap-2 px-4 py-1.5 bg-bg-surface hover:bg-bg-main border border-border-subtle text-text-secondary rounded text-[10px] font-bold uppercase tracking-widest transition-all duration-500"
              >
                {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DatabaseZap className="w-3.5 h-3.5" />}
                {isSeeding ? 'Initializing...' : 'Reset Factory Data'}
              </button>
            </div>
          </div>

          <div className="p-6">
          <form onSubmit={handleAddUser} className="flex flex-wrap gap-4 items-end mb-8 p-5 bg-bg-surface rounded-lg border border-border-subtle transition-colors duration-500">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Network Identity (Email)</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@ems-ops.net"
                className="w-full px-4 py-2 bg-bg-main border border-border-subtle rounded text-sm text-text-primary focus:border-brand-blue outline-none transition-all"
              />
            </div>
            <div className="w-40">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Security Level</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 bg-bg-main border border-border-subtle rounded text-sm text-text-primary focus:border-brand-blue outline-none transition-all"
              >
                <option value="viewer">Level 1: Viewer</option>
                <option value="editor">Level 2: Editor</option>
                <option value="admin">Level 3: Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-brand-blue text-white rounded text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-600 transition-all flex items-center gap-2 uppercase tracking-widest"
            >
              <UserPlus className="w-4 h-4" />
              Auth User
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-text-muted text-[10px] uppercase font-bold tracking-widest border-b border-border-subtle bg-bg-surface">
                  <th className="px-4 py-4">ID Reference</th>
                  <th className="px-4 py-4">Status / Role</th>
                  <th className="px-4 py-4 text-right">Command</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/30">
                <AnimatePresence mode="popLayout">
                  {users.map((user) => (
                    <motion.tr 
                      key={user.uid}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/5 bg-bg-main transition-colors group duration-500"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-text-primary font-mono">{user.email}</td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                          user.role === 'admin' ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                          user.role === 'editor' ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" : "bg-bg-main text-text-muted border border-border-subtle"
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleRemoveUser(user.uid)}
                          className="p-2 text-text-muted hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-bg-surface border border-brand-blue/20 rounded-lg p-6 flex gap-4 shadow-xl transition-colors duration-500">
        <CheckCircle2 className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-white text-sm uppercase tracking-widest">Protocol Intelligence</h4>
          <p className="text-xs text-text-secondary mt-2 leading-relaxed">
            Encrypted logs maintain identity persistent records of all modifications. Level 2 clearance grants information write access. 
            Level 3 administrators hold absolute authority over personnel records and database integrity.
          </p>
        </div>
      </div>
    </div>
  );
}
// synchronized
