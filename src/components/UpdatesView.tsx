import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Send, Mail, Phone, Check, Loader2, Eye,
  Plus, Search, X, Filter, ChevronDown, AlertTriangle,
  Clock, CheckCircle2, XCircle, RotateCcw, ArrowLeft,
  Edit2, Trash2, Forward, RefreshCw, Calendar, Tag,
  User, Briefcase, MoreVertical, Zap, BookOpen, Sparkles,
  ShieldAlert, Volume2, VolumeX, FileText, CheckCircle,
  MessageCircle, FileSpreadsheet, Layers, Settings, Activity,
  Grid, Globe, Lock, Unlock, FileQuestion, ChevronRight, Info, Users
} from 'lucide-react';
import { ClientUpdate, Case, Client } from '../types';
import { Correspondence, CorrespondenceTemplate, Snippet, WhatsAppTemplate, EmailDomainConfig } from './updates/types';

// Subcomponents
import SnippetsLibrary from './updates/SnippetsLibrary';
import TemplateLibrary from './updates/TemplateLibrary';
import AnalyticsSection from './updates/AnalyticsSection';
import BulkSendModal from './updates/BulkSendModal';

interface UpdatesViewProps {
  companyId: string;
  updates: ClientUpdate[];
  cases: Case[];
  onRefresh: () => void;
  onSendUpdate: (updateId: string, message: string, channels: any) => Promise<void>;
}

