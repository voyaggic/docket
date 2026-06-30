import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Briefcase, User, Calendar, MessageSquare, FileText, ChevronRight, Clock, Trash, Loader2, Send, Landmark, 
  CheckSquare, Users, Eye, Info, Download, ExternalLink, Paperclip, Smile, Reply, XCircle, Pin, BellOff, MessageCircle, 
  ChevronDown, CheckCheck, Check, ShieldAlert, ShieldCheck, Share2, Clipboard, Edit, RefreshCw, BarChart2, Mail, HelpCircle, 
  Sliders, Heart, Sparkles, AlertCircle, FileAudio, FileVideo, Filter, Tag, FolderPlus, Bell, ChevronLeft, Volume2, Mic, Video,
  Palette
} from 'lucide-react';
import { motion } from 'motion/react';
import { CompanySettings, Case, Client, Deadline, GeneratedDocument } from '../types';
import { getTerm } from '../utils/terminology';
import { useChatGlobal } from '../context/ChatGlobalContext';

// Import our modular helpers
import { 
  ChatFolder, ChatLabel, LegalNotice, KeywordAlertRule, BroadcastLog, ChatConversation, 
  SEED_USERS, MOCK_CHANNELS, MOCK_MESSAGES, CHAT_TEMPLATES 
} from './chat/ChatTypes';
import ChatAnalytics from './chat/ChatAnalytics';
import { 
  ExportChatDialog, KeywordAlertsConfig, NotificationSetupDialog, LegalNoticeComposerDialog 
} from './chat/ChatDialogs';

interface TeamChatViewProps {
  companyId: string;
  cases: Case[];
  clients: Client[];
  deadlines: Deadline[];
  documents: GeneratedDocument[];
  users: any[];
  currentUser: any;
  onRefresh: () => void;
  settings: CompanySettings;
}

