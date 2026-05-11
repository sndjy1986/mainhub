import React, { useState, useEffect } from 'react';
import { POST_DATA, INITIAL_UNITS } from '../../lib/dispatchConstants';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, onSnapshot, query, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { ToneTestRecord } from '../../types';
import { Map as MapIcon, ClipboardList, Shield, AlertCircle, Move, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'tactical' | 'logistics';

interface UnitAssignment {
  id?: string;
  unitId: string;
  postName: string;
}

export function UnitPosting() {
  const [activeTab, setActiveTab] = useState<Tab>('tactical');
  const [unitRecords, setUnitRecords] = useState<ToneTestRecord[]>([]);
  const [assignments, setAssignments] = useState<UnitAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  useEffect(() => {
    // Listen to Tone Tests
    const qTone = query(collection(db, 'toneTests'));
    const unsubTone = onSnapshot(qTone, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ToneTestRecord));
      setUnitRecords(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'toneTests');
    });

    // Listen to Unit Assignments
    const qAssign = query(collection(db, 'unitAssignments'));
    const unsubAssign = onSnapshot(qAssign, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnitAssignment));
      setAssignments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'unitAssignments');
      setLoading(false);
    });

    return () => {
      unsubTone();
      unsubAssign();
    };
  }, []);

  // Filter for MED- units that are "Up"
  const upUnits = unitRecords.filter(r => 
    r.unit.toUpperCase().startsWith('MED') && 
    r.time && 
    !r.tenFortyTwo
  );

  const handleUnitClick = (unitId: string) => {
    if (selectedUnit === unitId) {
      setSelectedUnit(null);
    } else {
      setSelectedUnit(unitId);
    }
  };

  const handlePostClick = async (postName: string) => {
    if (!selectedUnit) return;

    try {
      // Find if this unit already has an assignment record
      const existing = assignments.find(a => a.unitId === selectedUnit);
      const assignmentId = existing?.id || selectedUnit;

      await setDoc(doc(db, 'unitAssignments', assignmentId), {
        unitId: selectedUnit,
        postName: postName,
        assignedAt: new Date().toISOString()
      });

      setSelectedUnit(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'unitAssignments');
    }
  };

  const clearAssignment = async (unitId: string) => {
    try {
      const existing = assignments.find(a => a.unitId === unitId);
      if (existing?.id) {
        await deleteDoc(doc(db, 'unitAssignments', existing.id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `unitAssignments/${unitId}`);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-80px)] flex flex-col relative bg-bg-main rounded-xl overflow-hidden mt-2 border border-white/5 shadow-2xl">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-2 bg-bg-surface border-b border-white/5 shrink-0">
        <button
          onClick={() => setActiveTab('tactical')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all",
            activeTab === 'tactical' 
              ? "bg-indigo-500 text-white shadow-lg shadow-brand-indigo/20" 
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          )}
        >
          <MapIcon size={14} />
          Tactical Map
        </button>
        <button
          onClick={() => setActiveTab('logistics')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all",
            activeTab === 'logistics' 
              ? "bg-emerald-500 text-white shadow-lg shadow-brand-emerald/20" 
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          )}
        >
          <ClipboardList size={14} />
          Current Units & Posts
        </button>
        
        <div className="ml-auto flex items-center gap-4 px-4">
          {selectedUnit && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full animate-pulse">
              <Move size={12} className="text-amber-500" />
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Relocating Unit {selectedUnit}</span>
              <button 
                onClick={() => setSelectedUnit(null)}
                className="ml-2 text-amber-500 hover:text-amber-400"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-brand-emerald" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'tactical' ? (
            <motion.div
              key="tactical"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <iframe 
                src="https://www.google.com/maps/d/u/0/embed?mid=1sVuk-qPshgccqAlOzQvumzq7OdeVII8&ehbc=2E312F" 
                className="w-full h-full border-none"
                style={{ filter: 'grayscale(0.2) contrast(1.1) brightness(0.9)' }}
                title="Google My Maps Tactical"
                allowFullScreen 
              />
            </motion.div>
          ) : (
            <motion.div
              key="logistics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 overflow-y-auto p-6 bg-bg-main custom-scrollbar"
            >
              <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">Fleet Posting Logistics</h2>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Real-time resource allocation matrix</p>
                  </div>
                  <div className="flex items-center gap-6 bg-bg-surface transition-colors duration-500 px-6 py-3 rounded-2xl border border-white/5">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Units</p>
                      <p className="text-xl font-black text-emerald-400">{upUnits.length}</p>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Static Posts</p>
                      <p className="text-xl font-black text-indigo-400">{POST_DATA.length}</p>
                    </div>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {POST_DATA.map((post) => {
                    // Find units whose ASSIGNED post is this, or HOME is this if no assignment
                    const assignedUnits = upUnits.filter(u => {
                      const assignment = assignments.find(a => a.unitId.toLowerCase() === u.unit.toLowerCase());
                      if (assignment) {
                        return assignment.postName === post.name;
                      }
                      const unitInfo = INITIAL_UNITS.find(iu => iu.id.toLowerCase() === u.unit.toLowerCase());
                      return unitInfo?.home === post.name;
                    });

                    return (
                      <div 
                        key={post.name}
                        onClick={() => selectedUnit && handlePostClick(post.name)}
                        className={cn(
                          "group relative bg-bg-surface/50 border rounded-2xl p-5 transition-all duration-300",
                          selectedUnit ? "cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5" : "",
                          assignedUnits.length > 0 
                            ? "border-white/10 hover:border-emerald-500/30 hover:bg-bg-surface/80 shadow-lg shadow-black/20" 
                            : "border-white/5 opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                        )}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Post Vector</span>
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">{post.name}</h3>
                          </div>
                          {assignedUnits.length > 0 ? (
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                              <Shield size={16} />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-600">
                              <AlertCircle size={16} />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          {assignedUnits.length > 0 ? (
                            assignedUnits.map(unit => {
                              const hasAssignment = assignments.some(a => a.unitId.toLowerCase() === unit.unit.toLowerCase());
                              return (
                                <div 
                                  key={unit.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnitClick(unit.unit);
                                  }}
                                  className={cn(
                                    "flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer",
                                    selectedUnit === unit.unit 
                                      ? "bg-amber-500 text-white border-amber-400 shadow-lg" 
                                      : hasAssignment
                                        ? "bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20"
                                        : "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "w-2 h-2 rounded-full animate-pulse",
                                      selectedUnit === unit.unit ? "bg-white" : "bg-emerald-500"
                                    )} />
                                    <span className="text-sm font-black">{unit.unit}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {hasAssignment && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          clearAssignment(unit.unit);
                                        }}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors"
                                        title="Reset to Home Post"
                                      >
                                        <RotateCcw size={12} />
                                      </button>
                                    )}
                                    <span className="text-[10px] font-mono opacity-70 font-bold uppercase tracking-tighter">
                                      {hasAssignment ? "Posted" : "Home"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-3 bg-bg-main border border-dotted border-white/10 rounded-xl text-center">
                              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">Awaiting Resource</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Info */}
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[8px] font-mono text-slate-500">LAT: {post.lat.toFixed(4)}</span>
                          <span className="text-[8px] font-mono text-slate-500">LON: {post.lon.toFixed(4)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
