import React from 'react';
import { Briefcase, AlertTriangle, Clock, RefreshCw, Send, CheckCircle2, UserX } from 'lucide-react';
import { Case } from '../../types';

interface CaseStatsStripProps {
  cases: Case[];
  activeFilter: string | null;
  onFilterSelect: (filterType: string | null) => void;
}

export default function CaseStatsStrip({ cases, activeFilter, onFilterSelect }: CaseStatsStripProps) {
  // Compute active matters
  const activeCases = cases.filter(c => c.status === 'ACTIVE' && !(c as any).isArchived);
  
  // Urgent matters (priority is urgent)
  const urgentCases = cases.filter(c => {
    const priority = ((c as any).priority || '').toLowerCase();
    return priority === 'urgent' && c.status !== 'CLOSED' && !(c as any).isArchived;
  });

  // Simulated deadlines this week
  const deadlinesThisWeek = cases.filter(c => {
    // Return cases that have upcoming deadlines in the next 7 days
    const isUpcoming = (c as any).deadlines?.some((d: any) => {
      const due = new Date(d.dueDate);
      const diffTime = due.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7 && !d.isResolved;
    });
    return isUpcoming;
  });

  // Pending updates (updates with DRAFT status)
  const pendingUpdates = cases.filter(c => (c as any).updates?.some((u: any) => u.status === 'DRAFT'));

  // Opened this month (June 2026 or current month)
  const openedThisMonth = cases.filter(c => {
    const openedDate = new Date(c.openedDate);
    const now = new Date();
    return openedDate.getMonth() === now.getMonth() && openedDate.getFullYear() === now.getFullYear();
  });

  // Closed this month
  const closedThisMonth = cases.filter(c => {
    if (c.status !== 'CLOSED') return false;
    const closedDate = (c as any).closedDate ? new Date((c as any).closedDate) : new Date(c.updatedAt);
    const now = new Date();
    return closedDate.getMonth() === now.getMonth() && closedDate.getFullYear() === now.getFullYear();
  });

  // Unassigned matters (no lawyer designated)
  const unassignedCases = cases.filter(c => !c.assignedLawyerId);

  const metrics = [
    {
      id: 'active',
      title: 'Active Matters',
      value: activeCases.length,
      icon: Briefcase,
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50',
      activeColorClass: 'bg-emerald-600 text-white border-emerald-600',
      badgeText: 'Live tracking'
    },
    {
      id: 'urgent',
      title: 'Urgent Action',
      value: urgentCases.length,
      icon: AlertTriangle,
      colorClass: urgentCases.length > 0 
        ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100/50' 
        : 'bg-slate-50 text-slate-500 border-slate-100',
      activeColorClass: 'bg-rose-600 text-white border-rose-600',
      badgeText: 'High Priority'
    },
    {
      id: 'deadlines',
      title: 'Due This Week',
      value: deadlinesThisWeek.length,
      icon: Clock,
      colorClass: deadlinesThisWeek.length > 0 
        ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50' 
        : 'bg-slate-50 text-slate-500 border-slate-100',
      activeColorClass: 'bg-amber-500 text-slate-900 border-amber-500',
      badgeText: '7 days buffer'
    },
    {
      id: 'updates',
      title: 'Pending Updates',
      value: pendingUpdates.length,
      icon: Send,
      colorClass: pendingUpdates.length > 0
        ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50'
        : 'bg-slate-50 text-slate-500 border-slate-100',
      activeColorClass: 'bg-indigo-600 text-white border-indigo-600',
      badgeText: 'Awaiting send'
    },
    {
      id: 'opened',
      title: 'Opened This Month',
      value: openedThisMonth.length,
      icon: RefreshCw,
      colorClass: 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100/50',
      activeColorClass: 'bg-sky-600 text-white border-sky-600',
      badgeText: 'Growth factor'
    },
    {
      id: 'closed',
      title: 'Closed This Month',
      value: closedThisMonth.length,
      icon: CheckCircle2,
      colorClass: 'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100/50',
      activeColorClass: 'bg-teal-600 text-white border-teal-600',
      badgeText: 'Completed'
    },
    {
      id: 'unassigned',
      title: 'Unassigned Matters',
      value: unassignedCases.length,
      icon: UserX,
      colorClass: unassignedCases.length > 0
        ? 'bg-red-50 text-red-600 border-red-100 animate-pulse hover:bg-red-100/50'
        : 'bg-slate-50 text-slate-500 border-slate-100',
      activeColorClass: 'bg-red-600 text-white border-red-600',
      badgeText: 'Requires staff'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4" id="cases-stats-strip">
      {metrics.map(metric => {
        const isActive = activeFilter === metric.id;
        const Icon = metric.icon;

        return (
          <div
            key={metric.id}
            onClick={() => onFilterSelect(isActive ? null : metric.id)}
            className={`cursor-pointer p-3.5 rounded-xl border-[2px] flex flex-col justify-between transition-all duration-200 select-none ${
              isActive 
                ? 'border-[#00BCFF] bg-sky-50/40 text-[#00BCFF]' 
                : 'border-slate-100 bg-slate-50/30 hover:bg-slate-50/80 hover:shadow-md hover:border-slate-200 text-slate-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-[#00BCFF]' : 'text-slate-800'}`} />
              <span className={`text-[9px] font-black uppercase py-0.5 px-1.5 rounded-full ${
                isActive ? 'bg-[#00BCFF]/10 text-[#00BCFF]' : 'bg-slate-100 text-slate-800 border'
              }`}>
                {metric.badgeText}
              </span>
            </div>
            
            <div className="mt-3">
              <span className={`block font-black text-2xl tracking-tight ${isActive ? 'text-[#00BCFF]' : 'text-slate-950'}`}>
                {metric.value}
              </span>
              <span className={`block text-[11px] font-bold ${isActive ? 'text-[#00BCFF]' : 'text-slate-950'} truncate mt-0.5`}>
                {metric.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
