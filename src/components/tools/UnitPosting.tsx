import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INITIAL_UNITS } from '../../lib/dispatchConstants';
import { MASTER_POSTS, LEVEL_POSTS } from '../../lib/systemLevels';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { ToneTestRecord } from '../../types';
import { Minus, Plus, Navigation } from 'lucide-react';
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

    return () => {
      // We keep the map alive across renders unless unmounted
    };
  }, []);

  // Sync Markers and Bounds
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();
    const validPosts = currentPosts.filter(p => p.lat && p.lon);
    
    if (validPosts.length > 0) {
      const bounds = L.latLngBounds([]);
      
      validPosts.forEach(p => {
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: 6,
          fillColor: '#6366f1',
          fillOpacity: 0.8,
          color: '#818cf8',
          weight: 2,
          className: 'tactical-marker'
        });

        marker.bindTooltip(p.name, {
          direction: 'top',
          offset: [0, -10],
          className: 'custom-map-tooltip'
        });

        markersRef.current?.addLayer(marker);
        bounds.extend([p.lat, p.lon]);
      });

      mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [currentPosts]);

  return (
    <div className="w-full h-[calc(100vh-80px)] bg-bg-main p-8 overflow-y-auto custom-scrollbar transition-colors duration-500">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header - System Status */}
        <header className="flex items-center justify-between">
          <h1 className="text-4xl font-light text-white tracking-tight">System Status</h1>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSystemLevel(Math.max(1, systemLevel - 1))}
              className="w-10 h-10 rounded-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              <Minus size={20} />
            </button>
            <div className="w-16 h-10 rounded-lg border border-white/20 flex items-center justify-center">
              <span className="text-xl font-medium text-white">{systemLevel}</span>
            </div>
            <button 
              onClick={() => setSystemLevel(Math.min(17, systemLevel + 1))}
              className="w-10 h-10 rounded-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </header>

        {/* Level & Post List */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-light text-white tracking-tighter">{systemLevel} -</h2>
            <p className="text-2xl text-white/40 font-light">Post's Should include</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-16">
            {currentPosts.map((post, i) => (
              <div key={`${post.name}-${i}`} className="flex items-center gap-4 group">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover:bg-indigo-500 transition-colors" />
                <span className="text-xl text-white/70 group-hover:text-white transition-colors cursor-default">{post.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tactical Map Visualization */}
        <section className="space-y-6 pt-12 border-t border-white/5">
          <div className="relative w-full aspect-[21/9] bg-bg-surface/50 rounded-[2rem] border border-white/5 overflow-hidden shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Map Overlay HUD */}
            <div className="absolute bottom-6 right-6 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 z-[1000] pointer-events-none">
              <div className="flex items-center gap-3">
                <Navigation size={14} className="text-indigo-400 rotate-45" />
                <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em] font-mono">TACTICAL DEPLOYMENT V{systemLevel}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

