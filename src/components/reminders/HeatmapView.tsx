import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, Activity } from 'lucide-react';
import { Deadline } from '../../types';

interface HeatmapViewProps {
  deadlines: Deadline[];
}

export default function HeatmapView({ deadlines }: HeatmapViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();

  const totalDays = getDaysInMonth(month, year);
  const startOffset = getFirstDayOfMonth(month, year);

  // Month grid cells
  const gridDays: Array<{ dayNum: number; isOffset: boolean; dateObject: Date }> = [];

  // Offset cells
  for (let idx = startOffset - 1; idx >= 0; idx--) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const totalDaysPrev = getDaysInMonth(prevMonth, prevYear);
    gridDays.push({
      dayNum: totalDaysPrev - idx,
      isOffset: true,
      dateObject: new Date(prevYear, prevMonth, totalDaysPrev - idx)
    });
  }

  // Active cells
  for (let d = 1; d <= totalDays; d++) {
    gridDays.push({
      dayNum: d,
      isOffset: false,
      dateObject: new Date(year, month, d)
    });
  }

  // Shading logic: Section 6.5
  const getShadingColor = (count: number, isOffset: boolean) => {
    if (isOffset) return 'bg-slate-50 border-transparent text-slate-200';
    if (count === 0) return 'bg-white border-slate-100 text-slate-350 hover:bg-slate-50';
    if (count <= 2) return 'bg-blue-100 border-blue-200 text-blue-800 hover:bg-blue-150';
    if (count <= 4) return 'bg-blue-300 border-blue-400 text-blue-900 hover:bg-blue-350';
    if (count <= 7) return 'bg-blue-500 border-blue-600 text-white hover:bg-blue-550 shadow-xxs';
    return 'bg-blue-900 border-blue-950 text-white hover:bg-slate-900 font-extrabold shadow-sm';
  };

  return (
    <div className="bg-white border text-slate-800 rounded-2xl p-5 shadow-xs transition hover:shadow-sm space-y-4" id="density-heatmap-panel">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b">
        <div className="flex items-center gap-1.5">
          <Activity className="h-5 w-5 text-indigo-600" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Section 3.5: Heatmap Workload Peaks Density</h4>
            <p className="text-[10px] text-slate-400">Instantly visualizes compliance spikes, hearing pileups, and peak stress periods.</p>
          </div>
        </div>

        <div className="flex gap-2 items-center text-xxs font-extrabold select-none">
          <span className="text-slate-450 mr-1 uppercase text-[9px] font-bold">Month scope:</span>
          <button onClick={handlePrevMonth} className="p-1 px-2.5 bg-white border rounded hover:bg-slate-50 cursor-pointer">&larr;</button>
          <span className="text-slate-700 block min-w-[70px] text-center font-mono font-black">{currentDate.toLocaleString('default', { month: 'short' })} {year}</span>
          <button onClick={handleNextMonth} className="p-1 px-2.5 bg-white border rounded hover:bg-slate-50 cursor-pointer">&rarr;</button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider select-none pb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 rounded-xl bg-slate-50 p-1 border">
        {gridDays.map((cell, idx) => {
          const dayStr = cell.dateObject.toISOString().split('T')[0];
          const daily = deadlines.filter(dl => dl.dueDate.startsWith(dayStr));
          const colorClass = getShadingColor(daily.length, cell.isOffset);

          return (
            <div 
              key={idx}
              className={`aspect-square rounded-lg flex flex-col justify-between p-2 cursor-pointer select-none transition border ${colorClass}`}
              title={`${dayStr}: ${daily.length} scheduled lines`}
            >
              <span className="text-[10px] font-mono leading-none block font-extrabold">{cell.dayNum}</span>
              <span className="text-[10px] font-sans font-black leading-none block text-right">
                {daily.length > 0 && `${daily.length}d`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400 pt-2 border-t justify-center select-none">
        <span>Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-white border rounded" />
          <span>0 deadlines</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-blue-100 rounded border border-blue-200" />
          <span>1-2 items</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-blue-300 rounded border border-blue-400" />
          <span>3-4 items</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-blue-500 rounded border border-blue-600" />
          <span>5-7 items</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-blue-900 rounded border border-blue-950" />
          <span>8+ items</span>
        </div>
      </div>
    </div>
  );
}
