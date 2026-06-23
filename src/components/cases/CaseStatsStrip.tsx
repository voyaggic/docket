import React from 'react';
import { Briefcase, Clock, Send, RefreshCw, CheckCircle2, User, UserX } from 'lucide-react';
import { Case } from '../../types';

interface CaseStatsStripProps {
  cases: Case[];
  activeFilter: string | null;
  onFilterSelect: (filterType: string | null) => void;
  lawyersCount?: number;
}

export default function CaseStatsStrip({ cases, activeFilter, onFilterSelect, lawyersCount = 4 }: CaseStatsStripProps) {
  // Compute active matters
  const activeCases = cases.filter(c => c.status === 'ACTIVE' && !(c as any).isArchived);
  
  // Simulated deadlines this week
  const deadlinesThisWeek = cases.filter(c => {
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

  // Closed cases
  const closedCases = cases.filter(c => c.status === 'CLOSED');

  // Assigned cases
  const assignedCases = cases.filter(c => c.assignedLawyerId && c.status === 'ACTIVE' && !(c as any).isArchived);

  const metrics = [
    {
      id: 'active',
      title: 'Active cases',
      value: activeCases.length,
      icon: Briefcase,
      accentColor: '#22c55e',
      bgClass: 'bg-[#f0fdf4]',
      borderLeftClass: 'border-l-[#22c55e]',
      badgeText: 'Live tracking'
    },
    {
      id: 'deadlines',
      title: 'This week',
      value: deadlinesThisWeek.length,
      icon: Clock,
      accentColor: '#3b82f6',
      bgClass: 'bg-[#eff6ff]',
      borderLeftClass: 'border-l-[#3b82f6]',
      badgeText: '7 days buffer'
    },
    {
      id: 'updates',
      title: 'Pending update',
      value: pendingUpdates.length,
      icon: Send,
      accentColor: '#f59e0b',
      bgClass: 'bg-[#fffbeb]',
      borderLeftClass: 'border-l-[#f59e0b]',
      badgeText: 'Awaiting send'
    },
    {
      id: 'opened',
      title: 'Open this month',
      value: openedThisMonth.length,
      icon: RefreshCw,
      accentColor: '#8b5cf6',
      bgClass: 'bg-[#f5f3ff]',
      borderLeftClass: 'border-l-[#8b5cf6]',
      badgeText: 'Growth factor'
    },
    {
      id: 'closed',
      title: 'Closed',
      value: closedCases.length,
      icon: CheckCircle2,
      accentColor: '#6b7280',
      bgClass: 'bg-[#f9fafb]',
      borderLeftClass: 'border-l-[#6b7280]',
      badgeText: 'Completed'
    },
    {
      id: 'assigned',
      title: 'Assigned',
      value: assignedCases.length,
      icon: User,
      accentColor: '#0ea5e9',
      bgClass: 'bg-[#f0f9ff]',
      borderLeftClass: 'border-l-[#0ea5e9]',
      badgeText: 'Assigned staff'
    },
    {
      id: 'members',
      title: 'Members/Agents',
      value: lawyersCount,
      icon: User,
      accentColor: '#ec4899',
      bgClass: 'bg-[#fdf2f8]',
      borderLeftClass: 'border-l-[#ec4899]',
      badgeText: 'Team size'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4" id="cases-stats-strip">
      {metrics.map(metric => {
        const isActive = activeFilter === metric.id;
        const Icon = metric.icon;
        
        // Define exact color specifications from Section 1
        const stylesMap: Record<string, { border: string, bg: string }> = {
          active: { border: '#22c55e', bg: '#f0fdf4' },
          deadlines: { border: '#3b82f6', bg: '#eff6ff' },
          updates: { border: '#f59e0b', bg: '#fffbeb' },
          opened: { border: '#8b5cf6', bg: '#f5f3ff' },
          closed: { border: '#6b7280', bg: '#f9fafb' },
          assigned: { border: '#0ea5e9', bg: '#f0f9ff' },
          members: { border: '#ec4899', bg: '#fdf2f8' },
        };
        const currentStyle = stylesMap[metric.id] || { border: metric.accentColor, bg: '#ffffff' };

        return (
          <div
            key={metric.id}
            onClick={() => onFilterSelect(isActive ? null : metric.id)}
            className={`top-stat-card cursor-pointer p-3.5 flex flex-col justify-between transition-all duration-200 select-none ${
              isActive 
                ? 'ring-2 ring-indigo-550 ring-offset-1 scale-[1.02]' 
                : 'hover:scale-[1.01]'
            }`}
            style={{
              border: '1px solid #e5e7eb',
              borderLeft: `4px solid ${currentStyle.border}`,
              borderRadius: '12px',
              backgroundColor: currentStyle.bg,
              boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
            }}
          >
            <div className="flex items-center justify-between">
              <Icon className="h-4.5 w-4.5 shrink-0" style={{ color: currentStyle.border }} />
              <span className="text-[9px] font-black uppercase py-0.5 px-2 rounded bg-slate-950 text-white border border-slate-800 select-none">
                {metric.badgeText}
              </span>
            </div>
            
            <div className="mt-3">
              <span className="block font-black text-2xl tracking-tight text-slate-950">
                {metric.value}
              </span>
              <span className="block text-[11px] font-bold text-slate-950 truncate mt-0.5">
                {metric.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
