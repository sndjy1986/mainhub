import { useState, useEffect } from 'react';
import ToneTestTable from '../components/ToneTestTable';
import { Truck, Users, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ToneTestRecord } from '../types';

export default function Dashboard() {
  const [fleetStatus, setFleetStatus] = useState<ToneTestRecord[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setFleetStatus([]);
        return;
      }

      const q = query(collection(db, 'toneTests'), orderBy('unit', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ToneTestRecord));
        setFleetStatus(data);
      });

      return () => unsub();
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-surface p-6 rounded-lg border border-border-subtle shadow-sm flex items-start gap-4 hover:border-brand-blue/50 transition-all group">
          <div className="bg-[#1E293B] p-2.5 rounded text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Contract Capacity</p>
            <div className="space-y-1 mt-1">
              <p className="text-xl font-semibold text-white tracking-tight">14 Units <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-2">Pre-1100</span></p>
              <p className="text-xl font-semibold text-white tracking-tight">17 Units <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-2">Post-1100</span></p>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface p-6 rounded-lg border border-border-subtle shadow-sm flex items-start gap-4 hover:border-brand-blue/50 transition-all group">
          <div className="bg-[#1E293B] p-2.5 rounded text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
            <Truck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Fleet Telemetry</p>
            <div className="grid grid-cols-2 gap-x-4 mt-2">
              {fleetStatus.slice(0, 2).map(unit => (
                <div key={unit.id}>
                  <p className="text-[10px] font-bold text-text-muted uppercase">{unit.unit}</p>
                  <p className="text-lg font-semibold text-white">{unit.time || '--:--'}</p>
                </div>
              ))}
              {fleetStatus.length === 0 && (
                <p className="text-[10px] text-text-muted italic">Awaiting sync...</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-bg-surface p-6 rounded-lg border border-border-subtle shadow-sm flex items-start gap-4 hover:border-brand-blue/50 transition-all group">
          <div className="bg-[#1E293B] p-2.5 rounded text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Shift Briefing</p>
            <p className="text-text-secondary mt-1 text-xs leading-relaxed font-medium">
              Validate all tone tests by 08:00. Verify 10-42 status before relief handover.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <ToneTestTable />
        </div>
        
        {/* Right Panel: Truck Up Time (From Firestore) */}
        <div className="w-full xl:w-72 space-y-6 shrink-0">
          <div className="bg-bg-surface rounded-lg border border-border-subtle shadow-sm overflow-hidden sticky top-6">
            <div className="bg-[#1A1D23] px-4 py-3 border-b border-border-subtle">
              <h3 className="font-bold text-white text-[11px] uppercase tracking-widest flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-brand-blue" />
                Fleet Ready Status
              </h3>
            </div>
            <div className="p-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-text-muted text-[9px] uppercase font-bold">
                    <th className="px-3 py-2">Chassis</th>
                    <th className="px-3 py-2 text-right">Up_Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/30">
                  {fleetStatus.map((unit, idx) => (
                    <tr key={unit.id} className={cn(
                      "hover:bg-[#1E2228] transition-colors group cursor-default",
                      idx % 2 === 1 && "bg-[#16191E]/50"
                    )}>
                      <td className="px-3 py-1.5 text-xs font-bold text-text-primary group-hover:text-brand-blue transition-colors">
                        {unit.unit}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-[10px] text-brand-blue/80">
                        {unit.time || '--:--'}
                      </td>
                    </tr>
                  ))}
                  {fleetStatus.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-center text-[10px] text-text-muted italic">
                        No active units found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-[#1A1D23] border-t border-border-subtle">
              <div className="flex items-center justify-between text-[9px] font-bold text-text-muted uppercase tracking-widest">
                <span>Total Assets</span>
                <span className="text-text-primary">{fleetStatus.length} Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// synchronized
