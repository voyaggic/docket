import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Eye, Circle, Calendar, Briefcase, ChevronRight } from 'lucide-react';
import { Deadline, Case } from '../../types';

interface TimelineViewProps {
  deadlines: Deadline[];
  cases: Case[];
  roster: any[];
  onOpenMatterSummary: (caseId: string) => void;
}

export default function TimelineView({ 
  deadlines, cases, roster, onOpenMatterSummary 
}: TimelineViewProps) {
  const [zoomLevel, setZoomLevel] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK');
  const [hoveredDeadline, setHoveredDeadline] = useState<Deadline | null>(null);

  // Generates timeline dates context
  const getTimelineDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    
    let spanDays = 14; // Default 'WEEK' looks ahead 14 days
    if (zoomLevel === 'DAY') spanDays = 6;
    if (zoomLevel === 'MONTH') spanDays = 40;

    for (let i = -2; i < spanDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const timelineDates = getTimelineDates();

  return (
    <div className="bg-white border text-slate-800 rounded-2xl p-5 shadow-xs transition hover:shadow-sm space-y-4" id="court-gantt-timeline">
      
      {/* Controls */}
      <div className="flex justify-between items-center pb-2 border-b">
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-5 w-5 text-sky-500" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Section 3.4: Matter Case Gantt Timelines</h4>
            <p className="text-[10px] text-slate-400">Horizontal calendar matrix showing scheduled obligations across active firm portfolios.</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xxs font-extrabold select-none">
          {(['DAY', 'WEEK', 'MONTH'] as const).map(level => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              className={`p-1.5 px-3.5 rounded-md cursor-pointer transition ${zoomLevel === level ? 'bg-sky-500 text-white shadow' : 'text-slate-455 hover:text-slate-700'}`}
            >
              Zoom {level}
            </button>
          ))}
        </div>
      </div>

      {/* Grid container with overflow scroll support */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/50">
        <div className="min-w-[800px] divide-y divide-slate-100 select-none">
          
          {/* Timeline Header Row */}
          <div className="flex items-center bg-slate-100/50">
            {/* Matter Column placeholder */}
            <div className="w-[180px] p-2.5 font-bold text-slate-500 uppercase tracking-wider text-[8px] border-r border-slate-100 whitespace-nowrap shrink-0">
              Active Matter Folder
            </div>
            {/* Horizontal Timeline cells */}
            <div className="flex-1 flex justify-around">
              {timelineDates.map((dateVal, dIdx) => {
                const isToday = dateVal.toDateString() === new Date().toDateString();
                return (
                  <div 
                    key={dIdx} 
                    className={`flex-1 p-2 text-center border-r border-slate-105 last:border-r-0 text-[8px] flex flex-col justify-center items-center ${isToday ? 'bg-sky-50 text-sky-800 font-black' : 'text-slate-400'}`}
                  >
                    <span className="uppercase block font-bold text-[7px]">{dateVal.toLocaleString('default', { weekday: 'short' })}</span>
                    <span className="text-xs block font-mono font-black mt-0.5">{dateVal.getDate()}</span>
                    <span className="text-[7px] tracking-tight font-extrabold block">{dateVal.toLocaleString('default', { month: 'short' })}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cases Rows */}
          {cases.map(cs => {
            const caseDeadlines = deadlines.filter(d => d.caseId === cs.id);
            return (
              <div key={cs.id} className="flex items-center hover:bg-slate-50 bg-white transition group">
                {/* Matter Identity Name */}
                <div className="w-[180px] p-3 text-xxs border-r border-slate-100 shrink-0 flex flex-col justify-between h-[64px]">
                  <div className="space-y-0.5">
                    <span className="font-mono text-[9px] font-bold text-sky-600 block tracking-tight">{cs.referenceNumber}</span>
                    <p className="font-extrabold text-slate-850 line-clamp-1">{(cs as any).client?.fullName || 'Matter folder'}</p>
                  </div>
                  <button 
                    onClick={() => onOpenMatterSummary(cs.id)}
                    className="text-[8px] uppercase tracking-wider font-extrabold text-slate-455 hover:text-sky-600 flex items-center gap-0.5 self-start cursor-pointer group-hover:underline"
                  >
                    <span>Inspect folder</span>
                    <ChevronRight className="h-2.5 w-2.5" />
                  </button>
                </div>

                {/* Deadlines horizontal points plotting */}
                <div className="flex-1 h-[64px] flex justify-around relative">
                  {timelineDates.map((colDate, colIdx) => {
                    const colDayStr = colDate.toISOString().split('T')[0];
                    const matchingMap = caseDeadlines.filter(dl => dl.dueDate.startsWith(colDayStr));
                    const isToday = colDayStr === new Date().toISOString().split('T')[0];

                    return (
                      <div 
                        key={colIdx} 
                        className={`flex-1 border-r border-slate-100 last:border-r-0 flex flex-col justify-center items-center gap-1.5 p-1 relative ${isToday ? 'bg-sky-50/15' : ''}`}
                      >
                        {matchingMap.map(dl => {
                          const statusIconColor = dl.isResolved ? 'bg-emerald-500' : 'bg-red-500';
                          return (
                            <button
                              key={dl.id}
                              type="button"
                              onClick={() => setHoveredDeadline(dl)}
                              onMouseEnter={() => setHoveredDeadline(dl)}
                              className={`h-3.5 w-3.5 rounded-full ${statusIconColor} ring-2 ring-slate-200 text-white cursor-pointer transition active:scale-95 shadow-md flex items-center justify-center`}
                              title={`${dl.title} • ${dl.deadlineType}`}
                            >
                              <span className="text-[7.5px] font-black">{dl.isResolved ? '✓' : '!'}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {cases.length === 0 && (
            <div className="text-center py-10 text-slate-400 font-medium">No cases found in this context. Create one first!</div>
          )}

        </div>
      </div>

      {/* DETAIL DISPLAY DRILLDOWN tooltip */}
      {hoveredDeadline && (
        <div className="p-3 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl space-y-1.5 animate-fade-in text-xxs flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[8px] uppercase font-black text-teal-400 bg-teal-900/40 border border-teal-800 px-1.5 rounded tracking-wider">
              {hoveredDeadline.deadlineType || 'Task'}
            </span>
            <p className="font-extrabold text-sm text-white">{hoveredDeadline.title}</p>
            <p className="text-slate-400 font-mono">Date limits: {hoveredDeadline.dueDate.replace('T', ' ')} &bull; ID: {hoveredDeadline.id}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setHoveredDeadline(null)} 
            className="text-white bg-slate-800 hover:bg-slate-700 p-1 rounded font-black cursor-pointer"
          >
            &times; Close view
          </button>
        </div>
      )}

    </div>
  );
}
