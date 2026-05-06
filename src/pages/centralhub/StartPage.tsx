import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, Shield, Activity, AlertCircle, Plus, Trash2, Info, MessageSquare, PlusCircle, X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { WeatherDashboard } from '../../components/centralhub/WeatherDashboard';
import { useTerminal } from '../../context/TerminalContext';
import { onSnapshot, collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from '../../lib/firebase';
import { useAuthRole } from '../../hooks/useAuthRole';
import { motion, AnimatePresence } from 'motion/react';
import { SHIFT_TEAMS } from '../../lib/shiftConstants';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';

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
                <CalendarIcon className="w-6 h-6 text-indigo-400" />
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

        {/* Environmental Monitoring in old Calendar slot */}
        <section className="lg:col-span-8">
          <WeatherDashboard />
        </section>
      </div>
    </>
  );
}

function OpsCalendar() {
  const { isAdmin } = useAuthRole();
  const [events, setEvents] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.eventDate === dayStr);
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Monthly View */}
      <div className="lg:col-span-8 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-indigo-400" />
             </div>
             <div>
                <h3 className="text-xl font-bold text-white uppercase tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Ops Schedule</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-400/30 rounded-lg hover:bg-indigo-400/10"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[9px] font-black text-slate-500 uppercase py-2 tracking-widest">{day}</div>
          ))}
          {calendarDays.map((day, i) => {
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const dayEvents = getEventsForDay(day);

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative aspect-square md:aspect-video rounded-xl border p-2 flex flex-col items-start gap-1 transition-all
                  ${!isCurrentMonth ? 'opacity-20 grayscale' : 'opacity-100'}
                  ${isSelected ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40'}
                  ${isToday ? 'ring-1 ring-emerald-500/50' : ''}
                `}
              >
                <span className={`text-xs font-bold ${isToday ? 'text-emerald-400' : isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>
                   {format(day, 'd')}
                </span>
                
                <div className="flex flex-wrap gap-1 mt-auto">
                   {dayEvents.slice(0, 3).map((e, idx) => (
                     <div 
                       key={idx} 
                       className={`w-1.5 h-1.5 rounded-full ${
                         e.type === 'alert' ? 'bg-red-500' : 
                         e.type === 'info' ? 'bg-indigo-400' : 'bg-emerald-500'
                       }`} 
                     />
                   ))}
                   {dayEvents.length > 3 && (
                     <span className="text-[8px] text-slate-500 font-bold">+{dayEvents.length - 3}</span>
                   )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Detail View */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest">
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a date'}
              </h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Daily Operations</p>
            </div>
            {isAdmin && selectedDate && (
              <button 
                onClick={() => {
                  setNewEvent({ ...newEvent, eventDate: format(selectedDate, 'yyyy-MM-dd') });
                  setShowAddModal(true);
                }}
                className="w-8 h-8 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/20"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar max-h-[500px] pr-2">
            {selectedDayEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center opacity-30">
                <Shield className="w-10 h-10 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">No Sector Events</p>
              </div>
            ) : (
              selectedDayEvents.map(event => (
                <div key={event.id} className="group p-4 bg-black/40 border border-white/5 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                         event.type === 'alert' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                         event.type === 'info' ? 'bg-indigo-400' : 'bg-emerald-500'
                       }`} />
                      <h5 className="text-xs font-bold text-white uppercase tracking-tight">{event.title}</h5>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{event.description}</p>
                  <div className="flex items-center gap-2">
                    <Clock size={10} className="text-slate-500" />
                    <span className="text-[9px] font-mono text-slate-500 uppercase">{event.eventTime || 'All Day'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
