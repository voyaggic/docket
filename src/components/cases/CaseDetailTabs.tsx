import React, { useState } from 'react';
import { DollarSign, PiggyBank, Receipt, FileSpreadsheet, Plus, HelpCircle, Users, UserPlus, Clipboard, ShieldAlert, BadgeInfo, Star, FileText, ArrowLeftRight, Check, CheckCircle2 } from 'lucide-react';
import { Case, Client } from '../../types';

interface FeeNote {
  id: string;
  date: string;
  lawyerName: string;
  description: string;
  hours: number;
  rate: number;
  status: 'unbilled' | 'billed';
}

interface Disbursement {
  id: string;
  date: string;
  description: string;
  amount: number;
  paidBy: string;
  status: 'unbilled' | 'billed';
}

interface TeamMember {
  id: string;
  fullName: string;
  avatarUrl?: string;
  roleOnMatter: string;
  contribution: string;
  daysActive: number;
}

interface CaseDetailTabsProps {
  activeTab: string;
  caseData: Case;
  client: Client;
  lawyers: Array<{ id: string; fullName: string }>;
  
  // Financials Callback Trigger
  onOpenInvoiceWizard: () => void;
  feeNotes: FeeNote[];
  disbursements: Disbursement[];
  onAddFeeNote: (note: Omit<FeeNote, 'id' | 'status'>) => void;
  onAddDisbursement: (disb: Omit<Disbursement, 'id' | 'status'>) => void;

  // Custom states Handover / Collaboration
  handovers?: any[];
  onOpenTransferModal?: () => void;
}

