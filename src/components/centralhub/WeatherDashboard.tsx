import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wind, 
  AlertCircle, 
  Thermometer, 
  MapPin, 
  RefreshCw, 
  Navigation, 
  Shield, 
  Settings, 
  X, 
  Bell, 
  Clock, 
  ArrowDown, 
  ArrowUp,
  CloudRain,
  Sun,
  Cloud,
  CloudLightning,
  Snowflake,
  Gauge
} from 'lucide-react';
import { useTerminal } from '../../context/TerminalContext';
import { onSnapshot, doc, db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface WeatherSettings {
  forecastDays: number;
  fontFamily: string;
  fontWeight: string;
  animatedIcons: boolean;
  hideAlertsIfEmpty: boolean;
  showPressure?: boolean;
  showTimeline?: boolean;
  showTomorrow?: boolean;
  showCurrent?: boolean;
}

interface WeatherData {
  temperature: number;
  condition: string;
  unit: string;
  forecast: any[];
  hourly: any[];
  alerts: any[];
  location: string;
  pressure?: number;
  humidity?: number;
  windSpeed?: string;
  windDirection?: string;
  daily: any[];
}

const DEFAULT_MODULES = {
  showPressure: true,
  showTimeline: true,
  showTomorrow: true,
  showCurrent: true
};

export function WeatherDashboard({ settings, compact = false }: { settings?: WeatherSettings, compact?: boolean }) {
  const { 
    setEmergencyLevel, 
    weatherZip, 
    setWeatherZip, 
    addNotification, 
    requestNotificationPermission, 
    notificationPermission 
  } = useTerminal();
  
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zipInput, setZipInput] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [globalModules, setGlobalModules] = useState(DEFAULT_MODULES);
  
  const notifiedAlerts = useRef<Set<string>>(new Set());
  const forecastDays = settings?.forecastDays || 5;

  // Derrive active modules from local settings if available, otherwise global
  const activeModules = {
    showCurrent: settings?.showCurrent ?? globalModules.showCurrent,
    showPressure: settings?.showPressure ?? globalModules.showPressure,
    showTimeline: settings?.showTimeline ?? globalModules.showTimeline,
    showTomorrow: settings?.showTomorrow ?? globalModules.showTomorrow,
  };

  // Sync Global Weather Modules settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (s) => {
      if (s.exists()) {
        const data = s.data();
        if (data.weatherModules) {
          setGlobalModules(data.weatherModules);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (weather) {
      if (weather.alerts.length > 0) {
        setEmergencyLevel('CRITICAL');
        weather.alerts.forEach((alert: any) => {
          const id = alert.id || (alert.properties && alert.properties.id);
          if (id && !notifiedAlerts.current.has(id)) {
            addNotification(`NWS ALERT: ${alert.properties.event}. ${alert.properties.headline}`, 'error');
            notifiedAlerts.current.add(id);
          }
        });
      } else {
        setEmergencyLevel('NORMAL');
      }
    }
  }, [weather, setEmergencyLevel, addNotification]);

  useEffect(() => {
    async function getWeatherData() {
      setLoading(true);
      setError(null);
      
      try {
        let latitude: number;
        let longitude: number;

        if (weatherZip) {
          const zipRes = await fetch(`https://api.zippopotam.us/us/${weatherZip}`, {
            headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' }
          });
          if (!zipRes.ok) throw new Error('Invalid or unrecognized Zip Code.');
          const zipData = await zipRes.json();
          const place = zipData.places[0];
          latitude = parseFloat(place.latitude);
          longitude = parseFloat(place.longitude);
        } else {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }

        const pointsRes = await fetch(`https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`, {
          headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' }
        });
        if (!pointsRes.ok) throw new Error('Could not find NOAA grid coordinates.');
        const pointsData = await pointsRes.json();
        
        const forecastUrl = pointsData.properties.forecast;
        const forecastHourlyUrl = pointsData.properties.forecastHourly;
        const observationStationsUrl = pointsData.properties.observationStations;
        const city = pointsData.properties.relativeLocation.properties.city;
        const state = pointsData.properties.relativeLocation.properties.state;

        // Fetch stations first to get latest observations (for pressure)
        const stationsRes = await fetch(observationStationsUrl, {
          headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' }
        });
        const stationsData = await stationsRes.json();
        const stationId = stationsData.features[0].id;

        const [forecastRes, hourlyRes, alertsRes, obsRes] = await Promise.all([
          fetch(forecastUrl, { headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' } }),
          fetch(forecastHourlyUrl, { headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' } }),
          fetch(`https://api.weather.gov/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`, {
            headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' }
          }),
          fetch(`${stationId}/observations/latest`, { headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' } })
        ]);

        if (!forecastRes.ok || !hourlyRes.ok) throw new Error('Forecast signals interrupted.');
        
        const forecastData = await forecastRes.json();
        const hourlyData = await hourlyRes.json();
        const alertsData = await alertsRes.json();
        const obsData = obsRes.ok ? await obsRes.json() : null;

        const currentPeriod = forecastData.properties.periods[0];
        
        // Pressure conversion: Pa to inHg
        const pressurePa = obsData?.properties?.barometricPressure?.value;
        const pressureInHg = pressurePa ? (pressurePa * 0.0002953).toFixed(2) : undefined;
        
        // Derive daily from forecast periods (NOAA returns roughly 14 periods, usually Day/Night entries)
        const daily: any[] = [];
        for (let i = 0; i < forecastData.properties.periods.length; i += 2) {
          const dayPeriod = forecastData.properties.periods[i];
          const nightPeriod = forecastData.properties.periods[i + 1];
          if (dayPeriod && nightPeriod) {
            daily.push({
              name: dayPeriod.name,
              high: dayPeriod.temperature,
              low: nightPeriod.temperature,
              condition: dayPeriod.shortForecast,
              icon: dayPeriod.icon,
              detailed: dayPeriod.detailedForecast
            });
          }
        }

        setWeather({
          temperature: currentPeriod.temperature,
          condition: currentPeriod.shortForecast,
          unit: currentPeriod.temperatureUnit,
          forecast: forecastData.properties.periods.slice(0, forecastDays),
          hourly: hourlyData.properties.periods.slice(0, 24),
          alerts: alertsData.features || [],
          location: `${city}, ${state}`,
          pressure: pressureInHg ? parseFloat(pressureInHg) : undefined,
          humidity: obsData?.properties?.relativeHumidity?.value,
          windSpeed: currentPeriod.windSpeed,
          windDirection: currentPeriod.windDirection,
          daily: daily
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Satellite Link Failed');
      } finally {
        setLoading(false);
      }
    }

    getWeatherData();
    const interval = setInterval(getWeatherData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [retryCount, weatherZip, forecastDays]);

  const AnimatedWeatherIcon = ({ condition, size = 24, className = "" }: { condition: string, size?: number, className?: string }) => {
    const c = condition.toLowerCase();
    
    if (c.includes('thunder') || c.includes('storm')) {
      return (
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={cn("text-yellow-400", className)}
        >
          <CloudLightning size={size} />
        </motion.div>
      );
    }
    if (c.includes('rain') || c.includes('shower')) {
      return (
        <motion.div 
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className={cn("text-blue-400", className)}
        >
          <CloudRain size={size} />
        </motion.div>
      );
    }
    if (c.includes('snow') || c.includes('ice')) {
      return (
        <motion.div 
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className={cn("text-sky-200", className)}
        >
          <Snowflake size={size} />
        </motion.div>
      );
    }
    if (c.includes('cloud')) {
      return (
        <motion.div 
          animate={{ x: [-5, 5, -5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className={cn("text-slate-400", className)}
        >
          <Cloud size={size} />
        </motion.div>
      );
    }
    return (
      <motion.div 
        animate={{ rotate: [0, 90, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className={cn("text-yellow-500", className)}
      >
        <Sun size={size} />
      </motion.div>
    );
  };

  const handleUpdateZip = (e: React.FormEvent) => {
    e.preventDefault();
    if (zipInput.length === 5) {
      setWeatherZip(zipInput);
      setIsModalOpen(false);
    }
  };

  if (loading && !weather) {
    return (
      <div className="w-full bg-[#0a0a0c] border border-white/5 rounded-[2rem] p-12 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Initializing Atmospheric Telemetry</p>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="w-full bg-rose-500/5 border border-rose-500/20 rounded-[2rem] p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-6" />
        <h3 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tight">Telemetry Link Offline</h3>
        <p className="text-sm text-slate-500 mb-8 max-w-sm uppercase font-bold tracking-widest">{error}</p>
        <button onClick={() => setRetryCount(prev => prev + 1)} className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all">Re-establish Connection</button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("w-full h-full flex flex-col p-6 gap-6 overflow-hidden", settings?.fontFamily)}>
         {activeModules.showCurrent && (
           <div className="flex items-center gap-6 shrink-0">
              <div className="text-5xl font-black text-white glow-number leading-none flex items-start">
                {weather?.temperature}<span className="text-lg text-slate-500 mt-1">°</span>
              </div>
              {weather && <AnimatedWeatherIcon condition={weather.condition} size={48} />}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] truncate leading-tight mb-1">{weather?.condition}</p>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] truncate italic">{weather?.location}</p>
              </div>
              {activeModules.showPressure && weather?.pressure && (
                <div className="hidden xl:flex flex-col items-end gap-1 px-4 py-2 bg-white/5 border border-white/5 rounded-xl">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Barometric</span>
                  <span className="text-xs font-black text-indigo-400 font-mono italic">{weather.pressure} INHG</span>
                </div>
              )}
              <div className="hidden sm:flex flex-col items-end gap-1 opacity-40">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Telemetry Sync</span>
                <span className="text-[9px] font-black text-slate-400 font-mono italic">{format(new Date(), 'HH:mm')}</span>
              </div>
           </div>
         )}
         
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
           {activeModules.showCurrent && (
             <div className="flex flex-col gap-2 min-h-0 lg:border-r lg:border-white/5 pr-4">
               <h4 className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
                 <Wind className="w-3 h-3" /> Vector Dynamics
               </h4>
               <div className="flex flex-col gap-1 px-5 py-2 bg-white/[0.02] border border-white/5 rounded-xl flex-1 justify-center">
                 <div className="flex justify-between items-center">
                   <span className="text-[8px] font-bold text-slate-500 uppercase">Wind Velocity</span>
                   <span className="text-[10px] font-black text-white">{weather?.windSpeed} {weather?.windDirection}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-[8px] font-bold text-slate-500 uppercase">Humidity Matrix</span>
                   <span className="text-[10px] font-black text-white">{weather?.humidity}%</span>
                 </div>
               </div>
             </div>
           )}

           {activeModules.showTimeline && (
             <div className="flex flex-col gap-2 min-h-0">
               <h4 className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
                 <Clock className="w-3 h-3" /> 24H Forecast
               </h4>
               <div className="flex justify-between items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl flex-1 overflow-hidden">
                 {weather?.hourly.slice(0, 5).map((hour, idx) => (
                   <div key={idx} className="flex flex-col items-center gap-1.5 min-w-[32px]">
                     <span className="text-[8px] font-black text-slate-500">{format(new Date(hour.startTime), 'HH')}</span>
                     <span className="text-[10px] font-black text-white">{hour.temperature}°</span>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {activeModules.showTomorrow && weather?.daily && weather.daily.length > 1 && (
             <div className="flex flex-col gap-2 min-h-0">
               <h4 className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
                 <Shield className="w-3 h-3" /> T+24H Outlook
               </h4>
               <div className="flex items-center justify-between px-5 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex-1">
                 <div className="flex items-center gap-3">
                   <AnimatedWeatherIcon condition={weather.daily[1].condition} size={24} />
                   <div className="flex flex-col">
                     <span className="text-[9px] font-black text-white uppercase tracking-wider">{weather.daily[1].condition}</span>
                     <span className="text-[8px] font-bold text-slate-500 uppercase leading-none">Trend</span>
                   </div>
                 </div>
                 <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-white">{weather.daily[1].high}°</span>
                    <span className="text-[10px] font-black text-slate-500">/ {weather.daily[1].low}°</span>
                 </div>
               </div>
             </div>
           )}

           {activeModules.showPressure && weather?.pressure && (
             <div className="xl:hidden flex flex-col gap-2">
                <h4 className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
                  <Gauge className="w-3 h-3" /> Pressure Analytics
                </h4>
                <div className="px-5 py-2 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between flex-1">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Steady State</span>
                   <span className="text-sm font-black text-indigo-400 font-mono italic">{weather.pressure} INHG</span>
                </div>
             </div>
           )}
         </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 lg:p-12 space-y-12 overflow-y-auto custom-scrollbar", settings?.fontFamily)}>
      {/* HEADER SECTION */}
      {(activeModules.showCurrent || !compact) && (
        <div className="flex flex-wrap items-end justify-between gap-8 pb-10 border-b border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-500 text-[10px] uppercase font-black tracking-[0.3em]">
              <MapPin className="w-4 h-4 text-indigo-500" />
              Sector {weather?.location} Matrix
            </div>
            {activeModules.showCurrent && (
              <>
                <div className="flex items-center gap-8">
                  <div className="text-8xl font-black text-white tracking-tighter glow-number flex items-start">
                    {weather?.temperature}
                    <span className="text-3xl mt-4 text-slate-600 ml-2">°{weather?.unit}</span>
                  </div>
                  {weather && <AnimatedWeatherIcon condition={weather.condition} size={80} className="drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]" />}
                </div>
                <div className="flex items-center gap-6">
                  <p className="text-2xl font-black text-text-dim uppercase tracking-tight italic">{weather?.condition}</p>
                  {weather?.windSpeed && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Wind className="w-3 h-3" />
                      {weather.windSpeed} {weather.windDirection}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsModalOpen(true)} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all group">
              <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* MODULES GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PRIMARY MODULES */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* HOURLY TIMELINE */}
          {activeModules.showTimeline && (
            <div className="tactical-card p-8 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 italic">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Shift Timeline <span className="text-slate-500 not-italic">24H Operational window</span>
                </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar-h">
                {weather?.hourly.map((hour, idx) => (
                  <div key={idx} className="flex-shrink-0 w-24 p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center gap-3 group hover:border-indigo-500/30 transition-all">
                    <span className="text-[9px] font-black text-slate-500 uppercase">{format(new Date(hour.startTime), 'HH:mm')}</span>
                    <AnimatedWeatherIcon condition={hour.shortForecast} size={24} />
                    <span className="text-lg font-black text-white">{hour.temperature}°</span>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${hour.probabilityOfPrecipitation?.value || 0}%` }}
                        className="h-full bg-blue-500"
                       />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALERTS SECTION */}
          {weather && weather.alerts.length > 0 && (
            <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-[2rem] p-8 space-y-6 tactical-card-glow-rose">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-rose-500 animate-pulse" />
                  <h3 className="text-lg font-black text-white uppercase tracking-tight italic">NWS Deployment Warnings</h3>
                </div>
                <span className="px-4 py-1 bg-rose-500 text-white text-[10px] font-black rounded-full">ACTION REQUIRED</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weather.alerts.map((alert, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedAlert(alert)}
                    className="text-left p-6 bg-black/40 rounded-2xl border border-rose-500/20 hover:border-rose-500 transition-all space-y-2"
                  >
                    <h4 className="text-white font-black uppercase text-xs tracking-tight">{alert.properties.event}</h4>
                    <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest line-clamp-2">{alert.properties.headline}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ANALYTICS MODULES */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* PRESSURE MODULE */}
          {activeModules.showPressure && (
            <div className="tactical-card p-8 space-y-6">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 italic">
                <Gauge className="w-4 h-4 text-emerald-400" />
                Atmospheric Pressure
              </h3>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-4xl font-black text-white glow-number">{weather?.pressure || '---'}</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Inches of Mercury (inHg)</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <ArrowUp className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
              <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <p className="text-lg font-black text-white">{weather?.humidity || '--'}%</p>
                   <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Relative Humidity</p>
                </div>
                <div className="space-y-1">
                   <p className="text-lg font-black text-white">{weather?.temperature ? Math.round(weather.temperature - 2) : '--'}°</p>
                   <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Dew Point</p>
                </div>
              </div>
            </div>
          )}

          {/* TOMORROW MODULE */}
          {activeModules.showTomorrow && weather && weather.forecast.length > 2 && (
            <div className="tactical-card p-8 space-y-6 bg-indigo-600/5 border-indigo-500/20">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 italic">
                <Shield className="w-4 h-4 text-indigo-400" />
                Ops Outlook <span className="text-slate-500 not-italic">T+24H</span>
              </h3>
              <div className="flex items-center gap-6">
                <AnimatedWeatherIcon condition={weather.forecast[2].shortForecast} size={48} />
                <div>
                   <p className="text-3xl font-black text-white tracking-tight">{weather.forecast[2].temperature}°</p>
                   <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">Projected Peak</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 font-bold uppercase leading-relaxed">{weather.forecast[2].detailedForecast}</p>
            </div>
          )}
        </div>
      </div>

      {/* ZIP MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-bg-surface border border-white/10 rounded-[3rem] p-12 w-full max-w-md shadow-2xl overflow-hidden"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
               <div className="relative z-10 space-y-8">
                 <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Set Link Node</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
                 </div>
                 <form onSubmit={handleUpdateZip} className="space-y-6">
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4">Target Sector Zip Code</label>
                     <input 
                       type="text" 
                       maxLength={5}
                       value={zipInput}
                       onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ''))}
                       className="w-full h-16 tactical-input px-8 text-xl text-white font-mono"
                       placeholder="e.g. 30302"
                     />
                   </div>
                   <button type="submit" className="w-full py-5 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all italic text-xs">Establish Linkage</button>
                 </form>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALERT MODAL */}
      <AnimatePresence>
        {selectedAlert && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <div onClick={() => setSelectedAlert(null)} className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="relative bg-rose-950 border border-rose-500/30 rounded-[3.5rem] p-12 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
               <div className="flex justify-between items-start mb-12">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/40">
                      <AlertCircle size={32} className="text-white animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white uppercase italic leading-none">{selectedAlert.properties.event}</h3>
                      <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.4em] mt-2">National Weather Service Red-Level Protocol</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedAlert(null)} className="p-3 bg-white/5 rounded-full text-slate-500 hover:text-white transition-all"><X size={20} /></button>
               </div>
               <div className="space-y-10">
                 <div className="p-10 bg-black/40 border border-rose-500/20 rounded-3xl space-y-6">
                    <p className="text-xl font-bold text-white italic">{selectedAlert.properties.headline}</p>
                    <div className="h-px bg-rose-500/20" />
                    <p className="text-sm text-slate-300 leading-relaxed font-mono uppercase whitespace-pre-wrap">{selectedAlert.properties.description}</p>
                 </div>
                 {selectedAlert.properties.instruction && (
                   <div className="p-10 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Command Directive</p>
                      <p className="text-emerald-100 font-bold italic leading-relaxed uppercase">{selectedAlert.properties.instruction}</p>
                   </div>
                 )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
// sync
