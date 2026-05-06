import React, { useState } from 'react';
import { Shield, Zap, Search, Filter, MoreVertical, CheckCircle, Clock, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import * as L from 'leaflet';

interface Unit {
  id: string;
  name: string;
  type: string;
  status: 'Available' | 'Assigned' | 'Offline';
  sector: string;
  timestamp: string;
  lat: number;
  lng: number;
}

const initialUnits: Unit[] = [
  { id: '101', name: 'Alpha-7', type: 'Recon', status: 'Available', sector: 'Sector 4', timestamp: '10:04', lat: 34.523, lng: -82.648 },
  { id: '202', name: 'Bravo-3', type: 'Defense', status: 'Assigned', sector: 'Sector 1', timestamp: '10:12', lat: 34.530, lng: -82.650 },
  { id: '304', name: 'Gamma-1', type: 'Transport', status: 'Available', sector: 'Sector 7', timestamp: '09:45', lat: 34.510, lng: -82.630 },
  { id: '401', name: 'Delta-9', type: 'Support', status: 'Offline', sector: 'N/A', timestamp: '08:00', lat: 34.540, lng: -82.600 },
  { id: '505', name: 'Echo-5', type: 'Recon', status: 'Available', sector: 'Sector 2', timestamp: '10:30', lat: 34.500, lng: -82.680 },
];

export function UnitPosting() {
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');

  const toggleStatus = (id: string) => {
    setUnits(prev => prev.map(u => {
      if (u.id === id) {
        const statuses: Unit['status'][] = ['Available', 'Assigned', 'Offline'];
        const currentIndex = statuses.indexOf(u.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        return { ...u, status: statuses[nextIndex] };
      }
      return u;
    }));
  };

  const filteredUnits = units.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
       <div className="flex flex-col md:flex-row gap-4 items-center justify-between shrink-0 mb-2">
          <div className="relative w-full md:w-96">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
             <input 
                type="text" 
                placeholder="Search unit by designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
             />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl mr-2">
               <button 
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-white'}`}
               >
                 List
               </button>
               <button 
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'map' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-white'}`}
               >
                 <MapIcon className="w-3 h-3" /> Map
               </button>
             </div>
             <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest">
                <Filter className="w-3 h-3" /> Filter
             </button>
             <button className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all uppercase tracking-widest">
                Add Unit
             </button>
          </div>
       </div>

       {viewMode === 'map' ? (
         <div className="flex-1 min-h-[500px] bg-black/20 border border-white/10 rounded-3xl overflow-hidden relative">
            <MapContainer center={[34.523, -82.648]} zoom={12} className="w-full h-full" zoomControl={false} attributionControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              {filteredUnits.map(u => (
                <Marker 
                  key={u.id} 
                  position={[u.lat, u.lng]} 
                  icon={L.divIcon({
                    className: 'custom-unit-marker',
                    html: `<div class="unit-marker-inner" style="background-color: ${u.status === 'Available' ? '#10b981' : u.status === 'Assigned' ? '#6366f1' : '#f43f5e'}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 2px solid white;">${u.name}</div>`,
                    iconSize: [60, 24],
                    iconAnchor: [30, 12]
                  })} 
                />
              ))}
            </MapContainer>
         </div>
       ) : (
         <div className="backdrop-blur-md flex-1 bg-white/5 border border-white/10 rounded-3xl overflow-hidden overflow-x-auto min-h-0">
            <table className="w-full text-left border-collapse">
             <thead>
                <tr className="border-b border-white/5">
                   <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Designation</th>
                   <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Assignment</th>
                   <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Status</th>
                   <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Action</th>
                </tr>
             </thead>
             <tbody>
                {filteredUnits.map((u) => (
                   <tr key={u.id} className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                               <Shield className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="font-bold text-white tracking-tight">{u.name}</p>
                               <p className="text-xs text-slate-500 font-mono">UID: {u.id}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-300">{u.sector}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                               <Clock className="w-3 h-3" /> Last Active: {u.timestamp}
                            </p>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`
                            px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5
                            ${u.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                              u.status === 'Assigned' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                              'bg-rose-500/10 text-rose-400 border border-rose-500/20'}
                         `}>
                            <div className={`w-1 h-1 rounded-full ${u.status === 'Available' ? 'bg-emerald-400' : u.status === 'Assigned' ? 'bg-indigo-400' : 'bg-rose-400'}`} />
                            {u.status}
                         </span>
                      </td>
                      <td className="px-8 py-5">
                         <button 
                            onClick={() => toggleStatus(u.id)}
                            className="p-2 text-slate-500 hover:text-white transition-colors"
                         >
                            <MoreVertical className="w-5 h-5" />
                         </button>
                      </td>
                   </tr>
                ))}
             </tbody>
                  </table>
               </div>
            )}
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-5 h-5" />
             </div>
             <div>
                <p className="text-xl font-bold text-white tracking-tight">{units.filter(u => u.status === 'Available').length}</p>
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Available</p>
             </div>
          </div>
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Zap className="w-5 h-5" />
             </div>
             <div>
                <p className="text-xl font-bold text-white tracking-tight">{units.filter(u => u.status === 'Assigned').length}</p>
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">In Mission</p>
             </div>
          </div>
       </div>
    </div>
  );
}
