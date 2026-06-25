import React, { useState, useRef } from 'react';
import { X, Check, Loader2, AlertTriangle, Users, Stars, MessageSquare, Clipboard, Star, Upload, FileText, Plus, Trash2, ChevronDown } from 'lucide-react';
import { Client } from '../../types';
import CustomSelect from '../CustomSelect';

interface AddClientModalProps {
  onClose: () => void;
  onSave: (clientData: any) => Promise<void>;
  existingClients: Client[];
}

export default function ClientModals({
  onClose,
  onSave,
  existingClients
}: AddClientModalProps) {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    idNumber: '',
    address: '',
    occupation: '',
    organisation: '',
    notes: '',
    clientCategory: 'individual' as any,
    riskRating: 'low' as any,
    clientSource: 'website'
  });

  // Duplicate Check popup state
  const [duplicateWarning, setDuplicateWarning] = useState<null | { existing: Client; field: string }>(null);

  // Custom Fields States
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [aiFieldsLoading, setAiFieldsLoading] = useState(false);
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Array<{ label: string; defaultValue: string }>>([]);

  const handleAddCustomField = (label: string, value: string) => {
    if (!label.trim()) return;
    setCustomFields(prev => ({
      ...prev,
      [label.trim()]: value
    }));
  };

  const handleRemoveCustomField = (label: string) => {
    setCustomFields(prev => {
      const copy = { ...prev };
      delete copy[label];
      return copy;
    });
  };

  const fetchAiSuggestions = async () => {
    setAiFieldsLoading(true);
    try {
      const res = await fetch('/api/ai/suggest-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          notes: formData.notes,
          occupation: formData.occupation,
          clientCategory: formData.clientCategory
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.fields)) {
          setAiSuggestedFields(data.fields);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiFieldsLoading(false);
    }
  };

  // AI Extraction Simulator state
  const [aiExtracting, setAiExtracting] = useState(false);
  const [scannedConfidence, setScannedConfidence] = useState<null | number>(null);

  // File Upload and Drag-n-Drop state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const parseFileNameToName = (fileName: string) => {
    // Strip extension
    const base = fileName.split('.').slice(0, -1).join('.') || fileName;
    // Replace underscores, dashes, dots, and numbers with spaces
    let clean = base.replace(/[_\-\.\d]+/g, ' ');
    // Title case each word
    clean = clean.split(' ').map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ').replace(/\s+/g, ' ').trim();
    
    if (clean.length < 3) {
      return 'Marcus Vance III';
    }
    return clean;
  };

  const processSelectedFile = (file: File) => {
    setUploadedFile(file);
    setAiExtracting(true);
    setScannedConfidence(null);
    
    // Simulate smart AI Scanning and Parsing
    setTimeout(() => {
      setAiExtracting(false);
      setScannedConfidence(Math.floor(Math.random() * 8) + 91); // 91% to 98%
      
      const parsedName = parseFileNameToName(file.name);
      const nameParts = parsedName.split(' ');
      const firstName = nameParts[0] || 'Client';
      const lastName = nameParts.slice(1).join(' ') || 'Consulting';
      const emailDomain = 'chambers-alliance.co.uk';
      const dynamicEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@${emailDomain}`;
      
      setFormData({
        fullName: parsedName,
        phone: '+44 7911 ' + Math.floor(100000 + Math.random() * 900000),
        email: dynamicEmail,
        idNumber: `PASSPORT-${file.name.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}B`,
        address: '10 Downing St, London, United Kingdom',
        occupation: 'General Counsel Chief Executive',
        organisation: `${lastName} Holdings LLC`,
        notes: `Simulated AI auto-extraction from passport scan of computer file "${file.name}" (${(file.size / 1024).toFixed(1)} KB) successfully uploaded and parsed.`,
        clientCategory: 'corporate',
        riskRating: 'medium',
        clientSource: 'referral'
      });
    }, 1800);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const runAiExtractionSim = () => {
    setAiExtracting(true);
    setTimeout(() => {
      setAiExtracting(false);
      setScannedConfidence(94);
      setFormData({
        fullName: 'Hon. Winston Churchill II',
        phone: '+44 7911 123456',
        email: 'winston@chambers-alliance.co.uk',
        idNumber: 'PASSPORT-UK-8821B',
        address: '10 Downing St, London, United Kingdom',
        occupation: 'General Counsel Chief Executive',
        organisation: 'Chambers Alliance Corp',
        notes: 'Extracted automatically from uploaded passport photo ID document.',
        clientCategory: 'corporate',
        riskRating: 'medium',
        clientSource: 'referral'
      });
    }, 1800);
  };

  const handleManualSave = async () => {
    if (!formData.fullName.trim()) return;

    // Check pre-existing duplications (E.g. email or phone)
    const duplicate = existingClients.find(
      c => (formData.email && c.email?.toLowerCase() === formData.email.toLowerCase()) || 
           (formData.phone && c.phone === formData.phone)
    );

    if (duplicate && duplicateWarning === null) {
      setDuplicateWarning({
        existing: duplicate,
        field: formData.email && duplicate.email === formData.email ? 'Email address similarity' : 'Phone matching signature'
      });
      return; 
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        customFieldValues: customFields,
        onboardingComplete: false,
        onboardingChecklist: {},
        kycStatus: 'not_started',
        outstandingBalance: 0,
        invoices: [],
        calls: [],
        tasks: [],
        meetings: [],
        consents: []
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleMergeRecords = async () => {
    if (!duplicateWarning) return;
    setSaving(true);
    try {
      // Merge values into pre-existing
      await fetch(`/api/firm/${duplicateWarning.existing.companyId}/clients/${duplicateWarning.existing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone || duplicateWarning.existing.phone,
          email: formData.email || duplicateWarning.existing.email,
          address: formData.address || duplicateWarning.existing.address,
          organisation: formData.organisation || duplicateWarning.existing.organisation,
          notes: `${duplicateWarning.existing.notes || ''}\nMerged records with incoming duplicate entry.`
        })
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:pl-64">
      <div className="bg-white rounded-[24px] w-full max-w-2xl border-2 border-slate-200 shadow-2xl overflow-hidden animate-scale-up text-center flex flex-col">
        
        {/* Header toolbar - Centered content */}
        <div className="flex flex-col items-center justify-center p-4 sm:p-6 border-b-2 border-slate-200 bg-slate-50/50 relative">
          <button onClick={onClose} className="absolute right-4 top-4 p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors" title="Close">
            <X className="h-4 w-4" />
          </button>
          <div className="space-y-1">
            <h3 className="text-lg font-normal text-slate-800">Configure Relationship Records Intake</h3>
            <p className="text-xs text-slate-400">Submit permanent credentials and run automated conflict checks on registration.</p>
          </div>
        </div>

        {/* Option Modes buttons selector with 2px borders */}
        <div className="flex border-b-2 border-slate-200">
          <button
            onClick={() => { setMode('manual'); setDuplicateWarning(null); }}
            className={`flex-1 py-3 text-xs uppercase tracking-wider border-b-2 transition-all duration-200 font-bold ${
              mode === 'manual' 
                ? 'border-sky-500 text-sky-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            Manual intake Entry
          </button>
          <button
            onClick={() => { setMode('ai'); setDuplicateWarning(null); }}
            className={`flex-1 py-3 text-xs uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition-all duration-200 font-bold ${
              mode === 'ai' 
                ? 'border-sky-500 text-sky-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Stars className="h-4 w-4 text-amber-500 animate-pulse" /> Document AI extraction
          </button>
        </div>

        {/* Modal content viewport */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto text-center flex flex-col items-center">

          {/* DUPLICATE WARNING INTERACTION BLOCK OVERLAY */}
          {duplicateWarning && (
            <div className="w-full p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl space-y-4 text-xs text-center flex flex-col items-center">
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-500 animate-bounce" />
                <div>
                  <h4 className="font-normal text-amber-900 text-sm">Warning: Possible Duplicate Record Detected</h4>
                  <p className="text-[11px] text-amber-700 mt-1">
                    A matching profile matches this incoming signature by {duplicateWarning.field}.
                  </p>
                </div>
              </div>

              {/* Side-by-side Merging details comparisons */}
              <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-xl border-2 border-amber-150 w-full text-center">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-slate-400 font-normal">Pre-existing registry record</p>
                  <p className="font-normal text-slate-800 text-sm">{duplicateWarning.existing.fullName}</p>
                  <p className="text-[11px] font-mono text-slate-500">{duplicateWarning.existing.phone || 'No phone'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{duplicateWarning.existing.email || 'No email'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-slate-400 font-normal">Incoming register entry</p>
                  <p className="font-normal text-slate-800 text-sm">{formData.fullName}</p>
                  <p className="text-[11px] font-mono text-slate-500">{formData.phone || 'No phone'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{formData.email || 'No email'}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-center flex-wrap pt-2">
                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="px-4 py-2 bg-white border-2 border-slate-200 hover:border-slate-400 rounded-xl text-[11px] font-normal text-slate-600 transition"
                >
                  Edit details manually
                </button>
                <button
                  onClick={handleMergeRecords}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] uppercase tracking-wider font-normal transition"
                >
                  Merge into existing record
                </button>
                <button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await onSave({ ...formData, customFieldValues: customFields });
                      onClose();
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-[11px] font-bold transition"
                >
                  Save anyway
                </button>
              </div>
            </div>
          )}

          {/* AI EXTRACTION VIEWPORT SECTION */}
          {mode === 'ai' && !duplicateWarning && (
            <div className="w-full bg-sky-50/20 border border-sky-200 p-5 rounded-2xl space-y-4">
              <div 
                className={`text-center py-6 border border-dashed rounded-xl transition duration-150 cursor-pointer ${
                  dragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-350'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Stars className="h-8 w-8 text-sky-500 mx-auto animate-bounce mb-2" />
                <p className="text-xs font-semibold text-slate-800 mt-2">Upload Client Passport, ID Scan or PDF Contract</p>
                <p className="text-[10px] text-slate-400">Drag & drop your files/documents here, or click to choose from your PC</p>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf"
                />

                <div className="mt-4 flex flex-col items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={aiExtracting}
                    className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition duration-150 cursor-pointer min-h-[44px]"
                  >
                    {aiExtracting ? 'AI Scanning fields...' : 'Select File from Computer'}
                  </button>

                  <button
                    type="button"
                    onClick={runAiExtractionSim}
                    disabled={aiExtracting}
                    className="text-[10px] text-slate-450 hover:text-sky-600 underline cursor-pointer mt-1 font-bold transition"
                  >
                    Or use Passport Demo scan template
                  </button>
                  
                  {uploadedFile && (
                    <div className="flex items-center gap-1.5 text-xs text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg font-mono border border-sky-200 mt-2 animate-fade-in">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                      <span className="max-w-[240px] truncate">{uploadedFile.name}</span>
                      <span className="opacity-65 text-[10px]">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>
              </div>

              {scannedConfidence && (
                <div className="bg-emerald-50 text-emerald-800 border-2 border-emerald-100 p-2.5 text-xs rounded-xl flex justify-between items-center px-4 font-normal animate-fade-in">
                  <span>✔ AI extraction complete: matching details populated below</span>
                  <span className="text-[10px] bg-emerald-600 text-white rounded px-2 py-0.5">Confidence: {scannedConfidence}%</span>
                </div>
              )}
            </div>
          )}

          {/* MAIN FIELD ENTRY FORMS */}
          {!duplicateWarning && (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in text-center justify-items-center">
              <div className="md:col-span-2 space-y-2 w-full flex flex-col items-center">
                <label className="text-[11px] uppercase tracking-widest text-slate-805 font-extrabold block">Practice Relationship category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                  {['individual', 'corporate', 'government', 'ngo'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, clientCategory: cat as any }))}
                      className={`py-2 px-1.5 text-[9.5px] sm:text-[10px] uppercase tracking-tight sm:tracking-wider text-center leading-tight whitespace-normal break-words rounded-xl border transition-all duration-200 cursor-pointer min-h-[44px] ${
                        formData.clientCategory === cat 
                          ? 'bg-sky-500 text-white border-sky-600 shadow-sm font-bold' 
                          : 'bg-slate-50 text-slate-800 font-bold hover:text-slate-900 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { k: 'fullName', l: 'Full Registered client Name *', p: 'e.g. Honorable Marcus Vance III' },
                { k: 'idNumber', l: 'National Identity / Registration number Code', p: 'e.g. ID-8820B' },
                { k: 'phone', l: 'Telephone Node', p: 'e.g. +1 555-019-2810' },
                { k: 'email', l: 'Client Email address node', p: 'e.g. consulting@chambersalliance.co.uk' },
                { k: 'occupation', l: 'Practice Occupation / Entity Segment', p: 'e.g. Managing Partner, Corporate Exec' },
                { k: 'organisation', l: 'Parent Corporation / Affiliate Organization', p: 'e.g. Chambers Alliance Group' }
              ].map(fld => (
                <div key={fld.k} className="space-y-1 w-full flex flex-col items-center text-center">
                  <label className="text-[10px] uppercase tracking-widest text-slate-805 font-extrabold block">{fld.l}</label>
                  <input
                    type="text"
                    placeholder={fld.p}
                    value={(formData as any)[fld.k]}
                    onChange={e => setFormData(prev => ({ ...prev, [fld.k]: e.target.value }))}
                    className="w-full text-center text-xs p-2.5 border-2 border-slate-300 rounded-xl bg-slate-50 focus:bg-white outline-none hover:border-slate-450 transition-all duration-200 text-slate-950 font-semibold"
                  />
                </div>
              ))}

              <div className="space-y-1 w-full flex flex-col items-center">
                <label className="text-[10px] uppercase tracking-widest text-slate-850 font-extrabold block">Relationship Acquisition Source</label>
                <div className="relative w-full">
                  <select
                    value={formData.clientSource}
                    onChange={e => setFormData(prev => ({ ...prev, clientSource: e.target.value }))}
                    className="w-full text-center text-xs p-3 border-2 border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/50 hover:border-slate-400 outline-none transition-all duration-200 text-slate-900 font-semibold appearance-none cursor-pointer"
                  >
                    <option value="direct_walkin">Direct Office Walk-in</option>
                    <option value="website">Firm Online Portal Website</option>
                    <option value="referral">Internal Counsel Referral Chain</option>
                    <option value="social_media">Social Networks Advertisements</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1 w-full flex flex-col items-center">
                <label className="text-[10px] uppercase tracking-widest text-slate-850 font-extrabold block">Risk rating assessment factor</label>
                <div className="relative w-full">
                  <select
                    value={formData.riskRating}
                    onChange={e => setFormData(prev => ({ ...prev, riskRating: e.target.value as any }))}
                    className="w-full text-center text-xs p-3 border-2 border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/50 hover:border-slate-400 outline-none transition-all duration-200 text-slate-900 font-semibold appearance-none cursor-pointer"
                  >
                    <option value="low">Low Risk Threshold</option>
                    <option value="medium">Medium Practice Hold</option>
                    <option value="high">High Diligence Warning Needed</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1 w-full flex flex-col items-center">
                <label className="text-[10px] uppercase tracking-widest text-slate-850 font-extrabold block">Physical address registration</label>
                <input
                  type="text"
                  placeholder="e.g. 15 Steno Chambers, Royal Way, London"
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full text-center text-xs p-2.5 border-2 border-slate-300 rounded-xl bg-slate-50 focus:bg-white outline-none hover:border-slate-455 transition-all duration-200 text-slate-950 font-semibold"
                />
              </div>

              <div className="md:col-span-2 space-y-1 w-full flex flex-col items-center">
                <label className="text-[10px] uppercase tracking-widest text-slate-855 font-extrabold block">Internal intake notes comments</label>
                <textarea
                  rows={2}
                  placeholder="Notes from initial consulting phone session..."
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full text-center text-xs border-2 border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white outline-none hover:border-slate-455 transition-all duration-200 resize-none font-sans text-slate-950 font-semibold"
                />
              </div>

              {/* CUSTOM FIELDS SEGMENT */}
              <div className="md:col-span-2 border-t-2 border-slate-200 pt-5 mt-3 w-full flex flex-col items-center">
                <div className="flex items-center gap-1.5 justify-center mb-1">
                  <Stars className="h-4.5 w-4.5 text-sky-500" />
                  <h4 className="text-xs font-black uppercase text-slate-950 tracking-widest">Custom Intake Registry Fields</h4>
                </div>
                <p className="text-[11px] text-slate-900 mb-4 text-center font-bold max-w-lg">
                  Submit specific case parameters or let Gemini AI analyze your onboarding notes background to design optimized custom fields immediately.
                </p>

                {/* AI field suggestions card */}
                <div className="flex flex-col items-center gap-3 w-full max-w-lg mb-5 bg-slate-100/70 p-4 border-2 border-slate-200 rounded-2xl shadow-xxs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-950 text-center sm:text-left">AI Field Co-Pilot Suggestions</span>
                    <button
                      type="button"
                      onClick={fetchAiSuggestions}
                      disabled={aiFieldsLoading}
                      className="text-[11px] bg-slate-950 hover:bg-slate-900 text-white font-extrabold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer w-full sm:w-auto min-h-[38px]"
                    >
                      {aiFieldsLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-sky-400" />
                          Analyzing notes...
                        </>
                      ) : (
                        <>
                          <Stars className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                          Generatively Suggest Fields
                        </>
                      )}
                    </button>
                  </div>

                  {aiSuggestedFields.length > 0 && (
                    <div className="w-full text-left space-y-2 mt-2 border-t border-slate-200 pt-3 animate-fade-in">
                      <p className="text-[10px] font-black text-slate-950 uppercase tracking-wide">Suggested Fields (Click + to include):</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {aiSuggestedFields.map((field) => {
                          const isAlreadyAdded = Object.keys(customFields).includes(field.label);
                          return (
                            <button
                              key={field.label}
                              type="button"
                              onClick={() => handleAddCustomField(field.label, field.defaultValue)}
                              disabled={isAlreadyAdded}
                              className={`text-[10px] px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-all duration-150 ${
                                isAlreadyAdded
                                  ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                                  : 'bg-white border-sky-200 text-sky-500 hover:bg-sky-50 hover:border-sky-500 font-extrabold shadow-xxs'
                              }`}
                            >
                              <span>+</span>
                              <span className="font-extrabold">{field.label}</span>
                              <span className="opacity-75 text-[9px]">({field.defaultValue})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual custom field input block */}
                <div className="flex gap-3 w-full max-w-lg items-end mb-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-950 font-extrabold block text-left">New Field Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Spouse Name, Case Date"
                      value={newFieldName}
                      onChange={e => setNewFieldName(e.target.value)}
                      className="w-full text-xs p-2.5 border-2 border-slate-300 rounded-xl bg-white focus:outline-none text-slate-950 font-semibold"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-950 font-extrabold block text-left">Initial Value</label>
                    <input
                      type="text"
                      placeholder="e.g. Diana Prince, 2026-06-09"
                      value={newFieldValue}
                      onChange={e => setNewFieldValue(e.target.value)}
                      className="w-full text-xs p-2.5 border-2 border-slate-300 rounded-xl bg-white focus:outline-none text-slate-950 font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newFieldName.trim()) return;
                      handleAddCustomField(newFieldName, newFieldValue);
                      setNewFieldName('');
                      setNewFieldValue('');
                    }}
                    className="p-2.5 px-4 bg-slate-950 hover:bg-black text-white rounded-xl text-xs font-black min-h-[44px] border-2 border-transparent hover:border-slate-700 cursor-pointer"
                  >
                    Add Field
                  </button>
                </div>

                {/* Render added custom fields list */}
                {Object.keys(customFields).length > 0 && (
                  <div className="w-full max-w-lg space-y-2 text-left bg-sky-50/20 p-4 border-2 border-[#1E293B]/20 rounded-2xl animate-fade-in shadow-xxs">
                    <p className="text-[10px] font-black uppercase text-slate-950 tracking-wider">Active Custom Fields Register</p>
                    <div className="space-y-1.5">
                      {Object.entries(customFields).map(([lbl, val]) => (
                        <div key={lbl} className="flex justify-between items-center bg-white p-2.5 border-2 border-slate-200 rounded-xl text-xs shadow-xxs">
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold text-slate-950 block truncate uppercase text-[9px] tracking-wider">{lbl}</span>
                            <span className="font-extrabold text-slate-900 block truncate pr-2 mt-0.5">{val || <span className="text-slate-300 italic font-medium">No initial value</span>}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomField(lbl)}
                            className="text-red-600 hover:text-red-800 text-xs font-black p-1.5 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer actions with 2px borders */}
        <div className="p-4 sm:p-6 border-t-2 border-slate-200 bg-slate-50/50 flex gap-2 justify-center">
          <button
            onClick={onClose}
            className="text-xs font-normal text-slate-500 hover:bg-slate-200/50 px-5 py-2.5 rounded-xl border-2 border-transparent hover:border-slate-300 transition-all duration-200 cursor-pointer min-h-[44px]"
          >
            Discard Form
          </button>
          
          {!duplicateWarning && (
            <button
              onClick={handleManualSave}
              disabled={saving || !formData.fullName.trim()}
              className="text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white px-6 py-2.5 rounded-xl transition duration-150 disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save and Register
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
