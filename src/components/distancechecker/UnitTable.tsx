import { Unit } from '../../lib/distanceConstants';
import { motion, AnimatePresence } from 'motion/react';

interface UnitTableProps {
  title: string;
  units: Unit[];
  loading?: boolean;
}

export default function UnitTable({ title, units, loading }: UnitTableProps) {
  if (!loading && units.length === 0) return null;

  return (
    <div className="glass rounded-2xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Priority Order</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-4 py-3 text-xs font-semibold text-slate-400">Unit</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-400">Dist</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 text-right">ETA</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {units.map((unit, idx) => (
                <motion.tr 
                  key={unit.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`border-b border-slate-800/50 transition-colors ${idx === 0 ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''}`}
                >
                  <td className="px-4 py-3 font-bold text-white">{unit.name}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                    {unit.distance !== undefined ? `${unit.distance.toFixed(2)}mi` : '--'}
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs text-right ${idx === 0 ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>
                    {unit.duration !== undefined ? `${unit.duration}m` : '--'}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
// sync
