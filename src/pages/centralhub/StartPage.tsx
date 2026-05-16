import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Shield, 
  Activity, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Info, 
  MessageSquare, 
  PlusCircle, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  GripVertical,
  Wind,
  Settings,
  FileText,
  ArrowUp,
  Newspaper
} from 'lucide-react';
import { WeatherDashboard } from '../../components/centralhub/WeatherDashboard';
import { NewsWidget } from '../../components/centralhub/NewsWidget';
import { useTerminal } from '../../context/TerminalContext';
import { onSnapshot, collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from '../../lib/firebase';
import { useAuthRole } from '../../hooks/useAuthRole';
import { motion, AnimatePresence } from 'motion/react';
import { SHIFT_TEAMS } from '../../lib/shiftConstants';
import { Modal } from '../../components/centralhub/Modal';

import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
} from 'date-fns';

import { useNavigate } from 'react-router-dom';

interface ClockSettings {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  showDate: boolean;
  is24Hour: boolean;
  color: string;
}

interface WeatherSettings {
  forecastDays: number;
  fontFamily: string;
  fontWeight: string;
  animatedIcons: boolean;
  hideAlertsIfEmpty: boolean;
}

interface NewsSettings {
  source: string;
  articleCount: number;
  fontFamily: string;
  refreshInterval: number;
}

interface WidgetItem {
  id: string;
  type: 'time' | 'weather' | 'personnel' | 'calendar' | 'shift_report' | 'custom_new' | 'news';
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isVisible: boolean;
  clockSettings?: ClockSettings;
  weatherSettings?: WeatherSettings;
  newsSettings?: NewsSettings;
}

const DEFAULT_CLOCK_SETTINGS: ClockSettings = {
  fontFamily: 'font-mono',
  fontSize: 'text-6xl',
  fontWeight: 'font-black',
  showDate: true,
  is24Hour: true,
  color: 'text-white',
};

const DEFAULT_WEATHER_SETTINGS: WeatherSettings = {
  forecastDays: 5,
  fontFamily: 'font-sans',
  fontWeight: 'font-black',
  animatedIcons: true,
  hideAlertsIfEmpty: false,
};

const DEFAULT_NEWS_SETTINGS: NewsSettings = {
  source: 'google',
  articleCount: 10,
  fontFamily: 'font-sans',
  refreshInterval: 15,
};

const DEFAULT_WIDGETS: WidgetItem[] = [
  { id: 'widget-time', type: 'time', title: 'Operational Clock', size: 'sm', isVisible: true, clockSettings: DEFAULT_CLOCK_SETTINGS },
  { id: 'widget-weather', type: 'weather', title: 'Environment Monitor', size: 'md', isVisible: true, weatherSettings: DEFAULT_WEATHER_SETTINGS },
  { id: 'widget-personnel', type: 'personnel', title: 'Personnel Deployment', size: 'xl', isVisible: true },
  { id: 'widget-calendar', type: 'calendar', title: 'Operations Calendar', size: 'xl', isVisible: true },
  { id: 'widget-shift-report', type: 'shift_report', title: 'Shift Report Entry', size: 'md', isVisible: true },
  { id: 'widget-news', type: 'news', title: 'Global Intel Feed', size: 'lg', isVisible: false, newsSettings: DEFAULT_NEWS_SETTINGS },
];