export default function UpdatesView({ companyId, updates, cases, onRefresh, onSendUpdate }: UpdatesViewProps) {
  
  // ── CORE STATE MANAGEMENTS ──
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'SCHEDULED' | 'SENT' | 'FAILED' | 'ARCHIVED'>('ALL');
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'ANALYTICS' | 'WHATSAPP_TEMPLATES' | 'EMAIL_DELIVERABILITY' | 'WORKFLOW_SETTINGS'>('DASHBOARD');
  const [roleView, setRoleView] = useState<'MY_MATTERS' | 'ALL_FIRM'>('ALL_FIRM');
  
  // Filter states
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '3m' | '1y' | 'all' | 'custom'>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortBy, setSortBy] = useState<string>('latest');
  const [filterChannels, setFilterChannels] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState<string>('All');
  const [filterApprovalLevel, setFilterApprovalLevel] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterLawyer, setFilterLawyer] = useState<string>('All');
  const [filterEngagement, setFilterEngagement] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Composition panel side-drawer & modal triggers
  const [showSnippets, setShowSnippets] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [consentPopupId, setConsentPopupId] = useState<string | null>(null);

  // Active Selected correspondence
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isComposeMode, setIsComposeMode] = useState(false);
  const [composeStep, setComposeStep] = useState<'MANUAL' | 'AI_DRAFT' | 'COMPARE'>('MANUAL');

  // Pre-seed local state database for exact 100% specification implementation
  const [correspondenceList, setCorrespondenceList] = useState<Correspondence[]>([
    {
      id: 'corr-101',
      companyId: companyId,
      caseId: 'case-1',
      clientId: 'client-1',
      referenceNumber: 'CORR-2026-001',
      subject: 'Urgent Filing Confirmation',
      message: 'Draft pleading document formulated. Final affidavits must be notarized before the registry closing hours on June 12th.',
      status: 'DRAFT',
      priority: 'urgent',
      isUrgent: true,
      isPrivileged: true,
      sourceType: 'ai',
      snippetsUsed: [],
      variables: {},
      disclaimers: [{ title: 'Privilege Caveat', content: 'Confidentially protected attorney communications.', required: true }],
      signatureBlock: { name: 'Elena Rostova', title: 'Senior Counsel', firm: 'Docket Law', phone: '+1 555-0192', email: 'elena@docketlaw.app' },
      ccRecipients: [],
      bccRecipients: [],
      secondaryRecipients: [],
      sendTimeOptimized: true,
      approvalLevel: 1,
      slaBreached: true,
      expiresAt: '2026-06-14T12:00:00Z',
      deliveryReport: {},
      responses: [],
      responseStatus: 'none',
      auditTrail: [{ id: 'a-1', action: 'Created draft AI variation', performedBy: 'System AI', timestamp: '2026-06-07 10:45 AM' }],
      createdAt: '2026-06-07T10:45:00Z',
      updatedAt: '2026-06-07T10:45:00Z'
    },
    {
      id: 'corr-102',
      companyId: companyId,
      caseId: 'case-2',
      clientId: 'client-2',
      referenceNumber: 'CORR-2026-002',
      subject: 'Trial Adjournment Schedule',
      message: 'The High Court mentioning originally scheduled has been successfully postponed to July 15th.',
      status: 'SCHEDULED',
      priority: 'normal',
      isUrgent: false,
      isPrivileged: false,
      sourceType: 'manual',
      snippetsUsed: [],
      variables: {},
      disclaimers: [],
      signatureBlock: { name: 'Johnathan Cole', title: 'Partner', firm: 'Docket Law', phone: '+1 555-0199', email: 'john@docketlaw.app' },
      ccRecipients: [],
      bccRecipients: [],
      secondaryRecipients: [],
      sendTimeOptimized: true,
      approvalLevel: 0,
      slaBreached: false,
      scheduledFor: '2026-06-08T09:30:00Z',
      deliveryReport: {},
      responses: [],
      responseStatus: 'none',
      auditTrail: [],
      createdAt: '2026-06-07T08:30:00Z',
      updatedAt: '2026-06-07T08:30:00Z'
    },
    {
      id: 'corr-103',
      companyId: companyId,
      caseId: 'case-1',
      clientId: 'client-1',
      referenceNumber: 'CORR-2026-003',
      subject: 'Mediation Conference Outcome',
      message: 'The settlement proposal of $150,000 was registered with court registries. Awaiting formal signed sign-off from your representatives.',
      status: 'SENT',
      priority: 'normal',
      isUrgent: false,
      isPrivileged: false,
      sourceType: 'template',
      snippetsUsed: [],
      variables: {},
      disclaimers: [],
      signatureBlock: { name: 'Elena Rostova', title: 'Senior Counsel', firm: 'Docket Law', phone: '+1 555-0192', email: 'elena@docketlaw.app' },
      ccRecipients: [],
      bccRecipients: [],
      secondaryRecipients: [],
      sendTimeOptimized: false,
      approvalLevel: 2,
      slaBreached: false,
      deliveryReport: {
        email: { status: 'Delivered', opened: true, clickedCount: 2, timestamp: '2026-06-06 02:22 PM' },
        whatsapp: { status: 'Read', timestamp: '2026-06-06 02:24 PM' }
      },
      responses: [{ id: 'rep-1', method: 'Email', notes: 'Client replies they accept negotiation terms.', actionRequired: true, timestamp: '2026-06-06 03:00 PM' }],
      responseStatus: 'received',
      auditTrail: [],
      createdAt: '2026-06-06T14:15:00Z',
      updatedAt: '2026-06-06T14:15:00Z'
    },
    {
      id: 'corr-104',
      companyId: companyId,
      caseId: 'case-2',
      clientId: 'client-3',
      referenceNumber: 'CORR-2026-004',
      subject: 'Missing Document Retainer Reminder',
      message: 'Please prompt the secondary contact to upload terms sheets before our final counseling briefing.',
      status: 'FAILED',
      priority: 'low',
      isUrgent: false,
      isPrivileged: false,
      sourceType: 'manual',
      snippetsUsed: [],
      variables: {},
      disclaimers: [],
      signatureBlock: { name: 'Alice Vance', title: 'Associate', firm: 'Docket Law', phone: '+1 555-0104', email: 'alice@docketlaw.app' },
      ccRecipients: [],
      bccRecipients: [],
      secondaryRecipients: [],
      sendTimeOptimized: false,
      approvalLevel: 0,
      slaBreached: false,
      deliveryReport: {
        email: { status: 'Bounced', opened: false, clickedCount: 0, timestamp: '2026-06-05 11:30 AM', bounceReason: 'Mailbox full' }
      },
      responses: [],
      responseStatus: 'none',
      auditTrail: [],
      createdAt: '2026-06-05T11:22:00Z',
      updatedAt: '2026-06-05T11:22:00Z'
    }
  ]);

  // Client dropdown lookup from case lists
  const availableClients: Client[] = Array.from(
    new Map(
      cases.map(c => [
        (c as any).client?.id || `client-${c.id}`,
        (c as any).client || {
          id: `client-${c.id}`,
          companyId: companyId,
          fullName: (c as any).client?.fullName || 'Johnathan Vance',
          phone: '+1 555-0192',
          email: 'vance@corporatedefense.com',
          optOutChannels: [],
          isVip: true
        }
      ])
    ).values()
  ).filter(Boolean);

  // Map case info to local state database
  const enrichedCorrespondence: Correspondence[] = correspondenceList.map(corr => {
    const parentCase = cases.find(c => c.id === corr.caseId) || cases[0];
    const client = availableClients.find(cl => cl.id === corr.clientId) || availableClients[0];
    return {
      ...corr,
      caseRef: parentCase?.referenceNumber || 'CRT-2026-90',
      caseType: parentCase?.caseType || 'Litigation',
      client: client,
      parentCase: parentCase
    };
  });

  // Date range filter utility
  function checkDateWithinRange(dateStr: string): boolean {
    if (dateRange === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    if (dateRange === 'today') return days <= 1;
    if (dateRange === '7d') return days <= 7;
    if (dateRange === '30d') return days <= 30;
    if (dateRange === '3m') return days <= 90;
    if (dateRange === '1y') return days <= 365;
    return true;
  }

  // ── FILTERING & SORTING PIPELINE (Section 4) ──
  const filteredList = enrichedCorrespondence.filter(item => {
    // Status tab filter
    if (activeTab !== 'ALL') {
      if (activeTab === 'PENDING' && item.status !== 'DRAFT') return false;
      if (activeTab === 'SENT' && item.status !== 'SENT') return false;
      if (activeTab === 'SCHEDULED' && item.status !== 'SCHEDULED') return false;
      if (activeTab === 'FAILED' && item.status !== 'FAILED') return false;
      if (activeTab === 'ARCHIVED' && item.status !== 'ARCHIVED') return false;
    }

    // Date range
    if (!checkDateWithinRange(item.createdAt)) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchText = (item.subject || '').toLowerCase().includes(q) ||
                        item.message.toLowerCase().includes(q) ||
                        (item.client?.fullName || '').toLowerCase().includes(q) ||
                        (item.referenceNumber || '').toLowerCase().includes(q) ||
                        (item.caseRef || '').toLowerCase().includes(q);
      if (!matchText) return false;
    }

    // Multi-select channels filter
    if (filterChannels.length > 0) {
      const deliveryKeys = Object.keys(item.deliveryReport);
      const matchChannel = filterChannels.some(ch => deliveryKeys.includes(ch));
      if (!matchChannel && filterChannels.length > 0) return false;
    }

    // Source filter
    if (filterSource !== 'All') {
      if (filterSource === 'AI Drafted' && item.sourceType !== 'ai') return false;
      if (filterSource === 'Manual' && item.sourceType !== 'manual') return false;
      if (filterSource === 'From Template' && item.sourceType !== 'template') return false;
    }

    // Approval Level
    if (filterApprovalLevel !== 'All') {
      if (item.approvalLevel !== parseInt(filterApprovalLevel)) return false;
    }

    // Priority filter
    if (filterPriority !== 'All') {
      if (item.priority !== filterPriority.toLowerCase()) return false;
    }

    // Lawyer filter
    if (filterLawyer !== 'All') {
      if (item.signatureBlock.name !== filterLawyer) return false;
    }

    // Client engagement
    if (filterEngagement !== 'All') {
      if (filterEngagement === 'Responded' && item.responses.length === 0) return false;
      if (filterEngagement === 'No response' && item.responses.length > 0) return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort parameters (Section 4)
    if (sortBy === 'latest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'client_az') return (a.client?.fullName || '').localeCompare(b.client?.fullName || '');
    if (sortBy === 'client_za') return (b.client?.fullName || '').localeCompare(a.client?.fullName || '');
    if (sortBy === 'pending_longest') {
      if (a.status === 'DRAFT' && b.status !== 'DRAFT') return -1;
      if (b.status === 'DRAFT' && a.status !== 'DRAFT') return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return 0;
  });

  // SUPERSCRIPT REAL-TIME COUNTS (Section 3)
  const draftDateCounts = (status: string) => enrichedCorrespondence.filter(c => c.status === status && checkDateWithinRange(c.createdAt)).length;
  const tabCounts = {
    ALL: enrichedCorrespondence.filter(c => checkDateWithinRange(c.createdAt)).length,
    PENDING: draftDateCounts('DRAFT'),
    SCHEDULED: draftDateCounts('SCHEDULED'),
    SENT: draftDateCounts('SENT'),
    FAILED: draftDateCounts('FAILED'),
    ARCHIVED: draftDateCounts('ARCHIVED')
  };

  // ── DETAILED CORRESPONDENCE DISPATCH HANDLERS ──
  const activeSelected = enrichedCorrespondence.find(c => c.id === selectedId) || null;

  // New Draft compose local state
  const [composeClient, setComposeClient] = useState('');
  const [composeCase, setComposeCase] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeRichContent, setComposeRichContent] = useState('');
  const [composePriority, setComposePriority] = useState<'normal' | 'urgent' | 'low'>('normal');
  const [composePrivilege, setComposePrivilege] = useState(false);
  const [composeChannelsStr, setComposeChannelsStr] = useState<string[]>(['email']);
  const [sendOnBehalf, setSendOnBehalf] = useState('Elena Rostova');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('2026-06-08T10:00');
  const [useOptimization, setUseOptimization] = useState(true);

  // AI draft states
  const [aiContext, setAiContext] = useState('');
  const [aiTone, setAiTone] = useState<'Formal' | 'Professional' | 'Plain Language'>('Formal');
  const [aiVariationsCount, setAiVariationsCount] = useState(2);
  const [aiVariations, setAiVariations] = useState<string[]>([]);
  const [selectedVariationIdx, setSelectedVariationIdx] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toneSlider, setToneSlider] = useState(70); // 70% Formal

  // Dictation transcribing states (Section 6.1)
  const [isDictating, setIsDictating] = useState(false);
  const [dictationLogs, setDictationLogs] = useState('');

  // Comment thread submission state
  const [typedCommentId, setTypedCommentId] = useState('');
  const [typedLabel, setTypedLabel] = useState('');

  // Settle response log form fields (Section 6.2)
  const [showLogResponseForm, setShowLogResponseForm] = useState(false);
  const [logResponseMethod, setLogResponseMethod] = useState('Email');
  const [logResponseNotes, setLogResponseNotes] = useState('');
  const [logResponseRequired, setLogResponseRequired] = useState(true);

  // Email delivers & WhatsApp preapproved mock lists
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([
    { id: 'wa-1', companyId: '1', name: 'trial_postponement_notify', category: 'Transactional', language: 'en', body: 'Dear var1, the trial scheduled has been adjourned to var2 before court room var3. Please call chambers.', status: 'approved', usageCount: 78 },
    { id: 'wa-2', companyId: '1', name: 'retainer_overdue_alert', category: 'Transactional', language: 'en', body: 'Urgent notice regarding trust account balance on file var1. A payment of var2 is expected.', status: 'approved', usageCount: 14 }
  ]);
  const [waNewName, setWaNewName] = useState('');
  const [waNewCategory, setWaNewCategory] = useState('Transactional');
  const [waNewBody, setWaNewBody] = useState('');

  const [emailDomain, setEmailDomain] = useState<EmailDomainConfig>({
    domain: 'docketlawyers.com',
    dkimPublicKey: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv...',
    dkimPrivateKey: 'CONFIDENTIAL',
    spfRecord: 'v=spf1 include:docketmail.net -all',
    dmarcRecord: 'v=DMARC1; p=quarantine; pct=100',
    dkimVerified: true,
    spfVerified: true,
    dmarcVerified: true,
    deliverabilityScore: 98
  });

  // Client variables list insert injection
  const handleInsertSnippet = (content: string) => {
    setComposeMessage(prev => prev + ' ' + content);
    setShowSnippets(false);
  };

  const handleSelectTemplate = (tpl: CorrespondenceTemplate) => {
    setComposeSubject(tpl.name);
    setComposeMessage(tpl.richContent.replace(/<br\s*\/?>/gi, '\n'));
    setShowTemplates(false);
  };

  // Trigger Consent validation and Send dispatch row
  const promptConsentSend = (id: string) => {
    setConsentPopupId(id);
  };

  const executeSendFinal = async (id: string) => {
    try {
      // Find item
      const index = correspondenceList.findIndex(c => c.id === id);
      if (index === -1) return;

      const target = correspondenceList[index];
      
      // Post consent verification details to backend
      await fetch('/api/firm/any/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr-admin-demo',
          action: 'correspondence_consent_audited',
          consented: true
        })
      });

      // Update state item to Sent
      const updatedList = [...correspondenceList];
      updatedList[index] = {
        ...target,
        status: 'SENT',
        deliveryReport: {
          email: { status: 'Delivered', opened: true, clickedCount: 0, timestamp: new Date().toISOString() },
          whatsapp: { status: 'Sent', timestamp: new Date().toISOString() }
        },
        auditTrail: [
          ...target.auditTrail,
          { id: `audit-${Date.now()}`, action: 'Formally Sent with audited consent', performedBy: 'Partner Administrator', timestamp: new Date().toLocaleString() }
        ]
      };
      setCorrespondenceList(updatedList);
      setConsentPopupId(null);
      setSelectedId(id);
      setIsComposeMode(false);
    } catch (err) {
      console.error(err);
    }
  };

  const executeDiscardBatchDraft = (id: string) => {
    if (!window.confirm('Delete and discard this drafted client communication? This remains tracked in audit trail logs.')) return;
    setCorrespondenceList(prev => prev.filter(c => c.id !== id));
    setSelectedId(null);
  };

  // Generate multi-variations drafting models
  const triggerAIGenerateVariations = () => {
    if (!aiContext) {
      alert('Please enter context guidelines or case milestones first (e.g., "The mediation postponed because opposition counsel failed proof sheets").');
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      setAiVariations([
        `Dear client, please note we have successfully verified courtroom adjournments. Due to sudden failures in opposing team proof sheets, proceedings before the registry hold on July 15th of defense counsel. Keep safe records on draft file.`,
        `Urgent notice regarding active matter file. Our senior lawyers secured case postponement today. Hearing adjourned to July 15th to afford opposition sufficient margin for correcting defective affidavits filings.`,
        `Formal docket advisory update. Hearing milestone was rescheduled following opposing party's technical pleading omissions. Corrective litigation measures are being applied before registries closures.`
      ]);
      setSelectedVariationIdx(0);
      setIsGenerating(false);
      setComposeStep('COMPARE');
    }, 1200);
  };

  // Audio speech record simulation (Section 6.1)
  const handleToggleDictation = () => {
    if (isDictating) {
      setIsDictating(false);
      setComposeMessage(prev => prev + '\n' + dictationLogs);
      setDictationLogs('');
    } else {
      setIsDictating(true);
      setDictationLogs('The representative confirmed they signed retainer papers on June 6th and requested to expedite litigation filings scheduled with High Court registries.');
    }
  };

  // Submit Comments row inline highlights suggestions (Section 10)
  const handlePostApprovalComments = (id: string) => {
    if (!typedLabel.trim()) return;
    setCorrespondenceList(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          auditTrail: [
            ...c.auditTrail,
            { id: `cmt-${Date.now()}`, action: 'SLA Review Comment', performedBy: 'Senior Partner', timestamp: new Date().toLocaleDateString(), details: typedLabel }
          ]
        };
      }
      return c;
    }));
    setTypedLabel('');
  };

  // Response client logging dialog (Section 6.2)
  const handlePostResponseLogged = (id: string) => {
    if (!logResponseNotes.trim()) return;
    setCorrespondenceList(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          responseStatus: 'received',
          responses: [
            ...c.responses,
            { id: `rep-${Date.now()}`, method: logResponseMethod, notes: logResponseNotes, actionRequired: logResponseRequired, timestamp: new Date().toLocaleDateString() }
          ]
        };
      }
      return c;
    }));
    setLogResponseNotes('');
    setShowLogResponseForm(false);
    alert('Client response log entered into dockets. Compliance team notified.');
  };

  // Save manual compose draft
  const handleSaveDraft = () => {
    if (!composeMessage) {
      alert('Please compose some client text message details.');
      return;
    }
    const item: Correspondence = {
      id: `corr-${Date.now()}`,
      companyId: companyId,
      caseId: composeCase || cases[0]?.id || 'case-1',
      clientId: composeClient || availableClients[0]?.id || 'client-1',
      referenceNumber: `CORR-2026-0${correspondenceList.length + 1}`,
      subject: composeSubject || 'Confidential Matter Advisory',
      message: composeMessage,
      status: 'DRAFT',
      priority: composePriority,
      isUrgent: composePriority === 'urgent',
      isPrivileged: composePrivilege,
      sourceType: 'manual',
      snippetsUsed: [],
      variables: {},
      disclaimers: [],
      signatureBlock: { name: sendOnBehalf, title: 'Counsel', firm: 'Docket Law', phone: '+1 555-0192', email: 'counsel@docketlaw.app' },
      ccRecipients: ccInput ? [ccInput] : [],
      bccRecipients: bccInput ? [bccInput] : [],
      secondaryRecipients: secondaryInput ? [secondaryInput] : [],
      sendTimeOptimized: useOptimization,
      approvalLevel: 1,
      slaBreached: false,
      deliveryReport: {},
      responses: [],
      responseStatus: 'none',
      auditTrail: [{ id: `aud-${Date.now()}`, action: 'Created draft manually', performedBy: 'System', timestamp: new Date().toLocaleString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCorrespondenceList([item, ...correspondenceList]);
    setIsComposeMode(false);
    setSelectedId(item.id);
    alert('Filing draft communication locked into docket registries.');
  };

  // Custom presets quick apply filters (Section 4)
  const applyQuickSearchPreset = (presetName: string) => {
    if (presetName === 'Urgent Audited') {
      setFilterPriority('Critical');
      setFilterSource('AI Drafted');
      setSearchQuery('');
    } else if (presetName === 'SLA Breaches') {
      setActiveTab('PENDING');
      setSortBy('pending_longest');
    } else {
      setActiveTab('ALL');
      setFilterPriority('All');
      setFilterSource('All');
      setSearchQuery('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative p-4 space-y-4 text-xxs leading-snug" id="updates-root-dashboard">
      
      {/* SECTION 1: HEADER SECTION (Page Branding / Top navigation) */}
      <div className="flex flex-wrap items-center justify-between border bg-white p-4.5 rounded-2xl gap-3 shadow-xxs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-5.5 w-5.5 text-indigo-700 font-black animate-pulse" />
            <div>
              <h1 className="text-sm font-black uppercase text-slate-800 tracking-wider">Docket Client Correspondence Hub</h1>
              <p className="text-[10px] text-slate-450 font-bold">100% compliant tenant messaging dockets &bull; SLA monitoring trace</p>
            </div>
          </div>
        </div>

        {/* View mode toggle tabs toolbar */}
        <div className="flex gap-1.5 flex-wrap font-sans text-[10px] select-none">
          <button 
            onClick={() => { setViewMode('DASHBOARD'); }}
            className={`p-2 px-3.5 rounded-xl border font-extrabold cursor-pointer transition ${
              viewMode === 'DASHBOARD' ? 'bg-indigo-650 text-white shadow shadow-indigo-150' : 'bg-white hover:bg-slate-50 text-slate-650'
            }`}
          >
            Drafts & Dispatch Ledger
          </button>

          <button 
            onClick={() => { setViewMode('ANALYTICS'); }}
            className={`p-2 px-3.5 rounded-xl border font-extrabold cursor-pointer transition ${
              viewMode === 'ANALYTICS' ? 'bg-indigo-650 text-white shadow shadow-indigo-150' : 'bg-white hover:bg-slate-50 text-slate-650'
            }`}
          >
            Analytics & SLA Trends
          </button>

          <button 
            onClick={() => { setViewMode('WHATSAPP_TEMPLATES'); }}
            className={`p-2 px-3.5 rounded-xl border font-extrabold cursor-pointer transition ${
              viewMode === 'WHATSAPP_TEMPLATES' ? 'bg-indigo-650 text-white' : 'bg-white hover:bg-slate-50 text-slate-650'
            }`}
          >
            WhatsApp certified
          </button>

          <button 
            onClick={() => { setViewMode('EMAIL_DELIVERABILITY'); }}
            className={`p-2 px-3.5 rounded-xl border font-extrabold cursor-pointer transition ${
              viewMode === 'EMAIL_DELIVERABILITY' ? 'bg-indigo-650 text-white' : 'bg-white hover:bg-slate-50 text-slate-650'
            }`}
          >
            DKIM Deliverability Registry
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
            className="p-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow font-extrabold rounded-xl flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Bulk correspondence</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: 8-CARD METRICS STRIP (Section 1 specs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 font-sans">
        
        {/* Metric 1 */}
        <div 
          onClick={() => { setActiveTab('PENDING'); setViewMode('DASHBOARD'); }}
          className="bg-white border rounded-xl p-3 cursor-pointer hover:border-amber-400 transition hover:shadow-xs p-3"
        >
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black">1. Pending Approval</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-base font-mono font-black ${tabCounts.PENDING > 0 ? 'text-amber-500 font-extrabold' : 'text-slate-700'}`}>
              {tabCounts.PENDING}
            </span>
          </div>
          <span className="text-[8px] text-slate-400 font-medium">Click to inspect</span>
        </div>

        {/* Metric 2 */}
        <div 
          onClick={() => { setActiveTab('SCHEDULED'); setViewMode('DASHBOARD'); }}
          className="bg-white border rounded-xl p-3 cursor-pointer hover:border-blue-400 transition hover:shadow-xs p-3"
        >
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black">2. Scheduled</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-base font-mono font-black text-blue-500">
              {tabCounts.SCHEDULED}
            </span>
          </div>
          <span className="text-[8px] text-slate-450">Future auto queue</span>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => { setActiveTab('SENT'); setViewMode('DASHBOARD'); }}
          className="bg-white border rounded-xl p-3 cursor-pointer hover:bg-slate-50/20 transition p-3"
        >
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black">3. Sent Today</span>
          <span className="text-base font-mono font-black text-emerald-600 block mt-1">12</span>
          <span className="text-[8px] text-emerald-600 font-black">100% Delivered</span>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={() => { setActiveTab('FAILED'); setViewMode('DASHBOARD'); }}
          className="bg-white border rounded-xl p-3 cursor-pointer hover:border-red-400 transition"
        >
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black">4. Failed Delivery</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-base font-mono font-black ${tabCounts.FAILED > 0 ? 'text-red-600 animate-pulse font-extrabold' : 'text-slate-750'}`}>
              {tabCounts.FAILED}
            </span>
          </div>
          <span className="text-[8px] text-slate-400">Mailbox bounces</span>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border rounded-xl p-3">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black">5. Expiring Drafts</span>
          <span className="text-base font-mono font-black text-amber-500 block mt-1">1</span>
          <span className="text-[8px] text-slate-400">Unused past 5d</span>
        </div>

        {/* Metric 6 */}
        <div className="bg-white border rounded-xl p-3">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black text-slate-450 leading-snug">6. Awaiting Client</span>
          <span className="text-base font-mono font-black text-blue-600 block mt-1">3</span>
          <span className="text-[8px] text-slate-450 border border-blue-105 rounded px-1 py-0.5 bg-blue-50/10">Unsigned forms</span>
        </div>

        {/* Metric 7 */}
        <div className="bg-white border rounded-xl p-3">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black">7. SLA Breached</span>
          <span className="text-base font-mono font-black text-rose-500 block mt-1">1</span>
          <span className="text-[8px] text-rose-600 font-extrabold">Escalations active</span>
        </div>

        {/* Metric 8 */}
        <div className="bg-white border rounded-xl p-3">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black text-slate-405 leading-snug">8. Sent This Month</span>
          <span className="text-base font-mono font-black text-slate-700 block mt-1">184</span>
          <span className="text-[8px] text-slate-400">Quota limit safe</span>
        </div>

      </div>

      {/* SECTION 3: ROLE VIEW SCOPE INDICATOR (Section 2) */}
      <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="h-4.5 w-4.5 text-indigo-705 shrink-0 animate-pulse" />
          <p className="font-extrabold text-indigo-900 leading-normal">
            Current viewing boundary: <b className="uppercase">{roleView === 'ALL_FIRM' ? 'Showing all firm-wide correspondence logs' : 'Filtered to your assigned caseload updates'}</b>
          </p>
        </div>

        <div className="flex bg-white/80 p-0.5 border rounded-lg overflow-hidden select-none text-[9.5px] font-extrabold font-sans">
          <button 
            onClick={() => setRoleView('MY_MATTERS')}
            className={`p-1.5 px-3 rounded-md transition cursor-pointer ${roleView === 'MY_MATTERS' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            My Caseload
          </button>
          <button 
            onClick={() => setRoleView('ALL_FIRM')}
            className={`p-1.5 px-3 rounded-md transition cursor-pointer ${roleView === 'ALL_FIRM' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            All Firm Files
          </button>
        </div>
      </div>

      {/* CORE VIEWPORT BODY AREA ROUTER */}
      {viewMode === 'WHATSAPP_TEMPLATES' && (
        <div className="space-y-4 bg-white border p-5 rounded-2xl">
          <div className="border-b pb-4">
            <h3 className="text-sm font-black uppercase text-slate-800">Section 16: pre-approved WhatsApp Outbound Templates</h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-normal">The WhatsApp Business API requires official template approvals before sending messages to clients who have not initiated contact in the last 24 hours.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-black tracking-wide text-indigo-600">Active template registry</h4>
              {whatsappTemplates.map(tpl => (
                <div key={tpl.id} className="p-3 bg-slate-50 border rounded-xl space-y-1.5 shadow-xxs">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-800 font-mono">template: "{tpl.name}"</span>
                    <span className="bg-emerald-100 text-emerald-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">APPROVED</span>
                  </div>
                  <p className="text-xxs font-semibold bg-white p-2 border rounded-md text-slate-500 leading-normal font-mono">
                    {tpl.body}
                  </p>
                  <div className="flex justify-between text-[9px] text-slate-400 font-semibold pt-1">
                    <span>Category: {tpl.category}</span>
                    <span>Used {tpl.usageCount} times</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit template form */}
            <div className="bg-slate-50 border p-4 rounded-xl space-y-3">
              <h4 className="text-[10px] uppercase font-black tracking-wide text-indigo-600">Submit new WhatsApp template</h4>
              
              <div className="space-y-1">
                <label className="text-slate-400 block font-black uppercase">Template Identifier Name *</label>
                <input 
                  type="text" 
                  value={waNewName}
                  onChange={e => setWaNewName(e.target.value)}
                  placeholder="courtroom_alert_v1"
                  className="w-full p-2.5 bg-white border rounded-lg text-xs font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-black uppercase">Category *</label>
                <select 
                  value={waNewCategory}
                  onChange={e => setWaNewCategory(e.target.value)}
                  className="w-full p-2 bg-white border rounded-lg"
                >
                  <option value="Transactional">Transactional (Operational events)</option>
                  <option value="Marketing">Marketing / Newsletter</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-black uppercase">Message Template Body *</label>
                <textarea 
                  rows={4}
                  value={waNewBody}
                  onChange={e => setWaNewBody(e.target.value)}
                  placeholder="Dear var1, litigation proceedings for file var2 have been scheduled for var3. Address questions to chambers."
                  className="w-full p-2 bg-white border rounded-lg text-xs font-mono resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={() => {
                  if (!waNewName || !waNewBody) return;
                  const item: WhatsAppTemplate = {
                    id: `wa-${Date.now()}`,
                    companyId: '1',
                    name: waNewName,
                    category: waNewCategory,
                    language: 'en',
                    body: waNewBody,
                    status: 'pending',
                    usageCount: 0
                  };
                  setWhatsappTemplates([...whatsappTemplates, item]);
                  setWaNewName('');
                  setWaNewBody('');
                  alert('Template posted to Meta Developer approval registries. Outcome reviews typically take 24 hours.');
                }}
                className="w-full p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xxs uppercase rounded-lg cursor-pointer"
              >
                Submit template for approval
              </button>
            </div>

          </div>
        </div>
      )}

      {viewMode === 'EMAIL_DELIVERABILITY' && (
        <div className="bg-white border p-5 rounded-2xl space-y-4">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800">Section 17: Email Domain DKIM registries & SPF Deliverability</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Strict domain verification protects letters from falling to clients' spam folders.</p>
            </div>
            <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 rounded px-3 py-1 font-mono font-black text-xs">
              DELIVERABILITY SCORE: {emailDomain.deliverabilityScore}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 leading-normal">
            
            <div className="space-y-3 text-xxs font-semibold">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">Active verified DNS records</span>
              
              <div className="p-3.5 bg-slate-50 border rounded-xl space-y-2">
                <div className="flex justify-between font-bold">
                  <span>SPF Record Type TXT</span>
                  <span className="text-emerald-700 font-black">✓ Verified DNS Active</span>
                </div>
                <input 
                  type="text" 
                  readOnly 
                  value={emailDomain.spfRecord} 
                  className="w-full text-xs font-mono p-2 border bg-white rounded outline-none"
                />
              </div>

              <div className="p-3.5 bg-slate-50 border rounded-xl space-y-2">
                <div className="flex justify-between font-bold">
                  <span>DMARC TXT Policy</span>
                  <span className="text-emerald-700 font-black">✓ Strict policy configured</span>
                </div>
                <input 
                  type="text" 
                  readOnly 
                  value={emailDomain.dmarcRecord} 
                  className="w-full text-xs font-mono p-2 border bg-white rounded outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 border p-4 rounded-xl space-y-3.5">
              <h4 className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">DKIM Public Key Registry (1024-bit key selector)</h4>
              <p className="text-slate-450 text-[10.5px]">Copy this selector key to your web hosting domain registrar configuration console (GoDaddy, Cloudflare, Namecheap etc.):</p>
              
              <textarea 
                rows={4}
                readOnly
                value={emailDomain.dkimPublicKey}
                className="w-full p-2.5 border bg-white rounded-lg text-xs font-mono resize-none leading-relaxed outline-none"
                onClick={e => (e.target as any).select()}
              />
              
              <button 
                onClick={() => {
                  alert('DNS resolution queries updated. SPF/DKIM key matches checked successfully. Score is healthy.');
                }}
                className="w-full p-2.5 border border-indigo-600 text-indigo-705 text-xxs uppercase font-black rounded-lg hover:bg-slate-100/50 transition cursor-pointer"
              >
                Re-check domain verified registries
              </button>
            </div>

          </div>
        </div>
      )}

      {viewMode === 'ANALYTICS' && (
        <AnalyticsSection correspondenceList={correspondenceList} />
      )}

      {/* DETAILED DOCKET LEDGERS DASHBOARD SCREEN */}
      {viewMode === 'DASHBOARD' && (
        <div className="flex-1 flex flex-col md:flex-row border rounded-2xl bg-white overflow-hidden" style={{ minHeight: '65vh' }}>
          
          {/* LEFT 35% WORKSPACE PANEL (Section 5 Spec) */}
          <div className="w-full md:w-[350px] lg:w-[390px] border-r shrink-0 flex flex-col overflow-hidden bg-white">
            
            {/* Filter categories tabs header */}
            <div className="p-3 bg-slate-50/50 border-b space-y-3 shrink-0 text-xxs font-semibold">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Docket channels</span>
                
                <button
                  onClick={() => {
                    setIsComposeMode(true);
                    setComposeStep('MANUAL');
                    setComposeSubject('');
                    setComposeMessage('');
                    setComposeCase('');
                    setComposeClient('');
                  }}
                  className="p-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition select-none"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Message</span>
                </button>
              </div>

              {/* Status tabs with counts superscript (Section 3) */}
              <div className="flex gap-1 flex-wrap font-sans">
                {([
                  { key: 'ALL', label: 'All' },
                  { key: 'PENDING', label: 'Pending Approval' },
                  { key: 'SCHEDULED', label: 'Scheduled' },
                  { key: 'SENT', label: 'Sent' },
                  { key: 'FAILED', label: 'Failed' },
                  { key: 'ARCHIVED', label: 'Archived' }
                ] as const).map(tab => {
                  const countColor = tab.key === 'PENDING' && tabCounts.PENDING > 0 ? 'text-amber-600 font-extrabold' :
                                     tab.key === 'FAILED' ? 'text-red-500 font-extrabold' : 'text-slate-400';
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`relative p-1.5 px-2 rounded-lg transition select-none font-extrabold cursor-pointer text-[9.5px] ${
                        activeTab === tab.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <sup className={`text-[8.5px] font-mono ml-0.5 ${activeTab === tab.key ? 'text-indigo-200' : countColor}`}>
                        ({tabCounts[tab.key]})
                      </sup>
                    </button>
                  );
                })}
              </div>

              {/* Precise Filter Bar controls (Section 4) */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 text-slate-400 h-3.5 w-3.5" />
                  <input
                    type="text"
                    placeholder="Search titles, clients, matters..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 p-1.5 bg-white border rounded-xl focus:bg-white outline-none placeholder-slate-350"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <select 
                    value={sortBy} 
                    onChange={e => setSortBy(e.target.value)}
                    className="p-1 px-1.5 border rounded-lg bg-white outline-none font-medium text-[9.5px]"
                  >
                    <option value="latest">Latest correspondence first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="client_az">Client name A-Z</option>
                    <option value="client_za">Client name Z-A</option>
                    <option value="pending_longest">Pending review duration</option>
                  </select>

                  <select
                    value={dateRange}
                    onChange={e => setDateRange(e.target.value as any)}
                    className="p-1 px-1.5 border rounded-lg bg-white outline-none font-medium text-[9.5px]"
                  >
                    <option value="30d">Last 30 Days (default)</option>
                    <option value="today">Today only</option>
                    <option value="7d">7 Days</option>
                    <option value="3m">3 Months</option>
                    <option value="all">All history</option>
                  </select>
                </div>

                {/* Filters combinations chips toolbar (Section 4 specs) */}
                <div className="flex gap-1 border-t pt-1.5 flex-wrap">
                  <span className="text-[8px] text-slate-400 font-bold self-center uppercase tracking-wide mr-1 select-none">Filters:</span>
                  
                  <button 
                    onClick={() => applyQuickSearchPreset('Urgent Audited')}
                    className="bg-indigo-50 hover:bg-indigo-100 border text-indigo-705 p-0.5 px-2 rounded text-[8px] font-black uppercase cursor-pointer"
                  >
                    Urgent & AI
                  </button>

                  <button 
                    onClick={() => applyQuickSearchPreset('SLA Breaches')}
                    className="bg-amber-50 hover:bg-amber-100 border text-amber-705 p-0.5 px-2 rounded text-[8px] font-black uppercase cursor-pointer"
                  >
                    SLA Breaches
                  </button>

                  <button 
                    onClick={() => applyQuickSearchPreset('Clear')}
                    className="bg-red-50 hover:bg-red-100 text-red-800 p-0.5 px-2 rounded text-[8px] font-black uppercase cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* MAIN TRANSITION CARDS LIST (Section 5) */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-slate-50/40">
              {filteredList.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white border border-dashed rounded-xl p-5 space-y-2">
                  <MessageSquare className="h-7 w-7 mx-auto opacity-30 text-indigo-600" />
                  <p className="font-bold text-xs">No correspondence tracked</p>
                  <p className="text-[10px] text-slate-450 leading-snug">Verify filter criteria or click '+ New Message' to log.</p>
                </div>
              ) : (
                filteredList.map(item => {
                  const isSelected = selectedId === item.id;
                  const isSlaBreached = item.slaBreached;
                  const countDayStr = item.status === 'DRAFT' ? '2 days left' : '';

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                        setIsComposeMode(false);
                      }}
                      className={`group p-3 border rounded-xl cursor-pointer hover:border-slate-350 transition relative bg-white shadow-xxs font-sans text-left ${
                        isSelected ? 'ring-2 ring-indigo-600 border-indigo-600' : 'border-slate-105'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[9px] font-black text-indigo-705 bg-slate-100 px-1 py-0.5 rounded">
                              {item.referenceNumber}
                            </span>
                            {item.isUrgent && (
                              <span className="bg-red-50 text-red-800 border border-red-200 text-[8px] font-black uppercase px-1 rounded">
                                Urgent
                              </span>
                            )}
                            {item.isPrivileged && (
                              <span className="bg-purple-100 text-purple-900 text-[8px] font-black px-1 rounded uppercase">PRIVILEGED</span>
                            )}
                          </div>
                          
                          <h4 className="font-black text-slate-800 text-[11px] leading-snug mt-1 grup-hover:text-indigo-605">
                            {item.subject || 'Client Matter Update'}
                          </h4>
                        </div>

                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full select-none ${
                          item.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' :
                          item.status === 'SCHEDULED' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      {/* Display 2-3 lines message preview */}
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-1.5 leading-snug font-medium italic">
                        "{item.message}"
                      </p>

                      <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono border-t pt-2 mt-2 gap-1 flex-wrap">
                        <span>Case: {item.caseRef}</span>
                        <span>Client: {item.client?.fullName}</span>
                      </div>

                      {/* SLA and Expire warning indicators */}
                      {isSlaBreached && (
                        <div className="mt-1.5 flex items-center gap-1.5 bg-red-50 text-red-850 p-1 px-2 rounded border border-red-100 animate-pulse text-[8px] font-black font-sans uppercase">
                          <Clock className="h-3 w-3" />
                          <span>Approval SLA breached &bull; Drafter self-review</span>
                        </div>
                      )}

                      {item.status === 'DRAFT' && (
                        <div className="mt-1 flex items-center gap-1 text-[8.5px] font-semibold text-amber-600 font-sans uppercase">
                          <CheckCircle className="h-3 w-3" />
                          <span>AI draft expires in {countDayStr}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT 65% DETAIL & COMPOSITION PANEL (Section 6) */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-5 flex flex-col justify-between relative min-w-0" style={{ minHeight: '60vh' }}>
            
            {/* COMPOSING DRAFT STATE VIEW (Section 6.1) */}
            {isComposeMode ? (
              <div className="space-y-4 font-sans text-left">
                
                {/* Header sticky info */}
                <div className="flex justify-between items-center pb-3 border-b">
                  <div className="flex items-center gap-1.5">
                    <Edit2 className="h-4.5 w-4.5 text-indigo-700 animate-bounce" />
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800">Composition & AI Drafting room</h3>
                      <p className="text-[9px] text-slate-400 font-mono uppercase">Draft client communications with full variables replacement</p>
                    </div>
                  </div>

                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[9px] font-black select-none border">
                    <button 
                      onClick={() => setComposeStep('MANUAL')}
                      className={`p-1 px-3.5 rounded transition cursor-pointer uppercase ${composeStep === 'MANUAL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-450 hover:text-slate-700'}`}
                    >
                      Craft Manually
                    </button>
                    <button 
                      onClick={() => setComposeStep('AI_DRAFT')}
                      className={`p-1 px-3.5 rounded transition cursor-pointer uppercase ${composeStep === 'AI_DRAFT' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-450 hover:text-slate-700'}`}
                    >
                      AI auto Generation
                    </button>
                  </div>
                </div>

                {/* STEP 1: CONTEXT ARGS OF THE CURRENT MODE SELECTED */}
                {composeStep === 'MANUAL' && (
                  <div className="space-y-4 text-xxs font-semibold">
                    
                    {/* Select Receiver information row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b">
                      <div>
                        <label className="text-slate-400 block uppercase font-black mb-1">Select portfolio Matter *</label>
                        <select
                          value={composeCase}
                          onChange={e => {
                            const cs = cases.find(c => c.id === e.target.value);
                            setComposeCase(e.target.value);
                            if (cs) setComposeClient((cs as any).client?.id || 'client-1');
                          }}
                          className="w-full text-xs p-2 bg-white border rounded-xl outline-none"
                        >
                          <option value="">— Choose customer matter —</option>
                          {cases.map((cs) => (
                            <option key={cs.id} value={cs.id}>
                              {(cs as any).client?.fullName || 'Company Legal'} &bull; {cs.referenceNumber}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block uppercase font-black mb-1">Send on-behalf of counselor</label>
                        <select 
                          value={sendOnBehalf} 
                          onChange={e => setSendOnBehalf(e.target.value)}
                          className="w-full text-xs p-2 bg-white border rounded-xl outline-none"
                        >
                          <option value="Elena Rostova">Elena Rostova (Senior Partner)</option>
                          <option value="Marcus Sterling">Marcus Sterling (Attorney)</option>
                          <option value="Associate counsel">Associate counsel desk</option>
                        </select>
                      </div>
                    </div>

                    {/* CC / BCC Secondary Contact (Section 6.1 specs) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-450 uppercase block mb-1">CC Email Recipient</label>
                        <input 
                          type="text" 
                          placeholder="lawyer-admin@company.com" 
                          value={ccInput}
                          onChange={e => setCcInput(e.target.value)}
                          className="w-full p-2 bg-white border rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-slate-450 uppercase block mb-1">BCC Private Audit</label>
                        <input 
                          type="text" 
                          placeholder="compliance-logs@firm.com" 
                          value={bccInput}
                          onChange={e => setBccInput(e.target.value)}
                          className="w-full p-2 bg-white border rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-slate-455 uppercase block mb-1">CC Secondary Client Contact</label>
                        <input 
                          type="text" 
                          placeholder="+1 555-0322 (SMS copy)" 
                          value={secondaryInput}
                          onChange={e => setSecondaryInput(e.target.value)}
                          className="w-full p-2 bg-white border rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* Meta Fields: Title, Priority, Privilege Mark */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t pt-3">
                      <div className="md:col-span-1.5">
                        <label className="text-slate-400 block uppercase font-black mb-1">Subject Title / E-mail Header *</label>
                        <input
                          type="text"
                          value={composeSubject}
                          onChange={e => setComposeSubject(e.target.value)}
                          placeholder="E.g., Action Directive: Supreme Court scheduling update"
                          className="w-full text-xs p-2.5 bg-white border rounded-xl outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 block uppercase font-black mb-1">SLA priority</label>
                        <select
                          value={composePriority}
                          onChange={e => setComposePriority(e.target.value as any)}
                          className="w-full p-2.5 bg-white border rounded-xl"
                        >
                          <option value="normal">Normal pace update</option>
                          <option value="urgent">Urgent client alert priority</option>
                          <option value="low">Low context note</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-5">
                        <input 
                          type="checkbox" 
                          id="priv-opt-checkbox" 
                          checked={composePrivilege}
                          onChange={e => setComposePrivilege(e.target.checked)}
                          className="h-4 w-4 text-indigo-600 rounded cursor-pointer"
                        />
                        <label htmlFor="priv-opt-checkbox" className="font-extrabold text-purple-950 uppercase select-none cursor-pointer">
                          🛡️ Legal Privilege flag
                        </label>
                      </div>
                    </div>

                    {/* TEMPLATE & SNIPPETS QUICK ACCESS BUTTONS INSIDE TOOLBAR */}
                    <div className="flex gap-2 border bg-slate-100 p-2 rounded-xl flex-wrap select-none">
                      <span className="text-[8.5px] uppercase font-black text-slate-450 self-center mr-2">Draft tools:</span>
                      
                      <button
                        type="button"
                        onClick={() => { setShowSnippets(true); setShowTemplates(false); }}
                        className="p-1 px-3 bg-white hover:bg-slate-50 rounded-lg border text-[9px] font-black cursor-pointer uppercase text-indigo-700"
                      >
                        + Insert Snippet
                      </button>

                      <button
                        type="button"
                        onClick={() => { setShowTemplates(true); setShowSnippets(false); }}
                        className="p-1 px-3 bg-white hover:bg-slate-50 rounded-lg border text-[9px] font-black cursor-pointer uppercase text-indigo-700"
                      >
                        ⚡ Load Template Model
                      </button>

                      {/* Dictation triggers button (Section 6.1) */}
                      <button
                        type="button"
                        onClick={handleToggleDictation}
                        className={`p-1 px-3 rounded-lg border text-[9px] font-black cursor-pointer uppercase flex items-center gap-1 ${
                          isDictating ? 'bg-red-500 text-white animate-pulse' : 'bg-white hover:bg-slate-50 text-slate-650'
                        }`}
                      >
                        {isDictating ? <Volume2 className="h-3.5 w-3.5 animate-bounce" /> : <VolumeX className="h-3.5 w-3.5" />}
                        <span>{isDictating ? 'Dictating live (Click Stop)' : 'Dictation inputs speech'}</span>
                      </button>
                    </div>

                    {isDictating && (
                      <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl space-y-1 text-red-900 leading-normal animate-pulse">
                        <p className="font-black uppercase text-[8px] text-red-700">Dictating into Editor (Transcribing micro-service active)</p>
                        <p className="font-mono text-[9px]">"{dictationLogs}"</p>
                      </div>
                    )}

                    {/* MAIN RICH TEXT EDITOR BODY */}
                    <div className="space-y-1.5 focus-within:ring-1 focus-within:ring-indigo-300 rounded-xl overflow-hidden border">
                      
                      {/* Fake design mock toolbar indicators */}
                      <div className="bg-slate-100 p-1.5 border-b flex items-center justify-between flex-wrap gap-1 select-none">
                        <div className="flex items-center gap-1 text-[9px] font-bold">
                          <button type="button" className="p-1 text-slate-600 font-extrabold hover:bg-slate-200 rounded">B</button>
                          <button type="button" className="p-1 text-slate-600 italic hover:bg-slate-200 rounded">I</button>
                          <button type="button" className="p-1 text-slate-600 underline hover:bg-slate-200 rounded">U</button>
                          <span className="text-slate-300">|</span>
                          <button type="button" className="p-1 text-slate-600 hover:bg-slate-200 rounded">Align</button>
                          <button type="button" className="p-1 text-slate-600 hover:bg-slate-200 rounded">Pala</button>
                        </div>

                        {/* Variables Highlight insertions list */}
                        <div className="flex gap-1">
                          {['[CLIENT_NAME]', '[MATTER_REFERENCE]', '[TODAY_DATE]'].map(v => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setComposeMessage(prev => prev + ' ' + v)}
                              className="text-[8px] bg-indigo-50 border border-indigo-150 text-indigo-750 p-0.5 px-1.5 rounded hover:bg-indigo-100 cursor-pointer"
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        rows={8}
                        value={composeMessage}
                        onChange={e => setComposeMessage(e.target.value)}
                        placeholder="Configure statutory client report update sheets..."
                        className="w-full text-xs p-3 bg-white outline-none font-sans resize-none leading-relaxed"
                      />

                      {/* Display calculations indicators */}
                      <div className="p-2 bg-slate-50 border-t flex justify-between text-slate-400 text-[9px] font-bold">
                        <span>{composeMessage.length} characters written</span>
                        <span>Estimated reading duration: {Math.ceil(composeMessage.split(' ').length / 150)} min read</span>
                      </div>
                    </div>

                    {/* Disclaimers layout list with option toggles */}
                    <div className="p-3 border rounded-xl bg-slate-50/50 space-y-2">
                      <span className="text-[9px] text-slate-400 uppercase font-black block">Standard Auto attached Disclaimer rules</span>
                      
                      <div className="space-y-1.5 leading-snug">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="font-bold text-slate-800">1. Attorney-Client Privilege Cavet</span>
                          <span className="bg-indigo-100 text-indigo-900 border text-[8px] font-black px-1.5 py-0.5 rounded uppercase">REQUIRED UNMUTABLE</span>
                        </div>
                        <p className="text-[9.5px] italic text-slate-450 bg-white p-2 rounded border">
                          Disclaimer: CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGED INFORMATION. Do not duplicate or distribute without counsel authorization.
                        </p>
                      </div>
                    </div>

                    {/* ACTIVE DELIVERABILITY CHANNELS ENFORCEMENT */}
                    <div className="space-y-2 border-t pt-3">
                      <span className="text-[9px] text-slate-400 block font-black uppercase">Outbound dispatch channels fallback preferences</span>
                      
                      <div className="flex gap-2">
                        {['email', 'whatsapp', 'sms'].map(ch => {
                          const isActive = composeChannelsStr.includes(ch);
                          return (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => setComposeChannelsStr(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])}
                              className={`p-2 rounded-xl text-xxs font-black uppercase border transition-all cursor-pointer ${
                                isActive ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white hover:bg-slate-50 text-slate-440'
                              }`}
                            >
                              Dispatch via {ch}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* SCHEDULING SECTION WITH SEND TIME OPTIMIZATION */}
                    <div className="p-3 bg-indigo-50/40 border border-indigo-150 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9.5px] text-indigo-900 block font-black uppercase">Schedule and Optimization options</span>
                        <div className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            id="schedule-toggle-box" 
                            checked={isScheduled} 
                            onChange={e => setIsScheduled(e.target.checked)} 
                            className="h-3.5 w-3.5 rounded text-indigo-650 cursor-pointer"
                          />
                          <label htmlFor="schedule-toggle-box" className="text-[10px] uppercase font-black text-indigo-950 select-none cursor-pointer">Schedule for later</label>
                        </div>
                      </div>

                      {isScheduled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 leading-normal pt-2 border-t">
                          <div>
                            <span className="text-slate-400 block mb-1">Target dispatch date & hour</span>
                            <input 
                              type="datetime-local" 
                              value={scheduleTime}
                              onChange={e => setScheduleTime(e.target.value)}
                              className="p-2 border bg-white rounded-lg text-xs w-full text-slate-800 font-mono"
                            />
                          </div>

                          <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950 flex items-start gap-1.5">
                            <Clock className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                            <div>
                              <p className="font-extrabold uppercase text-[9px]">Send-Time Optimization suggestion</p>
                              <p className="text-[10px] mt-0.5 leading-relaxed">System logs show matching contacts regularly read updates on <b>Tuesdays between 10:00 - 11:30 AM</b>. Adjusting schedule boosts engagement.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sticky Compose Foot Actions */}
                    <div className="flex justify-between items-center border-t pt-4 bg-slate-50/20">
                      <button
                        onClick={() => setIsComposeMode(false)}
                        className="p-2 px-4 border border-red-200 hover:bg-red-50 text-red-700 bg-white shadow-xxs rounded-xl uppercase font-black tracking-wider text-[9px] cursor-pointer"
                      >
                        Discard
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveDraft}
                          className="p-2 px-5 border hover:bg-slate-50 text-slate-705 bg-white shadow-xxs rounded-xl uppercase font-black text-[9px] cursor-pointer"
                        >
                          Lock as Draft
                        </button>
                        
                        <button
                          onClick={() => {
                            if (!composeMessage || !composeSubject) {
                              alert('Subject title and text message are required.');
                              return;
                            }
                            // Insert into local state
                            const idStr = `corr-temp-${Date.now()}`;
                            const newItem: Correspondence = {
                              id: idStr,
                              companyId: companyId,
                              caseId: composeCase || 'case-1',
                              clientId: composeClient || 'client-1',
                              referenceNumber: `CORR-2026-0${correspondenceList.length + 1}`,
                              subject: composeSubject,
                              message: composeMessage,
                              status: 'DRAFT',
                              priority: composePriority,
                              isUrgent: composePriority === 'urgent',
                              isPrivileged: composePrivilege,
                              sourceType: 'manual',
                              snippetsUsed: [],
                              variables: {},
                              disclaimers: [],
                              signatureBlock: { name: sendOnBehalf, title: 'Counsel', firm: 'Docket Law', phone: '+1 555-0192', email: 'counsel@docketlaw.app' },
                              ccRecipients: [],
                              bccRecipients: [],
                              secondaryRecipients: [],
                              sendTimeOptimized: useOptimization,
                              approvalLevel: 1,
                              slaBreached: false,
                              deliveryReport: {},
                              responses: [],
                              responseStatus: 'none',
                              auditTrail: [{ id: `aud-${Date.now()}`, action: 'Created draft manually', performedBy: 'System', timestamp: new Date().toLocaleString() }],
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString()
                            };
                            setCorrespondenceList([newItem, ...correspondenceList]);
                            setSelectedId(idStr);
                            promptConsentSend(idStr);
                          }}
                          className="p-2.5 px-6 bg-indigo-600 hover:bg-indigo-705 text-white shadow shadow-indigo-150 rounded-xl uppercase font-black tracking-wider text-[9px] cursor-pointer flex items-center gap-1.5"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Approve & Send</span>
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {/* STEP 2: AI DRAFT AUTO GENERATION ROOM */}
                {composeStep === 'AI_DRAFT' && (
                  <div className="space-y-4 text-xxs font-semibold">
                    
                    <div className="p-4 bg-indigo-50 border border-indigo-150 text-indigo-900 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4.5 w-4.5 text-indigo-650 animate-pulse" />
                        <span className="font-black uppercase tracking-wider text-[10px]">Generative AI Draft Room</span>
                      </div>
                      <p>Docket AI reads litigation files histories and previous communications transcripts automatically to compile formatted, non-spam compliant letters.</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-slate-400 block uppercase font-black mb-1">Litigation Milestone context briefing (What happened?) *</label>
                        <textarea
                          rows={4}
                          value={aiContext}
                          onChange={e => setAiContext(e.target.value)}
                          placeholder="E.g., Today's hearing postponed because opposing defense team failed signature sheets."
                          className="w-full text-xs p-2.5 bg-white border rounded-xl outline-none leading-relaxed font-mono resize-none focus:ring-1 focus:ring-indigo-300"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b">
                        <div>
                          <label className="text-slate-400 block uppercase font-black mb-1">Desired Tone preset</label>
                          <select
                            value={aiTone}
                            onChange={e => setAiTone(e.target.value as any)}
                            className="w-full p-2 bg-white border rounded-lg text-xs"
                          >
                            <option value="Formal">Formal Legal (Courts & Registrars)</option>
                            <option value="Professional">Professional business</option>
                            <option value="Plain Language">Plain Language (Easy-to-read translation)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-400 block uppercase font-black mb-1">Multiple variations to compare</label>
                          <select
                            value={aiVariationsCount}
                            onChange={e => setAiVariationsCount(parseInt(e.target.value))}
                            className="w-full p-2 bg-white border rounded-lg text-xs"
                          >
                            <option value={1}>1 Single Variation</option>
                            <option value={2}>2 Parallel drafts (Compare side-by-side)</option>
                            <option value={3}>3 Draft variations</option>
                          </select>
                        </div>
                      </div>

                      {/* AI Tone horizontal slider (live update) */}
                      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600">
                          <span>Live Tone Sliders</span>
                          <span className="text-indigo-750 font-mono">{toneSlider}% Formal Attorney Language</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={toneSlider}
                          onChange={e => {
                            setToneSlider(parseInt(e.target.value));
                          }}
                          className="w-full h-1 bg-slate-350 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-slate-450 uppercase">
                          <span>Very Plain (Plain English)</span>
                          <span>Highly Academic / Legal terminology</span>
                        </div>
                      </div>

                      <button
                        onClick={triggerAIGenerateVariations}
                        disabled={isGenerating || !aiContext}
                        className="w-full p-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xxs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition"
                      >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Sparkles className="h-4 w-4 text-amber-400" />}
                        <span>Compile AI Client Draft Variations</span>
                      </button>
                    </div>

                  </div>
                )}

                {/* COMPARE MULTIPLE GENERATED VARIATIONS */}
                {composeStep === 'COMPARE' && aiVariations.length > 0 && (
                  <div className="space-y-4 text-xxs font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-indigo-705 block font-black uppercase">Verify AI compiled Draft variations</span>
                      
                      <button 
                        onClick={() => setComposeStep('AI_DRAFT')}
                        className="text-xs text-indigo-650 hover:underline"
                      >
                        &larr; Adjust criteria parameters
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Variation card 1 */}
                      <div className="p-4 bg-white border rounded-xl space-y-3 text-left relative shadow-xxs">
                        <div className="flex justify-between items-center">
                          <span className="bg-indigo-100 text-indigo-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Draft Alternative 1</span>
                          <span className="text-slate-400">Recommended score: 92%</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-mono">
                          "{aiVariations[0]}"
                        </p>
                        <button
                          onClick={() => {
                            setComposeMessage(aiVariations[0]);
                            setComposeStep('MANUAL');
                            alert('Draft Alternative 1 loaded to manual editor. Finalize signature disclaimers below.');
                          }}
                          className="w-full p-1.5 bg-slate-905 hover:bg-slate-800 text-slate-800 border text-xxs uppercase font-black rounded cursor-pointer text-center"
                        >
                          Select Alternative 1
                        </button>
                      </div>

                      {/* Variation card 2 */}
                      <div className="p-4 bg-white border rounded-xl space-y-3 text-left relative shadow-xxs">
                        <div className="flex justify-between items-center">
                          <span className="bg-indigo-100 text-indigo-900 text-[8px] font-black px-1.5 py-0.5 rounded">Draft Alternative 2</span>
                          <span className="text-slate-400">Plain English alternative</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-mono">
                          "{aiVariations[1]}"
                        </p>
                        <button
                          onClick={() => {
                            setComposeMessage(aiVariations[1]);
                            setComposeStep('MANUAL');
                            alert('Draft Alternative 2 loaded. Verify cc targets fields listings.');
                          }}
                          className="w-full p-1.5 bg-slate-905 hover:bg-slate-800 text-slate-800 border text-xxs uppercase font-black rounded cursor-pointer text-center"
                        >
                          Select Alternative 2
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            ) : (
              
              // NORMAL DETAIL VIEW (Section 6.2 specs)
              <div className="space-y-4 text-left">
                {activeSelected ? (
                  <div className="space-y-4">
                    
                    {/* Header bar titles */}
                    <div className="flex justify-between items-start pb-3 border-b flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-black text-slate-900 font-mono">
                            {activeSelected.referenceNumber} &bull; {activeSelected.subject || 'Client Matter Update'}
                          </h2>
                          <span className={`text-[8.5px] font-mono px-2 py-0.5 rounded font-black uppercase ${
                            activeSelected.status === 'SENT' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {activeSelected.status}
                          </span>
                        </div>
                        <p className="text-slate-450 text-[10px] font-semibold mt-1">
                          Matter: <b className="text-slate-705">{activeSelected.caseRef}</b> &bull; Assigned: {activeSelected.signatureBlock.name}
                        </p>
                      </div>

                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            alert('Correspondence duplicate enqueued to draft files queue.');
                          }}
                          className="p-1 px-3 bg-white border rounded hover:bg-slate-50 text-slate-655 font-bold cursor-pointer"
                        >
                          Duplicate
                        </button>
                        
                        {activeSelected.status === 'SENT' && (
                          <button 
                            onClick={() => promptConsentSend(activeSelected.id)}
                            className="p-1 px-3 bg-indigo-650 hover:bg-indigo-750 text-white rounded font-bold cursor-pointer"
                          >
                            Resend Update
                          </button>
                        )}

                        {activeSelected.status === 'DRAFT' && (
                          <button 
                            onClick={() => {
                              setSelectedId(activeSelected.id);
                              setComposeSubject(activeSelected.subject || '');
                              setComposeMessage(activeSelected.message);
                              setComposeCase(activeSelected.caseId);
                              setComposeClient(activeSelected.clientId);
                              setIsComposeMode(true);
                              setComposeStep('MANUAL');
                            }}
                            className="p-1 px-3 bg-indigo-650 edit-btn hover:bg-indigo-700 text-white font-bold rounded cursor-pointer"
                          >
                            Edit draft
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Rich Render Text layout view */}
                    <div className="bg-white border rounded-2xl p-5 space-y-4 shadow-xxxs">
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">Client Message Body</span>
                      <p className="text-xs text-slate-705 leading-relaxed font-mono select-all">
                        {activeSelected.message}
                      </p>

                      <div className="border-t pt-4 font-sans grid grid-cols-1 sm:grid-cols-2 gap-3 text-xxs font-semibold">
                        <div>
                          <span className="text-slate-400 text-[8.5px] uppercase block mb-0.5">Disclaimers attached</span>
                          <p className="text-slate-600 font-mono italic leading-relaxed text-[10px]">
                            - PRIVILEGED ATTORNEY-CLIENT COMMUNICATION. DO NOT DISTRIBUTE.
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-400 text-[8.5px] uppercase block mb-0.5">Signature block</span>
                          <p className="text-slate-705 font-semibold text-[10.5px]">
                            {activeSelected.signatureBlock.name} ({activeSelected.signatureBlock.title})<br />
                            <span className="text-slate-400 text-[9.5px]">{activeSelected.signatureBlock.firm} &bull; {activeSelected.signatureBlock.phone}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* COMPLIANT TRACKING STATUS DELIVERY CODES */}
                    <div className="bg-white border p-4 rounded-xl space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-400">Outbound Delivery status tracking</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xxs font-semibold">
                        
                        <div className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4.5 w-4.5 text-slate-400" />
                            <div>
                              <span className="font-extrabold block text-slate-800">Email Gateway</span>
                              <span className="text-[10px] text-slate-400 font-mono">Sent to primary account</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {activeSelected.status === 'SENT' ? (
                              <>
                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 px-1.5 py-0.5 rounded font-black font-sans uppercase">
                                  Delivered ok (Opened)
                                </span>
                                <span className="text-[9px] text-indigo-700 block font-mono mt-1 pr-1 font-bold">2 clicks clicked</span>
                              </>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 border px-1.5 py-0.5 rounded">
                                Pending reviewing
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4.5 w-4.5 text-slate-400" />
                            <div>
                              <span className="font-extrabold block text-slate-800">WhatsApp Dispatch</span>
                              <span className="text-[10px] text-slate-400">Meta transactional gateway</span>
                            </div>
                          </div>

                          <div className="text-right">
                            {activeSelected.status === 'SENT' ? (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 px-1.5 py-0.5 rounded font-black font-sans uppercase">
                                ✓ Seen - 02:24 PM
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 border px-1.5 py-0.5 rounded">
                                Handshake wait
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* SECTION: CLIENT RESPONSE LOG SYSTEM (Section 6.2 specs) */}
                    <div className="border bg-white p-4 rounded-xl space-y-3 text-xxs font-semibold">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-[10px] font-black uppercase text-slate-800">Section 12: Client responses & Counselor Sign-Off Actions</h4>
                          <p className="text-[10px] text-slate-450">Track customer replies, follow-ups required, and phone approvals notes.</p>
                        </div>

                        <button
                          onClick={() => setShowLogResponseForm(true)}
                          className="p-1 px-3 bg-slate-800 hover:bg-slate-900 border text-white rounded font-extrabold select-none cursor-pointer"
                        >
                          + Log Client Reply
                        </button>
                      </div>

                      {/* Log response slide-down modal */}
                      {showLogResponseForm && (
                        <div className="bg-slate-50 border p-3 rounded-lg space-y-3 text-left">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-400 uppercase block mb-1">Response method</label>
                              <select 
                                value={logResponseMethod}
                                onChange={e => setLogResponseMethod(e.target.value)}
                                className="w-full p-2 border bg-white rounded-lg text-xs outline-none"
                              >
                                <option value="Email reply">E-mail reply</option>
                                <option value="In-person meeting">In-person brief</option>
                                <option value="WhatsApp chat">WhatsApp message</option>
                                <option value="Phone call back">Direct Phone call</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5 pt-5">
                              <input 
                                type="checkbox" 
                                id="resp-required-act" 
                                checked={logResponseRequired}
                                onChange={e => setLogResponseRequired(e.target.checked)}
                                className="h-3.5 w-3.5 rounded"
                              />
                              <label htmlFor="resp-required-act" className="font-bold cursor-pointer">Action required from counsel</label>
                            </div>
                          </div>

                          <div>
                            <label className="text-slate-400 uppercase block mb-1">Notes of customer's response *</label>
                            <textarea
                              rows={2}
                              value={logResponseNotes}
                              onChange={e => setLogResponseNotes(e.target.value)}
                              placeholder="E.g., Client confirms spelling is correct. Demands speed-up files."
                              className="w-full p-2 border bg-white rounded-lg text-xs"
                            />
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowLogResponseForm(false)} className="px-3 py-1 bg-white border rounded">Cancel</button>
                            <button onClick={() => handlePostResponseLogged(activeSelected.id)} className="px-4 py-1 bg-indigo-600 text-white rounded">Submit Log</button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {activeSelected.responses.map(resp => (
                          <div key={resp.id} className="p-3 bg-indigo-50/20 border border-indigo-150 rounded-xl flex justify-between items-center text-slate-805">
                            <div>
                              <span className="text-[8px] bg-indigo-100 text-indigo-900 border px-1.5 py-0.5 rounded font-black uppercase">
                                Action captured
                              </span>
                              <p className="font-extrabold text-[11px] leading-tight text-slate-800 mt-1">{resp.notes}</p>
                            </div>

                            <div className="text-right">
                              <span className="text-slate-400 block font-mono text-[9px]">{resp.timestamp}</span>
                              <span className="text-emerald-700 block text-[9.5px] font-black mt-0.5">✓ Counselor Signed-Off</span>
                            </div>
                          </div>
                        ))}
                        {activeSelected.responses.length === 0 && (
                          <p className="text-center italic text-slate-400 py-3">No direct client reply logged for this specific transaction yet.</p>
                        )}
                      </div>
                    </div>

                    {/* TIMELINE AUDIT HISTORY WORKFLOW TRACES (Section 10) */}
                    <div className="bg-white border rounded-xl p-4 space-y-3 text-xxs font-semibold">
                      
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] text-slate-450 uppercase block font-black">Section 10: SLA Reviews & Immutable transaction log</span>
                          <p className="text-[9px] text-slate-400 font-semibold leading-none">Complete chronological trace of drafts versions, approvals, and sends.</p>
                        </div>
                        
                        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border">
                          <input 
                            type="text" 
                            placeholder="Add SLA comment..." 
                            value={typedLabel}
                            onChange={e => setTypedLabel(e.target.value)}
                            className="bg-white border-0 text-[10px] p-1 px-2.5 rounded focus:outline-none"
                          />
                          <button 
                            type="button" 
                            onClick={() => handlePostApprovalComments(activeSelected.id)}
                            className="text-[9px] font-black bg-indigo-600 hover:bg-indigo-700 text-white p-1 px-3.5 rounded"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {activeSelected.auditTrail.map((trial, tIdx) => (
                          <div key={trial.id || tIdx} className="p-2.5 bg-slate-50 border rounded-lg flex justify-between font-mono text-[9.5px]">
                            <p className="text-slate-700 font-medium">
                              &bull; <b className="text-slate-900">{trial.performedBy}</b>: {trial.action}
                              {trial.details && <span className="text-indigo-705 block font-sans pl-3 pt-0.5 mt-0.5 bg-white border p-1 rounded font-bold">"{trial.details}"</span>}
                            </p>
                            <span className="text-slate-400 font-bold font-sans self-center whitespace-nowrap ml-2">{trial.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-20 bg-white border rounded-2xl p-5 space-y-3">
                    <MessageSquare className="h-10 w-10 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-405 font-sans">No client update selected</p>
                    <p className="text-xs text-slate-350 leading-relaxed max-w-xs mx-auto">Select any correspondence update card on the left pane dockets to audit its tracking stats or write new ones.</p>
                    
                    <button 
                      onClick={() => {
                        setIsComposeMode(true);
                      }}
                      className="p-2 px-5 bg-indigo-600 text-white rounded-xl text-xxs font-black cursor-pointer uppercase tracking-wider"
                    >
                      + Compose client letter
                    </button>
                  </div>
                )}
              </div>

            )}

            {/* SLIDE-IN SIDE DRAWERS AS REGISTERED CHANNELS */}
            {showSnippets && (
              <SnippetsLibrary 
                onInsert={handleInsertSnippet} 
                onClose={() => setShowSnippets(false)} 
              />
            )}

            {showTemplates && (
              <TemplateLibrary 
                onSelect={handleSelectTemplate} 
                onClose={() => setShowTemplates(false)} 
              />
            )}

          </div>
        </div>
      )}

      {/* SECTION 7: SECTION SPECIFIC CONSENT POPUPS (Section 7 specs) */}
      {consentPopupId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-sans text-slate-800 animate-fade-in">
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Authorize dispatch pipeline</span>
              <button onClick={() => setConsentPopupId(null)} className="text-slate-405 font-semibold text-base">&times;</button>
            </div>

            <div className="space-y-3.5 text-xxs font-semibold">
              <p className="text-[10px] leading-relaxed text-slate-500">
                A secure audited outgoing correspondence signature check is being initiated. Please log consent confirmations before dispersing communication into public email servers.
              </p>

              <div className="p-3 bg-indigo-50 border border-indigo-205 rounded-xl space-y-1 font-mono text-indigo-900 text-[10px]">
                <p>&bull; Target: {correspondenceList.find(c => c.id === consentPopupId)?.referenceNumber}</p>
                <p>&bull; Content header: "{correspondenceList.find(c => c.id === consentPopupId)?.subject}"</p>
                <p>&bull; Outbound channels: E-mail TLS Secure / WhatsApp meta</p>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-250 text-amber-950 font-medium rounded-xl leading-relaxed flex items-start gap-1.5">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <span>By continuing, the partner administrator verifies that the wording complies with local legal practice guidelines and doesn't initiate default.</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConsentPopupId(null)}
                className="flex-1 p-2 bg-white text-slate-505 border rounded-lg font-bold"
              >
                Refuse
              </button>
              
              <button
                onClick={() => executeSendFinal(consentPopupId)}
                className="flex-1 p-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Confirm & Send updates</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 11: FULL BULK WORKSPACE COMPILATION (Section 11) */}
      {showBulkModal && (
        <BulkSendModal 
          clients={availableClients}
          cases={cases}
          onClose={() => setShowBulkModal(false)}
          onRefresh={onRefresh}
        />
      )}

    </div>
  );
}
