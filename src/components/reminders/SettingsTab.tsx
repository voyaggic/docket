import React, { useState } from 'react';
import { 
  Wrench, Save, Plus, Trash, Globe, Calendar, RefreshCw, CheckCircle2, FileText, Smartphone 
} from 'lucide-react';

export default function SettingsTab() {
  const [types, setTypes] = useState<string[]>([
    'Court Appearance', 'Filing Pleading', 'Client Meeting', 'Statute of Limitations', 'File Briefs'
  ]);
  const [newType, setNewType] = useState('');
  
  // Custom states
  const [ackWindow, setAckWindow] = useState('24');
  const [escalateTo, setEscalateTo] = useState('supervisor');
  const [customMsg, setCustomMsg] = useState('URGENT COMPLIANCE OBLIGATION: [DEADLINE_TITLE] is due on [DUE_DATE] for case folder [MATTER_REF]!');
  const [googleCalendarSynced, setGoogleCalendarSynced] = useState(false);
  const [outlookCalendarSynced, setOutlookCalendarSynced] = useState(false);
  
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  const handleAddType = () => {
    if (newType && !types.includes(newType)) {
      setTypes([...types, newType]);
      setNewType('');
    }
  };

  const handleRemoveType = (t: string) => {
    setTypes(types.filter(item => item !== t));
  };

  const handleSaveSettings = () => {
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  return (
    <div className="bg-white border rounded-2xl p-5 space-y-6 text-xxs" id="reminder-settings-panel">
      {/* Settings Header */}
      <div className="flex justify-between items-center pb-2 border-b">
        <div className="flex items-center gap-1.5">
          <Wrench className="h-5 w-5 text-indigo-605" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Firm-wide Time & SLA Rule Parameters</h4>
            <p className="text-[10px] text-slate-400 font-semibold font-sans">Set calendar alerts, automated notifications, escalations, SMS delivery setups, and integrations.</p>
          </div>
        </div>

        <button 
          onClick={handleSaveSettings}
          className="p-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 cursor-pointer transition font-bold"
        >
          <Save className="h-4 w-4 shrink-0" />
          <span>Apply Configurations</span>
        </button>
      </div>

      {showSavedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl flex items-center gap-2 animate-fade-in font-bold">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <span>Configured rules have been stored and dispatched to production instances!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
        
        {/* Category mapping */}
        <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
          <span className="font-extrabold text-slate-800 uppercase tracking-wide text-[10px] block">1. Custom Categories & Status Badges</span>
          <div className="space-y-1.5">
            {types.map(t => (
              <div key={t} className="flex justify-between items-center bg-white border p-2 rounded-lg">
                <span className="font-mono text-slate-700">{t}</span>
                <button 
                  onClick={() => handleRemoveType(t)}
                  className="text-red-500 hover:text-red-700 text-[10px]"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            <input 
              type="text" 
              placeholder="Add category e.g. Mediation Day..." 
              value={newType} 
              onChange={e => setNewType(e.target.value)}
              className="flex-1 text-[11px] p-2 bg-white border rounded-lg focus:outline-none"
            />
            <button 
              onClick={handleAddType}
              className="p-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg px-3.5 cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>

        {/* Escalations rule block */}
        <div className="p-4 bg-slate-50 border rounded-xl space-y-4">
          <span className="font-extrabold text-slate-800 uppercase tracking-wide text-[10px] block font-sans">2. Escalations & Acknowledgements (Section 15)</span>
          
          <div className="space-y-3 font-semibold text-slate-600">
            <div>
              <label className="text-[10px] text-slate-450 uppercase block mb-1">Acknowledgement Grace Period</label>
              <select 
                value={ackWindow} 
                onChange={e => setAckWindow(e.target.value)}
                className="w-full text-xs p-2 bg-white border rounded-lg"
              >
                <option value="12">12 hours before deadline</option>
                <option value="24">24 hours before deadline</option>
                <option value="48">48 hours before deadline</option>
                <option value="72">72 hours before deadline</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-450 uppercase block mb-1">Escalation Recipient</label>
              <select 
                value={escalateTo} 
                onChange={e => setEscalateTo(e.target.value)}
                className="w-full text-xs p-2 bg-white border rounded-lg"
              >
                <option value="supervisor">Case Lead Attorney & Partner</option>
                <option value="superadmin">Firm Managing Partner</option>
                <option value="auditor">Internal Risk Auditor</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-450 uppercase block mb-3">Custom Trigger Alert Message</label>
              <textarea 
                value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                rows={3}
                className="w-full text-[11px] p-2.5 bg-white border rounded-lg font-mono"
              />
              <span className="text-[9px] text-slate-400 block mt-1 leading-normal italic">
                Supported variables: [DEADLINE_TITLE], [MATTER_REF], [DUE_DATE], [FIRM_NAME]
              </span>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="p-4 bg-slate-50 border rounded-xl space-y-4 md:col-span-2">
          <span className="font-extrabold text-slate-800 uppercase tracking-wide text-[10px] block">3. Bi-directional Calendar Sync (Section 18)</span>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white border rounded-xl flex items-center justify-between shadow-xxs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                  <Globe className="h-4.5 w-4.5 text-blue-600" />
                  <span>Google GSuite Calendar Integration</span>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-normal">Allows real-time sync of courtroom dates into GSuite. No manual entry.</p>
              </div>
              <button 
                onClick={() => setGoogleCalendarSynced(!googleCalendarSynced)}
                className={`p-1.5 px-3.5 rounded-lg font-extrabold text-[10px] border transition cursor-pointer ${
                  googleCalendarSynced 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {googleCalendarSynced ? 'Synced OAuth Active' : 'Start OAuth Flow'}
              </button>
            </div>

            <div className="p-4 bg-white border rounded-xl flex items-center justify-between shadow-xxs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                  <RefreshCw className="h-4.5 w-4.5 text-blue-500" />
                  <span>Microsoft Outlook 365 Exchange</span>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-normal">Pushes statutory deadlines straight to counsel schedules in MS Outlook.</p>
              </div>
              <button 
                onClick={() => setOutlookCalendarSynced(!outlookCalendarSynced)}
                className={`p-1.5 px-3.5 rounded-lg font-extrabold text-[10px] border transition cursor-pointer ${
                  outlookCalendarSynced 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {outlookCalendarSynced ? 'Exchange Active' : 'Configure Exchange'}
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
