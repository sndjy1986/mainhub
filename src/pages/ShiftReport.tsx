/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clipboard, 
  Mail, 
  Trash2, 
  ExternalLink, 
  User, 
  Truck, 
  Clock, 
  CheckCircle2,
  Maximize2,
  X,
  FileText,
  Phone,
  Settings,
  History,
  Eye,
  Loader2
} from 'lucide-react';

// Sub-component for the high-intensity emergency background
const EmergencyBackground = ({ intensity = 0.5, type = 'glow' }: { intensity?: number, type: 'glow' | 'emergency' }) => {
  if (type === 'glow') {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="bg-glow-indigo transition-opacity duration-1000" 
          style={{ opacity: intensity * 0.3 }} 
        />
        <div 
          className="bg-glow-emerald transition-opacity duration-1000" 
          style={{ opacity: intensity * 0.15 }} 
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* 1. Red/Blue High-Frequency Strobe */}
      <motion.div 
        className="absolute inset-x-[-50%] inset-y-[-50%] w-[200%] h-[200%] z-0"
        animate={{ 
          background: [
            "radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.4) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 50%, rgba(37, 99, 235, 0.4) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.4) 0%, transparent 50%)"
          ],
          opacity: [0.3 * intensity, 0.8 * intensity, 0.3 * intensity]
        }}
        transition={{ 
          duration: 1.2, 
          repeat: Infinity, 
          ease: "circOut" 
        }}
      />

      {/* 2. Slow Rotating White Central Beam */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] bg-gradient-to-b from-white/10 via-transparent to-transparent z-10 origin-center"
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        style={{ opacity: intensity * 0.4 }}
      />

      {/* 3. Pulsing Edge Glow */}
      <motion.div 
        className="absolute inset-0 z-20 border-[100px] border-white/5 blur-[80px]"
        animate={{ 
          opacity: [0.1 * intensity, 0.4 * intensity, 0.1 * intensity],
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
    </div>
  );
};
import { 
  TEAM_MEMBERS, 
  ALSSUP_OPTIONS, 
  MEDSUP_OPTIONS, 
  MEDSUP_MAP, 
  BASE_REPORT_EMAILS, 
  CC_EMAIL, 
  SHIFTS,
  INITIAL_DATA,
  ShiftReportData 
} from '../lib/shiftConstants';
import { saveReport, getReports, ShiftReport as ShiftReportType, auth, signIn, googleProvider, doc, onSnapshot, db, updateGlobalSettings } from '../lib/firebase';

const STORAGE_KEY = "shiftReportDraft_v2";

const DIRECTORY_DATA = [
  {
    title: "Emergency & Public Services",
    contacts: [
      { name: "Steven Kelly", title: "(EMS-1) EMS Director", phone: "864-844-4131" },
      { name: "Don McCown", title: "(EMS-2) EMS Coordinator", phone: "864-444-0715" },
      { name: "Cory Freeman", title: "(EMS 3) Operations Manager", phone: "864-532-1065" },
      { name: "Geneva Williams", title: "Communications Supervisor", phone: "864-791-0121" },
      { name: "Rhonda Brooks", title: "Operations Manager", phone: "864-276-9936" },
      { name: "Supervisor Number", title: "Medshore (Multiple)", phone: "864-844-4354" },
      { name: "Anmed Comms Room", title: "Comm Room", phone: "864-512-1344" },
    ]
  },
  {
    title: "Coroner's Office",
    contacts: [
      { name: "G. Shore", title: "Z-1", phone: "864-444-6727" },
      { name: "D. McCown", title: "Z-3", phone: "864-444-0715" },
      { name: "T. Blackwell", title: "Z-7", phone: "864-318-4915" },
      { name: "A. Whitfield", title: "Z-9", phone: "864-795-2633" },
      { name: "S. Sullivan", title: "Z-10", phone: "864-795-0886" },
      { name: "K. Williamson", title: "Z-11", phone: "864-749-9159" },
      { name: "C. Freeman", title: "Z-14", phone: "864-532-1065" },
      { name: "R. Ables", title: "Z-15", phone: "864-642-8853" },
      { name: "S. Kaufman", title: "Z-18", phone: "864-932-7179" },
    ]
  },
  {
    title: "QRV Supervisor's",
    contacts: [
      { name: "Shanda Shore", title: "A Shift Captain", phone: "864-749-7004" },
      { name: "Joe Kennedy", title: "B Shift Captain", phone: "864-749-7008" },
      { name: "Jared Bingel", title: "C Shift Captain", phone: "864-749-6208" },
      { name: "Joseph \"Alex\" Kay", title: "D Shift Captain", phone: "864-749-7013" },
    ]
  }
];

export default function ShiftReport() {
  const [data, setData] = useState<ShiftReportData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...INITIAL_DATA, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_DATA;
  });

  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showPreviewDrawer, setShowPreviewDrawer] = useState(false);
  const [showDirectoryDrawer, setShowDirectoryDrawer] = useState(false);
  const [showAdminDrawer, setShowAdminDrawer] = useState(false);
  
  // New States for History and Lights
  const [user, setUser] = useState(auth.currentUser);
  const [backgroundStyle, setBackgroundStyle] = useState<'glow' | 'emergency'>('glow');
  const [lightIntensity, setLightIntensity] = useState<number>(0.5);

  // Sync with Firestore Global Settings
  useEffect(() => {
    // This listener works even if user isn't logged in (depending on rules)
    // but typically we want it to be real-time for everyone
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.backgroundStyle) setBackgroundStyle(data.backgroundStyle);
        if (typeof data.lightIntensity === 'number') setLightIntensity(data.lightIntensity);
      }
    });

    return () => unsubscribe();
  }, []);

  // Track auth state
  useEffect(() => {
    return auth.onAuthStateChanged((u) => setUser(u));
  }, []);
  const [archivedReports, setArchivedReports] = useState<ShiftReportType[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedArchivedReport, setSelectedArchivedReport] = useState<ShiftReportType | null>(null);

  // Load history when admin drawer opens
  useEffect(() => {
    if (showAdminDrawer && user) {
      loadHistory();
    }
  }, [showAdminDrawer, user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingReports(true);
    try {
      const reports = await getReports();
      if (reports) setArchivedReports(reports);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReports(false);
    }
  }, [user]);

  // Dynamic Data State
  const [employees, setEmployees] = useState<string[]>(() => {
    const saved = localStorage.getItem("shiftReport_employees");
    return saved ? JSON.parse(saved) : TEAM_MEMBERS;
  });
  
  const [supervisors, setSupervisors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("shiftReport_supervisors");
    return saved ? JSON.parse(saved) : MEDSUP_MAP;
  });

  // Persist settings
  useEffect(() => {
    localStorage.setItem("shiftReport_employees", JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem("shiftReport_supervisors", JSON.stringify(supervisors));
  }, [supervisors]);

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        console.error(e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const clearData = async () => {
    if (window.confirm("Are you sure you want to clear all form data? (This will also archive a backup to the cloud)")) {
      // Save to Firebase History (Only if logged in) before clearing
      if (user) {
        try {
          const plainReport = buildReport();
          const htmlReport = buildHtmlReport();
          await saveReport({
            name: data.name,
            date: data.date,
            shift: data.shift,
            data: data,
            htmlReport: htmlReport,
            plainReport: plainReport
          });
          console.log("Report archived to Firebase during reset");
        } catch (e) {
          console.error("Failed to archive report during reset:", e);
        }
      }

      setData(INITIAL_DATA);
      localStorage.removeItem(STORAGE_KEY);
      setShowToast("Form cleared & Backed up");
    }
  };

    const buildReport = () => {
      const reportParts: string[] = [];

      const formatTabularData = (text: string) => {
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) return text;
        const rows = lines.map(line => line.split(/\t|\s{2,}/).map(cell => cell.trim()));
        const maxCols = Math.max(...rows.map(r => r.length));
        const colWidths: number[] = [];
        for (let i = 0; i < maxCols; i++) {
          let maxW = 0;
          rows.forEach(row => {
            const val = row[i] || "";
            if (val.length > maxW) maxW = val.length;
          });
          colWidths[i] = maxW;
        }
        return rows.map(row => {
          let lineStr = "";
          for (let i = 0; i < maxCols; i++) {
            const cell = row[i] || "";
            if (i === maxCols - 1) {
              lineStr += cell;
            } else {
              lineStr += cell.padEnd(colWidths[i] + 3, ' ');
            }
          }
          return lineStr;
        }).join('\n');
      };

      const addSection = (title: string, content: string | string[], isTabular: boolean = false) => {
        const header = `**${title}**`;
        reportParts.push(header);
        
        if (Array.isArray(content)) {
          content.forEach(line => reportParts.push(line));
        } else {
          let text = (typeof content === 'string' ? content.trim() : "");
          if (isTabular && text) {
            text = formatTabularData(text);
          }
          reportParts.push(text || "None");
        }
        reportParts.push(""); // spacer
      };

      addSection("Info", [
        `Name: ${data.name || "N/A"}`,
        `Date: ${data.date || "N/A"}`,
        `Shift: ${data.shift}`
      ]);

      addSection("Radio Assignment", [
        `Ch.1: ${data.channel1 || "N/A"}`,
        `Ch.2: ${data.channel2 || "N/A"}`,
        `Third Person: ${data.thirdPerson || "N/A"}`
      ]);

      addSection("Supervisors", [
        `ALSSUP: ${data.alssup || "N/A"}`,
        `MEDSUP: ${data.medsup || "N/A"}`
      ]);

      addSection("Zulu On Call (After 1700)", [
        `Primary: ${data.zuluPrimary || "N/A"}`,
        `Secondary: ${data.zuluSecondary || "N/A"}`
      ]);

      addSection("Avail Trucks", [
        `911 Trucks: ${data.truck911 || "0"}`,
        `GT Trucks: ${data.truckGT || "0"}`,
        `ALS Transport Trucks: ${data.truckALS || "None"}`,
        `County QRV: ${data.truckCountyQRV || "None"}`
      ]);

      addSection("Late Trucks", data.lateTrucks);
      addSection("Out of Chute", data.outOfChute);
      addSection("Other Issues", data.issues);

      if (data.pasteNotes) {
        addSection("Roster/Time Up", data.pasteNotes, true);
      }

      return reportParts.join("\n");
    };

    const buildHtmlReport = () => {
      const parts: string[] = [];
      const headerStyle = 'font-family: Calibri, sans-serif; font-size: 19pt; font-weight: bold; margin-top: 4px; margin-bottom: 4px; color: #000;';
      const dataStyle = 'font-family: Calibri, sans-serif; font-size: 16pt; margin: 0; line-height: 1.4; color: #000;';

      const addHtmlSection = (title: string, content: string | string[], isTabular: boolean = false) => {
        if (parts.length > 0) {
          parts.push('<div style="height: 18pt;">&nbsp;</div>');
        }
        
        // Late Trucks header is 2-3 points larger than standard headers (which are 1-2 points larger than text)
        const isLateTrucks = title === "Late Trucks";
        const customHeaderStyle = isLateTrucks 
          ? 'font-family: Calibri, sans-serif; font-size: 22pt; font-weight: bold; margin-top: 4px; margin-bottom: 4px; color: #000;'
          : 'font-family: Calibri, sans-serif; font-size: 19pt; font-weight: bold; margin-top: 4px; margin-bottom: 4px; color: #000;';

        parts.push(`<div style="${customHeaderStyle}">**${title}**</div>`);
        
        if (Array.isArray(content)) {
          content.forEach(line => {
            parts.push(`<div style="${dataStyle}">${line}</div>`);
          });
        } else {
          const text = (typeof content === 'string' ? content : "");
          if (isTabular && text.trim()) {
            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length > 0) {
              const rows = lines.map(line => line.split(/\t|\s{2,}/).map(cell => cell.trim()));
              
              // More precise widths based on 0.87, 0.62, 0.56, 1.5, 0.81
              const widths = ["20%", "14%", "13%", "34%", "19%"];

              let table = `<table style="border-collapse: collapse; width: auto; max-width: 100%; border: 1px solid #000; font-family: Calibri, sans-serif; font-size: 16pt; margin-top: 4px;">`;
              rows.forEach((row, rowIndex) => {
                table += `<tr>`;
                for (let i = 0; i < 5; i++) {
                  const cell = row[i] || "";
                  const cellStyle = `border: 1px solid #000; padding: 4px 8px; text-align: left; width: ${widths[i] || "auto"}; min-width: 50px;`;
                  if (rowIndex === 0) {
                    table += `<th style="${cellStyle} background-color: #D9D9D9; font-weight: bold;">${cell}</th>`;
                  } else {
                    table += `<td style="${cellStyle}">${cell}</td>`;
                  }
                }
                table += `</tr>`;
              });
              table += `</table>`;
              parts.push(table);
            } else {
              parts.push(`<div style="${dataStyle}">None</div>`);
            }
          } else if (text) {
            // Preserve line breaks and internal spacing exactly
            const lines = text.split(/\r?\n/);
            lines.forEach(line => {
              // Using &nbsp; for empty lines and replacing leading spaces with non-breaking ones 
              // is safer for email clients than just white-space: pre-wrap
              const formattedLine = line.replace(/ /g, "&nbsp;") || "&nbsp;";
              parts.push(`<div style="${dataStyle}">${formattedLine}</div>`);
            });
          } else {
            parts.push(`<div style="${dataStyle}">None</div>`);
          }
        }
      };

      addHtmlSection("Info", [
        `Name: ${data.name || "N/A"}`,
        `Date: ${data.date || "N/A"}`,
        `Shift: ${data.shift}`
      ]);

      addHtmlSection("Radio Assignment", [
        `Ch.1: ${data.channel1 || "N/A"}`,
        `Ch.2: ${data.channel2 || "N/A"}`,
        `Third Person: ${data.thirdPerson || "N/A"}`
      ]);

      addHtmlSection("Supervisors", [
        `ALSSUP: ${data.alssup || "N/A"}`,
        `MEDSUP: ${data.medsup || "N/A"}`
      ]);

      addHtmlSection("Zulu On Call (After 1700)", [
        `Primary: ${data.zuluPrimary || "N/A"}`,
        `Secondary: ${data.zuluSecondary || "N/A"}`
      ]);

      addHtmlSection("Avail Trucks", [
        `911 Trucks: ${data.truck911 || "0"}`,
        `GT Trucks: ${data.truckGT || "0"}`,
        `ALS Transport Trucks: ${data.truckALS || "None"}`,
        `County QRV: ${data.truckCountyQRV || "None"}`
      ]);

      addHtmlSection("Late Trucks", data.lateTrucks);
      addHtmlSection("Out of Chute", data.outOfChute);
      addHtmlSection("Other Issues", data.issues);

      if (data.pasteNotes) {
        addHtmlSection("Roster/Time Up", data.pasteNotes, true);
      }

      return parts.join("\n");
    };

  const handleSend = async () => {
    const plainReport = buildReport();
    const htmlReport = buildHtmlReport();
    
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const typePlain = "text/plain";
        const typeHtml = "text/html";
        const blobPlain = new Blob([plainReport], { type: typePlain });
        const blobHtml = new Blob([htmlReport], { type: typeHtml });
        
        const data = [new ClipboardItem({
          [typePlain]: blobPlain,
          [typeHtml]: blobHtml
        })];
        
        await navigator.clipboard.write(data);
        setShowToast("Rich Text Report copied! Paste into Outlook now.");
      } else {
        await navigator.clipboard.writeText(plainReport);
        setShowToast("Plain text copied (Rich Text not supported).");
      }
    } catch (err) {
      console.error("Clipboard error:", err);
      setShowToast("Opening email...");
    }

    const formatDateForSubject = (dateStr: string) => {
      if (!dateStr) return "";
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const [y, m, d] = parts;
      return `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`;
    };

    const subject = `${data.shift} Shift Report - ${formatDateForSubject(data.date)}`;
    const body = `*** FULL REPORT COPIED TO CLIPBOARD ***\n\nSummary:\n- Supervisor: ${data.name}\n- Date: ${data.date}\n\nClick here and press Ctrl+V to paste the detailed report.`;
    
    let cc = CC_EMAIL;
    // Only include MEDSUP if they have an email listed
    const medSupEmail = data.medsup ? supervisors[data.medsup] : null;
    if (medSupEmail && medSupEmail.trim()) {
      cc += `; ${medSupEmail}`;
    }

    const mailto = `mailto:${encodeURIComponent(BASE_REPORT_EMAILS)}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="relative selection:bg-brand-indigo/30">
      <div className="relative z-10 max-w-5xl mx-auto pb-24 px-4 md:px-0">
        
        {/* Main Form */}
        <main className="flex flex-col gap-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
                <Clipboard className="w-10 h-10 text-brand-indigo" />
                Shift Report Pro
              </h1>
              <p className="text-slate-400 mt-2 font-medium">Operations workflow for medical transport dispatch.</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowDirectoryDrawer(true)}
                className="glass-effect hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all active:scale-95 shadow-xl"
              >
                <Phone className="w-4 h-4 text-brand-indigo" /> Directory
              </button>
              <button 
                onClick={() => setShowPreviewDrawer(true)}
                className="bg-brand-indigo hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-indigo-500/25"
              >
                <FileText className="w-4 h-4" /> Live Report
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-8">
            {/* Row 1: Info, Radio, Supervisors */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="glass-effect bg-white/5 rounded-3xl p-8 space-y-8 shadow-2xl scale-[1.02] border border-white/10">
                <div className="flex items-center gap-3 text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
                  <User className="w-4 h-4" /> Info
                </div>
                <div className="space-y-4">
                  <Field label="Name">
                    <select name="name" value={data.name} onChange={handleChange}>
                      <option value="">-- Select --</option>
                      {employees.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Date">
                    <input type="date" name="date" value={data.date} onChange={handleChange} />
                  </Field>
                  <Field label="Shift">
                    <select name="shift" value={data.shift} onChange={handleChange}>
                      {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="glass-effect bg-white/5 border border-white/10 shadow-2xl rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm tracking-widest uppercase">
                  <Phone className="w-4 h-4" /> Radio Assignment
                </div>
                <div className="space-y-4">
                  <Field label="Ch.1">
                    <select name="channel1" value={data.channel1} onChange={handleChange}>
                      <option value="">-- Select --</option>
                      {employees.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Ch.2">
                    <select name="channel2" value={data.channel2} onChange={handleChange}>
                      <option value="">-- Select --</option>
                      {employees.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Third Person">
                    <select name="thirdPerson" value={data.thirdPerson} onChange={handleChange}>
                      <option value="">-- Select --</option>
                      {employees.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="glass-effect bg-white/5 border border-white/10 shadow-2xl rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm tracking-widest uppercase">
                  <User className="w-4 h-4" /> Supervisors
                </div>
                <div className="space-y-4">
                  <Field label="ALSSUP">
                    <select name="alssup" value={data.alssup} onChange={handleChange}>
                      <option value="">-- Select --</option>
                      {ALSSUP_OPTIONS.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </Field>
                  <Field label="MEDSUP">
                    <select name="medsup" value={data.medsup} onChange={handleChange}>
                      <option value="">-- Select --</option>
                      {Object.keys(supervisors).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            {/* Row 2: Zulu, Avail Trucks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-effect bg-white/5 rounded-3xl p-8 space-y-8 shadow-2xl border border-white/10">
                <div className="flex items-center gap-3 text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
                  <Truck className="w-4 h-4" /> Zulu On Call (After 1700)
                </div>
                <div className="space-y-6">
                  <Field label="Primary">
                    <input type="text" name="zuluPrimary" value={data.zuluPrimary} onChange={handleChange} placeholder="Unit ID" />
                  </Field>
                  <Field label="Secondary">
                    <input type="text" name="zuluSecondary" value={data.zuluSecondary} onChange={handleChange} placeholder="Unit ID" />
                  </Field>
                </div>
              </div>

              <div className="glass-effect bg-white/5 rounded-3xl p-8 space-y-8 shadow-2xl border border-white/10">
                <div className="flex items-center gap-3 text-emerald-600 font-bold text-[10px] uppercase tracking-widest">
                  <Truck className="w-4 h-4" /> Avail Trucks
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <Field label="911:">
                    <input type="number" name="truck911" value={data.truck911} onChange={handleChange} min="0" />
                  </Field>
                  <Field label="GT:">
                    <input type="number" name="truckGT" value={data.truckGT} onChange={handleChange} min="0" />
                  </Field>
                  <Field label="ALS Transport Trucks">
                    <input type="text" name="truckALS" value={data.truckALS} onChange={handleChange} placeholder="Unit IDs" />
                  </Field>
                  <Field label="County QRV">
                    <input type="text" name="truckCountyQRV" value={data.truckCountyQRV} onChange={handleChange} placeholder="Unit ID" />
                  </Field>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-effect bg-white/5 rounded-3xl p-8 space-y-6 shadow-2xl border border-white/10">
                <div className="flex items-center gap-3 text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
                  <Clock className="w-4 h-4" /> Late Trucks
                </div>
                <textarea 
                  name="lateTrucks" 
                  value={data.lateTrucks} 
                  onChange={handleChange} 
                  rows={4} 
                  className="w-full glass-effect bg-white/5 text-white p-4 rounded-2xl border border-white/10 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none"
                  placeholder="Unit numbers and times..." 
                />
              </div>

              <div className="glass-effect bg-white/5 rounded-3xl p-8 space-y-6 shadow-2xl border border-white/10">
                <div className="flex items-center gap-3 text-emerald-600 font-bold text-[10px] uppercase tracking-widest">
                  <Clock className="w-4 h-4" /> Out of Chute
                </div>
                <textarea 
                  name="outOfChute" 
                  value={data.outOfChute} 
                  onChange={handleChange} 
                  rows={4} 
                  className="w-full glass-effect bg-white/5 text-white p-4 rounded-2xl border border-white/10 font-mono text-sm resize-none focus:ring-2 focus:ring-emerald-500/30 transition-all outline-none"
                  placeholder="Notable exceptions..." 
                />
              </div>
            </div>

            {/* Row 4: Other Issues */}
            <div className="glass-effect bg-white/5 rounded-3xl p-8 space-y-6 shadow-2xl border border-white/10">
              <div className="flex items-center gap-3 text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
                <FileText className="w-4 h-4" /> Other Issues
              </div>
              <textarea 
                name="issues" 
                value={data.issues} 
                onChange={handleChange} 
                rows={6} 
                className="w-full glass-effect bg-white/5 text-white p-4 rounded-2xl border border-white/10 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none"
                placeholder="Detailed account of shift activities..." 
              />
            </div>

            {/* Row 5: ROSTER/TIME UP */}
            <div className="glass-effect bg-white/5 rounded-3xl p-8 space-y-6 shadow-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
                  <Clipboard className="w-4 h-4" /> ROSTER/TIME UP
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowPasteModal(true)}
                  className="text-[10px] text-indigo-600 hover:underline flex items-center gap-2 uppercase font-black tracking-widest"
                >
                  <Maximize2 className="w-3 h-3" /> Full Screen
                </button>
              </div>
              <textarea 
                name="pasteNotes" 
                value={data.pasteNotes} 
                onChange={handleChange} 
                rows={6} 
                className="w-full glass-effect bg-white/5 text-white p-4 rounded-2xl border border-white/10 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none"
                placeholder="Enter roster or time up data here..." 
              />
            </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-8 p-8 glass-effect bg-white/5 border border-white/10 rounded-3xl flex flex-wrap items-center justify-between gap-6 shadow-2xl">
              <div className="flex items-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Draft saved {lastSaved ? `at ${lastSaved}` : 'now'}
              </div>
              <div className="flex items-center gap-6">
                <button 
                  type="button" 
                  onClick={clearData}
                  className="px-4 py-2 text-sm font-black text-slate-400 hover:text-red-400 flex items-center gap-2 transition-colors uppercase tracking-widest"
                >
                  <Trash2 className="w-4 h-4" /> Reset / Backup
                </button>
                <button 
                  type="button"
                  onClick={handleSend}
                  className="bg-emerald-600 hover:bg-emerald-700 px-10 py-4 rounded-2xl text-white font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center gap-3 transition-all active:scale-95 uppercase tracking-widest"
                >
                  <Mail className="w-5 h-5" /> Copy & Send Report
                </button>
              </div>
            </div>
        </main>
      </div>

      {/* Admin Gear Toggle */}
      <button 
        onClick={() => setShowAdminDrawer(true)}
        className="fixed bottom-8 right-8 p-5 glass-effect rounded-full shadow-2xl hover:bg-brand-indigo hover:border-brand-indigo transition-all group z-50 hover:scale-110 active:scale-90"
        title="Admin Settings"
      >
        <Settings className="w-7 h-7 text-slate-400 group-hover:text-white group-hover:rotate-90 transition-transform duration-500" />
      </button>

      {/* Admin Drawer */}
      <div className={`fixed inset-0 z-[110] transition-opacity duration-300 ${showAdminDrawer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => setShowAdminDrawer(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
        <aside 
          className={`absolute top-0 right-0 h-full w-full max-w-2xl bg-brand-bg/90 backdrop-blur-3xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${showAdminDrawer ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-10 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-black text-white flex items-center gap-4 tracking-tight">
                <Settings className="w-7 h-7 text-brand-indigo" />
                Admin Controls
              </h3>
              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.2em] font-black">Medshore Operations Configuration</p>
            </div>
            <button 
              onClick={() => setShowAdminDrawer(false)}
              className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-8 h-8" />
            </button>
          </div>

          <div className="flex-1 p-10 overflow-y-auto scrollbar-thin space-y-12">
            {/* Authentication */}
            <section className="space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-indigo">
                Operations Login
              </h4>
              <div className="bg-white/5 rounded-3xl p-8 shadow-2xl border border-white/10">
                {!user ? (
                  <div className="space-y-6">
                    <p className="text-sm text-slate-400">Sign in with Google to enable report archiving and history features.</p>
                    <button 
                      onClick={async () => {
                        try {
                          console.log("Initiating Google Sign-In popup...");
                          const result = await signIn();
                          console.log("Sign-in successful:", result.email);
                          setShowToast("Logged in successfully");
                        } catch (e: any) {
                          console.error("Sign-in error detail:", e);
                          if (e.code === 'auth/popup-blocked') {
                            setShowToast("Popup blocked! Enable popups or try a new tab.");
                          } else if (e.code === 'auth/popup-closed-by-user') {
                            setShowToast("Login cancelled");
                          } else {
                            setShowToast(`Login error: ${e.message || 'Unknown error'}`);
                          }
                        }
                      }}
                      className="w-full bg-white/5 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-white/20 transition-all active:scale-[0.98] shadow-xl"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                      Sign in with Google
                    </button>
                    <div className="pt-2">
                       <p className="text-[10px] text-slate-400 italic text-center">
                        If the popup closes instantly, try opening the app in a 
                        <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="text-brand-indigo ml-1 underline">new tab</a>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      {user.photoURL ? (
                        <img src={user.photoURL} referrerPolicy="no-referrer" className="w-12 h-12 rounded-full border-2 border-brand-indigo shadow-lg" alt="Profile" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-brand-indigo flex items-center justify-center font-black text-white uppercase text-xl shadow-lg">{user.email?.[0]}</div>
                      )}
                      <div>
                        <div className="text-xl font-bold text-white truncate max-w-[200px]">{user.displayName || user.email}</div>
                        <div className="text-[10px] text-brand-emerald font-black uppercase tracking-widest">Authenticated User</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => auth.signOut().then(() => setShowToast("Logged out"))}
                      className="px-5 py-2.5 glass-effect hover:bg-red-500/10 hover:text-red-400 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Visual Settings */}
            <section className="space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-indigo">
                Interface Settings
              </h4>
              
              <div className="bg-white/5 rounded-3xl p-8 space-y-6 shadow-2xl border border-white/10">
                <div className="space-y-4">
                  <div className="text-white font-bold text-sm tracking-tight uppercase">Visual Theme</div>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => {
                        setBackgroundStyle('glow');
                        if (user) updateGlobalSettings({ backgroundStyle: 'glow' });
                      }}
                      className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${backgroundStyle === 'glow' ? 'bg-brand-indigo text-white shadow-lg' : 'glass-effect text-slate-400'}`}
                    >
                      Slate Glow
                    </button>
                    <button 
                      onClick={() => {
                        setBackgroundStyle('emergency');
                        if (user) updateGlobalSettings({ backgroundStyle: 'emergency' });
                      }}
                      className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${backgroundStyle === 'emergency' ? 'bg-red-600 text-white shadow-lg' : 'glass-effect text-slate-400'}`}
                    >
                      Emergency
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-white font-bold text-sm tracking-tight">Ambience Intensity</div>
                      <p className="text-xs text-slate-500">Control the brightness of background effects</p>
                    </div>
                    <div className="text-brand-indigo font-mono font-bold text-lg">{Math.round(lightIntensity * 100)}%</div>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={lightIntensity} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLightIntensity(val);
                    }}
                    onMouseUp={(e) => {
                      // Update Firestore on mouse up to avoid excessive writes
                      if (user) updateGlobalSettings({ lightIntensity: lightIntensity });
                    }}
                    className="w-full accent-brand-indigo h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 italic text-center">Changes sync instantly across all devices</p>
                </div>
              </div>
            </section>

            {/* Report History */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-indigo">
                  Report History (Last Year)
                </h4>
                <button 
                  onClick={loadHistory}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                  disabled={loadingReports}
                >
                  <Loader2 className={`w-4 h-4 ${loadingReports ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <div className="space-y-3">
                {!user ? (
                   <div className="text-center py-12 bg-white/5 rounded-3xl shadow-2xl border border-white/10">
                    <History className="w-10 h-10 text-slate-800 mx-auto mb-4" />
                    <p className="text-sm text-slate-400 font-medium tracking-tight">Please <span className="text-brand-indigo">Sign In</span> to view history</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2 font-black">Secure ops data archive</p>
                  </div>
                ) : archivedReports.length === 0 && !loadingReports ? (
                  <div className="text-center py-10 bg-white/5 rounded-3xl border border-white/10 shadow-2xl text-slate-500 text-sm italic font-medium">
                    No archived reports found.
                  </div>
                ) : (
                  archivedReports.map(report => (
                    <div key={report.id} className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 bg-white/5 border border-white/10 shadow-2xl rounded-3xl group hover:border-indigo-300 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold truncate flex items-center gap-3">
                          {report.shift} Shift Report
                          <span className="px-3 py-1 rounded bg-brand-indigo/10 text-brand-indigo text-[10px] font-black uppercase tracking-widest">{report.name}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-medium tracking-wide">
                          {report.date} • {report.createdAt?.toDate?.() ? report.createdAt.toDate().toLocaleString() : 'Date N/A'}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedArchivedReport(report);
                          setShowPreviewDrawer(true);
                        }}
                        className="px-6 py-3 bg-brand-indigo text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-indigo/80 transition-all shadow-lg shadow-indigo-500/20"
                      >
                        View Record
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Employee Management */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-indigo">
                  Team Roster
                </h4>
                <button 
                  onClick={() => {
                    const name = window.prompt("Enter new employee name:");
                    if (name && name.trim()) {
                      setEmployees(prev => [...prev, name.trim()].sort());
                    }
                  }}
                  className="px-5 py-2.5 glass-effect rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-indigo hover:bg-white/5 transition-all"
                >
                  + Add Member
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {employees.map(emp => (
                  <div key={emp} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 shadow-2xl rounded-2xl group hover:border-indigo-300 transition-all">
                    <span className="text-white font-bold text-sm tracking-tight">{emp}</span>
                    <button 
                      onClick={() => {
                        if (window.confirm(`Delete ${emp}?`)) {
                          setEmployees(prev => prev.filter(e => e !== emp));
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Supervisor Management */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-indigo">
                  Supervisor Data
                </h4>
                <button 
                  onClick={() => {
                    const name = window.prompt("Enter new supervisor name:");
                    if (name && name.trim()) {
                      const email = window.prompt(`Enter email for ${name} (optional):`);
                      setSupervisors(prev => ({ ...prev, [name.trim()]: (email || "").trim() }));
                    }
                  }}
                  className="px-5 py-2.5 glass-effect rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-indigo hover:bg-white/5 transition-all"
                >
                  + Add Supervisor
                </button>
              </div>
              <div className="space-y-4">
                {Object.entries(supervisors).map(([name, email]) => (
                  <div key={name} className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 bg-white/5 border border-white/10 shadow-2xl rounded-3xl group hover:border-indigo-300 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold tracking-tight">{name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest truncate">{email || 'No email associated'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const currentEmail = supervisors[name] || "";
                          const newEmail = window.prompt(`Update email for ${name}:`, currentEmail);
                          if (newEmail !== null) {
                            setSupervisors(prev => ({ ...prev, [name]: newEmail.trim() }));
                          }
                        }}
                        className="p-3 glass-effect text-slate-400 hover:text-brand-indigo rounded-xl transition-all"
                        title="Edit Email"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Delete supervisor ${name}?`)) {
                            const newSups = { ...supervisors };
                            delete newSups[name];
                            setSupervisors(newSups);
                          }
                        }}
                        className="p-3 glass-effect text-slate-400 hover:text-red-400 rounded-xl transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="p-10 border-t border-white/10 bg-white/5">
            <button 
              onClick={() => setShowAdminDrawer(false)}
              className="w-full bg-brand-indigo hover:bg-indigo-600 px-8 py-5 rounded-3xl text-white font-black uppercase tracking-widest text-sm transition-all shadow-2xl shadow-indigo-500/20 active:scale-[0.98]"
            >
              Commit Configuration
            </button>
          </div>
        </aside>
      </div>

      {/* Floating Toast */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 glass-effect !bg-brand-bg/90 border-brand-indigo/30 text-white font-bold rounded-3xl shadow-2xl flex items-center gap-4 animate-bounce">
          <div className="w-8 h-8 rounded-full bg-brand-indigo/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-brand-indigo" />
          </div>
          <span className="text-sm tracking-tight">{showToast}</span>
        </div>
      )}

      {/* Slide-out Directory Drawer */}
      <div className={`fixed inset-0 z-[120] transition-opacity duration-300 ${showDirectoryDrawer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => setShowDirectoryDrawer(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
        <aside 
          className={`absolute top-0 right-0 h-full w-full max-w-lg bg-brand-bg/90 backdrop-blur-3xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${showDirectoryDrawer ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-8 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-white flex items-center gap-4 tracking-tight uppercase">
                <Phone className="w-6 h-6 text-brand-indigo" />
                Directory
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">Medshore Emergency Services</p>
            </div>
            <button 
              onClick={() => setShowDirectoryDrawer(false)}
              className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-slate-500"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
          
          <div className="flex-1 p-8 overflow-y-auto scrollbar-thin space-y-10">
            {DIRECTORY_DATA.map((section, sIdx) => (
              <div key={sIdx} className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-indigo/70 border-b border-brand-indigo/20 pb-3 flex items-center justify-between">
                  {section.title}
                  <span className="opacity-40 font-mono">{section.contacts.length}</span>
                </h4>
                <div className="grid gap-3">
                  {section.contacts.map((contact, cIdx) => (
                    <div 
                      key={cIdx} 
                      className="p-5 bg-white/5 border border-white/10 shadow-2xl rounded-2xl flex items-center justify-between group hover:border-emerald-300 transition-all"
                    >
                      <div>
                        <div className="text-sm font-bold text-white tracking-tight">{contact.name}</div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-black mt-1">{contact.title}</div>
                      </div>
                      <a 
                        href={`tel:${contact.phone}`} 
                        className="p-3 glass-effect rounded-xl text-slate-400 group-hover:text-brand-emerald group-hover:border-brand-emerald/30 transition-all flex items-center gap-3"
                      >
                        <span className="text-xs font-mono hidden sm:inline font-bold">{contact.phone}</span>
                        <Phone className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 border-t border-white/5 glass-effect bg-white/5">
            <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-black">
              Internal Ops Only • Medshore Ambulance
            </p>
          </div>
        </aside>
      </div>

      {/* Preview / Archive Drawer */}
      <div className={`fixed inset-0 z-[120] transition-opacity duration-300 ${showPreviewDrawer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => {
          setShowPreviewDrawer(false);
          setSelectedArchivedReport(null);
        }} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
        <aside 
          className={`absolute top-0 right-0 h-full w-full max-w-lg bg-white/5 border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${showPreviewDrawer ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-4">
                {selectedArchivedReport ? <History className="w-7 h-7 text-indigo-600" /> : <Eye className="w-7 h-7 text-indigo-600" />}
                Report Preview
              </h3>
              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest font-black">
                {selectedArchivedReport ? `ARCHIVED: ${selectedArchivedReport.date}` : 'Rich Text Snapshot'}
              </p>
            </div>
            <button 
              onClick={() => {
                setShowPreviewDrawer(false);
                setSelectedArchivedReport(null);
              }}
              className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-400"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
          
          <div className="flex-1 p-8 overflow-y-auto scrollbar-thin bg-white/5">
            <div className="bg-white/5 rounded-3xl p-10 shadow-inner min-h-full">
              <div 
                className="prose prose-slate max-w-none text-white selection:bg-brand-indigo/20"
                style={{ fontFamily: 'Calibri, sans-serif' }}
                dangerouslySetInnerHTML={{ 
                  __html: selectedArchivedReport ? selectedArchivedReport.htmlReport : buildHtmlReport() 
                }} 
              />
            </div>
          </div>

          <div className="p-10 border-t border-white/10 bg-white/5">
            <div className="space-y-6">
              <button 
                onClick={async () => {
                  try {
                    const plainContent = selectedArchivedReport ? selectedArchivedReport.plainReport : buildReport();
                    const htmlContent = selectedArchivedReport ? selectedArchivedReport.htmlReport : buildHtmlReport();

                    if (navigator.clipboard && window.ClipboardItem) {
                      const typePlain = "text/plain";
                      const typeHtml = "text/html";
                      const blobPlain = new Blob([plainContent], { type: typePlain });
                      const blobHtml = new Blob([htmlContent], { type: typeHtml });
                      
                      const clipboardData = [new ClipboardItem({
                        [typePlain]: blobPlain,
                        [typeHtml]: blobHtml
                      })];
                      
                      await navigator.clipboard.write(clipboardData);
                      setShowToast("Record copied! Ready to paste.");
                    } else {
                      await navigator.clipboard.writeText(plainContent);
                      setShowToast("Plain text copied successfully.");
                    }
                  } catch (e) {
                    console.error("Copy error:", e);
                    setShowToast("Failed to access clipboard");
                  }
                }}
                className="w-full bg-brand-indigo hover:bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-4 transition-all shadow-2xl shadow-indigo-500/20 active:scale-[0.98]"
              >
                <Clipboard className="w-6 h-6" /> Copy Report Format
              </button>
              
              {!selectedArchivedReport && (
                <div className="pt-8 border-t border-white/5 space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Essential Resources</h4>
                  <nav className="flex flex-col gap-3">
                    <ExternalLinkItem href="https://drive.google.com/file/d/1Lq3m5KIhkwP7zQZu9RTKlXRO18BPhx1A/view" label="Coroner On Call" meta="Google Drive Access" />
                    <ExternalLinkItem href="https://drive.google.com/file/d/1YRmQRgyxRjqlGWiBLsNaiYhmssqDeCet/view" label="911 SOG'S County" meta="Regulation Handbook" />
                    <ExternalLinkItem href="https://drive.google.com/file/d/15IL2nx3foN5V4L2ue6OBAp8kmZkpWzma/view" label="Employee Handbook" meta="HR Policies" />
                    <ExternalLinkItem href="https://docs.google.com/spreadsheets/d/1ywTY-EVDLJYfPsxKPDGLdNJStJ63W-_yYS-Y4CU31Bw/edit" label="Shift Calendar" meta="Live Roster Sync" />
                  </nav>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Roster Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div onClick={() => setShowPasteModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
          <div className="relative w-full max-w-5xl bg-white/5 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div>
                <h3 className="text-3xl font-black text-white tracking-tight uppercase">Roster Processing</h3>
                <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest font-black">Paste data grid from source system</p>
              </div>
              <button 
                onClick={() => setShowPasteModal(false)} 
                className="p-4 hover:bg-white/10 rounded-3xl transition-colors text-slate-500"
              >
                <X className="w-10 h-10" />
              </button>
            </div>
            <div className="p-10 flex-1 relative glass-effect bg-white/5">
              <textarea 
                className="w-full h-full bg-white/5 text-white p-8 rounded-[2rem] border border-white/10 font-mono text-base resize-none outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium shadow-inner"
                placeholder="Ctrl+V roster data here..."
                value={data.pasteNotes}
                onChange={(e) => setData(prev => ({ ...prev, pasteNotes: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="p-10 bg-white/5 flex justify-end gap-6 border-t border-white/5">
              <button 
                onClick={() => setShowPasteModal(false)}
                className="bg-emerald-600 hover:bg-emerald-700 px-14 py-5 rounded-3xl text-white font-black uppercase tracking-widest text-sm transition-all shadow-2xl shadow-emerald-500/20 active:scale-95"
              >
                Incorporate Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  const isSelect = children.type === 'select';
  return (
    <div className="flex flex-col gap-3">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">
        {label}
      </label>
      <div className="relative group">
        {React.cloneElement(children, {
          className: `${(children.props as any).className || ''} w-full ${isSelect ? 'bg-white/10 appearance-none [&>option]:bg-white/5 [&>option]:text-white' : 'glass-effect bg-white/5'} border border-white/10 group-hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-5 py-4 text-sm text-white transition-all outline-none font-sans`
        } as any)}
        {isSelect && (
          <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        )}
      </div>
    </div>
  );
}

function ExternalLinkItem({ href, label, meta }: { href: string; label: string; meta: string }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-between p-4 bg-white/5 border border-white/10 shadow-2xl rounded-2xl hover:border-indigo-400 transition-all group"
    >
      <div className="flex flex-col">
        <span className="text-sm font-bold text-white group-hover:text-indigo-600 transition-colors tracking-tight">{label}</span>
        <span className="text-[9px] uppercase tracking-widest text-slate-400 font-black mt-0.5">{meta}</span>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-brand-indigo" />
    </a>
  );
}
// sync
