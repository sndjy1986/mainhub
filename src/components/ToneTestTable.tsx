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
import { Check, X, Loader2, Plus, Trash2, Users, ClipboardCopy, Trash, RefreshCw } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex items-center gap-3">
        {isEditor && (
          <div className="flex gap-2">
            <button
              onClick={handleResetTable}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Table
            </button>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 border text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-xl active:scale-95",
                isAdding 
                  ? "bg-slate-700 border-white/20 text-white" 
                  : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20"
              )}
            >
              <Plus className="w-4 h-4" />
              {isAdding ? "Cancel" : "Add Unit"}
            </button>

            <button
              onClick={handleClearFleet}
              className="flex items-center gap-2 px-6 py-2.5 bg-rose-600/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-xl active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              Save/Clear
            </button>
          </div>
        )}

        <button
          onClick={handleCopyTable}
          className="flex items-center gap-2 px-4 py-2 ml-auto bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all rounded-xl"
        >
          <ClipboardCopy className="w-3.5 h-3.5" />
          Export Table
        </button>
      </div>

      <div className="overflow-hidden bg-bg-surface rounded-lg border border-border-subtle shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1A1D23] border-b border-border-subtle">
              <th className="w-12 p-4 text-center text-[10px] text-text-muted border-r border-border-subtle uppercase font-bold tracking-widest">ID</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-text-secondary tracking-widest border-r border-border-subtle">Unit Chassis</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-text-secondary tracking-widest border-r border-border-subtle">Log Date</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-text-secondary tracking-widest border-r border-border-subtle">Up-Time</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-text-secondary tracking-widest border-r border-border-subtle">Call-Sign</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-text-secondary tracking-widest border-r border-border-subtle">10-42 Code</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-text-secondary tracking-widest text-center">Status</th>
              {isAdmin && <th className="w-12 p-4 border-l border-border-subtle"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50">
            <AnimatePresence mode="popLayout">
              {records.map((record, idx) => (
                <motion.tr 
                  key={record.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "hover:bg-[#1E2228] transition-colors group",
                    idx % 2 === 1 ? "bg-bg-surface" : "bg-[#16191E]/40"
                  )}
                >
                  <td className="p-4 text-center text-[10px] text-text-muted border-r border-border-subtle font-mono">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-brand-blue border-r border-border-subtle group-hover:text-white transition-colors">
                    {record.unit}
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle bg-black/10">
                    <span className="text-xs text-text-muted font-medium px-1 select-none">
                      {record.date}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle relative group/time">
                    <input
                      type="text"
                      value={record.time}
                      disabled={!isEditor}
                      onFocus={() => setFocusedTimeField(record.id!)}
                      onBlur={() => setTimeout(() => setFocusedTimeField(null), 200)}
                      onChange={(e) => handleFieldUpdate(record.id!, 'time', e.target.value)}
                      className="bg-transparent border-none focus:ring-1 focus:ring-brand-blue/30 rounded text-sm text-text-primary font-mono outline-none w-full"
                    />
                    {focusedTimeField === record.id && isEditor && (
                      <button
                        onClick={() => handleFieldUpdate(record.id!, 'time', getCurrentTime())}
                        className="absolute right-1 top-1/2 -translate-y-1/2 bg-brand-blue text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg animate-in fade-in zoom-in duration-200 z-10 hover:bg-blue-400"
                      >
                        NOW?
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle italic text-text-muted text-xs">
                    <input
                      type="text"
                      value={record.callSign}
                      disabled={!isEditor || record.unit.toUpperCase().startsWith('MED')}
                      onChange={(e) => handleFieldUpdate(record.id!, 'callSign', e.target.value)}
                      className={cn(
                        "bg-transparent border-none focus:ring-1 focus:ring-brand-blue/30 rounded text-xs outline-none w-full font-medium placeholder:text-text-muted",
                        record.unit.toUpperCase().startsWith('MED') && "opacity-20 cursor-not-allowed"
                      )}
                      placeholder={record.unit.toUpperCase().startsWith('MED') ? "N/A" : "ASSIGNED"}
                    />
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle">
                     <input
                      type="text"
                      value={record.tenFortyTwo}
                      disabled={!isEditor}
                      onChange={(e) => handleFieldUpdate(record.id!, 'tenFortyTwo', e.target.value)}
                      className="bg-transparent border-none focus:ring-1 focus:ring-brand-blue/30 rounded text-sm text-text-primary outline-none w-full font-mono"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleTtDone(record)}
                      disabled={!isEditor}
                      className={cn(
                        "inline-flex items-center justify-center p-1.5 rounded transition-all duration-200",
                        !isEditor ? "cursor-not-allowed opacity-30" : "hover:scale-110 active:scale-95",
                        record.ttDone 
                          ? "bg-green-500/10 text-green-400 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.1)]" 
                          : "bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                      )}
                    >
                      {record.ttDone ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-center border-l border-border-subtle">
                      <button
                        onClick={() => handleDeleteUnit(record.id!, record.unit)}
                        className="text-text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </motion.tr>
              ))}

              {isAdding && (
                <motion.tr 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1A1D23]"
                >
                  <td className="p-4 text-center text-brand-blue">
                    <Plus className="w-3 h-3 mx-auto" />
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle">
                    <select
                      className="bg-bg-surface border border-border-subtle focus:border-brand-blue rounded px-2 py-1 outline-none text-white font-bold text-sm w-full"
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
                  <td className="px-4 py-3 border-r border-border-subtle bg-black/10">
                    <span className="text-[10px] text-text-muted font-bold block px-1">
                      {newUnit.date}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle relative group/newtime">
                    <input
                      type="text"
                      placeholder="TIME"
                      onFocus={() => setFocusedTimeField('new')}
                      onBlur={() => setTimeout(() => setFocusedTimeField(null), 200)}
                      className="bg-transparent border-none outline-none text-sm font-mono text-text-primary w-full"
                      value={newUnit.time}
                      onChange={e => setNewUnit({...newUnit, time: e.target.value})}
                    />
                    {focusedTimeField === 'new' && (
                      <button
                        onClick={() => setNewUnit({...newUnit, time: getCurrentTime()})}
                        className="absolute right-1 top-1/2 -translate-y-1/2 bg-brand-blue text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg animate-in fade-in zoom-in duration-200 z-10 hover:bg-blue-400"
                      >
                        NOW?
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle">
                    {newUnit.unit && newUnit.unit.startsWith('ALS') ? (
                      <input
                        type="text"
                        placeholder="UNIT CODE"
                        className="bg-transparent border-none outline-none text-xs text-brand-blue font-bold tracking-widest uppercase w-full"
                        value={newUnit.callSign}
                        onChange={e => setNewUnit({...newUnit, callSign: e.target.value})}
                      />
                    ) : (
                      <span className="text-xs italic text-text-muted opacity-50 block w-full text-center">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle">
                    <input
                      type="text"
                      placeholder="10-42 TIME"
                      className="bg-transparent border-none outline-none text-sm font-mono text-text-primary"
                      value={newUnit.tenFortyTwo}
                      onChange={e => setNewUnit({...newUnit, tenFortyTwo: e.target.value})}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={handleAddUnit}
                      disabled={!newUnit.unit}
                      className={cn(
                        "p-1 px-3 rounded text-[10px] font-bold uppercase transition-colors",
                        newUnit.unit ? "bg-brand-blue hover:bg-blue-500 text-white" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      )}
                    >
                      Save
                    </button>
                  </td>
                  {isAdmin && <td className="px-4 py-3 border-l border-border-subtle text-center">
                    <button onClick={() => setIsAdding(false)} className="text-text-muted hover:text-white">
                      <X className="w-3.5 h-3.5 mx-auto" />
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
