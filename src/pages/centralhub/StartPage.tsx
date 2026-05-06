import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Shield, Activity, AlertCircle, Plus, Trash2, Info, MessageSquare, PlusCircle, X } from 'lucide-react';
import { WeatherDashboard } from '../../components/centralhub/WeatherDashboard';
import { useTerminal } from '../../context/TerminalContext';
import { onSnapshot, collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from '../../lib/firebase';
import { useAuthRole } from '../../hooks/useAuthRole';
import { motion, AnimatePresence } from 'motion/react';

export function StartPage() {
  const [shift, setShift] = useState(() => localStorage.getItem('selectedShift') || 'A');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    localStorage.setItem('selectedShift', shift);
  }, [shift]);

  const shifts = ['A', 'B', 'C', 'D'];

  return (
    <>
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-bold text-white tracking-tight">Dispatch Ops</h1>
          <p className="text-slate-400 mt-2 uppercase tracking-[0.2em] text-xs font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Active Shift Selection</span>
          <div className="flex p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 gap-1">
            {shifts.map((s) => (
              <button
                key={s}
                onClick={() => setShift(s)}
                className={`
                  w-12 h-10 flex items-center justify-center rounded-xl font-bold transition-all duration-300
                  ${shift === s 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                `}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-50">
        {/* Date Selection Card */}
        <section className="lg:col-span-4 backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Calendar className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Operations Date</h2>
                <p className="text-sm text-slate-400">Set the active tracking period</p>
              </div>
            </div>
            
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-16 bg-black/20 border border-white/10 rounded-2xl px-6 text-white font-mono text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all uppercase"
            />
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-xs font-bold tracking-widest text-slate-500 uppercase">
             <span>Designated Date</span>
             <span className="text-indigo-400">{date}</span>
          </div>
        </section>

        {/* Operations Calendar Section */}
        <section className="lg:col-span-8 backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8">
          <OpsCalendar />
        </section>
      </div>

      <div className="space-y-8 relative z-0">
        <h2 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-2">
           <Activity className="w-3 h-3 text-indigo-400" />
           Regional Environmental Monitoring
        </h2>
        <WeatherDashboard />
      </div>
    </>
  );
}

function OpsCalendar() {
  const { isAdmin } = useAuthRole();
  const [events, setEvents] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', type: 'event', eventDate: '', eventTime: '' });

  useEffect(() => {
    let unsub: (() => void) | null = null;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        if (!unsub) {
          const q = query(collection(db, 'calendar_events'), orderBy('eventDate', 'desc'));
          unsub = onSnapshot(q, (snapshot) => {
            const items: any[] = [];
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
            // Firebase orderBy might fail if index isn't created, so we keep the client sort fallback if needed
            // But usually we want chronologically closest first
            items.sort((a, b) => {
               const dateA = new Date(`${a.eventDate} ${a.eventTime}`).getTime();
               const dateB = new Date(`${b.eventDate} ${b.eventTime}`).getTime();
               return dateA - dateB;
            });
            setEvents(items);
          }, (err) => handleFirestoreError(err, 'list' as any, 'calendar_events'));
        }
      } else {
        if (unsub) {
          unsub();
          unsub = null;
        }
        setEvents([]);
      }
    });

    return () => {
      unsubAuth();
      if (unsub) unsub();
    };
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;
    try {
      await addDoc(collection(db, 'calendar_events'), {
        ...newEvent,
        createdBy: auth.currentUser?.email,
        createdAt: serverTimestamp()
      });
      setNewEvent({ title: '', description: '', type: 'event', eventDate: '', eventTime: '' });
      setShowAddModal(false);
    } catch (err) {
      handleFirestoreError(err, 'write' as any, 'calendar_events');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'calendar_events', id));
    } catch (err) {
      handleFirestoreError(err, 'delete' as any, 'calendar_events');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight uppercase">Ops Calendar</h3>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
            <Info className="w-12 h-12 opacity-10 mb-4" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold italic">No scheduled operations available</p>
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="group p-5 bg-black/20 border border-white/5 rounded-2xl transition-all hover:bg-black/30 hover:border-white/10">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    event.type === 'alert' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    event.type === 'info' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                    'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {event.type === 'alert' ? <AlertCircle className="w-4 h-4" /> :
                     event.type === 'info' ? <Info className="w-4 h-4" /> :
                     <Calendar className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-tight">{event.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[9px] font-mono text-indigo-400 uppercase flex items-center gap-1.5 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                        <Calendar className="w-2.5 h-2.5" />
                        {event.eventDate || 'No Date'}
                      </p>
                      <p className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
                        <Clock className="w-2.5 h-2.5" />
                        {event.eventTime || 'No Time'}
                      </p>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-400 leading-relaxed pl-11">
                {event.description}
              </p>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl shadow-indigo-500/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
                  <PlusCircle className="w-6 h-6 text-indigo-400" />
                  Add Calendar Event
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Event Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['event', 'info', 'alert'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, type })}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          newEvent.type === type 
                            ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' 
                            : 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Title</label>
                  <input 
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full h-14 bg-black/20 border border-white/10 rounded-xl px-6 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Enter event title..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date</label>
                    <input 
                      type="date"
                      required
                      value={newEvent.eventDate}
                      onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                      className="w-full h-14 bg-black/20 border border-white/10 rounded-xl px-6 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Time</label>
                    <input 
                      type="time"
                      required
                      value={newEvent.eventTime}
                      onChange={(e) => setNewEvent({ ...newEvent, eventTime: e.target.value })}
                      className="w-full h-14 bg-black/20 border border-white/10 rounded-xl px-6 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</label>
                  <textarea 
                    rows={4}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                    placeholder="Provide additional details..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full h-16 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 transition-all mt-4"
                >
                  Confirm Event Placement
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
// sync
