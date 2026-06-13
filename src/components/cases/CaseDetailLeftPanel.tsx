import React, { useState } from 'react';
import { AlertCircle, ShieldAlert, BadgeInfo, Check, DollarSign, Clock, UserPlus, Users, HelpCircle, Star, Edit3, Trash } from 'lucide-react';
import { Case, Client } from '../../types';

interface CaseDetailLeftPanelProps {
  caseData: Case;
  client: Client;
  lawyers: Array<{ id: string; fullName: string }>;
  onUpdateCaseDetails: (updatedFields: Partial<Case>) => void;
  onDeleteCase?: () => void;
}

export default function CaseDetailLeftPanel({
  caseData, client, lawyers, onUpdateCaseDetails, onDeleteCase
}: CaseDetailLeftPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);

  // Form states
  const [court, setCourt] = useState(caseData.court || '');
  const [opposingParty, setOpposingParty] = useState(caseData.opposingParty || '');
  const [opposingCounsel, setOpposingCounsel] = useState((caseData as any).opposingCounsel || '');
  const [caseValue, setCaseValue] = useState<number>(parseInt(String((caseData as any).caseValue || 25000)) || 25050);
  const [budget, setBudget] = useState<number>(parseInt(String((caseData as any).budget || 8000)) || 8000);
  const [priority, setPriority] = useState(caseData.priority || 'Normal');
  const [currentStage, setCurrentStage] = useState(caseData.currentStage || 'Intake brief');
  const [notes, setNotes] = useState(caseData.notes || '');
  
  // High fidelity fields
  const [flags, setFlags] = useState<string[]>((caseData as any).flags || ['Awaiting Client']);
  const [isLegalHold, setIsLegalHold] = useState<boolean>((caseData as any).isLegalHold || false);
  const [riskLevel, setRiskLevel] = useState<string>((caseData as any).riskLevel || 'Medium');
  const [riskFactors, setRiskFactors] = useState<string[]>((caseData as any).riskFactors || ['Fact disputes', 'Counterclaim threats']);
  const [statuteOfLimitations, setStatuteOfLimitations] = useState<string>((caseData as any).statuteOfLimitations ? new Date((caseData as any).statuteOfLimitations).toISOString().split('T')[0] : '');

  // Observers state
  const [observers, setObservers] = useState<string[]>((caseData as any).observers || ['Observer Assistant']);
  const [newObserverName, setNewObserverName] = useState('');

  // Outcome
  const [outcome, setOutcome] = useState<string>((caseData as any).outcome || '');
  const [outcomeNotes, setOutcomeNotes] = useState<string>((caseData as any).outcomeNotes || '');
  const [closedDate, setClosedDate] = useState<string>((caseData as any).closedDate || '');

  // Compute statute limit countdown
  const getStatuteCountdownResult = () => {
    if (!statuteOfLimitations) return null;
    const limit = new Date(statuteOfLimitations);
    const today = new Date();
    const diffTime = limit.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: `LIMIT EXPIRED (${Math.abs(diffDays)} days ago)`, colorClass: 'bg-red-650 bg-red-600 text-white animate-pulse border-[#e5e7eb]' };
    if (diffDays <= 30) return { label: `${diffDays} DAYS REMAINING! (Urgently update file)`, colorClass: 'bg-rose-500 text-white animate-pulse font-black border-[#e5e7eb]' };
    if (diffDays <= 90) return { label: `${diffDays} days remaining (Amber alarm limit)`, colorClass: 'bg-amber-500 text-slate-900 font-bold border-[#e5e7eb]' };
    return { label: `${diffDays} days buffer (Green standing limit)`, colorClass: 'bg-emerald-100 text-emerald-800 border-[#e5e7eb]' };
  };

  const statuteCountdown = getStatuteCountdownResult();

  const handleSave = () => {
    const updatedPayload = {
      court,
      opposingParty,
      opposingCounsel,
      caseValue,
      budget,
      priority,
      currentStage,
      notes,
      flags,
      isLegalHold,
      riskLevel,
      riskFactors,
      statuteOfLimitations: statuteOfLimitations ? new Date(statuteOfLimitations).toISOString() : null,
      observers,
      outcome,
      outcomeNotes,
      closedDate
    };
    onUpdateCaseDetails(updatedPayload);
    setIsEditing(false);
  };

  const handleAddObserver = () => {
    if (newObserverName.trim() && !observers.includes(newObserverName.trim())) {
      const updated = [...observers, newObserverName.trim()];
      setObservers(updated);
      onUpdateCaseDetails({ observers: updated } as any);
      setNewObserverName('');
    }
  };

  const handleRemoveObserver = (name: string) => {
    const updated = observers.filter(o => o !== name);
    setObservers(updated);
    onUpdateCaseDetails({ observers: updated } as any);
  };

  const handleToggleFlag = (flagName: string) => {
    const updatedFlags = flags.includes(flagName) 
      ? flags.filter(f => f !== flagName) 
      : [...flags, flagName];
    setFlags(updatedFlags);
    onUpdateCaseDetails({ flags: updatedFlags } as any);
  };

  const inputStyle = "w-full text-xs border border-[#d1d5db] rounded-[8px] px-3.5 py-2 px-3 bg-white text-slate-800 outline-none focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#c6dbff]/50 transition-all duration-150";
  const selectStyle = "w-full text-xs border border-[#d1d5db] rounded-[8px] px-3.5 py-1.5 px-3 bg-white text-slate-800 outline-none focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#c6dbff]/50 transition-all duration-150";

  return (
    <div className="bg-white rounded-2xl border border-[#d1d5db] p-5 space-y-5 shadow-xs relative" id="case-detail-left-panel">
      {/* Legal hold active flag banner */}
      {isLegalHold && (
        <div className="p-3 bg-red-600 text-white rounded-xl flex items-center gap-2 text-xxs font-black tracking-wider uppercase justify-center select-none animate-pulse">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
          <span>Matter Locked in Legal Hold</span>
        </div>
      )}

      {/* Title */}
      <div className="flex justify-between items-center border-b-[1.5px] border-[#e5e7eb] pb-3.5">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400">Matter Identity dossier</span>
          <h4 className="text-sm font-extrabold text-slate-800">{caseData.referenceNumber}</h4>
        </div>
        <button 
          onClick={() => {
            if (isEditing) handleSave();
            else setIsEditing(true);
          }}
          className={`text-[10px] uppercase font-bold p-1 px-3 rounded-lg cursor-pointer transition-colors duration-150 ${
            isEditing 
              ? 'bg-[#3b82f6] text-white border-none hover:bg-[#2563eb]' 
              : 'bg-white text-[#374151] border border-[#d1d5db] hover:border-[#3b82f6] hover:text-[#3b82f6]'
          }`}
        >
          {isEditing ? 'Commit Updates' : 'Edit identity fields'}
        </button>
      </div>

      {/* Statute limits countdown */}
      {statuteCountdown && (
        <div className="space-y-1.5 select-none text-xxs">
          <span className="block font-bold text-slate-400 uppercase text-[9px]">Statute of Limitations constraints</span>
          <div className={`p-2.5 rounded-lg border-[1.5px] text-center ${statuteCountdown.colorClass}`}>
            {statuteCountdown.label}
          </div>
        </div>
      )}

      {/* Identity parameters layout */}
      <div className="space-y-3.5 text-xs text-slate-750 font-medium">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Assigned Court Circuit</label>
              <input type="text" value={court} onChange={e => setCourt(e.target.value)} className={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Matter Value (£)</label>
                <input type="number" value={caseValue} onChange={e => setCaseValue(parseInt(e.target.value) || 25000)} className={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Budget (£)</label>
                <input type="number" value={budget} onChange={e => setBudget(parseInt(e.target.value) || 8000)} className={inputStyle} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Statute Limit date</label>
              <input type="date" value={statuteOfLimitations} onChange={e => setStatuteOfLimitations(e.target.value)} className={inputStyle} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Respondents</label>
                <input type="text" value={opposingParty} onChange={e => setOpposingParty(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Opposing Counsel</label>
                <input type="text" value={opposingCounsel} onChange={e => setOpposingCounsel(e.target.value)} className={inputStyle} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Stage status</label>
                <select value={currentStage} onChange={e => setCurrentStage(e.target.value)} className={selectStyle}>
                  <option value="Client Consultation">Client Consultation</option>
                  <option value="Pleadings Outline">Pleadings Outline</option>
                  <option value="Pre-trial checklist">Pre-trial checklist</option>
                  <option value="Active Trial">Active Trial</option>
                  <option value="Closed">Closed / Discharged</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Priority level</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className={selectStyle}>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Litigation comments</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={inputStyle} />
            </div>

            {/* Custom Toggle for Legal Hold instead of native check */}
            <div className="p-2.5 bg-slate-50 border border-[#d1d5db] rounded-[8px] select-none">
              <label className="custom-check flex gap-2 items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={isLegalHold} 
                  onChange={(e) => setIsLegalHold(e.target.checked)} 
                />
                <span className="check-circle"></span>
                <span className="text-xs font-bold text-rose-700">Impose Legal Hold overlays</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Display static fields */}
            <div className="flex justify-between border-b-[1.5px] border-[#e5e7eb] pb-1.5 transition-colors duration-150 hover:text-[#3b82f6] group">
              <span className="text-slate-400 text-xxs font-bold uppercase transition-colors duration-150 group-hover:text-[#3b82f6]">Matter Stage:</span>
              <span className="font-extrabold text-[#374151] group-hover:text-[#3b82f6] text-xxs uppercase tracking-wider">{caseData.currentStage}</span>
            </div>

            <div className="flex justify-between border-b-[1.5px] border-[#e5e7eb] pb-1.5 transition-colors duration-150 hover:text-[#3b82f6] group">
              <span className="text-slate-400 text-xxs font-bold uppercase transition-colors duration-150 group-hover:text-[#3b82f6]">Priority Status:</span>
              <span className={`font-bold p-0.5 px-2 rounded-full text-xxs uppercase transition-colors duration-150 ${
                caseData.priority?.toLowerCase() === 'urgent' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-600 group-hover:text-[#3b82f6]'
              }`}>
                {caseData.priority || 'Normal'}
              </span>
            </div>

            <div className="flex justify-between border-b-[1.5px] border-[#e5e7eb] pb-1.5 transition-colors duration-150 hover:text-[#3b82f6] group">
              <span className="text-slate-400 text-xxs font-bold uppercase transition-colors duration-150 group-hover:text-[#3b82f6] font-mono">Case Value claim:</span>
              <span className="font-bold font-mono text-slate-800 group-hover:text-[#3b82f6]">£{caseValue.toLocaleString()}</span>
            </div>

            <div className="flex justify-between border-b-[1.5px] border-[#e5e7eb] pb-1.5 transition-colors duration-150 hover:text-[#3b82f6] group">
              <span className="text-slate-400 text-xxs font-bold uppercase transition-colors duration-150 group-hover:text-[#3b82f6] font-mono">Liability Budget:</span>
              <span className="font-bold font-mono text-slate-800 group-hover:text-[#3b82f6]">£{budget.toLocaleString()}</span>
            </div>

            <div className="flex justify-between border-b-[1.5px] border-[#e5e7eb] pb-1.5 transition-colors duration-150 hover:text-[#3b82f6] group">
              <span className="text-slate-400 text-xxs font-bold uppercase transition-colors duration-150 group-hover:text-[#3b82f6]">Presiding Court:</span>
              <span className="text-slate-650 font-bold truncate max-w-[170px] group-hover:text-[#3b82f6]">{court}</span>
            </div>

            <div className="flex justify-between border-b-[1.5px] border-[#e5e7eb] pb-1.5 transition-colors duration-150 hover:text-[#3b82f6] group">
              <span className="text-slate-400 text-xxs font-bold uppercase transition-colors duration-150 group-hover:text-[#3b82f6]">Respondents:</span>
              <span className="text-slate-650 font-bold truncate max-w-[170px] group-hover:text-[#3b82f6]">{opposingParty || 'Unregistered'}</span>
            </div>

            {opposingCounsel && (
              <div className="flex justify-between border-b-[1.5px] border-[#e5e7eb] pb-1.5 transition-colors duration-150 hover:text-[#3b82f6] group">
                <span className="text-slate-400 text-xxs font-bold uppercase transition-colors duration-150 group-hover:text-[#3b82f6]">Counsel opponent:</span>
                <span className="text-slate-650 font-medium truncate max-w-[170px] group-hover:text-[#3b82f6]">{opposingCounsel}</span>
              </div>
            )}
            
            {/* Notes display */}
            {notes && (
              <div className="p-3 bg-slate-50 border border-[#d1d5db] rounded-xl text-xxs leading-relaxed italic text-slate-550 select-text">
                "{notes}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Case outcome closure (ONLY if closed status) */}
      {(caseData.status === 'CLOSED' || currentStage === 'Closed' || outcome) && (
        <div className="p-3 bg-amber-50 border border-[#d1d5db] rounded-xl space-y-2 text-xxs">
          <span className="font-bold text-amber-900 block uppercase tracking-wider text-[9px]">LITIGATION CLOSURE ASSESSMENT</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-500 mb-0.5">Trial Outcome</label>
              <select value={outcome} onChange={e => { setOutcome(e.target.value); onUpdateCaseDetails({ outcome: e.target.value }); }} className={selectStyle}>
                <option value="">Status pending...</option>
                <option value="Won">Won Judgment</option>
                <option value="Settled">Bilateral Settlement</option>
                <option value="Withdrawn">Withdrawn file</option>
                <option value="Lost">Lost Judgment</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-500 mb-0.5">Closing Date</label>
              <input type="date" value={closedDate} onChange={e => { setClosedDate(e.target.value); onUpdateCaseDetails({ closedDate: e.target.value }); }} className={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-500">Outcome Briefing notes</label>
            <textarea value={outcomeNotes} onChange={e => { setOutcomeNotes(e.target.value); onUpdateCaseDetails({ outcomeNotes: e.target.value }); }} placeholder="Final court order outlines..." className={inputStyle + " mt-0.5"} />
          </div>
        </div>
      )}

      {/* Flags check sheets (reconstructed with custom emerald toggles) */}
      <div className="space-y-2 pt-2 border-t-[1.5px] border-[#e5e7eb] text-xxs">
        <span className="block font-bold text-slate-400 uppercase text-[9px]">Case workflow stage flags</span>
        <div className="grid grid-cols-2 gap-1.5">
          {['Awaiting Client', 'Awaiting Court', 'Awaiting Opponent', 'Media Critical'].map(flg => {
            const hasFlg = flags.includes(flg);
            return (
              <label key={flg} className="custom-check flex items-center py-1 select-none">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={hasFlg} 
                  onChange={() => handleToggleFlag(flg)} 
                />
                <span className="check-circle"></span>
                <span className={`text-[11px] transition-colors duration-150 ${
                  hasFlg ? 'font-bold text-slate-800' : 'text-slate-500 hover:text-[#3b82f6]'
                }`}>{flg}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Risk level gauge */}
      <div className="bg-slate-50 p-3.5 border border-[#d1d5db] rounded-xl space-y-3 text-xxs">
        <div className="flex justify-between items-center select-none">
          <span className="font-extrabold uppercase text-[9px] text-[#374151] hover:text-[#3b82f6] transition-colors duration-150 tracking-wider">Matter risk level gauge</span>
          <button 
            onClick={() => setRiskModalOpen(!riskModalOpen)}
            className="text-xxs text-[#374151] font-bold border border-[#d1d5db] bg-white rounded-md p-1 px-2.5 hover:border-[#3b82f6] hover:text-[#3b82f6] transition-all duration-150 cursor-pointer"
          >
            Update factor cards
          </button>
        </div>

        {riskModalOpen && (
          <div className="bg-white p-3 rounded-lg border border-[#d1d5db] space-y-2">
            <span className="block font-bold text-slate-650">Select Threat Level Rating</span>
            <div className="flex gap-1">
              {['Low', 'Medium', 'High', 'Critical'].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setRiskLevel(level);
                    onUpdateCaseDetails({ riskLevel: level } as any);
                    setRiskModalOpen(false);
                  }}
                  className={`flex-1 p-1 text-center font-bold text-[9px] rounded border transition-colors duration-150 ${
                    riskLevel === level 
                      ? 'bg-rose-100 border-rose-300 text-rose-800' 
                      : 'bg-white hover:bg-slate-100 text-[#374151] border-[#d1d5db] hover:border-[#3b82f6] hover:text-[#3b82f6]'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 select-none">
          <span className={`p-1 px-2 text-[9px] font-black rounded uppercase tracking-wider ${
            riskLevel === 'Critical' || riskLevel === 'High' 
              ? 'bg-rose-105 bg-rose-100 text-rose-700 border border-[#fca5a5]' 
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}>
            {riskLevel} Threat
          </span>
          <div className="flex flex-wrap gap-1">
            {riskFactors.map((fact, idx) => (
              <span key={idx} className="bg-white border border-[#d1d5db] text-[8px] font-semibold text-slate-500 px-1 py-0.5 rounded">
                {fact}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Observers card list */}
      <div className="space-y-3 pt-3 border-t-[1.5px] border-[#e5e7eb]">
        <span className="text-xxs font-extrabold pb-1 block uppercase text-slate-400">Matter Watchers / Observers list</span>
        <div className="flex gap-1.5">
          <input 
            type="text" 
            placeholder="Assign observer assistant name..."
            value={newObserverName}
            onChange={e => setNewObserverName(e.target.value)}
            className="w-full text-xs border border-[#d1d5db] rounded-[8px] px-3 py-2 bg-slate-50 text-slate-800 outline-none focus:border-[#3b82f6] focus:ring-[3px] focus:ring-[#c6dbff]/50 transition-all duration-150"
            onKeyDown={e => e.key === 'Enter' && handleAddObserver()}
          />
          <button 
            type="button"
            onClick={handleAddObserver}
            className="bg-[#3b82f6] text-white font-bold text-xxs border-none rounded-[8px] px-3.5 hover:bg-[#2563eb] cursor-pointer transition-all duration-150 outline-none flex items-center"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-1 mt-1">
          {observers.map((obs, idx) => (
            <span key={idx} className="text-[10px] bg-white text-[#374151] border border-[#d1d5db] hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors duration-150 p-1 px-2.5 rounded-lg font-bold flex items-center gap-1.5 select-none">
              {obs}
              <button onClick={() => handleRemoveObserver(obs)} className="text-rose-500 font-extrabold text-[12px] hover:text-rose-700 cursor-pointer ml-1">&times;</button>
            </span>
          ))}
        </div>
      </div>

      {/* Deletion protection overlays - styled as DESTRUCTIVE button */}
      {onDeleteCase && !isLegalHold && (
        <button
          type="button"
          onClick={() => {
            if (confirm("Are you dead sure you wish to delete and purge this entire matter history files? This operation is IRREVERSIBLE.")) {
              onDeleteCase();
            }
          }}
          className="w-full py-2.5 bg-white text-[#ef4444] border border-[#fca5a5] hover:bg-[#fef2f2] font-semibold text-xs rounded-[8px] cursor-pointer transition-all duration-150 min-h-[44px]"
        >
          Archive or Purge Matter Folder
        </button>
      )}
    </div>
  );
}
