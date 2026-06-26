import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Briefcase, User, Calendar, MessageSquare, FileText, ChevronRight,
  ArrowLeft, Clock, AlertCircle, Trash, Check, Loader2, ArrowUpRight, Send, AlertTriangle, 
  Download, Printer, Share2, Clipboard, ShieldAlert, DollarSign, PiggyBank, Receipt,
  CheckSquare, FileSpreadsheet, Layers, RefreshCw, Undo, Eye, BookOpen, Star, Pin, SlidersHorizontal, UserCheck, 
  UserPlus, Compass, Settings, BarChart3, FolderArchive, ArrowRight, Activity, Percent, ChevronDown, CheckCircle2, X
} from 'lucide-react';

import { Case, Client, CompanySettings, GeneratedDocument } from '../types';

// Import our modular sub-components
import CaseStatsStrip from './cases/CaseStatsStrip';
import PrecedentLibraryPanel from './cases/PrecedentLibraryPanel';
import CourtBundleModal from './cases/CourtBundleModal';
import CaseInvoiceWizard from './cases/CaseInvoiceWizard';
import TransferMatterModal from './cases/TransferMatterModal';
import CaseDetailLeftPanel from './cases/CaseDetailLeftPanel';
import CaseDetailTabs from './cases/CaseDetailTabs';
import CaseAnalyticsView from './cases/CaseAnalyticsView';
import MatterCardView from './cases/MatterCardView';
import NewCaseModal from './cases/NewCaseModal';

interface CasesViewProps {
  companyId: string;
  clients: Client[];
  cases: Case[];
  lawyers: Array<{ id: string; fullName: string }>;
  onOpenCase: (caseId: string) => void;
  onRefresh: () => void;
  viewingCaseId: string | null;
  onCloseDetail: () => void;
  settings: CompanySettings;
  documents?: GeneratedDocument[];
}

