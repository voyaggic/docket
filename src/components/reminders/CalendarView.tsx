import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, AlertTriangle, Users, HeartCrack, Info, Plus 
} from 'lucide-react';
import { Deadline, Case } from '../../types';

interface CalendarViewProps {
  deadlines: Deadline[];
  cases: Case[];
  roster: any[];
  onResolve: (id: string) => void;
  onReschedule: (id: string, newDate: string) => void;
  onOpenQuickAdd: (dayString: string) => void;
}

export default function CalendarView({ 
  deadlines, cases, roster, onResolve, onReschedule, onOpenQuickAdd 
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'MONTH' | 'WEEK' | 'DAY'>('MONTH');
  const [selectedDayObj, setSelectedDayObj] = useState<Date | null>(null);

  // Hardcoded holidays & court vacation periods overlay as defined in Section 14
  const holidays = [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-05-25', name: "Memorial Day Holiday" },
    { date: '2026-07-04', name: "Independence Day Holiday" },
    { date: '2026-12-25', name: "Christmas Day Holiday" }
  ];

  const vacations = [
    { start: '2026-08-01', end: '2026-08-15', name: "Supreme Court Summer Vacation" }
  ];

  const helperIsHoliday = (d: Date) => {
    const check = d.toISOString().split('T')[0];
    return holidays.find(h => h.date === check);
  };

  const helperIsVacation = (d: Date) => {
    const checkStr = d.toISOString().split('T')[0];
    return vacations.find(v => checkStr >= v.start && checkStr <= v.end);
  };

  // Month navigation logic
  const handlePrev = () => {
    const nextDate = new Date(currentDate);
    if (viewType === 'MONTH') {
      nextDate.setMonth(nextDate.getMonth() - 1);
    } else if (viewType === 'WEEK') {
      nextDate.setDate(nextDate.getDate() - 7);
    } else {
      nextDate.setDate(nextDate.getDate() - 1);
    }
    setCurrentDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (viewType === 'MONTH') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (viewType === 'WEEK') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    setCurrentDate(nextDate);
  };

  const handleReturnToday = () => {
    setCurrentDate(new Date());
    setSelectedDayObj(null);
  };

  // Month stats
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();

  const totalDays = getDaysInMonth(month, year);
  const startDayIndex = getFirstDayOfMonth(month, year);

  // Month calendar grid days builder
  const gridCells: Array<{ dayNum: number; dateObject: Date; isOffset: boolean }> = [];
  
  // Previous Month's offset cells
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonthTotalDays = getDaysInMonth(prevMonth, prevMonthYear);
  for (let idx = startDayIndex - 1; idx >= 0; idx--) {
    const d = prevMonthTotalDays - idx;
    gridCells.push({
      dayNum: d,
      dateObject: new Date(prevMonthYear, prevMonth, d),
      isOffset: true
    });
  }

  // Active Month's cells
  for (let d = 1; d <= totalDays; d++) {
    gridCells.push({
      dayNum: d,
      dateObject: new Date(year, month, d),
      isOffset: false
    });
  }

  // Helper resource conflict detector:
  // Returns lawyers with more than 1 deadline assigned on date
  const computeConflictsForDate = (dateString: string) => {
    const targetDeadlines = deadlines.filter(d => d.dueDate.startsWith(dateString) && !d.isResolved);
    const counts: Record<string, number> = {};
    for (const d of targetDeadlines) {
      const matchCase = cases.find(c => c.id === d.caseId);
      const lawyerId = matchCase?.assignedLawyerId || 'unassigned';
      counts[lawyerId] = (counts[lawyerId] || 0) + 1;
    }
    const conflictedKeys = Object.keys(counts).filter(key => counts[key] > 1);
    return conflictedKeys.map(k => roster.find(u => u.id === k)?.fullName || 'Unassigned Lawyer');
  };

  return (
    <div className="bg-white border rounded-2xl p-5 shadow-xs transition hover:shadow-sm space-y-4" id="court-calendar-manager">
      
      {/* Calendar Header with Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Section 3.3: Court Calendars Overlay</h3>
            <p className="text-[10px] text-slate-400 font-semibold">
              {viewType === 'MONTH' && `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`}
              {viewType === 'WEEK' && `Week of ${currentDate.toLocaleDateString()}`}
              {viewType === 'DAY' && `Day detail: ${currentDate.toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xxs font-extrabold select-none">
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {(['MONTH', 'WEEK', 'DAY'] as const).map(vt => (
              <button
                key={vt}
                onClick={() => setViewType(vt)}
                className={`p-1.5 px-3.5 rounded-md cursor-pointer transition ${viewType === vt ? 'bg-white shadow text-slate-800' : 'text-slate-450 hover:text-slate-700'}`}
              >
                {vt}
              </button>
            ))}
          </div>

          <button onClick={handlePrev} className="p-1 px-3 bg-white border border-slate-205 rounded-lg hover:bg-slate-50 cursor-pointer">&larr; Prev</button>
          <button onClick={handleReturnToday} className="p-1 px-3 bg-white border border-slate-205 rounded-lg hover:bg-slate-50 cursor-pointer">Today</button>
          <button onClick={handleNext} className="p-1 px-3 bg-white border border-slate-205 rounded-lg hover:bg-slate-50 cursor-pointer">Next &rarr;</button>
        </div>
      </div>

      {/* RENDER VIEWMODE 1: MONTHLY GRID */}
      {viewType === 'MONTH' && (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 rounded-xl overflow-hidden bg-slate-100/50 p-1 border">
            {gridCells.map((cell, index) => {
              const dayStr = cell.dateObject.toISOString().split('T')[0];
              const daily = deadlines.filter(d => d.dueDate.startsWith(dayStr));
              const isToday = dayStr === new Date().toISOString().split('T')[0];
              const holidayObj = helperIsHoliday(cell.dateObject);
              const vacationObj = helperIsVacation(cell.dateObject);
              const conflicts = computeConflictsForDate(dayStr);

              // Shading density background
              let densityColor = 'bg-white';
              if (!cell.isOffset) {
                if (daily.length === 1) densityColor = 'bg-blue-50/40 hover:bg-blue-100/40';
                else if (daily.length === 2) densityColor = 'bg-blue-50 hover:bg-blue-100';
                else if (daily.length >= 3) densityColor = 'bg-indigo-50 hover:bg-indigo-100';
              } else {
                densityColor = 'bg-slate-50/55 hover:bg-slate-100/10 text-slate-350';
              }

              return (
                <div 
                  key={index}
                  onClick={() => setSelectedDayObj(cell.dateObject)}
                  className={`aspect-square p-1.5 border border-slate-100 rounded-lg flex flex-col justify-between overflow-hidden relative group cursor-pointer transition ${densityColor} ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                >
                  <div className="flex justify-between items-start text-[10px] font-mono">
                    <span className={`font-black ${cell.isOffset ? 'text-slate-300' : 'text-slate-600'}`}>{cell.dayNum}</span>
                    {conflicts.length > 0 && (
                      <span className="h-4 w-4 bg-red-100 border border-red-200 text-red-700 flex items-center justify-center rounded-full animate-bounce" title={`Workload overlap conflict detail: ${conflicts.join(', ')}`}>
                        <AlertTriangle className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Shading/flags */}
                  <div className="space-y-0.5 overflow-hidden flex-1 flex flex-col justify-end">
                    {holidayObj && (
                      <span className="bg-red-50 text-red-700 text-[8px] font-black px-1 rounded block truncate tracking-tight text-center">
                        🎉 {holidayObj.name}
                      </span>
                    )}
                    {vacationObj && (
                      <span className="bg-orange-50 text-orange-850 text-[8px] font-black px-1 rounded block truncate tracking-tight text-center">
                        Court Rest
                      </span>
                    )}
                    {daily.slice(0, 2).map(dl => (
                      <div 
                        key={dl.id}
                        className={`text-[8px] p-0.5 rounded px-1 flex items-center gap-0.5 font-bold truncate tracking-tight uppercase leading-none border ${
                          dl.isResolved 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-150' 
                            : 'bg-white shadow-xxs border-slate-205 text-slate-700'
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${dl.isResolved ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="truncate">{dl.title}</span>
                      </div>
                    ))}
                    {daily.length > 2 && (
                      <span className="text-[8px] text-indigo-700 font-extrabold text-right block self-end bg-indigo-50 px-1 rounded border border-indigo-150">
                        +{daily.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER VIEWMODE 2: WEEKLY PORTRAIT */}
      {viewType === 'WEEK' && (
        <div className="grid grid-cols-7 gap-2 border bg-slate-50 p-2 rounded-xl text-xxs font-semibold">
          {Array.from({ length: 7 }).map((_, wIdx) => {
            const startWeek = new Date(currentDate);
            const currentDay = startWeek.getDay();
            startWeek.setDate(startWeek.getDate() - currentDay + wIdx);

            const dayStr = startWeek.toISOString().split('T')[0];
            const daily = deadlines.filter(d => d.dueDate.startsWith(dayStr));
            const isToday = dayStr === new Date().toISOString().split('T')[0];
            const holidayObj = helperIsHoliday(startWeek);

            return (
              <div 
                key={wIdx} 
                onClick={() => setSelectedDayObj(startWeek)}
                className={`bg-white p-3.5 border rounded-xl space-y-3 cursor-pointer min-h-[160px] relative ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
              >
                <div className="border-b pb-1">
                  <span className="block text-[8px] font-black uppercase text-slate-400">
                    {startWeek.toLocaleString('default', { weekday: 'short' })}
                  </span>
                  <span className="text-xs font-black text-slate-800 font-mono block leading-none">{startWeek.getDate()}</span>
                </div>

                {holidayObj && (
                  <span className="text-[8px] bg-red-50 text-red-700 px-1 py-0.5 rounded block text-center font-bold">
                    {holidayObj.name}
                  </span>
                )}

                <div className="space-y-1">
                  {daily.map(dl => (
                    <div 
                      key={dl.id}
                      className={`p-1.5 rounded border flex flex-col gap-0.5 text-[8.5px] font-medium ${
                        dl.isResolved 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-150 line-through' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350'
                      }`}
                    >
                      <span className="font-extrabold block truncate leading-none mb-0.5">{dl.title}</span>
                      <span className="text-[7.5px] text-slate-400 font-mono">
                        {dl.dueDate.split('T')[1] || '09:00'}
                      </span>
                    </div>
                  ))}
                  {daily.length === 0 && (
                    <span className="text-[8px] italic text-slate-400 block text-center pt-8">No events</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RENDER VIEWMODE 3: DAY VIEW LISTING */}
      {viewType === 'DAY' && (
        <div className="p-4 bg-slate-50 border rounded-xl space-y-2 animate-fade-in text-xxs">
          <span className="font-black text-slate-450 uppercase block tracking-wider text-[9px]">Dockets listed for {currentDate.toDateString()}</span>
          <div className="space-y-2">
            {deadlines.filter(dl => dl.dueDate.startsWith(currentDate.toISOString().split('T')[0])).map(dl => (
              <div key={dl.id} className="p-4 bg-white border rounded-xl flex justify-between items-center gap-2 h-auto text-xs shadow-xxs">
                <div className="space-y-1">
                  <span className="text-[10px] bg-slate-100 uppercase tracking-widest text-slate-500 font-black px-1.5 py-0.5 rounded">
                    {dl.deadlineType || 'Court Pleading'}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm">{dl.title}</h4>
                  <span className="text-xxs text-slate-400 font-mono block">Planned: {dl.dueDate.replace('T', ' ')}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!dl.isResolved && (
                    <button 
                      onClick={() => onResolve(dl.id)}
                      className="p-1 px-3 bg-indigo-650 text-white rounded text-xxs font-bold hover:bg-indigo-700 cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  )}
                  <input 
                    type="date" 
                    onChange={e => onReschedule(dl.id, e.target.value)}
                    className="p-1 bg-slate-50 border rounded text-xxs cursor-pointer max-w-[120px]"
                  />
                </div>
              </div>
            ))}
            {deadlines.filter(dl => dl.dueDate.startsWith(currentDate.toISOString().split('T')[0])).length === 0 && (
              <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed">
                Perfect! No court filings or mentions scheduled on this calendar directory date.
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAILED DAY MODAL ANCHOR FOR CLICKED DATE */}
      {selectedDayObj && (
        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3.5 animate-fade-in select-none">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <div>
              <span className="text-teal-400 text-[9px] uppercase font-black block tracking-widest">Selected date directory audit</span>
              <h4 className="text-xs font-black">{selectedDayObj.toDateString()}</h4>
            </div>
            <button 
              onClick={() => setSelectedDayObj(null)}
              className="text-white hover:text-red-400 font-bold p-1 bg-white/10 hover:bg-white/20 rounded"
            >
              Close &times;
            </button>
          </div>

          <div className="space-y-2 max-h-[180px] overflow-y-auto">
            {deadlines.filter(dl => dl.dueDate.startsWith(selectedDayObj.toISOString().split('T')[0])).map(dl => {
              const matchedCase = cases.find(c => c.id === dl.caseId);
              const responsibleLawyer = roster.find(u => u.id === matchedCase?.assignedLawyerId)?.fullName || 'Unassigned Attorney';

              return (
                <div key={dl.id} className="p-2.5 bg-slate-850 rounded-lg border border-slate-705 flex justify-between items-center text-[11px] gap-2">
                  <div className="space-y-1">
                    <span className="text-[8px] bg-indigo-900 border border-indigo-700 text-indigo-200 px-1 rounded uppercase tracking-wide">
                      {dl.deadlineType || 'Obligation'}
                    </span>
                    <p className="font-extrabold text-white text-[11px]">{dl.title}</p>
                    <p className="text-[9px] text-slate-400">Matter: {matchedCase?.referenceNumber || 'Generic'} &bull; Representative: {responsibleLawyer}</p>
                  </div>

                  <div className="flex gap-1">
                    {!dl.isResolved && (
                      <button 
                        onClick={() => {
                          onResolve(dl.id);
                          setSelectedDayObj(null);
                        }}
                        className="bg-emerald-600 text-white p-1 text-[9px] rounded font-black px-2 hover:bg-emerald-700"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {deadlines.filter(dl => dl.dueDate.startsWith(selectedDayObj.toISOString().split('T')[0])).length === 0 && (
              <p className="text-center text-slate-450 italic py-4">No deadlines recorded on this day. Perfect for workload planning.</p>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-white/10">
            <button 
              onClick={() => {
                onOpenQuickAdd(selectedDayObj.toISOString().split('T')[0]);
                setSelectedDayObj(null);
              }}
              className="p-1 px-3 bg-teal-600 text-white text-[9px] font-black rounded hover:bg-teal-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add deadline on this date</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
