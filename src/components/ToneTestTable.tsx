import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  setDoc,
  addDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { ToneTestRecord } from '../types';
import { useAuthRole as useRole } from '../hooks/useAuthRole';
import { Check, X, Loader2, Plus, Trash2, Users, ClipboardCopy, Trash, RefreshCw, Clock, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function ToneTestTable() {
  const [records, setRecords] = useState<ToneTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newUnit, setNewUnit] = useState({ 
    unit: '', 
    date: new Date().toLocaleDateString(), 
    time: '', 
    callSign: '', 
    tenFortyTwo: '' 
  });
  const [focusedTimeField, setFocusedTimeField] = useState<string | null>(null); // 'new' or record.id
  const { isEditor, isAdmin } = useRole();

  const ALL_UNITS = [
    ...Array.from({ length: 25 }, (_, i) => `MED-${i}`),
    'ALS-01', 'ALS-02', 'ALS-03', 'ALS-04', 'ALS-06', 'ALS-07', 'ALS-11', 'ALS-12', 'ALS-17', 'ALS-19', 'ALS-21', 'ALS-23', 'ALS-24', 'ALS-27'
  ];

  const handleResetTable = async () => {
    if (!isAdmin || !confirm('This will RESET the table to default units. Existing data will be purged. Continue?')) return;
    try {
      // 1. Clear all
      const snap = await getDocs(collection(db, 'toneTests'));
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'toneTests', d.id)));
      await Promise.all(deletePromises);

      // 2. Seed Defaults
      const DEFAULT_UNITS = [
        ...Array.from({ length: 10 }, (_, i) => `MED-${i}`), // 0-9
        ...Array.from({ length: 7 }, (_, i) => `MED-${i + 12}`) // 12-18
      ];

      const addPromises = DEFAULT_UNITS.map(unit => 
        addDoc(collection(db, 'toneTests'), {
          unit,
          date: new Date().toLocaleDateString(),
          time: '',
          callSign: '',
          tenFortyTwo: '',
          ttDone: true, // DEFAULT TO UP STATE
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.email
        })
      );
      await Promise.all(addPromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'toneTests/resetTable');
    }
  };

  const handleClearFleet = async () => {
    if (!isAdmin || !confirm('This will CLEAR all recorded units. Are you sure?')) return;
    try {
      const snap = await getDocs(collection(db, 'toneTests'));
      const batchPromises = snap.docs.map(d => deleteDoc(doc(db, 'toneTests', d.id)));
      await Promise.all(batchPromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'toneTests/clear');
    }
  };

  const handleCopyTable = () => {
    const lines = [
      "ID\tUnit\tDate\tTime\tCall-Sign\t10-42"
    ];
    records.forEach((r, i) => {
      const timeStr = r.time || '--:--';
      const callSign = r.unit.startsWith('MED') ? 'N/A' : (r.callSign || '--');
      const tenFortyTwo = r.tenFortyTwo || '--:--';
      lines.push(`${i + 1}\t${r.unit}\t${r.date}\t${timeStr}\t${callSign}\t${tenFortyTwo}`);
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      alert("Table copied to clipboard!");
    });
  };

  const handleResetShift = async () => {
    if (!isAdmin || !confirm('Start new shift? This will clear all Up-Times and Statuses for the current fleet.')) return;
    try {
      const batchPromises = records.map(record => 
        setDoc(doc(db, 'toneTests', record.id!), {
          time: '',
          ttDone: false,
          tenFortyTwo: '',
          date: new Date().toLocaleDateString(),
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.email
        }, { merge: true })
      );
      await Promise.all(batchPromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'toneTests/reset');
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const q = query(collection(db, 'toneTests'));
      const onSnapshotUnsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ToneTestRecord));
        
        // Custom Sort: MEDIC (MED-) first, then ALS-, and both numerically within group
        const sorted = data.sort((a, b) => {
          const unitA = a.unit.toUpperCase();
          const unitB = b.unit.toUpperCase();
          
          const isMedA = unitA.startsWith('MED');
          const isMedB = unitB.startsWith('MED');

          // If one is MED and the other isn't, MED comes first
          if (isMedA && !isMedB) return -1;
          if (!isMedA && isMedB) return 1;

          // If both are same prefix TYPE (both MED or both ALS), sort numerically
          // Extract the number part: "MED-10" -> 10
          const getNum = (u: string) => parseInt(u.replace(/[^0-9]/g, '')) || 0;
          const numA = getNum(unitA);
          const numB = getNum(unitB);

          if (numA !== numB) return numA - numB;
          return unitA.localeCompare(unitB);
        });

        setRecords(sorted);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'toneTests');
      });

      return () => onSnapshotUnsub();
    });

    return () => unsubscribe();
  }, []);

  const handleAddUnit = async () => {
    if (!newUnit.unit) return;
    try {
      const entry = {
        ...newUnit,
        callSign: newUnit.unit.toUpperCase().startsWith('MED') ? '' : newUnit.callSign,
        ttDone: true, // DEFAULT TO UP STATE
        duration: '',
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email
      };
      await addDoc(collection(db, 'toneTests'), entry);
      setNewUnit({ unit: '', date: '', time: '', callSign: '', tenFortyTwo: '' });
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'toneTests/new');
    }
  };

  const handleDeleteUnit = async (id: string, name: string) => {
    if (!isAdmin || !confirm(`Decommission unit ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'toneTests', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `toneTests/${id}`);
    }
  };

  const toggleTtDone = async (record: ToneTestRecord) => {
    if (!isEditor || !record.id) return;
    const path = `toneTests/${record.id}`;
    try {
      await setDoc(doc(db, 'toneTests', record.id), {
        ttDone: !record.ttDone,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleFieldUpdate = async (id: string, field: keyof ToneTestRecord, value: any) => {
    if (!isEditor) return;
    const path = `toneTests/${id}`;
    try {
      await setDoc(doc(db, 'toneTests', id), {
        [field]: value,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center gap-6 bg-bg-surface/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {isEditor && (
          <div className="flex flex-wrap gap-4 relative z-10">
            <button
              onClick={handleResetTable}
              className="flex items-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-95 group/btn"
            >
              <RefreshCw className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-500" />
              Reset Fleet Matrix
            </button>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 border text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-xl active:scale-95",
                isAdding 
                  ? "bg-white/10 border-indigo-500/50 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                  : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
              )}
            >
              <Plus className={cn("w-4 h-4 transition-transform duration-300", isAdding && "rotate-45")} />
              {isAdding ? "Decline Addition" : "Initialize Unit"}
            </button>

            <button
              onClick={handleClearFleet}
              className="group/delete flex items-center gap-3 px-6 py-3 bg-rose-600/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-xl active:scale-95 shadow-lg shadow-rose-500/5"
            >
              <Trash2 className="w-4 h-4 group-hover/delete:scale-110 transition-transform" />
              Purge Status
            </button>
          </div>
        )}

        <button
          onClick={handleCopyTable}
          className="flex items-center gap-3 px-6 py-3 ml-auto bg-black/40 border border-white/5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:border-white/20 transition-all rounded-xl relative z-10"
        >
          <ClipboardCopy className="w-4 h-4 text-indigo-400" />
          Data Export
        </button>
      </div>

      <div className="overflow-hidden bg-bg-surface/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/40 border-b border-white/5">
              <th className="w-16 p-6 text-center text-[10px] text-slate-600 uppercase font-black tracking-[0.3em]">ID</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Unit Chassis</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Log Date</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Up-Time</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Call-Sign</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">10-42 Code</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] text-center">Bio-Sync</th>
              {isAdmin && <th className="w-16 p-6 border-l border-white/5"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence mode="popLayout">
              {records.map((record, idx) => (
                <motion.tr 
                  key={record.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-indigo-500/[0.02] transition-colors group"
                >
                  <td className="p-6 text-center text-[10px] text-slate-600 font-mono font-bold tracking-widest border-r border-white/5">
                    {(idx + 1).toString().padStart(3, '0')}
                  </td>
                  <td className="px-6 py-4 border-r border-white/5">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1 leading-none">Chassis</span>
                      <span className="text-lg font-black text-white group-hover:text-indigo-400 glow-text-indigo transition-colors tracking-tight">{record.unit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-r border-white/5">
                    <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase px-3 py-1 bg-black/20 rounded-full border border-white/5">
                      {record.date}
                    </span>
                  </td>
                  <td className="px-6 py-4 border-r border-white/5 relative group/time min-w-[140px]">
                    <div className="flex items-center gap-3">
                      <Clock className="w-3.5 h-3.5 text-indigo-500/50" />
                      <input
                        type="text"
                        value={record.time}
                        disabled={!isEditor}
                        onFocus={() => setFocusedTimeField(record.id!)}
                        onBlur={() => setTimeout(() => setFocusedTimeField(null), 200)}
                        onChange={(e) => handleFieldUpdate(record.id!, 'time', e.target.value)}
                        className="bg-transparent border-none focus:ring-0 rounded text-base text-white font-mono outline-none w-full placeholder:text-slate-700"
                        placeholder="--:--"
                      />
                    </div>
                    {focusedTimeField === record.id && isEditor && (
                      <button
                        onClick={() => handleFieldUpdate(record.id!, 'time', getCurrentTime())}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-xl shadow-indigo-500/40 animate-in fade-in zoom-in slide-in-from-right-2 duration-300 z-10 hover:bg-indigo-500 uppercase tracking-widest"
                      >
                        Capture
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 border-r border-white/5">
                    <input
                      type="text"
                      value={record.callSign}
                      disabled={!isEditor || record.unit.toUpperCase().startsWith('MED')}
                      onChange={(e) => handleFieldUpdate(record.id!, 'callSign', e.target.value)}
                      className={cn(
                        "bg-transparent border-none focus:ring-0 rounded text-xs outline-none w-full font-black tracking-[0.2em] uppercase placeholder:text-slate-800 transition-all",
                        record.unit.toUpperCase().startsWith('MED') && "opacity-10 cursor-not-allowed"
                      )}
                      placeholder={record.unit.toUpperCase().startsWith('MED') ? "INACTIVE" : "IDENT_CODE"}
                    />
                  </td>
                  <td className="px-6 py-4 border-r border-white/5">
                     <input
                      type="text"
                      value={record.tenFortyTwo}
                      disabled={!isEditor}
                      onChange={(e) => handleFieldUpdate(record.id!, 'tenFortyTwo', e.target.value)}
                      className="bg-transparent border-none focus:ring-0 rounded text-base text-white outline-none w-full font-mono placeholder:text-slate-800"
                      placeholder="STNDBY"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleTtDone(record)}
                      disabled={!isEditor}
                      className={cn(
                        "relative w-12 h-6 rounded-full transition-all duration-500 overflow-hidden",
                        !isEditor ? "opacity-30 cursor-not-allowed" : "hover:scale-105 active:scale-95",
                        record.ttDone 
                          ? "bg-emerald-500/20 border border-emerald-500/40" 
                          : "bg-rose-500/10 border border-rose-500/20"
                      )}
                    >
                      <motion.div 
                        animate={{ x: record.ttDone ? 24 : 4 }}
                        className={cn(
                          "w-4 h-4 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]",
                          record.ttDone ? "bg-emerald-500" : "bg-rose-500"
                        )}
                      />
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-center border-l border-white/5">
                      <button
                        onClick={() => handleDeleteUnit(record.id!, record.unit)}
                        className="text-slate-600 hover:text-rose-500 transition-all hover:scale-110"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  )}
                </motion.tr>
              ))}

              {isAdding && (
                <motion.tr 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-indigo-500/[0.03] transition-colors duration-500 shadow-inner"
                >
                  <td className="p-6 text-center text-indigo-500">
                    <Activity className="w-4 h-4 mx-auto animate-pulse" />
                  </td>
                  <td className="px-6 py-4 border-r border-white/5">
                    <select
                      className="bg-black/40 border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-2 outline-none text-white font-black text-xs w-full uppercase tracking-widest transition-all"
                      value={newUnit.unit}
                      onChange={e => setNewUnit({...newUnit, unit: e.target.value})}
                    >
                      <option value="">SELECT TRUCK</option>
                      <optgroup label="MED Units">
                        {ALL_UNITS.filter(u => u.startsWith('MED')).map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </optgroup>
                      <optgroup label="ALS Units">
                        {ALL_UNITS.filter(u => u.startsWith('ALS')).map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </optgroup>
                    </select>
                  </td>
                  <td className="px-6 py-4 border-r border-white/5">
                    <span className="text-[10px] text-slate-500 font-black tracking-[0.2em] block px-3 py-1 bg-black/20 rounded-full border border-white/5 text-center">
                      {newUnit.date}
                    </span>
                  </td>
                  <td className="px-6 py-4 border-r border-white/5 relative group/newtime">
                    <input
                      type="text"
                      placeholder="AUTO"
                      onFocus={() => setFocusedTimeField('new')}
                      onBlur={() => setTimeout(() => setFocusedTimeField(null), 200)}
                      className="bg-transparent border-none outline-none text-base font-mono text-white w-full text-center"
                      value={newUnit.time}
                      onChange={e => setNewUnit({...newUnit, time: e.target.value})}
                    />
                    {focusedTimeField === 'new' && (
                      <button
                        onClick={() => setNewUnit({...newUnit, time: getCurrentTime()})}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-xl shadow-indigo-500/40 animate-in fade-in zoom-in duration-300 z-10 hover:bg-indigo-500"
                      >
                        TIMESTAMP
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 border-r border-white/5 text-center">
                    {newUnit.unit && newUnit.unit.startsWith('ALS') ? (
                      <input
                        type="text"
                        placeholder="ID_CODE"
                        className="bg-black/40 border border-white/10 focus:border-indigo-500/50 rounded-xl px-4 py-2 outline-none text-[10px] text-indigo-400 font-black tracking-[0.3em] uppercase w-full text-center"
                        value={newUnit.callSign}
                        onChange={e => setNewUnit({...newUnit, callSign: e.target.value})}
                      />
                    ) : (
                      <span className="text-[9px] font-black tracking-[0.2em] text-slate-700 uppercase italic">Static</span>
                    )}
                  </td>
                  <td className="px-6 py-4 border-r border-white/5">
                    <input
                      type="text"
                      placeholder="TIME_OUT"
                      className="bg-transparent border-none outline-none text-base font-mono text-white text-center w-full"
                      value={newUnit.tenFortyTwo}
                      onChange={e => setNewUnit({...newUnit, tenFortyTwo: e.target.value})}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={handleAddUnit}
                      disabled={!newUnit.unit}
                      className={cn(
                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        newUnit.unit ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 active:scale-95" : "bg-white/5 text-slate-700 cursor-not-allowed"
                      )}
                    >
                      Authorize
                    </button>
                  </td>
                  {isAdmin && <td className="px-6 py-4 border-l border-white/5 text-center">
                    <button onClick={() => setIsAdding(false)} className="text-slate-600 hover:text-white transition-colors">
                      <X className="w-5 h-5 mx-auto" />
                    </button>
                  </td>}
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