function parseMessageContent(text: string, isOwn: boolean): React.ReactNode {
  const cleaned = text.replace(/```\s*\n?/g, ''); // strip stray legacy code fences
  const segments = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\)]+\)|\[LINK:\s*https?:\/\/[^\]]+\]|@[\w\s,\.\-Esq\.JD]+(?=[\s,!?]|$)|#[\w\-\/]+)/g);
  return (
    <>
      {segments.map((seg, i) => {
        if (!seg) return null;
        if (/^\*\*(.+)\*\*$/.test(seg)) return <strong key={i} className="font-extrabold">{seg.slice(2,-2)}</strong>;
        if (/^\*([^*]+)\*$/.test(seg)) return <em key={i}>{seg.slice(1,-1)}</em>;
        if (/^`([^`]+)`$/.test(seg)) return <code key={i} className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${isOwn?'bg-white/20 text-white':'bg-slate-100 text-slate-700'}`}>{seg.slice(1,-1)}</code>;
        const lm = seg.match(/^\[([^\]]+)\]\((https?:\/\/[^\)]+)\)$/);
        if (lm) return <a key={i} href={lm[2]} target="_blank" rel="noopener noreferrer" className={`underline font-semibold cursor-pointer ${isOwn?'text-blue-200 hover:text-white':'text-blue-600 hover:text-blue-800'}`}>{lm[1]}</a>;
        const ls = seg.match(/^\[LINK:\s*(https?:\/\/[^\]]+)\]$/);
        if (ls) return <a key={i} href={ls[1]} target="_blank" rel="noopener noreferrer" className={`underline break-all cursor-pointer text-[11px] ${isOwn?'text-blue-200 hover:text-white':'text-blue-600 hover:text-blue-800'}`}>{ls[1]}</a>;
        if (seg.startsWith('@')) return <span key={i} className={`font-bold px-1 py-0.5 rounded-md ${isOwn?'bg-white/25 text-white':'bg-blue-100 text-blue-700'}`}>{seg}</span>;
        if (seg.startsWith('#')) return <span key={i} className={`font-bold ${isOwn?'text-blue-200':'text-cyan-600'}`}>{seg}</span>;
        return <span key={i}>{seg}</span>;
      })}
    </>
  );
}

function groupMsgsByDate(msgs: any[]): { label: string; key: string; msgs: any[] }[] {
  const groups: { label: string; key: string; msgs: any[] }[] = [];
  msgs.forEach(m => {
    const d = new Date(m.createdAt);
    const key = d.toDateString();
    const today = new Date();
    const yest = new Date(); yest.setDate(yest.getDate()-1);
    const label = key === today.toDateString() ? 'Today'
      : key === yest.toDateString() ? 'Yesterday'
      : d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    const g = groups.find(x => x.key === key);
    if (g) g.msgs.push(m); else groups.push({ label, key, msgs: [m] });
  });
  return groups;
}

export default function TeamChatView({ 
  companyId, cases, clients, deadlines, documents, users, currentUser, onRefresh, settings 
}: TeamChatViewProps) {
  // --- UI Modes Toggles ---
  const [viewingMode, setViewingMode] = useState<'chat' | 'analytics'>('chat');
  
  // Dialog visibility states
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isAlertsConfigOpen, setIsAlertsConfigOpen] = useState(false);
  const [isNotificationSetupOpen, setIsNotificationSetupOpen] = useState(false);
  const [isNoticeComposerOpen, setIsNoticeComposerOpen] = useState(false);
  
  // Real-time / Mock Event alert notification banner
  const [mockAlertMessage, setMockAlertMessage] = useState<string | null>(null);

  // Layout states
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'details' | 'members' | 'files' | 'pinned' | 'on_record' | 'search'>('details');

  // Active Channel + composer state now sourced from global context (survives navigation)
  const {
    conversations, setConversations, messages, setMessages,
    selectedChannelId, setSelectedChannelId, notices, setNotices,
    msgText, setMsgText, attachedFiles, setAttachedFiles,
    composerDocked, setComposerDocked, composerMinimized, setComposerMinimized,
    isDictating, toggleDictation: handleToggleDictation, seeded, setSeeded
  } = useChatGlobal();

  // Message Lists & Thread states
  const [activeThreadParent, setActiveThreadParent] = useState<any | null>(null);
  const [threadText, setThreadText] = useState('');

  // Primary input formatting logic
  const [textMode, setTextMode] = useState<'normal' | 'bold' | 'code' | 'italic'>('normal');
  const [sendOnRecordFlag, setSendOnRecordFlag] = useState(false);

  // Left Panel Search / Filtering states
  const [leftSearch, setLeftSearch] = useState('');
  const [leftFilter, setLeftFilter] = useState<'all' | 'unread' | 'priority' | 'muted' | 'archived'>('all');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'pack-1': true
  });

  // Autocomplete Autocomplete triggers
  const [pickerType, setPickerType] = useState<'none' | 'reference' | 'mention'>('none');
  const [pickerFilter, setPickerFilter] = useState('');

  // Seed folders state
  const [folders, setFolders] = useState<ChatFolder[]>([
    { id: 'pack-1', name: 'Trial Prep Packets', color: 'blue-500', conversationIds: [] },
    { id: 'pack-2', name: 'Immediate Client Actions', color: 'amber-500', conversationIds: [] }
  ]);

  // Seed alert keywords state
  const [alertRules, setAlertRules] = useState<KeywordAlertRule[]>([
    { id: 'rule-1', keyword: 'statute', action: 'highlight', isActive: true, color: '#ef4444' },
    { id: 'rule-2', keyword: 'urgent', action: 'notify', isActive: true, color: '#f59e0b' }
  ]);

  // Broadcast campaign workflow state
  const [isBroadcastMode, setIsBroadcastMode] = useState(false);
  const [broadcastTargets, setBroadcastTargets] = useState<string[]>([]);
  const [broadcastLogs, setBroadcastLogs] = useState<BroadcastLog[]>([]);

  // Notices now sourced from global context, seeded once below

  // Context Detail viewers
  const [selectedUserProfile, setSelectedUserProfile] = useState<any | null>(null);
  const [rightSearchQuery, setRightSearchQuery] = useState('');
  const [isFilesFilterType, setIsFilesFilterType] = useState<'all' | 'word' | 'image' | 'pdf'>('all');
  const [pinnedFilterOnly, setPinnedFilterOnly] = useState(false);

  // Conversational AI summaries block
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [activeAISummary, setActiveAISummary] = useState<string | null>(null);

  // Focus mode trigger
  const [focusModeOn, setFocusModeOn] = useState(false);

  // Ref tags for scrolling
  const messageEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const mainInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewFile, setPreviewFile] = useState<{url:string;name:string;type:string}|null>(null);
  const [formatToolbar, setFormatToolbar] = useState<{x:number;y:number;s:number;e:number}|null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [someoneTyping, setSomeoneTyping] = useState(false);
  const [lastSentId, setLastSentId] = useState<string|null>(null);
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);
  const [chatFontSize, setChatFontSize] = useState<'sm'|'base'|'lg'>('base');
  const [chatTheme, setChatTheme] = useState<'default'|'dark'|'warm'|'legal'>('default');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  
  // Custom mobile & read status states
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('chat');
  const [readMessageIds, setReadMessageIds] = useState<Record<string, boolean>>({});

  // Automatically mark sent messages as read after a 2-second delay to simulate active reading
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sentById === currentUser.id && !readMessageIds[lastMsg.id]) {
        const timer = setTimeout(() => {
          setReadMessageIds(prev => ({ ...prev, [lastMsg.id]: true }));
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, currentUser.id]);

  const QUICK_EMOJIS = ['👍','⚖️','📋','🔒','✅','⚠️','📌','🚨','🤝','📎','💼','🗂️','✍️','🔍'];
  const CHAT_THEME_BG: Record<string,string> = { default:'bg-slate-50/30', dark:'bg-slate-900', warm:'bg-amber-50/40', legal:'bg-emerald-50/20' };
  const CHAT_THEME_MSG_BG: Record<string,string> = { default:'bg-white', dark:'bg-slate-800', warm:'bg-amber-50', legal:'bg-emerald-50' };
  const FONT_SIZE: Record<string,string> = { sm:'text-xs', base:'text-sm', lg:'text-base' };

  // Roster profiles wrapper
  const activeUsersList = users && users.length > 0 ? users : SEED_USERS;

  // --- INITIALIZE CONVERSATIONS AND MESSAGES ON LOAD ---
  useEffect(() => {
    if (!seeded) {
      // 1. Build initial conversations list by combining mock general streams with case files
      const defaultChannels = [...MOCK_CHANNELS];
      
      cases.forEach((cs) => {
        // Find corresponding client
        const cl = clients.find(c => c.id === cs.clientId);
        defaultChannels.push({
          id: cs.id,
          name: `${cs.referenceNumber || 'CASE'} - ${cl?.fullName || 'General'}`,
          type: 'matter',
          lastMessageAt: cs.openedDate || '2026-06-07T10:00:00Z',
          lastMessageText: cs.notes ? cs.notes.substring(0, 60) + '...' : 'Secure litigation room initialized.',
          unreadCount: Math.random() > 0.6 ? 1 : 0,
          caseObj: cs,
          clientObj: cl,
          isPinned: cs.priority === 'high' ? true : false,
          priority: cs.priority === 'high' ? 'high' : 'normal'
        });
      });

      setConversations(defaultChannels);

      // 2. Preload mock starting messages
      setMessages(MOCK_MESSAGES);
      setNotices([{
        id: 'notice-1',
        senderId: 'usr-partner-shara',
        title: 'SUPREME COURT PRACTICE REVISED FILINGS PROTOCOL',
        content: 'Effective immediately, all criminal advocacy affidavits must be synchronized to the vault and ledger-certified prior to appearance hours.',
        acknowledgedBy: [],
        createdAt: '2026-06-07T09:12:00Z',
        requiresAllSignature: true
      }]);
      setSeeded(true);
    }
  }, [cases, clients, seeded]);

  // --- SCROLL TO BOTTOM ON CHAT UPDATE ---
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedChannelId]);

  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThreadParent, threadText]);

  // --- TRIGGER MOCK REAL-TIME ACTIVITY ALERTS ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setMockAlertMessage("Notice: Shara Lawson logged changes to Matter Case #F-102. Check references.");
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  // --- AUTOCOMPLETE DETECTION HOOKS ---
  useEffect(() => {
    const lastWord = msgText.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      setPickerType('mention');
      setPickerFilter(lastWord.slice(1));
    } else if (lastWord.startsWith('#')) {
      setPickerType('reference');
      setPickerFilter(lastWord.slice(1));
    } else {
      setPickerType('none');
    }
  }, [msgText]);

  // Find active chat record helper
  const activeChannel = conversations.find(c => c.id === selectedChannelId) || {
    id: 'firm-general',
    name: 'Main Firm Lobbies',
    type: 'general',
    lastMessageText: 'Ready',
    unreadCount: 0
  };

  // Filter messages for active channel, ignoring threaded replies
  const primaryMessagesOnly = messages.filter(
    m => (m.caseId === activeChannel.id || (activeChannel.id === 'firm-general' && !m.caseId)) && !m.replyToId
  );

  // --- CONVERSATION CANDIDATES FILTERS ---
  const filteredConversations = conversations.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(leftSearch.toLowerCase()) || 
                        c.lastMessageText.toLowerCase().includes(leftSearch.toLowerCase());
    if (!matchSearch) return false;

    if (leftFilter === 'unread') return c.unreadCount > 0;
    if (leftFilter === 'priority') return c.priority === 'high';
    if (leftFilter === 'muted') return c.isMuted;
    if (leftFilter === 'archived') return c.isArchived;

    return !c.isArchived;
  });

  // Get unread counts across all active rooms
  const totalUnreads = conversations.reduce((acc, current) => acc + (current.unreadCount || 0), 0);
  const totalActiveConversationsCount = conversations.filter(c => !c.isArchived).length;
  const onRecordMessagesCount = messages.filter(m => m.isOnRecord).length;
  const sharedDocumentsCount = documents.length;

  // --- BROADCAST TRANSMISSION WORKFLOW ---
  const handleTriggerBroadcastSend = () => {
    if (!msgText.trim() || broadcastTargets.length === 0) return;

    // Simulate sending messages to all checked channels
    const newBroadcastMsgs = broadcastTargets.map(channelId => ({
      id: `broadcast-${Date.now()}-${channelId}`,
      companyId,
      caseId: channelId === 'firm-general' ? null : channelId,
      sentById: currentUser.id,
      message: `${msgText} [Broadcast Announcement]`,
      readBy: [],
      createdAt: new Date().toISOString(),
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      isOnRecord: sendOnRecordFlag
    }));

    setMessages(prev => [...prev, ...newBroadcastMsgs]);

    // Save in broadcast metrics logs
    const newLogItem: BroadcastLog = {
      id: `blog-${Date.now()}`,
      message: msgText,
      recipientsCount: broadcastTargets.length,
      sentAt: new Date().toLocaleTimeString(),
      senderName: currentUser.fullName
    };

    setBroadcastLogs(prev => [newLogItem, ...prev]);

    // Reset broadcast target states
    setMsgText('');
    setBroadcastTargets([]);
    setIsBroadcastMode(false);
    setMockAlertMessage(`Announcement broadcasted safely to ${broadcastTargets.length} case streams.`);
  };

  // --- SEND CHAT ACTION HANDLERS ---
  const handleSendChat = () => {
    if (!msgText.trim()) return;

    let finalMessage = msgText;
    if (textMode === 'bold') finalMessage = `**${msgText}**`;
    else if (textMode === 'italic') finalMessage = `*${msgText}*`;
    else if (textMode === 'code') finalMessage = `\`\`\`\n${msgText}\n\`\`\``;

    const newMsg = {
      id: `msg-${Date.now()}`,
      companyId,
      caseId: activeChannel.id === 'firm-general' ? null : activeChannel.id,
      sentById: currentUser.id,
      message: finalMessage,
      readBy: [],
      createdAt: new Date().toISOString(),
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatarUrl,
      isOnRecord: sendOnRecordFlag
    };

    setMessages(prev => [...prev, newMsg]);
    setMsgText('');
    setSendOnRecordFlag(false);
    setTextMode('normal');

    // Trigger secondary audio chime in browser context if configured
    try {
      const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
      chime.volume = 0.2;
      chime.play();
    } catch {}
  };

  // --- REPLY THREAD HANDLER ---
  const handlePostReply = () => {
    if (!threadText.trim() || !activeThreadParent) return;

    const newReply = {
      id: `reply-${Date.now()}`,
      companyId,
      caseId: activeChannel.id === 'firm-general' ? null : activeChannel.id,
      sentById: currentUser.id,
      message: threadText,
      readBy: [],
      createdAt: new Date().toISOString(),
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      replyToId: activeThreadParent.id
    };

    setMessages(prev => [...prev, newReply]);
    setThreadText('');
  };

  // --- CONTEXT MENUS ACTIONS ON CHANNELS ---
  const toggleMuteChannel = (id: string) => {
    setConversations(conversations.map(c => c.id === id ? { ...c, isMuted: !c.isMuted } : c));
  };

  const togglePinChannel = (id: string) => {
    setConversations(conversations.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c));
  };

  const addChannelToFolder = (chanId: string, foldId: string) => {
    setFolders(folders.map(f => {
      if (f.id === foldId && !f.conversationIds.includes(chanId)) {
        return { ...f, conversationIds: [...f.conversationIds, chanId] };
      }
      return f;
    }));
  };

  // Keyword check matching for highlighting alert terms on stream rendering
  const checkRulesHighlight = (txt: string) => {
    let result = { hasMatch: false, color: '' };
    alertRules.forEach(rule => {
      if (txt.toLowerCase().includes(rule.keyword)) {
        result = { hasMatch: true, color: rule.color };
      }
    });
    return result;
  };

  // --- ACTION CONTROLS FOR INDIVIDUAL MESSAGE BALLS ---
  const executeToggleReaction = (msgId: string, emoji: string) => {
    setMessages(messages.map(m => {
      if (m.id === msgId) {
        const reactions = m.reactions || {};
        const reactors = reactions[emoji] || [];
        if (reactors.includes(currentUser.fullName)) {
          reactions[emoji] = reactors.filter((usr: string) => usr !== currentUser.fullName);
        } else {
          reactions[emoji] = [...reactors, currentUser.fullName];
        }
        return { ...m, reactions };
      }
      return m;
    }));
  };

  const executeToggleMessagePin = (msgId: string) => {
    setMessages(messages.map(m => m.id === msgId ? { ...m, isPinned: !m.isPinned } : m));
  };

  const executeMarkMessageOnRecord = (msgId: string) => {
    setMessages(messages.map(m => m.id === msgId ? { ...m, isOnRecord: !m.isOnRecord } : m));
  };

  // --- AUTOCOMPLETE APPLY SELECTION HANDLERS ---
  const handleApplyReference = (item: any) => {
    const parts = msgText.split(/\s+/);
    parts.pop(); // remove incomplete hashtag block
    setMsgText([...parts, `#${item.referenceNumber || 'CASE'}`].join(' ') + ' ');
    setPickerType('none');
  };

  const handleApplyMention = (item: any) => {
    const parts = msgText.split(/\s+/);
    parts.pop(); // remove incomplete mention block
    setMsgText([...parts, `@${item.fullName}`].join(' ') + ' ');
    setPickerType('none');
  };

  // --- AI SUMMARY GENERATOR SYSTEM ---
  const handleGenerateAISummary = () => {
    setAiSummarizing(true);
    setTimeout(() => {
      const summaryContent = `Active Room: ${activeChannel.name}.\n` +
        `This room includes discussions between Alex Rivera and Jenny. ` +
        `Key Action Item: Prepare Supreme Court dockets and coordinate conflict checking documentation. ` +
        `The Statute or limitation has been verified in accordance with Practice stage metrics.`;
      setActiveAISummary(summaryContent);
      setAiSummarizing(false);
    }, 1500);
  };

  // File select handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTextareaSelect = () => {
    const el = mainInputRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    if (s === e) { setFormatToolbar(null); return; }
    const rect = el.getBoundingClientRect();
    const charsPerLine = Math.max(1, Math.floor(el.offsetWidth / 7.8));
    const line = Math.floor(s / charsPerLine);
    setFormatToolbar({
      x: Math.min(rect.left + (s % charsPerLine) * 7.8, rect.right - 240),
      y: rect.top + line * 22 - 56,
      s, e
    });
  };

  const applyFormat = (type: 'bold'|'italic'|'code'|'link'|'delete') => {
    if (!formatToolbar) return;
    const sel = msgText.substring(formatToolbar.s, formatToolbar.e);
    let rep = sel;
    if (type==='bold') rep = `**${sel}**`;
    else if (type==='italic') rep = `*${sel}*`;
    else if (type==='code') rep = `\`${sel}\``;
    else if (type==='link') {
      const url = window.prompt('Enter URL (https://...):');
      if (!url) return;
      rep = `[${sel}](${url})`;
    } else rep = '';
    setMsgText(msgText.substring(0, formatToolbar.s) + rep + msgText.substring(formatToolbar.e));
    setFormatToolbar(null);
  };

  const handleUndockComposer = () => {
    setComposerDocked(false);
    setComposerMinimized(false);
  };

  useEffect(() => {
    const t1 = setTimeout(() => setSomeoneTyping(true), 8000);
    const t2 = setTimeout(() => setSomeoneTyping(false), 11500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages.length]);

  const handleSendChatWithFiles = () => {
    if (!msgText.trim() && attachedFiles.length === 0) return;
    const id = `msg-${Date.now()}`;
    const doSend = (fileData: {name:string;type:string;dataUrl:string}[]) => {
      const newMsg: any = {
        id, companyId,
        caseId: activeChannel.id === 'firm-general' ? null : activeChannel.id,
        sentById: currentUser.id,
        message: msgText,
        attachments: fileData,
        readBy: [], reactions: {},
        createdAt: new Date().toISOString(),
        senderName: currentUser.fullName,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatarUrl,
        isOnRecord: sendOnRecordFlag
      };
      setMessages(prev => [...prev, newMsg]);
      setLastSentId(id);
      setTimeout(() => setLastSentId(null), 700);
      setMsgText(''); setAttachedFiles([]); setSendOnRecordFlag(false); setTextMode('normal'); setFormatToolbar(null);
      try { const a = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav'); a.volume=0.15; a.play(); } catch {}
    };
    if (attachedFiles.length > 0) {
      Promise.all(attachedFiles.map(f => new Promise<{name:string;type:string;dataUrl:string}>(res => {
        const r = new FileReader();
        r.onload = ev => res({name:f.name, type:f.type, dataUrl:ev.target?.result as string});
        r.readAsDataURL(f);
      }))).then(doSend);
    } else doSend([]);
  };


  return (
    <div className={`w-full h-full min-h-[500px] sm:min-h-[600px] bg-white rounded-none sm:rounded-3xl border-0 sm:border border-slate-205 overflow-hidden flex flex-col font-sans select-none ${focusModeOn ? 'max-w-4xl mx-auto ring-4 ring-blue-600/30 shadow-2xl' : ''}`}>
      
      {/* 1. SECURE TOP HEADER AREA WITH MULTI-TENANCY SIGNALS & STATS STRIP */}
      {!focusModeOn && (
        <div className="hidden md:block bg-slate-50 border-b p-4 pb-3 space-y-3 shrink-0 select-none">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-600/20">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5 leading-none">
                  <h1 className="text-base font-black text-slate-800 tracking-tight">
                    {getTerm('teamChat', settings)}
                  </h1>
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 p-0.5 px-2 rounded-full text-[9px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PGP Privileged</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                  <span>{activeUsersList.filter(u => u.isOnline).length} / {activeUsersList.length} Attorneys online</span>
                </div>
              </div>
            </div>

            {/* Quick configuration buttons header */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button 
                onClick={() => setViewingMode(viewingMode === 'chat' ? 'analytics' : 'chat')}
                className={`p-2 rounded-xl border flex items-center gap-1 font-bold text-xxs transition cursor-pointer shadow-xxs ${viewingMode === 'analytics' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white hover:text-slate-805 text-slate-500'}`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{viewingMode === 'analytics' ? 'Show Chat' : 'Audit Intelligence'}</span>
              </button>

              <button 
                onClick={() => setIsAlertsConfigOpen(true)}
                className="p-2 bg-white hover:bg-slate-50 text-slate-500 rounded-xl border flex items-center gap-1 font-bold text-xxs cursor-pointer shadow-xxs"
                title="Config keyword triggers"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden leading-none md:inline">Spike Rules</span>
              </button>

              <button 
                type="button"
                onClick={() => setIsNotificationSetupOpen(true)}
                className="p-2 bg-white hover:bg-slate-50 text-slate-505 text-slate-500 rounded-xl border flex items-center justify-center cursor-pointer shadow-xxs"
                title="Personal tune alerts"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* DYNAMIC STATISTICS STRIP */}
          {viewingMode === 'chat' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-dashed">
              {[
                {
                  icon: <MessageCircle className="w-3.5 h-3.5" />,
                  iconBg: totalUnreads > 0 ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400',
                  label: 'Unreads',
                  value: `${totalUnreads} rooms`,
                  valueColor: totalUnreads > 0 ? 'text-rose-600' : 'text-slate-700',
                  border: 'border-rose-100',
                  pulse: totalUnreads > 0,
                  onClick: () => setLeftFilter('unread')
                },
                {
                  icon: <Users className="w-3.5 h-3.5" />,
                  iconBg: 'bg-blue-50 text-blue-500',
                  label: 'Active Rooms',
                  value: `${totalActiveConversationsCount} active`,
                  valueColor: 'text-blue-600',
                  border: 'border-blue-100',
                  pulse: false,
                  onClick: () => setLeftFilter('all')
                },
                {
                  icon: <Landmark className="w-3.5 h-3.5" />,
                  iconBg: 'bg-emerald-50 text-emerald-500',
                  label: 'Ledg Records',
                  value: `${onRecordMessagesCount} logs`,
                  valueColor: 'text-emerald-600',
                  border: 'border-emerald-100',
                  pulse: false,
                  onClick: () => { setRightPanelTab('on_record'); setIsRightPanelOpen(true); }
                },
                {
                  icon: <ShieldAlert className="w-3.5 h-3.5" />,
                  iconBg: 'bg-amber-50 text-amber-500',
                  label: 'Notices',
                  value: `${notices.length} active`,
                  valueColor: 'text-amber-600',
                  border: 'border-amber-100',
                  pulse: notices.some(n => !n.acknowledgedBy.includes(currentUser.id)),
                  onClick: () => setIsNoticeComposerOpen(true)
                },
                {
                  icon: <FileText className="w-3.5 h-3.5" />,
                  iconBg: 'bg-cyan-50 text-cyan-500',
                  label: 'Drive Assets',
                  value: `${sharedDocumentsCount} seeded`,
                  valueColor: 'text-cyan-600',
                  border: 'border-cyan-100',
                  pulse: false,
                  onClick: () => { setRightPanelTab('files'); setIsRightPanelOpen(true); }
                }
              ].map((stat, idx) => (
                <button
                  key={idx}
                  onClick={stat.onClick}
                  className={`bg-white border ${stat.border} rounded-xl p-2 flex items-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer text-left ${idx === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${stat.iconBg} ${stat.pulse ? 'animate-pulse' : ''}`}>
                    {stat.icon}
                  </div>
                  <div className="text-left leading-none min-w-0">
                    <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest block">{stat.label}</span>
                    <span className={`text-[11px] font-black block mt-0.5 ${stat.valueColor}`}>{stat.value}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Real-time ticker banner alerts */}
      {mockAlertMessage && (
        <div className="bg-indigo-600 text-white p-2 px-4 flex justify-between items-center text-xxs block leading-tight font-sans select-none shrink-0 animate-slide-down">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
            <span className="font-medium truncate max-w-[280px] sm:max-w-none">{mockAlertMessage}</span>
          </div>
          <button onClick={() => setMockAlertMessage(null)} className="p-0.5 hover:bg-white/10 rounded-full text-white cursor-pointer select-none font-bold">✕</button>
        </div>
      )}

      {/* ANALYTICS VIEW ROUTER */}
      {viewingMode === 'analytics' ? (
        <div className="flex-1 overflow-y-auto p-4 select-none">
          <ChatAnalytics 
            onBack={() => setViewingMode('chat')}
            messagesCount={messages.length}
            conversationsCount={conversations.length}
          />
        </div>
      ) : (
        /* --- CHAT THREE-COLUMN LAYOUT PANEL --- */
        <div className="flex-grow grid grid-cols-1 md:grid-cols-12 overflow-hidden h-full">
          
          {/* =====================================================================
              LEFT PANEL (25% Width, cols-3): Conversation lists & custom sections
              ===================================================================== */}
          {!focusModeOn && (
            <div className={`md:col-span-3 border-r flex flex-col h-full bg-slate-50/50 overflow-hidden shrink-0 pb-[72px] md:pb-0 ${mobileView === 'list' ? 'flex w-full' : 'hidden md:flex'}`}>
              
              {/* Search & filters head */}
              <div className="p-3 bg-white border-b space-y-2 select-none">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search case streams..."
                    value={leftSearch}
                    onChange={e => setLeftSearch(e.target.value)}
                    className="w-full text-xxs p-2 pl-8 border bg-slate-50 rounded-xl outline-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex p-0.5 border bg-slate-105 rounded-lg text-[9px] font-black">
                    {(['all', 'unread', 'priority'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setLeftFilter(tab)}
                        className={`p-1 px-2.5 rounded cursor-pointer leading-tight uppercase ${leftFilter === tab ? 'bg-white text-indigo-700 shadow-xxs font-black' : 'text-slate-410 text-slate-500 hover:text-slate-800'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setIsNoticeComposerOpen(true)}
                    className="p-1 hover:bg-amber-50 text-amber-600 rounded border hover:border-amber-200 transition flex items-center justify-center"
                    title="Publish bulletin legal notice"
                  >
                    <Landmark className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable conversation tree folder groups */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-4 text-left select-none">
                
                {/* SPECIAL CONTROLLER: BROADCAST SWITCHER */}
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setIsBroadcastMode(!isBroadcastMode);
                      setBroadcastTargets([]);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between w-full font-bold text-xxs transition cursor-pointer select-none ${isBroadcastMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white hover:bg-indigo-50/20 text-indigo-700 border-indigo-100'}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Share2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">Post Broadcast Update</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 transition ${isBroadcastMode ? 'rotate-90' : ''}`} />
                  </button>
                </div>

                {/* 1. GENERAL FIRM PUBLIC GROUP */}
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block px-1.5">Official Stream</span>
                  <div className="space-y-0.5">
                    {filteredConversations.filter(c => c.type === 'general').map(cn => (
                      <button
                        key={cn.id}
                        onClick={() => { setSelectedChannelId(cn.id); setMobileView('chat'); }}
                        className={`w-full p-2.5 rounded-xl text-left border text-xxs transition flex items-center gap-2 cursor-pointer ${selectedChannelId === cn.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'hover:bg-slate-100 bg-white border-slate-201'}`}
                      >
                        <div className="h-4.5 w-4.5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-black">🏢</div>
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold block truncate leading-none mb-0.5">{cn.name}</span>
                          <span className={`text-[8.5px] block truncate ${selectedChannelId === cn.id ? 'text-white/80' : 'text-slate-400'}`}>{cn.lastMessageText}</span>
                        </div>
                        {cn.unreadCount > 0 && selectedChannelId !== cn.id && (
                          <span className="h-4 min-w-[16px] bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold px-1 select-none animate-pulse">
                            {cn.unreadCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. CASE MATTERS SECTION SPLIT */}
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block px-1.5">Court Matters Streams</span>
                  
                  <div className="space-y-0.5 max-h-[220px] overflow-y-auto pr-1">
                    {filteredConversations.filter(c => c.type === 'matter').map(cn => (
                      <div 
                        key={cn.id}
                        className={`w-full p-2.5 rounded-xl border text-xxs transition flex items-center justify-between gap-1.5 cursor-pointer relative ${selectedChannelId === cn.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'hover:bg-slate-100 bg-white border-slate-201'}`}
                        onClick={() => { setSelectedChannelId(cn.id); setMobileView('chat'); }}
                      >
                        {isBroadcastMode && (
                          <input
                            type="checkbox"
                            checked={broadcastTargets.includes(cn.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.checked) setBroadcastTargets([...broadcastTargets, cn.id]);
                              else setBroadcastTargets(broadcastTargets.filter(item => item !== cn.id));
                            }}
                            className="mr-1.5 rounded text-blue-650 cursor-pointer w-3.5 h-3.5 shrink-0"
                          />
                        )}

                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold truncate block mb-0.5">{cn.caseObj?.referenceNumber || cn.name}</span>
                            {cn.isMuted && <BellOff className="w-3 h-3 text-amber-500 shrink-0" />}
                            {cn.isPinned && <Pin className="w-3 h-3 text-blue-500 block shrink-0 rotate-45" />}
                          </div>
                          
                          <p className={`text-[8.5px] truncate block leading-tight ${selectedChannelId === cn.id ? 'text-white/80' : 'text-slate-400'}`}>
                            {cn.clientObj?.fullName ? `Cl: ${cn.clientObj.fullName}` : cn.lastMessageText}
                          </p>
                        </div>

                        {/* Options button directly inline */}
                        <div className="flex items-center gap-1 shrink-0 select-none">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMuteChannel(cn.id);
                            }}
                            className="p-1 rounded bg-transparent hover:bg-black/10 text-slate-400 hover:text-slate-700"
                            title="Mute stream alerts"
                          >
                            <BellOff className="w-3 h-3 shrink-0" />
                          </button>
                          
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinChannel(cn.id);
                            }}
                            className="p-1 rounded bg-transparent hover:bg-black/10 text-slate-400 hover:text-slate-750"
                            title="Pin stream top"
                          >
                            <Pin className="w-3 h-3 shrink-0" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. EXPANDABLE CUSTOM FILE FOLDERS */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Custom folders</span>
                    <button
                      onClick={() => {
                        const newName = prompt("Enter new folder directory name:");
                        if (newName) {
                          setFolders([...folders, { id: `pack-${Date.now()}`, name: newName, color: 'emerald-500', conversationIds: [] }]);
                        }
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-700"
                      title="New custom folder tag"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 select-none text-left">
                    {folders.map(f => (
                      <div key={f.id} className="border rounded-xl bg-white overflow-hidden text-xxs">
                        <button
                          onClick={() => setExpandedFolders({ ...expandedFolders, [f.id]: !expandedFolders[f.id] })}
                          className="w-full p-2.5 flex items-center justify-between text-slate-650 hover:bg-slate-50 cursor-pointer font-bold select-none text-[10px]"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2 h-2 rounded-full block bg-${f.color}`} />
                            <span className="truncate">{f.name}</span>
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedFolders[f.id] ? 'rotate-180' : ''}`} />
                        </button>

                        {expandedFolders[f.id] && (
                          <div className="p-1 bg-slate-50/50 border-t space-y-0.5 p-1 px-1.5 select-text">
                            {f.conversationIds.length === 0 ? (
                              <div className="p-2 text-center text-slate-400 text-[9px] italic">
                                Drag matters or drag folders inside settings panel to populate.
                              </div>
                            ) : (
                              f.conversationIds.map(chanId => {
                                const cItem = conversations.find(cl => cl.id === chanId);
                                if (!cItem) return null;
                                return (
                                  <button
                                    key={chanId}
                                    onClick={() => { setSelectedChannelId(chanId); setMobileView('chat'); }}
                                    className="w-full text-left p-1.5 rounded hover:bg-blue-50 font-medium truncate block select-none"
                                  >
                                    📁 {cItem.name}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Superadmin shortcut info button left panel footer */}
              <div className="p-4 border-t bg-white select-none text-xxs text-slate-400 flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 animate-pulse animate-duration-1000" />
                  <span className="font-mono text-[9px]">Firm-ID: Docket007</span>
                </div>
                <button 
                  onClick={() => {
                    const confirmLoad = window.confirm("Boot mock administrative system reset?");
                    if (confirmLoad) {
                      setMessages(MOCK_MESSAGES);
                      setNotices([
                        {
                          id: 'notice-renew',
                          senderId: 'usr-admin-demo',
                          title: 'COURTROOM FILINGS RENEWED COMPLIANCE',
                          content: 'Pleadings folders sealed by multi-tenant administrator Alex Rivera, Esq.',
                          acknowledgedBy: [],
                          createdAt: new Date().toISOString(),
                          requiresAllSignature: true
                        }
                      ]);
                      setMockAlertMessage("Database messages ledger flushed successfully.");
                      setTimeout(() => setMockAlertMessage(null), 5000);
                    }
                  }}
                  className="hover:underline hover:text-slate-700 text-[10px] font-black"
                >
                  Hard Reset
                </button>
              </div>

            </div>
          )}

          {/* =====================================================================
              CENTER PANEL (50% Width, cols-6): Real-time dialog active conversation
              ===================================================================== */}
          <div className={`${focusModeOn ? 'md:col-span-12' : isRightPanelOpen ? 'md:col-span-6' : 'md:col-span-9'} flex flex-col h-full pb-[72px] md:pb-0 overflow-hidden bg-white ${mobileView === 'chat' ? 'flex w-full animate-fade-in' : 'hidden md:flex'}`}>
            
            {/* Conversation sticky top-bar client-dossier badge info */}
            <div className="p-3 border-b border-slate-200/60 flex justify-between items-center bg-white z-10 shrink-0 select-none">
              <div className="flex items-center gap-2 text-left min-w-0">
                {/* Back button only on mobile */}
                <button 
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1 mr-0.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 border flex items-center justify-center font-bold text-xs">
                    {activeChannel.type === 'matter' ? '💼' : '🏢'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full ring-1 ring-white" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-800 tracking-tight truncate select-none">{activeChannel.name}</span>
                    {(activeChannel as any).isMuted && <BellOff className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium block mt-0.5 leading-none">
                    Active now
                  </span>
                </div>
              </div>

              {/* Sub-header interactive triggers */}
              <div className="flex items-center gap-1.5 select-none">
                <div className="hidden md:flex items-center gap-1">
                  <button
                    onClick={handleGenerateAISummary}
                    className="p-1.5 hover:bg-blue-50 text-blue-605 border border-blue-100 rounded-xl flex items-center gap-1 font-bold text-xxs cursor-pointer shrink-0 transition"
                    title="Generate dynamic AI brief"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    <span>AI Summary</span>
                  </button>

                  <button
                    onClick={() => setIsExportDialogOpen(true)}
                    className="p-1 px-1.5 border hover:bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center cursor-pointer shadow-xxs"
                    title="Export chat ledger cert"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setFocusModeOn(!focusModeOn)}
                    className={`p-1.5 border rounded-xl flex items-center justify-center cursor-pointer ${focusModeOn ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-slate-505 hover:text-slate-800'}`}
                    title="Toggle centered focus mode"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {!focusModeOn && (
                    <button
                      onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                      className={`hidden md:flex p-1.5 border rounded-xl items-center justify-center cursor-pointer ${isRightPanelOpen ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-slate-500'}`}
                      title="Toggle context panels sidebar"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => setShowCustomizePanel(!showCustomizePanel)}
                    className={`p-1.5 border rounded-xl flex items-center justify-center cursor-pointer ${showCustomizePanel ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-slate-500 hover:text-slate-800'}`}
                    title="Customize chat appearance"
                  >
                    <Palette className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* MATTER CONTEXT STRIP BAR — CLICKABLE STATS FOR TRIAL READY — Hidden on mobile */}
            {activeChannel.type === 'matter' && activeChannel.caseObj && (
              <div className="hidden md:flex bg-slate-50 border-b p-2 font-mono text-[9px] text-slate-500 select-none overflow-x-auto whitespace-nowrap items-center gap-3.5 shrink-0 select-none md:px-4">
                <span className="flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-blue-500" />
                  <span>Stage: <b>{activeChannel.caseObj.currentStage || 'Trial Prep'}</b></span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-500 hover:scale-110 cursor-pointer" />
                  <span>Next Hearing: <b>7 days</b></span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-cyan-600" />
                  <span>Lawyer: <b>Alex</b></span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="flex items-center gap-0.5" title="Firm budget tracker selection">
                  <span>Usage:</span>
                  <span className="font-extrabold text-blue-600 bg-blue-50 p-0.5 px-1.5 rounded">67% used</span>
                </span>
              </div>
            )}

            {/* LIVE AI GENERATED CHAT SUMMARY BLOCK */}
            {activeAISummary && (
              <div className="bg-blue-50/70 p-3.5 border-b border-blue-100 text-xxs text-blue-955 text-left relative animate-fade-in font-sans block select-text">
                <div className="flex justify-between items-center border-b border-blue-200/50 pb-1 mb-1.5">
                  <div className="flex items-center gap-1 text-[9px] font-black text-blue-650 uppercase tracking-widest leading-none">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Calculated Case brief insights</span>
                  </div>
                  <button onClick={() => setActiveAISummary(null)} className="p-0.5 hover:bg-blue-200/40 rounded text-blue-700 font-bold select-none cursor-pointer">Close</button>
                </div>
                <p className="leading-normal italic">"{activeAISummary}"</p>
              </div>
            )}

            {/* UNFINISHED SIGNATURE BULLETIN CRITICAL BANNER ALERTS — Hidden on mobile */}
            {notices.map(notice => (
              <div key={notice.id} className="hidden md:block bg-amber-50 border-b border-amber-200 p-3.5 text-xxs text-amber-955 text-left space-y-2 animate-fade-in font-sans select-text shrink-0">
                <div className="flex items-center gap-1 flex-wrap text-[8.5px] font-bold text-amber-801 uppercase tracking-wider leading-none">
                  <Landmark className="w-3.5 h-3.5 text-amber-600" />
                  <span>{notice.title}</span>
                </div>
                <p className="font-medium text-[10.5px] leading-relaxed text-slate-700">{notice.content}</p>

                <div className="flex justify-between items-center pt-2.5 border-t border-amber-200/50 select-none">
                  <span className="text-[8px] text-slate-400 font-mono">Published by Shara Lawson, Counsel</span>
                  {notice.acknowledgedBy.includes(currentUser.id) ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-black text-[9.5px]">
                      <CheckCheck className="w-4 h-4" />
                      <span>Ledger Verified</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setNotices(notices.map(n => {
                          if (n.id === notice.id) return { ...n, acknowledgedBy: [...n.acknowledgedBy, currentUser.id] };
                          return n;
                        }));
                      }}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] rounded-lg transition"
                    >
                      Acknowledge Signature
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* BROADCAST MESSAGE ACTIVATION CONTROLLER */}
            {isBroadcastMode && (
              <div className="bg-blue-600 text-white p-3.5 text-left text-xxs block leading-relaxed font-sans shrink-0 animate-fade-in select-none">
                <div className="flex justify-between items-center border-b border-white/20 pb-2 mb-2">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider">Broadcast Composition Campaign</span>
                  <button onClick={() => setIsBroadcastMode(false)} className="text-white hover:underline font-bold">Cancel</button>
                </div>
                <p className="text-white/80">
                  Target Selection: <b>{broadcastTargets.length} case streams selected</b>. Type announcement text in the input below and click broadcast.
                </p>
              </div>
            )}

            {/* SCROLLABLE MESSAGE STREAM */}
            <div className={`flex-1 overflow-y-auto px-4 py-3 ${CHAT_THEME_BG[chatTheme]}`} style={{ minHeight: 0 }}>
              {primaryMessagesOnly.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-3 select-none">
                  <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-slate-300" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-600">Stream is quiet</h5>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">No messages yet. Type below to start a secure conversation.</p>
                  </div>
                </div>
              ) : (
                <div className={`space-y-0 ${FONT_SIZE[chatFontSize]}`}>
                  {groupMsgsByDate(primaryMessagesOnly).map(group => (
                    <div key={group.key}>
                      {/* WhatsApp-style date separator */}
                      <div className="flex items-center gap-3 my-4 select-none">
                        <div className="flex-1 h-px bg-slate-200/60" />
                        <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">{group.label}</span>
                        <div className="flex-1 h-px bg-slate-200/60" />
                      </div>

                      {group.msgs.map((m: any) => {
                        const ruleMatch = checkRulesHighlight(m.message);
                        const isOwn = m.sentById === currentUser.id;
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 15, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                            className={`flex group relative ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${compactMode ? 'mb-1' : 'mb-3'} items-end gap-2`}
                            style={ruleMatch.hasMatch ? { backgroundColor: `${ruleMatch.color}08` } : {}}
                          >
                            {/* Avatar — other user only */}
                            {!isOwn && (
                              <div className="relative shrink-0 self-end mb-0.5">
                                <img
                                  src={m.senderAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${m.senderName||'W'}`}
                                  className="h-8 w-8 rounded-full object-cover border bg-slate-100 shadow-sm"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border-2 border-white" />
                              </div>
                            )}

                            {/* Bubble + meta */}
                            <div className={`flex flex-col gap-0.5 max-w-[72%] sm:max-w-[62%] ${isOwn ? 'items-end' : 'items-start'}`}>
                              {/* Sender name (others only) — Hidden on mobile direct message screen */}
                              {!isOwn && !compactMode && (
                                <div className="hidden md:flex items-center gap-1.5 px-1">
                                  <span className="text-[10px] font-extrabold text-slate-700">{m.senderName}</span>
                                  <span className="text-[7px] font-mono text-slate-400 uppercase bg-white border px-1 rounded">{m.senderRole}</span>
                                  {m.isOnRecord && <span className="text-[7px] bg-amber-100 border border-amber-200 text-amber-700 px-1 py-0.5 rounded font-bold animate-pulse">Ledger</span>}
                                </div>
                              )}

                              {/* Message bubble */}
                              <div
                                className={`relative px-4 py-2 rounded-2xl shadow-sm leading-relaxed select-text transition-all ${
                                  isOwn
                                    ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-br-sm shadow-md'
                                    : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200/50'
                                }`}
                                style={ruleMatch.hasMatch ? { boxShadow: `0 0 0 1.5px ${ruleMatch.color}60` } : {}}
                              >
                                {/* Message text with markdown */}
                                {m.message && (
                                  <p className="whitespace-pre-wrap break-words text-sm">
                                    {parseMessageContent(m.message, isOwn)}
                                  </p>
                                )}

                                {/* Attachments */}
                                {m.attachments && m.attachments.length > 0 && (
                                  <div className={`${m.message ? 'mt-2' : ''} flex flex-col gap-2`}>
                                    {m.attachments.map((att: {name:string;type:string;dataUrl:string}, idx: number) => (
                                      <button
                                        key={idx}
                                        onClick={() => setPreviewFile({url: att.dataUrl, name: att.name, type: att.type})}
                                        className={`text-left rounded-xl overflow-hidden transition hover:scale-[1.02] cursor-pointer ${isOwn ? 'bg-blue-500/30 hover:bg-blue-400/40' : 'bg-slate-200/50 hover:bg-slate-200'}`}
                                      >
                                        {att.type.startsWith('image/') ? (
                                          <img src={att.dataUrl} alt={att.name} className="max-w-[240px] max-h-[180px] w-full object-cover rounded-xl" />
                                        ) : att.type.startsWith('video/') ? (
                                          <div className="flex items-center gap-2 px-3 py-2.5">
                                            <div className={`p-2 rounded-lg ${isOwn?'bg-white/20':'bg-blue-105'}`}>
                                              <Video className={`w-4 h-4 ${isOwn?'text-white':'text-blue-600'}`} />
                                            </div>
                                            <div>
                                              <p className={`text-[10px] font-bold truncate max-w-[160px] ${isOwn?'text-white':'text-slate-700'}`}>{att.name}</p>
                                              <p className={`text-[8px] ${isOwn?'text-blue-200':'text-slate-400'}`}>Tap to play video</p>
                                            </div>
                                          </div>
                                        ) : att.type.startsWith('audio/') ? (
                                          <div className="flex items-center gap-2 px-3 py-2.5">
                                            <div className={`p-2 rounded-lg ${isOwn?'bg-white/20':'bg-purple-100'}`}>
                                              <FileAudio className={`w-4 h-4 ${isOwn?'text-white':'text-purple-600'}`} />
                                            </div>
                                            <div>
                                              <p className={`text-[10px] font-bold truncate max-w-[160px] ${isOwn?'text-white':'text-slate-700'}`}>{att.name}</p>
                                              <p className={`text-[8px] ${isOwn?'text-blue-200':'text-slate-400'}`}>Tap to play audio</p>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 px-3 py-2.5">
                                            <div className={`p-2 rounded-lg ${isOwn?'bg-white/20':'bg-blue-50'}`}>
                                              <FileText className={`w-4 h-4 ${isOwn?'text-white':'text-blue-600'}`} />
                                            </div>
                                            <div>
                                              <p className={`text-[10px] font-bold truncate max-w-[160px] ${isOwn?'text-white':'text-slate-700'}`}>{att.name}</p>
                                              <p className={`text-[8px] ${isOwn?'text-blue-200':'text-slate-400'}`}>Tap to preview</p>
                                            </div>
                                          </div>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Timestamp + read receipt */}
                                <div className={`flex items-center gap-1 mt-1.5 justify-end ${isOwn ? 'text-blue-100/90' : 'text-slate-405 text-slate-400'}`}>
                                  <span className="text-[8.5px] font-medium tracking-tight">
                                    {new Date(m.createdAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
                                  </span>
                                  {isOwn && (
                                    readMessageIds[m.id] || m.readBy?.length > 0 ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-sky-200 animate-scale-up" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-blue-200/60" />
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Reactions row */}
                              {m.reactions && Object.keys(m.reactions).some(k => (m.reactions[k] as string[]).length > 0) && (
                                <div className={`flex flex-wrap gap-1 px-1 select-none ${isOwn?'justify-end':''}`}>
                                  {Object.entries(m.reactions).map(([emoji, list]) => {
                                    const arr = list as string[];
                                    if (!arr.length) return null;
                                    return (
                                      <button key={emoji} onClick={() => executeToggleReaction(m.id, emoji)}
                                        className="px-2 py-0.5 border border-slate-200 rounded-full bg-white hover:bg-blue-50 text-[11px] flex items-center gap-1 shadow-sm transition hover:scale-110">
                                        {emoji} <span className="text-[8px] text-slate-500 font-mono">{arr.length}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Thread replies */}
                              {messages.filter(r => r.replyToId === m.id).length > 0 && (
                                <button onClick={() => setActiveThreadParent(m)}
                                  className={`flex items-center gap-1 text-[9px] font-bold px-1 cursor-pointer hover:underline ${isOwn?'text-blue-300':'text-blue-600'}`}>
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  {messages.filter(r => r.replyToId === m.id).length} replies
                                </button>
                              )}
                            </div>

                            {/* Hover action bar */}
                            <div className={`absolute ${isOwn?'left-1':'right-1'} top-0 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white border border-slate-200 rounded-2xl shadow-xl p-1 flex items-center gap-0.5 z-10 select-none`}>
                              {['👍','⚖️','🔥'].map(em => (
                                <button key={em} onClick={() => executeToggleReaction(m.id, em)}
                                  className="p-1.5 rounded-xl hover:bg-slate-100 text-sm transition hover:scale-125">{em}</button>
                              ))}
                              <div className="w-px h-4 bg-slate-200 mx-0.5" />
                              <button onClick={() => executeMarkMessageOnRecord(m.id)}
                                className={`p-1.5 rounded-xl transition ${m.isOnRecord?'text-amber-500 bg-amber-50':'text-slate-400 hover:bg-slate-100'}`}>
                                <Landmark className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setActiveThreadParent(m)}
                                className="p-1.5 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition">
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => executeToggleMessagePin(m.id)}
                                className={`p-1.5 rounded-xl transition ${m.isPinned?'text-blue-600 bg-blue-50':'text-slate-400 hover:bg-slate-100'}`}>
                                <Pin className="w-3.5 h-3.5 rotate-45" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Typing indicator */}
              {someoneTyping && (
                <div className="flex gap-2 items-center mt-2 animate-fade-in pl-1 select-none">
                  <div className="relative shrink-0">
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed=Jenny" className="h-6 w-6 rounded-full border bg-slate-100" />
                    <span className="absolute bottom-0 right-0 h-1.5 w-1.5 bg-emerald-400 rounded-full ring-1 ring-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-3 py-2 flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Jenny typing…</span>
                </div>
              )}

              <div ref={messageEndRef} className="h-2" />
            </div>

            {/* COMPOSER — Docked version (renders here when docked) */}
            {composerDocked && (
              <div className="md:border-t bg-white relative shrink-0 composer-dock-anim">
                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" multiple accept="*/*" className="hidden" onChange={handleFileSelect} />

                {/* Autocomplete picker */}
                {pickerType !== 'none' && (
                  <div className="absolute bottom-full left-3 right-3 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 max-h-[160px] overflow-y-auto mb-2 z-30 animate-fade-in">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider border-b pb-1.5 mb-2 select-none">
                      {pickerType==='mention'?'@ Mention':'# Case Reference'}
                    </div>
                    <div className="space-y-0.5">
                      {pickerType==='reference' ? cases.filter(c=>c.referenceNumber?.toLowerCase().includes(pickerFilter.toLowerCase())).map(cs=>(
                        <button key={cs.id} onClick={()=>handleApplyReference(cs)} className="w-full text-left p-2 text-xs hover:bg-blue-50 rounded-xl flex items-center gap-2 transition">
                          <div className="p-1 bg-blue-50 rounded-lg"><Briefcase className="w-3.5 h-3.5 text-blue-500"/></div>
                          <span className="font-bold text-slate-800">{cs.referenceNumber}</span>
                          <span className="text-[8px] bg-slate-100 rounded px-1.5 ml-auto">{cs.status}</span>
                        </button>
                      )) : activeUsersList.filter(u=>u.fullName.toLowerCase().includes(pickerFilter.toLowerCase())).map(u=>(
                        <button key={u.id} onClick={()=>handleApplyMention(u)} className="w-full text-left p-2 text-xs hover:bg-blue-50 rounded-xl flex items-center gap-2 transition">
                          <div className="relative shrink-0">
                            <img src={u.avatarUrl} className="w-6 h-6 rounded-full border"/>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${u.isOnline?'bg-emerald-400':'bg-slate-300'}`}/>
                          </div>
                          <span className="font-bold text-slate-800">{u.fullName}</span>
                          <span className="text-[7px] uppercase font-mono text-slate-400 ml-auto">{u.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emoji picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-3 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 mb-2 z-30 animate-scale-up">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2 select-none">Quick Insert</div>
                    <div className="flex flex-wrap gap-1 w-56">
                      {QUICK_EMOJIS.map(em=>(
                        <button key={em} onClick={()=>{setMsgText(p=>p+em);setShowEmojiPicker(false);}}
                          className="text-xl p-1.5 hover:bg-slate-100 rounded-xl transition-transform hover:scale-125 cursor-pointer">{em}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Floating format toolbar — appears on text selection */}
                {formatToolbar && (
                  <div className="fixed z-[9999] format-toolbar-anim" style={{left:formatToolbar.x, top:formatToolbar.y}}>
                    <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-1.5 flex items-center gap-0.5 border border-slate-700">
                      <button onClick={()=>applyFormat('bold')} className="px-2.5 py-1.5 rounded-xl hover:bg-slate-700 font-extrabold text-sm transition cursor-pointer">B</button>
                      <button onClick={()=>applyFormat('italic')} className="px-2.5 py-1.5 rounded-xl hover:bg-slate-700 italic text-sm transition cursor-pointer">I</button>
                      <button onClick={()=>applyFormat('code')} className="px-2.5 py-1.5 rounded-xl hover:bg-slate-700 font-mono text-xs text-emerald-400 transition cursor-pointer">{`<>`}</button>
                      <div className="w-px h-4 bg-slate-600 mx-0.5"/>
                      <button onClick={()=>applyFormat('link')} className="px-2.5 py-1.5 rounded-xl hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition cursor-pointer">Link</button>
                      <div className="w-px h-4 bg-slate-600 mx-0.5"/>
                      <button onClick={()=>applyFormat('delete')} className="px-2.5 py-1.5 rounded-xl hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold transition cursor-pointer">Del</button>
                      <button onClick={()=>setFormatToolbar(null)} className="px-1.5 py-1.5 rounded-xl hover:bg-slate-700 text-slate-400 text-xs transition cursor-pointer ml-0.5">✕</button>
                    </div>
                  </div>
                )}

                {/* Attached files preview */}
                {attachedFiles.length > 0 && (
                  <div className="flex gap-2 px-4 pt-3 flex-wrap">
                    {attachedFiles.map((file,idx)=>(
                      <div key={idx} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-2.5 py-1.5 text-[9px] font-bold shadow-sm">
                        {file.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(file)} className="w-8 h-8 rounded-lg object-cover cursor-pointer" onClick={()=>setPreviewFile({url:URL.createObjectURL(file),name:file.name,type:file.type})}/>
                        ) : file.type.startsWith('video/') ? (
                          <Video className="w-3.5 h-3.5 text-blue-500"/>
                        ) : file.type.startsWith('audio/') ? (
                          <FileAudio className="w-3.5 h-3.5 text-purple-500"/>
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-blue-500"/>
                        )}
                        <span className="truncate max-w-[100px]">{file.name}</span>
                        <button onClick={()=>setAttachedFiles(p=>p.filter((_,i)=>i!==idx))} className="text-blue-300 hover:text-rose-500 transition cursor-pointer">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Main input row — Instagram-style seamless floating pill */}
                {/* 1. Mobile-only input row (Stretched seamless oval covering everything) */}
                <div className="md:hidden px-3.5 pb-4 pt-1 bg-transparent select-none shrink-0 border-0">
                  <div className="w-full bg-slate-100 border border-slate-200/40 rounded-full px-2 py-1 flex items-center gap-1 transition-all duration-300 shadow-sm">
                    {!(msgText.trim().length > 0 || attachedFiles.length > 0) ? (
                      <>
                        {/* Empty/Default state on mobile */}
                        {/* Attach button inside pill */}
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 hover:bg-slate-200 text-slate-500 hover:text-blue-600 rounded-full cursor-pointer transition shrink-0" 
                          title="Attach file"
                        >
                          <Paperclip className="w-4.5 h-4.5" />
                        </button>

                        {/* Emoji button inside pill */}
                        <button 
                          onClick={() => { setShowEmojiPicker(!showEmojiPicker); setFormatToolbar(null); }}
                          className={`p-2 hover:bg-slate-200 rounded-full cursor-pointer transition shrink-0 ${showEmojiPicker ? 'text-blue-600' : 'text-slate-500'}`} 
                          title="Emoji"
                        >
                          <Smile className="w-4.5 h-4.5" />
                        </button>
                      </>
                    ) : (
                      /* Sleek blue/indigo circular file attachment button */
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center rounded-full shrink-0 shadow-sm active:scale-90 transition-all cursor-pointer"
                        title="Attach file"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    )}

                    {/* Single unified stable textarea to prevent unmounting and keyboard dismissal glitch */}
                    <textarea
                      ref={mainInputRef}
                      value={msgText}
                      onChange={e => { setMsgText(e.target.value); setShowEmojiPicker(false); }}
                      onSelect={handleTextareaSelect}
                      onMouseUp={handleTextareaSelect}
                      onClick={() => { setFormatToolbar(null); setShowEmojiPicker(false); }}
                      placeholder="Message…"
                      className="flex-grow flex-1 text-base bg-transparent !border-0 !border-none !outline-none !ring-0 focus:!ring-0 focus:!border-0 focus:!outline-none resize-none py-1.5 px-1.5 max-h-[80px] min-h-[32px] text-slate-800 leading-normal placeholder:text-slate-400"
                      style={{ caretColor: '#3b82f6', border: 'none', outline: 'none', boxShadow: 'none' }}
                      rows={1}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { 
                          e.preventDefault(); 
                          isBroadcastMode ? handleTriggerBroadcastSend() : handleSendChatWithFiles(); 
                        }
                        if (e.key === 'Escape') { setFormatToolbar(null); setShowEmojiPicker(false); }
                      }}
                    />

                    {!(msgText.trim().length > 0 || attachedFiles.length > 0) ? (
                      /* Dictation inside pill */
                      <button 
                        onClick={handleToggleDictation}
                        className={`p-2 hover:bg-slate-200 rounded-full cursor-pointer transition shrink-0 ${isDictating ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} 
                        title="Dictate"
                      >
                        <Mic className="w-4.5 h-4.5" />
                      </button>
                    ) : (
                      /* Beautiful blue/indigo circular send button inside the pill on the right */
                      <button
                        onClick={isBroadcastMode ? handleTriggerBroadcastSend : handleSendChatWithFiles}
                        className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center rounded-full shrink-0 shadow-sm active:scale-90 transition-all cursor-pointer"
                        title="Send message"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Desktop-only input row (Classic full-width layout with dividing border-t) */}
                <div className="hidden md:block px-3 pb-3 pt-2 bg-white select-none shrink-0 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {/* Attach Trigger */}
                    <button onClick={()=>fileInputRef.current?.click()}
                      className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400 hover:text-blue-600 transition shrink-0" title="Attach file">
                      <Paperclip className="w-5 h-5"/>
                    </button>

                    {/* Instagram-style Input Pill */}
                    <div className="flex-1 flex items-center bg-slate-100 rounded-full px-3.5 py-1.5 transition-all duration-200">
                      <button onClick={()=>{setShowEmojiPicker(!showEmojiPicker);setFormatToolbar(null);}}
                        className={`p-1 hover:bg-slate-200 rounded-full cursor-pointer transition shrink-0 ${showEmojiPicker?'text-blue-600':'text-slate-400'}`} title="Emoji">
                        <Smile className="w-4.5 h-4.5"/>
                      </button>

                      <textarea
                        ref={mainInputRef}
                        value={msgText}
                        onChange={e=>{setMsgText(e.target.value);setShowEmojiPicker(false);}}
                        onSelect={handleTextareaSelect}
                        onMouseUp={handleTextareaSelect}
                        onClick={()=>{setFormatToolbar(null);setShowEmojiPicker(false);}}
                        placeholder="Message…"
                        className="flex-grow flex-1 text-base bg-transparent !border-0 !border-none !outline-none !ring-0 focus:!ring-0 focus:!border-0 focus:!outline-none resize-none py-1 px-2 max-h-[100px] min-h-[32px] text-slate-800 leading-normal placeholder:text-slate-400"
                        style={{caretColor:'#3b82f6', border:'none', outline:'none', boxShadow:'none'}}
                        rows={1}
                        onKeyDown={e=>{
                          if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();isBroadcastMode?handleTriggerBroadcastSend():handleSendChatWithFiles();}
                          if (e.key==='Escape'){setFormatToolbar(null);setShowEmojiPicker(false);}
                        }}
                      />

                      {/* Dictation inside pill for desktop */}
                      <button onClick={handleToggleDictation}
                        className={`p-1 hover:bg-slate-200 rounded-full cursor-pointer transition shrink-0 ${isDictating?'text-rose-500 animate-pulse':'text-slate-400'}`} title="Dictate">
                        <Mic className="w-4 h-4"/>
                      </button>
                    </div>

                    {/* Send Action */}
                    <div className="shrink-0 flex items-center px-1">
                      <button
                        onClick={isBroadcastMode?handleTriggerBroadcastSend:handleSendChatWithFiles}
                        disabled={!msgText.trim()&&attachedFiles.length===0}
                        className="p-2 bg-blue-600 hover:bg-blue-700 active:scale-90 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md shadow-blue-200/60 disabled:opacity-40 transition-all duration-200"
                      >
                        <Send className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customize Panel */}
                {showCustomizePanel && (
                  <div className="absolute bottom-full right-3 mb-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-40 w-72 animate-scale-up">
                    <div className="flex justify-between items-center mb-3 select-none">
                      <span className="font-black text-xs text-slate-800">Chat Preferences</span>
                      <button onClick={()=>setShowCustomizePanel(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 hover:bg-slate-100 rounded-lg">✕</button>
                    </div>
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-2">Theme</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {([
                            {id:'default',label:'Default',cls:'bg-white'},
                            {id:'dark',label:'Dark',cls:'bg-slate-900'},
                            {id:'warm',label:'Warm',cls:'bg-amber-50'},
                            {id:'legal',label:'Legal',cls:'bg-emerald-50'}
                          ] as const).map(t=>(
                            <button key={t.id} onClick={()=>setChatTheme(t.id)}
                              className={`h-10 ${t.cls} border-2 rounded-xl cursor-pointer transition hover:scale-105 ${chatTheme===t.id?'border-blue-500 shadow-md':'border-slate-200'}`} title={t.label}/>
                          ))}
                        </div>
                        <div className="flex justify-between text-[8px] text-slate-400 mt-1 px-0.5 select-none">
                          {['Default','Dark','Warm','Legal'].map(l=><span key={l}>{l}</span>)}
                        </div>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-2">Text Size</span>
                        <div className="flex gap-2">
                          {([{id:'sm',l:'Small'},{id:'base',l:'Default'},{id:'lg',l:'Large'}] as const).map(s=>(
                            <button key={s.id} onClick={()=>setChatFontSize(s.id)}
                              className={`flex-1 py-1.5 rounded-xl border font-bold cursor-pointer transition text-[9px] ${chatFontSize===s.id?'bg-blue-600 border-blue-600 text-white':'border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                              {s.l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-2">Layout</span>
                        <div className="space-y-2">
                          {[{label:'Compact messages',val:compactMode,set:setCompactMode}].map(opt=>(
                            <div key={opt.label} className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-600">{opt.label}</span>
                              <button onClick={()=>opt.set(!opt.val)}
                                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${opt.val?'bg-blue-600':'bg-slate-200'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${opt.val?'translate-x-4':'translate-x-0.5'}`}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>

          {/* =====================================================================
              RIGHT PANEL (25% Width, cols-3): Collapsible details context matrix
              ===================================================================== */}
          {!focusModeOn && isRightPanelOpen && (
            <div className="hidden md:flex md:col-span-3 border-l bg-slate-50/20 flex-col h-full overflow-hidden shrink-0 animate-fade-in text-left">
              
              {/* Toolbar tabs right side header */}
              <div className="p-3 bg-white border-b flex justify-between items-center select-none">
                <div className="flex items-center gap-1.5 text-xs text-slate-805 font-black uppercase tracking-wider">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Dossier Matrix</span>
                </div>
                <button onClick={() => setIsRightPanelOpen(false)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer">✕</button>
              </div>

              {/* In-sidebar tab selectors */}
              <div className="flex border-b bg-white text-[9.5px] font-black uppercase select-none overflow-x-auto no-scrollbar">
                {(['details', 'members', 'files', 'pinned', 'on_record', 'search'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setRightPanelTab(tab); }}
                    className={`p-2 flex-1 text-center transition cursor-pointer border-b-2 leading-none whitespace-nowrap px-3 ${rightPanelTab === tab ? 'border-blue-600 text-blue-700 font-extrabold bg-blue-50/10' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
                  >
                    {tab === 'on_record' ? 'Ledger' : tab}
                  </button>
                ))}
              </div>

              {/* Scrollable container view selected tab content */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
                
                {/* Tab 1: Details of channel */}
                {rightPanelTab === 'details' && (
                  <div className="space-y-4 text-xxs">
                    <div className="p-3 bg-white border rounded-2xl select-text space-y-2">
                      <span className="text-[7.5px] font-mono tracking-widest text-blue-650 block uppercase font-bold select-none">Room identifier</span>
                      <h4 className="font-extrabold text-[11px] text-slate-800 leading-tight">{activeChannel.name}</h4>
                      <p className="text-slate-400 font-sans leading-normal">
                        All communications are stored securely and encrypted in transit. Legal records are marked automatically.
                      </p>
                      
                      <div className="pt-2 border-t border-dashed text-slate-410 flex justify-between select-none font-mono">
                        <span>Total Exchanges:</span>
                        <span className="font-black text-blue-755">{primaryMessagesOnly.length} packets</span>
                      </div>
                    </div>

                    {activeChannel.type === 'matter' && activeChannel.caseObj && (
                      <div className="space-y-2 text-xxs select-text text-slate-655 font-sans">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block select-none">Associated Matter Ledger</span>
                        <div className="p-3 bg-white border rounded-2xl space-y-2">
                          <div>
                            <span className="text-slate-400 font-mono text-[7px] block uppercase leading-none">Representative Client</span>
                            <span className="font-extrabold text-xs block text-slate-800 mt-1">{activeChannel.clientObj?.fullName || 'General Case File'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-mono text-[7px] block uppercase leading-none border-t pt-1.5 mt-1.5">Lead Counsel Attorney</span>
                            <span className="font-extrabold block text-slate-800 mt-1">{activeChannel.caseObj.assignedLawyerId || 'Alex Rivera, Esq.'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Attorneys and members roster */}
                {rightPanelTab === 'members' && (
                  <div className="space-y-2.5 text-xxs">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block select-none">Active roster ({activeUsersList.length})</span>
                    
                    <div className="space-y-1">
                      {activeUsersList.map(u => (
                        <div 
                          key={u.id}
                          onClick={() => setSelectedUserProfile(u)}
                          className="p-2 bg-white border hover:bg-slate-50 transition rounded-xl flex items-center justify-between gap-2.5 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={u.avatarUrl} className="w-5.5 h-5.5 rounded-full" />
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-800 block leading-tight truncate">{u.fullName}</span>
                              <span className="text-[7.5px] text-slate-400 font-mono uppercase block mt-0.5 leading-none">{u.role}</span>
                            </div>
                          </div>
                          <span className={`h-2 w-2 rounded-full block shrink-0 ${u.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350 bg-slate-300'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: Encrypted Files Vault */}
                {rightPanelTab === 'files' && (
                  <div className="space-y-3.5 text-xxs">
                    <div className="flex justify-between items-center select-none">
                      <span className="text-[8px] font-black text-blue-650 uppercase tracking-widest">DRIVE SECURE FILE INGRESS</span>
                      <div className="flex bg-slate-105 rounded p-0.5 font-bold text-[7px]">
                        {(['all', 'word', 'pdf', 'image'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setIsFilesFilterType(type)}
                            className={`px-1 rounded uppercase ${isFilesFilterType === type ? 'bg-white text-blue-600 font-extrabold shadow-xxs' : 'text-slate-400 hover:text-slate-700'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {messages.map(m => {
                        const isAttach = m.message.includes('[ATTACHMENT:');
                        if (!isAttach) return null;
                        const match = m.message.match(/\[ATTACHMENT:\s*(.*?)\s*\]/);
                        const fileName = match ? match[1] : 'DocumentPleading.pdf';

                        return (
                          <div key={m.id} className="p-2 border rounded-xl bg-white flex items-center justify-between gap-1.5 transition hover:bg-slate-50">
                            <div className="flex items-center gap-1.5 min-w-0 text-left">
                              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 truncate block text-[9.5px] leading-tight select-text">{fileName}</span>
                                <span className="text-[7.5px] font-mono text-slate-400 block block mt-0.5">By {m.senderName || 'Attorney'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setMockAlertMessage(`Simulating file download of: "${fileName}" for legal docket archive.`);
                                setTimeout(() => setMockAlertMessage(null), 5000);
                              }}
                              className="p-1 rounded bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border text-slate-405 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}

                      {messages.filter(m => m.message.includes('[ATTACHMENT:')).length === 0 && (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center italic text-slate-400 text-xxs bg-slate-50 select-none">
                          No drive document attachments uploaded to this stream yet. UsePaperclip above to attach draft photos.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 4: Pinned messages */}
                {rightPanelTab === 'pinned' && (
                  <div className="space-y-2.5 text-xxs text-left text-slate-705">
                    <span className="text-[8px] font-black text-slate-400 block uppercase tracking-widest select-none font-bold">Pinned communications</span>
                    
                    <div className="space-y-1.5 select-text">
                      {messages.filter(m => m.isPinned && (m.caseId === activeChannel.id || (activeChannel.id === 'firm-general' && !m.caseId))).map(pm => (
                        <div key={pm.id} className="p-3 border rounded-xl bg-blue-50/15 leading-relaxed bg-white space-y-1.5">
                          <p className="italic font-serif">"{pm.message}"</p>
                          <div className="flex justify-between items-center text-[7.5px] border-t pt-1.5 select-none font-mono text-slate-400">
                            <span>By {pm.senderName}</span>
                            <button 
                              onClick={() => executeToggleMessagePin(pm.id)} 
                              className="text-blue-600 hover:underline font-black"
                            >
                              Unpin
                            </button>
                          </div>
                        </div>
                      ))}

                      {messages.filter(m => m.isPinned && (m.caseId === activeChannel.id || (activeChannel.id === 'firm-general' && !m.caseId))).length === 0 && (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center italic text-slate-400 text-xxs bg-slate-50 select-none">
                          No messages pinned in this case. Use hover menu on message balloons to pin them.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 5: Ledger On-Record Court Logs */}
                {rightPanelTab === 'on_record' && (
                  <div className="space-y-2.5 text-xxs leading-relaxed font-sans select-text text-left">
                    <div className="flex justify-between items-center select-none">
                      <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest font-bold block">Trial ready record ledger logs</span>
                      <span className="bg-amber-100 text-amber-800 text-[8px] rounded px-1 animate-pulse">Live sync</span>
                    </div>

                    <div className="space-y-1.5 select-text">
                      {primaryMessagesOnly.filter(m => m.isOnRecord).map(om => (
                        <div key={om.id} className="p-3 border border-amber-200 rounded-xl bg-amber-50/10 leading-snug space-y-2">
                          <p className="italic text-slate-700">"{om.message}"</p>
                          <div className="flex justify-between items-center text-[7.5px] border-t border-amber-200 pt-1.5 select-none font-mono text-amber-900">
                            <span>Logger: {om.senderName}</span>
                            <span>{new Date(om.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}

                      {primaryMessagesOnly.filter(m => m.isOnRecord).length === 0 && (
                        <div className="p-4 rounded-xl border border-dashed border-amber-100 text-center italic text-slate-400 text-xxs bg-amber-50/5 select-none">
                          No records synced. Select the trial balance log button above any message balloon to sync it safely to the trial record list.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 6: Deep context Search */}
                {rightPanelTab === 'search' && (
                  <div className="space-y-3.5 text-xxs text-left font-sans text-slate-650">
                    <div className="space-y-1 bg-white p-2.5 border rounded-xl select-none shadow-xxs">
                      <span className="text-[8.5px] font-black text-slate-455 tracking-wider block uppercase mb-1">Room text lookup finder</span>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search keyword logs..."
                          value={rightSearchQuery}
                          onChange={e => setRightSearchQuery(e.target.value)}
                          className="w-full text-xxs p-2 pl-7 border bg-slate-50 focus:bg-white rounded-lg outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      {rightSearchQuery.trim() ? (
                        primaryMessagesOnly.filter(m => m.message.toLowerCase().includes(rightSearchQuery.toLowerCase())).map(sm => (
                          <div key={sm.id} className="p-2 border rounded-xl bg-white select-text space-y-1 leading-normal">
                            <div className="flex justify-between text-[7px] font-mono text-slate-400 border-b pb-0.5">
                              <span className="font-bold">{sm.senderName}</span>
                              <span>{new Date(sm.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-600 font-serif leading-tight">"{sm.message}"</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center italic text-slate-400 text-xxs bg-slate-50 border border-dashed rounded-xl select-none">
                          Type search string to lookup phrases and occurrences.
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* =====================================================================
              REPLY SLIDE-IN THREAD DRAWER (Slide-in)
              ===================================================================== */}
          {activeThreadParent && (
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l shadow-2xl z-30 flex flex-col overflow-hidden text-left animate-slide-left">
              <div className="p-3.5 bg-slate-50 border-b flex justify-between items-center select-none">
                <div className="flex items-center gap-1.5 text-xs text-blue-705 font-bold uppercase tracking-wider">
                  <MessageCircle className="w-4 h-4 text-blue-650" />
                  <span>Stream Reply Forum</span>
                </div>
                <button onClick={() => { setActiveThreadParent(null); setThreadText(''); }} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">✕</button>
              </div>

              {/* Master message context */}
              <div className="p-4 border-b bg-blue-50/10 space-y-2 text-xxs">
                <div className="flex justify-between text-[7px] font-mono uppercase text-slate-400 leading-none">
                  <span className="font-bold">{activeThreadParent.senderName}</span>
                  <span>Master thread</span>
                </div>
                <p className="font-serif leading-relaxed text-slate-700">"{activeThreadParent.message}"</p>
              </div>

              {/* Answers block list */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {messages.filter(re => re.replyToId === activeThreadParent.id).length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xxs italic bg-slate-50 rounded-xl select-none">
                    No comments filed. Reply directly in the input below.
                  </div>
                ) : (
                  messages.filter(re => re.replyToId === activeThreadParent.id).map(reply => (
                    <div key={reply.id} className="p-2.5 border rounded-xl bg-slate-50 flex flex-col gap-0.5 text-xxs leading-relaxed font-sans select-text">
                      <div className="flex justify-between items-baseline text-[7px] font-mono text-slate-415">
                        <span className="font-extrabold">{reply.senderName}</span>
                        <span>{new Date(reply.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <p className="mt-1 text-slate-600 block">{reply.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Composition footer thread */}
              <div className="p-2 border-t bg-white flex gap-1.5 items-center select-none shrink-0">
                <input
                  type="text"
                  placeholder="Insert reply content..."
                  value={threadText}
                  onChange={e => setThreadText(e.target.value)}
                  className="flex-grow text-xxs p-2 border bg-slate-50 rounded-lg outline-none focus:bg-white focus:border-transparent focus:ring-0"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handlePostReply();
                  }}
                />
                <button
                  onClick={handlePostReply}
                  disabled={!threadText.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* FILE PREVIEW LIGHTBOX — image, video, audio, pdf, docs */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9998] p-4 animate-fade-in"
          onClick={()=>setPreviewFile(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col animate-scale-up"
            onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b select-none shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 shrink-0"/>
                <span className="font-bold text-sm text-slate-800 truncate">{previewFile.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={previewFile.url} download={previewFile.name}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-blue-700 transition cursor-pointer"
                  onClick={e=>e.stopPropagation()}>
                  <Download className="w-3.5 h-3.5"/> Download
                </a>
                <button onClick={()=>setPreviewFile(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 cursor-pointer transition">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50 min-h-[300px]">
              {previewFile.type.startsWith('image/') ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-lg"/>
              ) : previewFile.type.startsWith('video/') ? (
                <video src={previewFile.url} controls autoPlay className="max-w-full max-h-[65vh] rounded-2xl mx-auto block shadow-xl"/>
              ) : previewFile.type.startsWith('audio/') ? (
                <div className="text-center space-y-5 p-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
                    <FileAudio className="w-12 h-12 text-white"/>
                  </div>
                  <p className="font-bold text-slate-700 text-sm">{previewFile.name}</p>
                  <audio src={previewFile.url} controls autoPlay className="w-full max-w-sm mx-auto"/>
                </div>
              ) : previewFile.type === 'application/pdf' ? (
                <iframe src={previewFile.url} className="w-full h-[70vh] rounded-xl border-0" title={previewFile.name}/>
              ) : (
                <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                    <FileText className="w-10 h-10 text-white"/>
                  </div>
                  <p className="font-bold text-slate-700">{previewFile.name}</p>
                  <p className="text-xs text-slate-400">Preview not available — download to open.</p>
                  <a href={previewFile.url} download={previewFile.name}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition cursor-pointer shadow-md">
                    <Download className="w-4 h-4"/> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DIALOGS ORCHESTRATION LAYOUT POPUPS
          ===================================================================== */}
      
      {/* 1. ARCHIVE EXPORT DIALOG */}
      {isExportDialogOpen && (
        <ExportChatDialog 
          onClose={() => setIsExportDialogOpen(false)}
          conversationName={activeChannel.name}
        />
      )}

      {/* 2. ALERTS CONFIG DIALOG */}
      {isAlertsConfigOpen && (
        <KeywordAlertsConfig 
          onClose={() => setIsAlertsConfigOpen(false)}
          rules={alertRules}
          onAddRule={(r) => setAlertRules([...alertRules, { id: `rule-${Date.now()}`, ...r }])}
          onDeleteRule={(id) => setAlertRules(alertRules.filter(r => r.id !== id))}
        />
      )}

      {/* 3. NOTIFICATIONS DIALOG */}
      {isNotificationSetupOpen && (
        <NotificationSetupDialog 
          onClose={() => setIsNotificationSetupOpen(false)}
        />
      )}

      {/* 4. BULLETIN COMPOSER DIALOG */}
      {isNoticeComposerOpen && (
        <LegalNoticeComposerDialog 
          onClose={() => setIsNoticeComposerOpen(false)}
          onPostNotice={(ntitle, ncontent, signOnly) => {
            const draftNotice: LegalNotice = {
              id: `notice-${Date.now()}`,
              senderId: currentUser.id,
              title: ntitle,
              content: ncontent,
              acknowledgedBy: [],
              createdAt: new Date().toISOString(),
              requiresAllSignature: signOnly
            };
            setNotices([...notices, draftNotice]);
            setMockAlertMessage(`BULLETIN POSTED: "${ntitle}" published to global roster list.`);
          }}
        />
      )}

      {/* 5. USER PROFILE SHEET POPUP */}
      {selectedUserProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none font-sans">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            
            <div className="flex justify-end select-none">
              <button onClick={() => setSelectedUserProfile(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 select-none">
              <img 
                src={selectedUserProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUserProfile.fullName}`} 
                className="w-14 h-14 rounded-full border border-blue-200 bg-slate-50 object-cover shadow-sm"
              />
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm leading-none">{selectedUserProfile.fullName}</h4>
                <span className="bg-blue-50 text-blue-755 px-2 py-0.5 mt-1 rounded font-mono text-[8px] font-black uppercase tracking-widest inline-block">
                  {selectedUserProfile.role}
                </span>
                {selectedUserProfile.tagline && (
                  <p className="text-[10px] text-slate-400 mt-1 italic font-serif">"{selectedUserProfile.tagline}"</p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 border rounded-2xl space-y-2.5 text-xxs text-left text-slate-600 select-text leading-tight font-mono">
              <div>
                <span className="text-slate-400 font-mono text-[7.5px] uppercase block">Email access</span>
                <span className="font-extrabold text-slate-755 truncate block mt-0.5">{selectedUserProfile.email || `${selectedUserProfile.fullName.toLowerCase().replace(' ', '')}@docket.legal`}</span>
              </div>

              <div>
                <span className="text-slate-400 font-mono text-[7.5px] uppercase block">Desks Routing Status</span>
                <span className="font-bold text-slate-755 block mt-0.5">{selectedUserProfile.isOnline ? 'Online (Synclink-1)' : 'Offline (Snooze alert redirect enabled)'}</span>
              </div>
            </div>

            <div className="pt-1 select-none">
              <button onClick={() => setSelectedUserProfile(null)} className="w-full py-2 bg-blue-650 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer">
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
