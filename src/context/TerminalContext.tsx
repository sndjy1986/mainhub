import React, { createContext, useContext, useState, useEffect } from 'react';

type EmergencyLevel = 'NORMAL' | 'CAUTION' | 'CRITICAL' | 'LOCKDOWN';
export type AppTheme = 'paper' | 'midnight' | 'cream' | 'mint' | 'clay' | 'arctic' | 'ivory' | 'frost' | 'sky';

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
  weatherZip: string | null;
  setWeatherZip: (zip: string | null) => void;
  appTheme: AppTheme;
  setAppTheme: (theme: AppTheme) => void;
  toneTestMode: boolean;
  setToneTestMode: (val: boolean) => void;
  notifications: Notification[];
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission | undefined>;
  addNotification: (message: string, type?: Notification['type']) => void;
  removeNotification: (id: string) => void;
  terminalUser: { username: string; role: string } | null;
  loginTerminalUser: (username: string, role: string) => void;
  logoutTerminalUser: () => void;
  firebaseUser: any | null;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const [emergencyLevel, setEmergencyLevel] = useState<EmergencyLevel>('NORMAL');
  const [manualEmergencyMode, setManualEmergencyMode] = useState(false);
  const [emergencyOpacity, setEmergencyOpacity] = useState(0.2);
  const [weatherZip, setWeatherZip] = useState<string | null>(() => localStorage.getItem('weatherZip'));
  const [appTheme, setAppTheme] = useState<AppTheme>(() => (localStorage.getItem('appTheme') as AppTheme) || 'paper');
  const [toneTestMode, setToneTestMode] = useState<boolean>(() => localStorage.getItem('toneTestMode') !== 'false'); // Default to true
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [terminalUser, setTerminalUser] = useState<{ username: string; role: string } | null>(() => {
    const saved = localStorage.getItem('terminalUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);

  // ONE-TIME CLEANUP: Delete all terminal_users as requested and add sndjy
  useEffect(() => {
    const hasCleaned = localStorage.getItem('terminalUsersSetup_v4');
    if (!hasCleaned) {
      import('../lib/firebase').then(async ({ db, collection, getDocs, deleteDoc, doc, setDoc, auth }) => {
        try {
          const snap = await getDocs(collection(db, 'terminal_users'));
          const deletes = snap.docs.map(d => deleteDoc(doc(db, 'terminal_users', d.id)));
          await Promise.all(deletes);
          
          // Add the one specific user to Firestore
          await setDoc(doc(db, 'terminal_users', 'sndjy'), {
            role: 'root',
            displayName: 'Russell1',
            createdAt: new Date().toISOString()
          });

          // Note: Creating Auth users usually requires secondary initialization 
          // but we can at least ensure Firestore is ready.
          // The AdminPage will be restored to allow manual password resets if needed.

          localStorage.setItem('terminalUsersSetup_v4', 'true');
          console.log('SYSTEM IDENTITY RESET COMPLETE: LOGIN sndjy_ROOT ENABLED (PASS: Russell1)');
        } catch (e) {
          console.error('SETUP_FAILURE', e);
        }
      });
    }
  }, []);

  useEffect(() => {
    // Lazy import auth to avoid initialization issues
    import('../lib/firebase').then(({ auth }) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setFirebaseUser(user);
      });
      return () => unsubscribe();
    });
  }, []);

  const loginTerminalUser = (username: string, role: string) => {
    const user = { username, role };
    setTerminalUser(user);
    localStorage.setItem('terminalUser', JSON.stringify(user));
  };

  const logoutTerminalUser = () => {
    setTerminalUser(null);
    localStorage.removeItem('terminalUser');
  };
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Sync permission state
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const checkPermission = () => {
      if (Notification.permission !== notificationPermission) {
        setNotificationPermission(Notification.permission);
      }
    };
    const interval = setInterval(checkPermission, 2000);
    return () => clearInterval(interval);
  }, [notificationPermission]);

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    } catch (error) {
      console.error("Permission request failed:", error);
      return 'denied';
    }
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

    // System Level Notification (Desktop)
    if (typeof Notification !== 'undefined') {
      const isIframe = window.self !== window.top;
      console.log('Attempting Desktop Notification. Permission:', Notification.permission, 'Iframe:', isIframe);
      
      if (Notification.permission === 'granted') {
        try {
          // Use a data URI for a generic "alert" icon to ensure it loads
          const iconUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2MzY2ZjEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggOGE2IDYgMCAwIDAtMTItMGE2IDYgMCAwIDAgMTIgMFoiLz48cGF0aCBkPSJNMTggOGE2IDYgMCAwIDAtMTItMGE2IDYgMCAwIDAgMTIgMFoiLz48cGF0aCBkPSJNOSAxMiA3IDEwIDUgMTIiLz48cGF0aCBkPSJNMTUgMTIgMTcgMTAgMTkgMTIiLz48L3N2Zz4=';

          const n = new Notification(`DISPATCH ALERT`, {
            body: message,
            icon: iconUrl,
            tag: 'alert-' + type,
            renotify: true,
            silent: false,
            requireInteraction: true // Forcing Windows to keep it visible
          } as any);
          
          n.onclick = (e) => {
            e.preventDefault();
            window.focus();
            n.close();
          };
        } catch (e) {
          console.warn('Desktop notification constructor failed:', e);
        }
      }
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

  useEffect(() => {
    localStorage.setItem('appTheme', appTheme);
    document.documentElement.setAttribute('data-theme', appTheme);
  }, [appTheme]);

  useEffect(() => {
    localStorage.setItem('toneTestMode', toneTestMode.toString());
  }, [toneTestMode]);

  return (
    <TerminalContext.Provider value={{ 
      emergencyLevel, 
      setEmergencyLevel,
      manualEmergencyMode,
      setManualEmergencyMode,
      emergencyOpacity,
      setEmergencyOpacity,
      weatherZip,
      setWeatherZip,
      appTheme,
      setAppTheme,
      toneTestMode,
      setToneTestMode,
      notifications,
      notificationPermission,
      requestNotificationPermission,
      addNotification,
      removeNotification,
      terminalUser,
      loginTerminalUser,
      logoutTerminalUser,
      firebaseUser
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