export default function CaseDetailTabs({
  activeTab, caseData, client, lawyers, onOpenInvoiceWizard, feeNotes = [], disbursements = [], onAddFeeNote, onAddDisbursement, handovers = [], onOpenTransferModal
}: CaseDetailTabsProps) {

  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Inputs for adding Fee note
  const [feeDesc, setFeeDesc] = useState('');
  const [feeHours, setFeeHours] = useState<number>(1);
  const [feeRate, setFeeRate] = useState<number>(150);
  const [assignedLawYER, setAssignedLawYER] = useState(() => lawyers[0]?.fullName || "Alex Rivera, Esq.");
  const [addingNote, setAddingNote] = useState(false);

  // Inputs for adding disbursement
  const [disbDesc, setDisbDesc] = useState('');
  const [disbAmount, setDisbAmount] = useState<number>(50);
  const [disbPaidBy, setDisbPaidBy] = useState('Firm (to be billed)');
  const [addingDisb, setAddingDisb] = useState(false);

  const inputStyle = "w-full text-xs border border-[#d1d5db] rounded-[8px] px-3.5 py-2 px-3 bg-white text-slate-800 outline-none caret-indigo-600 transition-all duration-150";
  const selectStyle = "w-full text-xs border border-[#d1d5db] rounded-[8px] px-3.5 py-1.5 px-3 bg-white text-slate-800 outline-none transition-all duration-150";

  // 1. FINANCIALS TAB IMPLEMENTATION
  if (activeTab === 'financials') {
    const totalFeesBilled = feeNotes.filter(f => f.status === 'billed').reduce((sum, f) => sum + (f.hours * f.rate), 0);
    const totalDisbBilled = disbursements.filter(d => d.status === 'billed').reduce((sum, d) => sum + d.amount, 0);
    
    // Unbilled
    const totalFeesUnbilled = feeNotes.filter(f => f.status === 'unbilled').reduce((sum, f) => sum + (f.hours * f.rate), 0);
    const totalDisbUnbilled = disbursements.filter(d => d.status === 'unbilled').reduce((sum, d) => sum + d.amount, 0);

    const totalBilled = totalFeesBilled + totalDisbBilled;
    const unresolvedBalance = totalFeesUnbilled + totalDisbUnbilled;
    const matterVal = parseInt(String((caseData as any).caseValue || 15000)) || 15000;

    const budgetLimit = (caseData as any).budget || 8000;
    const actualSpent = totalFeesBilled + totalFeesUnbilled + totalDisbBilled + totalDisbUnbilled;
    const budgetUsageRatio = Math.min(100, Math.floor((actualSpent / budgetLimit) * 100));

    const handleAddFeeNoteSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!feeDesc) return;
      onAddFeeNote({
        date: new Date().toISOString().split('T')[0],
        lawyerName: assignedLawYER,
        description: feeDesc,
        hours: feeHours,
        rate: feeRate
      });
      setFeeDesc('');
      setAddingNote(false);
    };

    const handleAddDisbSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!disbDesc) return;
      onAddDisbursement({
        date: new Date().toISOString().split('T')[0],
        description: disbDesc,
        amount: disbAmount,
        paidBy: disbPaidBy
      });
      setDisbDesc('');
      setAddingDisb(false);
    };

    return (
      <div className="space-y-6 animate-fade-in" id="billing-financials-tab">
        {/* Metric rows */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 border border-[#d1d5db] rounded-xl hover:text-[#3b82f6] transition-colors duration-150 group">
            <span className="text-[10px] text-slate-400 group-hover:text-[#3b82f6] font-bold block uppercase tracking-wide">Matter Clamed Value</span>
            <span className="text-xl font-black text-slate-800 group-hover:text-[#3b82f6] block mt-1 font-mono">£{matterVal.toLocaleString()}</span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-[#d1d5db] rounded-xl hover:text-[#3b82f6] transition-colors duration-150 group">
            <span className="text-[10px] text-slate-400 group-hover:text-[#3b82f6] font-bold block uppercase tracking-wide">Total Fees Billed</span>
            <span className="text-xl font-black text-emerald-700 group-hover:text-[#3b82f6] block mt-1 font-mono">£{totalBilled.toLocaleString()}</span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-[#d1d5db] rounded-xl hover:text-[#3b82f6] transition-colors duration-150 group">
            <span className="text-[10px] text-slate-400 group-hover:text-[#3b82f6] font-bold block uppercase tracking-wide">Disbursements</span>
            <span className="text-xl font-black text-slate-800 group-hover:text-[#3b82f6] block mt-1 font-mono">£{(totalDisbBilled + totalDisbUnbilled).toLocaleString()}</span>
          </div>
          <div className="p-3.5 bg-indigo-50/30 border border-[#d1d5db] rounded-xl hover:text-[#3b82f6] transition-colors duration-150 group">
            <span className="text-[10px] text-indigo-700 group-hover:text-[#3b82f6] font-extrabold block uppercase tracking-wide">Outstanding Unbilled</span>
            <span className="text-xl font-black text-indigo-800 group-hover:text-[#3b82f6] block mt-1 font-mono">£{unresolvedBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Budget usage progress */}
        <div className="bg-slate-50 p-4 border border-[#d1d5db] rounded-xl space-y-2">
          <div className="flex justify-between text-xs font-bold items-center">
            <span className="text-slate-600">Matter Budget Consumed Meter</span>
            <span className={budgetUsageRatio > 90 ? 'text-rose-600' : 'text-indigo-600 font-mono'}>{budgetUsageRatio}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-350 ${budgetUsageRatio > 85 ? 'bg-red-500' : 'bg-emerald-600'}`} 
              style={{ width: `${budgetUsageRatio}%` }} 
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>Billed + Ledger actuals: £{actualSpent}</span>
            <span>Firm threshold budget limit: £{budgetLimit}</span>
          </div>
        </div>

        {/* Timesheets List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b-[1.5px] border-[#e5e7eb] pb-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Timesheet Hours Ledger</span>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setAddingNote(!addingNote)}
                className="text-xs p-1.5 px-3 bg-white text-[#374151] border border-[#d1d5db] hover:border-[#3b82f6] hover:text-[#3b82f6] font-semibold rounded-[8px] cursor-pointer transition-all duration-150"
              >
                + Log Billable Hours
              </button>
              <button 
                type="button"
                onClick={onOpenInvoiceWizard}
                className="text-xs p-2 bg-[#3b82f6] text-white border-none font-semibold rounded-[8px] cursor-pointer transition-all duration-150 hover:bg-[#2563eb]"
              >
                Assemble & Issue Invoice
              </button>
            </div>
          </div>

          {/* Form inline */}
          {addingNote && (
            <form onSubmit={handleAddFeeNoteSubmit} className="p-3 bg-indigo-50/20 border border-[#d1d5db] rounded-xl grid grid-cols-1 md:grid-cols-3 gap-2.5 items-end text-xxs font-semibold">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Chargeable Work Description</label>
                <input 
                  type="text" 
                  value={feeDesc}
                  onChange={e => setFeeDesc(e.target.value)}
                  placeholder="Prepared list of particulars and coordinated client consultations..."
                  className={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 font-sans">Billing Staff</label>
                <select 
                  value={assignedLawYER}
                  onChange={e => setAssignedLawYER(e.target.value)}
                  className={selectStyle}
                >
                  {lawyers.map(l => (
                    <option key={l.id} value={l.fullName}>{l.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-650 mb-0.5">Hours Spent</label>
                <input 
                  type="number" 
                  min="0.1" 
                  step="0.1"
                  value={feeHours || ''}
                  onChange={e => setFeeHours(parseFloat(e.target.value) || 1)}
                  className={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-655 mb-0.5">Hourly Rate (£)</label>
                <input 
                  type="number" 
                  value={feeRate || ''}
                  onChange={e => setFeeRate(parseInt(e.target.value) || 150)}
                  className={inputStyle}
                />
              </div>
              <div className="flex gap-1">
                <button type="submit" className="flex-1 p-2 bg-[#3b82f6] text-white rounded-[8px] font-semibold hover:bg-[#2563eb] cursor-pointer border-none transition-all duration-150">Add</button>
                <button type="button" onClick={() => setAddingNote(false)} className="p-2 bg-white text-[#374151] border border-[#d1d5db] hover:border-[#3b82f6] hover:text-[#3b82f6] rounded-[8px] transition-colors duration-150 cursor-pointer">Cancel</button>
              </div>
            </form>
          )}

          {/* List Fee Notes Table with 1.5px borders */}
          {feeNotes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 block">No financial timesheets logged for this litigation.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b-[1.5px] border-[#e5e7eb] text-slate-500 font-extrabold uppercase text-[9px] select-none">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Staff Advocate</th>
                    <th className="p-2.5">Particulars Narrative</th>
                    <th className="p-2.5">Unbilled Rates</th>
                    <th className="p-2.5 text-right font-mono">Billed Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y-[1.5px] divide-[#e5e7eb] font-medium text-slate-755">
                  {feeNotes.map(fn => (
                    <tr key={fn.id} className="hover:bg-slate-50/50 transition-colors duration-150 group">
                      <td className="p-2.5 text-slate-400">{fn.date}</td>
                      <td className="p-2.5 font-bold group-hover:text-[#3b82f6] transition-colors duration-150">{fn.lawyerName}</td>
                      <td className="p-2.5 text-slate-600 italic group-hover:text-[#3b82f6] transition-colors duration-150">"{fn.description}"</td>
                      <td className="p-2.5">{fn.hours} hrs @ £{fn.rate}/hr</td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        <span className={`p-1 px-2.5 rounded text-[9px] mr-2 font-black tracking-wide uppercase ${
                          fn.status === 'billed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {fn.status}
                        </span>
                        £{fn.hours * fn.rate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Disbursements Table */}
        <div className="space-y-3 pt-3 border-t-[1.5px] border-[#e5e7eb]">
          <div className="flex justify-between items-center pb-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Disbursements / Claim Expenses</span>
            <button 
              type="button"
              onClick={() => setAddingDisb(!addingDisb)}
              className="text-xs p-1.5 px-3 bg-white text-[#374151] border border-[#d1d5db] hover:border-[#3b82f6] hover:text-[#3b82f6] font-semibold rounded-[8px] cursor-pointer transition-all duration-150"
            >
              + Log Client Expense
            </button>
          </div>

          {/* Form Add Expense */}
          {addingDisb && (
            <form onSubmit={handleAddDisbSubmit} className="p-3 bg-indigo-50/20 border border-[#d1d5db] rounded-xl grid grid-cols-1 md:grid-cols-4 gap-2 text-xxs font-semibold">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Expensed Item Title / Context</label>
                <input 
                  type="text" 
                  value={disbDesc}
                  onChange={e => setDisbDesc(e.target.value)}
                  placeholder="Government court stamp fees receipt"
                  className={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Expense Cost (£)</label>
                <input 
                  type="number" 
                  value={disbAmount || ''}
                  onChange={e => setDisbAmount(parseInt(e.target.value) || 50)}
                  className={inputStyle}
                />
              </div>
              <div className="flex gap-1 items-end mt-1">
                <button type="submit" className="flex-1 p-2 bg-[#3b82f6] text-white rounded-[8px] font-semibold hover:bg-[#2563eb] cursor-pointer border-none transition-all duration-150">Log Item</button>
                <button type="button" onClick={() => setAddingDisb(false)} className="p-2 bg-white text-[#374151] border border-[#d1d5db] hover:border-[#3b82f6] hover:text-[#3b82f6] rounded-[8px] transition-colors duration-150 cursor-pointer">Cancel</button>
              </div>
            </form>
          )}

          {disbursements.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No disbursements logged yet.</p>
          ) : (
            <div className="space-y-1.5">
              {disbursements.map(disb => (
                <div key={disb.id} className="p-3 bg-white border border-[#d1d5db] rounded-xl flex justify-between items-center text-xs group hover:text-[#3b82f6] transition-colors duration-150">
                  <div>
                    <h5 className="font-bold text-slate-800 group-hover:text-[#3b82f6] transition-colors duration-150">{disb.description}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Incurred: {disb.date} &bull; Payer: {disb.paidBy}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`p-1 px-2 text-[9px] rounded font-extrabold uppercase ${
                      disb.status === 'billed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-350' : 'bg-amber-100 text-amber-800 border border-amber-350'
                    }`}>
                      {disb.status}
                    </span>
                    <span className="font-mono font-bold text-slate-800 group-hover:text-[#3b82f6] text-sm">£{disb.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. TEAM & COLLABORATION TAB IMPLEMENTATION
  if (activeTab === 'team') {
    const defaultTeam: TeamMember[] = [
      { id: 'tm-1', fullName: 'Alex Rivera, Esq.', roleOnMatter: 'Lead Counsel', contribution: 'Drafted demand brief, managed initial litigation consults', daysActive: 140 },
      { id: 'tm-2', fullName: 'Marcus Vance III', roleOnMatter: 'Junior Counsel', contribution: 'Prepared affidavit listings, coordinated pre-trial calendar', daysActive: 94 },
      { id: 'tm-3', fullName: 'Paralegal Assistant', roleOnMatter: 'Paralegal', contribution: 'Filed pleadings folders, collected court certificates', daysActive: 121 },
    ];

    const currentLawyersList = defaultTeam;

    // Simulated Opinion requests logs
    const opRequests = [
      { id: 'op-1', from: 'Marcus Vance III', subject: 'Evidence admissibility exclusion review', status: 'Completed', notes: 'Exclusion under statutory exception rule is valid.' },
      { id: 'op-2', from: 'Paralegal Assistant', subject: 'Verify client ssnd validation matching', status: 'Pending', notes: 'Awating passport copy scan uploads.' },
    ];

    return (
      <div className="space-y-6 animate-fade-in" id="team-collaboration-tab">
        {/* Workload statistics */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b-[1.5px] border-[#e5e7eb] pb-2">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 transition-colors duration-150 hover:text-[#3b82f6]">
                <Users className="h-4.5 w-4.5 text-[#3b82f6]" />
                <span>Matter Defense Team Assignments</span>
              </h4>
              <p className="text-[10px] text-slate-400">Attorneys and support personnel mapped to this specific brief.</p>
            </div>
            <button 
              type="button"
              onClick={() => {
                setInfoNotice("Searching active associates... Add lawyer feature available from left detail toolbar.");
                setTimeout(() => setInfoNotice(null), 5000);
              }}
              className="text-xs p-1.5 px-3 bg-[#3b82f6] border-none text-white font-semibold rounded-[8px] shrink-0 cursor-pointer transition-all duration-150 hover:bg-[#2563eb]"
            >
              + Designate Counsel
            </button>
          </div>

          {infoNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-2 animate-fade-in w-full">
              <span>{infoNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {currentLawyersList.map(item => (
              <div key={item.id} className="p-3.5 bg-slate-50 border border-[#d1d5db] rounded-xl space-y-2 hover:shadow-xxs transition-colors duration-150 group">
                <div className="flex items-center gap-2">
                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.fullName}`} className="h-7 w-7 rounded-md border border-[#d1d5db] shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 group-hover:text-[#3b82f6] transition-colors duration-150">{item.fullName}</h5>
                    <span className="text-[9px] font-black text-indigo-700 uppercase">{item.roleOnMatter}</span>
                  </div>
                </div>
                <div className="border-t-[1.5px] border-[#e5e7eb] pt-2 space-y-1 text-[10px] text-slate-500">
                  <span className="block italic leading-relaxed">"{item.contribution}"</span>
                  <span className="block font-medium text-slate-400">Assigned: {item.daysActive} days under file</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Handover memorandum registry */}
        <div className="space-y-3 pt-4 border-t-[1.5px] border-[#e5e7eb]">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
              <ArrowLeftRight className="h-4 w-4 text-[#3b82f6] font-mono" />
              <span>Permanent Handover Memorandums</span>
            </span>
            <button 
              type="button"
              onClick={() => onOpenTransferModal?.()}
              className="text-xs p-1.5 px-3 bg-white text-[#374151] border border-[#d1d5db] hover:border-[#3b82f6] hover:text-[#3b82f6] font-semibold rounded-[8px] cursor-pointer transition-all duration-150"
            >
              Execute Matter Reassignment
            </button>
          </div>

          {handovers.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 block bg-slate-50 border border-[#d1d5db] rounded-xl border-dashed">
              No lawyer transfer events or Handover notes recorded yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {handovers.map((ho, index) => (
                <div key={index} className="p-3.5 bg-indigo-50/5 border border-[#d1d5db] rounded-xl space-y-2 animate-fade-in text-xs font-medium text-slate-700">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-bold uppercase text-indigo-800 font-mono bg-indigo-50 p-0.5 px-1.5 rounded">Handover Registry #{handovers.length - index}</span>
                    <span>Executed: {ho.date || new Date().toLocaleDateString()}</span>
                  </div>
                  <pre className="text-xxs text-slate-550 leading-relaxed italic bg-white p-2.5 border border-[#d1d5db] rounded-lg max-h-[140px] overflow-y-auto block select-text font-mono break-words whitespace-pre-wrap">
                    {ho.note}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opinion request tasks */}
        <div className="space-y-3 pt-4 border-t-[1.5px] border-[#e5e7eb]">
          <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">Associate Collaboration Tasks</span>
          <div className="space-y-2">
            {opRequests.map(req => (
              <div key={req.id} className="p-3 bg-white border border-[#d1d5db] rounded-xl flex justify-between items-center text-xs group transition-colors duration-150">
                <div>
                  <h5 className="font-bold text-slate-800 group-hover:text-[#3b82f6] transition-colors duration-150">{req.subject}</h5>
                  <p className="text-[10px] text-slate-400">Assit request by Associate counsel: {req.from}</p>
                  {req.notes && <p className="text-[10px] text-[#3b82f6] italic mt-1 block">✔ Advice outcome: "{req.notes}"</p>}
                </div>
                <span className={`p-1 px-2.5 text-[8px] rounded font-black uppercase ${
                  req.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-305' : 'bg-amber-100 text-amber-800 border border-amber-305'
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
