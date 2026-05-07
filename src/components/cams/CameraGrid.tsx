import React, { useState } from 'react';
import { Camera } from '../../lib/camsTypes';
import { ALL_CAMERAS } from '../../lib/camsConstants';
import { CameraPlayer } from './CameraPlayer';
import { RefreshCw, Activity } from 'lucide-react';
import { doc, onSnapshot, db } from '../../lib/firebase';
import { useTerminal } from '../../context/TerminalContext';

export const CameraGrid: React.FC = React.memo(() => {
  const { addNotification } = useTerminal();
  const [gridSize, setGridSize] = useState<4 | 6>(() => {
    const saved = localStorage.getItem('cameraGridSize');
    return saved === '6' ? 6 : 4;
  });

  React.useEffect(() => {
    localStorage.setItem('cameraGridSize', String(gridSize));
  }, [gridSize]);

  const [activeCameras, setActiveCameras] = useState<Camera[]>([]);
  const [globalAiEnabled, setGlobalAiEnabled] = useState(() => {
    return localStorage.getItem('globalAiEnabled') === 'true';
  });

  React.useEffect(() => {
    localStorage.setItem('globalAiEnabled', String(globalAiEnabled));
  }, [globalAiEnabled]);

  // Sync with Firestore Global Settings for default cameras
  React.useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.defaultCameraIds && Array.isArray(data.defaultCameraIds)) {
          const cams = data.defaultCameraIds
            .map((id: string) => ALL_CAMERAS.find(c => c.id === id))
            .filter(Boolean) as Camera[];
          
          if (cams.length > 0) {
            const saved = localStorage.getItem('activeCameras');
            if (!saved) {
              setActiveCameras(cams);
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Initial load from localStorage or hardcoded defaults
  React.useEffect(() => {
    const saved = localStorage.getItem('activeCameras');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveCameras(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved cameras', e);
      }
    }
    
    if (activeCameras.length === 0) {
      const defaultCamIds = ['cam2', 'cam3', 'cam4', 'cam8'];
      setActiveCameras(defaultCamIds.map(id => ALL_CAMERAS.find(c => c.id === id) || ALL_CAMERAS[0]));
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('activeCameras', JSON.stringify(activeCameras));
  }, [activeCameras]);

  // AI Monitoring Logic
  React.useEffect(() => {
    if (!globalAiEnabled || activeCameras.length === 0) return;

    const interval = setInterval(() => {
      // 5% chance of an anomaly check every 30 seconds for simulation 
      // In a real app, this would be a backend process or vision analysis
      const chance = Math.random();
      if (chance > 0.85) { 
        const randomCam = activeCameras[Math.floor(Math.random() * activeCameras.length)];
        const alerts = [
          `Traffic surge detected at ${randomCam.name}. Priority level: Low.`,
          `Unusual activity pattern identified near ${randomCam.name}.`,
          `High density traffic detected at ${randomCam.name}. Suggest monitoring.`,
          `Obstruction or slow-moving traffic on ${randomCam.name} feed.`
        ];
        const alert = alerts[Math.floor(Math.random() * alerts.length)];
        addNotification(alert, chance > 0.95 ? 'warning' : 'info');
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [globalAiEnabled, activeCameras, addNotification]);

  const REFRESH_RATE = 900000; // Hardcoded 15 min (900,000ms)

  const handleSwitchCamera = (index: number, newCam: Camera) => {
    setActiveCameras(prev => {
      const next = [...prev];
      next[index] = newCam;
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 relative text-slate-100 font-sans overflow-hidden">
      {/* Grid Container */}
      <main className={`flex-1 grid gap-4 p-4 z-10 overflow-hidden ${gridSize === 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-2'}`}>
        {activeCameras.slice(0, gridSize).map((camera, idx) => (
          <div key={`${idx}-${camera.id}`} className="relative glass-panel overflow-hidden border-2 border-white/5 hover:border-indigo-500/20 transition-all duration-500">
            <CameraPlayer 
              camera={camera}
              availableCameras={ALL_CAMERAS}
              onSwitchCamera={(newCam) => handleSwitchCamera(idx, newCam)}
              globalAiEnabled={globalAiEnabled}
              onToggleAi={() => setGlobalAiEnabled(!globalAiEnabled)}
              refreshInterval={REFRESH_RATE}
            />
          </div>
        ))}
      </main>

      {/* Footer Bar */}
      <footer className="h-12 bg-slate-900/60 backdrop-blur-xl border-t border-white/5 px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-[0.2em] font-black text-slate-500">Deployment Status</span>
            <span className="text-[10px] font-black text-indigo-400 tracking-widest">STABLE_GRID_024</span>
          </div>
          <div className="w-[1px] h-6 bg-white/5" />
          <div className="flex items-center gap-4 text-[10px] font-black tracking-widest text-slate-500">
            <span>OPS: {activeCameras.length} SENSORS</span>
            <Activity size={12} className="text-emerald-500 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <button className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500 hover:text-white transition-colors">Audit Logs</button>
          <button className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500 hover:text-white transition-colors underline underline-offset-4">Relay Config</button>
        </div>
      </footer>

      {/* Global Hud Detail Overlay */}
      <div className="scanlines" />
    </div>
  );
});
// sync;

