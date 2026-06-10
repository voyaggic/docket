import React from 'react';
import { Briefcase, AlertTriangle, Clock, RefreshCw, UserCheck, ShieldAlert, BadgeInfo } from 'lucide-react';
import { Case } from '../../types';

interface MatterCardViewProps {
  caseItem: Case;
  selectedCaseId: string | null;
  onSelectCase: (caseItem: Case) => void;
}

export default function MatterCardView({ caseItem, selectedCaseId, onSelectCase }: MatterCardViewProps) {
  const isSelected = selectedCaseId === caseItem.id;
  
  // Custom states extraction
  const priority = (caseItem as any).priority || 'Normal';
  const customCaseValue = (caseItem as any).caseValue || 25000;
  const isLegalHold = (caseItem as any).isLegalHold || false;

  // Compute statute limit reminder indicator
  const statuteDateStr = (caseItem as any).statuteOfLimitations;
  let statuteCountText = '';
  let statuteTheme = '';

  if (statuteDateStr) {
    const limit = new Date(statuteDateStr);
    const diff = limit.getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) {
      statuteCountText = 'EXPIRED LIMIT!';
      statuteTheme = 'text-red-600 bg-red-50 border-red-200';
    } else if (days <= 30) {
      statuteCountText = `LIMIT: ${days} DAYS!`;
      statuteTheme = 'text-red-700 bg-red-100 border-red-300 animate-pulse font-extrabold';
    } else if (days <= 90) {
      statuteCountText = `LIMIT: ${days} days`;
      statuteTheme = 'text-amber-700 bg-amber-50 border-amber-200 font-bold';
    } else {
      statuteCountText = `${days} days buffer`;
      statuteTheme = 'text-slate-500 bg-slate-100 border-slate-205';
    }
  }

  // Set colors for tag priority
  const priorityStyle = 
    priority.toLowerCase() === 'urgent' ? 'bg-rose-100 text-rose-800 border-rose-200 font-extrabold' :
    priority.toLowerCase() === 'high' ? 'bg-amber-100 text-amber-850 border-amber-200' :
    'bg-slate-100 text-slate-600 border-slate-200/50';

  return (
    <div 
      onClick={() => onSelectCase(caseItem)}
      className={`p-4 rounded-2xl border text-xs cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${
        isSelected 
          ? 'border-indigo-600 bg-indigo-50/20 shadow-xs' 
          : 'bg-white border-slate-200/90'
      }`}
      id={`matter-card-${caseItem.id}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono font-black text-slate-800 bg-slate-50 border p-1 rounded tracking-tight text-[11px]">
          {caseItem.referenceNumber}
        </span>
        <div className="flex gap-1">
          {isLegalHold && (
            <span className="p-0.5 px-2 text-[8px] font-black bg-rose-600 text-white rounded uppercase tracking-wider animate-pulse">
              HOLD
            </span>
          )}
          <span className={`p-0.5 px-2 text-[8px] font-black rounded uppercase tracking-wide border ${priorityStyle}`}>
            {priority}
          </span>
          <span className={`p-0.5 px-2 text-[8px] font-black rounded uppercase tracking-wide border ${
            caseItem.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-150 text-slate-500'
          }`}>
            {caseItem.status}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <h4 className="font-extrabold text-slate-800 text-xs truncate">
          {(caseItem as any).client?.fullName || 'Client Name Holder'}
        </h4>
        
        <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
          <span>{caseItem.caseType} &bull; {caseItem.court || 'Court of London'}</span>
          <span className="font-mono font-bold text-slate-800">£{parseInt(customCaseValue).toLocaleString()}</span>
        </div>
      </div>

      <div className="border-t pt-2 mt-3 flex justify-between items-center text-[10px] text-slate-400">
        <span className="truncate max-w-[120px] font-bold text-slate-500">
          {(caseItem as any).assignedLawyer?.fullName || 'Unassigned advocate'}
        </span>
        
        {statuteCountText ? (
          <span className={`p-0.5 px-2 text-[8px] rounded border ${statuteTheme}`}>
            {statuteCountText}
          </span>
        ) : (
          <span>No limit set</span>
        )}
      </div>
    </div>
  );
}export {};
