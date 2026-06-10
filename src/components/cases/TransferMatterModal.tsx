import React, { useState } from 'react';
import { X, Check, Loader2, ArrowLeftRight, UserCheck, AlertCircle, FileText } from 'lucide-react';
import { Case } from '../../types';

interface Lawyer {
  id: string;
  fullName: string;
  avatarUrl?: string;
  activeMattersCount?: number; // Simulated capacity load
}

interface TransferMatterModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
  lawyers: Lawyer[];
  onTransferCompleted: (newLawyerId: string, handoverNoteText: string) => void;
}

export default function TransferMatterModal({ isOpen, onClose, caseData, lawyers, onTransferCompleted }: TransferMatterModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Selected lawyer & workload simulation
  const [selectedLawyerId, setSelectedLawyerId] = useState('');
  
  // Transition properties
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Structured Handover note fields
  const [statusSummary, setStatusSummary] = useState('');
  const [pendingActions, setPendingActions] = useState('');
  const [keyRelationships, setKeyRelationships] = useState('');
  const [upcomingDeadlines, setUpcomingDeadlines] = useState('');
  const [outstandingTasks, setOutstandingTasks] = useState('');
  
  // Custom alerts toggles
  const [notifyCurrentTeam, setNotifyCurrentTeam] = useState(true);
  const [notifyClient, setNotifyClient] = useState(false);

  if (!isOpen) return null;

  // Simulate active matters count if not set
  const getCapacityMetric = (count: number) => {
    if (count <= 3) return { label: `${count} Active matters`, class: 'bg-emerald-100 text-emerald-800' };
    if (count <= 8) return { label: `${count} Active matters`, class: 'bg-amber-100 text-amber-800' };
    return { label: `${count} Active workload overload!`, class: 'bg-rose-100 text-rose-800 animate-pulse' };
  };

  const handleTransferSubmit = () => {
    if (!selectedLawyerId) {
      alert("Please check a designated counsel candidate.");
      return;
    }

    if (!statusSummary.trim() || !pendingActions.trim()) {
      alert("Please document the status summary and urgent pending activities to complete safe hand-over registry.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      const formattedCompositeNote = `
HANDOVER NOTE MEMORANDUM
Transfer Scheduled: ${transferDate}
Target Successor Designated ID: ${selectedLawyerId}

1. EXPEDITIOUS CASE SUMMARY:
${statusSummary}

2. CRITICAL PRE-TRIAL AND PENDING ACTIONS:
${pendingActions}

3. PRIMARY CONTACT & OPPOSE RELATIONS:
${keyRelationships || 'Standard/Maintained.'}

4. UPCOMING THREATS AND CALENDAR MATTERS:
${upcomingDeadlines || 'Dockets list checks in place.'}

5. IMMEDIATE INTERNAL DRAFT TASKS:
${outstandingTasks || 'No secondary tasks stated.'}
      `;

      onTransferCompleted(selectedLawyerId, formattedCompositeNote);
      alert("Matter Lead Counsel successfully transferred and notification logs dispatched!");
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 font-sans">Formal Lawyer Transfer & Handover</h3>
              <p className="text-[10px] text-slate-400">Reassign File ownership and record transition memos permanently.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation steps */}
        <div className="flex items-center gap-2 mb-4 text-[10px] uppercase font-black text-slate-400">
          <span className={step === 1 ? 'text-indigo-600 font-bold' : ''}>1. Select Target Counsel</span>
          <span>&middot;</span>
          <span className={step === 2 ? 'text-indigo-600 font-bold' : ''}>2. Structured Handover note</span>
        </div>

        {/* Scroll Body */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-1">

          {/* STEP 1: CHOOSE TARGET SUCCESSOR COUNSEL */}
          {step === 1 && (
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Select designated Lead Successor Counsel</span>
              
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto p-1 bg-slate-100 border rounded-xl">
                {lawyers
                  .filter(l => l.id !== caseData.assignedLawyerId)
                  .map(law => {
                    const count = law.activeMattersCount ?? Math.floor(Math.random() * 12) + 1;
                    const cap = getCapacityMetric(count);
                    const isPicked = selectedLawyerId === law.id;

                    return (
                      <div 
                        key={law.id}
                        onClick={() => setSelectedLawyerId(law.id)}
                        className={`p-2.5 rounded-lg border text-xs flex justify-between items-center cursor-pointer select-none transition ${
                          isPicked ? 'border-indigo-400 bg-indigo-50/20' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={law.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=user'} className="h-6 w-6 rounded-md" />
                          <span className="font-bold text-slate-800">{law.fullName}</span>
                        </div>
                        <span className={`text-[9px] font-bold py-0.5 px-2 rounded-full ${cap.class}`}>
                          {cap.label}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Set Date */}
              <div className="bg-slate-50 p-3.5 rounded-xl border space-y-2">
                <label className="block text-[10px] uppercase font-bold text-slate-500">Effective transfer execution date</label>
                <input 
                  type="date"
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  className="p-1.5 text-xs bg-white border rounded-lg w-full font-bold max-w-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 2: HANDOVER NOTE MEMO DETAILS */}
          {step === 2 && (
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Complete standard Handover memo segments</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Matter status concise summary *</label>
                  <textarea 
                    rows={2}
                    required
                    value={statusSummary}
                    onChange={e => setStatusSummary(e.target.value)}
                    placeholder="E.g. Commercial pleadings closed. Advised plaintiff we are preparing defense outline and waiting client bank statements..."
                    className="w-full text-xs p-2 border rounded-lg font-sans leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Critical/Urgent Pending Actions *</label>
                  <textarea 
                    rows={2}
                    required
                    value={pendingActions}
                    onChange={e => setPendingActions(e.target.value)}
                    placeholder="What must successor do within 7 days?"
                    className="w-full text-xs p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Contact relationships (Opposing/Client details)</label>
                  <textarea 
                    rows={2}
                    value={keyRelationships}
                    onChange={e => setKeyRelationships(e.target.value)}
                    placeholder="Key notes about client communication levels or opposing lawyer attitude"
                    className="w-full text-xs p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Significant Calendar limits / court dates</label>
                  <textarea 
                    rows={2}
                    value={upcomingDeadlines}
                    onChange={e => setUpcomingDeadlines(e.target.value)}
                    placeholder="Limits constraints alerts"
                    className="w-full text-xs p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Outstanding document assembly tasks</label>
                  <textarea 
                    rows={2}
                    value={outstandingTasks}
                    onChange={e => setOutstandingTasks(e.target.value)}
                    placeholder="Affidavits waiting for stamps, etc."
                    className="w-full text-xs p-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 border rounded-xl text-xxs font-semibold">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={notifyCurrentTeam} onChange={e => setNotifyCurrentTeam(e.target.checked)} className="rounded text-indigo-650" />
                  <span>Alert assigned court helpers and assistants on current channel thread</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={notifyClient} onChange={e => setNotifyClient(e.target.checked)} className="rounded text-indigo-650" />
                  <span>Notify active client via automated Client Updates channel (Draft queued)</span>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Footer controls */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <button 
            type="button" 
            onClick={onClose}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold rounded-xl"
          >
            Cancel
          </button>
          
          {step === 1 ? (
            <button
              type="button"
              disabled={!selectedLawyerId}
              onClick={() => setStep(2)}
              className="p-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer disabled:opacity-40"
            >
              Draft Memo Memo &rarr;
            </button>
          ) : (
            <button
              type="button"
              onClick={handleTransferSubmit}
              disabled={loading}
              className="p-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer transition flex items-center gap-1.5 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Performing Transfer Logs...</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 shrink-0" />
                  <span>Confirm Lead designation change</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