export function StartPage() {
  const [now, setNow] = useState(new Date());
  const [widgets, setWidgets] = useState<WidgetItem[]>(() => {
    const saved = localStorage.getItem('start-page-widgets-v7');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingClock, setEditingClock] = useState<WidgetItem | null>(null);
  const [editingWeather, setEditingWeather] = useState<WidgetItem | null>(null);
  const [editingNews, setEditingNews] = useState<WidgetItem | null>(null);
  const [showFullWeather, setShowFullWeather] = useState(false);

  const updateWidgetSize = (id: string, size: 'sm' | 'md' | 'lg' | 'xl') => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w));
  };

  const updateClockSettings = (id: string, settings: ClockSettings) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, clockSettings: settings } : w));
    setEditingClock(null);
  };

  const updateWeatherSettings = (id: string, settings: WeatherSettings) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, weatherSettings: settings } : w));
    setEditingWeather(null);
  };

  const updateNewsSettings = (id: string, settings: NewsSettings) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, newsSettings: settings } : w));
    setEditingNews(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    localStorage.setItem('start-page-widgets-v7', JSON.stringify(widgets));
  }, [widgets]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, isVisible: false } : w));
  };

  const addWidget = (type: string) => {
    setWidgets(prev => prev.map(w => w.type === type ? { ...w, isVisible: true } : w));
    setShowAddMenu(false);
  };

  const visibleWidgets = widgets.filter(w => w.isVisible);
  const hiddenWidgets = widgets.filter(w => !w.isVisible);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-8 pb-10 border-b border-white/5 relative tactical-header-glow">
        <div className="space-y-4">
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform duration-500">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-5xl font-black tracking-tight text-text-main uppercase italic">
              Dispatch <span className="text-indigo-500 not-italic">Ops</span>
            </h1>
          </div>
          <p className="text-text-dim font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3">
             <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
             Strategic Command Hub v5.0
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-4xl font-black text-text-main glow-number tracking-tighter leading-none">{format(now, 'HH:mm:ss')}</p>
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.3em] mt-2">{format(now, 'EEEE, LLLL do')}</p>
          </div>
          <button 
            onClick={() => setShowAddMenu(true)}
            className="px-6 py-3 glass-effect border-indigo-500/30 text-indigo-500 hover:text-text-main rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all hover:bg-indigo-500/10"
          >
            <Plus className="w-4 h-4" />
            Add Module
          </button>
        </div>
      </header>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={visibleWidgets.map(w => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10 auto-rows-auto">
            {visibleWidgets.map((widget) => (
              <SortableWidget 
                key={widget.id} 
                widget={widget} 
                onRemove={() => removeWidget(widget.id)}
                onResize={(size) => updateWidgetSize(widget.id, size)}
                onEditClock={() => setEditingClock(widget)}
                onEditWeather={() => setEditingWeather(widget)}
                onEditNews={() => setEditingNews(widget)}
                onExpandWeather={() => setShowFullWeather(true)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Modal
        isOpen={!!editingWeather}
        onClose={() => setEditingWeather(null)}
        title="Weather Configuration"
        icon={<Wind className="w-6 h-6" />}
      >
        {editingWeather && (
          <div className="space-y-8 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Future Cast Days</label>
                <select 
                  value={editingWeather.weatherSettings?.forecastDays}
                  onChange={(e) => updateWeatherSettings(editingWeather.id, { ...editingWeather.weatherSettings!, forecastDays: parseInt(e.target.value) })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="1">1 Day</option>
                  <option value="3">3 Days</option>
                  <option value="5">5 Days</option>
                  <option value="7">7 Days</option>
                  <option value="10">10 Days</option>
                  <option value="14">14 Days</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Typography</label>
                <select 
                  value={editingWeather.weatherSettings?.fontFamily}
                  onChange={(e) => updateWeatherSettings(editingWeather.id, { ...editingWeather.weatherSettings!, fontFamily: e.target.value })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="font-sans">Inter Sans</option>
                  <option value="font-mono">JetBrains Mono</option>
                  <option value="font-serif">Editorial Serif</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Font Weight</label>
                <select 
                  value={editingWeather.weatherSettings?.fontWeight}
                  onChange={(e) => updateWeatherSettings(editingWeather.id, { ...editingWeather.weatherSettings!, fontWeight: e.target.value })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="font-normal">Normal</option>
                  <option value="font-bold">Bold</option>
                  <option value="font-black">Black/Heavy</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => updateWeatherSettings(editingWeather.id, { ...editingWeather.weatherSettings!, animatedIcons: !editingWeather.weatherSettings?.animatedIcons })}
                className={`p-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  editingWeather.weatherSettings?.animatedIcons ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' : 'bg-black/40 border-white/5 text-slate-500'
                }`}
              >
                Animated Icons: {editingWeather.weatherSettings?.animatedIcons ? 'ENABLED' : 'DISABLED'}
              </button>
              <button
                onClick={() => updateWeatherSettings(editingWeather.id, { ...editingWeather.weatherSettings!, hideAlertsIfEmpty: !editingWeather.weatherSettings?.hideAlertsIfEmpty })}
                className={`p-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  editingWeather.weatherSettings?.hideAlertsIfEmpty ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' : 'bg-black/40 border-white/5 text-slate-500'
                }`}
              >
                Hide NOAA Box if Empty: {editingWeather.weatherSettings?.hideAlertsIfEmpty ? 'YES' : 'NO'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editingNews}
        onClose={() => setEditingNews(null)}
        title="Intel Feed Configuration"
        icon={<Newspaper className="w-6 h-6" />}
      >
        {editingNews && (
          <div className="space-y-8 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Intel Source</label>
                <select 
                  value={editingNews.newsSettings?.source}
                  onChange={(e) => updateNewsSettings(editingNews.id, { ...editingNews.newsSettings!, source: e.target.value })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="cnn">CNN Tactical</option>
                  <option value="fox">Fox Division</option>
                  <option value="tech">Tech Matrix</option>
                  <option value="google">Google Signal</option>
                  <option value="reuters">Reuters Agency</option>
                  <option value="associated_press">AP Dispatch</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Intel Depth (Articles)</label>
                <select 
                  value={editingNews.newsSettings?.articleCount}
                  onChange={(e) => updateNewsSettings(editingNews.id, { ...editingNews.newsSettings!, articleCount: parseInt(e.target.value) })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="3">3 Packets</option>
                  <option value="5">5 Packets</option>
                  <option value="10">10 Packets</option>
                  <option value="20">20 Packets</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Typography</label>
                <select 
                  value={editingNews.newsSettings?.fontFamily}
                  onChange={(e) => updateNewsSettings(editingNews.id, { ...editingNews.newsSettings!, fontFamily: e.target.value })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="font-sans">Inter Sans</option>
                  <option value="font-mono">JetBrains Mono</option>
                  <option value="font-serif">Editorial Serif</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Sync Frequency</label>
                <select 
                  value={editingNews.newsSettings?.refreshInterval}
                  onChange={(e) => updateNewsSettings(editingNews.id, { ...editingNews.newsSettings!, refreshInterval: parseInt(e.target.value) })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="5">5 Miutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        isOpen={!!editingClock} 
        onClose={() => setEditingClock(null)}
        title="Clock Configuration"
        icon={<Clock className="w-6 h-6" />}
      >
        {editingClock && (
          <div className="space-y-8 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Typography</label>
                <select 
                  value={editingClock.clockSettings?.fontFamily}
                  onChange={(e) => updateClockSettings(editingClock.id, { ...editingClock.clockSettings!, fontFamily: e.target.value })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="font-sans">Inter Sans</option>
                  <option value="font-mono">JetBrains Mono</option>
                  <option value="font-serif">Editorial Serif</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Font Weight</label>
                <select 
                  value={editingClock.clockSettings?.fontWeight}
                  onChange={(e) => updateClockSettings(editingClock.id, { ...editingClock.clockSettings!, fontWeight: e.target.value })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="font-normal">Normal</option>
                  <option value="font-bold">Bold</option>
                  <option value="font-black">Black/Heavy</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Font Size</label>
                <select 
                  value={editingClock.clockSettings?.fontSize}
                  onChange={(e) => updateClockSettings(editingClock.id, { ...editingClock.clockSettings!, fontSize: e.target.value })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="text-3xl">Small</option>
                  <option value="text-5xl">Medium</option>
                  <option value="text-6xl">Large</option>
                  <option value="text-7xl">X-Large</option>
                  <option value="text-8xl">XX-Large</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Color Profile</label>
                <select 
                  value={editingClock.clockSettings?.color}
                  onChange={(e) => updateClockSettings(editingClock.id, { ...editingClock.clockSettings!, color: e.target.value })}
                  className="w-full tactical-input px-4 h-12 text-white text-xs font-black uppercase"
                >
                  <option value="text-white">White Ghost</option>
                  <option value="text-indigo-400">Indigo Tactical</option>
                  <option value="text-emerald-400">Emerald Active</option>
                  <option value="text-amber-400">Amber Warning</option>
                  <option value="text-rose-400">Critical Rose</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => updateClockSettings(editingClock.id, { ...editingClock.clockSettings!, is24Hour: !editingClock.clockSettings?.is24Hour })}
                className={`p-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  editingClock.clockSettings?.is24Hour ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' : 'bg-black/40 border-white/5 text-slate-500'
                }`}
              >
                24-Hour Format: {editingClock.clockSettings?.is24Hour ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => updateClockSettings(editingClock.id, { ...editingClock.clockSettings!, showDate: !editingClock.clockSettings?.showDate })}
                className={`p-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  editingClock.clockSettings?.showDate ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' : 'bg-black/40 border-white/5 text-slate-500'
                }`}
              >
                Display Date: {editingClock.clockSettings?.showDate ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}
      </Modal>
      
      <Modal
        isOpen={showFullWeather}
        onClose={() => setShowFullWeather(false)}
        title="Atmospheric Command Center"
        icon={<Wind className="w-6 h-6" />}
        fullWidth
      >
        <div className="h-[80vh]">
          <WeatherDashboard />
        </div>
      </Modal>

      <Modal 
        isOpen={showAddMenu} 
        onClose={() => setShowAddMenu(false)}
        title="Module Repository"
        icon={<PlusCircle className="w-6 h-6" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hiddenWidgets.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 uppercase font-black text-xs tracking-widest bg-white/5 rounded-3xl border border-dashed border-white/10">
              All tactical modules are currently deployed
            </div>
          ) : (
            hiddenWidgets.map(widget => (
              <button
                key={widget.id}
                onClick={() => addWidget(widget.type)}
                className="p-8 tactical-card hover:border-indigo-500 transition-all text-left flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-lg font-black text-white uppercase italic mb-1">{widget.title}</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Size: {widget.size?.toUpperCase()}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <Plus className="w-5 h-5" />
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

function SortableWidget({ 
  widget, 
  onRemove, 
  onResize,
  onEditClock,
  onEditWeather,
  onEditNews,
  onExpandWeather
}: { 
  widget: WidgetItem; 
  onRemove: () => void; 
  onResize: (size: 'sm' | 'md' | 'lg' | 'xl') => void;
  onEditClock?: () => void;
  onEditWeather?: () => void;
  onEditNews?: () => void;
  onExpandWeather?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const getColSpan = () => {
    switch (widget.size) {
      case 'xl': return 'col-span-1 md:col-span-2 lg:col-span-4';
      case 'lg': return 'col-span-1 md:col-span-2 lg:col-span-3';
      case 'md': return 'col-span-1 md:col-span-2';
      default: return 'col-span-1';
    }
  };

  const renderContent = () => {
    switch (widget.type) {
      case 'time':
        return <TimeWidgetContent settings={widget.clockSettings} />;
      case 'weather':
        return <div className="h-full"><WeatherDashboard settings={widget.weatherSettings} compact={true} /></div>;
      case 'news':
        return <div className="h-full"><NewsWidget settings={widget.newsSettings} compact={widget.size === 'sm' || widget.size === 'md'} /></div>;
      case 'personnel':
        return <PersonnelModalContent />;
      case 'calendar':
        return <OpsCalendar />;
      case 'shift_report':
        return <ShiftReportAddContent onClose={() => {}} />;
      default:
        return <div className="p-12 text-slate-500 uppercase font-black text-[10px] tracking-widest text-center">Module Offline</div>;
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`tactical-card p-0 flex flex-col relative group overflow-hidden ${getColSpan()}`}
    >
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div 
          {...attributes} 
          {...listeners} 
          className="flex items-center gap-3 cursor-grab active:cursor-grabbing text-text-dim hover:text-text-main transition-colors"
        >
          <GripVertical className="w-4 h-4" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim italic pr-2">{widget.title}</h4>
        </div>
        
        <div className="flex items-center gap-1">
          {widget.type === 'time' && (
            <button 
              onClick={onEditClock}
              className="p-1.5 text-text-dim hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all mr-1"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
          {widget.type === 'weather' && (
            <div className="flex items-center gap-1">
              <button 
                onClick={onExpandWeather}
                className="p-1.5 text-text-dim hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all mr-1"
                title="Expand Weather Dashboard"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button 
                onClick={onEditWeather}
                className="p-1.5 text-text-dim hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all mr-1"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
          {widget.type === 'news' && (
            <button 
              onClick={onEditNews}
              className="p-1.5 text-text-dim hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all mr-1"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <div className="flex bg-black/5 rounded-lg p-0.5 border border-white/5 mr-2">
            {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
              <button
                key={s}
                onClick={() => onResize(s)}
                className={`
                  w-6 h-5 text-[8px] font-black uppercase flex items-center justify-center rounded-md transition-all
                  ${widget.size === s 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-text-dim hover:text-text-main hover:bg-white/5'}
                `}
              >
                {s}
              </button>
            ))}
          </div>
          <button 
            onClick={onRemove}
            className="p-1.5 text-text-dim hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 relative">
        {renderContent()}
      </div>
    </div>
  );
}

function PersonnelModalContent() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-4 h-full overflow-y-auto custom-scrollbar pr-2">
      {Object.entries(SHIFT_TEAMS).map(([name, team]) => (
        <div key={name} className="tactical-card p-6 group hover:border-indigo-500/30">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] italic">
              {name} <span className="text-text-dim not-italic">Shift</span>
            </h3>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] font-black text-text-main leading-tight uppercase tracking-tight">{team.lead}</p>
                <p className="text-[8px] text-emerald-600 font-black uppercase tracking-[0.2em] mt-0.5 italic">Protocol Lead</p>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-white/5">
              {team.members.map(member => (
                <div key={member} className="flex items-center gap-3 pl-2 group/member">
                  <div className="w-1 h-1 rounded-full bg-slate-700 group-hover/member:bg-indigo-500 transition-colors" />
                  <p className="text-[10px] font-bold text-text-dim group-hover/member:text-text-main transition-colors uppercase tracking-tight">{member}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimeWidgetContent({ settings = DEFAULT_CLOCK_SETTINGS }: { settings?: ClockSettings }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
      <div className={`
        ${settings.fontSize} 
        ${settings.fontWeight} 
        ${settings.color} 
        ${settings.fontFamily} 
        glow-number tracking-tighter
      `}>
        {format(now, settings.is24Hour ? 'HH:mm:ss' : 'hh:mm:ss aa')}
      </div>
      {settings.showDate && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em]">Operational Phase</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{format(now, 'EEEE, LLLL do')}</p>
        </div>
      )}
    </div>
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
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 p-4">
      {/* Monthly View */}
      <div className="xl:col-span-8 bg-bg-surface border border-white/10 rounded-3xl p-8 backdrop-blur-md transition-colors duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-indigo-500" />
             </div>
             <div>
                <h3 className="text-xl font-bold text-text-main uppercase tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h3>
                <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest">Global Ops Schedule</p>
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
      <div className="xl:col-span-4 flex flex-col gap-6">
        <div className="bg-bg-surface border border-white/10 rounded-3xl p-8 backdrop-blur-md flex-1 flex flex-col transition-colors duration-500">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-sm font-black text-text-main uppercase tracking-widest text-left">
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a date'}
              </h4>
              <p className="text-[9px] text-text-dim font-bold uppercase tracking-widest mt-1 text-left">Daily Operations</p>
            </div>
            {isAdmin && selectedDate && (
              <button 
                onClick={() => {
                  setNewEvent({ ...newEvent, eventDate: format(selectedDate, 'yyyy-MM-dd') });
                  setShowAddModal(true);
                }}
                className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/20"
              >
                <Plus size={20} />
              </button>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar max-h-[500px] pr-2">
            {selectedDayEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center opacity-30">
                <Shield className="w-10 h-10 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-text-main">No Sector Events</p>
              </div>
            ) : (
              selectedDayEvents.map(event => (
                <div key={event.id} className="group p-5 bg-black/5 border border-white/10 rounded-2xl hover:border-indigo-500/30 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                         event.type === 'alert' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                         event.type === 'info' ? 'bg-indigo-500' : 'bg-emerald-500'
                       }`} />
                      <h5 className="text-xs font-bold text-text-main uppercase tracking-tight text-left">{event.title}</h5>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1.5 text-text-dim hover:text-red-500 transition-colors bg-white/5 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-text-dim leading-relaxed mb-4 text-left">{event.description}</p>
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <Clock size={12} className="text-text-dim" />
                    <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest">{event.eventTime || 'All Day'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 backdrop-blur-xl bg-black/80">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-white/10 rounded-[2rem] p-10 w-full max-w-xl shadow-2xl transition-colors duration-500 overflow-hidden relative"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
              
              <div className="flex justify-between items-center mb-10 relative z-10">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                    <PlusCircle className="w-8 h-8 text-indigo-400" />
                    Secure Entry Matrix
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Calendar_Injection_Vector</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Classification</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['event', 'info', 'alert'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, type })}
                        className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          newEvent.type === type 
                            ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' 
                            : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Operation Identifier</label>
                  <input 
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full h-16 tactical-input px-6 text-white font-mono text-base focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase"
                    placeholder="ENTER TITLE..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Temporal Window</label>
                    <input 
                      type="date"
                      required
                      value={newEvent.eventDate}
                      onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                      className="w-full h-16 tactical-input px-6 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Precision Time</label>
                    <input 
                      type="time"
                      required
                      value={newEvent.eventTime}
                      onChange={(e) => setNewEvent({ ...newEvent, eventTime: e.target.value })}
                      className="w-full h-16 tactical-input px-6 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Briefing Data</label>
                  <textarea 
                    rows={4}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full tactical-input p-6 text-white font-mono text-sm leading-relaxed"
                    placeholder="PROVIDE ADDITIONAL TELEMETRY..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full h-18 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all mt-4 text-xs italic"
                >
                  Commit to Operational Stream
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShiftReportAddContent({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'shift_updates'), {
        content: content,
        timestamp: serverTimestamp(),
        author: auth.currentUser?.email || 'Anonymous',
        status: 'pending'
      });
      setContent('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Event Description</label>
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="tactical-input w-full p-6 text-white font-mono text-sm leading-relaxed"
          placeholder="ENTER OPERATIONAL UPDATE TO BE INCLUDED IN SHIFT REPORT..."
        />
      </div>
      <button 
        onClick={handleAdd}
        disabled={saving}
        className="w-full h-16 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-4"
      >
        {saving ? <Activity className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
        Inject into Operation Log
      </button>
    </div>
  );
}

// sync
