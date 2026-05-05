import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AmbienceProps {
  mode: 'slate-glow' | 'emergency';
}

export const Ambience: React.FC<AmbienceProps> = ({ mode }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-900">
      <AnimatePresence mode="wait">
        {mode === 'slate-glow' ? (
          <motion.div
            key="slate-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* Indigo Orb */}
            <div 
              className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px]"
              style={{ backgroundColor: '#6366f1' }}
            />
            {/* Emerald Orb */}
            <div 
              className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-10 blur-[100px]"
              style={{ backgroundColor: '#10b981' }}
            />
             {/* Subtle Deep Indigo Center */}
             <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full opacity-5 blur-[150px]"
              style={{ backgroundColor: '#4f46e5' }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="emergency"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* Flashing Red */}
            <motion.div
              animate={{ 
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-0 w-[80%] h-[80%] rounded-full blur-[120px]"
              style={{ backgroundColor: '#ef4444' }}
            />
            {/* Flashing Blue */}
            <motion.div
              animate={{ 
                opacity: [0.1, 0.4, 0.1],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-0 right-0 w-[80%] h-[80%] rounded-full blur-[120px]"
              style={{ backgroundColor: '#3b82f6' }}
            />
            {/* White Pulse */}
            <motion.div
              animate={{ 
                opacity: [0, 0.15, 0],
              }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-white"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
// sync

