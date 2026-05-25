import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Send, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronRight, 
  ShieldAlert, 
  HelpCircle, 
  Activity, 
  UserMinus, 
  AlertOctagon,
  Hammer
} from 'lucide-react';
import { useTerminal } from '../../context/TerminalContext';

type MessageType = 'status' | 'hurt' | 'accident';

interface FormState {
  // System Status fields
  statusLevel: '0' | '1' | '2' | '3';
  affectedSystem: string;
  impactDetails: string;
  restorationTime: string;
  systemLead: string;

  // Employee Hurt fields
  employeeName: string;
  employeeId: string;
  injuryType: string;
  injuryLocation: string;
  supervisorName: string;
  actionsTaken: string;

  // AC Vehicle Accident fields
  vehicleUnit: string;
  accidentLocation: string;
  crewMembers: string;
  policeIncident: string;
  injuriesReported: string;
  vehicleStatus: string;
  briefDescription: string;
}

export default function SendAdminMessage() {
  const { terminalUser, firebaseUser, appTheme } = useTerminal();
  const [selectedType, setSelectedType] = useState<MessageType>('status');
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'instructions'>('preview');

  // Load default operator name
  const currentOperator = terminalUser?.username || firebaseUser?.displayName || 'OPERATOR_1';

  // State values
  const [form, setForm] = useState<FormState>({
    statusLevel: '1',
    affectedSystem: 'CAD Paging & Radios',
    impactDetails: 'Some paging transmitters are responding with delays. Primary radio channels are fully active.',
    restorationTime: 'Within 2 hours - vendor dispatched',
    systemLead: currentOperator,

    employeeName: 'Officer Miller',
    employeeId: 'EMP-3841',
    injuryType: 'Minor Laceration / Exposure to toxic fume',
    injuryLocation: 'Station 12 parking bay',
    supervisorName: 'Captain Jenkins',
    actionsTaken: 'Treated on scene. Admitted to regional clinic for baseline monitoring.',

    vehicleUnit: 'Medic 42',
    accidentLocation: 'E Greenville St & Martin Rd',
    crewMembers: 'Paramedic Hayes, EMT Ross',
    policeIncident: 'APD Incident #2026-5011A',
    injuriesReported: 'None for crew. Other vehicle driver complaining of wrist soreness.',
    vehicleStatus: 'OOS - Minor front bumper compression (Driveable)',
    briefDescription: 'En route to non-emergency call when citizen vehicle failure caused low-speed rear-end contact.'
  });

  const handleFieldChange = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Compile subject and body templates dynamically
  const getSubject = (): string => {
    switch (selectedType) {
      case 'status':
        return `System Status`;
      case 'hurt':
        return `[URGENT] EMPLOYEE HURT - ${form.employeeName} (${form.employeeId})`;
      case 'accident':
        return `[CRITICAL] AC VEHICLE ACCIDENT - Unit: ${form.vehicleUnit}`;
    }
  };

  const getBody = (): string => {
    const timestamp = new Date().toLocaleString();
    switch (selectedType) {
      case 'status':
        return `System Status Level ${form.statusLevel}.

Thanks,
Dispatch`;
      case 'hurt':
        return `=== CONFIDENTIAL INJURY ON-DUTY (IOD) REPORT ===
TIMESTAMP: ${timestamp}
EMPLOYEE NAME: ${form.employeeName}
EMPLOYEE ID: ${form.employeeId}
TYPE OF INJURY: ${form.injuryType}
EVENT LOCATION: ${form.injuryLocation}
SUPERVISOR NOTIFIED: ${form.supervisorName}
ACTIONS & TRANSPORT: ${form.actionsTaken}
REPORTER OPERATOR: ${currentOperator.toUpperCase()}
=================================================`;
      case 'accident':
        return `=== AC VEHICLE ACCIDENT FIELD TRANSMISSION ===
TIMESTAMP: ${timestamp}
ACCIDENT UNIT: ${form.vehicleUnit}
CREW MEMBERS: ${form.crewMembers}
MAP LOCATION: ${form.accidentLocation}
POLICE DISPATCH ID: ${form.policeIncident}
INJURY EVALUATION: ${form.injuriesReported}
VEHICLE STATUS: ${form.vehicleStatus}
INCIDENT DESCR: ${form.briefDescription}
REPORTER OPERATOR: ${currentOperator.toUpperCase()}
==============================================`;
    }
  };

  // Generate Bookmarklet JavaScript Code
  const getRawBookmarkletCode = (): string => {
    const subjVal = getSubject().replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const bodyVal = getBody().replace(/"/g, '\\"').replace(/\n/g, '\\n');

    return `(function(){
      const subVal = "${subjVal}";
      const bdyVal = "${bodyVal}";

      let filledCount = 0;

      // 1. SELECT MESSAGE GROUP DROPDOWN (Anderson ALERTS or Medshore)
      const dropdowns = Array.from(document.querySelectorAll('select'));
      let msgGroupSelected = false;
      for (const sel of dropdowns) {
        for (let i = 0; i < sel.options.length; i++) {
          const optText = sel.options[i].text.toLowerCase();
          if (optText.includes('alerts') || optText.includes('anderson') || optText.includes('medshore')) {
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            msgGroupSelected = true;
            filledCount++;
            break;
          }
        }
        if (msgGroupSelected) break;
      }

      // 2. REGISTERED / REQUIRED TO ACKNOWLEDGE RADIO BUTTONS ("Yes")
      const labels = Array.from(document.querySelectorAll('label'));
      let radioClicked = false;
      labels.forEach(lbl => {
        if (lbl.innerText.trim().toLowerCase() === 'yes') {
          const forId = lbl.getAttribute('for');
          let radio = null;
          if (forId) {
            radio = document.getElementById(forId);
          }
          if (!radio) {
            radio = lbl.querySelector('input[type="radio"]') || lbl.previousElementSibling;
          }
          if (radio && radio.type === 'radio') {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radioClicked = true;
          }
        }
      });

      // Backup radio pass by ID or value
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      radios.forEach(radio => {
        const id = (radio.id || '').toLowerCase();
        const value = (radio.value || '').toLowerCase();
        if (id.includes('yes') || value === 'yes' || id.endsWith('_0')) {
          if (!radio.checked) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radioClicked = true;
          }
        }
      });
      if (radioClicked) filledCount++;

      // 3. CHECKBOXES FOR "Send By: Email" AND "Send By: Text Page"
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      let cbCheckedCount = 0;
      checkboxes.forEach(cb => {
        const parent = cb.parentElement;
        const parentText = parent ? parent.innerText || '' : '';
        const id = (cb.id || '').toLowerCase();
        const labelText = parentText.toLowerCase();

        // Avoid touching "Include Quarantined Employees?"
        if (labelText.includes('quarantined') || id.includes('quarantine')) {
          return;
        }

        if (labelText.includes('email') || labelText.includes('text page') || labelText.includes('textpage') || id.includes('email') || id.includes('text') || id.includes('sms')) {
          if (!cb.checked) {
            cb.checked = true;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
            cbCheckedCount++;
          }
        }
      });
      if (cbCheckedCount > 0) filledCount++;

      // 4. FIND AND FILL SUBJECT
      const subjectInput = document.getElementById('txtSubject') || 
                           document.querySelector('input[name*="Subject"]') || 
                           document.querySelector('input[id*="Subject"]') ||
                           Array.from(document.querySelectorAll('input')).find(input => {
                             const name = (input.name || '').toLowerCase();
                             const id = (input.id || '').toLowerCase();
                             return name.includes('subject') || id.includes('subject');
                           });
      if (subjectInput) {
        subjectInput.value = subVal;
        subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
        subjectInput.dispatchEvent(new Event('change', { bubbles: true }));
        filledCount++;
      }

      // 5. FIND AND FILL BOTH TEXT AREAS (Message Center & Pagers)
      const textareas = Array.from(document.querySelectorAll('textarea'));
      let textareaFilled = 0;
      if (textareas.length >= 2) {
        textareas[0].value = bdyVal;
        textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
        textareas[0].dispatchEvent(new Event('change', { bubbles: true }));

        textareas[1].value = bdyVal;
        textareas[1].dispatchEvent(new Event('input', { bubbles: true }));
        textareas[1].dispatchEvent(new Event('change', { bubbles: true }));
        textareaFilled = 2;
        filledCount += 2;
      } else if (textareas.length === 1) {
        textareas[0].value = bdyVal;
        textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
        textareas[0].dispatchEvent(new Event('change', { bubbles: true }));
        textareaFilled = 1;
        filledCount++;
      } else {
        const msgInput = document.getElementById('txtMessage') || document.getElementById('txtBody');
        if (msgInput) {
          msgInput.value = bdyVal;
          msgInput.dispatchEvent(new Event('input', { bubbles: true }));
          msgInput.dispatchEvent(new Event('change', { bubbles: true }));
          textareaFilled = 1;
          filledCount++;
        }
      }

      if (filledCount > 0) {
        alert("Magic Auto-fill Completed! Set dropdowns, checked options, and populated subject + " + textareaFilled + " text fields.");
      } else {
        alert("Connected to page, but couldn't locate fields to inject.");
      }
    })();`;
  };

  const getBookmarkletHref = (): string => {
    const minimized = getRawBookmarkletCode()
      .replace(/\s+/g, ' ')
      .trim();
    return `javascript:${encodeURIComponent(minimized)}`;
  };

  const copyToClipboard = async (text: string, type: 'subject' | 'body' | 'bookmarklet') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'subject') {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else if (type === 'body') {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      } else {
        setCopiedBookmarklet(true);
        setTimeout(() => setCopiedBookmarklet(false), 2000);
      }
    } catch (err) {
      console.error("Could not copy:", err);
    }
  };

  const handleOpenSuite = () => {
    window.open("https://scheduling.esosuite.net/EPS/MessageCenter/SendMessage.ashx", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8" id="send-admin-message-page">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border border-emerald-500/10 rounded-3xl p-6 md:p-8 bg-brand-panel/30 backdrop-blur-md relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-xl text-emerald-400">
            <Bell className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-text-main uppercase tracking-widest leading-none">Send Admin Message</h1>
            <span className="text-[10px] font-bold text-emerald-400 tracking-[0.3em] uppercase mt-1">
              Eso Suite Auto-fill Portal
            </span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 relative z-10">
          <button 
            onClick={handleOpenSuite}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all shadow-lg active:scale-95"
            title="Launch Scheduling Portal"
          >
            <span>Open ESO Scheduler</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 pb-2 gap-4">
        {['status', 'hurt', 'accident'].map((t) => {
          const isSelected = selectedType === t;
          let label = "";
          let Icon = FileText;
          if (t === 'status') { label = "System Status"; Icon = Activity; }
          if (t === 'hurt') { label = "Employee Hurt"; Icon = UserMinus; }
          if (t === 'accident') { label = "AC Vehicle Accident"; Icon = AlertOctagon; }
          
          return (
            <button
              key={t}
              onClick={() => setSelectedType(t as MessageType)}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all text-[10px] h-10 font-bold uppercase tracking-widest
                ${isSelected 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold shadow-md' 
                  : 'bg-brand-panel/10 border-transparent text-text-dim hover:text-emerald-400 hover:bg-emerald-500/5'}
              `}
            >
              <Icon size={14} className={isSelected ? 'text-emerald-400' : 'text-text-dim'} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Dynamic Fields Left Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-white/5 rounded-2xl p-6 bg-brand-panel/50 backdrop-blur-md shadow-lg space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">Template Context</span>
            </div>

            <AnimatePresence mode="wait">
              {/* System Status form fields */}
              {selectedType === 'status' && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                  key="form-status"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Status Urgency Level</label>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">Level {form.statusLevel}</span>
                    </div>
                    <div className="flex items-center w-full justify-between px-2 bg-black/20 py-4 border border-white/5 rounded-2xl relative">
                      {/* Background connected horizontal line */}
                      <div className="absolute top-[35px] left-10 right-10 h-[2px] bg-white/10 pointer-events-none z-0" />
                      
                      {['0', '1', '2', '3'].map((level) => {
                        const isSelected = form.statusLevel === level;
                        return (
                          <div key={level} className="flex flex-col items-center gap-1.5 z-10">
                            <button
                              type="button"
                              onClick={() => handleFieldChange('statusLevel', level as any)}
                              className={`
                                w-10 h-10 rounded-full text-xs font-black border transition-all flex items-center justify-center
                                ${isSelected 
                                  ? 'bg-emerald-500 border-emerald-400 text-white font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110' 
                                  : 'bg-brand-field border-white/5 text-text-dim hover:bg-white/10 hover:text-text-main'}
                              `}
                            >
                              {level}
                            </button>
                            <span className={`text-[8px] font-bold tracking-widest uppercase transition-colors ${isSelected ? 'text-emerald-400' : 'text-text-dim/50'}`}>
                              L{level}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Employee Hurt form fields */}
              {selectedType === 'hurt' && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                  key="form-hurt"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Employee Name</label>
                      <input
                        type="text"
                        value={form.employeeName}
                        onChange={(e) => handleFieldChange('employeeName', e.target.value)}
                        className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Employee ID</label>
                      <input
                        type="text"
                        value={form.employeeId}
                        onChange={(e) => handleFieldChange('employeeId', e.target.value)}
                        className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Injury / Event Type</label>
                    <input
                      type="text"
                      value={form.injuryType}
                      onChange={(e) => handleFieldChange('injuryType', e.target.value)}
                      className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                      placeholder="e.g. Exposure, Needle slip, Orthopedic slip/fall"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Occurrence Location</label>
                    <input
                      type="text"
                      value={form.injuryLocation}
                      onChange={(e) => handleFieldChange('injuryLocation', e.target.value)}
                      className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Supervisor Notified</label>
                    <input
                      type="text"
                      value={form.supervisorName}
                      onChange={(e) => handleFieldChange('supervisorName', e.target.value)}
                      className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Immediate Action / Treatment</label>
                    <textarea
                      value={form.actionsTaken}
                      onChange={(e) => handleFieldChange('actionsTaken', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors resize-none custom-scrollbar"
                      placeholder="e.g., EMS evaluated, transported to ER, self-care log"
                    />
                  </div>
                </motion.div>
              )}

              {/* AC Vehicle Accident form fields */}
              {selectedType === 'accident' && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                  key="form-accident"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Vehicle Unit ID</label>
                      <input
                        type="text"
                        value={form.vehicleUnit}
                        onChange={(e) => handleFieldChange('vehicleUnit', e.target.value)}
                        className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                        placeholder="e.g. Medic 3"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Vehicle Status</label>
                      <input
                        type="text"
                        value={form.vehicleStatus}
                        onChange={(e) => handleFieldChange('vehicleStatus', e.target.value)}
                        className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                        placeholder="e.g. OOS / Tow needed"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Incident Location</label>
                    <input
                      type="text"
                      value={form.accidentLocation}
                      onChange={(e) => handleFieldChange('accidentLocation', e.target.value)}
                      className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                      placeholder="Intersections / Mile markers"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Crew on Board</label>
                    <input
                      type="text"
                      value={form.crewMembers}
                      onChange={(e) => handleFieldChange('crewMembers', e.target.value)}
                      className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Police Dispatch ID</label>
                      <input
                        type="text"
                        value={form.policeIncident}
                        onChange={(e) => handleFieldChange('policeIncident', e.target.value)}
                        className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Injuries Reported?</label>
                      <input
                        type="text"
                        value={form.injuriesReported}
                        onChange={(e) => handleFieldChange('injuriesReported', e.target.value)}
                        className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-dim">Brief Collision Description</label>
                    <textarea
                      value={form.briefDescription}
                      onChange={(e) => handleFieldChange('briefDescription', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-brand-field border border-white/5 rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-emerald-500/50 transition-colors resize-none custom-scrollbar"
                      placeholder="Describe what occurred on final report..."
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Controls & Bookmarklet Generator Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header tabs for Right Column */}
          <div className="border border-white/5 rounded-2xl bg-brand-panel/50 backdrop-blur-md shadow-lg overflow-hidden">
            <div className="flex border-b border-white/5 bg-black/10">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-4 text-[10px] h-11 font-black uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-text-dim hover:text-text-main'}`}
              >
                Output Preview
              </button>
              <button
                onClick={() => setActiveTab('instructions')}
                className={`flex-1 py-4 text-[10px] h-11 font-black uppercase tracking-widest transition-all ${activeTab === 'instructions' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-text-dim hover:text-text-main'}`}
              >
                Auto-Fill Setup & Drag-and-Drop
              </button>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'preview' ? (
                  <motion.div
                    key="tab-preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Subject Row */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-wider text-text-dim">Compiling Subject Line</span>
                        <button
                          onClick={() => copyToClipboard(getSubject(), 'subject')}
                          className="flex items-center gap-1.5 px-3 py-1 bg-black/20 hover:bg-black/40 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-400 transition-all active:scale-95"
                        >
                          {copiedSubject ? (
                            <>
                              <Check size={10} className="text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>Copy Line</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-brand-field border border-white/5 rounded-xl p-4 font-mono text-xs text-text-main tracking-wide">
                        {getSubject()}
                      </div>
                    </div>

                    {/* Body Text Box */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-wider text-text-dim">Compiled Message Body</span>
                        <button
                          onClick={() => copyToClipboard(getBody(), 'body')}
                          className="flex items-center gap-1.5 px-3 py-1 bg-black/20 hover:bg-black/40 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-400 transition-all active:scale-95"
                        >
                          {copiedBody ? (
                            <>
                              <Check size={10} className="text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>Copy Body</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-brand-field border border-white/5 rounded-xl p-4 font-mono text-xs text-text-main leading-relaxed select-all whitespace-pre-wrap custom-scrollbar max-h-72 overflow-y-auto">
                        {getBody()}
                      </div>
                    </div>

                    {/* Auto-Inject Specs List */}
                    <div className="bg-black/20 border border-white/5 rounded-xl p-4.5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">🤖 Active Bookmarklet Auto-Inject Specs</span>
                        <span className="text-[8px] font-bold text-text-dim uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[8px]">Available Boxes Armed</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-text-dim uppercase tracking-wider">
                        <div className="bg-brand-field p-2.5 rounded-lg border border-white/5 flex flex-col gap-1 shadow-inner">
                          <span className="text-text-main/70 text-[8px]">Group Selection</span>
                          <span className="text-emerald-400 text-[9px] font-black tracking-tight truncate">Medshore / Anderson Alerts</span>
                        </div>
                        <div className="bg-brand-field p-2.5 rounded-lg border border-white/5 flex flex-col gap-1 shadow-inner">
                          <span className="text-text-main/70 text-[8px]">Registered User</span>
                          <span className="text-emerald-400 text-[9px] font-black">Yes (First Radio Box)</span>
                        </div>
                        <div className="bg-brand-field p-2.5 rounded-lg border border-white/5 flex flex-col gap-1 shadow-inner">
                          <span className="text-text-main/70 text-[8px]">Acknowledge Required</span>
                          <span className="text-emerald-400 text-[9px] font-black">Yes (Second Radio Box)</span>
                        </div>
                        <div className="bg-brand-field p-2.5 rounded-lg border border-white/5 flex flex-col gap-1 shadow-inner">
                          <span className="text-text-main/70 text-[8px]">Dual Send Channels</span>
                          <span className="text-emerald-400 text-[9px] font-black">Email & Text Pages</span>
                        </div>
                      </div>
                    </div>

                    {/* Bookmarklet Quick-Launch action block */}
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-4 shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 text-xs">
                          <Send size={15} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-text-main uppercase tracking-widest">ESO Suite Auto-Inject</span>
                          <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-widest mt-0.5">Dual-Method Launch</span>
                        </div>
                      </div>

                      <p className="text-[10px] uppercase font-bold text-text-dim leading-relaxed tracking-wider">
                        Click <strong className="text-emerald-400">"Copy Bookmarklet Address"</strong> below. Then, right-click your browser's bookmarks bar, select <strong className="text-emerald-400">"Add Page" / "Bookmark link"</strong>, name it, and paste this address in. Then click <strong className="text-emerald-400">"Launch Scheduling Portal"</strong> and run it!
                      </p>

                      <div className="flex flex-wrap gap-3 pt-1">
                        {/* Copy Bookmarklet Code Trigger */}
                        <button
                          onClick={() => copyToClipboard(getBookmarkletHref(), 'bookmarklet')}
                          className="px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white border border-emerald-400 hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 shadow-inner active:scale-95"
                        >
                          <Hammer size={12} />
                          <span>{copiedBookmarklet ? "✅ Copied Address!" : "📋 Copy Bookmarklet Address"}</span>
                        </button>

                        <button
                          onClick={handleOpenSuite}
                          className="px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-black/30 hover:bg-black/50 border border-white/10 hover:border-emerald-500/30 text-text-main hover:text-emerald-400 transition-all active:scale-95 flex items-center gap-2"
                        >
                          <ExternalLink size={12} className="text-emerald-400" />
                          <span>Launch Scheduling Portal</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="tab-instructions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">Integration instructions</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex gap-4 items-start">
                          <div className="w-5 h-5 rounded-full bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-bold text-[9px] shrink-0 border border-emerald-500/20">1</div>
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-text-main">Equip Bookmarklet button</h4>
                            <p className="text-[10px] text-text-dim leading-relaxed uppercase font-semibold">
                              Click <strong className="text-emerald-400">📋 Copy Bookmarklet Address</strong> on the "Output Preview" tab. Right-click your browser bookmarks bar (press Command+Shift+B/Ctrl+Shift+B if hidden), select "Add Page" or "Add Bookmark", type "ESO Auto-fill", and paste into the URL / Address field.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4 items-start">
                          <div className="w-5 h-5 rounded-full bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-bold text-[9px] shrink-0 border border-emerald-500/20">2</div>
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-text-main">Open the dispatch center</h4>
                            <p className="text-[10px] text-text-dim leading-relaxed uppercase font-semibold">
                              Click <strong className="text-emerald-400">"Launch Scheduling Portal"</strong> to navigate to ESO Suite. This opens <code className="text-[9px] bg-black/20 px-1 py-0.5 rounded text-emerald-400 tracking-tight">esosuite.net</code> in a new secure tab.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4 items-start">
                          <div className="w-5 h-5 rounded-full bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-bold text-[9px] shrink-0 border border-emerald-500/20">3</div>
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-text-main">Magic Auto-fill inject</h4>
                            <p className="text-[10px] text-text-dim leading-relaxed uppercase font-semibold">
                              On that newly opened page, simply click the bookmark you saved in Step 1. The bookmarklet script will scan the form and instantly pre-populate the Subject and message boxes!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced code view */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-wider text-text-dim">Script Source Code (Troubleshooting)</span>
                        <button
                          onClick={() => copyToClipboard(getRawBookmarkletCode(), 'bookmarklet')}
                          className="flex items-center gap-1.5 px-3 py-1 bg-black/20 hover:bg-black/40 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-400 transition-all active:scale-95"
                        >
                          {copiedBookmarklet ? (
                            <>
                              <Check size={10} className="text-emerald-400" />
                              <span>Copied Script!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-4 bg-black/40 border border-white/5 rounded-xl text-[9px] font-mono text-text-dim overflow-x-auto max-h-56 custom-scrollbar leading-relaxed">
                        {getRawBookmarkletCode()}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
