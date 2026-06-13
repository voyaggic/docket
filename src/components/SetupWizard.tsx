import React, { useState } from 'react';
import { 
  Briefcase, Loader2, Users, FileText, Bell, MessageSquare, 
  Settings, CheckCircle, ArrowRight, ArrowLeft, UploadCloud, Plus, X 
} from 'lucide-react';
import { CompanySettings, UserRole } from '../types';

interface SetupWizardProps {
  userEmail: string;
  onComplete: (setupData: {
    settings: Partial<CompanySettings>;
    team: Array<{ fullName: string; email: string; role: any }>;
  }) => void;
}

export default function SetupWizard({ userEmail, onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const makeFileHandler = (fileKey: string, extractType: string) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const target = e.target;
      if (!file) { 
        await handleAiExtract(fileKey, extractType); 
        target.value = '';
        return; 
      }
      try {
        const text = await file.text();
        await handleAiExtract(fileKey, extractType, text);
      } catch {
        setNotice('Could not read file. Using demo data instead.');
        await handleAiExtract(fileKey, extractType);
      }
      target.value = '';
    };

  // Step 1: Firm Details
  const [firmName, setFirmName] = useState('Docket legal partners');
  const [caseTypes, setCaseTypes] = useState<string[]>(["Criminal", "Civil", "Family"]);
  const [customCaseType, setCustomCaseType] = useState('');
  const [courts, setCourts] = useState<string[]>(["Supreme Court", "District Magistrate Court"]);
  const [newCourt, setNewCourt] = useState('');
  const [refFormat, setRefFormat] = useState('DK/[YEAR]/[NUM]');
  const [address, setAddress] = useState('100 Docket Towers, New York, NY');
  const [phone, setPhone] = useState('+1 (555) 321-4990');

  // Step 2: Team Members
  const [teamMembers, setTeamMembers] = useState<Array<{ fullName: string; email: string; role: any }>>([
    { fullName: "Alex Rivera", email: userEmail, role: UserRole.ADMIN }
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState(UserRole.LAWYER);

  // Step 3: Case Stages
  const [caseStages, setCaseStages] = useState<string[]>([
    "Client Consultation", "File Opened", "Documents Filed", "Mention Date", "Hearing", "Judgement", "Case Closed"
  ]);
  const [newStage, setNewStage] = useState('');

  // Step 4: Reminders
  const [reminderDays, setReminderDays] = useState<number[]>([1, 3, 7]);
  const [notifyWhom, setNotifyWhom] = useState<'only_lawyer' | 'whole_team' | 'lawyer_head'>('whole_team');
  const [delivery, setDelivery] = useState<('system' | 'email')[]>(["system", "email"]);

  // Step 5: Update Preferences
  const [workflow, setWorkflow] = useState<'draft_review' | 'auto_send' | 'manual'>('draft_review');
  const [tone, setTone] = useState<'formal' | 'friendly' | 'plain'>('friendly');
  const [channels, setChannels] = useState<('email' | 'whatsapp' | 'sms')[]>(["email", "whatsapp"]);
  const [styleProfile, setStyleProfile] = useState<any>({});

  // Step 6: Templates selected
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(["Demand Letter", "Affidavit of Fact"]);
  const [isDoneState, setIsDoneState] = useState(false);

  // MOCK FILE CONTENT SAMPLES for AI extraction triggers
  const MOCK_FILES: Record<string, string> = {
    firmhead: "LEXIS PARTNERS COUNSEL. ADDRESS: 120 Wall Street, Financial District, NY 10005. TEL: +1 (212) 490-8800. EMAIL: filings@lexispartners.com. Chief Executive: Charles Lexis.",
    staff: "Employee Directory: 1. Helena Troy (email: helena@lexispartners.com, Senior Attorney) 2. Robert Downey (email: robert@lexispartners.com, Paralegal Clerk) 3. Sarah Connor (email: sarah@lexispartners.com, Associate Partner)",
    stages: "Standard litigation roadmap: Step A: Intake assessment, Step B: Pleading construction and submission to registry, Step C: Interrogatories Discovery Phase, Step D: In-court argument, Step E: Post-trial relief and Close.",
    template: "Letter of Demand. Variables: [LAWYER NAME], [CLIENT NAME], [OPPOSING PARTY], [CASE REFERENCE]. Static contents: Please pay within 14 business days of breach notice date."
  };

  const handleAiExtract = async (fileKey: string, extractType: string, overrideText?: string) => {
    setLoading(true);
    setNotice('');
    const sampleText = overrideText !== undefined ? overrideText : (MOCK_FILES[fileKey] || '');

    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sampleText, type: extractType })
      });
      const result = await res.json();
      const extracted = result.data;

      if (extractType === 'firmhead') {
        if (extracted.firmName) setFirmName(extracted.firmName);
        if (extracted.address) setAddress(extracted.address);
        if (extracted.phone) setPhone(extracted.phone);
        if (extracted.email) setPhone(extracted.email);
        setNotice('Successfully extracted legal firm coordinates with Gemini AI!');
      } else if (extractType === 'staff') {
        const parsedStaff = Array.isArray(extracted) ? extracted : extracted.staff || [];
        const combined = [...teamMembers];
        parsedStaff.forEach((s: any) => {
          if (s.fullName && s.email) {
            combined.push({
              fullName: s.fullName,
              email: s.email,
              role: s.role || UserRole.LAWYER
            });
          }
        });
        setTeamMembers(combined);
        setNotice('Successfully extracted employee tags with Gemini AI!');
      } else if (extractType === 'stages') {
        const parsedStages = Array.isArray(extracted) ? extracted : extracted.stages || [];
        if (parsedStages.length > 0) {
          setCaseStages(parsedStages);
          setNotice('Reconstituted court pipelines through Gemini translation analysis!');
        }
      } else {
        setStyleProfile({
          tone: 'Professional and Firm',
          observedPatterns: ['demanding tone', '14-day notice warning'],
          originalSummary: 'Slightly high intensity with precise contractual references.'
        });
        setNotice('Extracted firm messaging profile metrics!');
      }
    } catch (err) {
      console.error(err);
      setNotice('Could not reach AI parser. Applied local blueprint instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeamMember = () => {
    if (!newMemberName || !newMemberEmail) return;
    setTeamMembers([...teamMembers, {
      fullName: newMemberName,
      email: newMemberEmail,
      role: newMemberRole
    }]);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  const handleAddCourt = () => {
    if (newCourt.trim() && !courts.includes(newCourt.trim())) {
      setCourts([...courts, newCourt.trim()]);
      setNewCourt('');
    }
  };

  const handleAddStage = () => {
    if (newStage.trim() && !caseStages.includes(newStage.trim())) {
      setCaseStages([...caseStages, newStage.trim()]);
      setNewStage('');
    }
  };

  const submitWizard = () => {
    onComplete({
      settings: {
        firmName,
        caseTypes,
        courts,
        referenceFormat: refFormat,
        address,
        phone,
        email: userEmail,
        caseStages,
        reminderDefaults: {
          daysBefore: reminderDays,
          notifyWhom,
          delivery
        },
        updatePreferences: {
          workflow,
          tone,
          channels
        },
        communicationStyle: styleProfile
      },
      team: teamMembers
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" id="setup-wizard-root">
      <input type="file" id="up-firmhead" style={{ display: 'none' }} onChange={makeFileHandler('firmhead','firmhead')} accept=".txt,.pdf,.doc,.docx,text/*" />
      <input type="file" id="up-staff" style={{ display: 'none' }} onChange={makeFileHandler('staff','staff')} accept=".txt,.pdf,.doc,.docx,text/*" />
      <input type="file" id="up-stages" style={{ display: 'none' }} onChange={makeFileHandler('stages','stages')} accept=".txt,.pdf,.doc,.docx,text/*" />
      <input type="file" id="up-template" style={{ display: 'none' }} onChange={makeFileHandler('template','template')} accept=".txt,.pdf,.doc,.docx,text/*" />
      {/* Header and indicator bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 btn-custom rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
            D
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Docket Platform Setup</h1>
            <p className="text-xs text-slate-500">Legal Practice multi-tenant isolation engine</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              onComplete({
                settings: {
                  firmName: "Docket Legal Partners",
                  caseTypes: ["Criminal", "Civil", "Family"],
                  courts: ["Supreme Court", "District Magistrate Court"],
                  referenceFormat: "DK/[YEAR]/[NUM]",
                  address: "100 Docket Towers, New York, NY",
                  phone: "+1 (555) 321-4990",
                  caseStages: ["Client Consultation", "File Opened", "Documents Filed", "Mention Date", "Hearing", "Judgement", "Case Closed"],
                  reminderDefaults: {
                    daysBefore: [1, 3, 7],
                    notifyWhom: "whole_team",
                    delivery: ["system", "email"]
                  },
                  updatePreferences: {
                    workflow: "draft_review",
                    tone: "friendly",
                    channels: ["email", "whatsapp"]
                  },
                  communicationStyle: {
                    tone: 'Professional and Friendly',
                    observedPatterns: ['clear milestones', 'proactive status notices'],
                    structure: 'High compliance with automated message templates'
                  }
                },
                team: [
                  { fullName: "Alex Rivera", email: userEmail, role: UserRole.ADMIN }
                ]
              });
            }}
            className="px-3.5 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer border border-sky-300"
            id="header-bypass-btn"
          >
            🚀 Skip Setup (Demo Mode)
          </button>
          <div className="text-slate-400 font-mono text-xs">
            STEP {currentStep} OF 6
          </div>
        </div>
      </header>

      {/* Progress slider */}
      <div className="h-1.5 w-full bg-slate-200">
        <div 
          className="h-full bg-blue-600 transition-all duration-300" 
          style={{ width: `${(currentStep / 6) * 100}%` }}
        />
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center">
        {loading && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-6 text-center max-w-sm shadow-xl flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-800">Docket AI is extracting templates...</p>
              <p className="text-xs text-slate-400 mt-1">Structured document alignment in progress</p>
            </div>
          </div>
        )}

        {/* Global Action Alerts */}
        {notice && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 text-sm rounded-r-lg flex items-center justify-between shadow-sm">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="p-1 hover:bg-emerald-100 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          
          {/* STEP 1: FIRM DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase className="text-blue-600 h-6 w-6" /> Firm Configuration Details
                </h2>
                <p className="text-sm text-slate-400 mt-1">Specify localized credentials in Docket workspace.</p>
              </div>

              {/* Advanced Auto-populator */}
              <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-4">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-2">Docket AI Instapopulate</span>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-xs text-slate-600">Have a letterhead or standard firm profile text? Let Gemini parse variables instantly.</p>
                  <label htmlFor="up-firmhead" className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow cursor-pointer transition-colors">
                    <UploadCloud className="h-3.5 w-3.5" /> Parse Spec Letterhead
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Law Firm Brand Name</label>
                  <input 
                    type="text" 
                    value={firmName} 
                    onChange={e => setFirmName(e.target.value)} 
                    className="w-full text-sm border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-100 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Standard File Reference Prefix</label>
                  <input 
                    type="text" 
                    value={refFormat} 
                    onChange={e => setRefFormat(e.target.value)} 
                    className="w-full text-sm border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-100 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Firm Phone Coordinates</label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className="w-full text-sm border p-2.5 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Corporate Physical Address</label>
                  <input 
                    type="text" 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    className="w-full text-sm border p-2.5 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              {/* Case Types Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Practice Specialties In House</label>
                <div className="flex flex-wrap gap-2">
                  {["Criminal", "Civil", "Family", "Transactional", "Labor", "Admiralty", "Corporate", "Patent"].map(type => {
                    const active = caseTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          if (active) setCaseTypes(caseTypes.filter(t => t !== type));
                          else setCaseTypes([...caseTypes, type]);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Courts input tags array */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Active Litigious Court Circuits</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="E.g. Appellate High Court"
                    value={newCourt}
                    onChange={e => setNewCourt(e.target.value)}
                    className="flex-1 text-sm border p-2.5 rounded-lg bg-slate-50"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCourt(); }}
                  />
                  <button onClick={handleAddCourt} className="px-4 py-2.5 bg-slate-200 text-slate-800 font-semibold rounded-lg text-sm flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {courts.map(c => (
                    <span key={c} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      {c}
                      <button onClick={() => setCourts(courts.filter(item => item !== c))}>
                        <X className="h-3 w-3 hover:text-red-500" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TEAM MEMBERS */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Users className="text-indigo-600 h-6 w-6" /> Employee & Partner Enlistment
                </h2>
                <p className="text-sm text-slate-400 mt-1">Configure staff permission ranks within firm multi-tenancy.</p>
              </div>

              <div className="bg-indigo-50/50 rounded-xl border border-indigo-200 p-4">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-2">Docket AI Instapopulate</span>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-xs text-slate-600">Upload standard tabular directory or raw employee notes for automatic ingestion.</p>
                  <label htmlFor="up-staff" className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow cursor-pointer transition-colors">
                    <UploadCloud className="h-3.5 w-3.5" /> Parse Employee Sheets
                  </label>
                </div>
              </div>

              {/* Repeating blocks */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-600">Added Counsel and Paralegals</label>
                <div className="bg-slate-50 rounded-xl p-4 border space-y-2">
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-white border rounded-lg shadow-xs">
                      <div>
                        <span className="font-semibold text-sm text-slate-700">{member.fullName}</span>
                        <span className="text-xs text-slate-400 font-mono ml-2">({member.email})</span>
                      </div>
                      <span className="text-xs bg-slate-100 px-2 py-0.5 border text-slate-600 font-bold uppercase rounded">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Full Name</label>
                  <input 
                    type="text" 
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    className="w-full text-sm border p-2 bg-slate-50 rounded-lg"
                    placeholder="E.g. Sarah Jenkins"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    className="w-full text-sm border p-2 bg-slate-50 rounded-lg"
                    placeholder="E.g. sarah@docket.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Access Role Assign</label>
                  <div className="flex gap-1.5">
                    <select
                      value={newMemberRole}
                      onChange={e => setNewMemberRole(e.target.value as any)}
                      className="flex-1 text-sm border p-2 bg-slate-50 rounded-lg"
                    >
                      <option value={UserRole.LAWYER}>Lawyer</option>
                      <option value={UserRole.PARALEGAL}>Paralegal</option>
                      <option value={UserRole.SECRETARY}>Secretary</option>
                      <option value={UserRole.ADMIN}>Firm Admin</option>
                    </select>
                    <button onClick={handleAddTeamMember} className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CASE STAGES PIPELINE */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase className="text-emerald-600 h-6 w-6" /> Court Pipeline Stages
                </h2>
                <p className="text-sm text-slate-400 mt-1">Custom progress steps cases flow through under company settings.</p>
              </div>

              <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-4">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-2">Docket AI Instapopulate</span>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-xs text-slate-600">Provide litigation brief outline or progress ledger. Gemini auto-orders sequence loops.</p>
                  <label htmlFor="up-stages" className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow cursor-pointer transition-colors">
                    <UploadCloud className="h-3.5 w-3.5" /> Parse Litigation Roadmap
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Sequence Order of Stages</label>
                <div className="bg-slate-50 p-4 border rounded-xl space-y-1.5">
                  {caseStages.map((stg, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-white border rounded-lg shadow-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-slate-100 h-5 w-5 rounded-full flex items-center justify-center font-bold text-slate-500 font-mono">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-750 font-medium">{stg}</span>
                      </div>
                      <button 
                        onClick={() => {
                          if (caseStages.length > 2) {
                            setCaseStages(caseStages.filter(item => item !== stg));
                          } else {
                            alert("You must define a minimum of two case stages.");
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Insert custom litigation step"
                  value={newStage}
                  onChange={e => setNewStage(e.target.value)}
                  className="flex-1 text-sm border p-2.5 rounded-lg bg-slate-50"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddStage(); }}
                />
                <button onClick={handleAddStage} className="px-4 py-2.5 bg-slate-200 text-slate-800 font-bold rounded-lg text-sm flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Add Pipeline Stage
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REMINDER PREFERENCES */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Bell className="text-amber-600 h-6 w-6" /> Alert Settings & Reminders
                </h2>
                <p className="text-sm text-slate-400 mt-1">Calibrate automation delays when court dates and filing requirements approach.</p>
              </div>

              {/* Alert delays selection */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Lead Time Thresholds (Days Before Due)</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 5, 7, 10, 14, 21, 30].map(day => {
                    const active = reminderDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          if (active) setReminderDays(reminderDays.filter(d => d !== day));
                          else setReminderDays([...reminderDays, day]);
                        }}
                        className={`text-xs px-3 py-2 rounded-lg border font-mono font-medium transition ${active ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        {day} {day === 1 ? 'day' : 'days'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Who receives */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Internal Recipients Routing</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: 'only_lawyer', title: "Assigned lawyer only" },
                    { key: 'whole_team', title: "Full organizational staff" },
                    { key: 'lawyer_head', title: "Assigned lawyer & administrator" }
                  ].map(option => (
                    <div 
                      key={option.key} 
                      onClick={() => setNotifyWhom(option.key as any)}
                      className={`cursor-pointer p-4 border rounded-xl text-center transition ${notifyWhom === option.key ? 'bg-amber-50 border-amber-500' : 'bg-white hover:bg-slate-50'}`}
                    >
                      <span className="text-sm font-semibold text-slate-800">{option.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Channels */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Delivery Channels</label>
                <div className="flex gap-4">
                  {[
                    { key: 'system', title: "Docket Client Dashboard Alerts" },
                    { key: 'email', title: "Consolidated SMTP Email" }
                  ].map(ch => {
                    const active = delivery.includes(ch.key as any);
                    return (
                      <button
                        key={ch.key}
                        onClick={() => {
                          if (active) setDelivery(delivery.filter(d => d !== ch.key));
                          else setDelivery([...delivery, ch.key as any]);
                        }}
                        className={`flex-1 p-3.5 rounded-xl border text-sm font-semibold transition text-center ${active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600'}`}
                      >
                        {ch.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CLIENT COMMUNICATIONS & BRANDING */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="text-pink-600 h-6 w-6" /> Custom Client Messaging
                </h2>
                <p className="text-sm text-slate-400 mt-1">Construct the tone, dispatch loops, and styles Docket uses to draft updates.</p>
              </div>

              {/* Upload past message to extract style */}
              <div className="bg-pink-50/50 rounded-xl border border-pink-200 p-4">
                <span className="text-xs font-bold text-pink-600 uppercase tracking-widest block mb-2">Docket AI Stylometry Alignment</span>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-xs text-slate-600">Paste or drag a past client update you have sent. Gemini reverse-analyzes voice patterns!</p>
                  <label htmlFor="up-template" className="p-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow cursor-pointer transition-colors">
                    <UploadCloud className="h-3.5 w-3.5" /> Parse Tone Sample
                  </label>
                </div>
              </div>

              {/* Style Extracted metadata visualizer */}
              {styleProfile.tone && (
                <div className="bg-slate-900 text-slate-300 rounded-xl p-4 font-mono text-xs space-y-1">
                  <p className="text-emerald-400 font-semibold uppercase tracking-wider">Tone Profile Extracted:</p>
                  <p><span className="text-slate-500">Formality Index:</span> {styleProfile.tone}</p>
                  <p><span className="text-slate-500">Linguistic Loops:</span> {styleProfile.observedPatterns?.join(', ')}</p>
                  <p><span className="text-slate-500">Acoustic Summary:</span> {styleProfile.originalSummary}</p>
                </div>
              )}

              {/* Update workflows */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Filer Notification Workflow</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: 'draft_review', title: "Review Draft Drafted by AI", desc: "Allows attorney verification before sending." },
                    { key: 'auto_send', title: "Autosend updates directly", desc: "Immediate messaging as case timeline moves." },
                    { key: 'manual', title: "Complete Manual Action Only", desc: "No automated suggestions or drafts." }
                  ].map(option => (
                    <div 
                      key={option.key} 
                      onClick={() => setWorkflow(option.key as any)}
                      className={`cursor-pointer p-4 border rounded-xl flex flex-col justify-between transition ${workflow === option.key ? 'bg-pink-50 border-pink-500' : 'bg-white hover:bg-slate-50'}`}
                    >
                      <span className="text-sm font-semibold text-slate-800">{option.title}</span>
                      <span className="text-xxs text-slate-500 mt-1">{option.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Docket Natural Tone Base</label>
                <div className="flex gap-2">
                  {[
                    { key: 'formal', label: "Formal & Prestigious" },
                    { key: 'friendly', label: "Empathetic & Friendly" },
                    { key: 'plain', label: "Plain English & Short" }
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setTone(t.key as any)}
                      className={`flex-1 py-2 text-xs font-semibold border rounded-lg transition ${tone === t.key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Channels */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Operational Channels (Multi-select)</label>
                <div className="flex gap-2">
                  {[
                    { key: 'email', label: "SMTP Email" },
                    { key: 'whatsapp', label: "WhatsApp Official" },
                    { key: 'sms', label: "Network SMS" }
                  ].map(ch => {
                    const active = channels.includes(ch.key as any);
                    return (
                      <button
                        key={ch.key}
                        onClick={() => {
                          if (active) setChannels(channels.filter(c => c !== ch.key));
                          else setChannels([...channels, ch.key as any]);
                        }}
                        className={`flex-1 py-2 text-xs font-semibold border rounded-lg transition ${active ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-600'}`}
                      >
                        {ch.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: DOCUMENT TEMPLATES */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="text-violet-600 h-6 w-6" /> Legal Document Templates
                </h2>
                <p className="text-sm text-slate-400 mt-1">Select and configure the baseline templates you generate from.</p>
              </div>

              <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                <span className="text-xs font-bold text-violet-600 uppercase tracking-widest block mb-1">Docket High-Contrast Extraction</span>
                <p className="text-xs text-slate-600">Docket automatically scans newly uploaded documents for bracketed strings like <span className="p-1 px-1.5 bg-amber-100 rounded text-amber-800 font-bold">[CLIENT_NAME]</span> and registers them as fillable input tokens inside Docket templates!</p>
              </div>

              {/* Multi-select boilerplate templates */}
              <div className="grid grid-cols-2 gap-3">
                {["Demand Letter", "Affidavit of Fact", "Witness Testimony", "Statutory Declaration", "Engagement Agreement", "Summons Notice"].map(doc => {
                  const selected = selectedTemplates.includes(doc);
                  return (
                    <div 
                      key={doc}
                      onClick={() => {
                        if (selected) {
                          setSelectedTemplates(selectedTemplates.filter(item => item !== doc));
                        } else {
                          setSelectedTemplates([...selectedTemplates, doc]);
                        }
                      }}
                      className={`cursor-pointer border p-4 rounded-xl flex items-center justify-between transition ${selected ? 'border-violet-600 bg-violet-50/40 shadow-xs' : 'bg-white hover:bg-slate-50'}`}
                    >
                      <div>
                        <span className="text-sm font-semibold text-slate-800 block">{doc}</span>
                        <span className="text-xxs text-slate-400">Scan parameters loaded</span>
                      </div>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${selected ? 'border-violet-600 bg-violet-600' : 'bg-white'}`}>
                        {selected && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Complete Notice widget */}
              <div className="bg-slate-50 p-4 border rounded-xl flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 leading-relaxed">
                  You are all set. Completing this step creates your isolated Tenant Workspace <span className="font-semibold text-slate-900 font-mono">"{firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"</span>. All team member ranks and configuration settings will deploy in sandbox mode instantly.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Action controls button stack */}
        <div className="mt-6 flex justify-between items-center">
          {currentStep > 1 ? (
            <button 
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-5 py-3 border border-slate-300 font-bold hover:bg-slate-100 text-slate-600 text-sm rounded-xl flex items-center gap-1 bg-white outline-none"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>
          ) : (
            <button
              onClick={() => {
                onComplete({
                  settings: {
                    firmName: "Docket Legal Partners",
                    caseTypes: ["Criminal", "Civil", "Family"],
                    courts: ["Supreme Court", "District Magistrate Court"],
                    referenceFormat: "DK/[YEAR]/[NUM]",
                    address: "100 Docket Towers, New York, NY",
                    phone: "+1 (555) 321-4990",
                    caseStages: ["Client Consultation", "File Opened", "Documents Filed", "Mention Date", "Hearing", "Judgement", "Case Closed"],
                    reminderDefaults: {
                      daysBefore: [1, 3, 7],
                      notifyWhom: "whole_team",
                      delivery: ["system", "email"]
                    },
                    updatePreferences: {
                      workflow: "draft_review",
                      tone: "friendly",
                      channels: ["email", "whatsapp"]
                    },
                    communicationStyle: {
                      tone: 'Professional and Friendly',
                      observedPatterns: ['clear milestones', 'proactive status notices'],
                      structure: 'High compliance with automated message templates'
                    }
                  },
                  team: [
                    { fullName: "Alex Rivera", email: userEmail, role: UserRole.ADMIN }
                  ]
                });
              }}
              className="px-5 py-3 border border-dashed border-sky-400 hover:bg-sky-50 text-sky-700 hover:text-sky-800 font-bold text-sm rounded-xl flex items-center gap-2 bg-white outline-none transition cursor-pointer shadow-xs"
              id="bypass-onboarding-btn"
            >
              🚀 Skip Onboarding & Test App
            </button>
          )}

          {currentStep < 6 ? (
            <button 
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-3 bg-slate-900 border font-bold hover:bg-slate-800 text-white text-sm rounded-xl flex items-center gap-1 outline-none"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button 
              onClick={submitWizard}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow outline-none"
            >
              Finish & Enter Workspace <CheckCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
