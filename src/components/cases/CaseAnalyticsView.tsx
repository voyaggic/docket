import React from 'react';
import { BarChart3, TrendingUp, Compass, Clock, CheckCircle2, AlertTriangle, HelpCircle, Activity, Award } from 'lucide-react';
import { Case } from '../../types';

interface CaseAnalyticsViewProps {
  cases: Case[];
  activeCase?: any;
}

export default function CaseAnalyticsView({ cases, activeCase }: CaseAnalyticsViewProps) {
  // If showing analytics for a single active case:
  if (activeCase) {
    const totalFees = 4200;
    const budgetVal = activeCase.companyId ? 7500 : 5000;
    const progressPerc = Math.min(100, Math.floor((totalFees / budgetVal) * 100));

    // Simulated stage durations
    const stagedData = [
      { name: 'Intake brief', days: 4, color: 'bg-indigo-500' },
      { name: 'Pleadings outline', days: 12, color: 'bg-sky-500' },
      { name: 'Affidavit drafting', days: 28, color: 'bg-emerald-500' },
      { name: 'Court session wait', days: 45, color: 'bg-amber-500 animate-pulse' },
    ];

    return (
      <div className="space-y-6" id="individual-analytics-view">
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 mb-3">
          <Activity className="h-4.5 w-4.5 text-indigo-500" />
          <span>Matter performance & Bottleneck Audit</span>
        </h4>

        {/* Budget bar */}
        <div className="bg-slate-50 p-4 border rounded-xl space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-500 uppercase">Matter Budget Status Indicator</span>
            <span className="font-mono text-indigo-700 font-extrabold">{progressPerc}% Consumed</span>
          </div>
          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-550 ${progressPerc > 90 ? 'bg-rose-500' : 'bg-indigo-600'}`} 
              style={{ width: `${progressPerc}%` }} 
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-semibold pt-1">
            <span>Billed Fees: £{totalFees}</span>
            <span>Total Budget Limit: £{budgetVal}</span>
          </div>
        </div>

        {/* Duration per stage */}
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Workflow lifecycle (Duration spent per Stage)</span>
          <div className="space-y-2">
            {stagedData.map((stg, i) => (
              <div key={i} className="text-xs space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700">{stg.name}</span>
                  <span className="font-mono font-bold text-slate-500">{stg.days} days</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full">
                  <div className={`h-full rounded-full ${stg.color}`} style={{ width: `${Math.min(100, stg.days * 2)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action tags */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xxs font-extrabold pb-2">
          <div className="p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 block font-normal">DEADLINE ADHERENCE</span>
            <span className="font-black text-indigo-800 text-sm block">100% on time</span>
          </div>
          <div className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 block font-normal">COMMUNICATION FREQUENCY</span>
            <span className="font-black text-emerald-800 text-sm block">2.4 dispatches/mo</span>
          </div>
        </div>
      </div>
    );
  }

  // --- GENERAL COMPREHENSIVE FIRM-WIDE ADVISOR VIEW ---
  // Count by Type
  const total = cases.length || 1;
  const civil = cases.filter(c => c.caseType === 'Civil').length;
  const crim = cases.filter(c => c.caseType === 'Criminal').length;
  const fam = cases.filter(c => c.caseType === 'Family').length;
  const corp = cases.filter(c => c.caseType === 'Transactional').length;

  const distribution = [
    { type: 'Civil Claims', count: civil, ratio: Math.floor((civil / total) * 100), color: 'bg-indigo-500' },
    { type: 'Criminal Defense', count: crim, ratio: Math.floor((crim / total) * 100), color: 'bg-rose-500' },
    { type: 'Family Mediation', count: fam, ratio: Math.floor((fam / total) * 100), color: 'bg-teal-500' },
    { type: 'Corporate M&A', count: corp, ratio: Math.floor((corp / total) * 100), color: 'bg-amber-500' },
  ];

  return (
    <div className="bg-slate-50 border p-4 sm:p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6" id="general-caseload-analytics">
      {/* Chart 1: Practice allocation */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-indigo-650" />
            <span>Practice Case Allocation</span>
          </h4>
          <p className="text-[10px] text-slate-400">Relative allocation ratios across files currently active in system.</p>
        </div>

        <div className="space-y-3">
          {distribution.map((dist, idx) => (
            <div key={idx} className="space-y-1 text-xs">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-650">
                <span>{dist.type} ({dist.count} dossiers)</span>
                <span className="font-mono">{dist.ratio}%</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${dist.color}`} style={{ width: `${dist.ratio}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart 2: Milestone throughput bottlenecks */}
      <div className="space-y-4 flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
            <Compass className="h-4 w-4 text-emerald-650" />
            <span>Average Stage Bottleneck (Days)</span>
          </h4>
          <p className="text-[10px] text-slate-400">Total typical duration before transitioning from initial brief levels.</p>
        </div>

        <div className="space-y-2 bg-white border rounded-xl p-3 text-xxs font-semibold">
          {[
            { label: 'Intake consultations', value: '4.2 days', metric: 'Optimal' },
            { label: 'Pleadings drafts compilation', value: '18.4 days', metric: 'Requires checkoff' },
            { label: 'Filing actions and court backlog', value: '42.9 days', metric: 'Backlogged circuit' },
            { label: 'Settlement negotiation phases', value: '14.5 days', metric: 'Expedited' }
          ].map((item, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 p-1.5 border-b last:border-0">
              <span className="text-slate-700 font-bold break-words">{item.label}</span>
              <div className="flex items-center gap-1 flex-wrap shrink-0">
                <span className="font-mono text-slate-600 font-extrabold whitespace-nowrap">{item.value}</span>
                <span className={`p-0.5 px-1.5 rounded font-black text-[8px] tracking-wide uppercase whitespace-nowrap shrink-0 ${
                  item.metric === 'Optimal' || item.metric === 'Expedited' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.metric}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
