import React, { createContext, useContext, useState, useEffect } from 'react';

type EmergencyLevel = 'NORMAL' | 'CAUTION' | 'CRITICAL' | 'LOCKDOWN';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}

interface TerminalContextType {
  emergencyLevel: EmergencyLevel;
  setEmergencyLevel: (level: EmergencyLevel) => void;
  manualEmergencyMode: boolean;
  setManualEmergencyMode: (val: boolean) => void;
  emergencyOpacity: number;
  setEmergencyOpacity: (val: number) => void;
  systemAdvisory: string;
  setSystemAdvisory: (val: string) => void;
  weatherZip: string | null;
  setWeatherZip: (zip: string | null) => void;
  notifications: Notification[];
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission | undefined>;
  addNotification: (message: string, type?: Notification['type']) => void;
  removeNotification: (id: string) => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const [emergencyLevel, setEmergencyLevel] = useState<EmergencyLevel>('NORMAL');
  const [manualEmergencyMode, setManualEmergencyMode] = useState(false);
  const [emergencyOpacity, setEmergencyOpacity] = useState(0.2);
  const [systemAdvisory, setSystemAdvisory] = useState('Maintain vigilance in Sector 7 and monitor all frequencies for anomalies.');
  const [weatherZip, setWeatherZip] = useState<string | null>(() => localStorage.getItem('weatherZip'));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  };

  const addNotification = (message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substring(7);
    const newNote: Notification = {
      id,
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setNotifications(prev => [newNote, ...prev].slice(0, 5));

    // System Level Notification
    if (notificationPermission === 'granted') {
      new Notification(`AI Dispatch Alert [${type.toUpperCase()}]`, {
        body: message,
        icon: '/favicon.ico', // Adjust icon path if necessary
        silent: type === 'info'
      });
    }

    // Auto remove after 8 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (weatherZip) {
      localStorage.setItem('weatherZip', weatherZip);
    } else {
      localStorage.removeItem('weatherZip');
    }
  }, [weatherZip]);

  return (
    <TerminalContext.Provider value={{ 
      emergencyLevel, 
      setEmergencyLevel,
      manualEmergencyMode,
      setManualEmergencyMode,
      emergencyOpacity,
      setEmergencyOpacity,
      systemAdvisory,
      setSystemAdvisory,
      weatherZip,
      setWeatherZip,
      notifications,
      notificationPermission,
      requestNotificationPermission,
      addNotification,
      removeNotification
    }}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (context === undefined) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
}
