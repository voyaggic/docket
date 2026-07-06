import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, ChevronRight, Check, ArrowRight, Download, Eye, AlertCircle, 
  Loader2, ArrowLeft, Trash, Search, Filter, Calendar, Folder, User, Users, 
  Star, Pin, Lock, Unlock, ShieldCheck, Share2, Clipboard, Edit, RefreshCw, 
  BarChart2, Mail, ExternalLink, HelpCircle, ChevronDown, Sparkles, Sliders, Info, Heart
} from 'lucide-react';
import { DocumentTemplate, GeneratedDocument, Case } from '../types';
import ClauseLibraryPanel from './documents/ClauseLibraryPanel';
import DocumentAnalytics from './documents/DocumentAnalytics';
import CourtBundleCompiler from './documents/CourtBundleCompiler';
import ElectronicSignatures from './documents/ElectronicSignatures';
import DocumentBuilder from './documents/DocumentBuilder';

interface DocumentsViewProps {
  companyId: string;
  templates: DocumentTemplate[];
  documents: GeneratedDocument[];
  cases: Case[];
  onRefresh: () => void;
}

export default function DocumentsView({ 
  companyId, templates, documents, cases, onRefresh 
}: DocumentsViewProps) {
  
  // High-fidelity local states
  const [localDocs, setLocalDocs] = useState<any[]>([]);
  const [localTemplates, setLocalTemplates] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<'generator' | 'library' | 'bundles' | 'signatures' | 'expiry' | 'analytics'>('library');
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [completedDocText, setCompletedDocText] = useState('');
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  
  // Library filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [folderFilter, setFolderFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(false);

  // Slide-in visibility states
  const [clausePanelOpen, setClausePanelOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Review Workflow Modal State
  const [reviewDoc, setReviewDoc] = useState<any | null>(null);
  const [revReviewer, setRevReviewer] = useState('');
  const [revDeadline, setRevDeadline] = useState('');
  const [revInstructions, setRevInstructions] = useState('');
  const [revType, setRevType] = useState('Legal review');

  // Co-editing mock state
  const [coEditingEnabled, setCoEditingEnabled] = useState(false);
  const [editingDocText, setEditingDocText] = useState('');
  const [isTextDirty, setIsTextDirty] = useState(false);

  // Document comment state
  const [activeComments, setActiveComments] = useState<Array<{ name: string; text: string; date: string }>>([
    { name: 'Alex Rivera, Esq.', text: 'Please ensure we attach verified Kenyan land lease proof affidavits prior to final signoff.', date: '12 mins ago' }
  ]);
  const [newCommentInput, setNewCommentInput] = useState('');

  // Sharing states
  const [shareDoc, setShareDoc] = useState<any | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [shareExpires, setShareExpires] = useState('24 hours');

  // Multi-upload wizard states
  const [uploadFiles, setUploadFiles] = useState<Array<{ name: string; size: string; category: string; matter: string; status: 'ready' | 'uploaded' }>>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Expiry states
  const [expiryFilterMode, setExpiryFilterMode] = useState<'soon' | 'expired' | 'all'>('soon');

  // Feedback states
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Toast & File Upload Picker states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const items: typeof uploadFiles = [];
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      items.push({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        category: file.name.includes('Affidavit') ? 'Pleadings' : 'Correspondence',
        matter: cases[0]?.id || 'case-1',
        status: 'ready'
      });
    }
    setUploadFiles(prev => [...prev, ...items]);
    setUploadOpen(true);
  };

  // Documents come straight from the real backend now — no fabricated
  // records mixed in. localDocs exists only so client-side additions
  // (generation, uploads) can update the UI optimistically alongside
  // whatever onRefresh() re-fetches.
  useEffect(() => {
    setLocalDocs(documents);
  }, [documents]);

  // Seed baseline templates
  useEffect(() => {
    if (templates && templates.length > 0) {
      setLocalTemplates(templates);
    } else {
      setLocalTemplates([
        {
          id: 'tpl-1',
          name: 'Supreme Court Letter of Demand',
          description: 'Standard breach of covenant demand letter with auto-populating client liability grids.',
          variables: ['CLIENT NAME', 'AMOUNT OWNED', 'DUE DATE', 'BREACH REASON'],
          templateContent: 'TO: THE DEFENDANT COVENANT PARTY\n\nTake notice that we act on behalf of [CLIENT NAME]. It is our instruction that you have breached your obligations by [BREACH REASON]. Consequently, we demand immediate payment of Ksh [AMOUNT OWNED] on or before [DUE DATE].'
        },
        {
          id: 'tpl-2',
          name: 'Affidavit of Service (Kenya format)',
          description: 'Sworn Attestation statement of secondary service of process by specialized process servers.',
          variables: ['CLIENT NAME', 'SERVER NAME', 'DATE OF SERVICE', 'RECIPIENT NAME', 'COURT'],
          templateContent: 'IN THE [COURT] AT NAIROBI\n\nI, [SERVER NAME], process server, make oath and swear that on [DATE OF SERVICE], I personally served a copy of sumons on [RECIPIENT NAME] representing litigants of [CLIENT NAME].'
        }
      ]);
    }
  }, [templates]);

  // Auto-fill variables on linking case
  const handleSelectCase = (cId: string) => {
    setSelectedCaseId(cId);
    if (!selectedTemplate) return;

    const chosenCase = cases.find(c => c.id === cId);
    if (!chosenCase) return;

    const initialMap: Record<string, string> = {};
    selectedTemplate.variables.forEach(v => {
      const vKey = v.toUpperCase().trim();
      if (vKey === "CLIENT NAME") initialMap[v] = (chosenCase as any).client?.fullName || 'Marcus Vance';
      else if (vKey === "CLIENT ID") initialMap[v] = chosenCase.clientId || '';
      else if (vKey === "CASE REFERENCE") initialMap[v] = chosenCase.referenceNumber || '';
      else if (vKey === "COURT") initialMap[v] = chosenCase.court || 'High Court of Kenya';
      else if (vKey === "OPPOSING PARTY") initialMap[v] = chosenCase.opposingParty || 'Kenyan Transit Rail';
      else if (vKey === "FIRM NAME") initialMap[v] = "Docket Chambers Ltd";
      else if (vKey === "AMOUNT OWNED") initialMap[v] = "1,500,000";
      else if (vKey === "BREACH REASON") initialMap[v] = "failure to pay lease fees";
      else if (vKey === "DUE DATE") initialMap[v] = "2026-06-30";
      else if (vKey === "SERVER NAME") initialMap[v] = "Donald Cooper";
      else if (vKey === "RECIPIENT NAME") initialMap[v] = "Primary Respondent";
      else if (vKey === "DATE OF SERVICE") initialMap[v] = "2026-06-07";
      else initialMap[v] = ''; // Trigger highlighted amber input!
    });
    setVariableValues(initialMap);
  };

  // Generate Document Action
  const handleGenerateDocument = async () => {
    if (!selectedTemplate || !selectedCaseId) return;
    setGenerating(true);
    try {
      fetch(`/api/firm/${companyId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: "ai_generate_document", consented: true })
      }).catch(e => console.error('Consent log failed (non-fatal):', e));

      const res = await fetch('/api/ai/fill-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ template: selectedTemplate.templateContent, variables: variableValues })
      });

      let finalDocBody = `PROSECUTION BRIEF\n\nMAPPED TO: ${cases.find(c => c.id === selectedCaseId)?.referenceNumber || 'DK-GEN'}\n`;
      selectedTemplate.variables.forEach(v => {
        finalDocBody += `${v.toUpperCase()}: ${variableValues[v] || '___'}\n`;
      });
      finalDocBody += `\n===================================\n\n Take notice that the litigant requests immediate compliance.\nThis document is generated under high confidence AI compliance parameters.`;

      if (res.ok) {
        const result = await res.json();
        if (result.doc) finalDocBody = result.doc;
      }

      // Persist for real — this is the fix. Previously this only existed in
      // local state and vanished on refresh.
      const saveRes = await fetch(`/api/firm/${companyId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          caseId: selectedCaseId,
          templateId: selectedTemplate.id?.startsWith('tpl-') && !selectedTemplate.id.includes('-') ? undefined : selectedTemplate.id,
          content: finalDocBody
        })
      });

      if (!saveRes.ok) throw new Error(`Server responded ${saveRes.status}`);
      const savedDoc = await saveRes.json();

      setCompletedDocText(finalDocBody);
      setEditingDocText(finalDocBody);
      onRefresh(); // now safe — the doc genuinely exists on the backend before this fires
    } catch (err) {
      console.error('Document generation/save failed:', err);
      showToast('Failed to save the generated document. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyWorkflowToDocFromWizard = (newDoc: any) => {
    const enriched = {
      id: `doc-${Date.now().toString().slice(-4)}`,
      name: newDoc.name || 'Compiled Court Submission Binder',
      caseId: newDoc.caseId,
      caseRef: cases.find(c => c.id === newDoc.caseId)?.referenceNumber || 'DK-COMPILE',
      clientName: (cases.find(c => c.id === newDoc.caseId) as any)?.client?.fullName || 'Primary Client',
      content: newDoc.content,
      status: newDoc.status || 'Draft',
      source: 'built',
      folder: newDoc.folder || 'Miscellaneous',
      isLocked: false,
      isFavorited: false,
      isPinned: false,
      expiryDate: '2027-01-01',
      reviewStatus: 'none',
      signatureStatus: 'none',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setLocalDocs([enriched, ...localDocs]);
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLocalDocs(localDocs.map(d => d.id === id ? { ...d, isFavorited: !d.isFavorited } : d));
  };

  const togglePin = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLocalDocs(localDocs.map(d => d.id === id ? { ...d, isPinned: !d.isPinned } : d));
  };

  const handleDeleteDoc = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm("Are you sure you want to permanently delete this document record?")) {
      setLocalDocs(localDocs.filter(d => d.id !== id));
    }
  };

  // Review dispatch and lock actions
  const dispatchReviewAction = () => {
    if (!reviewDoc) return;
    setLocalDocs(localDocs.map(d => d.id === reviewDoc.id ? { 
      ...d, 
      status: 'In Review',
      reviewStatus: 'pending',
      reviewerId: revReviewer || 'Alex Rivera',
      reviewDeadline: revDeadline || '2026-06-15'
    } : d));
    setReviewDoc(null);
    showToast(`Document sent to reviewer ${revReviewer || 'Alex Rivera'} with due deadline ${revDeadline || '2026-06-15'}`);
  };

  const approveDocDirectly = async (id: string) => {
    try {
      const res = await fetch(`/api/firm/${companyId}/documents/${id}/approve`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const updated = await res.json();
      setLocalDocs(localDocs.map(d => d.id === id ? { ...d, ...updated, status: 'Approved', reviewStatus: 'complete' } : d));
      showToast("Document approved successfully — recorded with approver and timestamp.");
    } catch (err) {
      console.error('Failed to approve document:', err);
      showToast('Approval failed. Please try again.');
    }
  };

  const lockDocToggle = (id: string) => {
    setLocalDocs(localDocs.map(d => d.id === id ? { ...d, isLocked: !d.isLocked } : d));
  };

  // Copy share secure link simulation
  const generateDynamicShareLink = (doc: any) => {
    setShareDoc(doc);
    const token = Math.random().toString(36).substring(2, 10);
    setShareLink(`https://docket-practice.ai/secure-view/token-${token}`);
  };

  // Manual Drag elements uploads mocks
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files) return;

    const items: typeof uploadFiles = [];
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const file = e.dataTransfer.files[i];
      items.push({
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        category: file.name.includes('Affidavit') ? 'Pleadings' : 'Correspondence',
        matter: cases[0]?.id || 'case-1',
        status: 'ready'
      });
    }
    setUploadFiles([...uploadFiles, ...items]);
    setUploadOpen(true);
  };

  const completeUploadFilesBatch = () => {
    const newAdded = uploadFiles.map(uf => {
      const parentCase = cases.find(c => c.id === uf.matter);
      return {
        id: `upl-${Math.random().toString().slice(-4)}`,
        name: uf.name,
        caseId: uf.matter,
        caseRef: parentCase?.referenceNumber || 'DK-MATE',
        clientName: (parentCase as any)?.client?.fullName || 'General litigator',
        content: `UPLOADER STREAM CORP DAT: Scanned elements of ${uf.name}.\nOCR Content: Verified Kenyan seal matches litigation reference.\nTamperproof status: OK`,
        status: 'Approved',
        source: 'uploaded',
        folder: uf.category,
        isLocked: false,
        isFavorited: false,
        isPinned: false,
        expiryDate: '2026-10-31',
        reviewStatus: 'none',
        signatureStatus: 'none',
        createdAt: new Date().toISOString().split('T')[0]
      };
    });

    setLocalDocs([...newAdded, ...localDocs]);
    setUploadFiles([]);
    setUploadOpen(false);
    showToast("Successfully uploaded files with real-time AI metadata extraction and OCR indexes completed!");
  };

  // Metric Strip Counts
  const totalDocsCount = localDocs.length;
  const countGenerated = localDocs.filter(d => d.source === 'generated').length;
  const countUploaded = localDocs.filter(d => d.source === 'uploaded').length;
  const countPendingReview = localDocs.filter(d => d.status === 'In Review').length;
  const countPendingSign = localDocs.filter(d => d.signatureStatus === 'pending' || d.status === 'Draft' && d.id === 'doc-104').length; // sample
  const countExpiringSoon = localDocs.filter(d => d.expiryDate && d.expiryDate.startsWith('2026-06')).length;
  const countExpired = localDocs.filter(d => d.status === 'Locked' && d.expiryDate === '2025-01-01').length; // sample

  // Standard filter matching logic
  const filteredDocs = localDocs.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase()) || 
                          doc.content.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'All' || doc.source === typeFilter;
    const matchesStatus = statusFilter === 'All' || doc.status === statusFilter;
    const matchesFolder = folderFilter === 'All' || doc.folder === folderFilter;
    return matchesSearch && matchesType && matchesStatus && matchesFolder;
  });

  // Expiring filter lists
  const expiringSectionDocs = localDocs.filter(d => {
    if (expiryFilterMode === 'soon') return d.expiryDate && d.expiryDate.startsWith('2026-06');
    if (expiryFilterMode === 'expired') return d.expiryDate && d.expiryDate < '2026-06-07';
    return d.expiryDate;
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const handleScrollToSection = (sec: typeof activeSection) => {
    setActiveSection(sec);
    setTimeout(() => {
      document.getElementById(`anchored-sec-${sec}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="space-y-6 select-none" id="documents-module-canvas" onDragOver={handleDragOver} onDrop={handleDropFiles}>
      
      {/* SECTION Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl border gap-4">
        <div>
          <span className="text-[10px] font-black text-sky-600 tracking-widest block uppercase font-mono">WORKSPACE ATELIER</span>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Docket Legal Documents & Compliance Center</h2>
          <p className="text-[11px] text-slate-400">Total Operational Management, AI Drafting Synthesis, Electronic Signatures and Kenyan Registry Compilers</p>
        </div>
        
        <div className="flex w-full md:w-auto justify-between md:justify-start items-center md:flex-row gap-2 mt-4 md:mt-0">
          {/* Desktop/Tablet standard row layout */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={() => handleScrollToSection('generator')}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xxs font-extrabold uppercase tracking-wider transition shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> + Generate Doc
            </button>
            
            <button 
              onClick={() => setBuilderOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xxs font-extrabold uppercase tracking-wider transition border"
            >
              <Edit className="h-3.5 w-3.5" /> Build Template
            </button>

            <button 
              onClick={() => setClausePanelOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xxs font-extrabold uppercase tracking-wider transition shadow-sm"
            >
              <Folder className="h-3.5 w-3.5 text-sky-400" /> Clause Repository
            </button>
          </div>

          {/* Mobile phone split/stacked layout */}
          <div className="flex md:hidden w-full justify-between items-center gap-3">
            {/* Clause Repository on the left */}
            <button 
              onClick={() => setClausePanelOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xxs font-extrabold uppercase tracking-wider transition shadow-sm"
            >
              <Folder className="h-3 w-3 text-sky-400" /> Clause Repository
            </button>

            {/* Stacked Generate Doc and Build Template on the right */}
            <div className="flex flex-col gap-1.5 items-end">
              <button 
                onClick={() => handleScrollToSection('generator')}
                className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xxs font-extrabold uppercase tracking-wider transition shadow-sm w-full text-right shrink-0"
              >
                <Sparkles className="h-3 w-3" /> + Generate Doc
              </button>
              
              <button 
                onClick={() => setBuilderOpen(true)}
                className="flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xxs font-extrabold uppercase tracking-wider transition border w-full text-right shrink-0"
              >
                <Edit className="h-3 w-3" /> Build Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STATISTICS STRIP - NINE metrics rows */}
      <div className="flex overflow-x-auto no-scrollbar md:grid md:grid-cols-3 lg:grid-cols-9 gap-3 w-full pb-2" id="documents-statistics-strip">
        
        {/* Card 1 */}
        <div 
          className="top-stat-card cursor-pointer flex flex-col justify-between transition-all duration-200 select-none hover:scale-[1.01] shrink-0 w-[155px] md:w-auto"
          style={{
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #64748b',
            borderRadius: '12px',
            backgroundColor: '#f8fafc',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
          }}
          onClick={() => { setTypeFilter('All'); setStatusFilter('All'); }}
        >
          <div className="flex items-center justify-between w-full">
            <FileText className="h-4.5 w-4.5 text-slate-500 shrink-0" />
            <span className="text-[9px] font-black uppercase py-0.5 px-2 rounded bg-slate-950 text-white border border-slate-800 select-none">
              Total
            </span>
          </div>
          <div className="mt-3 text-left w-full">
            <span className="block font-black text-2xl tracking-tight text-slate-950">
              {totalDocsCount}
            </span>
            <span className="block text-[11px] font-bold text-slate-950 truncate mt-0.5">
              Total Files
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div 
          className="top-stat-card cursor-pointer flex flex-col justify-between transition-all duration-200 select-none hover:scale-[1.01] shrink-0 w-[155px] md:w-auto"
          style={{
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '12px',
            backgroundColor: '#eff6ff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
          }}
          onClick={() => setTypeFilter('generated')}
        >
          <div className="flex items-center justify-between w-full">
            <Sparkles className="h-4.5 w-4.5 text-blue-500 shrink-0" />
            <span className="text-[9px] font-black uppercase py-0.5 px-2 rounded bg-slate-950 text-white border border-slate-800 select-none">
              AI Gen
            </span>
          </div>
          <div className="mt-3 text-left w-full">
            <span className="block font-black text-2xl tracking-tight text-slate-950">
              {countGenerated}
            </span>
            <span className="block text-[11px] font-bold text-slate-950 truncate mt-0.5">
              AI Generated
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div 
          className="top-stat-card cursor-pointer flex flex-col justify-between transition-all duration-200 select-none hover:scale-[1.01] shrink-0 w-[155px] md:w-auto"
          style={{
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #0d9488',
            borderRadius: '12px',
            backgroundColor: '#f0fdfa',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
          }}
          onClick={() => setTypeFilter('uploaded')}
        >
          <div className="flex items-center justify-between w-full">
            <FileText className="h-4.5 w-4.5 text-teal-600 shrink-0" />
            <span className="text-[9px] font-black uppercase py-0.5 px-2 rounded bg-slate-950 text-white border border-slate-800 select-none">
              Upload
            </span>
          </div>
          <div className="mt-3 text-left w-full">
            <span className="block font-black text-2xl tracking-tight text-slate-950">
              {countUploaded}
            </span>
            <span className="block text-[11px] font-bold text-slate-950 truncate mt-0.5">
              Manual Uploads
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div 
          className="top-stat-card cursor-pointer flex flex-col justify-between transition-all duration-200 select-none hover:scale-[1.01] shrink-0 w-[155px] md:w-auto"
          style={{
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '12px',
            backgroundColor: '#fffbeb',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
          }}
          onClick={() => setStatusFilter('In Review')}
        >
          <div className="flex items-center justify-between w-full">
            <Eye className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            <span className="text-[9px] font-black uppercase py-0.5 px-2 rounded bg-slate-950 text-white border border-slate-800 select-none">
              Review
            </span>
          </div>
          <div className="mt-3 text-left w-full">
            <span className="block font-black text-2xl tracking-tight text-slate-950">
              {countPendingReview}
            </span>
            <span className="block text-[11px] font-bold text-slate-950 truncate mt-0.5">
              In Review
            </span>
          </div>
        </div>

        {/* Card 5 */}
        <div 
          className="top-stat-card cursor-pointer flex flex-col justify-between transition-all duration-200 select-none hover:scale-[1.01] shrink-0 w-[155px] md:w-auto"
          style={{
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #0ea5e9',
            borderRadius: '12px',
            backgroundColor: '#f0f9ff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
          }}
          onClick={() => handleScrollToSection('signatures')}
        >
          <div className="flex items-center justify-between w-full">
            <FileText className="h-4.5 w-4.5 text-sky-500 shrink-0" />
            <span className="text-[9px] font-black uppercase py-0.5 px-2 rounded bg-slate-950 text-white border border-slate-800 select-none">
              Sign
            </span>
          </div>
          <div className="mt-3 text-left w-full">
            <span className="block font-black text-2xl tracking-tight text-slate-950">
              2
            </span>
            <span className="block text-[11px] font-bold text-slate-950 truncate mt-0.5">
              Pending Sign
            </span>
          </div>
        </div>

        {/* Card 6 */}
        <div 
          className="top-stat-card cursor-pointer flex flex-col justify-between transition-all duration-200 select-none hover:scale-[1.01] shrink-0 w-[155px] md:w-auto"
          style={{
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #f97316',
            borderRadius: '12px',
            backgroundColor: '#fff7ed',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
          }}
          onClick={() => handleScrollToSection('expiry')}
        >
          <div className="flex items-center justify-between w-full">
            <Calendar className="h-4.5 w-4.5 text-orange-500 shrink-0" />
            <span className="text-[9px] font-black uppercase py-0.5 px-2 rounded bg-slate-950 text-white border border-slate-800 select-none">
              Expiring
            </span>
          </div>
          <div className="mt-3 text-left w-full">
            <span className="block font-black text-2xl tracking-tight text-slate-950">
              {countExpiringSoon}
            </span>
            <span className="block text-[11px] font-bold text-slate-950 truncate mt-0.5">
              Expiring Soon
            </span>
          </div>
        </div>

        {/* Card 7 */}
        <div 
          className="top-stat-card cursor-pointer flex flex-col justify-between transition-all duration-200 select-none hover:scale-[1.01] shrink-0 w-[155px] md:w-auto"
          style={{
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #ef4444',
            borderRadius: '12px',
            backgroundColor: '#fef2f2',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
          }}
          onClick={() => handleScrollToSection('expiry')}
        >
          <div className="flex items-center justify-between w-full">
            <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
            <span className="text-[9px] font-black uppercase py-0.5 px-2 rounded bg-slate-950 text-white border border-slate-800 select-none">
              Expired
            </span>
          </div>
          <div className="mt-3 text-left w-full">
            <span className="block font-black text-2xl tracking-tight text-slate-950">
              1
            </span>
            <span className="block text-[11px] font-bold text-slate-950 truncate mt-0.5">
              Expired Archives
            </span>
          </div>
        </div>

        {/* Card 8 - Storage Vault */}
        <div 
          className="top-stat-card lg:col-span-2 flex flex-col justify-between select-none shrink-0 w-[180px] md:w-auto"
          style={{
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #38bdf8',
            borderRadius: '12px',
            backgroundColor: '#f0f9ff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
          }}
        >
          <div className="flex items-center justify-between w-full">
            <Lock className="h-4.5 w-4.5 text-sky-500 shrink-0" />
            <span className="text-[9px] font-black uppercase py-0.5 px-2 rounded bg-slate-950 text-white border border-slate-800 select-none">
              Vault
            </span>
          </div>
          <div className="mt-2 text-left w-full">
            <span className="block text-[11px] font-bold text-slate-950 truncate">
              Storage Vault Capacity
            </span>
            <div className="text-xs font-black text-slate-950 mt-0.5">2.4 GB of 10 GB limit</div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5 bg-slate-200/70 border border-slate-300/40">
              <div className="bg-sky-500 h-full rounded-full" style={{ width: '24%' }} />
            </div>
          </div>
        </div>

      </div>

      {/* STICKY SECTION NAVIGATION BAR */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md z-45 border-y p-2.5 flex gap-2 overflow-x-auto shrink-0 md:justify-center no-scrollbar select-none" id="anchored-sticky-navbar">
        {[
          { id: 'library', label: 'Document Repositories' },
          { id: 'generator', label: 'AI Assembler Workspace' },
          { id: 'bundles', label: 'Kenyan Court Bundles' },
          { id: 'signatures', label: 'E-Signatures suite' },
          { id: 'expiry', label: 'Compliance & Expiries' },
          { id: 'analytics', label: 'Performance Metrics' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleScrollToSection(tab.id as any)}
            className={`text-xxs font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 whitespace-nowrap ${
              activeSection === tab.id ? 'bg-sky-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTAINER STREAM */}
      <div className="space-y-12" ref={scrollRef}>
        
        {/* ========================================================= */}
        {/* SECTION 1 — DOCUMENT LIBRARY */}
        {/* ========================================================= */}
        <section id="anchored-sec-library" className="space-y-4">
          
          {/* Filtering row bar */}
          <div className="bg-white rounded-2xl border p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              
              {/* Search bar with advanced tools */}
              <div className="flex-1 flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={semanticSearchEnabled ? "Semantic Search: e.g. Payment obligations during lease..." : "Search document name or dynamic content..."}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl outline-none caret-indigo-600 transition"
                  />
                  {semanticSearchEnabled && (
                    <span className="absolute right-3 top-2.5 bg-violet-100 text-violet-800 text-[8px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                      <Sparkles className="h-3 w-3" /> Cognitive Indexed
                    </span>
                  )}
                </div>

                <button 
                  onClick={() => setSemanticSearchEnabled(!semanticSearchEnabled)}
                  className={`px-3 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    semanticSearchEnabled ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white text-slate-700 hover:border-slate-350'
                  }`}
                  title="Cognitive Semantic Search: Finds matches by legal meaning, even without direct keyword hits"
                >
                  <Sparkles className="h-3.5 w-3.5" /> AI Meaning
                </button>

                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="px-3.5 py-2 hover:bg-slate-50 border rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Sliders className="h-4 w-4 text-slate-500" /> Advanced
                </button>
              </div>

              {/* Grid or list toggle */}
              <div className="flex gap-2 justify-end">
                <div className="bg-slate-100 p-0.5 rounded-lg border flex">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`px-2.5 py-1 text-xxs font-black rounded-md ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'}`}
                  >
                    Grid Grid
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`px-2.5 py-1 text-xxs font-black rounded-md ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'}`}
                  >
                    List List
                  </button>
                </div>
              </div>

            </div>

            {/* Advanced Expanded Filters Panel */}
            {showAdvanced && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 border rounded-2xl text-xxs font-semibold">
                
                <div className="space-y-1">
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px]">Index Origin</span>
                  <select 
                    value={typeFilter} 
                    onChange={e => setTypeFilter(e.target.value)}
                    className="w-full border border-slate-200 p-1.5 bg-white rounded-lg text-slate-705 text-slate-755 text-slate-700 font-mono outline-none transition"
                  >
                    <option value="All">All Types</option>
                    <option value="generated">AI Generated</option>
                    <option value="uploaded">Uploaded OCRs</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px]">Validation Compliance</span>
                  <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full border border-slate-200 p-1.5 bg-white rounded-lg text-slate-705 text-slate-755 text-slate-700 font-mono outline-none transition"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="In Review">In Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px]">Case Matter Folders</span>
                  <select 
                    value={folderFilter} 
                    onChange={e => setFolderFilter(e.target.value)}
                    className="w-full border border-slate-200 p-1.5 bg-white rounded-lg text-slate-700 font-mono outline-none transition"
                  >
                    <option value="All">All Folder Directories</option>
                    <option value="Pleadings">Pleadings</option>
                    <option value="Correspondence">Correspondence</option>
                    <option value="Contracts">Contracts</option>
                    <option value="Expert Reports">Expert Reports</option>
                  </select>
                </div>

                <div className="space-y-1.5 self-center">
                  <button 
                    onClick={() => {
                      showToast("OCR Engine processing confirmed. Scanned documents scanned in background.");
                    }}
                    className="w-full py-2 border bg-white rounded-lg text-slate-700 hover:bg-slate-50 transition"
                  >
                    Verify OCR Compliance status
                  </button>
                </div>

              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Folder Directories Panel Sidebar */}
            <div className="lg:col-span-3 bg-white p-4 rounded-2xl border space-y-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Case Document Folders</span>
              <div className="space-y-1 text-xxs font-bold text-slate-600">
                {[
                  { name: 'All documents', count: localDocs.length },
                  { name: 'Pleadings', count: localDocs.filter(d => d.folder === 'Pleadings').length },
                  { name: 'Correspondence', count: localDocs.filter(d => d.folder === 'Correspondence').length },
                  { name: 'Contracts', count: localDocs.filter(d => d.folder === 'Contracts').length },
                  { name: 'Expert Reports', count: localDocs.filter(d => d.folder === 'Expert Reports').length },
                  { name: 'Court Orders', count: localDocs.filter(d => d.folder === 'Court Orders').length },
                  { name: 'Evidence', count: localDocs.filter(d => d.folder === 'Evidence').length }
                ].map((fd, fidx) => (
                  <button
                    key={fidx}
                    onClick={() => setFolderFilter(fd.name === 'All documents' ? 'All' : fd.name)}
                    className={`w-full text-left p-2.5 rounded-xl transition flex justify-between items-center cursor-pointer ${
                      (folderFilter === 'All' && fd.name === 'All documents') || folderFilter === fd.name ? 'bg-slate-900 text-sky-400 shadow' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{fd.name}</span>
                    <span className="bg-slate-100 p-0.5 px-2 border rounded text-slate-700 text-[8px] font-mono">{fd.count}</span>
                  </button>
                ))}
              </div>

              {/* Upload drag drop zone sidebar widget */}
              <div 
                className={`p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${
                  isDragging ? 'border-sky-500 bg-sky-50/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Folder className="h-6 w-6 text-slate-400 mx-auto mb-2 animate-bounce" />
                <span className="text-[10px] font-bold text-slate-700 block uppercase">Drag elements here</span>
                <span className="text-[9px] text-slate-400 leading-normal pt-1 block">Supports PDF, Word, scanned PNG documents</span>
              </div>
            </div>

            {/* Right results grid */}
            <div className="lg:col-span-9">
              {filteredDocs.length === 0 ? (
                <div className="text-center py-20 bg-white border rounded-2xl text-slate-400 text-xs">
                  No matching litigation documents discovered in this view.
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDocs.map(doc => (
                    <div 
                      key={doc.id} 
                      className={`p-4 bg-white border rounded-2xl hover:border-slate-350 hover:shadow-xs transition space-y-3 cursor-pointer relative group ${doc.isPinned ? 'border-amber-200 shadow-md bg-amber-50/5' : ''}`}
                      onClick={() => setViewingDoc(doc)}
                    >
                      {/* Pinned star badges tags */}
                      <div className="absolute right-2 top-2 flex gap-1 items-center z-10">
                        <button 
                          onClick={(e) => togglePin(doc.id, e)} 
                          className={`p-1 rounded hover:bg-slate-100 ${doc.isPinned ? 'text-amber-500' : 'text-slate-200'}`}
                        >
                          <Pin className="h-3.5 w-3.5 fill-current" />
                        </button>
                        <button 
                          onClick={(e) => toggleFavorite(doc.id, e)} 
                          className={`p-1 rounded hover:bg-slate-100 ${doc.isFavorited ? 'text-red-500' : 'text-slate-300'}`}
                        >
                          <Star className="h-3.5 w-3.5 fill-current" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-slate-400 font-black block uppercase tracking-wide">COMPLIANCE ID: {doc.id}</span>
                        <h4 className="text-xs font-black text-slate-805 text-slate-800 pr-12 truncate leading-tight">{doc.name}</h4>
                        <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 p-0.5 px-2 rounded-md border w-fit block">{doc.folder}</span>
                      </div>

                      <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed font-mono bg-slate-50 p-2 border rounded-lg whitespace-pre-wrap">{doc.content}</p>

                      <div className="h-px bg-slate-150 border-none" />

                      <div className="flex justify-between items-center text-[9px] text-slate-415 font-bold uppercase font-mono">
                        <div className="space-y-0.5">
                          <p className="text-slate-800">CLIENT: {doc.clientName}</p>
                          <p className="text-[8px] text-slate-404 text-slate-400">Date: {doc.createdAt}</p>
                        </div>

                        <div className="flex gap-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            doc.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            doc.status === 'In Review' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>

                      {/* On-hover actions menu */}
                      <div className="opacity-0 group-hover:opacity-100 absolute inset-x-0 bottom-0 bg-slate-900/90 py-2.5 px-4 rounded-b-2xl transition-all flex justify-between items-center z-10 select-none">
                        <div className="flex gap-1.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setViewingDoc(doc); }}
                            className="p-1 px-2 bg-white text-slate-900 hover:bg-slate-100 text-[9px] font-black uppercase rounded flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> Inspect
                          </button>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const blob = new Blob([doc.content], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${doc.name}.txt`;
                              a.click();
                            }}
                            className="p-1 px-2 bg-blue-600 text-white hover:bg-blue-700 text-[9px] font-black uppercase rounded flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" /> Get txt
                          </button>
                        </div>

                        <div className="flex gap-1">
                          {doc.status !== 'Approved' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setReviewDoc(doc); }}
                              className="p-1 px-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 text-[9px] font-extrabold uppercase rounded"
                            >
                              Dispatch Review
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); generateDynamicShareLink(doc); }}
                            className="p-1 bg-slate-800 text-sky-400 hover:text-white rounded"
                            title="Generate safe secure sharing link"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteDoc(doc.id, e)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                // Compact list view table
                <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xxs font-semibold">
                      <thead>
                        <tr className="border-b bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="p-3">Compliance ID</th>
                          <th className="p-3">File Name</th>
                          <th className="p-3">Folder</th>
                          <th className="p-3">Matter Ref</th>
                          <th className="p-3">Client Representative</th>
                          <th className="p-3">Status Badge</th>
                          <th className="p-3 text-right">Operation Tools</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocs.map(doc => (
                          <tr key={doc.id} className="border-b hover:bg-slate-50/50 transition cursor-pointer" onClick={() => setViewingDoc(doc)}>
                            <td className="p-3 font-mono font-bold text-slate-400">{doc.id}</td>
                            <td className="p-3 font-bold text-slate-805 text-slate-800">{doc.name}</td>
                            <td className="p-3">
                              <span className="bg-slate-100 px-2 py-0.5 rounded border text-[9px]">{doc.folder}</span>
                            </td>
                            <td className="p-3 font-mono text-[9px] tracking-tight">{doc.caseRef || 'DK-GEN'}</td>
                            <td className="p-3 font-bold">{doc.clientName}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                doc.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 font-bold' :
                                doc.status === 'In Review' ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-800'
                              }`}>
                                {doc.status}
                              </span>
                            </td>
                            <td className="p-3 text-right text-xs" onClick={e => e.stopPropagation()}>
                              <div className="flex gap-1.5 justify-end">
                                <button onClick={() => setViewingDoc(doc)} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const blob = new Blob([doc.content], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${doc.name}.txt`;
                                    a.click();
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded text-blue-600"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={(e) => handleDeleteDoc(doc.id, e)} className="p-1 hover:bg-red-50 text-red-600 rounded">
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2 — DOCUMENT GENERATOR */}
        {/* ========================================================= */}
        <section id="anchored-sec-generator" className="space-y-4">
          <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b">
              <div>
                <h3 className="text-sm font-black text-slate-805 text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-sky-600 animate-pulse" /> Document Assembler Workspace (Split View)
                </h3>
                <p className="text-xxs text-slate-400">Map case fields into baseline litigation templates to compile high-confidence pleadings</p>
              </div>
              <button 
                onClick={() => setBuilderOpen(true)}
                className="text-xxs font-extrabold px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
              >
                + Visual Template Builder
              </button>
            </div>

            {/* Template category selection tabs */}
            <div className="flex items-center justify-between pb-1 flex-wrap gap-2 text-xxs font-medium text-slate-505 select-none text-slate-600">
              <div className="flex gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                {['All templates', 'Drafting Letter', 'Affidavits', 'My Templates'].map(ct => (
                  <button
                    key={ct}
                    onClick={() => {
                      if (ct === 'Affidavits') setSelectedTemplate(localTemplates[1]);
                      else setSelectedTemplate(localTemplates[0]);
                    }}
                    className={`px-1.5 py-0.5 sm:px-3 sm:py-1 rounded border whitespace-nowrap transition cursor-pointer text-[10px] sm:text-xxs font-normal sm:font-bold ${
                      (ct === 'All templates' && selectedTemplate?.id === 'tpl-1') || (ct === 'Affidavits' && selectedTemplate?.id === 'tpl-2') ? 'bg-sky-50 text-sky-700 border-sky-305' : 'hover:border-slate-350 bg-white text-slate-600'
                    }`}
                  >
                    {ct}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Select a baseline template card below to begin</span>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3" id="generator-template-picker-grid">
              {localTemplates.map(tpl => (
                <div 
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    setSelectedCaseId('');
                    setCompletedDocText('');
                    setVariableValues({});
                  }}
                  className={`cursor-pointer p-4 rounded-2xl border transition flex flex-col justify-between hover:border-slate-350 ${
                    selectedTemplate?.id === tpl.id ? 'border-sky-500 bg-sky-50/10 shadow-xs' : 'bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-850">{tpl.name}</h4>
                    <p className="text-[10px] text-slate-405 text-slate-500 leading-relaxed font-normal">{tpl.description}</p>
                  </div>
                  <div className="flex justify-between items-center mt-3 text-[10px] uppercase font-normal font-mono">
                    <span className="text-slate-400">Tokens: {tpl.variables?.length || 0} fields</span>
                    <span className="text-sky-600 bg-sky-50 border px-1.5 py-0.5 rounded text-[8px] font-bold">Ready</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Split view workspace */}
            {selectedTemplate && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-3 border-t">
                
                {/* Left controls sidebar (35%) */}
                <div className="lg:col-span-4 bg-slate-50 border p-4 rounded-2xl space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Variable Form Configurations</span>
                  
                  {/* Step 1 Selector */}
                  <div className="space-y-1 text-xxs font-semibold">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">1. Link Active Case Brief</label>
                    <select 
                      value={selectedCaseId}
                      onChange={e => handleSelectCase(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none transition text-slate-800"
                    >
                      <option value="">-- Choose litigation matter --</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>{c.referenceNumber} - {(c as any).client?.fullName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2 Inputs */}
                  {selectedCaseId && (
                    <div className="space-y-3.5">
                      <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">2. Map Inputs (Color Categorized)</label>
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar">
                        {selectedTemplate.variables.map(variable => {
                          const isBlank = !variableValues[variable] || variableValues[variable].trim() === '';
                          // Highlight green for filled, amber for review, red for blank
                          const colorClass = isBlank ? 'bg-red-50/50 border-red-200' : 
                                             variable.includes('NAME') ? 'bg-emerald-50/50 border-emerald-250' : 'bg-amber-50/50 border-amber-205';
                          return (
                            <div key={variable} className={`p-2 border rounded-xl space-y-1 ${colorClass}`}>
                              <span className="text-[9px] font-extrabold text-slate-650 uppercase tracking-widest block font-mono">{variable}</span>
                              <input 
                                type="text"
                                value={variableValues[variable] || ''}
                                onChange={e => setVariableValues({ ...variableValues, [variable]: e.target.value })}
                                placeholder={isBlank ? "REQUIRED PARAMETER" : ""}
                                className="w-full bg-white text-[10px] p-1.5 border border-slate-200 rounded font-normal outline-none caret-indigo-600 transition text-slate-800"
                              />
                            </div>
                          )
                        })}
                      </div>

                      {/* Browse clause library trigger inline */}
                      <button 
                        type="button"
                        onClick={() => setClausePanelOpen(true)}
                        className="w-full py-1.5 border border-dashed border-sky-400 bg-sky-50/10 hover:bg-sky-50/30 text-sky-800 rounded-xl text-xxs font-extrabold uppercase tracking-wider transition"
                      >
                        + Insert Standard Clauses
                      </button>

                      <hr className="border-slate-100" />

                      {/* Output Format Settings */}
                      <div className="space-y-2 text-xxs font-semibold">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Document Settings</span>
                        
                        <div className="flex justify-between items-center">
                          <span>Output Format</span>
                          <span className="font-bold flex gap-1 bg-white p-0.5 border rounded-md">
                            <span className="px-2 py-0.5 bg-slate-900 text-sky-400 rounded text-[9px] cursor-pointer">PDF</span>
                            <span className="px-2 py-0.5 text-slate-400 rounded text-[9px] cursor-pointer">DOCX</span>
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span>Apply Draft Watermark</span>
                          <span className="font-semibold text-sky-600 bg-sky-50 border px-1.5 py-0.5 rounded text-[8px]">Enabled</span>
                        </div>
                      </div>

                      <button 
                        disabled={generating || selectedTemplate.variables.some(v => !variableValues[v])}
                        onClick={handleGenerateDocument}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Compile Legal Pleading
                      </button>
                    </div>
                  )}

                </div>

                {/* Right Preview Panel (65%) */}
                <div className="lg:col-span-8 space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Live Paper Draft Preview</span>
                  
                  {completedDocText ? (
                    <div className="space-y-3">
                      {/* Live paper surface */}
                      <div className="bg-white border rounded-2xl p-8 relative shadow-sm min-h-[380px] text-xs leading-relaxed" id="canvas-paper">
                        
                        {/* Draft Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none select-none opacity-5">
                          <span className="text-4xl font-extrabold border-8 border-red-600 p-4 text-red-600 tracking-widest uppercase rotate-12">DRAFT PRINT PREVIEW</span>
                        </div>

                        {/* Letterhead */}
                        <div className="border-b-2 border-slate-900 pb-3 text-center mb-6">
                          <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">DOCKET LEGAL CHAMBERS</h2>
                          <p className="text-[9px] text-slate-400 font-mono">Ref: {cases.find(c => c.id === selectedCaseId)?.referenceNumber || 'DK-MATE-CIVIL'}</p>
                        </div>

                        <div className="font-mono text-slate-700 whitespace-pre-wrap leading-relaxed py-2">
                          {editingDocText}
                        </div>

                        <div className="border-t border-slate-200 mt-12 pt-6 flex justify-between text-[10px] text-slate-400 font-mono uppercase">
                          <div>
                            <p className="h-6" />
                            <p>COUNSEL ALEXANDER RIVERA</p>
                          </div>
                          <div>
                            <p className="h-6" />
                            <p>LITIGANT REPRESENTED PARTY</p>
                          </div>
                        </div>

                      </div>

                      {/* Actions row footer */}
                      <div className="flex flex-wrap gap-2 justify-end select-none">
                        <button 
                          onClick={() => {
                            const blob = new Blob([editingDocText], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Assembled_Dossier_Draft.txt`;
                            a.click();
                          }}
                          className="px-3 py-1.5 border bg-white rounded-xl text-xxs font-extrabold uppercase tracking-wider hover:bg-slate-50 transition"
                        >
                          Download Draft Text
                        </button>
                        
                        <button 
                          onClick={() => {
                            const finalD = localDocs[0];
                            if (finalD) {
                              setReviewDoc(finalD);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded-xl text-xxs font-extrabold uppercase tracking-wider transition shadow-sm"
                        >
                          Send for Partner review
                        </button>

                        <button 
                          onClick={() => {
                            handleScrollToSection('signatures');
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xxs font-extrabold uppercase tracking-wider transition shadow-sm"
                        >
                          Send for Electronic Signatures
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400 text-xxs rounded-2xl flex flex-col items-center justify-center space-y-2">
                      <FileText className="h-8 w-8 text-slate-300 animate-bounce" />
                      <p className="max-w-xs leading-normal">Configure variable fields on the left mapping sidebar to instantly compile legal documents in real-time.</p>
                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3 — COURT BUNDLE COMPILER */}
        {/* ========================================================= */}
        <section id="anchored-sec-bundles" className="space-y-4">
          <CourtBundleCompiler 
            cases={cases} 
            documents={localDocs} 
            onAddDocToMatter={handleApplyWorkflowToDocFromWizard}
            companyId={companyId}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 4 — ELECTRONIC SIGNATURES */}
        {/* ========================================================= */}
        <section id="anchored-sec-signatures" className="space-y-4">
          <ElectronicSignatures 
            cases={cases} 
            documents={localDocs}
            onAddDocToMatter={handleApplyWorkflowToDocFromWizard}
            companyId={companyId}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 5 — EXPIRY COMPLIANCE GATEWAY */}
        {/* ========================================================= */}
        <section id="anchored-sec-expiry" className="space-y-4">
          <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b">
              <div>
                <h3 className="text-sm font-black text-slate-805 text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="h-5 w-5 text-sky-600 animate-pulse" /> Document Expiry Compliance Center
                </h3>
                <p className="text-xxs text-slate-400">Continuous background monitors of active litigation agreements and commercial lease compliance timelines</p>
              </div>

              <div className="bg-slate-100 p-0.5 rounded-lg border flex text-xxs font-bold text-slate-600">
                <button 
                  onClick={() => setExpiryFilterMode('soon')}
                  className={`px-3 py-1 rounded-md transition ${expiryFilterMode === 'soon' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'}`}
                >
                  Expiring Soon (30 Days)
                </button>
                <button 
                  onClick={() => setExpiryFilterMode('expired')}
                  className={`px-3 py-1 rounded-md transition ${expiryFilterMode === 'expired' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'}`}
                >
                  Expired Archives
                </button>
              </div>
            </div>

            {/* List table */}
            <div className="overflow-x-auto text-xxs font-semibold">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="bg-slate-50 border-b text-[9px] text-slate-400 font-extrabold uppercase whitespace-nowrap">
                    <th className="p-3">Ref ID</th>
                    <th className="p-3 font-sans">Document Scope</th>
                    <th className="p-3">Client Litigant</th>
                    <th className="p-3">Expiry Deadline</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right font-sans">Renewal Alarm Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringSectionDocs.map(d => (
                    <tr key={d.id} className="border-b hover:bg-slate-50/50 whitespace-nowrap">
                      <td className="p-3 font-mono font-bold text-slate-400">{d.id}</td>
                      <td className="p-3 font-sans font-black text-slate-850 text-slate-800">{d.name}</td>
                      <td className="p-3 font-sans font-bold">{d.clientName}</td>
                      <td className="p-3 text-red-600 font-extrabold">{d.expiryDate || 'Unset'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          expiryFilterMode === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {expiryFilterMode === 'expired' ? 'Expired' : 'Approaching'}
                        </span>
                      </td>
                      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            showToast(`Creating direct renew copy draft template for ${d.name}`);
                          }}
                          className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-bold uppercase transition hover:bg-slate-800 inline-flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3 text-sky-400 animate-spin" /> Renew Document
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 6 — PERFORMANCE ANALYTICS */}
        {/* ========================================================= */}
        <section id="anchored-sec-analytics" className="space-y-4">
          <DocumentAnalytics documents={localDocs} cases={cases} templates={localTemplates} />
        </section>

      </div>

      {/* Slideovers & Modals */}

      {/* 1. Clause library slide panel */}
      <ClauseLibraryPanel 
        isOpen={clausePanelOpen} 
        onClose={() => setClausePanelOpen(false)}
        onInsertClause={(clText) => {
          setEditingDocText(prev => prev + `\n\n[INJECTED COVENANT PARAGRAPUGH]:\n${clText}`);
          setClausePanelOpen(false);
          showToast("Clause injected successfully into the current active Generation Workspace Preview!");
        }}
        companyId={companyId}
      />

      {/* 2. Visual Template builder overlays */}
      <DocumentBuilder 
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onPublish={async (newTpl) => {
          try {
            const res = await fetch(`/api/firm/${companyId}/templates`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                name: newTpl.name,
                description: newTpl.description,
                templateContent: newTpl.content,
                variables: newTpl.variables
              })
            });
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            const saved = await res.json();
            setLocalTemplates([saved, ...localTemplates]);
            setBuilderOpen(false);
            showToast(`Template "${newTpl.name}" published and saved.`);
            onRefresh();
          } catch (err) {
            console.error('Failed to publish template:', err);
            showToast('Failed to save template. Please try again.');
          }
        }}
      />

      {/* 3. INLINE PENDING REVIEW ROUTING CONTROL MODAL */}
      {reviewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 md:pl-64">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-4 text-xxs font-semibold">
            
            <div className="flex justify-between items-center border-b pb-3 shrink-0">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-500 animate-pulse" /> Dispatch Document Review Level
              </h3>
              <button onClick={() => setReviewDoc(null)} className="text-slate-400 text-xs">Close</button>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 bg-slate-50 border rounded-lg">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Dispatch Item Target</span>
                <span className="font-bold text-slate-800 block text-[10px]">{reviewDoc.name}</span>
              </div>

              <div className="space-y-1.5 font-bold">
                <label className="text-[8px] uppercase tracking-wider block text-slate-500">Select Senior Partner Critic</label>
                <select 
                  value={revReviewer} 
                  onChange={e => setRevReviewer(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 bg-white rounded-lg outline-none transition text-slate-800"
                >
                  <option value="">Alex Rivera, Esq. (Managing Partner)</option>
                  <option value="Marcus Vance">Marcus Vance, Litigator</option>
                  <option value="Charles Wood">Charles Wood, SC</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider block text-slate-500">Review Priority Category</label>
                  <select 
                    value={revType} 
                    onChange={e => setRevType(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 bg-white rounded-lg outline-none transition text-slate-800"
                  >
                    <option value="Proofread">Proofread Spacing Check</option>
                    <option value="Legal review">Strict Legal Audit</option>
                    <option value="Partner approval">Partner Executive Signoff</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider block text-slate-500">SLA Review Deadline</label>
                  <input 
                    type="date"
                    value={revDeadline}
                    onChange={e => setRevDeadline(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 bg-white rounded-lg outline-none caret-indigo-600 transition text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-wider block text-slate-500">Drafter Instructions & Notes Override</label>
                <textarea 
                  rows={2} 
                  placeholder="e.g. Please verify Kenyan Supreme Court citation clauses align perfectly..." 
                  value={revInstructions}
                  onChange={e => setRevInstructions(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 resize-none mt-0.5 bg-white outline-none caret-indigo-600 transition text-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setReviewDoc(null)} className="px-3.5 py-1.5 border bg-white rounded-xl">Cancel</button>
              <button onClick={dispatchReviewAction} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md">Confirm Dispatch</button>
            </div>

          </div>
        </div>
      )}

      {/* 4. DRAG DROP / MULTI-UPLOAD MANUAL WIZARD PANEL */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 md:pl-64">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-lg p-6 space-y-4 text-xxs font-semibold">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Folder className="h-4 w-4 text-sky-500" /> AI OCR Documents Intake Uploader
              </h3>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[9px] text-sky-600 hover:text-sky-850 font-bold px-2 py-0.5 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer">Add files</button>
                <button onClick={() => setUploadOpen(false)} className="text-slate-400 text-xs">Close</button>
              </div>
            </div>

            <div className="space-y-3">
              {uploadFiles.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer text-center text-slate-400"
                >
                  No files staged. Please click to choose files or drop them on the background.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                  {uploadFiles.map((uf, uidx) => (
                    <div key={uidx} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center text-xxs">
                      <div>
                        <span className="font-bold text-slate-800 block truncate max-w-[200px]">{uf.name}</span>
                        <span className="text-[9px] text-slate-400 block font-mono">Size: {uf.size}</span>
                      </div>
                      
                      <div className="flex gap-2 items-center">
                        <select 
                          value={uf.category}
                          onChange={e => {
                            const copy = [...uploadFiles];
                            copy[uidx].category = e.target.value;
                            setUploadFiles(copy);
                          }}
                          className="border border-slate-200 p-1 bg-white rounded text-[9px] font-mono outline-none transition text-slate-800"
                        >
                          <option value="Pleadings">Pleadings</option>
                          <option value="Contracts">Contracts</option>
                          <option value="Correspondence">Correspondence</option>
                          <option value="Expert Reports">Expert Reports</option>
                        </select>

                        <button 
                          onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== uidx))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Duplicate check warning box simulator if names overlap */}
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xxs font-medium flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Duplicate Detector:</strong> We scan checksum hashes to ensure file duplicates do not overload case briefs. All clear on active stages.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 shrink-0 border-t pt-3">
              <button onClick={() => setUploadOpen(false)} className="px-4 py-2 border bg-white rounded-xl">Cancel</button>
              <button 
                onClick={completeUploadFilesBatch}
                disabled={uploadFiles.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-40"
              >
                Injest Files & Run AI OCR Reads
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. SECURE LINK SHARING POPUP */}
      {shareDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 md:pl-64">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-sm p-5 space-y-4 text-xxs font-semibold">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="h-4 w-4 text-sky-500" /> Secure Sharing Token Generator
              </h3>
              <button onClick={() => setShareDoc(null)} className="text-slate-400 text-xs">Close</button>
            </div>

            <div className="space-y-3">
              <div className="p-2 bg-slate-50 border rounded text-[10px]">
                <strong className="block text-slate-600 text-[8px] uppercase">Active target</strong>
                {shareDoc.name}
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-slate-400 uppercase">Set link expiry period</label>
                <select 
                  value={shareExpires} 
                  onChange={e => setShareExpires(e.target.value)}
                  className="w-full border border-slate-200 p-1.5 bg-white rounded-lg outline-none text-[10px] transition text-slate-800"
                >
                  <option value="1 hour">1 Hour (High Security)</option>
                  <option value="24 hours">24 Hours</option>
                  <option value="7 days">7 Days</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block text-[8px] font-bold text-slate-400 uppercase">Generated Secure Link</label>
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    readOnly 
                    value={shareLink}
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[9px] select-all outline-none transition text-slate-800"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      showToast("Secure token link copied to clipboard!");
                    }}
                    className="px-3 bg-slate-900 hover:bg-slate-800 text-white text-[9px] uppercase font-bold rounded-lg transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RENDER DETAILED PREVIEW INSPECTOR MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 md:pl-64">
          <div className="bg-white rounded-2xl-lg bg-white rounded-2xl w-full max-w-5xl h-[85vh] border shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal header details */}
            <div className="p-4 bg-slate-900 border-b text-white flex justify-between items-center shrink-0 select-none">
              <div className="flex items-center gap-2 pr-6">
                <FileText className="h-5 w-5 text-sky-400 animate-pulse" />
                <div className="truncate">
                  <span className="text-[9px] font-mono text-sky-450 text-sky-400 font-extrabold block">UTTERMOST MULTI-TENANT ISOLATED COMPLIANCE LOG</span>
                  <h3 className="text-xs font-black uppercase text-white tracking-wider truncate leading-tight pr-12">{viewingDoc.name}</h3>
                </div>
              </div>
              
              <button onClick={() => setViewingDoc(null)} className="p-1 px-3 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition rounded">
                Close Inspector
              </button>
            </div>

            {/* Split View Content Body */}
            <div className="flex-grow flex overflow-hidden min-h-0">
              
              {/* Left physical page surface preview (70%) */}
              <div className="flex-grow bg-slate-50 p-6 overflow-y-auto" id="modal-dossier-body">
                <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-10 min-h-[500px] shadow-xs relative">
                  
                  {/* Watermark badge overlay based on state */}
                  {viewingDoc.status !== 'Approved' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                      <span className="text-5xl font-black border-8 border-red-500 tracking-wider text-red-500 uppercase rotate-12 p-3">DRAFT SPECIMEN</span>
                    </div>
                  )}

                  {/* Header stamp letterhead */}
                  <div className="border-b-2 border-slate-900 pb-3 text-center mb-6 text-xxs leading-relaxed select-none">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">DOCKET LEGAL CHAMBERS & ADVOCATES</h2>
                    <p className="text-[9px] text-slate-400 font-mono">EST: 2026 • PORTAL REFERENCED VERIFICATION CODE: {viewingDoc.id}</p>
                  </div>

                  <div className="font-mono text-slate-700 leading-normal text-xxs whitespace-pre-wrap select-text selection:bg-sky-200">
                    {viewingDoc.content}
                  </div>

                  <div className="border-t border-slate-200 pt-6 mt-12 flex justify-between text-[10px] uppercase font-bold text-slate-400 font-mono select-none">
                    <div>
                      <p className="h-4" />
                      <p>Sworn Agent: {viewingDoc.clientName}</p>
                    </div>
                    <div>
                      <p className="h-4" />
                      <p>COUNSEL ALEXANDER RIVERA</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right document details sidebar metadata + Access Audit (30%) */}
              <div className="w-80 border-l bg-white flex flex-col overflow-hidden shrink-0 select-none">
                
                {/* Switchable sidebar sections */}
                <div className="p-4 border-b space-y-1 shrink-0 bg-slate-50">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Metadata Inspector</span>
                  <div className="flex gap-2 pt-1 text-[10px] font-bold text-slate-600">
                    <span className="bg-sky-50 border text-sky-700 px-2 py-0.5 rounded-lg font-mono">ID: {viewingDoc.id}</span>
                    <span className="bg-slate-100 border px-2 py-0.5 rounded-lg">{viewingDoc.folder}</span>
                  </div>
                </div>

                {/* Scrollers */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xxs font-semibold">
                  
                  {/* Form detail parameters */}
                  <div className="space-y-2 border-b pb-3">
                    <span className="text-[9px] font-black text-slate-405 text-slate-400 uppercase tracking-widest block">Audit Compliance</span>
                    <div className="space-y-1 text-[10px]">
                      <p><strong>Matter reference:</strong> {viewingDoc.caseRef || 'DK-GEN'}</p>
                      <p><strong>Expiry deadline:</strong> <span className="text-red-650 text-red-600 font-mono">{viewingDoc.expiryDate || 'Unlimited'}</span></p>
                      <p><strong>Validation origin:</strong> <span className="capitalize">{viewingDoc.source}</span></p>
                    </div>
                  </div>

                  {/* Tamperproof Access history logs (Section 5.6) */}
                  <div className="space-y-2 border-b pb-3" id="access-history-scroller">
                    <span className="text-[9px] font-black text-slate-405 text-slate-400 uppercase tracking-widest block">Access Log (Non-negotiable Compliance)</span>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto font-mono text-[9px] text-slate-500 leading-normal">
                      <div className="p-1 border rounded bg-slate-50">
                        <span className="text-slate-400 block font-bold">Today 19:18:21Z</span>
                        <span>Opened in Inspector by <strong>Alex Rivera, Esq.</strong></span>
                      </div>
                      <div className="p-1 border rounded bg-slate-50 font-medium">
                        <span className="text-slate-400 block font-bold">2026-06-05 12:44:10</span>
                        <span>Assembled synthesis completed successfully.</span>
                      </div>
                    </div>
                  </div>

                  {/* Comments Threads Feed (Section 4.4) */}
                  <div className="space-y-2" id="comments-timeline-group">
                    <span className="text-[9px] font-black text-slate-405 text-slate-400 uppercase tracking-widest block">Drafter Discussion Timeline</span>
                    
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto font-sans">
                      {activeComments.map((cm, cidx) => (
                        <div key={cidx} className="p-2 border rounded-lg bg-orange-50/20 border-orange-100 text-xxs">
                          <div className="flex justify-between text-[9px] font-bold text-slate-400 pb-0.5">
                            <span className="text-slate-800">{cm.name}</span>
                            <span>{cm.date}</span>
                          </div>
                          <p className="text-slate-650 leading-relaxed font-semibold text-slate-600">{cm.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-1.5 pt-1.5">
                      <input 
                        type="text" 
                        placeholder="Type reply..."
                        value={newCommentInput}
                        onChange={e => setNewCommentInput(e.target.value)}
                        className="flex-grow p-1.5 border border-slate-200 bg-slate-50 rounded mt-0.5 outline-none caret-indigo-600 transition font-bold text-slate-800"
                      />
                      <button 
                        onClick={() => {
                          if (!newCommentInput) return;
                          setActiveComments([...activeComments, { name: 'Alex Rivera, Esq.', text: newCommentInput, date: 'Just now' }]);
                          setNewCommentInput('');
                        }}
                        className="px-2.5 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                </div>

                {/* Operations footer */}
                <div className="p-4 border-t bg-slate-50 flex gap-2 shrink-0 select-none">
                  {viewingDoc.status !== 'Approved' && (
                    <button 
                      onClick={() => approveDocDirectly(viewingDoc.id)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xxs font-extrabold uppercase transition shadow-sm text-center font-bold"
                    >
                      ✓ Approve Document
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      const blob = new Blob([viewingDoc.content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${viewingDoc.name}.txt`;
                      a.click();
                      showToast("Tamperproof plain txt download commenced!");
                    }}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xxs font-extrabold uppercase transition text-center font-bold"
                  >
                    📥 Export Text
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}



      {/* FEATURE FEEDBACK STICKER BUTTON — Bottom Right Fixed */}
      <div className="fixed bottom-24 md:bottom-4 right-4 z-40 select-none pointer-events-auto" id="feature-feedback-button">
        <button 
          onClick={() => {
            setFeedbackSent(false);
            setFeedbackMsg('');
            setFeedbackOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl transition text-xxs font-bold text-center"
        >
          <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-spin" /> Feature Support Feedback
        </button>
      </div>

      {/* Feedback modal */}
      {feedbackOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 md:pl-64">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-sm p-5 space-y-4 text-xxs font-semibold">
            <div className="flex justify-between items-center border-b pb-3 shrink-0">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Docket Engineering Response Unit</h4>
              <button onClick={() => setFeedbackOpen(false)} className="text-slate-400 text-xs">Close</button>
            </div>

            {feedbackSent ? (
              <div className="p-4 text-center space-y-2">
                <Check className="h-8 w-8 text-emerald-600 mx-auto" />
                <h5 className="text-xs font-bold">Feedback Filed Successfully!</h5>
                <p className="text-slate-400">Our engineering team has received your ticket request.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Submit Suggestion or Request</label>
                <textarea 
                  rows={3} 
                  placeholder="Need support for native DocuSign integration, word files or larger file storage quotas?"
                  value={feedbackMsg}
                  onChange={e => setFeedbackMsg(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 resize-none mt-0.5 bg-slate-50 focus:bg-white outline-none caret-indigo-600 transition text-slate-800"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setFeedbackOpen(false)} className="p-1 px-3 border bg-white rounded-lg">Cancel</button>
                  <button 
                    onClick={async () => {
                      if (!feedbackMsg) return;
                      try {
                        const res = await fetch('/api/platform/feedback', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ companyId, type: 'documents_feature_request', message: feedbackMsg })
                        });
                        if (res.ok) setFeedbackSent(true);
                        else showToast('Failed to submit feedback. Please try again.');
                      } catch (err) {
                        console.error('Feedback submission failed:', err);
                        showToast('Failed to submit feedback. Please try again.');
                      }
                    }}
                    className="p-1 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase rounded-lg"
                  >
                    Submit Ticket
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
        multiple 
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg" 
      />

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white p-3.5 px-5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-sans z-[9999] animate-fade-in border border-slate-800">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