export default function CasesView({ 
  companyId, clients, cases, lawyers, onOpenCase, onRefresh, viewingCaseId, onCloseDetail, settings, documents = []
}: CasesViewProps) {
  const [activePanel, setActivePanel] = useState<'list' | 'detail' | 'analytics'>('list');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [customAlert, setCustomAlert] = useState<{ message: string; title?: string } | null>(null);

  const caseDocsList = (() => {
    if (!selectedCase) return [];
    const propDocs = (documents || []).filter(d => d.caseId === selectedCase.id);
    const caseLocalDocs = selectedCase.docs || [];
    const allMerged = [...caseLocalDocs, ...propDocs];
    const seen = new Set<string>();
    return allMerged.filter(doc => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });
  })();

  const triggerAlert = (message: string, title?: string) => {
    setCustomAlert({ message, title: title || "Firm Workspace Announcement" });
  };

  // Sync with viewingCaseId from parent App.tsx
  useEffect(() => {
    if (viewingCaseId) {
      const match = cases.find(c => c.id === viewingCaseId);
      if (match) {
        handleSelectCase(match);
      }
    } else {
      setSelectedCase(null);
      setActivePanel('list');
    }
  }, [viewingCaseId, cases]);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [selectedStatFilter, setSelectedStatFilter] = useState<string | null>(null);
  const [selectedFlagFilter, setSelectedFlagFilter] = useState<string>('All');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Saved searches lists
  const [savedSearches, setSavedSearches] = useState<Array<{ name: string; type: string; flag: string; query: string }>>(() => {
    try {
      const saved = localStorage.getItem('docket_saved_searches');
      return saved ? JSON.parse(saved) : [
        { name: 'Urgent Civil Claims', type: 'Civil', flag: 'All', query: '' }
      ];
    } catch {
      return [];
    }
  });
  const [newSaveName, setNewSaveName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Bulk actions checklist arrays
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);

  // Open modals configurations
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isPrecedentOpen, setIsPrecedentOpen] = useState(false);
  const [isBundleOpen, setIsBundleOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Extended features for activeCase detail tabs
  const [activeTab, setActiveTab] = useState('overview');

  // Active case extended local-storage reactive states
  const [handovers, setHandovers] = useState<any[]>([]);
  const [feeNotes, setFeeNotes] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [diaryEvents, setDiaryEvents] = useState<any[]>([]);
  const [courtAppearances, setCourtAppearances] = useState<any[]>([]);
  const [docApprovals, setDocApprovals] = useState<Record<string, 'Approved' | 'Pending'>>({});
  const [clientReplies, setClientReplies] = useState<any[]>([]);
  const [internalChats, setInternalChats] = useState<any[]>([]);

  // Quick inputs
  const [diaryTemplate, setDiaryTemplate] = useState('Documents filed');
  const [diaryNotes, setDiaryNotes] = useState('');
  const [diaryBillable, setDiaryBillable] = useState(true);
  const [diaryCategory, setDiaryCategory] = useState('General');
  const [diaryColor, setDiaryColor] = useState('indigo');
  const [showBulkDiary, setShowBulkDiary] = useState(false);
  const [bulkDiaryText, setBulkDiaryText] = useState('');

  // Add court appearances standard state
  const [courtDate, setCourtDate] = useState('');
  const [courtRoom, setCourtRoom] = useState('');
  const [presidingJudge, setPresidingJudge] = useState('');
  const [appearanceType, setAppearanceType] = useState('Hearing');
  const [rulingOutcome, setRulingOutcome] = useState('');
  const [adjournedCheck, setAdjournedCheck] = useState(false);
  const [adjournedDate, setAdjournedDate] = useState('');

  // Inputs Client communication
  const [clientUpdateDraft, setClientUpdateDraft] = useState('');
  const [scheduleSendTime, setScheduleSendTime] = useState('');
  const [scheduleToggle, setScheduleToggle] = useState(false);

  // Internal chat
  const [chatMessage, setChatMessage] = useState('');
  const [chatOnRecord, setChatOnRecord] = useState(false);



  // Load and setup active case local reactive sheets
  const handleSelectCase = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setActivePanel('detail');
    if (onOpenCase && viewingCaseId !== caseItem.id) {
      onOpenCase(caseItem.id);
    }

    // Restore Handover registries
    const hKey = `docket_case_handovers_${caseItem.id}`;
    const hoLocal = localStorage.getItem(hKey);
    setHandovers(hoLocal ? JSON.parse(hoLocal) : []);

    // Restore Timesheets / Fee notes
    const fKey = `docket_case_feenotes_${caseItem.id}`;
    const fnLocal = localStorage.getItem(fKey);
    const initialFees = [
      { id: 'fee-1', date: '2026-06-02', lawyerName: 'Alex Rivera, Esq.', description: 'Prepared pre-trial defense briefs list', hours: 4, rate: 160, status: 'unbilled' },
      { id: 'fee-2', date: '2026-06-03', lawyerName: 'Marcus Vance III', description: 'Coordinated Client consultation session', hours: 2, rate: 140, status: 'unbilled' }
    ];
    setFeeNotes(fnLocal ? JSON.parse(fnLocal) : initialFees);

    // Restore Disbursements
    const dKey = `docket_case_disbursements_${caseItem.id}`;
    const dsLocal = localStorage.getItem(dKey);
    const initialDisbursements = [
      { id: 'dis-1', date: '2026-06-01', description: 'Chamber application filing stamps fee', amount: 80, paidBy: 'Firm (to be billed)', status: 'unbilled' }
    ];
    setDisbursements(dsLocal ? JSON.parse(dsLocal) : initialDisbursements);

    // Restore Diary Timeline Timeline
    const tKey = `docket_case_timeline_${caseItem.id}`;
    const tmLocal = localStorage.getItem(tKey);
    const initialDiary = [
      { id: 'di-1', date: '2026-06-04', author: 'Paralegal Assistant', category: 'General', text: 'Filed preliminary affidavits indices at court division.', isPinned: true, reviewStatus: 'Approved', hours: 1, color: 'indigo' },
      { id: 'di-2', date: '2026-06-05', author: 'Alex Rivera, Esq.', category: 'Court appearance', text: 'Attended directions hearing. Ordered to disclose asset lists by June 20th.', isPinned: false, reviewStatus: 'Approved', hours: 2, color: 'emerald' }
    ];
    setDiaryEvents(tmLocal ? JSON.parse(tmLocal) : initialDiary);

    // Restore Scheduled Court appearance list
    const cKey = `docket_case_court_appearances_${caseItem.id}`;
    const caLocal = localStorage.getItem(cKey);
    const initialCourt = [
      { id: 'c-1', date: '2026-06-05', room: 'Courtroom 4B', judge: 'Hon. Justice Garroway', type: 'Directions Hearing', outcome: 'Case adjourned for discovery checkups until June 20th.', nextAdjournedDate: '2026-06-20', status: 'Completed' }
    ];
    setCourtAppearances(caLocal ? JSON.parse(caLocal) : initialCourt);

    // Restore Document approved tags
    const docKey = `docket_case_documents_approvals_${caseItem.id}`;
    const docLocal = localStorage.getItem(docKey);
    setDocApprovals(docLocal ? JSON.parse(docLocal) : {});

    // Restore Client communication replies
    const replKey = `docket_case_client_replies_${caseItem.id}`;
    const replLocal = localStorage.getItem(replKey);
    const initialReplies = [
      { id: 'r-1', type: 'Email', date: '2026-06-03 14:22', text: 'Client opened document and marked receipt status.', sender: 'Voyyagic' },
      { id: 'r-2', type: 'Called back', date: '2026-06-05 10:15', text: 'Confirmed bank statements copies are compiled.', sender: 'Alex Rivera, Esq.' }
    ];
    setClientReplies(replLocal ? JSON.parse(replLocal) : initialReplies);

    // Restore Chats
    const chatKey = `docket_case_internal_chat_${caseItem.id}`;
    const ctLocal = localStorage.getItem(chatKey);
    const initialChats = [
      { id: 'ch-1', author: 'Alex Rivera', text: 'Please double-check details about conflict with opposing parties.', timestamp: '2026-06-06 18:40', onRecord: true }
    ];
    setInternalChats(ctLocal ? JSON.parse(ctLocal) : initialChats);
  };

  // --- ACTIONS LOG TIMELINE DIARY timeline ---
  const handleAddDiaryEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryNotes.trim()) return;

    const newDiary = {
      id: 'di-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      author: 'Voyyagic',
      category: diaryCategory,
      text: diaryNotes.trim(),
      isPinned: false,
      reviewStatus: 'Pending',
      hours: diaryBillable ? 1.5 : 0,
      color: diaryColor
    };

    const updated = [newDiary, ...diaryEvents];
    setDiaryEvents(updated);
    localStorage.setItem(`docket_case_timeline_${selectedCase?.id}`, JSON.stringify(updated));
    setDiaryNotes('');
  };

  const handleBulkDiarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkDiaryText.trim()) return;

    // Splits into lines
    const lines = bulkDiaryText.split('\n').filter(l => l.trim());
    const addedEntries = lines.map((line, idx) => ({
      id: `di-bulk-${Date.now()}-${idx}`,
      date: new Date().toISOString().split('T')[0],
      author: 'Voyyagic',
      category: 'Bulk entry',
      text: line.trim(),
      isPinned: false,
      reviewStatus: 'Pending',
      hours: 1,
      color: 'slate'
    }));

    const updated = [...addedEntries, ...diaryEvents];
    setDiaryEvents(updated);
    localStorage.setItem(`docket_case_timeline_${selectedCase?.id}`, JSON.stringify(updated));
    setBulkDiaryText('');
    setShowBulkDiary(false);
  };

  const togglePinDiary = (id: string) => {
    const updated = diaryEvents.map(item => item.id === id ? { ...item, isPinned: !item.isPinned } : item);
    setDiaryEvents(updated);
    localStorage.setItem(`docket_case_timeline_${selectedCase?.id}`, JSON.stringify(updated));
  };

  const handleApproveDiary = (id: string) => {
    const updated = diaryEvents.map(item => item.id === id ? { ...item, reviewStatus: 'Approved' } : item);
    setDiaryEvents(updated);
    localStorage.setItem(`docket_case_timeline_${selectedCase?.id}`, JSON.stringify(updated));
  };

  const handleDownloadDiaryReport = () => {
    const rawText = `
DOCKET MATTER CASE TIMELINE DIARY STATUS REPORT
=====================================================
Case Reference: ${selectedCase?.referenceNumber}
Client Name: ${(selectedCase as any).client?.fullName}
Report Printed At: ${new Date().toLocaleString()}
=====================================================

${diaryEvents.map((item, idx) => `
[${idx + 1}] Date: ${item.date} | Category: ${item.category} | Author: ${item.author}
Status: ${item.reviewStatus} | Chargeable: ${item.hours} hours
Text: "${item.text}"
-----------------------------------------------------`).join('\n')}
`;
    const element = document.createElement("a");
    const file = new Blob([rawText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${selectedCase?.referenceNumber}_Timeline_Diary_Report.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- APPEARANCES ACTIONS ---
  const handleAddAppearance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtDate) return;

    const newAppearance = {
      id: 'c-' + Date.now(),
      date: courtDate,
      room: courtRoom || 'Main Chambers',
      judge: presidingJudge || 'Presiding Justice',
      type: appearanceType,
      outcome: rulingOutcome || 'Adjourned for subsequent trial steps filing.',
      nextAdjournedDate: adjournedCheck ? adjournedDate : '',
      status: adjournedCheck ? 'Adjourned' : 'Completed'
    };

    const updated = [newAppearance, ...courtAppearances];
    setCourtAppearances(updated);
    localStorage.setItem(`docket_case_court_appearances_${selectedCase?.id}`, JSON.stringify(updated));

    // AUTOMATED NEXT DATE ADJOURNING CALCULATOR REMINDER SCHEDULER
    if (adjournedCheck && adjournedDate) {
      triggerAlert(`Automated Scheduler Triggered!\nScheduled next Appearance on ${adjournedDate}.\nReminders have been registered in the calendar dockets.`, "Automated Scheduler Triggered");
      
      // Post timeline item indicating automatic adjournment
      const autoDiary = {
        id: 'di-auto-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        author: 'Court System Bot',
        category: 'Court appearance',
        text: `[ADJOURNED ACTION] Case adjourned by order of Court until ${adjournedDate}. Next date loaded of record.`,
        isPinned: true,
        reviewStatus: 'Approved',
        hours: 0,
        color: 'red'
      };
      const revisedTimeline = [autoDiary, ...diaryEvents];
      setDiaryEvents(revisedTimeline);
      localStorage.setItem(`docket_case_timeline_${selectedCase?.id}`, JSON.stringify(revisedTimeline));
    }

    // Reset fields
    setCourtDate('');
    setCourtRoom('');
    setPresidingJudge('');
    setRulingOutcome('');
    setAdjournedCheck(false);
    setAdjournedDate('');
  };

  // --- INLINE DETAILS DISPATCHERS ---
  const handleUpdateCase = (payload: Partial<Case>) => {
    if (!selectedCase) return;
    
    // Save locally
    const merged = { ...selectedCase, ...payload, updatedAt: new Date().toISOString() };
    setSelectedCase(merged);

    // Save back to general cases array representation
    const caseIdx = cases.findIndex(c => c.id === selectedCase.id);
    if (caseIdx !== -1) {
      cases[caseIdx] = merged;
    }

    // Issue Server PUT call
    fetch(`/api/firm/${settings.companyId}/cases/${selectedCase.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged)
    })
    .then(() => onRefresh())
    .catch(err => console.error("Error committing PUT server sync:", err));
  };

  // --- INVOICES DISPATCHER WIZARD HOOKS ---
  const handleInvoiceWorkflowSave = (newInvoice: any, billedFeeIds: string[], billedDisbursementIds: string[]) => {
    // 1. Mark FeeNotes billed
    const updatedFees = feeNotes.map(item => billedFeeIds.includes(item.id) ? { ...item, status: 'billed' as const } : item);
    setFeeNotes(updatedFees);
    localStorage.setItem(`docket_case_feenotes_${selectedCase?.id}`, JSON.stringify(updatedFees));

    // 2. Mark disbursements billed
    const updatedDisb = disbursements.map(item => billedDisbursementIds.includes(item.id) ? { ...item, status: 'billed' as const } : item);
    setDisbursements(updatedDisb);
    localStorage.setItem(`docket_case_disbursements_${selectedCase?.id}`, JSON.stringify(updatedDisb));

    // 3. Post a document representing the compiled PDF letterhead invoice asset
    const invoiceBillDoc: GeneratedDocument = {
      id: `doc-${Date.now()}-invoice`,
      companyId: settings.companyId || 'company-demo',
      caseId: selectedCase?.id || '',
      content: `--- LEGAL INVOICE OUTLINE ---\nInvoice: ${newInvoice.invoiceNumber}\nSubtotal: £${newInvoice.subtotal}\nTotal Due: £${newInvoice.total}\nStatus: PENDING SENT`,
      createdAt: new Date().toISOString()
    };

    if (selectedCase) {
      if (!selectedCase.docs) selectedCase.docs = [];
      selectedCase.docs.unshift(invoiceBillDoc);
    }

    triggerAlert(`Receipt Invoice ${newInvoice.invoiceNumber} successfully prepared, sent, and registered in client update channels!`, "Receipt Invoice Prepared");
    onRefresh();
  };

  // --- TIMELINE COMPILERS BUNDLES ---
  const handleBundleWorkflowSave = (bundleDoc: GeneratedDocument) => {
    if (selectedCase) {
      if (!selectedCase.docs) selectedCase.docs = [];
      selectedCase.docs.unshift(bundleDoc);
    }
    onRefresh();
  };

  // --- MATTERS HANDOVERS TRANSFERS ---
  const handleHandoverWorkflowSave = (newLawyerId: string, handoverNoteText: string) => {
    if (!selectedCase) return;

    // Log Handover note to local storage list
    const newHoMemo = {
      note: handoverNoteText,
      date: new Date().toLocaleDateString(),
      counselId: newLawyerId
    };

    const updatedHoList = [newHoMemo, ...handovers];
    setHandovers(updatedHoList);
    localStorage.setItem(`docket_case_handovers_${selectedCase.id}`, JSON.stringify(updatedHoList));

    // Log Timeline action item
    const hoDiary = {
      id: 'di-ho-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      author: 'Office Administrator',
      category: 'Matter Handover',
      text: `[MATTER REASSIGNMENT] Filed reassigned Lead Counsel to Designated Representative Code: ${newLawyerId}.`,
      isPinned: true,
      reviewStatus: 'Approved',
      hours: 0,
      color: 'slate'
    };

    const updatedTimeline = [hoDiary, ...diaryEvents];
    setDiaryEvents(updatedTimeline);
    localStorage.setItem(`docket_case_timeline_${selectedCase.id}`, JSON.stringify(updatedTimeline));

    // Apply counsel change update
    handleUpdateCase({ assignedLawyerId: newLawyerId });
  };

  // --- CLIENT DISPATCH BUILDERS SENT ---
  const handleSendClientUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientUpdateDraft.trim()) return;

    const newLogs = {
      id: 'r-cli-sent-' + Date.now(),
      type: 'Bilateral Email Update',
      date: new Date().toISOString().split('T')[1].substring(0, 5) + ' UTC',
      text: `[DRAFT OUTBOX TRANSFERRED]: "${clientUpdateDraft.trim()}"` + (scheduleToggle ? ` &bull; Send Timer Queue: [${scheduleSendTime}]` : ''),
      sender: 'Voyyagic'
    };

    const updated = [newLogs, ...clientReplies];
    setClientReplies(updated);
    localStorage.setItem(`docket_case_client_replies_${selectedCase?.id}`, JSON.stringify(updated));
    setClientUpdateDraft('');
    triggerAlert("Newsletter draft successfully prepared for secure client communication portals.", "Update Draft Saved");
  };

  // --- CHATS LOG ON RECORD ACTIONS ---
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const msg = {
      id: 'ch-' + Date.now(),
      author: 'Voyyagic',
      text: chatMessage.trim(),
      timestamp: new Date().toLocaleString(),
      onRecord: chatOnRecord
    };

    const updated = [...internalChats, msg];
    setInternalChats(updated);
    localStorage.setItem(`docket_case_internal_chat_${selectedCase?.id}`, JSON.stringify(updated));
    setChatMessage('');
  };

  // --- NEW CASE CREATE CALLBACK DISPATCHER ---
  const handleSaveNewCase = (payload: any) => {
    // Enrich with client information and empty docs array
    const matchedCli = clients.find(c => c.id === payload.clientId);
    const mockCaseId = 'case-init-' + Date.now();
    const finalStructuredPayload: Case = {
      id: mockCaseId,
      companyId: settings.companyId || 'company-demo',
      clientId: payload.clientId,
      referenceNumber: payload.referenceNumber,
      caseType: payload.caseType,
      court: payload.court,
      opposingParty: payload.opposingParty,
      assignedLawyerId: payload.assignedLawyerId,
      currentStage: payload.currentStage,
      status: 'ACTIVE',
      openedDate: new Date().toISOString(),
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      docs: [],
      ...payload
    };

    // Push local state
    cases.unshift(finalStructuredPayload);
    setIsNewModalOpen(false);

    // Save to server
    fetch(`/api/firm/${settings.companyId}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalStructuredPayload)
    })
    .then(() => onRefresh())
    .catch(err => console.error("Error creating case server-side:", err));
  };

  // --- SAVED SEARCH CONTEXTS ---
  const handleSaveSearchQuery = () => {
    if (!newSaveName) return;
    const added = {
      name: newSaveName,
      type: selectedTypeFilter,
      flag: selectedFlagFilter,
      query: searchQuery
    };
    const updated = [added, ...savedSearches];
    setSavedSearches(updated);
    localStorage.setItem('docket_saved_searches', JSON.stringify(updated));
    setNewSaveName('');
    setShowSaveModal(false);
  };

  // --- DATA FILTERING LOGIC ---
  const filteredCases = cases.filter(c => {
    // 1. Practice category filter
    if (selectedTypeFilter !== 'All' && c.caseType !== selectedTypeFilter) return false;

    // 2. Priority Filter
    if (selectedPriorityFilter !== 'All') {
      const priority = ((c as any).priority || '').toLowerCase();
      if (priority !== selectedPriorityFilter.toLowerCase()) return false;
    }

    // 3. Flags Filter
    if (selectedFlagFilter !== 'All') {
      const flagsList = (c as any).flags || [];
      if (!flagsList.includes(selectedFlagFilter)) return false;
    }

    // 4. Statistics card clicks filter
    if (selectedStatFilter === 'active') {
      if (c.status !== 'ACTIVE' || (c as any).isArchived) return false;
    } else if (selectedStatFilter === 'deadlines') {
      const isUpcoming = (c as any).deadlines?.some((d: any) => {
        const due = new Date(d.dueDate);
        const diffTime = due.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7 && !d.isResolved;
      });
      if (!isUpcoming) return false;
    } else if (selectedStatFilter === 'updates') {
      const hasDraft = (c as any).updates?.some((u: any) => u.status === 'DRAFT');
      if (!hasDraft) return false;
    } else if (selectedStatFilter === 'opened') {
      const openedDate = new Date(c.openedDate);
      const now = new Date();
      if (openedDate.getMonth() !== now.getMonth() || openedDate.getFullYear() !== now.getFullYear()) return false;
    } else if (selectedStatFilter === 'closed') {
      if (c.status !== 'CLOSED') return false;
    } else if (selectedStatFilter === 'assigned') {
      if (!c.assignedLawyerId || c.status !== 'ACTIVE' || (c as any).isArchived) return false;
    }

    // 5. Query Search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cliName = (c as any).client?.fullName?.toLowerCase() || '';
      const ref = c.referenceNumber?.toLowerCase() || '';
      const notesVal = c.notes?.toLowerCase() || '';
      const flagStr = ((c as any).flags || []).join(',').toLowerCase();

      return cliName.includes(q) || ref.includes(q) || notesVal.includes(q) || flagStr.includes(q);
    }

    return true;
  });

  // Bulk actions triggers
  const handleBulkReassign = () => {
    if (bulkSelection.length === 0) return;
    const lead = prompt("Enter target associate/lawyer ID to bulk assign:");
    if (!lead) return;

    Promise.all(
      bulkSelection.map(id => {
        return fetch(`/api/firm/${settings.companyId}/cases/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedLawyerId: lead })
        });
      })
    ).then(() => {
      triggerAlert("Successfully reassigned selected records in bulk.", "Reassignment Completed");
      setBulkSelection([]);
      onRefresh();
    });
  };

  const handleBulkChangeStatus = () => {
    if (bulkSelection.length === 0) return;
    const outcomeVal = prompt("Enter new current status (ACTIVE or CLOSED):");
    if (!outcomeVal) return;

    Promise.all(
      bulkSelection.map(id => {
        return fetch(`/api/firm/${settings.companyId}/cases/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: outcomeVal.toUpperCase() })
        });
      })
    ).then(() => {
      triggerAlert("Successfully modified selected status folders.", "Status Folder Modified");
      setBulkSelection([]);
      onRefresh();
    });
  };

  return (
    <div className="cases-view-container flex-1 flex flex-col p-4 sm:p-6 bg-slate-50 min-h-screen relative" id="docket-cases-workspace">
      
      {/* Top Banner Control Rail */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 mb-5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight font-sans">Litigation Matter Workspace</h2>
          <p className="text-xs text-slate-400 font-medium">Verify courtroom calendars, log expenses, and build compiled bundle files.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          {activePanel !== 'list' && (
            <button 
              onClick={() => {
                setActivePanel('list');
                if (onCloseDetail) onCloseDetail();
              }}
              className="p-2 bg-white hover:bg-slate-100 border text-slate-650 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition text-xs font-bold shrink-0 min-h-[44px] w-11 sm:w-auto self-start -mt-1 sm:mt-0 sm:px-3"
              title="Back to Listing"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Listing</span>
            </button>
          )}

          <button 
            onClick={() => setActivePanel('analytics')}
            className={`p-2 border rounded-xl flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] transition text-xs font-bold bg-white text-slate-650 hover:bg-slate-50 w-full sm:w-auto ${activePanel === 'analytics' ? 'border-indigo-650 text-indigo-700 bg-indigo-50/20' : ''}`}
          >
            <BarChart3 className="h-4.5 w-4.5" />
            <span>Caseload Bottlenecks Analytics</span>
          </button>

          <button 
            onClick={() => setIsPrecedentOpen(!isPrecedentOpen)}
            className="p-2 bg-white hover:bg-slate-50 border text-slate-650 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] hover:border-slate-350 select-none transition text-xs font-bold w-full sm:w-auto"
          >
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span>Litigation Briefing Precedents</span>
          </button>

          <button 
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="text-xs transition flex items-center justify-center gap-1.5 shrink-0 select-none bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold rounded-lg border-none cursor-pointer w-full sm:w-auto"
            style={{ padding: '8px 16px', minHeight: '36px' }}
          >
            <Plus className="h-4 w-4 text-white" />
            <span>Open New Case Folder</span>
          </button>
        </div>
      </div>

      {/* RENDER DETAILED PORTFOLIO BOTTLENECK ANALYTICS */}
      {activePanel === 'analytics' ? (
        <div className="space-y-4">
          <CaseAnalyticsView cases={cases} />
        </div>
      ) : activePanel === 'detail' && selectedCase ? (
        
        // ==========================================
        // INDIVIDUAL MATTER DETAIL VIEW LAYOUT SCREEN
        // ==========================================
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="matter-detailed-layout-grid">
          
          {/* Identity left block panel */}
          <div className="lg:col-span-4 space-y-4">
            <CaseDetailLeftPanel 
              caseData={selectedCase}
              client={(selectedCase as any).client || { fullName: 'Not mapped ID' }}
              lawyers={lawyers}
              onUpdateCaseDetails={handleUpdateCase}
            />
          </div>

          {/* Activity tabs right panel */}
          <div className="lg:col-span-8 bg-white border rounded-2xl p-5 space-y-5 shadow-xs flex flex-col justify-between">
            
            {/* Headers action items */}
            <div className="flex flex-wrap justify-between items-center pb-3 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight font-sans">
                  Matter Active Ledger
                </h3>
              </div>

              {/* Action buttons list */}
              <div className="flex flex-wrap gap-1.5 text-xxs font-extrabold">
                <button 
                  onClick={() => setTransferModalOpen(true)}
                  className="p-2 border hover:bg-slate-50 rounded-lg flex items-center gap-1 bg-white cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3 text-indigo-600" />
                  <span>Execute Handover</span>
                </button>

                <button 
                  onClick={() => setIsBundleOpen(true)}
                  className="p-2 border hover:bg-slate-50 rounded-lg flex items-center gap-1 bg-white cursor-pointer"
                >
                  <Layers className="h-3 w-3 text-emerald-600" />
                  <span>Compile Court Bundle</span>
                </button>

                <button 
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Archive matter ${selectedCase?.referenceNumber}?\n\n` +
                      `Archived matters are removed from the active list but all ` +
                      `data is preserved. You can restore from Settings.`
                    );
                    if (!confirmed) return;
                    
                    handleUpdateCase({ isArchived: true, status: 'CLOSED' } as any);
                    
                    // Navigate back to list after archiving
                    setTimeout(() => {
                      setActivePanel('list');
                      if (onCloseDetail) onCloseDetail();
                      triggerAlert(
                        `Matter ${selectedCase?.referenceNumber} has been archived ` +
                        `successfully. It has been removed from the active cases list.`,
                        "Matter Archived"
                      );
                    }, 500);
                  }}
                  className="p-2 border hover:bg-slate-50 rounded-lg flex items-center gap-1 bg-white hover:text-rose-700 cursor-pointer"
                >
                  <FolderArchive className="h-3 w-3 text-rose-500" />
                  <span>Archive Folder</span>
                </button>
              </div>
            </div>

            {/* Individual tab indicators */}
            <div className="flex border-b border-gray-300 text-xs font-bold gap-3 select-none overflow-x-auto min-h-[44px]">
              {[
                { id: 'overview', title: 'Case Overview' },
                { id: 'diary', title: 'Case Diary Timeline' },
                { id: 'court', title: "Appearances & Court" },
                { id: 'documents', title: 'Documents approvals' },
                { id: 'client_updates', title: 'Client dispatch logs' },
                { id: 'financials', title: 'Financials Ledger (New!)' },
                { id: 'team', title: 'Associates Team (New!)' },
                { id: 'internal_chat', title: 'Private Court Logs Chat' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-xs transition duration-150 rounded-lg cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-sky-500 text-white font-extrabold shadow' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </div>

            {/* Render selected right sub-tab panels */}
            <div>
              
              {/* TAB 1: OVERVIEW COMPREHENSIVE IDENTITIES */}
              {activeTab === 'overview' && (
                <div className="space-y-4 animate-fade-in" id="overview-tab-content">
                  {/* Contact brief */}
                  <div className="bg-slate-50 p-4 border rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-450 block">Assigned client contact dossier</span>
                      <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">{(selectedCase as any).client?.fullName}</h4>
                      <p className="text-xxs text-slate-500">{(selectedCase as any).client?.email || 'voyyagic@gmail.com'}</p>
                    </div>
                    <div className="border-l pl-4 font-mono text-xxs bg-white/50 p-2.5 rounded-lg border">
                      <span className="font-bold text-slate-400 block pb-1 border-b">Filing Reference coordinates</span>
                      <p className="pt-1 mt-0.5 text-slate-705">Matter Code: {selectedCase.referenceNumber}</p>
                    </div>
                  </div>

                  {/* Practice allocation analytics bottleneck advisor summary */}
                  <CaseAnalyticsView cases={cases} activeCase={selectedCase} />
                </div>
              )}

              {/* TAB 2: CASE DIARY TIMELINE ENTRY LOGS */}
              {activeTab === 'diary' && (
                <div className="space-y-4 animate-fade-in" id="diary-timeline-tab-content">
                  {/* Milestones Horizontal Summary strips */}
                  <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl border flex justify-between items-center text-center text-xs select-none">
                    <span className="text-indigo-400 font-bold uppercase text-[9px] block">Timeline milestones strip</span>
                    <div className="flex gap-4 font-mono font-bold text-[10px]">
                      {diaryEvents.filter(d => d.isPinned).map((v, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          <span className="line-clamp-1 max-w-[120px] text-slate-100 text-xs">{v.text}</span>
                        </div>
                      ))}
                      {diaryEvents.filter(d => d.isPinned).length === 0 && (
                        <span className="text-slate-400 font-normal italic block text-xxs">Pin key entries to lock milestone status reports.</span>
                      )}
                    </div>
                  </div>

                  {/* Core diary timelines compiler */}
                  <form onSubmit={handleAddDiaryEntry} className="bg-slate-50 p-4 border rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 text-xxs font-semibold">
                    <div className="md:col-span-8">
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Diary Item narrative / Court briefs *</label>
                      <input 
                        type="text" 
                        required 
                        value={diaryNotes} 
                        onChange={e => setDiaryNotes(e.target.value)}
                        placeholder="Draft entries e.g. Transmitted summons file briefs..." 
                        className="w-full text-xxs p-2 bg-white border rounded-lg outline-none focus:ring-1 focus:ring-indigo-150"
                      />
                    </div>

                    <div className="md:col-span-4 grid grid-cols-2 gap-1 px-1">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Category</label>
                        <select value={diaryCategory} onChange={e => setDiaryCategory(e.target.value)} className="w-full p-1.5 border rounded-lg bg-white">
                          <option value="Court appearance">Court date</option>
                          <option value="Client meeting">Consultation</option>
                          <option value="Documents filed">Filing Action</option>
                          <option value="Settlement offer">Settlement Brief</option>
                          <option value="General">General Notes</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="custom-check select-none pb-2 mt-2">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={diaryBillable} 
                            onChange={(e) => setDiaryBillable(e.target.checked)} 
                          />
                          <span className="check-circle"></span>
                          <span className="text-[11px] font-medium text-slate-705 text-slate-700">Billable hrs</span>
                        </label>
                      </div>
                    </div>

                    <div className="md:col-span-12 flex justify-between items-center border-t pt-2.5">
                      <div className="flex gap-1.5 items-center">
                        <span className="text-[10px] text-slate-400">Timeline Color Tag:</span>
                        {['indigo', 'rose', 'emerald', 'amber', 'slate'].map(cl => (
                          <button
                            key={cl}
                            type="button"
                            onClick={() => setDiaryColor(cl)}
                            className={`h-4 w-4 rounded-full border ${diaryColor === cl ? 'ring-2 ring-indigo-500' : ''}`}
                            style={{ backgroundColor: cl === 'indigo' ? '#4f46e5' : cl === 'rose' ? '#e11d48' : cl === 'emerald' ? '#059669' : cl === 'amber' ? '#d97706' : '#475569' }}
                          />
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setShowBulkDiary(!showBulkDiary)}
                          className="text-xs bg-[#f3f4f6] hover:bg-[#e5e7eb] border border-[#d1d5db] font-bold rounded-lg cursor-pointer text-[#374151] px-3 flex items-center justify-center"
                          style={{ height: '36px' }}
                        >
                          Add multiple entries
                        </button>
                        <button 
                          type="button" 
                          onClick={handleDownloadDiaryReport}
                          className="text-xs bg-[#f3f4f6] hover:bg-[#e5e7eb] border border-[#d1d5db] font-bold rounded-lg cursor-pointer text-[#374151] px-3 flex items-center justify-center"
                          style={{ height: '36px' }}
                        >
                          Export Diary report
                        </button>
                        <button type="submit" className="text-xs font-bold rounded-lg px-4 text-white bg-[#3b82f6] hover:bg-[#2563eb] border-none" style={{ height: '36px' }}>Append entry</button>
                      </div>
                    </div>
                  </form>

                  {/* Bulk Grid compiler screen overlay */}
                  {showBulkDiary && (
                    <form onSubmit={handleBulkDiarySubmit} className="bg-slate-900 text-slate-100 p-4 border rounded-xl space-y-3 font-mono text-[10px] animate-fade-in select-none">
                      <span className="block font-bold text-indigo-400 uppercase text-[9px]">Timeline backlogged entries bulk grid editor</span>
                      <p className="text-slate-400">Write each diary event on a new line. We will batch register them with standard 1 billable hour.</p>
                      <textarea 
                        rows={4} 
                        required 
                        value={bulkDiaryText}
                        onChange={e => setBulkDiaryText(e.target.value)}
                        placeholder="Summons served indices of claim.\nSent corporate documents index folders.\nChecked witness statements parameters."
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 leading-relaxed focus:outline-none"
                      />
                      <div className="flex justify-end gap-2 text-xxs font-semibold">
                        <button type="button" onClick={() => setShowBulkDiary(false)} className="text-xs px-3 bg-[#f3f4f6] hover:bg-[#e5e7eb] border border-[#d1d5db] font-bold rounded-lg text-[#374151] cursor-pointer" style={{ height: '36px' }}>Cancel</button>
                        <button type="submit" className="text-xs px-4 bg-[#3b82f6] hover:bg-[#2563eb] border-none font-bold rounded-lg text-white cursor-pointer" style={{ height: '36px' }}>Batch Add</button>
                      </div>
                    </form>
                  )}

                  {/* List timeline events */}
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {diaryEvents.map(item => (
                      <div key={item.id} className="p-3 bg-white border border-slate-200/80 rounded-xl relative hover:shadow-xxs transition flex justify-between items-start">
                        <div className="flex items-start gap-2.5">
                          {/* Color strip marker */}
                          <div className="h-10 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color === 'indigo' ? '#4f46e5' : item.color === 'rose' ? '#e11d48' : item.color === 'emerald' ? '#059669' : item.color === 'amber' ? '#d97706' : '#475569' }} />
                          <div>
                            <div className="flex gap-2 items-center">
                              <span className="text-[10px] font-bold text-slate-500 font-mono">{item.date}</span>
                              <span className="text-[9px] bg-slate-100 font-black text-slate-650 px-1.5 py-0.5 rounded uppercase tracking-wide">{item.category}</span>
                              {item.hours > 0 && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border p-0.5 px-1 rounded font-mono">£{item.hours * 150} billable</span>}
                            </div>
                            <p className="text-xs text-slate-750 font-medium italic mt-1 font-sans">"{item.text}"</p>
                          </div>
                        </div>

                        {/* Interactive items approvals toggles */}
                        <div className="flex gap-1.5 shrink-0 select-none">
                          <button 
                            onClick={() => togglePinDiary(item.id)}
                            className={`p-1 border rounded hover:bg-slate-50 cursor-pointer ${item.isPinned ? 'bg-amber-50 text-amber-600 border-amber-205' : 'text-slate-400'}`}
                          >
                            <Pin className="h-3 w-3" />
                          </button>
                          
                          {item.reviewStatus === 'Pending' ? (
                            <button 
                              onClick={() => handleApproveDiary(item.id)}
                              className="text-[9px] bg-indigo-50 border hover:bg-indigo-100 text-indigo-700 font-black p-0.5 px-2 rounded cursor-pointer"
                            >
                              Approve
                            </button>
                          ) : (
                            <span className="text-[9px] bg-emerald-50 font-black text-emerald-800 p-1 px-2.5 rounded select-none border">Approved</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: COURT APPEARANCES tracker */}
              {activeTab === 'court' && (
                <div className="space-y-4 animate-fade-in" id="court-appearances-tab-content">
                  {/* Log form */}
                  <form onSubmit={handleAddAppearance} className="bg-slate-50 p-4 border rounded-xl grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xxs font-semibold">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Court Date *</label>
                      <input type="date" required value={courtDate} onChange={e => setCourtDate(e.target.value)} className="w-full text-xxs p-1.5 bg-white border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Courtroom / Place</label>
                      <input type="text" placeholder="E.g. Chamber 4" value={courtRoom} onChange={e => setCourtRoom(e.target.value)} className="w-full text-xxs p-1.5 bg-white border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Presiding Judge</label>
                      <input type="text" placeholder="E.g. Lord Justice" value={presidingJudge} onChange={e => setPresidingJudge(e.target.value)} className="w-full text-xxs p-1.5 bg-white border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Appearance type</label>
                      <select value={appearanceType} onChange={e => setAppearanceType(e.target.value)} className="w-full text-xxs p-1.5 bg-white border rounded-lg">
                        <option value="Mention">Mention Action</option>
                        <option value="Directions Hearing">Directions Hearing</option>
                        <option value="Application">Application pleading</option>
                        <option value="Full trial session">Full Trial</option>
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Ruling Outcome Parameters</label>
                      <input type="text" placeholder="E.g. Pleadings ordered matching index deadlines outlines..." value={rulingOutcome} onChange={e => setRulingOutcome(e.target.value)} className="w-full text-xxs p-2 bg-white border rounded-lg" />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="custom-check pb-2 font-bold text-red-700 uppercase select-none">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={adjournedCheck} 
                          onChange={(e) => setAdjournedCheck(e.target.checked)} 
                        />
                        <span className="check-circle"></span>
                        <span className="text-[10px]">Adjourned Case?</span>
                      </label>
                    </div>

                    {adjournedCheck && (
                      <div className="md:col-span-4 bg-orange-50 border p-3.5 rounded-xl space-y-2 animate-fade-in text-xxs">
                        <label className="block font-bold text-orange-950 uppercase">Next adjournment scheduled appearance date *</label>
                        <p className="text-slate-500">Checking this automatically calculates and schedules discovery calendars.</p>
                        <input type="date" required value={adjournedDate} onChange={e => setAdjournedDate(e.target.value)} className="p-1 px-3 bg-white border rounded" />
                      </div>
                    )}

                    <div className="md:col-span-4 self-end pt-1">
                      <button type="submit" className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold rounded-lg cursor-pointer border-none flex items-center justify-center text-xs" style={{ height: '36px' }}>
                        Append Court appearance Outcome
                      </button>
                    </div>
                  </form>

                  {/* List registered appearances outcomes */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {courtAppearances.map(cap => (
                      <div key={cap.id} className="p-3.5 bg-white border rounded-xl text-xs space-y-1.5 flex justify-between items-start hover:shadow-xxs transition">
                        <div>
                          <div className="flex gap-2 items-center">
                            <span className="font-mono font-bold text-[10px] text-slate-500">{cap.date}</span>
                            <span className="font-extrabold text-indigo-700 bg-indigo-50 border p-0.5 px-2 rounded text-[9px] uppercase">{cap.type}</span>
                            <span className="text-[10px] font-bold text-slate-500">{cap.judge} &bull; {cap.room}</span>
                          </div>
                          <p className="font-medium text-slate-700 italic mt-1 font-sans">"{cap.outcome}"</p>
                          {cap.nextAdjournedDate && (
                            <span className="text-[9px] block text-rose-600 font-extrabold bg-red-50 p-0.5 px-2.5 rounded border max-w-xs mt-1.5">
                              📅 SCHEDULED NEXT ADJOURNMENT: {cap.nextAdjournedDate}
                            </span>
                          )}
                        </div>
                        <span className={`p-1 px-2.5 text-[8px] tracking-wide rounded font-black uppercase text-center shrink-0 border ${
                          cap.status === 'Adjourned' ? 'bg-orange-50 text-orange-850' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {cap.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: DOCUMENTS INVENTORY */}
              {activeTab === 'documents' && (
                <div className="space-y-4 animate-fade-in" id="documents-approvals-tab-content">
                  <div className="flex justify-between items-center text-xs pb-1.5 border-b select-none font-bold text-slate-500">
                    <span>Matter docket folder files</span>
                    <button 
                      onClick={() => setIsBundleOpen(true)}
                      className="text-xs px-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold rounded-lg cursor-pointer border-none flex items-center justify-center"
                      style={{ height: '36px' }}
                    >
                      + Compile court bundle index
                    </button>
                  </div>

                  {/* Received files and approval tables */}
                  {caseDocsList.length === 0 ? (
                    <p className="text-center py-8 text-xs text-slate-400 font-medium">No docket documents saved in case directory.</p>
                  ) : (
                    <div className="space-y-2">
                      {caseDocsList.map(doc => {
                        const status = docApprovals[doc.id] || 'Pending';
                        const isMainBundle = doc.id.includes('bundle');
                        const isInvoiceObj = doc.id.includes('invoice');

                        return (
                          <div key={doc.id} className="p-3 bg-white border rounded-xl flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                              <div>
                                <span className="font-bold text-slate-850 truncate max-w-[240px] block">
                                  {isMainBundle ? 'Compiled Court Pleading Bundle' : isInvoiceObj ? 'Statement invoice' : 'Matter attachment brief'}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">ID {doc.id.substring(doc.id.length - 6)} &bull; {new Date(doc.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="flex gap-2 select-none items-center">
                              {status === 'Pending' ? (
                                <button 
                                  onClick={() => {
                                    const expanded = { ...docApprovals, [doc.id]: 'Approved' as const };
                                    setDocApprovals(expanded);
                                    localStorage.setItem(`docket_case_documents_approvals_${selectedCase.id}`, JSON.stringify(expanded));
                                  }}
                                  className="text-[9px] bg-indigo-50 border hover:bg-indigo-100 text-indigo-700 font-black p-0.5 px-2 rounded cursor-pointer"
                                >
                                  Mark Approved
                                </button>
                              ) : (
                                <span className="text-[9px] bg-emerald-50 font-black text-emerald-850 p-1 px-2 rounded border">Approved</span>
                              )}

                              <button 
                                onClick={() => {
                                  // Preview doc text
                                  triggerAlert(doc.content, `Preview: ${doc.title}`);
                                }}
                                className="p-1 hover:bg-slate-50 border rounded"
                              >
                                <Eye className="h-3 w-3 text-slate-500" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CLIENT COMMUNICATIONS UPDATES DISPATCHES */}
              {activeTab === 'client_updates' && (
                <div className="space-y-4 animate-fade-in" id="client-communication-dispatches-tab">
                  {/* Dispatch editor */}
                  <form onSubmit={handleSendClientUpdate} className="bg-slate-50 p-4 border rounded-xl space-y-3 text-xxs font-semibold">
                    <span className="block font-bold text-slate-450 uppercase text-[9px]">Draft secure newsletter updates for dispatch</span>
                    <textarea 
                      rows={3}
                      required
                      value={clientUpdateDraft}
                      onChange={e => setClientUpdateDraft(e.target.value)}
                      placeholder="Write updates message e.g. We have prepared preliminary folders index and waiting presiding circuit confirm..."
                      className="w-full text-xs p-2.5 bg-white border rounded-xl"
                    />

                    <div className="flex flex-wrap justify-between items-center pt-1 block">
                      <div className="flex gap-3 text-xxs items-center">
                        <label className="custom-check select-none font-bold text-slate-700">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={scheduleToggle} 
                            onChange={(e) => setScheduleToggle(e.target.checked)} 
                          />
                          <span className="check-circle"></span>
                          <span className="text-[11px]">Schedule dispatch timer</span>
                        </label>
                        {scheduleToggle && (
                          <input type="time" value={scheduleSendTime} onChange={e => setScheduleSendTime(e.target.value)} className="p-1 bg-white border rounded" />
                        )}
                      </div>

                      <button type="submit" className="p-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow min-h-[44.5px]">
                        Add dispatch Update Draft
                      </button>
                    </div>
                  </form>

                  {/* Read receipts simulation logs thread */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {clientReplies.map(rep => (
                      <div key={rep.id} className="p-3 bg-white border rounded-xl text-xxs leading-relaxed flex justify-between items-start space-y-1 hover:bg-slate-50/20 transition">
                        <div>
                          <div className="flex gap-2 items-center text-[9px] text-slate-400 font-bold">
                            <span>{rep.date}</span>
                            <span className="font-extrabold uppercase text-indigo-700 bg-indigo-50 border p-0.5 rounded px-1.5">{rep.type}</span>
                            <span>Sender: {rep.sender}</span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium italic mt-1 font-sans">"{rep.text}"</p>
                        </div>
                        <span className="text-[8px] bg-slate-100 font-semibold p-0.5 px-1 rounded flex items-center gap-1">
                          <Check className="h-3 w-3 text-indigo-630" />
                          <span>Opened</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6 & 7: MODULAR EXTENDED FINANCIALS & COLLABORATIVE SERVICES */}
              {(activeTab === 'financials' || activeTab === 'team') && (
                <CaseDetailTabs 
                  activeTab={activeTab}
                  caseData={selectedCase}
                  client={(selectedCase as any).client || { fullName: 'Not mapped' }}
                  lawyers={lawyers}
                  feeNotes={feeNotes}
                  disbursements={disbursements}
                  handovers={handovers}
                  onOpenInvoiceWizard={() => setIsInvoiceOpen(true)}
                  onOpenTransferModal={() => setTransferModalOpen(true)}
                  onAddFeeNote={(note) => {
                    const expanded = [{ id: 'fee-' + Date.now(), ...note, status: 'unbilled' as const }, ...feeNotes];
                    setFeeNotes(expanded);
                    localStorage.setItem(`docket_case_feenotes_${selectedCase.id}`, JSON.stringify(expanded));
                  }}
                  onAddDisbursement={(disb) => {
                    const expanded = [{ id: 'disb-' + Date.now(), ...disb, status: 'unbilled' as const }, ...disbursements];
                    setDisbursements(expanded);
                    localStorage.setItem(`docket_case_disbursements_${selectedCase.id}`, JSON.stringify(expanded));
                  }}
                />
              )}

              {/* TAB 8: INTERNAL COMM PRIVATE CHATS TEAM CHANNELS */}
              {activeTab === 'internal_chat' && (
                <div className="space-y-4 animate-fade-in" id="internal-chat-panel">
                  {/* Messages bubble */}
                  <div className="bg-slate-55 bg-slate-50 p-3.5 border rounded-xl space-y-2.5 max-h-[300px] overflow-y-auto pr-1 select-none">
                    {internalChats.map(item => (
                      <div key={item.id} className="text-xxs space-y-0.5">
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                          <span>{item.author} ({item.timestamp})</span>
                          {item.onRecord && <span className="text-red-700 bg-red-50 p-0.5 px-2 rounded-full font-black uppercase text-[8px] border">On record</span>}
                        </div>
                        <div className={`p-2.5 rounded-lg border leading-relaxed font-sans ${
                          item.author === 'Voyyagic' ? 'bg-indigo-50 border-indigo-150 text-indigo-950 font-medium' : 'bg-white text-slate-700'
                        }`}>
                          "{item.text}"
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendChatMessage} className="bg-slate-100 p-3 rounded-xl border flex gap-2 items-center text-xxs font-semibold">
                    <input 
                      type="text" 
                      required
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      placeholder="Type private team memo message..."
                      className="text-xs p-2.5 bg-white border rounded-xl flex-1 outline-none"
                    />

                    <label className="custom-check shrink-0 text-[10px] font-black uppercase text-red-700 select-none">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={chatOnRecord} 
                        onChange={(e) => setChatOnRecord(e.target.checked)} 
                      />
                      <span className="check-circle"></span>
                      <span>On record</span>
                    </label>

                    <button type="submit" className="text-xs px-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold rounded-lg cursor-pointer border-none flex items-center justify-center shadow-sm" style={{ height: '36px' }}>
                      Send
                    </button>
                  </form>
                </div>
              )}

            </div>

          </div>

        </div>

      ) : (

        // ==========================================
        // PRIMARY CASING LIST SCREEN PANELS VIEW
        // ==========================================
        <div className="space-y-4" id="docket-primary-listing-viewport">
          
          {/* Static dashboard metric counts */}
          <CaseStatsStrip 
            cases={cases}
            activeFilter={selectedStatFilter}
            onFilterSelect={setSelectedStatFilter}
            lawyersCount={lawyers?.length}
          />

          {/* Filtering control headings */}
          <div className="bg-white p-4.5 rounded-2xl border space-y-4 shadow-xxs">
            
            {/* Horizontal parameters filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 select-none">
              <div className="relative max-w-sm flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Query reference name, client search, or flags list..."
                  className="w-full text-xs pl-4 pr-4 py-2 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-sky-150"
                />
              </div>

              {/* Filters dropdowns tags */}
              <div className="flex flex-wrap gap-2 text-xxs font-extrabold select-none">
                <div>
                  <select
                    value={selectedTypeFilter}
                    onChange={e => setSelectedTypeFilter(e.target.value)}
                    className="p-1 px-3.5 bg-slate-50 border rounded-lg cursor-pointer"
                  >
                    <option value="All">All Specialty categories</option>
                    <option value="Civil">Civil Pleading</option>
                    <option value="Criminal">Criminal Defense</option>
                    <option value="Family">Family Mediation</option>
                    <option value="Transactional">Corporate M&A</option>
                  </select>
                </div>

                <div>
                  <select
                    value={selectedFlagFilter}
                    onChange={e => setSelectedFlagFilter(e.target.value)}
                    className="p-1 px-3.5 bg-slate-50 border rounded-lg cursor-pointer"
                  >
                    <option value="All">All Workflow Flags</option>
                    <option value="Awaiting Client">Awaiting Client Reply</option>
                    <option value="Awaiting Court">Awaiting Court directive</option>
                    <option value="Awaiting Opponent">Awaiting Opponent motion</option>
                    <option value="Media Critical">Media Critical</option>
                  </select>
                </div>

                <div>
                  <select
                    value={selectedPriorityFilter}
                    onChange={e => setSelectedPriorityFilter(e.target.value)}
                    className="p-1 px-3.5 bg-slate-50 border rounded-lg cursor-pointer"
                  >
                    <option value="All">All Priority levels</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Clear selectors */}
                {(selectedTypeFilter !== 'All' || selectedFlagFilter !== 'All' || selectedPriorityFilter !== 'All' || selectedStatFilter || searchQuery) && (
                  <button 
                    onClick={() => {
                      setSelectedTypeFilter('All');
                      setSelectedFlagFilter('All');
                      setSelectedPriorityFilter('All');
                      setSelectedStatFilter(null);
                      setSearchQuery('');
                    }}
                    className="text-xxs p-1.5 px-3 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-lg cursor-pointer transition hover:bg-rose-100"
                  >
                    Clear Filter
                  </button>
                )}

                <button 
                  type="button"
                  onClick={() => setShowSaveModal(true)}
                  className="text-xxs p-1.5 px-3 bg-sky-50 border border-sky-150 text-sky-700 font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition"
                >
                  <Star className="h-3 w-3 shrink-0" />
                  <span>Save Search</span>
                </button>
              </div>
            </div>

            {/* Render saved search quick chips */}
            {savedSearches.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t text-[10px] items-center text-slate-400 select-none">
                <span className="font-bold">Saved Searches:</span>
                {savedSearches.map((sv, idx) => (
                  <div key={idx} className="bg-slate-50 border p-1 rounded-lg flex items-center gap-2 font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTypeFilter(sv.type);
                        setSelectedFlagFilter(sv.flag);
                        setSearchQuery(sv.query);
                      }}
                      className="text-indigo-700 hover:underline hover:text-indigo-900 focus:outline-none"
                    >
                      {sv.name}
                    </button>
                    <button 
                      onClick={() => {
                        const revised = savedSearches.filter((_, i) => i !== idx);
                        setSavedSearches(revised);
                        localStorage.setItem('docket_saved_searches', JSON.stringify(revised));
                      }}
                      className="text-rose-500 font-extrabold hover:text-rose-700 font-mono text-[9px]"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BULK ACTIONS BANNER */}
          {bulkSelection.length > 0 && (
            <div className="p-3 bg-slate-900 border text-white rounded-xl flex justify-between items-center text-xs tracking-wide select-none animate-fade-in font-bold">
              <span>Selected {bulkSelection.length} Docket matter rows</span>
              <div className="flex gap-2">
                <button onClick={handleBulkReassign} className="bg-slate-800 text-white p-1 px-3 rounded hover:bg-slate-700 cursor-pointer">Bulk Reassign</button>
                <button onClick={handleBulkChangeStatus} className="bg-slate-800 text-white p-1 px-3 rounded hover:bg-slate-700 cursor-pointer">Bulk Status Change</button>
                <button onClick={() => setBulkSelection([])} className="text-rose-400 p-1 px-3 rounded hover:underline cursor-pointer">Deselect All &times;</button>
              </div>
            </div>
          )}

          {/* Render files lists (Grid/Cards elements viewports) */}
          {filteredCases.length === 0 ? (
            <div className="text-center py-10 sm:py-20 bg-white border rounded-2xl">
              <Layers className="h-7 w-7 sm:h-10 sm:w-10 text-slate-300 mx-auto mb-2 shrink-0" />
              <h3 className="font-extrabold text-slate-800 text-sm">No Legal Pleading Folders Found</h3>
              <p className="text-xxs text-slate-400 mt-0.5">Change search flags list or construct a new file brief above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="primary-cases-grid">
              {filteredCases.map(cs => {
                const isChecked = bulkSelection.includes(cs.id);
                return (
                  <div key={cs.id} className="relative group">
                    <div className={`absolute top-4 left-4 z-10 select-none transition ${isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-center justify-center`}>
                      <label 
                        className="custom-check min-h-0 min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          onChange={() => {
                            setBulkSelection(prev => 
                              isChecked ? prev.filter(i => i !== cs.id) : [...prev, cs.id]
                            );
                          }}
                        />
                        <span className="check-circle"></span>
                      </label>
                    </div>
                    <MatterCardView 
                      caseItem={cs}
                      selectedCaseId={selectedCase?.id || null}
                      onSelectCase={handleSelectCase}
                    />
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* RENDER MODAL: SAVE SEARCH FORM DRAFT DIALOG */}
      {showSaveModal && (
        <div className="fixed inset-y-0 right-0 left-0 md:left-64 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl space-y-4 animate-fade-in mx-auto relative">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider block">Commit Saved Search presets</h4>
            <p className="text-[10px] text-slate-500 leading-normal">Save your actively selected specialty, workflow flags, and priority filter parameters as a quick-access preset.</p>
            <input 
              type="text" 
              placeholder="Name search filters query..." 
              required
              value={newSaveName}
              onChange={e => setNewSaveName(e.target.value)}
              className="text-xs p-2.5 bg-slate-50 border rounded-xl w-full outline-none focus:ring-1 focus:ring-sky-200 focus:bg-white transition"
            />
            <div className="flex justify-end gap-2 text-xxs font-bold pt-1">
              <button 
                onClick={() => setShowSaveModal(false)} 
                className="p-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
              >
                Discard
              </button>
              <button 
                onClick={handleSaveSearchQuery} 
                className="p-2 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition animate-fadeIn"
              >
                Commit Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER MODALS & DRAWER FLOATING PANELS */}
      <PrecedentLibraryPanel 
        isOpen={isPrecedentOpen}
        onClose={() => setIsPrecedentOpen(false)}
        caseType={selectedCase?.caseType || 'Civil'}
        onImportPrecedent={(txt) => {
          setDiaryNotes(txt);
          setActiveTab('diary');
          setIsPrecedentOpen(false);
          triggerAlert("Pleading precedent text successfully copied inline to diary timeline writer!", "Precedent Copied Inline");
        }}
      />

      {customAlert && (
        <div className="fixed inset-y-0 right-0 left-0 md:left-64 bg-slate-950/45 backdrop-blur-xs z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl relative max-w-md w-full animate-fade-in select-none space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <ShieldAlert className="h-5 w-5 text-sky-500 animate-pulse" />
              <h4 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                {customAlert.title || "Firm Workspace Update"}
              </h4>
            </div>
            
            <div className="text-xs text-slate-655 text-slate-700 leading-relaxed font-sans font-medium whitespace-pre-wrap py-1 max-h-[250px] overflow-y-auto">
              {customAlert.message}
            </div>

            <div className="flex justify-end pt-1">
              <button 
                onClick={() => setCustomAlert(null)}
                className="p-2.5 px-6 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition min-h-[44px]"
              >
                Confirm Acknowledgement
              </button>
            </div>
          </div>
        </div>
      )}

      <NewCaseModal 
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        clients={clients}
        cases={cases}
        lawyers={lawyers.map(l => ({ id: l.id, fullName: l.fullName }))}
        onCaseCreated={handleSaveNewCase}
        settings={settings}
      />

      {selectedCase && (
        <>
          <CourtBundleModal 
            isOpen={isBundleOpen}
            onClose={() => setIsBundleOpen(false)}
            caseData={{ ...selectedCase, docs: caseDocsList }}
            onBundleGenerated={handleBundleWorkflowSave}
          />

          <CaseInvoiceWizard 
            isOpen={isInvoiceOpen}
            onClose={() => setIsInvoiceOpen(false)}
            caseRef={selectedCase.referenceNumber}
            client={(selectedCase as any).client || { fullName: 'Voyyagic' }}
            firmName={settings.firmName || "Docket LLC"}
            unbilledFees={feeNotes.filter(f => f.status === 'unbilled')}
            unbilledDisbursements={disbursements.filter(d => d.status === 'unbilled')}
            onInvoiceGenerated={handleInvoiceWorkflowSave}
          />

          <TransferMatterModal 
            isOpen={transferModalOpen}
            onClose={() => setTransferModalOpen(false)}
            caseData={selectedCase}
            lawyers={lawyers.map(l => ({ id: l.id, fullName: l.fullName }))}
            onTransferCompleted={(lawyerId, note) => {
              handleHandoverWorkflowSave(lawyerId, note);
              setTransferModalOpen(false);
            }}
          />
        </>
      )}

    </div>
  );
}

// Map mock/real staff advocates
const lawyers = [
  { id: 'usr-1', fullName: 'Alex Rivera, Esq.', avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Alex' },
  { id: 'usr-2', fullName: 'Marcus Vance III', avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Marcus' },
  { id: 'usr-3', fullName: 'Helen Fletcher', avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Helen' }
];
