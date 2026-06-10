import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Briefcase, Plus, Copy, CheckCircle2 } from 'lucide-react';
import { Client, Case, CompanySettings } from '../../types';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  cases: Case[];
  lawyers: { id: string; fullName: string }[];
  onCaseCreated: (newCasePayload: any) => void;
  settings: CompanySettings;
}

export default function NewCaseModal({ isOpen, onClose, clients, cases, lawyers, onCaseCreated, settings }: NewCaseModalProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isNewClientSlideOpen, setIsNewClientSlideOpen] = useState(false);

  // Quick Client Creation inputs
  const [cliName, setCliName] = useState('');
  const [cliPhone, setCliPhone] = useState('');
  const [cliEmail, setCliEmail] = useState('');

  // Matter parameters
  const [caseType, setCaseType] = useState('Civil');
  const [priority, setPriority] = useState('normal');
  const [caseValue, setCaseValue] = useState<number>(25000);
  const [budget, setBudget] = useState<number>(8000);
  const [refNum, setRefNum] = useState('');
  const [court, setCourt] = useState('High Court of London');
  const [opposing, setOpposing] = useState('');
  const [opposingCounsel, setOpposingCounsel] = useState('');
  const [lawyerId, setLawyerId] = useState('');
  const [stage, setStage] = useState('Client Consultation');
  const [notes, setNotes] = useState('');
  const [isLegalHold, setIsLegalHold] = useState(false);
  const [statuteDate, setStatuteDate] = useState('');
  
  // Custom states
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [inputTag, setInputTag] = useState('');
  const [duplicateFromCaseId, setDuplicateFromCaseId] = useState('');

  // Deadline templates checks
  const [deadlineSchedule, setDeadlineSchedule] = useState<{ label: string; offsetDays: number; checked: boolean }[]>([]);

  // Auto-generate reference number
  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear();
      const code = caseType === 'Civil' ? 'CIV' : caseType === 'Criminal' ? 'CRM' : caseType === 'Family' ? 'FAM' : 'TRN';
      // Find matching sequence
      const matched = cases.filter(c => c.caseType === caseType);
      const sequence = String(matched.length + 1).padStart(3, '0');
      setRefNum(`DK/${code}/${year}/${sequence}`);

      // Set standard deadlines templates
      const standardDeadlines = [
        { label: 'Initial appearance & briefing file', offsetDays: 7, checked: true },
        { label: 'Submit defense particulars to opposing counsel', offsetDays: 30, checked: true },
        { label: 'Evidence list disclosures wait limit', offsetDays: 60, checked: false }
      ];
      setDeadlineSchedule(standardDeadlines);
    }
  }, [isOpen, caseType]);

  if (!isOpen) return null;

  // Handle Duplication From prior matter
  const handleSelectTemplate = (cId: string) => {
    if (!cId) return;
    const target = cases.find(c => c.id === cId);
    if (target) {
      setDuplicateFromCaseId(cId);
      setCaseType(target.caseType || 'Civil');
      setCourt(target.court || 'High Court of London');
      setOpposing(target.opposingParty || '');
      setNotes(`Duplicated sequence template from matter ${target.referenceNumber}. ` + (target.notes || ''));
      setCaseValue(parseInt(String((target as any).caseValue || 25000)) || 25000);
      setBudget(parseInt(String((target as any).budget || 8000)) || 8000);
    }
  };

  const handleCreateQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliName) return;
    
    // Simulate inline client save
    const quickId = 'cli-quick-' + Date.now();
    const newQuietCli: Client = {
      id: quickId,
      companyId: settings.companyId || 'company-demo',
      fullName: cliName,
      phone: cliPhone,
      email: cliEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    clients.unshift(newQuietCli); // Add locally
    setSelectedClientId(quickId);
    setIsNewClientSlideOpen(false);
    // Reset quick fields
    setCliName('');
    setCliPhone('');
    setCliEmail('');
  };

  const handleAddTag = () => {
    if (inputTag.trim() && !selectedTags.includes(inputTag.trim())) {
      setSelectedTags([...selectedTags, inputTag.trim()]);
      setInputTag('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Please assign an active Client to proceed.");
      return;
    }

    const compiledPayload = {
      clientId: selectedClientId,
      referenceNumber: refNum || `DK/CIV/2026/001`,
      caseType,
      priority,
      caseValue,
      budget,
      court,
      opposingParty: opposing,
      opposingCounsel,
      assignedLawyerId: lawyerId || lawyers[0]?.id,
      currentStage: stage,
      notes,
      isLegalHold,
      statuteOfLimitations: statuteDate ? new Date(statuteDate).toISOString() : null,
      tags: selectedTags,
      deadlines: deadlineSchedule
        .filter(d => d.checked)
        .map(d => {
          const due = new Date();
          due.setDate(due.getDate() + d.offsetDays);
          return {
            id: 'dl-init-' + Math.random(),
            title: d.label,
            dueDate: due.toISOString(),
            isResolved: false
          };
        })
    };

    onCaseCreated(compiledPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl max-w-3xl w-full border p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">New Matter Registration</h3>
              <p className="text-[10px] text-slate-400">Initialize a legal file folder and automatically apply workflow standards.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scroll Body */}
        <div className="flex-1 overflow-y-auto mb-4 grid grid-cols-1 md:grid-cols-12 gap-5 pr-1 select-none">
          
          {/* Left panel (Client Assignment & templates) */}
          <div className="md:col-span-5 space-y-4 border-r pr-4">
            
            {/* Quick Templates picker */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Duplicate From previous Matter</label>
              <select
                value={duplicateFromCaseId}
                onChange={e => handleSelectTemplate(e.target.value)}
                className="w-full text-xxs p-2 bg-slate-50 border rounded-lg"
              >
                <option value="">Select past case (to use as template)...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.referenceNumber} - {(c as any).client?.fullName}</option>
                ))}
              </select>
            </div>

            {/* Client selector panel */}
            <div className="space-y-2 pt-2 border-t">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Counsel Client Assignment</span>
              
              {isNewClientSlideOpen ? (
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border text-xxs">
                  <div className="flex justify-between items-center text-[9px] font-extrabold text-indigo-600">
                    <span>CREATE PROFILE INSTANTLY</span>
                    <button type="button" onClick={() => setIsNewClientSlideOpen(false)} className="hover:underline text-slate-400">Cancel</button>
                  </div>
                  <input type="text" placeholder="Full Client Name *" required value={cliName} onChange={e => setCliName(e.target.value)} className="w-full p-2 border bg-white rounded" />
                  <input type="text" placeholder="Phone Coordinates" value={cliPhone} onChange={e => setCliPhone(e.target.value)} className="w-full p-2 border bg-white rounded" />
                  <input type="email" placeholder="Primary Email Address" value={cliEmail} onChange={e => setCliEmail(e.target.value)} className="w-full p-2 border bg-white rounded" />
                  <button type="button" onClick={handleCreateQuickClient} className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded">Add Profile & Select</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button type="button" onClick={() => setIsNewClientSlideOpen(true)} className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 border text-slate-700 font-bold text-xxs rounded-xl">
                    + Quick intake Client Profile
                  </button>
                  <div className="max-h-[140px] overflow-y-auto space-y-1 p-1 bg-slate-50 border rounded-xl">
                    {clients.map(cli => (
                      <div 
                        key={cli.id}
                        onClick={() => setSelectedClientId(cli.id)}
                        className={`p-2 rounded-lg border text-xxs flex justify-between items-center cursor-pointer select-none ${selectedClientId === cli.id ? 'border-indigo-400 bg-indigo-50/20' : 'bg-white'}`}
                      >
                        <span className="font-bold text-slate-700">{cli.fullName}</span>
                        {selectedClientId === cli.id && <Check className="h-3 w-3 text-indigo-610" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedClientId && (
                <div className="bg-emerald-50 text-emerald-800 border p-3 rounded-xl text-xxs">
                  <span className="font-bold uppercase tracking-widest block text-[9px]">LOCKED BRIEF CLIENT:</span>
                  <span className="block font-semibold mt-0.5 text-slate-800">{clients.find(c => c.id === selectedClientId)?.fullName}</span>
                </div>
              )}
            </div>

            {/* Standard deadlines templates apply */}
            <div className="space-y-2 pt-2 border-t">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Automatic Deadline checklists</span>
              <div className="space-y-1.5 max-h-[130px] overflow-y-auto p-1 text-[10px] font-semibold text-slate-600">
                {deadlineSchedule.map((dl, idx) => (
                  <label key={idx} className="flex items-start gap-2 select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-650 mt-0.5" 
                      checked={dl.checked}
                      onChange={e => {
                        const safety = [...deadlineSchedule];
                        safety[idx].checked = e.target.checked;
                        setDeadlineSchedule(safety);
                      }}
                    />
                    <span>{dl.label} (+{dl.offsetDays} days)</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Right panel (Filing configurations fields) */}
          <div className="md:col-span-7 space-y-3 font-medium text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Brief matter configuration details</span>
            
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] text-slate-505 font-bold mb-0.5">Reference custom ID</label>
                <input type="text" value={refNum} onChange={e => setRefNum(e.target.value)} className="w-full text-xxs p-2 border rounded-lg outline-none font-mono font-bold uppercase" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-505 font-bold mb-0.5">Specialty / Matter category</label>
                <select value={caseType} onChange={e => setCaseType(e.target.value)} className="w-full text-xs p-1.5 border rounded-lg outline-none">
                  <option value="Civil">Civil Claims</option>
                  <option value="Criminal">Criminal Defense</option>
                  <option value="Family">Family Mediation</option>
                  <option value="Transactional">Corporate M&A</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-505 font-bold mb-0.5">Priority rating</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full text-xs p-1.5 border rounded-lg outline-none">
                  <option value="low">Low Level</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Level</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-505 font-bold mb-0.5">Assigned Advocate Counsel</label>
                <select value={lawyerId} onChange={e => setLawyerId(e.target.value)} className="w-full text-xs p-1.5 border rounded-lg outline-none font-bold">
                  <option value="">Designate team lead advocate...</option>
                  {lawyers.map(l => (
                    <option key={l.id} value={l.id}>{l.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-510 font-bold mb-0.5">Matter value (£)</label>
                <input type="number" value={caseValue || ''} onChange={e => setCaseValue(parseInt(e.target.value) || 25000)} className="w-full text-xxs p-2 border rounded-lg font-bold font-mono" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-510 font-bold mb-0.5">Threshold budget allocation (£)</label>
                <input type="number" value={budget || ''} onChange={e => setBudget(parseInt(e.target.value) || 8000)} className="w-full text-xxs p-2 border rounded-lg font-bold font-mono" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-510 font-bold mb-0.5">Presiding Court/Circuit</label>
                <input type="text" value={court} onChange={e => setCourt(e.target.value)} className="w-full text-xxs p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-510 font-bold mb-0.5">Statute of Limitations date</label>
                <input type="date" value={statuteDate} onChange={e => setStatuteDate(e.target.value)} className="w-full text-xxs p-1.5 border rounded-lg font-bold text-rose-700" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-510 font-bold mb-0.5">Respondents / Opposing Party</label>
                <input type="text" value={opposing} onChange={e => setOpposing(e.target.value)} placeholder="Opponent primary name" className="w-full text-xxs p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-510 font-bold mb-0.5">Opposing Counsel</label>
                <input type="text" value={opposingCounsel} onChange={e => setOpposingCounsel(e.target.value)} placeholder="Opposing attorney / law firm" className="w-full text-xxs p-2 border rounded-lg" />
              </div>
            </div>

            {/* Tags adder */}
            <div className="space-y-1 pt-1.5 border-t">
              <label className="block text-[10px] text-slate-510 font-bold">Matter Tags / Quick filter tags</label>
              <div className="flex gap-2">
                <input type="text" placeholder="E.g. Breach, Appeal" value={inputTag} onChange={e => setInputTag(e.target.value)} className="text-xxs p-2 bg-slate-50 border rounded-lg flex-1 outline-none" />
                <button type="button" onClick={handleAddTag} className="text-xxs p-2 bg-slate-100 hover:bg-slate-200 border font-bold rounded-lg px-4">Add tag</button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedTags.map((tg, i) => (
                  <span key={i} className="text-[9px] bg-slate-100 font-bold text-slate-600 p-0.5 px-2 rounded-lg flex items-center gap-1">
                    #{tg}
                    <button type="button" onClick={() => setSelectedTags(selectedTags.filter((_, idx) => idx !== i))} className="text-rose-500 font-bold hover:text-rose-700">x</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Textarea info */}
            <div>
              <label className="block text-[10px] text-slate-520 font-bold mb-0.5">Litigation Brief general comments</label>
              <textarea 
                rows={3} 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Factual dispute summary..." 
                className="w-full text-xxs p-2 border rounded-lg"
              />
            </div>

            {/* Legal hold checkbox */}
            <div className="p-3 bg-slate-50 border rounded-xl">
              <label className="flex items-center gap-2 text-xxs font-semibold text-slate-700 select-none cursor-pointer">
                <input type="checkbox" checked={isLegalHold} onChange={e => setIsLegalHold(e.target.checked)} className="rounded text-indigo-650" />
                <span className="font-extrabold text-rose-700 uppercase">Impose Case Legal Hold</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-1">Legal Hold prevents subsequent deletions or unauthorized modification logs.</p>
            </div>

          </div>

        </div>

        {/* Footer controls */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <button 
            type="button" 
            onClick={onClose}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold rounded-xl"
          >
            Discard
          </button>
          
          <button
            type="submit"
            className="p-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer transition min-h-[44px]"
          >
            Create Matter File &rarr;
          </button>
        </div>

      </form>
    </div>
  );
}
