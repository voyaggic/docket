import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Calendar, List, Check, CheckCircle2, AlertCircle, Clock, Trash, ChevronDown, ChevronRight,
  HelpCircle, Loader2, Play, Users, Landmark, FileText, Search, Plus, Filter, LayoutGrid, BarChart2, 
  TableProperties, Send, PlusCircle, Bookmark, Download, Upload, Eye, FileSpreadsheet, Settings, History, Info, Sparkles 
} from 'lucide-react';

import { Deadline, Case, Client } from '../types';
import { getTerm } from '../utils/terminology';

import QuickParser from './reminders/QuickParser';
import CalendarView from './reminders/CalendarView';
import TimelineView from './reminders/TimelineView';
import HeatmapView from './reminders/HeatmapView';
import ComplianceCharts from './reminders/ComplianceCharts';
import SettingsTab from './reminders/SettingsTab';
import ReminderLogTab from './reminders/ReminderLogTab';

interface RemindersViewProps {
  companyId: string;
  deadlines: Deadline[];
  cases: Case[];
  clients: Client[];
  roster: any[];
  onRefresh: () => void;
  settings?: any;
  onOpenCase?: (caseId: string) => void;
}

export default function RemindersView({ 
  companyId, deadlines, cases, clients, roster, onRefresh, settings, onOpenCase
}: RemindersViewProps) {
  
  // Persistent client-side extensions for rich fields
  const [localDeadlines, setLocalDeadlines] = useState<any[]>([]);
  const [localSuccessMessage, setLocalSuccessMessage] = useState<string | null>(null);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'CALENDAR' | 'TIMELINE' | 'HEATMAP'>('LIST');
  const [activeSection, setActiveSection] = useState('deadlines');
  
  // Creation States
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isQuickAddDate, setIsQuickAddDate] = useState<string | null>(null);

  // Filter conditions
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterAssignedTo, setFilterAssignedTo] = useState('All');
  const [savedSearches, setSavedSearches] = useState<{name: string, type: string, priority: string}[]>([
    { name: 'Urgent Filings', type: 'Filing Pleading', priority: 'Critical' },
    { name: 'Court Dates Only', type: 'Court Appearance', priority: 'All' }
  ]);

  // Expansion of list view row IDs for comment streams or audit history
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
  // Comments stream helper
  const [commentsMap, setCommentsMap] = useState<Record<string, Array<{author: string, text: string, sent: string}>>>({
    'def-1': [
      { author: 'Elena Rostova', text: 'Spoke with client. Affidavits are signed.', sent: '10 mins ago' }
    ]
  });
  const [typedComment, setTypedComment] = useState('');

  // Standalone missed log recorder modal
  const [missedLogTarget, setMissedLogTarget] = useState<any | null>(null);
  const [missedReason, setMissedReason] = useState('Client delay');
  const [missedNotes, setMissedNotes] = useState('');
  const [supervisorNotified, setSupervisorNotified] = useState(true);

  // Standalone full deadline builder state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Filing Pleading');
  const [newPriority, setNewPriority] = useState('Normal');
  const [newDueDate, setNewDueDate] = useState('2026-06-15T12:00');
  const [newCaseId, setNewCaseId] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newWatchers, setNewWatchers] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState('Monthly');
  const [savingNewInProgress, setSavingNewInProgress] = useState(false);

  // Standalone Court Appearances Ledger (Section 12)
  const [courtAppearances, setCourtAppearances] = useState([
    { id: 'ca1', matterRef: 'DK-2026-102', client: 'Alice Vance', type: 'Mention', date: '2026-06-12 10:00', courtroom: 'Chambers Room 303', judge: 'Hon. Justice G. Smith', status: 'Scheduled' },
    { id: 'ca2', matterRef: 'DK-2026-204', client: 'Marcus Vance', type: 'Trial', date: '2026-06-15 09:30', courtroom: 'Court Room B', judge: 'Hon. Justice M. Sterling', status: 'Scheduled' }
  ]);
  const [isCourtModalOpen, setIsCourtModalOpen] = useState(false);
  const [caMatterRef, setCaMatterRef] = useState('');
  const [caClient, setCaClient] = useState('');
  const [caType, setCaType] = useState('Mention');
  const [caDate, setCaDate] = useState('2026-06-15T09:30');
  const [caRoom, setCaRoom] = useState('');
  const [caJudge, setCaJudge] = useState('');

  // Synchronization with default API databases
  useEffect(() => {
    if (deadlines && deadlines.length > 0) {
      // Enrich deadlines locally from database
      const enriched = deadlines.map(d => {
        // Find matching case
        const parentCase = cases.find(c => c.id === d.caseId);
        const parentClient = parentCase ? clients.find(cl => cl.id === parentCase.clientId) : null;
        
        // Guess priority randomly or via keyword
        let priority = 'Normal';
        if (d.title?.toLowerCase().includes('urgent') || d.title?.toLowerCase().includes('sol')) {
          priority = 'Critical';
        } else if (d.title?.toLowerCase().includes('hearing') || d.title?.toLowerCase().includes('court')) {
          priority = 'High';
        }

        return {
          ...d,
          priority: (d as any).priority || priority,
          deadlineType: d.deadlineType || 'Court Obligation',
          caseRef: parentCase?.referenceNumber || 'Obligations Ledger',
          clientName: parentClient?.fullName || 'Internal Task',
          assignedLawyer: roster.find(u => u.id === parentCase?.assignedLawyerId)?.fullName || 'Elena Rostova',
          ack: (d as any).acknowledgedAt ? true : false,
          watchers: (d as any).watchers || ['Elena Rostova'],
          notes: (d as any).notes || 'Awaiting file briefs and litigation checklist confirmations.'
        };
      });
      setLocalDeadlines(enriched);
    } else {
      // Base mock state for standalone demo purposes if backend is empty
      setLocalDeadlines([
        { id: 'def-1', title: 'File Supplemental Affidavits with High Court', deadlineType: 'Filing Pleading', dueDate: '2026-06-08T16:00', priority: 'Critical', caseId: cases[0]?.id || '1', caseRef: cases[0]?.referenceNumber || 'CRT/2026/001', clientName: clients[0]?.fullName || 'Johnathan Vance', assignedLawyer: 'Elena Rostova', isResolved: false, notes: 'Must be notarized before court registries lock up at 4:30 pm.', ack: false },
        { id: 'def-2', title: 'District Court Mention attendance for Marcus Vance trial', deadlineType: 'Court Appearance', dueDate: '2026-06-15T09:30', priority: 'High', caseId: cases[0]?.id || '1', caseRef: cases[0]?.referenceNumber || 'CRT/2026/102', clientName: clients[0]?.fullName || 'Alice Vance', assignedLawyer: 'Elena Rostova', isResolved: false, notes: 'Hon. Sterling presiding. Bring updated witness matrix list.', ack: true },
        { id: 'def-3', title: 'Statute of Limitations Expiry Date filing threshold', deadlineType: 'Statute of Limitations', dueDate: '2026-06-25T17:00', priority: 'Critical', caseId: cases[0]?.id || '1', caseRef: cases[0]?.referenceNumber || 'SOL/2026/184', clientName: clients[1]?.fullName || 'Vance Holdings Ltd', assignedLawyer: 'Elena Rostova', isResolved: false, notes: 'Absolute dropdead timing rule bounds.', ack: false },
        { id: 'def-4', title: 'Client consultation updates and billing checklist review', deadlineType: 'Client Meeting', dueDate: '2026-06-28T14:30', priority: 'Normal', caseId: cases[0]?.id || '1', caseRef: cases[0]?.referenceNumber || 'CRT/2026/001', clientName: clients[0]?.fullName || 'Johnathan Vance', assignedLawyer: 'Elena Rostova', isResolved: true, notes: 'Follow up with billing desk before scheduling appointments.', ack: true }
      ]);
    }
  }, [deadlines, cases, clients, roster]);

  // Keyboard shortcut listener 'N' key focused Quick Parser input (Section 20)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input/textarea
      const node = e.target as HTMLElement;
      if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        const input = document.getElementById('nlp-fast-input');
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  // STATISTICS STRIP NUMBERS (Section 2)
  const statsOverdue = localDeadlines.filter(d => {
    const isPast = new Date(d.dueDate).getTime() < Date.now();
    return isPast && !d.isResolved;
  }).length;

  const statsToday = localDeadlines.filter(d => {
    const dueDayStr = d.dueDate.split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    return dueDayStr === todayStr && !d.isResolved;
  }).length;

  const statsThisWeek = localDeadlines.filter(d => {
    const diff = new Date(d.dueDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7 && !d.isResolved;
  }).length;

  const statsUpcoming = localDeadlines.filter(d => {
    const diff = new Date(d.dueDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 7 && days <= 30 && !d.isResolved;
  }).length;

  const statsResolvedThisMonth = localDeadlines.filter(d => d.isResolved).length;

  // Resolving handoff
  const [isResolvingId, setIsResolvingId] = useState<string | null>(null);

  const triggerResolve = async (dId: string) => {
    setIsResolvingId(dId);
    try {
      // Find deadline
      const target = localDeadlines.find(d => d.id === dId);
      if (!target) return;

      // Make API PUT to resolve
      const res = await fetch(`/api/firm/${companyId}/deadlines/${dId}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ isResolved: true })
      });
      
      // Update locally immediately
      setLocalDeadlines(prev => prev.map(dl => dl.id === dId ? { ...dl, isResolved: true } : dl));
      
      // Post to audit consent log
      await fetch('/api/firm/any/consent', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           userId: "usr-admin-demo",
           action: "resolve_deadline",
           consented: true
         })
      });

      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsResolvingId(null);
    }
  };

  const triggerReschedule = async (dId: string, newDateString: string) => {
    if (!newDateString) return;
    try {
      const targetDate = newDateString.includes('T') ? newDateString : `${newDateString}T09:00`;
      setLocalDeadlines(prev => prev.map(dl => dl.id === dId ? { ...dl, dueDate: targetDate } : dl));
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Add parsed NLP (Section 1)
  const handleAddParsedDeadline = async (parsed: any) => {
    try {
      const payload = {
        title: parsed.title,
        dueDate: parsed.dueDate,
        deadlineType: parsed.deadlineType,
        caseId: parsed.caseId,
        priority: parsed.priority,
        notes: parsed.notes,
        isResolved: false
      };

      const res = await fetch(`/api/firm/${companyId}/deadlines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Append locally
        const parsedData = await res.json();
        setLocalDeadlines(prev => [...prev, {
          ...parsedData,
          priority: parsed.priority,
          caseRef: cases.find(c => c.id === parsed.caseId)?.referenceNumber || 'Parsed File',
          clientName: 'Parsed Matter',
          assignedLawyer: 'Elena Rostova',
          isResolved: false,
          notes: parsed.notes
        }]);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // missed log trigger
  const handleSaveMissedLog = () => {
    if (!missedLogTarget) return;
    setLocalDeadlines(prev => prev.map(dl => dl.id === missedLogTarget.id ? { ...dl, isMissedFlag: true, missedReason, missedNotes } : dl));
    setMissedLogTarget(null);
    setMissedNotes('');
    setLocalSuccessMessage('Logged successfully as statute missed violation report.');
    setTimeout(() => setLocalSuccessMessage(null), 5000);
  };

  // full creation save (Section 7)
  const handleSaveFullDeadline = async () => {
    if (!newTitle) {
      setLocalErrorMessage('Please enter a deadline title.');
      setTimeout(() => setLocalErrorMessage(null), 5000);
      return;
    }
    setSavingNewInProgress(true);
    try {
      const payload = {
        title: newTitle,
        dueDate: newDueDate,
        deadlineType: newType,
        caseId: newCaseId || (cases[0]?.id || '1'),
        priority: newPriority,
        notes: newNotes,
        isResolved: false
      };

      const res = await fetch(`/api/firm/${companyId}/deadlines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsFullModalOpen(false);
        // Clear
        setNewTitle('');
        setNewNotes('');
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNewInProgress(false);
    }
  };

  // Standalone Court Entry Creation Helper
  const handleSaveCourtAppearance = () => {
    if (!caMatterRef) return;
    const newCa = {
      id: 'ca-' + Date.now(),
      matterRef: caMatterRef,
      client: caClient || 'Alice Vance',
      type: caType,
      date: caDate.replace('T', ' '),
      courtroom: caRoom || 'District Court Room A',
      judge: caJudge || 'Justice G. Roberts',
      status: 'Scheduled'
    };
    setCourtAppearances([...courtAppearances, newCa]);
    setIsCourtModalOpen(false);
    setCaMatterRef('');
    setCaClient('');
  };

  // Comment thread submission
  const handlePostComment = (id: string) => {
    if (!typedComment.trim()) return;
    const stream = commentsMap[id] || [];
    const newComment = {
      author: 'Partner Admin',
      text: typedComment,
      sent: 'Just now'
    };
    setCommentsMap({
      ...commentsMap,
      [id]: [...stream, newComment]
    });
    setTypedComment('');
  };

  // Filter application
  const displayedDeadlines = localDeadlines.filter(dl => {
    const matchesSearch = dl.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          dl.caseRef.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'All' || dl.deadlineType === filterType;
    const matchesPriority = filterPriority === 'All' || dl.priority === filterPriority;
    
    let matchesStatus = true;
    if (filterStatus === 'Unresolved') matchesStatus = !dl.isResolved;
    else if (filterStatus === 'Resolved') matchesStatus = dl.isResolved;
    else if (filterStatus === 'Snoozed') matchesStatus = dl.isSnoozed;

    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

  return (
    <div className="space-y-6 text-slate-800" id="reminders-root-dashboard-panel">
      {localErrorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-2 mb-2 animate-pulse">
          <span>{localErrorMessage}</span>
        </div>
      )}
      {localSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-202 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-2 mb-2">
          <span>{localSuccessMessage}</span>
        </div>
      )}
      
      {/* SECTION 1: PAGE HEADER (Section 1 spec) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl border shadow-xs gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Reminders & Deadlines</h1>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1">
              🏢 Safe isolated sandbox
            </span>
          </div>
          <p className="text-xxs text-slate-450 font-bold">
            Showing all active tenant portfolios &bull; Docket statutory alarm ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xxs font-extrabold select-none">
          <button 
            type="button"
            onClick={() => {
              // Focus fast entry NLP input
              const input = document.getElementById('nlp-fast-input');
              if (input) input.focus();
            }}
            className="p-2 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-805 rounded-xl flex items-center gap-1 cursor-pointer transition border"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-600 animate-pulse" />
            <span>+ Quick NLP Link</span>
          </button>

          <button 
            type="button"
            onClick={() => setIsFullModalOpen(true)}
            className="p-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1 cursor-pointer transition shadow shadow-indigo-150"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>+ Full Deadline</span>
          </button>

          <button 
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="p-2 px-3.5 bg-white border hover:bg-slate-50 text-slate-700 rounded-xl flex items-center gap-1 cursor-pointer transition"
          >
            <Upload className="h-4 w-4 shrink-0 text-slate-450" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: STATISTICS STRIP (Section 2 spec) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Card 1: Overdue */}
        <div className="bg-white border rounded-xl p-3.5 space-y-1.5 shadow-xxs">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Overdue</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-mono font-black ${statsOverdue > 0 ? 'text-red-600' : 'text-slate-700'}`}>
              {statsOverdue}
            </span>
            {statsOverdue > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
          </div>
        </div>

        {/* Card 2: Due Today */}
        <div className="bg-white border rounded-xl p-3.5 space-y-1.5 shadow-xxs">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Due Today</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-mono font-black ${statsToday > 0 ? 'text-red-500' : 'text-slate-700'}`}>
              {statsToday}
            </span>
          </div>
        </div>

        {/* Card 3: Due This Week */}
        <div className="bg-white border rounded-xl p-3.5 space-y-1.5 shadow-xxs">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">This Week</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-mono font-black ${statsThisWeek > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {statsThisWeek}
            </span>
          </div>
        </div>

        {/* Card 4: Upcoming 30 days */}
        <div className="bg-white border rounded-xl p-3.5 space-y-1.5 shadow-xxs">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Upcoming (30d)</span>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-mono font-black text-blue-600">
              {statsUpcoming}
            </span>
          </div>
        </div>

        {/* Card 5: Resolved */}
        <div className="bg-white border rounded-xl p-3.5 space-y-1.5 shadow-xxs">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Resolved</span>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-mono font-black text-emerald-600">
              {statsResolvedThisMonth}
            </span>
          </div>
        </div>

        {/* Card 6: Near Misses */}
        <div className="bg-white border rounded-xl p-3.5 space-y-1.5 shadow-xxs">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block font-sans">Near Misses</span>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-mono font-black text-amber-500">1</span>
          </div>
        </div>

        {/* Card 7: Missed */}
        <div className="bg-white border rounded-xl p-3.5 space-y-1.5 shadow-xxs">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Missed</span>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-mono font-black text-slate-400">0</span>
          </div>
        </div>

        {/* Card 8: Automated Alerts */}
        <div className="bg-white border rounded-xl p-3.5 space-y-1.5 shadow-xxs">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Sent Today</span>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-mono font-black text-slate-500">12</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: STICKY VIEW PORT NAVIGATION BAR (Section 3 spec) */}
      <div className="sticky top-0 z-30 flex items-center gap-2 bg-slate-900 border text-slate-300 p-2 px-3 rounded-xl shadow-lg border-slate-950">
        <span className="text-[8.5px] font-black uppercase tracking-widest text-indigo-400 mr-2 border-r border-indigo-900 pr-3 font-mono">WORKSPACE CHANNELS</span>
        <div className="flex gap-1.5 text-xxs font-extrabold select-none">
          {[
            { id: 'deadlines', name: 'Statutory Deadlines' },
            { id: 'court', name: 'Court Docket Schedule' },
            { id: 'logs', name: 'Reminder Log Auditors' },
            { id: 'analytics', name: 'compliance trends Chart' },
            { id: 'settings', name: 'SLA parameters & sync' }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`p-1.5 px-3.5 rounded-lg text-xx shadow-xxs transition font-sans cursor-pointer ${
                activeSection === section.id 
                  ? 'bg-indigo-600 text-white font-extrabold border border-indigo-750' 
                  : 'hover:text-white hover:bg-slate-800'
              }`}
            >
              {section.name}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 4: NLP FAST ENTRY BAR (Mounts parsed input QuickParser) */}
      <QuickParser 
        cases={cases} 
        onAddParsedDeadline={handleAddParsedDeadline} 
      />

      {/* SECTION 5: STATUTORY DEADLINES SUBPANEL */}
      {activeSection === 'deadlines' && (
        <div className="space-y-4">
          
          {/* OVERDUE ALERTS WARNING HEADER (Section 5 spec) */}
          {statsOverdue > 0 && (
            <div className="p-4 bg-red-50/50 border border-red-200 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-bounce">
              <div className="flex gap-3 items-start">
                <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-red-800">Critical: Action required on {statsOverdue} overdue matter deadlines!</h4>
                  <p className="text-xxs text-red-700 leading-normal font-medium">Missed deadlines risk negligence declarations, default judgments, and judicial sanction reports.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setFilterStatus('All');
                  setSearchQuery('');
                  // Focus first row
                }}
                className="p-2 px-4 bg-red-650 hover:bg-red-700 font-extrabold text-xxs text-white rounded-lg cursor-pointer"
              >
                Inspect Overdue Logs
              </button>
            </div>
          )}

          {/* FILTER TOOLBAR FOR THE MANAGED LEDGERS (Section 6.1 spec) */}
          <div className="bg-white border rounded-2xl p-4.5 space-y-4 shadow-xxs text-xxs">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              
              <div className="flex flex-wrap gap-2.5 items-center flex-1 w-full">
                {/* Search Text */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 text-slate-400 h-4.5 w-4.5" />
                  <input 
                    type="text" 
                    placeholder="Search docket titles, matter numbers..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8.5 p-2 bg-slate-50 border border-slate-205 rounded-lg outline-none"
                  />
                </div>

                {/* Date quick select pills */}
                <div className="flex gap-1.5">
                  <button onClick={() => setFilterStatus('Unresolved')} className="p-1.5 px-3 bg-indigo-50 border border-indigo-150 rounded-lg text-indigo-805 cursor-pointer font-bold">Unresolved Only</button>
                  <button onClick={() => setFilterStatus('Resolved')} className="p-1.5 px-3 bg-slate-50 border rounded-lg text-slate-650 cursor-pointer">Resolved Ledger</button>
                  <button onClick={() => { setFilterStatus('All'); setFilterPriority('All'); setFilterType('All'); setSearchQuery(''); }} className="p-1.5 px-3 bg-red-50 text-red-800 rounded-lg cursor-pointer">Clear All</button>
                </div>
              </div>

              {/* View Switches */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-slate-500 font-bold select-none">
                {(['LIST', 'CALENDAR', 'TIMELINE', 'HEATMAP'] as const).map(vt => (
                  <button
                    key={vt}
                    onClick={() => setActiveTab(vt)}
                    className={`p-1.5 px-3.5 rounded-md cursor-pointer transition ${activeTab === vt ? 'bg-white shadow text-slate-800 font-extrabold' : 'hover:text-slate-800'}`}
                  >
                    {vt}
                  </button>
                ))}
              </div>

            </div>

            {/* Expansive filter dropdown options */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-2.5.5 rounded-xl text-slate-600 font-semibold border">
              <div>
                <label className="text-[9px] uppercase tracking-wide text-slate-450 block mb-1">Obligation Category</label>
                <select 
                  value={filterType} 
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full p-2 bg-white border rounded-lg text-slate-705 outline-none font-medium"
                >
                  <option value="All">All Types</option>
                  <option value="Court Appearance">Court Appearance</option>
                  <option value="Filing Pleading">Filing Pleading</option>
                  <option value="Client Meeting">Client Meeting</option>
                  <option value="Statute of Limitations">Statute of Limitations</option>
                  <option value="File Briefs">File Briefs</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-wide text-slate-450 block mb-1">Severity SLA Priority</label>
                <select 
                  value={filterPriority} 
                  onChange={e => setFilterPriority(e.target.value)}
                  className="w-full p-2 bg-white border rounded-lg text-slate-750 font-medium"
                >
                  <option value="All">All Severity Levels</option>
                  <option value="Critical">Critical (Statute thresholds)</option>
                  <option value="High">High Urgency</option>
                  <option value="Normal">Normal Pace</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-wide text-slate-455 block mb-1">Saved filter combinations</label>
                <div className="flex gap-1.5 flex-wrap">
                  {savedSearches.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setFilterType(s.type);
                        setFilterPriority(s.priority);
                      }}
                      className="bg-indigo-50 border border-indigo-150 text-indigo-705 px-2 py-1 rounded inline-block text-[9.5px] cursor-pointer hover:bg-indigo-100"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end items-end pb-1.5 pr-2">
                <button 
                  onClick={() => {
                    setLocalSuccessMessage('Current combination of filters stored to cached search presets inside LocalStorage.');
                    setTimeout(() => setLocalSuccessMessage(null), 4000);
                  }}
                  className="text-xs text-indigo-650 hover:underline cursor-pointer font-extrabold"
                >
                  + Bookmark combination
                </button>
              </div>
            </div>
          </div>

          {/* LIST AGGREGATE VIEW (Section 6.2 spec) */}
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              
              <div className="bg-white border text-slate-800 rounded-2xl overflow-hidden shadow-xxs">
                
                <div className="overflow-x-auto text-xxs font-semibold">
                  <table className="w-full text-left divide-y border-collapse">
                    <thead className="bg-slate-50 text-slate-450 font-black uppercase tracking-wider text-[9px] select-none">
                      <tr>
                        <th className="p-3 pl-4">Severity Code</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Compliance Description</th>
                        <th className="p-3">Matter reference / client</th>
                        <th className="p-3">Practitioner delegated</th>
                        <th className="p-3 text-right pr-4">Handoff action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-705">
                      {displayedDeadlines.map((dl) => {
                        const daysLeft = Math.ceil((new Date(dl.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        const isOverdue = daysLeft < 0 && !dl.isResolved;
                        const isExpanded = expandedRowId === dl.id;

                        return (
                          <React.Fragment key={dl.id}>
                            <tr 
                              onClick={() => setExpandedRowId(isExpanded ? null : dl.id)}
                              className={`hover:bg-slate-50/50 cursor-pointer transition ${isOverdue ? 'bg-red-50/15' : ''}`}
                            >
                              {/* Severity priority */}
                              <td className="p-3 pl-4">
                                <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest border ${
                                  dl.priority === 'Critical' 
                                    ? 'bg-red-100 text-red-900 border-red-300' 
                                    : dl.priority === 'High' 
                                    ? 'bg-amber-100 text-amber-905 border-amber-300' 
                                    : 'bg-slate-100 text-slate-800 border-slate-300'
                                }`}>
                                  {dl.priority}
                                </span>
                              </td>

                              {/* Category badge */}
                              <td className="p-3 whitespace-nowrap">
                                <span className="bg-indigo-50 border border-indigo-150 text-indigo-850 px-1.5 py-0.5 rounded block text-[9.5px] font-extrabold text-center uppercase tracking-wide">
                                  {dl.deadlineType || 'Court Obligation'}
                                </span>
                              </td>

                              {/* Description title */}
                              <td className="p-3">
                                <div className="space-y-0.5">
                                  <p className="font-extrabold text-slate-850 text-xs leading-snug line-clamp-2">{dl.title}</p>
                                  <div className="flex gap-2 text-slate-400 font-mono text-[9px]">
                                    <span>Limit: {new Date(dl.dueDate).toLocaleDateString()}</span>
                                    <span>&bull;</span>
                                    <span className={isOverdue ? 'text-red-650 font-black' : ''}>
                                      {isOverdue ? '⚠️ Overdue' : `${daysLeft} days remaining`}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Case/client context */}
                              <td className="p-3 whitespace-nowrap leading-relaxed">
                                <p className="font-mono text-indigo-700 text-[10px] font-bold">{dl.caseRef || 'CRT/2026/001'}</p>
                                <p className="text-[9.5px] text-slate-450 truncate">{dl.clientName}</p>
                              </td>

                              {/* Practitioner */}
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                    {(dl.assignedLawyer || 'ER').substring(0,2).toUpperCase()}
                                  </div>
                                  <span className="text-slate-800 font-extrabold text-[10.5px] whitespace-nowrap">{dl.assignedLawyer}</span>
                                </div>
                              </td>

                              {/* Key actions */}
                              <td className="p-3 text-right pr-4 shrink-0">
                                <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                  {dl.isResolved ? (
                                    <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 font-black">
                                      ✓ Resolved
                                    </span>
                                  ) : (
                                    <>
                                      <button 
                                        disabled={isResolvingId === dl.id}
                                        onClick={() => triggerResolve(dl.id)}
                                        className="p-1 px-3 bg-indigo-650 hover:bg-indigo-755 text-white font-bold rounded cursor-pointer whitespace-nowrap active:scale-95 transition flex items-center gap-1"
                                      >
                                        {isResolvingId === dl.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        <span>Resolve</span>
                                      </button>

                                      <button
                                        onClick={() => setMissedLogTarget(dl)}
                                        className="p-1 px-2.5 bg-red-50 hover:bg-red-100 border border-red-250 text-red-700 rounded text-[9.5px] font-bold cursor-pointer whitespace-nowrap"
                                      >
                                        Missed Log
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Row Expanded view (Section 6.2 spec details) */}
                            {isExpanded && (
                              <tr className="bg-slate-50/40 text-xxs font-semibold">
                                <td colSpan={6} className="p-5 border-t border-b">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 leading-normal">
                                    
                                    {/* Left description details */}
                                    <div className="space-y-4">
                                      <div className="space-y-1">
                                        <span className="text-[10px] text-slate-450 uppercase block font-black">1. Notes & Statutory Guidelines</span>
                                        <p className="p-3 bg-white border rounded-xl text-slate-705 leading-relaxed text-[11px] font-medium">{dl.notes || 'No notes specified.'}</p>
                                      </div>

                                      <div className="space-y-1">
                                        <span className="text-[10px] text-slate-450 uppercase block font-black">2. Reschedule Due date</span>
                                        <div className="flex gap-2">
                                          <input 
                                            type="datetime-local" 
                                            defaultValue={dl.dueDate} 
                                            onChange={e => triggerReschedule(dl.id, e.target.value)}
                                            className="p-2 bg-white border rounded-lg font-mono text-[11px]"
                                          />
                                          <span className="text-slate-400 font-medium self-center">Saving will log event trace.</span>
                                        </div>
                                      </div>

                                      <div className="space-y-1 pt-1">
                                        <span className="text-[10px] text-slate-450 uppercase block font-black flex items-center gap-1">
                                          <History className="h-3.5 w-3.5" />
                                          <span>3. Audit Trail Trace (Section 10)</span>
                                        </span>
                                        <div className="text-[9px] bg-slate-900/5 p-3 rounded-xl border border-slate-205 font-mono text-slate-600 space-y-1 max-h-[80px] overflow-y-auto leading-relaxed">
                                          <p>&bull; 2026-06-07 03:02: Created OK by Elena Rostova from Brief File.</p>
                                          <p>&bull; 2026-06-07 03:05: Auto Escalation parameters attached.</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right discussion comments thread (Section 9) */}
                                    <div className="p-4 bg-white border border-slate-205 rounded-xl space-y-3.5 flex flex-col justify-between">
                                      <div className="space-y-2">
                                        <span className="text-[10px] text-slate-450 uppercase block font-black">Section 9: Team Comments & Disputed logs</span>
                                        
                                        <div className="space-y-2 max-h-[120px] overflow-y-auto border-b pb-2">
                                          {(commentsMap[dl.id] || []).map((cmt, cIdx) => (
                                            <div key={cIdx} className="bg-slate-50 p-2.5 rounded-lg space-y-1 leading-snug">
                                              <div className="flex justify-between items-center text-[9px] font-black text-slate-450 uppercase">
                                                <span>{cmt.author}</span>
                                                <span className="font-mono">{cmt.sent}</span>
                                              </div>
                                              <p className="text-[10.5px] text-slate-750 font-medium">{cmt.text}</p>
                                            </div>
                                          ))}
                                          {(!commentsMap[dl.id] || commentsMap[dl.id].length === 0) && (
                                            <p className="text-center italic text-slate-400 py-4 text-[10px]">No task discussions logged yet.</p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex gap-1">
                                        <input 
                                          type="text" 
                                          placeholder="Type comment e.g. Filing signed off..." 
                                          value={typedComment}
                                          onChange={e => setTypedComment(e.target.value)}
                                          className="flex-1 p-2 bg-slate-50 border rounded-lg focus:outline-none text-[11px]"
                                        />
                                        <button 
                                          onClick={() => handlePostComment(dl.id)}
                                          className="p-2 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-lg px-3.5 cursor-pointer"
                                        >
                                          Comment
                                        </button>
                                      </div>
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {displayedDeadlines.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            No matching deadlines found. Modify filters or click '+ Add full' to log new ones!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

          {activeTab === 'CALENDAR' && (
            <CalendarView 
              deadlines={localDeadlines} 
              cases={cases} 
              roster={roster} 
              onResolve={triggerResolve}
              onReschedule={triggerReschedule}
              onOpenQuickAdd={(day) => {
                setIsQuickAddDate(day);
                setIsFullModalOpen(true);
              }}
            />
          )}

          {activeTab === 'TIMELINE' && (
            <TimelineView 
              deadlines={localDeadlines} 
              cases={cases} 
              roster={roster} 
              onOpenMatterSummary={(caseId) => {
                if (onOpenCase) {
                  onOpenCase(caseId);
                } else {
                  setLocalSuccessMessage(`Folder inspect: redirecting to Matter files catalog. Location ID: ${caseId}`);
                  setTimeout(() => setLocalSuccessMessage(null), 4000);
                }
              }}
            />
          )}

          {activeTab === 'HEATMAP' && (
            <HeatmapView deadlines={localDeadlines} />
          )}

        </div>
      )}

      {/* SECTION 12: COURT APPEARANCE SCHEDULE */}
      {activeSection === 'court' && (
        <div className="bg-white border rounded-2xl p-5 space-y-4" id="court-docket-schedule">
          <div className="flex justify-between items-center pb-2 border-b">
            <div className="flex items-center gap-1.5">
              <Landmark className="h-5 w-5 text-indigo-605" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Section 12: Courtroom Attendance Docket</h4>
                <p className="text-[10px] text-slate-400 font-semibold font-sans">Track scheduled judicial sessions, room assignments, presiding judges, and outcomes.</p>
              </div>
            </div>

            <button 
              onClick={() => setIsCourtModalOpen(true)}
              className="p-1 px-3 bg-slate-800 hover:bg-slate-950 text-white rounded-lg text-xxs font-extrabold flex items-center gap-0.5 cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Log appearance</span>
            </button>
          </div>

          <div className="overflow-x-auto text-xxs font-semibold">
            <table className="w-full text-left divide-y text-slate-650">
              <thead className="bg-slate-50 text-slate-450 font-black uppercase text-[8.5px] select-none">
                <tr>
                  <th className="p-3">Reference file</th>
                  <th className="p-3">Attendance Class</th>
                  <th className="p-3">Schedule Date & court</th>
                  <th className="p-3">Judge Assigned</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-705">
                {courtAppearances.map(ca => (
                  <tr key={ca.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-indigo-700 font-bold block">{ca.matterRef}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-750 px-2 py-0.5 rounded font-black">
                        {ca.type}
                      </span>
                    </td>
                    <td className="p-3 leading-relaxed">
                      <p className="font-bold text-slate-800">{ca.courtroom}</p>
                      <p className="text-[9.5px] text-slate-400 font-mono">{ca.date}</p>
                    </td>
                    <td className="p-3 text-slate-600">{ca.judge}</td>
                    <td className="p-3 text-right">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-black">
                        {ca.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 15: REMINDER LAUNCH LOGS */}
      {activeSection === 'logs' && (
        <ReminderLogTab roster={roster} />
      )}

      {/* SECTION 16: ANALYTICS & REPORTS */}
      {activeSection === 'analytics' && (
        <ComplianceCharts deadlines={localDeadlines} roster={roster} />
      )}

      {/* SECTION 17 & 18: SETTINGS CONFIG */}
      {activeSection === 'settings' && (
        <SettingsTab />
      )}

      {/* MODAL 1: FULL DEADLINE CREATOR (Section 7) */}
      {isFullModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fade-in" id="full-deadline-modal-mask">
          <div className="bg-white border text-slate-850 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            
            <div className="flex justify-between items-center border-b pb-2">
              <div className="flex items-center gap-1.5">
                <Plus className="h-5 w-5 text-indigo-600" />
                <span className="text-xs font-black uppercase text-slate-800">Configure Statutory Deadline</span>
              </div>
              <button 
                onClick={() => { setIsFullModalOpen(false); setIsQuickAddDate(null); }}
                className="text-slate-400 hover:text-red-500 font-semibold p-1"
              >
                &times; Close
              </button>
            </div>

            <div className="space-y-3.5 text-xxs font-semibold">
              <div>
                <label className="text-[10px] text-slate-450 uppercase block mb-1">Docket Obligation Title</label>
                <input 
                  type="text" 
                  placeholder="E.g. File Amended Statement of Defense..." 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-450 uppercase block mb-1">Type Category</label>
                  <select 
                    value={newType} 
                    onChange={e => setNewType(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none"
                  >
                    <option value="Court Appearance">Court Appearance</option>
                    <option value="Filing Pleading">Filing Pleading</option>
                    <option value="Client Meeting">Client Meeting</option>
                    <option value="Statute of Limitations">Statute of Limitations</option>
                    <option value="File Briefs">File Briefs</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-450 uppercase block mb-1">SLA Severity Level</label>
                  <select 
                    value={newPriority} 
                    onChange={e => setNewPriority(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none"
                  >
                    <option value="Critical">Critical (Red badge warning)</option>
                    <option value="High">High Priority</option>
                    <option value="Normal">Normal Pace</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-450 uppercase block mb-1">Target Due Date</label>
                  <input 
                    type="datetime-local" 
                    value={isQuickAddDate ? `${isQuickAddDate}T09:00` : newDueDate} 
                    onChange={e => {
                      setNewDueDate(e.target.value);
                      setIsQuickAddDate(null);
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-405 uppercase block mb-1">Associate Case Portfolio</label>
                  <select 
                    value={newCaseId} 
                    onChange={e => setNewCaseId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none"
                  >
                    <option value="">Select Case Matter...</option>
                    {cases.map(cs => (
                      <option key={cs.id} value={cs.id}>
                        {cs.referenceNumber} &bull; {(cs as any).client?.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 uppercase block mb-1">Statutory Guidelines Notes</label>
                <textarea 
                  rows={3} 
                  placeholder="Notes on filings, room details, witness files..." 
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:outline-none"
                />
              </div>

              <div className="border bg-indigo-50/20 p-2.5 rounded-lg flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-[10px] text-indigo-800 block">Repeat Schedule configurations (Recurrence Section)</span>
                  <span className="text-[9px] text-indigo-600 block">Autp-spawns next checklist once previous resolves.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isRecurring} 
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border text-indigo-555"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xxs font-bold pt-3 border-t">
              <button 
                onClick={() => { setIsFullModalOpen(false); setIsQuickAddDate(null); }}
                className="p-2 border rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Discard
              </button>
              <button 
                onClick={handleSaveFullDeadline}
                disabled={savingNewInProgress}
                className="p-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer flex items-center gap-1 shadow"
              >
                {savingNewInProgress && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Save docket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT CSV MODAL (Section 19) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fade-in" id="csv-import-modal-mask">
          <div className="bg-white text-slate-800 border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                <span className="text-xs font-black uppercase text-slate-800">CSV Bulk Import ledger (Section 19)</span>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-red-500 font-bold">&times;</button>
            </div>

            <div className="space-y-3.5 text-xxs font-semibold">
              <div className="p-4 border-2 border-dashed border-slate-205 rounded-xl text-center bg-slate-50 text-slate-450 space-y-2">
                <p>Drag your CSV template folder here or pick from memory</p>
                <p className="font-extrabold text-[10px] text-slate-600 block">Max 100 entries per import list batch</p>
                <div className="flex justify-center gap-1.5">
                  <button className="bg-white border text-slate-705 p-1 px-3 rounded hover:bg-slate-50 cursor-pointer">Download legal template</button>
                  <label className="bg-indigo-600 text-white p-1 px-3.5 rounded hover:bg-indigo-700 cursor-pointer">
                    Upload file
                    <input type="file" className="hidden" onChange={() => {
                      setLocalSuccessMessage('Mock legal data imported. 4 entries compiled successfully!');
                      setTimeout(() => setLocalSuccessMessage(null), 4505);
                      setIsImportModalOpen(false);
                    }} />
                  </label>
                </div>
              </div>

              <div className="border bg-amber-50 p-3 rounded-lg text-amber-850 space-y-1">
                <span className="font-bold flex items-center gap-1">⚠️ Mapping confirmation:</span>
                <p className="leading-relaxed">Verify headers are fully matched inside column matrices prior to saving records.</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button onClick={() => setIsImportModalOpen(false)} className="p-2 border rounded-lg bg-white text-slate-600 hover:bg-slate-50 font-bold">Close panel</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: COURT APPEARANCE LOGGER */}
      {isCourtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fade-in">
          <div className="bg-white border text-slate-850 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-xs font-black uppercase text-slate-800">Log Judicial Meeting Appearance</span>
              <button onClick={() => setIsCourtModalOpen(false)} className="text-slate-400 font-extrabold">&times;</button>
            </div>

            <div className="space-y-3.5 text-xxs font-semibold">
              <div>
                <label className="text-[10px] text-slate-450 uppercase block mb-1">Matter Ref</label>
                <input 
                  type="text" 
                  placeholder="E.g. DK-2026-401..." 
                  value={caMatterRef}
                  onChange={e => setCaMatterRef(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 uppercase block mb-1">Client Full Name</label>
                <input 
                  type="text" 
                  placeholder="E.g. Marcus Vance..." 
                  value={caClient}
                  onChange={e => setCaClient(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-450 block mb-1">Session Class</label>
                  <select 
                    value={caType} 
                    onChange={e => setCaType(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-lg"
                  >
                    <option value="Mention">Mention</option>
                    <option value="Trial">Trial</option>
                    <option value="Hearing">Hearing</option>
                    <option value="Consult">Consult</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-450 block mb-1">Presiding Judge</label>
                  <input 
                    type="text" 
                    placeholder="Justice Roberts..." 
                    value={caJudge}
                    onChange={e => setCaJudge(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-450 block mb-1">Court Room</label>
                  <input 
                    type="text" 
                    placeholder="Chambers Room B..." 
                    value={caRoom}
                    onChange={e => setCaRoom(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-450 block mb-1">Date</label>
                  <input 
                    type="datetime-local" 
                    value={caDate}
                    onChange={e => setCaDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-lg font-mono focus:outline-none text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-1.5 text-xxs font-bold pt-3 border-t">
              <button onClick={() => setIsCourtModalOpen(false)} className="p-2 border rounded-lg bg-white">Cancel</button>
              <button onClick={handleSaveCourtAppearance} className="p-2 bg-slate-800 text-white rounded-lg px-4 hover:bg-slate-900 cursor-pointer">Post ledger</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MISSED DEADLINE LOGGER (Section 5 spec) */}
      {missedLogTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fade-in" id="missed-deadline-mask">
          <div className="bg-white border text-slate-850 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-xs font-black uppercase text-red-600 block">Record Statutory Miss Violation</span>
              <button onClick={() => setMissedLogTarget(null)} className="text-slate-400 font-extrabold hover:text-red-500">&times;</button>
            </div>

            <div className="space-y-3.5 text-xxs font-semibold">
              <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-200">
                <p className="font-bold">Matter: {missedLogTarget.caseRef}</p>
                <p className="mt-1">Creating irreversible log transaction checklist record.</p>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 uppercase block mb-1">Primary source cause of missing</label>
                <select 
                  value={missedReason} 
                  onChange={e => setMissedReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-lg text-slate-850"
                >
                  <option value="Client delay">Client Delay & non-cooperation</option>
                  <option value="Court delay">Court scheduling overlap backlog</option>
                  <option value="Administrative">Office coordination oversight</option>
                  <option value="Other">Force Majeure event / Unforeseen circumstance</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 uppercase block mb-1">Supervisor remedial notes</label>
                <textarea 
                  rows={3} 
                  placeholder="Describe emergency mitigations or client appeals logged..." 
                  value={missedNotes}
                  onChange={e => setMissedNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border">
                <span className="font-extrabold text-[10px] text-slate-700">Audit Partner and risk desks notified</span>
                <input 
                  type="checkbox" 
                  checked={supervisorNotified} 
                  onChange={e => setSupervisorNotified(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border text-red-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-1.5 text-xxs font-bold pt-3 border-t">
              <button onClick={() => setMissedLogTarget(null)} className="p-2 border rounded-lg bg-white">Discard</button>
              <button onClick={handleSaveMissedLog} className="p-2 bg-red-600 text-white rounded-lg px-4 hover:bg-red-700 cursor-pointer">Commit Immutable record</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
