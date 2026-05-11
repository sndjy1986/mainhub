import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MASTER_POSTS, LEVEL_POSTS } from '../../lib/systemLevels';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { ToneTestRecord } from '../../types';
import { Minus, Plus, Navigation, Shield, Radio, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function UnitPosting() {
  const [unitRecords, setUnitRecords] = useState<ToneTestRecord[]>([]);
  const [systemLevel, setSystemLevel] = useState(11);
  const [loading, setLoading] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Listen to Tone Tests
    const qTone = query(collection(db, 'toneTests'));
    const unsubTone = onSnapshot(qTone, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ToneTestRecord));
      setUnitRecords(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'toneTests');
      setLoading(false);
    });

    return () => unsubTone();
  }, []);

  const currentPosts = useMemo(() => {
    return (LEVEL_POSTS[systemLevel] || []).map(name => ({
      ...MASTER_POSTS[name],
      name
    }));
  }, [systemLevel]);

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([34.5, -82.6], 11);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(mapRef.current);

      markersRef.current = L.layerGroup().addTo(mapRef.current);
    }
  }, []);

  // Sync Markers and Bounds
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();
    const validPosts = currentPosts.filter(p => p.lat && p.lon);
    
    if (validPosts.length > 0) {
      const bounds = L.latLngBounds([]);
      
      validPosts.forEach(p => {
        // Main core marker
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: 8,
          fillColor: '#818cf8',
          fillOpacity: 0.9,
          color: '#ffffff',
          weight: 2,
          className: 'tactical-marker-core'
        });

        // Pulsing outer ring
        const ring = L.circleMarker([p.lat, p.lon], {
          radius: 12,
          fillColor: 'transparent',
          color: '#6366f1',
          weight: 1,
          className: 'tactical-marker-pulse'
        });

        marker.bindTooltip(p.name, {
          direction: 'top',
          offset: [0, -12],
          className: 'custom-map-tooltip',
          permanent: false
        });

        markersRef.current?.addLayer(ring);
        markersRef.current?.addLayer(marker);
        bounds.extend([p.lat, p.lon]);
      });

      mapRef.current.fitBounds(bounds, { padding: [80, 80], animate: true });
    }
  }, [currentPosts]);

  const cascadingLevels = useMemo(() => {
    const levels = [];
    for (let i = systemLevel; i >= 1; i--) {
      levels.push({
        level: i,
        posts: (LEVEL_POSTS[i] || []).map(name => ({
          ...MASTER_POSTS[name],
          name
        }))
      });
    }
    return levels;
  }, [systemLevel]);

  return (
    <div className="w-full h-[calc(100vh-80px)] bg-slate-950 p-8 overflow-y-auto custom-scrollbar transition-colors duration-500 relative selection:bg-indigo-500/30">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/[0.03] blur-[150px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/[0.02] blur-[120px] rounded-full -z-10 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto space-y-16 relative">
        {/* Header - System Status */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 tactical-header-glow pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Matrix Signal • v4.5.1</span>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic flex items-center gap-6">
              System <span className="text-indigo-500 not-italic">Status</span>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.15)]">
                <Activity size={24} className="animate-pulse" />
              </div>
            </h1>
          </div>
          
          <div className="flex items-center gap-8 bg-black/40 backdrop-blur-3xl px-10 py-6 rounded-[3rem] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col items-center mr-4">
              <Radio size={14} className="text-indigo-500 mb-2 animate-bounce" />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Signal relay</span>
            </div>
            <div className="flex items-center gap-10">
              <button 
                onClick={() => setSystemLevel(Math.max(1, systemLevel - 1))}
                className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-90"
              >
                <Minus size={28} strokeWidth={3} />
              </button>
              <div className="flex flex-col items-center">
                <motion.span 
                  key={systemLevel}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-black text-white glow-number leading-none transition-all"
                >
                  {systemLevel}
                </motion.span>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mt-2">Active Buffer</span>
              </div>
              <button 
                onClick={() => setSystemLevel(Math.min(17, systemLevel + 1))}
                className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center text-white hover:bg-indigo-500 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-90"
              >
                <Plus size={28} strokeWidth={3} />
              </button>
            </div>
          </div>
        </header>

        {/* Level & Post List - Cascading Matrix */}
        <section className="space-y-16">
          <AnimatePresence mode="wait">
            {cascadingLevels.map((lvl) => (
              <motion.div 
                key={lvl.level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-6">
                  <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <span className="text-2xl font-black text-indigo-400">0{lvl.level}</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/30 via-white/5 to-transparent" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Sector_Deployment_Matrix</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {lvl.posts.map((post, i) => (
                    <motion.div 
                      key={`${lvl.level}-${post.name}-${i}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="tactical-card p-4 flex items-center justify-between group cursor-default"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
                          <Shield size={14} />
                        </div>
                        <span className="text-xs font-black text-slate-300 group-hover:text-white transition-colors uppercase tracking-widest">{post.name}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

        {/* Tactical Map Visualization */}
        <section className="space-y-8 pt-12">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                 <Navigation size={22} className="animate-pulse" />
               </div>
               <div>
                 <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Spatial <span className="text-indigo-500 not-italic">Awareness</span></h3>
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Live orbital relay of strategic deployment nodes</p>
               </div>
             </div>
             <div className="flex gap-3">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     animate={{ x: [-64, 64] }}
                     transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "linear" }}
                     className="w-16 h-full bg-indigo-500/60"
                   />
                 </div>
               ))}
             </div>
          </div>

          <div className="relative w-full aspect-[21/9] bg-black/40 rounded-[4rem] border border-white/10 overflow-hidden shadow-[0_64px_128px_-32px_rgba(0,0,0,0.8)] group">
            <div ref={mapContainerRef} className="w-full h-full z-0 contrast-[1.2] saturate-[1.4] transition-all duration-700 group-hover:saturate-[1.6]" />
            
            {/* Tactical Overlays */}
            <div className="radar-sweep !opacity-20" />
            <div className="scanner-line !h-1 !bg-indigo-500/30" />
            
            {/* HUD Elements */}
            <div className="absolute top-10 left-10 p-6 bg-black/80 backdrop-blur-2xl rounded-3xl border border-white/10 z-[1000] pointer-events-none shadow-2xl">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Telemetry Sync</span>
                </div>
                <div className="text-[9px] font-mono text-indigo-400/60 space-y-1">
                  <div>NODE_ACTIVE: {currentPosts.length}</div>
                  <div>SYSLVL_EST: 0{systemLevel}</div>
                  <div>COORD_BUFFER: OK</div>
                </div>
              </div>
            </div>

            {/* Map Overlay HUD */}
            <div className="absolute bottom-10 right-10 flex items-center gap-8 bg-black/90 backdrop-blur-3xl px-10 py-5 rounded-[2.5rem] border border-white/10 z-[1000] shadow-2xl pointer-events-none">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] font-mono italic">SYSLOG_RELAY_v{systemLevel}</span>
                </div>
                <div className="w-[1px] h-6 bg-white/10" />
                <div className="flex flex-col">
                   <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Response Phase</span>
                   <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest animate-pulse">ACTIVE_RECON</span>
                </div>
              </div>
            </div>
            
            <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none z-[500]" />
          </div>
        </section>
      </div>
    </div>
  );
}

