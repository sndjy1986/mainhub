import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, AlertCircle, Thermometer, MapPin, RefreshCw, Navigation, Shield, Settings, X, Bell, BellOff } from 'lucide-react';
import { useTerminal } from '../../context/TerminalContext';

interface WeatherSettings {
  forecastDays: number;
  fontFamily: string;
  fontWeight: string;
  animatedIcons: boolean;
  hideAlertsIfEmpty: boolean;
}

interface WeatherData {
  temperature: number;
  condition: string;
  unit: string;
  forecast: any[];
  alerts: any[];
  location: string;
}

export function WeatherDashboard({ settings }: { settings?: WeatherSettings }) {
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
  
  // Track which alerts have been notified to avoid duplicates
  const notifiedAlerts = useRef<Set<string>>(new Set());

  const forecastDays = settings?.forecastDays || 5;

  useEffect(() => {
    if (weather) {
      if (weather.alerts.length > 0) {
        setEmergencyLevel('CRITICAL');
        
        // Trigger desktop notifications for NEW alerts
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
          // Resolve Zip to Lat/Lon using Zippopotam.us
          const zipRes = await fetch(`https://api.zippopotam.us/us/${weatherZip}`, {
            headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' }
          });
          if (!zipRes.ok) throw new Error('Invalid or unrecognized Zip Code.');
          const zipData = await zipRes.json();
          const place = zipData.places[0];
          latitude = parseFloat(place.latitude);
          longitude = parseFloat(place.longitude);
        } else {
          // Get Location via Browser Geolocation
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }

        // 2. Get NOAA Grid Points
        const pointsRes = await fetch(`https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`, {
          headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' }
        });
        if (!pointsRes.ok) throw new Error('Could not find NOAA grid coordinates for this location.');
        const pointsData = await pointsRes.json();
        
        const forecastUrl = pointsData.properties.forecast;
        const city = pointsData.properties.relativeLocation.properties.city;
        const state = pointsData.properties.relativeLocation.properties.state;

        // 3. Get Forecast & Alerts in Parallel
        const [forecastRes, alertsRes] = await Promise.all([
          fetch(forecastUrl, {
            headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' }
          }),
          fetch(`https://api.weather.gov/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`, {
            headers: { 'User-Agent': 'Dispatch Ops Central (sndjy1986@gmail.com)' }
          })
        ]);

        if (!forecastRes.ok) throw new Error('Forecast data unavailable.');
        
        const forecastData = await forecastRes.json();
        const alertsData = await alertsRes.json();

        const currentPeriod = forecastData.properties.periods[0];
        
        setWeather({
          temperature: currentPeriod.temperature,
          condition: currentPeriod.shortForecast,
          unit: currentPeriod.temperatureUnit,
          forecast: forecastData.properties.periods.slice(0, forecastDays),
          alerts: alertsData.features || [],
          location: `${city}, ${state}`
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to sync with NOAA satellites.');
      } finally {
        setLoading(false);
      }
    }

    getWeatherData();
    // Refresh every 15 minutes
    const interval = setInterval(getWeatherData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [retryCount, weatherZip, forecastDays]);

  const hasAlerts = weather && weather.alerts.length > 0;

  const getWeatherIcon = (condition: string, isMain: boolean = false) => {
    const c = condition.toLowerCase();
    const sizeClass = isMain ? "large" : "small";
    const animationClass = settings?.animatedIcons === false ? 'no-animation' : '';

    // CSS Animated Weather Icons
    if (c.includes('thunder') || c.includes('storm')) {
      return (
        <div className={`weather-icon thunder-storm ${sizeClass} ${animationClass}`}>
          <div className="cloud"></div>
          <div className="lightning">
            <div className="bolt"></div>
            <div className="bolt"></div>
          </div>
        </div>
      );
    }
    if (c.includes('rain') || c.includes('shower')) {
      return (
        <div className={`weather-icon sun-shower ${sizeClass} ${animationClass}`}>
          <div className="cloud"></div>
          <div className="sun">
            <div className="rays"></div>
          </div>
          <div className="rain">
            <div className="drop"></div>
            <div className="drop"></div>
            <div className="drop"></div>
            <div className="drop"></div>
          </div>
        </div>
      );
    }
    if (c.includes('snow') || c.includes('ice')) {
       return (
        <div className={`weather-icon flurries ${sizeClass} ${animationClass}`}>
          <div className="cloud"></div>
          <div className="snow">
            <div className="flake"></div>
            <div className="flake"></div>
            <div className="flake"></div>
          </div>
        </div>
       );
    }
    if (c.includes('cloud')) {
      return (
        <div className={`weather-icon cloudy ${sizeClass} ${animationClass}`}>
          <div className="cloud"></div>
          <div className="cloud" style={{ left: '60%', top: '40%', transform: 'scale(0.8)', opacity: 0.8 }}></div>
        </div>
      );
    }
    return (
      <div className={`weather-icon sunny ${sizeClass} ${animationClass}`}>
        <div className="sun">
          <div className="rays"></div>
        </div>
      </div>
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
      <div className="w-full aspect-[2/1] bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Contacting National Weather Service...</p>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
        <div className="w-full aspect-[2/1] bg-rose-500/10 border border-rose-500/20 rounded-3xl p-10 flex flex-col items-center justify-center backdrop-blur-md text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">Telemetry Failure</h3>
            <p className="text-sm text-slate-400 mb-8 max-w-sm uppercase tracking-tight">{error}</p>
            <button 
                onClick={() => setRetryCount(prev => prev + 1)}
                className="px-6 py-2 bg-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/20 transition-all"
            >
                Retry Linkage
            </button>
        </div>
    );
  }

  return (
    <div className={`w-full aspect-auto lg:aspect-[2.5/1] relative group overflow-hidden ${settings?.fontFamily || 'font-sans'}`}>
      {/* SEVERE ALERT BLINK EFFECT */}
      <AnimatePresence>
        {hasAlerts && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-rose-600 pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      <div className={`
        relative z-10 w-full h-full backdrop-blur-xl border-2 rounded-[2.5rem] p-10 flex flex-col lg:flex-row gap-10 transition-all duration-500
        ${hasAlerts 
          ? 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_50px_rgba(244,63,94,0.2)]' 
          : 'bg-white/5 border-white/10 shadow-2xl'}
      `}>
        
        {/* Settings Toggle */}
        <button 
          onClick={() => {
            setZipInput(weatherZip || '');
            setIsModalOpen(true);
          }}
          className="absolute top-8 right-8 p-2 rounded-full bg-white/5 border border-white/10 text-slate-500 hover:text-white hover:bg-white/10 transition-all z-20 group"
        >
          <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
        </button>

        {/* Zip Entry Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6"
            >
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={() => setIsModalOpen(false)}
              />
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative bg-[#1e293b] border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-indigo-400" />
                    Set Telemetry Grid
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateZip} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Local US Zip Code</label>
                    <input 
                      type="text" 
                      maxLength={5}
                      pattern="[0-9]*"
                      value={zipInput}
                      onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 90210"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    {notificationPermission !== 'granted' && (
                      <button 
                        type="button"
                        onClick={() => requestNotificationPermission()}
                        className="w-full py-3 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all flex items-center justify-center gap-2 mb-2"
                      >
                        <Bell className="w-4 h-4" />
                        Enable Desktop Alerts
                      </button>
                    )}
                    
                    <button 
                      type="submit"
                      className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                    >
                      Update Local Link
                    </button>
                    {weatherZip && (
                      <button 
                        type="button"
                        onClick={() => {
                          setWeatherZip(null);
                          setIsModalOpen(false);
                        }}
                        className="w-full py-2 text-slate-500 hover:text-slate-300 text-[9px] font-bold uppercase tracking-[0.2em]"
                      >
                        Reset to Auto-Geolocation
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alert Detail Modal */}
        <AnimatePresence>
          {selectedAlert && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6"
            >
              <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                onClick={() => setSelectedAlert(null)}
              />
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative bg-rose-950 border border-rose-500/50 rounded-[3rem] p-12 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.4)]">
                      <AlertCircle className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-tight">
                        {selectedAlert.properties.event}
                      </h3>
                      <p className="text-rose-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
                        National Weather Service Urgent Warning
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedAlert(null)} className="p-3 bg-white/5 rounded-full text-slate-400 hover:text-white transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="p-8 bg-black/40 border border-rose-500/20 rounded-3xl">
                    <p className="text-xl font-bold text-white mb-6 uppercase tracking-tight italic">
                      {selectedAlert.properties.headline}
                    </p>
                    <div className="w-full h-px bg-rose-500/20 mb-6" />
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono uppercase">
                      {selectedAlert.properties.description}
                    </p>
                  </div>

                  {selectedAlert.properties.instruction && (
                    <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                      <h4 className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Tactical Instructions
                      </h4>
                      <p className="text-emerald-100 text-sm leading-relaxed font-bold uppercase">
                        {selectedAlert.properties.instruction}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-1">
                       <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest leading-none">Severity</span>
                       <span className="text-xs font-black text-white uppercase">{selectedAlert.properties.severity}</span>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-1">
                       <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest leading-none">Urgency</span>
                       <span className="text-xs font-black text-white uppercase">{selectedAlert.properties.urgency}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Side: Current Status */}
        <div className="flex-shrink-0 flex flex-col justify-between lg:w-1/3">
           <div>
              <div className="flex items-center gap-2 text-slate-400 mb-6 font-bold uppercase tracking-widest text-[10px]">
                <MapPin className="w-3 h-3 text-indigo-400" />
                {weather?.location}
              </div>
              
              <div className="flex items-center gap-6">
                <div className={`text-7xl ${settings?.fontWeight || 'font-bold'} text-white tracking-tighter flex items-start`}>
                   {weather?.temperature}
                   <span className="text-2xl mt-2 text-slate-500 ml-1">°{weather?.unit}</span>
                </div>
                {weather && getWeatherIcon(weather.condition, true)}
              </div>
              
              <p className={`text-xl ${settings?.fontWeight || 'font-medium'} text-slate-300 mt-2 uppercase tracking-wide`}>
                {weather?.condition}
              </p>
           </div>
        </div>

        {/* Right Side: Alerts & Forecast */}
        <div className="flex-1 flex flex-col gap-6">
            {/* Severe Weather Alerts Section */}
            {(!settings?.hideAlertsIfEmpty || hasAlerts) && (
              <div className={`
                  flex-1 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md
                  ${hasAlerts 
                    ? 'bg-rose-500/20 border border-rose-500/30 cursor-pointer hover:bg-rose-500/30 transition-all' 
                    : 'bg-black/20 border border-white/5'}
              `}
              onClick={hasAlerts ? () => setSelectedAlert(weather?.alerts[0]) : undefined}
              >
                  <div className="flex items-center justify-between mb-4">
                      <span className={`text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 ${hasAlerts ? 'text-rose-400' : 'text-slate-500'}`}>
                          <AlertCircle className={`w-3 h-3 ${hasAlerts ? 'animate-pulse' : ''}`} />
                          NOAA Emergency Alerts
                      </span>
                      {hasAlerts && (
                          <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full animate-bounce">
                             ACTIVE WARNING
                          </span>
                      )}
                  </div>

                  {hasAlerts ? (
                      <div className="space-y-4">
                          {weather?.alerts.map((alert, idx) => (
                              <div key={idx} className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
                                  <h4 className="text-white font-bold text-sm mb-1">{alert.properties.event}</h4>
                                  <p className="text-[10px] text-rose-300/80 leading-relaxed uppercase font-mono line-clamp-2">
                                      {alert.properties.headline}
                                  </p>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center py-4">
                          <Shield className="w-8 h-8 text-emerald-500/30 mb-2" />
                          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No Active Warnings in Local Grid</p>
                      </div>
                  )}
              </div>
            )}

            {/* Daily Layout (Forecast Bar) */}
            <div className="bg-black/20 border border-white/5 rounded-3xl p-4 flex justify-between items-center px-8 overflow-x-auto custom-scrollbar gap-8">
                {weather?.forecast.map((period, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 flex-shrink-0">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[80px]">{period.name}</span>
                        {getWeatherIcon(period.shortForecast)}
                        <span className="text-sm font-bold text-white">{period.temperature}°</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
// sync
