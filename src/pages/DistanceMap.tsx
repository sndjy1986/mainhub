import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Map as MapIcon, List, AlertCircle, Loader2, X } from 'lucide-react';
import { Unit, TRANSPORT_UNITS, QRV_UNITS, API_LIMIT } from '../lib/distanceConstants';
import { geocode, getMatrix, fetchCurrentUsage, incrementUsage } from '../services/mapboxService';
import Map from '../components/distancechecker/Map';
import UnitTable from '../components/distancechecker/UnitTable';

export default function DistanceMap() {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [usageCount, setUsageCount] = useState(0);
  const [destCoords, setDestCoords] = useState<[number, number] | undefined>();
  
  const [transportResults, setTransportResults] = useState<Unit[]>([]);
  const [qrvResults, setQrvResults] = useState<Unit[]>([]);
  const [unitCoordsCache, setUnitCoordsCache] = useState<Record<string, [number, number]>>({});

  useEffect(() => {
    fetchCurrentUsage().then(setUsageCount);
    
    // Pre-cache unit coordinates (optional, but saves time later)
    const cacheUnits = async () => {
      const allUnits = [...TRANSPORT_UNITS, ...QRV_UNITS];
      const cache: Record<string, [number, number]> = {};
      
      // We process in small chunks to avoid rate limits if any
      for (const unit of allUnits) {
        try {
          cache[unit.name] = await geocode(unit.addr);
        } catch (e) {
          console.error(`Failed to geocode ${unit.name}`, e);
        }
      }
      setUnitCoordsCache(cache);
    };
    
    cacheUnits();
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

      const processGroup = async (units: Unit[]) => {
        // Use cached coordinates if available, otherwise geocode
        const unitCoords = await Promise.all(units.map(async u => {
          if (unitCoordsCache[u.name]) return unitCoordsCache[u.name];
          const c = await geocode(u.addr);
          // Update cache on the fly (though we pre-cached mostly)
          setUnitCoordsCache(prev => ({ ...prev, [u.name]: c }));
          return c;
        }));

        const matrix = await getMatrix(coords, unitCoords);
        
        return units.map((u, i) => ({
          ...u,
          distance: matrix.distances[0][i+1] * 0.000621371, // meters to miles
          duration: Math.round(matrix.durations[0][i+1] / 60) // seconds to minutes
        })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      };

      const [trans, qrv] = await Promise.all([
        processGroup(TRANSPORT_UNITS),
        processGroup(QRV_UNITS)
      ]);

      setTransportResults(trans);
      setQrvResults(qrv);

      const totalCost = 1 + TRANSPORT_UNITS.length + QRV_UNITS.length;
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
    <div className="relative flex flex-col technical-grid text-slate-50 font-sans">
      
      <header className="flex justify-between items-end mb-8">
        <div className="space-y-1"> 
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
             <MapIcon className="w-8 h-8 text-blue-500" />
             Unit Distance Checker
          </h1>
          <p className="text-slate-400">Real-time response logistics and fleet positioning for EMS Dispatch</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
          <div className="text-right"> 
            <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">System Status</span> 
            <span className="text-emerald-400 font-medium text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow"></span> 
              Live - All Units Syncing
            </span>
          </div>
        </div>
      </header>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Column (Search & Summary) */}
        <div className="w-1/3 flex flex-col gap-6">
          <div className="glass p-6 rounded-2xl space-y-4 shadow-2xl relative overflow-hidden">
            <div className="space-y-2"> 
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Target Destination</label>
              <form onSubmit={handleSearch} className="relative"> 
                <input 
                  type="text" 
                  placeholder="Enter destination address..." 
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading || isLimitReached}
                /> 
                <button 
                  type="submit"
                  disabled={loading || isLimitReached || !address.trim()}
                  className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </button>
              </form>
            </div>

            {status && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3"> 
                <div className="bg-blue-500/20 p-2 rounded-lg h-fit text-blue-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <p className="text-[11px] leading-snug text-blue-100">{status}</p>
              </div>
            )}

            {isLimitReached && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3"> 
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-[11px] leading-snug text-red-100">Monthly budget exhausted. Service resumes on the 1st.</p>
              </div>
            )}
          </div>

          <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex justify-between items-center"> 
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Fleet Summary</h3> 
              <div className="flex gap-1">
                <div className="w-16 h-1 bg-blue-500 rounded-full"></div>
                <div className="w-8 h-1 bg-slate-700 rounded-full"></div>
              </div>
            </div>
            <div className="p-6 space-y-6 flex-1"> 
              <div className="flex justify-between items-center"> 
                <span className="text-slate-400 text-sm">Transport Units</span> 
                <span className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded text-xs">20 Active</span> 
              </div> 
              <div className="flex justify-between items-center"> 
                <span className="text-slate-400 text-sm">QRV Paramedics</span> 
                <span className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded text-xs">15 Active</span> 
              </div> 
              <div className="pt-4 border-t border-slate-700/50"> 
                <div className="text-center bg-slate-900/50 rounded-xl p-4 border border-white/5"> 
                  <span className="block text-3xl font-bold text-white mb-1">
                    {transportResults.length > 0 ? transportResults[0].distance?.toFixed(1) : '--'}
                    <span className="text-sm font-normal text-slate-500 ml-1">mi</span>
                  </span> 
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                    Closest Responding Unit ({transportResults.length > 0 ? transportResults[0].name : 'None'})
                  </span> 
                </div> 
              </div>

              {/* View Toggle */}
              <div className="mt-auto pt-6">
                <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700 flex">
                  <button 
                    onClick={() => setView('list')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <List className="w-4 h-4" />
                    List View
                  </button>
                  <button 
                    onClick={() => setView('map')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${view === 'map' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <MapIcon className="w-4 h-4" />
                    Map View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Results) */}
        <div className="w-2/3 flex flex-col gap-6">
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="wait">
              {view === 'list' ? (
                <motion.div 
                  key="list"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <UnitTable title="Transport Units" units={transportResults} loading={loading} />
                  <UnitTable title="QRV Paramedics" units={qrvResults} loading={loading} />
                </motion.div>
              ) : (
                <motion.div 
                  key="map"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="h-full min-h-[500px]"
                >
                  <Map coords={destCoords} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <footer className="mt-8 flex justify-between items-center bg-slate-900/50 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4"> 
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Usage</span> 
            <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden"> 
              <div 
                className={`h-full transition-all duration-1000 rounded-full shadow-[0_0_10px_#3B82F6] ${usageCount >= API_LIMIT ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (usageCount / API_LIMIT) * 100)}%` }}
              ></div> 
            </div> 
            <span className="text-xs font-mono text-blue-400">{usageCount.toLocaleString()} / 10,000</span>
          </div>
          <div className="h-4 w-px bg-slate-700 hidden md:block"></div>
          <p className="text-[10px] text-slate-500 max-w-sm hidden lg:block">Search limits refresh on the 1st of each month. Data provided via Mapbox Directions Matrix API.</p>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700 shadow-sm">
            <Search className="w-4 h-4" />
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700 shadow-sm">
            <MapIcon className="w-4 h-4" />
          </div>
        </div>
      </footer>
    </div>
  );
}
// sync
