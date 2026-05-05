import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTerminal } from '../../context/TerminalContext';

export function EmergencyBackground() {
  const { emergencyLevel, manualEmergencyMode, emergencyOpacity } = useTerminal();
  const isEmergency = emergencyLevel !== 'NORMAL' || manualEmergencyMode;

  return (
    <AnimatePresence>
      {isEmergency && (
        <div 
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-500"
          style={{ opacity: emergencyOpacity }}
        >
          {/* LEFT RED STROBE */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-rose-600/60 via-rose-600/10 to-transparent"
            animate={{ opacity: [0, 1, 0, 1, 0, 0, 0, 1, 0, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              times: [0, 0.05, 0.1, 0.15, 0.2, 0.6, 0.65, 0.7, 0.75, 1],
              ease: "circOut"
            }}
          />

          {/* RIGHT BLUE STROBE */}
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-blue-600/60 via-blue-600/10 to-transparent"
            animate={{ opacity: [0, 0, 0, 1, 0, 1, 0, 1, 0, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              times: [0, 0.3, 0.35, 0.4, 0.45, 0.5, 0.8, 0.85, 0.9, 1],
              ease: "circOut"
            }}
          />

          {/* CENTRAL ROTATING BEAM */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[200%] bg-gradient-to-b from-white/5 via-transparent to-white/5"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />

          {/* SCREEN EDGE GLOW */}
          <motion.div
            className="absolute inset-0 shadow-[inset_0_0_150px_rgba(255,255,255,0.1)]"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* AMBIENT FLASH */}
          <motion.div
            className="absolute inset-0 bg-white/5 mix-blend-overlay"
            animate={{ opacity: [0, 0.2, 0, 0.2, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              times: [0, 0.02, 0.5, 0.52, 1],
              ease: "easeInOut"
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
