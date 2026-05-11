import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Map as MapIcon, List, AlertCircle, Loader2, X, Shield, Activity, Truck, Zap, Radio } from 'lucide-react';
import { Unit, API_LIMIT } from '../lib/distanceConstants';
import { geocode, getMatrix, fetchCurrentUsage, incrementUsage } from '../services/mapboxService';
import { POST_DATA, INITIAL_UNITS, TRANSPORT_ADDRS, QRV_UNITS as DISPATCH_QRV } from '../lib/dispatchConstants';
import Map from '../components/distancechecker/Map';
import UnitTable from '../components/distancechecker/UnitTable';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { ToneTestRecord } from '../types';

interface UnitAssignment {
  unitId: string;
  postName: string;
}

export default function DistanceMap() {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [usageCount, setUsageCount] = useState(0);
  const [destCoords, setDestCoords] = useState<[number, number] | undefined>();
  
  const [transportResults, setTransportResults] = useState<Unit[]>([]);
  const [qrvResults, setQrvResults] = useState<Unit[]>([]);
  
  const [toneRecords, setToneRecords] = useState<ToneTestRecord[]>([]);
  const [assignments, setAssignments] = useState<UnitAssignment[]>([]);

  useEffect(() => {
    fetchCurrentUsage().then(setUsageCount);

    const unsubTone = onSnapshot(query(collection(db, 'toneTests')), (snapshot) => {
      setToneRecords(snapshot.docs.map(doc => doc.data() as ToneTestRecord));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'toneTests'));

    const unsubAssign = onSnapshot(query(collection(db, 'unitAssignments')), (snapshot) => {
      setAssignments(snapshot.docs.map(doc => doc.data() as UnitAssignment));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'unitAssignments'));

    return () => {
      unsubTone();
      unsubAssign();
    };
  }, []);

  // Compute active units and their effective coordinates
  const activeTransportUnits = useMemo(() => {
    // Only MED- units that are UP
    const upUnits = toneRecords.filter(r => 
      r.unit.toUpperCase().startsWith('MED') && 
      r.time && 
      !r.tenFortyTwo
    );

    return upUnits.map(tr => {
      const unitId = tr.unit;
      const assignment = assignments.find(a => a.unitId.toLowerCase() === unitId.toLowerCase());
      
      let coords: [number, number] | null = null;
      let addr = TRANSPORT_ADDRS[unitId] || "Unknown Address";

      if (assignment) {
        const post = POST_DATA.find(p => p.name === assignment.postName);
        if (post) {
          coords = [post.lon, post.lat];
          addr = `Posted @ ${post.name}`;
        }
      } else {
        const unitInfo = INITIAL_UNITS.find(iu => iu.id.toLowerCase() === unitId.toLowerCase());
        if (unitInfo) {
          const post = POST_DATA.find(p => p.name === unitInfo.home);
          if (post) {
            coords = [post.lon, post.lat];
            addr = `Home @ ${post.name}`;
          }
        }
      }

      return {
        name: unitId,
        addr: addr,
        coords: coords // We'll use these to avoid geocoding
      };
    });
  }, [toneRecords, assignments]);

  // QRVs are always active for now, or we could filter them too if needed
  const activeQrvUnits = useMemo(() => {
    return DISPATCH_QRV.map(q => ({
      name: q.name,
      addr: q.addr,
      coords: null as [number, number] | null // We'll geocode these as they are static home based in this app's logic
    }));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || loading || (usageCount >= API_LIMIT)) return;

    setLoading(true);
    setStatus("Locating destination...");
    
    try {
      const coords = await geocode(address);
      setDestCoords(coords);
      setStatus("Calculating routes...");

      const processGroup = async (units: { name: string, addr: string, coords: [number, number] | null }[]) => {
        const unitCoords = await Promise.all(units.map(async u => {
          if (u.coords) return u.coords;
          return await geocode(u.addr);
        }));

        const matrix = await getMatrix(coords, unitCoords);
        
        return units.map((u, i) => ({
          name: u.name,
          addr: u.addr,
          distance: matrix.distances[0][i+1] * 0.000621371, // meters to miles
          duration: Math.round(matrix.durations[0][i+1] / 60) // seconds to minutes
        })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      };

      const [trans, qrv] = await Promise.all([
        processGroup(activeTransportUnits),
        processGroup(activeQrvUnits)
      ]);

      setTransportResults(trans as Unit[]);
      setQrvResults(qrv as Unit[]);

      const totalCost = 1 + activeTransportUnits.length + activeQrvUnits.length;
      const newCount = await incrementUsage(totalCost);
      setUsageCount(newCount);

      setStatus(null);
    } catch (error) {
      console.error(error);
      setStatus("Error: " + (error instanceof Error ? error.message : "Failed to calculate"));
    } finally {
      setLoading(false);
    }
  };

  const isLimitReached = usageCount >= API_LIMIT;

  return (
    <div className="relative flex flex-col technical-grid text-slate-50 font-sans p-8 pt-12 overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="radar-sweep !opacity-20" />
        <div className="scanner-line !opacity-20" />
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse-slow" />
      </div>

      <header className="flex justify-between items-end mb-12 relative z-10 tactical-header-glow pb-8">
        <div className="space-y-3"> 
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.4)]">
              <MapIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
               Fleet <span className="text-indigo-500 not-italic">Matrix</span>
            </h1>
          </div>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] ml-16">Real-time response logistics and fleet positioning for EMS Dispatch</p>
        </div>
        
        <div className="flex items-center gap-6 tactical-card px-6 py-4">
          <div className="text-right"> 
            <span className="block text-[8px] uppercase tracking-[0.3em] text-slate-500 font-black">System Pulse</span> 
            <span className="text-emerald-400 font-black text-[10px] tracking-widest flex items-center justify-end gap-2 mt-1 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 
              Ops Ready - {activeTransportUnits.length} Units Up
            </span>
          </div>
        </div>
      </header>

      <div className="flex gap-8 flex-1 min-h-0 relative z-10 overflow-hidden">
        {/* Left Column (Search & Summary) */}
        <div className="w-[350px] flex flex-col gap-8 shrink-0">
          <div className="tactical-card p-8 space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="space-y-4 relative"> 
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-indigo-500" />
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Target Vector</label>
              </div>
              <form onSubmit={handleSearch} className="relative"> 
                <input 
                  type="text" 
                  placeholder="DEPLOY TO ADDRESS..." 
                  className="w-full tactical-input px-5 py-4 text-sm"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading || isLimitReached}
                /> 
                <button 
                  type="submit"
                  disabled={loading || isLimitReached || !address.trim()}
                  className="absolute right-2 top-2 tactical-btn-indigo px-4 py-2 text-[10px] font-black"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "PING"}
                </button>
              </form>
            </div>

            {status && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex gap-3"
              > 
                <div className="bg-indigo-500/20 p-2 rounded-lg h-fit text-indigo-400">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <p className="text-[11px] leading-snug text-indigo-100 font-bold uppercase tracking-wider">{status}</p>
              </motion.div>
            )}

            {isLimitReached && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3"> 
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <p className="text-[11px] leading-snug text-rose-100 font-black uppercase tracking-wider">Matrix limit reached. System cooldown initialized.</p>
              </div>
            )}
          </div>

          <div className="flex-1 tactical-card flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center"> 
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Response Matrix</h3> 
              <div className="flex gap-1.5">
                <div className="w-8 h-[2px] bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                <div className="w-4 h-[2px] bg-slate-800 rounded-full"></div>
              </div>
            </div>
            <div className="p-8 space-y-8 flex-1 flex flex-col"> 
              <div className="space-y-4">
                <div className="flex justify-between items-center group/item hover:bg-white/[0.02] p-2 -mx-2 rounded-xl transition-all"> 
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest group-hover/item:text-slate-300">Fleet Units</span> 
                  <span className="text-white font-mono bg-black/40 px-3 py-1 rounded-lg text-[10px] border border-white/5 border-b-indigo-500/50">{activeTransportUnits.length} ACTIVE</span> 
                </div> 
                <div className="flex justify-between items-center group/item hover:bg-white/[0.02] p-2 -mx-2 rounded-xl transition-all"> 
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest group-hover/item:text-slate-300">QRV Response</span> 
                  <span className="text-white font-mono bg-black/40 px-3 py-1 rounded-lg text-[10px] border border-white/5 border-b-emerald-500/50">{activeQrvUnits.length} READY</span> 
                </div> 
              </div>

              <div className="pt-8 border-t border-white/5 mt-4"> 
                <div className="text-center bg-black/40 rounded-[2rem] p-8 border border-white/5 relative group overflow-hidden shadow-inner"> 
                  <div className="absolute inset-0 bg-indigo-500/[0.02] group-hover:bg-indigo-500/[0.05] transition-all" />
                  <span className="block text-6xl font-black text-white mb-2 glow-number leading-none">
                    {transportResults.length > 0 ? transportResults[0].distance?.toFixed(1) : '--'}
                    <span className="text-sm font-black text-slate-600 ml-1 uppercase tracking-widest">mi</span>
                  </span> 
                  <span className="text-[9px] text-indigo-400 uppercase font-black tracking-[0.2em] relative z-10 px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                    Prime Response: {transportResults.length > 0 ? transportResults[0].name : 'STNDBY'}
                  </span> 
                </div> 
              </div>

              {/* View Toggle */}
              <div className="mt-auto pt-8">
                <div className="bg-black/40 p-1.5 rounded-2xl border border-white/10 flex shadow-inner">
                  <button 
                    onClick={() => setView('list')}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${view === 'list' ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    <List className="w-4 h-4" />
                    List Matrix
                  </button>
                  <button 
                    onClick={() => setView('map')}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${view === 'map' ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    <MapIcon className="w-4 h-4" />
                    Overlay Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Results) */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="flex-1 min-h-0">
            <AnimatePresence mode="wait">
              {view === 'list' ? (
                <motion.div 
                  key="list"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-4 custom-scrollbar"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2 px-2">
                       <Truck className="w-4 h-4 text-indigo-500" />
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Fleet Deployments</h4>
                    </div>
                    <UnitTable units={transportResults} loading={loading} title="Primary Assets" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2 px-2">
                       <Zap className="w-4 h-4 text-emerald-500" />
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">QRV Support</h4>
                    </div>
                    <UnitTable units={qrvResults} loading={loading} title="Operational QRVs" />
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="map"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="h-full tactical-card overflow-hidden relative"
                >
                  <Map coords={destCoords} />
                  <div className="absolute top-6 left-6 z-[1000]">
                    <div className="bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4">
                       <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                          <MapIcon className="w-4 h-4" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Overlay active</span>
                          <span className="text-[10px] font-bold text-white uppercase tracking-widest">{address || 'No destination targeted'}</span>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <footer className="mt-8 flex justify-between items-center bg-black/40 rounded-[2rem] border border-white/5 p-6 relative z-10 shadow-2xl">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-6"> 
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Network Load</span> 
            <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]"> 
              <motion.div 
                className={`h-full rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)] ${usageCount >= API_LIMIT ? 'bg-rose-500' : 'bg-indigo-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (usageCount / API_LIMIT) * 100)}%` }}
                transition={{ duration: 1.5, ease: "circOut" }}
              />
            </div> 
            <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">{usageCount.toLocaleString()} / {API_LIMIT.toLocaleString()}</span>
          </div>
          <div className="h-6 w-[1px] bg-white/5 hidden md:block"></div>
          <p className="text-[9px] text-slate-600 max-w-sm hidden lg:block font-bold uppercase tracking-widest">Quantum usage resets on monthly cycle. Spatial metrics provided via Mapbox Relay Matrix.</p>
        </div>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/5 hover:border-white/20 hover:text-white transition-all cursor-crosshair">
            <Search className="w-4 h-4" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/5 hover:border-white/20 hover:text-white transition-all cursor-crosshair">
            <Radio className="w-4 h-4" />
          </div>
        </div>
      </footer>
    </div>
  );
}
// sync
