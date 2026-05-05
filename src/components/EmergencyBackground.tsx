import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { AppSettings } from '../types';

interface EmergencyBackgroundProps {
  opacity?: number;
}

export default function EmergencyBackground({ opacity }: EmergencyBackgroundProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    const unsubAuth = auth.onAuthStateChanged((user: any) => {
      if (user) {
        if (!unsub) {
          unsub = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
            if (snapshot.exists()) {
              setSettings({ id: snapshot.id, ...snapshot.data() } as AppSettings);
            } else {
              setSettings({ emergencyMode: false, emergencyBackgroundOpacity: 15 });
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'settings/global');
          });
        }
      } else {
        if (unsub) {
          unsub();
          unsub = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsub) unsub();
    };
  }, []);

  if (!settings?.emergencyMode && opacity === undefined) return null;

  const currentOpacity = opacity !== undefined ? opacity / 100 : (settings?.emergencyBackgroundOpacity ? settings.emergencyBackgroundOpacity / 100 : 0.15);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ opacity: currentOpacity }}
    >
      {/* Left Red Strobe Layer 1 */}
      <motion.div
        className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-red-600/60 via-red-600/10 to-transparent"
        animate={{
          opacity: [0, 1, 0, 1, 0, 0, 0, 1, 0, 0],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          times: [0, 0.05, 0.1, 0.15, 0.2, 0.6, 0.65, 0.7, 0.75, 1],
          ease: "circOut"
        }}
      />

      {/* Right Blue Strobe Layer 1 */}
      <motion.div
        className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-blue-600/60 via-blue-600/10 to-transparent"
        animate={{
          opacity: [0, 0, 0, 1, 0, 1, 0, 1, 0, 0],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          times: [0, 0.3, 0.35, 0.4, 0.45, 0.5, 0.8, 0.85, 0.9, 1],
          ease: "circOut"
        }}
      />

      {/* Central Rotating Beam (Sweeping across) */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[200%] bg-gradient-to-b from-white/10 via-transparent to-white/10"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Screen Edge Glow (Pulsing) */}
      <motion.div
        className="absolute inset-0 shadow-[inset_0_0_100px_rgba(255,255,255,0.05)]"
        animate={{
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Full Screen Ambient Flash */}
      <motion.div
        className="absolute inset-0 bg-white/5 mix-blend-overlay"
        animate={{
          opacity: [0, 0.2, 0, 0.2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          times: [0, 0.02, 0.5, 0.52, 1],
          ease: "easeInOut"
        }}
      />
    </div>
  );
}
// synchronized
