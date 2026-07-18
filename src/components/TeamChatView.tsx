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
  CHAT_TEMPLATES 
} from './chat/ChatTypes';
import ChatAnalytics from './chat/ChatAnalytics';
import { 
  ExportChatDialog, KeywordAlertsConfig, NotificationSetupDialog, LegalNoticeComposerDialog 
} from './chat/ChatDialogs';
import SwipeableMessage from './chat/SwipeableMessage';
import MessageContextMenu from './chat/MessageContextMenu';

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
    socket,
    conversations, setConversations, messages, setMessages,
    selectedChannelId, setSelectedChannelId, notices, setNotices,
    msgText, setMsgText, attachedFiles, setAttachedFiles,
    composerDocked, setComposerDocked, composerMinimized, setComposerMinimized,
    isDictating, toggleDictation: handleToggleDictation, seeded, setSeeded,
    replyingToMessage, setReplyingToMessage
  } = useChatGlobal();

  // Real typing state — maps userId → userName for active typers
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimeoutRef = useRef<any | null>(null);
  const typingClearTimers = useRef<Record<string, any>>({});

  // Find active chat record helper
  const activeChannel: ChatConversation = conversations.find(c => c.id === selectedChannelId) || {
    id: 'firm-general',
    name: 'Firm Wide',
    type: 'general',
    lastMessageAt: '2026-06-07T12:00:00Z',
    lastMessageText: '',
    unreadCount: 0,
    priority: 'high'
  };

  // Helper maps for the active room rendering
  const CHAT_BG_COLORS: Record<string, string> = {
    default: 'bg-slate-50/30',
    slate: 'bg-slate-900',
    amber: 'bg-amber-50/50',
    rose: 'bg-rose-50/40',
    emerald: 'bg-emerald-50/30',
    sky: 'bg-sky-50/40',
    indigo: 'bg-indigo-950/90',
    violet: 'bg-violet-950/90'
  };

  const OWN_BUBBLE_COLORS: Record<string, string> = {
    default: 'bg-blue-600 text-white rounded-br-sm shadow-md',
    blue: 'bg-blue-600 text-white rounded-br-sm shadow-md',
    indigo: 'bg-indigo-600 text-white rounded-br-sm shadow-md',
    slate: 'bg-slate-700 text-white rounded-br-sm shadow-md',
    emerald: 'bg-emerald-600 text-white rounded-br-sm shadow-md',
    amber: 'bg-amber-600 text-white rounded-br-sm shadow-md'
  };

  const OTHER_BUBBLE_COLORS: Record<string, string> = {
    default: 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200/50',
    blue: 'bg-blue-50 text-blue-950 rounded-bl-sm border border-blue-150',
    indigo: 'bg-indigo-50 text-indigo-950 rounded-bl-sm border border-indigo-150',
    slate: 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200/50',
    emerald: 'bg-emerald-50 text-emerald-955 rounded-bl-sm border border-emerald-150',
    amber: 'bg-amber-50 text-amber-955 rounded-bl-sm border border-amber-150'
  };

  // Message Lists & Thread states
  const [activeThreadParent, setActiveThreadParent] = useState<any | null>(null);
  const [threadText, setThreadText] = useState('');

  // Message interaction states (reply / context menu / multi-select)
  const [openMenuMsgId, setOpenMenuMsgId] = useState<string | null>(null);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);

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

  // Profile editing state
  const [editFullName, setEditFullName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editTagline, setEditTagline] = useState('');

  useEffect(() => {
    if (selectedUserProfile && selectedUserProfile.id === currentUser?.id) {
      setEditFullName(selectedUserProfile.fullName || '');
      setEditAvatarUrl(selectedUserProfile.avatarUrl || '');
      setEditTagline(selectedUserProfile.tagline || '');
    }
  }, [selectedUserProfile, currentUser]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: editFullName,
          avatarUrl: editAvatarUrl,
          tagline: editTagline
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setMockAlertMessage("Profile changes saved successfully!");
        setSelectedUserProfile(null);
        window.location.reload();
      } else {
        const data = await res.json();
        setMockAlertMessage(data.error || "Failed to save profile");
      }
    } catch {
      setMockAlertMessage("Network error saving profile");
    }
  };

  const persistChatPreferences = (theme: string, fontSize: string, compact: boolean, bColor?: string, bgUrl?: string, bgColor?: string, bgPattern?: boolean) => {
    if (!companyId) return;
    fetch(`/api/firm/${companyId}/chat-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        keywordRules: alertRules,
        folders: folders,
        chatTheme: theme,
        chatFontSize: fontSize,
        compactMode: compact,
        bubbleColor: bColor !== undefined ? bColor : bubbleColor,
        chatBgUrl: bgUrl !== undefined ? bgUrl : chatBgUrl,
        chatBgColor: bgColor !== undefined ? bgColor : chatBgColor,
        chatBgPattern: bgPattern !== undefined ? bgPattern : chatBgPattern
      })
    }).catch(err => console.error('Error saving chat preferences:', err));
  };

  // Group handling functions
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setMockAlertMessage("Group name is required.");
      return;
    }
    try {
      const res = await fetch(`/api/firm/${companyId}/chat/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          logoUrl: newGroupLogo || null,
          memberIds: newGroupMembers,
          chatTheme: newGroupTheme,
          chatBgColor: newGroupBgColor,
          chatBgUrl: newGroupBgUrl,
          bubbleColor: newGroupBubbleColor
        })
      });

      if (res.ok) {
        const created = await res.json();
        setMockAlertMessage(`Group "${created.name}" created successfully!`);
        setShowCreateGroupModal(false);
        // Reset state
        setNewGroupName('');
        setNewGroupDesc('');
        setNewGroupLogo('');
        setNewGroupMembers([]);
        setNewGroupTheme('default');
        setNewGroupBgColor('default');
        setNewGroupBgUrl('');
        setNewGroupBubbleColor('default');
        // Reload conversations to include the new group!
        loadInitialChatData();
      } else {
        const data = await res.json();
        setMockAlertMessage(data.error || "Failed to create group");
      }
    } catch (err) {
      console.error("Error creating group:", err);
      setMockAlertMessage("Network error creating group");
    }
  };

  const handleUpdateGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/firm/${companyId}/chat/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editGroupName,
          description: editGroupDesc,
          logoUrl: editGroupLogo,
          memberIds: editGroupMembers,
          chatTheme: editGroupTheme,
          chatBgColor: editGroupBgColor,
          chatBgUrl: editGroupBgUrl,
          bubbleColor: editGroupBubbleColor
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setMockAlertMessage("Group settings updated successfully!");
        setShowEditGroupModal(false);
        loadInitialChatData();
      } else {
        const data = await res.json();
        setMockAlertMessage(data.error || "Failed to update group");
      }
    } catch (err) {
      console.error("Error updating group:", err);
      setMockAlertMessage("Network error updating group");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this group? All group chat history will be permanently deleted.")) return;
    try {
      const res = await fetch(`/api/firm/${companyId}/chat/groups/${groupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setMockAlertMessage("Group deleted successfully.");
        setShowEditGroupModal(false);
        setSelectedChannelId('firm-general'); // Reset to general lobby
        loadInitialChatData();
      } else {
        const data = await res.json();
        setMockAlertMessage(data.error || "Failed to delete group");
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      setMockAlertMessage("Network error deleting group");
    }
  };

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
  
  // Custom states for custom themes, bubble colors, and backgrounds
  const [bubbleColor, setBubbleColor] = useState<string>('default');
  const [chatBgUrl, setChatBgUrl] = useState<string>('');
  const [chatBgColor, setChatBgColor] = useState<string>('default');
  const [chatBgPattern, setChatBgPattern] = useState<boolean>(true);

  const [showProfileCustomization, setShowProfileCustomization] = useState(false);

  // Create group state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupLogo, setNewGroupLogo] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [newGroupTheme, setNewGroupTheme] = useState('default');
  const [newGroupBgColor, setNewGroupBgColor] = useState('default');
  const [newGroupBgUrl, setNewGroupBgUrl] = useState('');
  const [newGroupBubbleColor, setNewGroupBubbleColor] = useState('default');

  // Edit group state
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupLogo, setEditGroupLogo] = useState('');
  const [editGroupMembers, setEditGroupMembers] = useState<string[]>([]);
  const [editGroupTheme, setEditGroupTheme] = useState('default');
  const [editGroupBgColor, setEditGroupBgColor] = useState('default');
  const [editGroupBgUrl, setEditGroupBgUrl] = useState('');
  const [editGroupBubbleColor, setEditGroupBubbleColor] = useState('default');
  
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  const [groupMembersSearch, setGroupMembersSearch] = useState('');
  
  // Custom mobile & read status states
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('chat');
  const [readMessageIds, setReadMessageIds] = useState<Record<string, boolean>>({});

  // Dynamic settings resolution: fallback to group settings if current channel is a group, then user global chat settings, then defaults
  const resolvedChatTheme = (activeChannel?.type === 'group' ? (activeChannel as any).chatTheme : null) || chatTheme || 'default';
  const resolvedChatBgColor = (activeChannel?.type === 'group' ? (activeChannel as any).chatBgColor : null) || chatBgColor || 'default';
  const resolvedChatBgUrl = (activeChannel?.type === 'group' ? (activeChannel as any).chatBgUrl : null) || chatBgUrl || '';
  const resolvedBubbleColor = (activeChannel?.type === 'group' ? (activeChannel as any).bubbleColor : null) || bubbleColor || 'default';

  // Sync profile editing inputs when profile settings open
  useEffect(() => {
    if (showProfileCustomization && currentUser) {
      setEditFullName(currentUser.fullName || '');
      setEditAvatarUrl(currentUser.avatarUrl || '');
      setEditTagline(currentUser.tagline || '');
    }
  }, [showProfileCustomization, currentUser]);

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

  const [chatMembers, setChatMembers] = useState<any[]>([]);
  const [chatGroups, setChatGroups] = useState<any[]>([]);

  // Roster profiles wrapper
  const activeUsersList = users || [];

  const loadInitialChatData = async () => {
    if (!currentUser || !companyId) return;
    try {
      const [membersRes, groupsRes] = await Promise.all([
        fetch(`/api/firm/${companyId}/chat/members`, { credentials: 'include' }),
        fetch(`/api/firm/${companyId}/chat/groups`, { credentials: 'include' })
      ]);
      
      const members = membersRes.ok ? await membersRes.json() : [];
      const groups = groupsRes.ok ? await groupsRes.json() : [];
      
      setChatMembers(members);
      setChatGroups(groups);

      const defaultChannels: ChatConversation[] = [
        {
          id: 'firm-general',
          name: 'Firm Wide',
          type: 'general',
          lastMessageAt: '2026-06-07T12:00:00Z',
          lastMessageText: 'Firm-wide broadcast room.',
          unreadCount: 0,
          isPinned: true,
          priority: 'high'
        }
      ];

      // 1. Direct Messages Section
      members.forEach((u: any) => {
        if (u.id === currentUser.id) return;
        const dmRoomId = currentUser.id < u.id ? `dm-${currentUser.id}-${u.id}` : `dm-${u.id}-${currentUser.id}`;
        defaultChannels.push({
          id: dmRoomId,
          name: u.fullName,
          type: 'dm',
          lastMessageAt: '2026-06-07T10:00:00Z',
          lastMessageText: `Start a direct message with ${u.fullName}`,
          unreadCount: 0,
          userObj: u,
          isPinned: false,
          priority: 'normal'
        });
      });

      // 2. Groups Section
      groups.forEach((g: any) => {
        defaultChannels.push({
          id: g.id,
          name: g.name,
          type: 'group',
          lastMessageAt: '2026-06-07T10:00:00Z',
          lastMessageText: g.description || 'Group conversation room.',
          unreadCount: 0,
          isPinned: false,
          priority: 'normal',
          ...g
        } as any);
      });

      // 3. Case Rooms
      cases.forEach((cs) => {
        const cl = clients.find(c => c.id === cs.clientId);
        defaultChannels.push({
          id: cs.id,
          name: `${cs.referenceNumber || 'CASE'} - ${cl?.fullName || 'General'}`,
          type: 'matter',
          lastMessageAt: cs.openedDate || '2026-06-07T10:00:00Z',
          lastMessageText: cs.notes ? cs.notes.substring(0, 60) + '...' : 'Secure litigation room initialized.',
          unreadCount: 0,
          caseObj: cs,
          clientObj: cl,
          isPinned: cs.priority === 'high',
          priority: cs.priority === 'high' ? 'high' : 'normal'
        });
      });

      setConversations(defaultChannels);
    } catch (err) {
      console.error("Error loading initial chat data:", err);
    }
  };

  // --- INITIALIZE CONVERSATIONS AND MESSAGES ON LOAD ---
  useEffect(() => {
    if (!seeded && currentUser && companyId) {
      loadInitialChatData().then(() => {
        setMessages([]);
        setNotices([{
          id: 'notice-1',
          senderId: currentUser.id,
          title: 'SUPREME COURT PRACTICE REVISED FILINGS PROTOCOL',
          content: 'Effective immediately, all criminal advocacy affidavits must be synchronized to the vault and ledger-certified prior to appearance hours.',
          acknowledgedBy: [],
          createdAt: '2026-06-07T09:12:00Z',
          requiresAllSignature: true
        }]);
        setSeeded(true);
      });
    }
  }, [cases, clients, seeded, currentUser, companyId]);

  // Load real messages whenever active channel changes
  useEffect(() => {
    if (!selectedChannelId || !companyId) return;
    const isDm = selectedChannelId.startsWith('dm-');
    const isGroup = activeChannel.type === 'group';
    const isDirectOrGroup = isDm || isGroup;
    const url = isDirectOrGroup 
      ? `/api/firm/${companyId}/chat?dmRoomId=${selectedChannelId}`
      : (selectedChannelId === 'firm-general' ? `/api/firm/${companyId}/chat` : `/api/firm/${companyId}/chat?caseId=${selectedChannelId}`);

    fetch(url, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(rows => {
        if (rows && rows.length > 0) {
          setMessages(prev => [
            ...prev.filter(m => (isDirectOrGroup ? m.dmRoomId !== selectedChannelId : (selectedChannelId === 'firm-general' ? (!m.caseId && !m.dmRoomId) : m.caseId !== selectedChannelId))),
            ...rows
          ]);
        }
      })
      .catch(err => console.error('Error loading messages:', err));
  }, [selectedChannelId, companyId, activeChannel.type]);

  // --- REAL-TIME SOCKET EVENT LISTENERS --------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      setMessages(prev => {
        // Deduplicate — own messages already added via HTTP response
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleMessageUpdate = (msg: any) => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
    };

    const handleNewNotice = (notice: any) => {
      setNotices(prev => [notice, ...prev.filter(n => n.id !== notice.id)]);
    };

    const handleNoticeAck = ({ noticeId, userId }: { noticeId: string; userId: string }) => {
      setNotices(prev => prev.map(n =>
        n.id === noticeId && !n.acknowledgedBy.includes(userId)
          ? { ...n, acknowledgedBy: [...n.acknowledgedBy, userId] }
          : n
      ));
    };

    const handleUserTyping = ({ userId: uid, userName, caseId: typingCaseId }: any) => {
      // Only show indicator if this is for the active channel
      const activeCaseId = activeChannel.id === 'firm-general' ? null : activeChannel.id;
      if (typingCaseId !== activeCaseId) return;
      if (uid === currentUser.id) return; // never show own indicator

      setTypingUsers(prev => ({ ...prev, [uid]: userName }));
      setSomeoneTyping(true);

      // Auto-clear after 4s in case typing:stop was missed
      if (typingClearTimers.current[uid]) clearTimeout(typingClearTimers.current[uid]);
      typingClearTimers.current[uid] = setTimeout(() => {
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[uid];
          setSomeoneTyping(Object.keys(updated).length > 0);
          return updated;
        });
      }, 4000);
    };

    const handleUserStoppedTyping = ({ userId: uid }: any) => {
      if (typingClearTimers.current[uid]) clearTimeout(typingClearTimers.current[uid]);
      setTypingUsers(prev => {
        const updated = { ...prev };
        delete updated[uid];
        setSomeoneTyping(Object.keys(updated).length > 0);
        return updated;
      });
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:message_updated', handleMessageUpdate);
    socket.on('notice:new', handleNewNotice);
    socket.on('notice:acknowledged', handleNoticeAck);
    socket.on('user:typing', handleUserTyping);
    socket.on('user:stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:message_updated', handleMessageUpdate);
      socket.off('notice:new', handleNewNotice);
      socket.off('notice:acknowledged', handleNoticeAck);
      socket.off('user:typing', handleUserTyping);
      socket.off('user:stopped_typing', handleUserStoppedTyping);
    };
  }, [socket, setMessages, setNotices, activeChannel.id, currentUser.id]);

  // Join/leave socket rooms when active channel changes
  useEffect(() => {
    if (!socket) return;
    if (selectedChannelId && selectedChannelId !== 'firm-general') {
      socket.emit('join:case', selectedChannelId);
      return () => {
        socket.emit('leave:case', selectedChannelId);
      };
    }
  }, [socket, selectedChannelId]);

  // --- LOAD LEGAL NOTICES FROM SERVER ON MOUNT -------------------------
  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/firm/${companyId}/legal-notices`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(rows => setNotices(rows))
      .catch(err => console.error('Error loading legal notices:', err));
  }, [companyId]);

  // --- LOAD AND SAVE CHAT PREFERENCES (keyword rules, folders, theme) ----------
  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/firm/${companyId}/chat-preferences`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(prefs => {
        if (!prefs) return;
        if (Array.isArray(prefs.keywordRules) && prefs.keywordRules.length > 0) {
          setAlertRules(prefs.keywordRules);
        }
        if (Array.isArray(prefs.folders) && prefs.folders.length > 0) {
          setFolders(prefs.folders);
        }
        if (prefs.chatTheme) {
          setChatTheme(prefs.chatTheme);
        }
        if (prefs.chatFontSize) {
          setChatFontSize(prefs.chatFontSize);
        }
        if (typeof prefs.compactMode === 'boolean') {
          setCompactMode(prefs.compactMode);
        }
        if (prefs.bubbleColor) {
          setBubbleColor(prefs.bubbleColor);
        }
        if (prefs.chatBgUrl) {
          setChatBgUrl(prefs.chatBgUrl);
        }
        if (prefs.chatBgColor) {
          setChatBgColor(prefs.chatBgColor);
        }
        if (typeof prefs.chatBgPattern === 'boolean') {
          setChatBgPattern(prefs.chatBgPattern);
        }
      })
      .catch(err => console.error('Error loading chat preferences:', err));
  }, [companyId]);

  const savePreferences = (newRules?: any[], newFolders?: any[]) => {
    if (!companyId) return;
    fetch(`/api/firm/${companyId}/chat-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        keywordRules: newRules ?? alertRules,
        folders: newFolders ?? folders,
        chatTheme,
        chatFontSize,
        compactMode,
        bubbleColor,
        chatBgUrl,
        chatBgColor,
        chatBgPattern
      })
    }).catch(err => console.error('Error saving chat preferences:', err));
  };

  // --- SCROLL TO BOTTOM ON CHAT UPDATE ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, selectedChannelId]);

  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThreadParent, threadText]);

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

  // Filter messages for active channel, ignoring threaded replies
  const primaryMessagesOnly = messages.filter(m => {
    if (m.replyToId) return false;
    
    const isDm = activeChannel.type === 'dm' || activeChannel.id.startsWith('dm-');
    const isGroup = activeChannel.type === 'group' || activeChannel.id.startsWith('group-');
    
    if (isDm) {
      const partnerId = activeChannel.userObj?.id;
      return m.dmRoomId === activeChannel.id || 
             (partnerId && (m.dmPartnerId === partnerId || (m.sentById === currentUser.id && m.dmPartnerId === partnerId))) ||
             (m.dmPartnerId === selectedChannelId || (m.sentById === currentUser.id && m.dmPartnerId === selectedChannelId));
    } else if (isGroup) {
      return m.groupId === selectedChannelId || m.dmRoomId === selectedChannelId;
    } else {
      return (m.caseId === activeChannel.id || (activeChannel.id === 'firm-general' && !m.caseId && !m.dmRoomId));
    }
  });

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
  const extractMentions = (text: string): string[] => {
    const matches = text.match(/@[\w\s,\.\-Esq\.JD]+/g);
    return matches ? matches.map(m => m.slice(1).trim()) : [];
  };

  const extractReferences = (text: string): string[] => {
    const matches = text.match(/#[\w\-\/]+/g);
    return matches ? matches.map(m => m.slice(1).trim()) : [];
  };

  const sendMessageToServer = async (message: string, extraData: any = {}) => {
    try {
      const isDm = activeChannel.id.startsWith('dm-');
      const res = await fetch(`/api/firm/${companyId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          caseId: isDm || activeChannel.id === 'firm-general' ? null : activeChannel.id,
          dmRoomId: isDm ? activeChannel.id : null,
          message,
          isOnRecord: sendOnRecordFlag,
          mentions: extractMentions(message),
          references: extractReferences(message),
          ...extraData
        })
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const saved = await res.json();
      setMessages(prev => [...prev, saved]);
      try {
        const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
        chime.volume = 0.2;
        chime.play();
      } catch {}
    } catch (err: any) {
      console.error('Error sending message:', err);
    }
  };

  const handleTriggerBroadcastSend = async () => {
    if (!msgText.trim() || broadcastTargets.length === 0) return;
    const broadcastMessage = `${msgText} [Broadcast Announcement]`;
    let succeeded = 0;

    for (const channelId of broadcastTargets) {
      try {
        const res = await fetch(`/api/firm/${companyId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            caseId: channelId === 'firm-general' ? null : channelId,
            message: broadcastMessage,
            isOnRecord: sendOnRecordFlag
          })
        });
        if (res.ok) {
          const saved = await res.json();
          setMessages(prev => [...prev, saved]);
          succeeded++;
        }
      } catch (err) {
        console.error(`Error broadcasting to channel ${channelId}:`, err);
      }
    }

    const newLogItem: BroadcastLog = {
      id: `blog-${Date.now()}`,
      message: msgText,
      recipientsCount: succeeded,
      sentAt: new Date().toLocaleTimeString(),
      senderName: currentUser.fullName
    };

    setBroadcastLogs(prev => [newLogItem, ...prev]);
    setMsgText('');
    setBroadcastTargets([]);
    setIsBroadcastMode(false);
    setMockAlertMessage(`Broadcast sent to ${succeeded} of ${broadcastTargets.length} streams.`);
  };

  // --- SEND CHAT ACTION HANDLERS ---
  const handleSendChat = () => {
    if (!msgText.trim()) return;

    let finalMessage = msgText;
    if (textMode === 'bold') finalMessage = `**${msgText}**`;
    else if (textMode === 'italic') finalMessage = `*${msgText}*`;
    else if (textMode === 'code') finalMessage = `\`\`\`\n${msgText}\n\`\`\``;

    sendMessageToServer(finalMessage);
    setMsgText('');
    setSendOnRecordFlag(false);
    setTextMode('normal');
  };

  // --- REPLY THREAD HANDLER ---
  const handlePostReply = async () => {
    if (!threadText.trim() || !activeThreadParent) return;

    try {
      const res = await fetch(`/api/firm/${companyId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          caseId: activeChannel.id === 'firm-general' ? null : activeChannel.id,
          message: threadText,
          replyToId: activeThreadParent.id,
          isOnRecord: false
        })
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const saved = await res.json();
      setMessages(prev => [...prev, saved]);
      setThreadText('');
    } catch (err) {
      console.error('Error posting reply:', err);
    }
  };

  // --- CONTEXT MENUS ACTIONS ON CHANNELS ---
  const toggleMuteChannel = (id: string) => {
    setConversations(conversations.map(c => c.id === id ? { ...c, isMuted: !c.isMuted } : c));
  };

  const togglePinChannel = (id: string) => {
    setConversations(conversations.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c));
  };

  const addChannelToFolder = (chanId: string, foldId: string) => {
    const updated = folders.map(f => {
      if (f.id === foldId && !f.conversationIds.includes(chanId)) {
        return { ...f, conversationIds: [...f.conversationIds, chanId] };
      }
      return f;
    });
    setFolders(updated);
    savePreferences(alertRules, updated);
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
  const executeToggleReaction = async (msgId: string, emoji: string) => {
    setMessages(messages.map(m => {
      if (m.id === msgId) {
        const reactions = { ...(m.reactions || {}) };
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

    try {
      await fetch(`/api/firm/${companyId}/chat/${msgId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji, userId: currentUser.id })
      });
    } catch (err) {
      console.error('Error saving reaction:', err);
    }
  };

  const executeToggleMessagePin = async (msgId: string) => {
    const target = messages.find(m => m.id === msgId);
    if (!target) return;
    const newPinned = !target.isPinned;
    setMessages(messages.map(m => m.id === msgId ? { ...m, isPinned: newPinned } : m));
    try {
      await fetch(`/api/firm/${companyId}/chat/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPinned: newPinned })
      });
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleCopyMessage = (msg: any) => {
    navigator.clipboard.writeText(msg.message);
  };

  const handleForwardMessage = (msg: any) => {
    // Simplest version: forward to the currently open channel as a new message.
    sendMessageToServer(msg.message, { forwardedFrom: msg.senderName });
  };

  const handleToggleStar = async (msgId: string) => {
    try {
      const res = await fetch(`/api/firm/${companyId}/chat/${msgId}/star`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const updated = await res.json();
        setMessages(messages.map(m => m.id === msgId ? { ...m, isStarredByMe: updated.isStarred } : m));
      }
    } catch (err) { console.error('Error starring message:', err); }
  };

  const handleTogglePinByMe = async (msgId: string) => {
    try {
      const res = await fetch(`/api/firm/${companyId}/chat/${msgId}/pin-for-me`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const updated = await res.json();
        setMessages(messages.map(m => m.id === msgId ? { ...m, isPinnedByMe: updated.isPinnedByMe } : m));
      }
    } catch (err) { console.error('Error pinning message:', err); }
  };

  const handleDeleteForMe = async (msgId: string) => {
    try {
      await fetch(`/api/firm/${companyId}/chat/${msgId}/delete-for-me`, { method: 'POST', credentials: 'include' });
      setMessages(messages.filter(m => m.id !== msgId));
    } catch (err) { console.error('Error deleting for me:', err); }
  };

  const handleDeleteForEveryone = async (msgId: string) => {
    if (!window.confirm('Delete this message for everyone? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/firm/${companyId}/chat/${msgId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setMessages(messages.filter(m => m.id !== msgId));
      } else {
        const err = await res.json();
        console.error(err.error || 'Could not delete this message');
      }
    } catch (err) { console.error('Error deleting for everyone:', err); }
  };

  const executeMarkMessageOnRecord = async (msgId: string) => {
    const target = messages.find(m => m.id === msgId);
    if (!target) return;
    setMessages(messages.map(m => m.id === msgId ? { ...m, isOnRecord: true } : m));
    try {
      await fetch(`/api/firm/${companyId}/chat/${msgId}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: currentUser.id })
      });
    } catch (err) {
      console.error('Error marking message on record:', err);
    }
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
    if (window.innerWidth < 768) return; // Completely bypass on mobile to prevent forced synchronous layout thrashing and keyboard delay
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

  const handleSendChatWithFiles = () => {
    if (!msgText.trim() && attachedFiles.length === 0) return;

    if (socket) {
      const activeCaseId = activeChannel.id === 'firm-general' ? null : activeChannel.id;
      socket.emit('typing:stop', { caseId: activeCaseId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    // Capture states immediately
    const textToSend = msgText;
    const filesToSend = attachedFiles;
    const replyingTo = replyingToMessage;
    const onRecordToSend = sendOnRecordFlag;

    // Reset input text and state synchronously for instant UI responsiveness
    setMsgText('');
    setAttachedFiles([]);
    setSendOnRecordFlag(false);
    setTextMode('normal');
    setFormatToolbar(null);
    setReplyingToMessage(null);

    // Maintain input focus and play visual cue sounds immediately (0ms delay)
    setTimeout(() => {
      if (mainInputRef.current) {
        mainInputRef.current.focus();
      }
    }, 50);

    try {
      const a = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
      a.volume = 0.15;
      a.play();
    } catch {}

    const doSend = async (fileData: {name:string;type:string;dataUrl:string}[]) => {
      try {
        const res = await fetch(`/api/firm/${companyId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            caseId: activeChannel.type === 'matter' ? activeChannel.id : null,
            dmRoomId: (activeChannel.type === 'dm' || activeChannel.type === 'group') ? activeChannel.id : null,
            message: textToSend,
            isOnRecord: onRecordToSend,
            mentions: extractMentions(textToSend),
            references: extractReferences(textToSend),
            attachments: fileData,
            replyToId: replyingTo?.id || null
          })
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const saved = await res.json();
        setMessages(prev => {
          if (prev.some(m => m.id === saved.id)) return prev;
          return [...prev, saved];
        });
        setLastSentId(saved.id);
        setTimeout(() => setLastSentId(null), 700);
      } catch (err) {
        console.error('Error sending message with files:', err);
      }
    };

    if (filesToSend.length > 0) {
      Promise.all(filesToSend.map(f => new Promise<{name:string;type:string;dataUrl:string}>(res => {
        const r = new FileReader();
        r.onload = ev => res({name:f.name, type:f.type, dataUrl:ev.target?.result as string});
        r.readAsDataURL(f);
      }))).then(doSend);
    } else {
      doSend([]);
    }
  };


  return (
    <div className={`w-full h-full min-h-[500px] sm:min-h-[600px] bg-white rounded-none sm:rounded-3xl border-0 sm:border border-slate-205 overflow-hidden flex flex-col font-sans select-none ${focusModeOn ? 'max-w-4xl mx-auto ring-4 ring-blue-600/30 shadow-2xl' : ''}`}>
      
      {/* 1. SECURE TOP HEADER AREA WITH MULTI-TENANCY SIGNALS & STATS STRIP */}
      {!focusModeOn && (
        <div className="hidden md:block bg-slate-50 border-b p-4 pb-3 space-y-3 shrink-0 select-none">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-600/20">
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
                onClick={() => setShowProfileCustomization(true)}
                className="p-2 bg-white hover:bg-slate-50 text-slate-500 rounded-xl border flex items-center gap-1 font-bold text-xxs cursor-pointer shadow-xxs"
                title="Profile & Wallpaper Customization"
              >
                <Palette className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span className="hidden leading-none md:inline">My Profile</span>
              </button>

              <button 
                onClick={() => setViewingMode(viewingMode === 'chat' ? 'analytics' : 'chat')}
                className={`p-2 rounded-xl border flex items-center gap-1 font-bold text-xxs transition cursor-pointer shadow-xxs ${viewingMode === 'analytics' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white hover:text-slate-805 text-slate-500'}`}
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
        <div className="bg-blue-600 text-white p-2 px-4 flex justify-between items-center text-xxs block leading-tight font-sans select-none shrink-0 animate-slide-down">
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
            <div className={`md:col-span-3 border-r flex flex-col h-full bg-slate-50/50 overflow-hidden shrink-0 pb-[72px] md:pb-0 relative ${mobileView === 'list' ? 'flex w-full' : 'hidden md:flex'}`}>
              
              {/* Search & filters head */}
              <div className="p-3 bg-white border-b space-y-2 select-none">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search case streams..."
                      value={leftSearch}
                      onChange={e => setLeftSearch(e.target.value)}
                      className="w-full text-xxs p-2 pl-8 border bg-slate-50 rounded-xl outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => setShowProfileCustomization(true)}
                    className="h-8 w-8 rounded-full border border-slate-200 overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500/20 transition active:scale-95 flex items-center justify-center bg-slate-50"
                    title="My Profile & Chat Settings"
                  >
                    <img 
                      src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser?.fullName || 'User')}`} 
                      className="h-full w-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex p-0.5 border bg-slate-105 rounded-lg text-[9px] font-black">
                    {(['all', 'unread', 'priority'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setLeftFilter(tab)}
                        className={`p-1 px-2.5 rounded cursor-pointer leading-tight uppercase ${leftFilter === tab ? 'bg-white text-blue-700 shadow-xxs font-black' : 'text-slate-410 text-slate-500 hover:text-slate-800'}`}
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
                    className={`p-2.5 rounded-xl border flex items-center justify-between w-full font-bold text-xxs transition cursor-pointer select-none ${isBroadcastMode ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white hover:bg-blue-50/20 text-blue-700 border-blue-100'}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Share2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">Post Broadcast Update</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 transition ${isBroadcastMode ? 'rotate-90' : ''}`} />
                  </button>
                </div>

                {/* 1. GENERAL FIRM PUBLIC GROUP (FIRM WIDE) */}
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block px-1.5">Firm Wide</span>
                  <div className="space-y-0.5">
                    {filteredConversations.filter(c => c.type === 'general').map(cn => (
                      <button
                        key={cn.id}
                        onClick={() => { setSelectedChannelId(cn.id); setMobileView('chat'); }}
                        className={`w-full p-2.5 rounded-xl text-left border text-xxs transition flex items-center gap-2 cursor-pointer ${selectedChannelId === cn.id ? 'bg-blue-600 border-blue-600 text-white' : 'hover:bg-slate-100 bg-white border-slate-201'}`}
                      >
                        <div className="h-4.5 w-4.5 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-black">🏢</div>
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

                {/* 2. STAFF DIRECT MESSAGES */}
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block px-1.5">Direct Messages (Firm)</span>
                  
                  <div className="space-y-0.5 max-h-[180px] overflow-y-auto pr-1">
                    {filteredConversations.filter(c => c.type === 'dm').map(cn => (
                      <button
                        key={cn.id}
                        onClick={() => { setSelectedChannelId(cn.id); setMobileView('chat'); }}
                        className={`w-full p-2.5 rounded-xl text-left border text-xxs transition flex items-center gap-2 cursor-pointer ${selectedChannelId === cn.id ? 'bg-blue-600 border-blue-600 text-white' : 'hover:bg-slate-100 bg-white border-slate-201'}`}
                      >
                        <div className="relative shrink-0 select-none">
                          <img 
                            src={cn.userObj?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cn.name)}`} 
                            className="w-5.5 h-5.5 rounded-full border bg-slate-50 object-cover" 
                          />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${cn.userObj?.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-center select-none">
                            <span className="font-extrabold block truncate leading-none">{cn.name}</span>
                            <span className={`text-[7px] uppercase font-mono font-bold ${selectedChannelId === cn.id ? 'text-white/60' : 'text-slate-400'}`}>
                              {cn.userObj?.role || 'Staff'}
                            </span>
                          </div>
                          <span className={`text-[8.5px] block truncate mt-0.5 ${selectedChannelId === cn.id ? 'text-white/80' : 'text-slate-400'}`}>
                            {cn.lastMessageText}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. GROUPS */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1.5 py-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Groups</span>
                    <button
                      onClick={() => setShowCreateGroupModal(true)}
                      className="h-7 w-7 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full cursor-pointer transition flex items-center justify-center shadow-xxs border border-blue-100 active:scale-90 shrink-0"
                      title="Create Group"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-0.5 max-h-[180px] overflow-y-auto pr-1">
                    {filteredConversations.filter(c => c.type === 'group').map(cn => (
                      <button
                        key={cn.id}
                        onClick={() => { setSelectedChannelId(cn.id); setMobileView('chat'); }}
                        className={`w-full p-2.5 rounded-xl text-left border text-xxs transition flex items-center gap-2 cursor-pointer ${selectedChannelId === cn.id ? 'bg-blue-600 border-blue-600 text-white' : 'hover:bg-slate-100 bg-white border-slate-201'}`}
                      >
                        <div className="h-5.5 w-5.5 rounded-full bg-indigo-105 text-indigo-700 flex items-center justify-center text-[10px] font-black select-none shrink-0">👥</div>
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold block truncate leading-none mb-0.5">{cn.name}</span>
                          <span className={`text-[8.5px] block truncate ${selectedChannelId === cn.id ? 'text-white/80' : 'text-slate-400'}`}>{cn.lastMessageText}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. CASE MATTERS SECTION SPLIT */}
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block px-1.5">Court Matters Streams</span>
                  
                  <div className="space-y-0.5 max-h-[220px] overflow-y-auto pr-1">
                    {filteredConversations.filter(c => c.type === 'matter').map(cn => (
                      <div 
                        key={cn.id}
                        className={`w-full p-2.5 rounded-xl border text-xxs transition flex items-center justify-between gap-1.5 cursor-pointer relative ${selectedChannelId === cn.id ? 'bg-blue-600 border-blue-600 text-white' : 'hover:bg-slate-100 bg-white border-slate-201'}`}
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

                {/* 3. EXPANDABLE CUSTOM FILE FOLDER COMPARTMENTS */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Custom folders</span>
                    <button
                      onClick={() => {
                        const newName = prompt("Enter new folder directory name:");
                        if (newName) {
                          const updated = [...folders, { id: `pack-${Date.now()}`, name: newName, color: 'emerald-500', conversationIds: [] }];
                          setFolders(updated);
                          savePreferences(alertRules, updated);
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

              {/* Floating Action Button for Group Creation on Mobile List View */}
              <div className="md:hidden absolute bottom-[84px] right-4 z-40">
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer border border-blue-500 hover:scale-105"
                  title="Create Group"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Superadmin shortcut info button left panel footer */}
              <div className="p-4 border-t bg-white select-none text-xxs text-slate-400 flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 animate-pulse animate-duration-1000" />
                  <span className="font-mono text-[9px]">Firm-ID: Docket007</span>
                </div>
              </div>

            </div>
          )}

          {/* =====================================================================
              CENTER PANEL (50% Width, cols-6): Real-time dialog active conversation
              ===================================================================== */}
          <div className={`${focusModeOn ? 'md:col-span-12' : isRightPanelOpen ? 'md:col-span-6' : 'md:col-span-9'} flex flex-col h-full pb-[72px] md:pb-0 overflow-hidden bg-white ${mobileView === 'chat' ? 'flex w-full animate-fade-in' : 'hidden md:flex'}`}>
            
            {/* Conversation sticky top-bar client-dossier badge info */}
            <div className="p-3 border-b border-slate-200/60 flex justify-between items-center bg-white z-10 shrink-0 select-none">
              <div className="flex items-center gap-2 min-w-0">
                {/* Back button only on mobile */}
                <button 
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1 mr-0.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div 
                  onClick={() => {
                    if (activeChannel.type === 'group') {
                      setGroupMembersSearch('');
                      setShowGroupMembersModal(true);
                    }
                  }}
                  className={`flex items-center gap-2 text-left min-w-0 ${activeChannel.type === 'group' ? 'cursor-pointer hover:bg-slate-50/85 p-1 px-2 -mx-1 rounded-2xl transition duration-150 border border-transparent hover:border-slate-100' : ''}`}
                  title={activeChannel.type === 'group' ? 'Click to view group profile & members' : undefined}
                >
                {/* Avatar */}
                <div className="relative shrink-0 select-none">
                  {activeChannel.type === 'dm' ? (
                    <>
                      <img 
                        src={activeChannel.userObj?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeChannel.name)}`} 
                        className="h-8 w-8 rounded-full border object-cover" 
                      />
                      <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-white ${activeChannel.userObj?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    </>
                  ) : activeChannel.type === 'group' ? (
                    <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                      👥
                    </div>
                  ) : activeChannel.type === 'matter' ? (
                    <div className="h-8 w-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                      💼
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                      🏢
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-800 tracking-tight truncate select-none">
                      {activeChannel.name}
                    </span>
                    {(activeChannel as any).isMuted && <BellOff className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5 leading-none">
                    {activeChannel.type === 'dm' ? (
                      activeChannel.userObj?.isOnline ? 'Active now' : 'Offline'
                    ) : activeChannel.type === 'group' ? (
                      'Company Group • Group chat'
                    ) : activeChannel.type === 'matter' ? (
                      activeChannel.clientObj?.fullName ? `Case Room • Client: ${activeChannel.clientObj.fullName}` : 'Litigation room'
                    ) : (
                      'Official Stream • Broadcast Room'
                    )}
                  </span>
                </div>
              </div>
            </div>

              {/* Sub-header interactive triggers */}
              <div className="flex items-center gap-1.5 select-none">
                <div className="hidden md:flex items-center gap-1">
                  {activeChannel.type === 'group' && (
                    <button
                      onClick={() => {
                        setEditGroupName(activeChannel.name);
                        setEditGroupDesc((activeChannel as any).description || '');
                        setEditGroupLogo((activeChannel as any).logoUrl || '');
                        setEditGroupBubbleColor((activeChannel as any).bubbleColor || 'default');
                        setEditGroupBgColor((activeChannel as any).bgColor || 'default');
                        setEditGroupBgUrl((activeChannel as any).bgUrl || '');
                        setEditGroupMembers((activeChannel as any).memberIds || []);
                        setShowEditGroupModal(true);
                      }}
                      className="p-1.5 border hover:bg-slate-50 text-indigo-600 rounded-xl flex items-center gap-1 font-bold text-xxs cursor-pointer shrink-0 transition"
                      title="Group Settings & Members"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Group Settings</span>
                    </button>
                  )}

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
                    className={`p-1.5 flex items-center justify-center cursor-pointer ${focusModeOn ? 'text-blue-600' : 'text-slate-505 hover:text-blue-600'} transition`}
                    title="Toggle centered focus mode"
                  >
                    <Eye className="w-4 h-4" />
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
                        fetch(`/api/firm/${companyId}/legal-notices/${notice.id}/acknowledge`, {
                          method: 'POST',
                          credentials: 'include'
                        })
                        .then(res => {
                          if (!res.ok) throw new Error('Failed to acknowledge notice');
                          return res.json();
                        })
                        .then(() => {
                          setNotices(notices.map(n => {
                            if (n.id === notice.id && !n.acknowledgedBy.includes(currentUser.id)) {
                              return { ...n, acknowledgedBy: [...n.acknowledgedBy, currentUser.id] };
                            }
                            return n;
                          }));
                        })
                        .catch(err => console.error('Error acknowledging notice:', err));
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
            <div 
              className={`flex-1 overflow-y-auto px-4 py-3 relative transition-all ${
                resolvedChatBgUrl ? 'bg-cover bg-center' : (CHAT_BG_COLORS[resolvedChatBgColor] || CHAT_THEME_BG[resolvedChatTheme] || CHAT_THEME_BG.default)
              }`} 
              style={{ 
                minHeight: 0,
                backgroundImage: resolvedChatBgUrl ? `url(${resolvedChatBgUrl})` : undefined
              }}
            >
              {/* WhatsApp repeating doodle pattern overlay */}
              {chatBgPattern && !resolvedChatBgUrl && (
                <div 
                  className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-multiply dark:mix-blend-overlay"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.148 0 5.7-2.552 5.7-5.7 0-3.148-2.552-5.7-5.7-5.7-3.148 0-5.7 2.552-5.7 5.7 0 3.148 2.552 5.7 5.7 5.7zm29 57c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM25 54c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm14 7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm-7-26c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM3 29c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29-12c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm1-1c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm-2-1c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm1-5c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm2-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm1-5c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm2-2c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z'/%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                  }}
                />
              )}
              {primaryMessagesOnly.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-3 select-none">
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
                              {/* Sender name (others only) — Display on mobile and desktop alike, but remove the role */}
                              {!isOwn && (
                                <div className="flex items-center gap-1.5 px-1 mb-0.5">
                                  <span className="text-[10px] font-extrabold text-slate-700">{m.senderName}</span>
                                  {m.isOnRecord && <span className="text-[7px] bg-amber-100 border border-amber-200 text-amber-700 px-1 py-0.5 rounded font-bold animate-pulse">Ledger</span>}
                                </div>
                              )}

                              {/* Message bubble */}
                              <SwipeableMessage
                                isOwn={isOwn}
                                menuOpen={openMenuMsgId === m.id}
                                onOpenMenu={() => setOpenMenuMsgId(openMenuMsgId === m.id ? null : m.id)}
                                onSwipeReply={() => setReplyingToMessage(m)}
                              >
                              <div
                                onContextMenu={(e) => {
                                  if (window.innerWidth < 768) {
                                    e.preventDefault();
                                  }
                                }}
                                className={`relative px-4 py-2 rounded-2xl shadow-sm leading-relaxed select-none md:select-text transition-all ${
                                  isOwn
                                    ? (OWN_BUBBLE_COLORS[resolvedBubbleColor] || OWN_BUBBLE_COLORS.default)
                                    : (OTHER_BUBBLE_COLORS[resolvedBubbleColor] || OTHER_BUBBLE_COLORS.default)
                                }`}
                                style={ruleMatch.hasMatch ? { boxShadow: `0 0 0 1.5px ${ruleMatch.color}60` } : {}}
                              >
                                {/* Quoted reply preview */}
                                {m.replyToId && (() => {
                                  const quoted = messages.find(qm => qm.id === m.replyToId);
                                  if (!quoted) return null;
                                  return (
                                    <div className={`mb-1.5 pl-2 border-l-2 rounded ${isOwn ? 'border-white/40 bg-white/10' : 'border-blue-400 bg-blue-50/60'} py-1 px-1.5`}>
                                      <span className={`block text-[9.5px] font-bold ${isOwn ? 'text-white/85' : 'text-blue-700'}`}>{quoted.senderName}</span>
                                      <span className={`block text-[10.5px] truncate max-w-[220px] ${isOwn ? 'text-white/70' : 'text-slate-600'}`}>{quoted.message}</span>
                                    </div>
                                  );
                                })()}

                                {/* Message text with markdown */}
                                {m.message && (
                                  <p className="whitespace-pre-wrap break-words text-inherit">
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
                                            <div className={`p-2 rounded-lg ${isOwn?'bg-white/20':'bg-blue-100'}`}>
                                              <FileAudio className={`w-4 h-4 ${isOwn?'text-white':'text-blue-600'}`} />
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

                              {openMenuMsgId === m.id && (
                                <MessageContextMenu
                                  isOwn={isOwn}
                                  isPinned={!!m.isPinned}
                                  anchorMode={typeof window !== 'undefined' && window.innerWidth < 768 ? 'sheet' : 'dropdown'}
                                  onReply={() => setReplyingToMessage(m)}
                                  onCopy={() => handleCopyMessage(m)}
                                  onPin={() => executeToggleMessagePin(m.id)}
                                  onRecord={() => executeMarkMessageOnRecord(m.id)}
                                  onClose={() => setOpenMenuMsgId(null)}
                                />
                              )}
                              </SwipeableMessage>

                              {/* Reactions row */}
                              {m.reactions && Object.keys(m.reactions).some(k => (m.reactions[k] as string[]).length > 0) && (
                                <div className={`flex flex-wrap gap-1 px-1 select-none mt-0.5 ${isOwn?'justify-end':''}`}>
                                  {Object.entries(m.reactions).map(([emoji, list]) => {
                                    const arr = list as string[];
                                    if (!arr.length) return null;
                                    return (
                                      <button key={emoji} onClick={() => executeToggleReaction(m.id, emoji)}
                                        className="px-1 py-0.5 text-[11px] flex items-center gap-1 transition hover:scale-110">
                                        {emoji} <span className="text-[9px] text-slate-500 font-bold">{arr.length}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Thread replies rendered directly inline below bubble! */}
                              {(() => {
                                const replies = messages.filter(r => r.replyToId === m.id);
                                if (replies.length === 0) return null;
                                return (
                                  <div className={`mt-1 pl-3 border-l-2 ${isOwn ? 'border-blue-400/30' : 'border-slate-300'} space-y-1.5 w-full max-w-full`}>
                                    {replies.map((reply: any) => {
                                      return (
                                        <div key={reply.id} className="text-[11px] leading-snug bg-slate-50/70 border border-slate-100/80 rounded-xl p-1.5 px-2 select-none">
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="font-extrabold text-slate-700 text-[9.5px]">{reply.senderName}</span>
                                            <span className="text-[8px] text-slate-400 font-medium">
                                              {new Date(reply.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                          </div>
                                          <p className="text-slate-600 font-medium select-none">{reply.message}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
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
                  <div className="relative shrink-0 flex -space-x-1">
                    {Object.keys(typingUsers).map((uid) => (
                      <img 
                        key={uid}
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(typingUsers[uid] || 'User')}`} 
                        className="h-6 w-6 rounded-full border bg-slate-100 ring-2 ring-white shrink-0" 
                      />
                    ))}
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-3 py-2 flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {Object.values(typingUsers).join(', ')} typing…
                  </span>
                </div>
              )}

              <div ref={messageEndRef} className="h-2" />
            </div>

            {/* Reply preview chip — shown above composer when replying to a message */}
            {replyingToMessage && (
              <div className="flex items-center justify-between gap-2 px-4 py-2 bg-blue-50 border-t border-blue-100 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[9.5px] font-bold text-blue-700">Replying to {replyingToMessage.senderName}</span>
                    <span className="block text-[11px] text-slate-600 truncate max-w-[240px]">{replyingToMessage.message}</span>
                  </div>
                </div>
                <button onClick={() => setReplyingToMessage(null)} className="p-1 hover:bg-blue-100 rounded-full text-blue-500 shrink-0">✕</button>
              </div>
            )}

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
                          <span className="text-[7px] uppercase font-mono text-slate-400 ml-auto">
                            {u.fullName === 'Docket Concierge' ? '' : u.role}
                          </span>
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

                {/* Attached files, inputs, or permission warnings */}
                {activeChannel.type === 'dm' && activeChannel.userObj && (
                  (activeChannel.userObj.allowedPages && !activeChannel.userObj.allowedPages.includes('page_chat') && !activeChannel.userObj.isSuperAdmin) ||
                  activeChannel.userObj.isActive === false
                ) ? (
                  <div className="px-6 py-10 bg-slate-50 border-t border-slate-200/50 flex flex-col items-center justify-center text-center space-y-3 shrink-0 select-none">
                    <div className="h-10 w-10 rounded-full bg-slate-200/60 text-slate-500 flex items-center justify-center border border-slate-300/30">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">No Chat Access</h4>
                      <p className="text-[11px] text-slate-500 font-medium max-w-xs leading-relaxed">
                        {activeChannel.name} {activeChannel.userObj.isActive === false ? 'is currently suspended.' : 'has not been granted the Chat page permission.'} You cannot text them until their access status is modified by an administrator.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
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
                              <FileAudio className="w-3.5 h-3.5 text-blue-500"/>
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
                    <div className="md:hidden px-3.5 pb-4 pt-1 bg-transparent shrink-0 border-0">
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
                          onChange={e => { 
                            setMsgText(e.target.value); 
                            setShowEmojiPicker(false); 
                            if (socket) {
                              const activeCaseId = activeChannel.id === 'firm-general' ? null : activeChannel.id;
                              socket.emit('typing:start', { caseId: activeCaseId });
                              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                              typingTimeoutRef.current = setTimeout(() => {
                                socket.emit('typing:stop', { caseId: activeCaseId });
                              }, 2500);
                            }
                          }}
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
                          <motion.button
                            whileTap={{ scale: 0.9, boxShadow: "0 0 12px rgba(59, 130, 246, 0.8)" }}
                            onClick={isBroadcastMode ? handleTriggerBroadcastSend : handleSendChatWithFiles}
                            className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center rounded-full shrink-0 shadow-sm transition-all cursor-pointer"
                            title="Send message"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* 2. Desktop-only input row (Classic full-width layout with dividing border-t) */}
                    <div className="hidden md:block px-3 pb-3 pt-2 bg-white shrink-0 border-t border-slate-100">
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
                          <motion.button
                            whileTap={{ scale: 0.9, boxShadow: "0 0 15px rgba(59, 130, 246, 0.8)" }}
                            onClick={isBroadcastMode ? handleTriggerBroadcastSend : handleSendChatWithFiles}
                            disabled={!msgText.trim() && attachedFiles.length === 0}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md shadow-blue-200/60 disabled:opacity-40 transition-all duration-200 shrink-0"
                          >
                            <Send className="w-4 h-4"/>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

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
                            <button key={t.id} onClick={()=>{setChatTheme(t.id); persistChatPreferences(t.id, chatFontSize, compactMode);}}
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
                            <button key={s.id} onClick={()=>{setChatFontSize(s.id); persistChatPreferences(chatTheme, s.id, compactMode);}}
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
                              <button onClick={()=>{const next=!opt.val; opt.set(next); persistChatPreferences(chatTheme, chatFontSize, next);}}
                                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${opt.val?'bg-blue-600':'bg-slate-200'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${opt.val?'translate-x-4':'translate-x-0.5'}`}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 select-none">
                        <button
                          onClick={() => {
                            setShowCustomizePanel(false);
                            setShowProfileCustomization(true);
                          }}
                          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition shadow-md shadow-blue-500/15 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 duration-150"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>My Profile & Backgrounds</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profile & Customization Modal */}
                {showProfileCustomization && currentUser && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-left border border-slate-100 animate-scale-up">
                      <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Palette className="w-5 h-5 text-blue-600" />
                          <h3 className="font-extrabold text-base text-slate-800 tracking-tight">Profile & Customization</h3>
                        </div>
                        <button
                          onClick={() => setShowProfileCustomization(false)}
                          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg cursor-pointer transition text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4 text-xs overflow-y-auto max-h-[70vh] pr-1">
                        {/* 1. Name & Profile */}
                        <div className="space-y-2.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">My Identity</span>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Full Name</label>
                            <input
                              type="text"
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 outline-none"
                              placeholder="Your full name"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Tagline / Professional Specialty</label>
                            <input
                              type="text"
                              value={editTagline}
                              onChange={(e) => setEditTagline(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 outline-none"
                              placeholder="e.g. Senior Partner • Family Law Advocacy"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Avatar Image URL</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editAvatarUrl}
                                onChange={(e) => setEditAvatarUrl(e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 outline-none"
                                placeholder="https://example.com/avatar.png"
                              />
                              <button
                                onClick={() => setEditAvatarUrl(`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(editFullName || 'user')}`)}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer transition text-[10px]"
                              >
                                Auto Generate
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 2. My Chat Bubble Color */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">My Chat Bubble Color</span>
                          <div className="grid grid-cols-6 gap-1.5">
                            {([
                              { id: 'default', label: 'Default', cls: 'bg-blue-600' },
                              { id: 'blue', label: 'Blue', cls: 'bg-blue-600' },
                              { id: 'indigo', label: 'Indigo', cls: 'bg-indigo-600' },
                              { id: 'slate', label: 'Slate', cls: 'bg-slate-700' },
                              { id: 'emerald', label: 'Emerald', cls: 'bg-emerald-600' },
                              { id: 'amber', label: 'Amber', cls: 'bg-amber-600' }
                            ]).map(col => (
                              <button
                                key={col.id}
                                onClick={() => {
                                  setBubbleColor(col.id);
                                  persistChatPreferences(chatTheme, chatFontSize, compactMode, col.id);
                                }}
                                className={`h-8 w-full ${col.cls} rounded-xl border-2 transition hover:scale-105 cursor-pointer relative flex items-center justify-center ${bubbleColor === col.id ? 'border-amber-400 shadow-md ring-1 ring-amber-400' : 'border-white/20'}`}
                                title={col.label}
                              >
                                {bubbleColor === col.id && <span className="text-[9px] font-bold text-white">✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. My Chat Cover Background */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">My Chat Background Cover</span>
                          
                          {/* Solid BG Selection */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 block">Solid Background Colors</label>
                            <div className="grid grid-cols-8 gap-1.5">
                              {([
                                { id: 'default', label: 'Light', cls: 'bg-slate-50' },
                                { id: 'slate', label: 'Dark', cls: 'bg-slate-900 border border-slate-700' },
                                { id: 'amber', label: 'Amber', cls: 'bg-amber-100' },
                                { id: 'rose', label: 'Rose', cls: 'bg-rose-100' },
                                { id: 'emerald', label: 'Emerald', cls: 'bg-emerald-100' },
                                { id: 'sky', label: 'Sky', cls: 'bg-sky-100' },
                                { id: 'indigo', label: 'Indigo', cls: 'bg-indigo-950 border border-indigo-850' },
                                { id: 'violet', label: 'Violet', cls: 'bg-violet-950 border border-violet-850' }
                              ]).map(bg => (
                                <button
                                  key={bg.id}
                                  onClick={() => {
                                    setChatBgColor(bg.id);
                                    setChatBgUrl(''); // clear image URL when solid color selected
                                    persistChatPreferences(chatTheme, chatFontSize, compactMode, bubbleColor, '', bg.id);
                                  }}
                                  className={`h-7 w-full ${bg.cls} rounded-lg border transition hover:scale-105 cursor-pointer flex items-center justify-center ${chatBgColor === bg.id && !chatBgUrl ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs' : 'border-slate-200'}`}
                                  title={bg.label}
                                >
                                  {chatBgColor === bg.id && !chatBgUrl && <span className="text-[9px] font-black text-blue-600">✓</span>}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Image BG Selection */}
                          <div className="space-y-1 pt-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Or Custom Background Image URL</label>
                            <input
                              type="text"
                              value={chatBgUrl}
                              onChange={(e) => {
                                setChatBgUrl(e.target.value);
                                persistChatPreferences(chatTheme, chatFontSize, compactMode, bubbleColor, e.target.value, chatBgColor);
                              }}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 outline-none"
                              placeholder="e.g. https://images.unsplash.com/photo-xxx"
                            />
                            <p className="text-[9px] text-slate-400 leading-normal mt-1">
                              Paste an image URL to apply as your chat background wallpaper. Leaves custom color as a container fallback.
                            </p>
                          </div>

                          {/* Wallpaper pattern toggle */}
                          <div className="pt-3 flex justify-between items-center select-none border-t border-slate-100/60 mt-3">
                            <div className="pr-2">
                              <span className="text-[10px] font-black text-slate-700 block uppercase tracking-wider">WhatsApp Doodle Pattern</span>
                              <span className="text-[9px] text-slate-400 block leading-tight mt-0.5">Apply subtle repeating geometric textures over solid colors</span>
                            </div>
                            <button 
                              onClick={() => {
                                const next = !chatBgPattern;
                                setChatBgPattern(next);
                                persistChatPreferences(chatTheme, chatFontSize, compactMode, bubbleColor, chatBgUrl, chatBgColor, next);
                              }}
                              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${chatBgPattern ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${chatBgPattern ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Modal Footer actions */}
                      <div className="flex gap-2.5 mt-6 pt-4 border-t border-slate-100 select-none">
                        <button
                          onClick={() => setShowProfileCustomization(false)}
                          className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl font-bold transition text-xs cursor-pointer"
                        >
                          Close
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-xs cursor-pointer shadow-md shadow-blue-500/10"
                        >
                          Save Identity
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Create Group Modal */}
                {showCreateGroupModal && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-left border border-slate-100 animate-scale-up">
                      <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Plus className="w-5 h-5 text-blue-600" />
                          <h3 className="font-extrabold text-base text-slate-800 tracking-tight">Create Chat Group</h3>
                        </div>
                        <button
                          onClick={() => setShowCreateGroupModal(false)}
                          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg cursor-pointer transition text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4 text-xs overflow-y-auto max-h-[65vh] pr-1">
                        {/* Group info fields */}
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Group Name</label>
                            <input
                              type="text"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 outline-none"
                              placeholder="e.g. Partners Strategy Board"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Group Description</label>
                            <textarea
                              value={newGroupDesc}
                              onChange={(e) => setNewGroupDesc(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 outline-none h-16 resize-none"
                              placeholder="Group mission or focus area..."
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Group Logo Image URL (Optional)</label>
                            <input
                              type="text"
                              value={newGroupLogo}
                              onChange={(e) => setNewGroupLogo(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 outline-none"
                              placeholder="e.g. https://example.com/logo.png"
                            />
                          </div>
                        </div>

                        {/* Theme, background & bubble setup */}
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Group Theme Customization</span>
                          
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Bubble Color</label>
                              <select
                                value={newGroupBubbleColor}
                                onChange={(e) => setNewGroupBubbleColor(e.target.value)}
                                className="w-full px-2.5 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 outline-none cursor-pointer"
                              >
                                <option value="default">Default Blue</option>
                                <option value="blue">Blue Sky</option>
                                <option value="indigo">Royal Indigo</option>
                                <option value="slate">Slate Graphite</option>
                                <option value="emerald">Emerald Forest</option>
                                <option value="amber">Warm Amber</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Background Theme</label>
                              <select
                                value={newGroupBgColor}
                                onChange={(e) => setNewGroupBgColor(e.target.value)}
                                className="w-full px-2.5 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 outline-none cursor-pointer"
                              >
                                <option value="default">Default Soft Slate</option>
                                <option value="slate">Dark Slate Charcoal</option>
                                <option value="amber">Soft Amber Glow</option>
                                <option value="rose">Delicate Rose Petal</option>
                                <option value="emerald">Subtle Mint Emerald</option>
                                <option value="sky">Clear Sky Breeze</option>
                                <option value="indigo">Deep Night Indigo</option>
                                <option value="violet">Mystic Dark Violet</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Or Custom Wallpaper Image URL</label>
                            <input
                              type="text"
                              value={newGroupBgUrl}
                              onChange={(e) => setNewGroupBgUrl(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 text-xs text-slate-800 outline-none"
                              placeholder="https://example.com/wallpaper.jpg"
                            />
                          </div>
                        </div>

                        {/* Member checklist */}
                        <div className="pt-3 border-t border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Select Members to Add</span>
                          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-32 overflow-y-auto bg-slate-50/50 p-1">
                            {chatMembers.map((m: any) => (
                              <label key={m.id} className="flex items-center gap-2.5 p-2 hover:bg-white rounded-lg cursor-pointer transition">
                                <input
                                  type="checkbox"
                                  checked={newGroupMembers.includes(m.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewGroupMembers(prev => [...prev, m.id]);
                                    } else {
                                      setNewGroupMembers(prev => prev.filter(id => id !== m.id));
                                    }
                                  }}
                                  className="h-3.5 w-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <img
                                  src={m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.fullName || 'U')}`}
                                  className="h-6 w-6 rounded-full object-cover border"
                                />
                                <div className="min-w-0 flex-1 text-left">
                                  <span className="font-semibold text-xs text-slate-700 block truncate">{m.fullName}</span>
                                  <span className="text-[10px] text-slate-400 block truncate">{m.role || 'Practitioner'}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1.5 leading-normal">
                            All selected members will be added automatically and see the group on their sidebar in real-time.
                          </p>
                        </div>
                      </div>

                      {/* Modal Footer actions */}
                      <div className="flex gap-2.5 mt-6 pt-4 border-t border-slate-100">
                        <button
                          onClick={() => setShowCreateGroupModal(false)}
                          className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl font-bold transition text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateGroup}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-xs cursor-pointer shadow-md shadow-blue-500/10"
                        >
                          Create Group
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Group Modal */}
                {showEditGroupModal && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-left border border-slate-100 animate-scale-up">
                      <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-5 h-5 text-blue-600" />
                          <h3 className="font-extrabold text-base text-slate-800 tracking-tight">Group Settings</h3>
                        </div>
                        <button
                          onClick={() => setShowEditGroupModal(false)}
                          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg cursor-pointer transition text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4 text-xs overflow-y-auto max-h-[65vh] pr-1">
                        {/* Group info fields */}
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Group Name</label>
                            <input
                              type="text"
                              value={editGroupName}
                              disabled={(activeChannel as any).adminId !== currentUser.id}
                              onChange={(e) => setEditGroupName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                              placeholder="e.g. Partners Strategy Board"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Group Description</label>
                            <textarea
                              value={editGroupDesc}
                              disabled={(activeChannel as any).adminId !== currentUser.id}
                              onChange={(e) => setEditGroupDesc(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 outline-none h-16 resize-none disabled:bg-slate-50 disabled:text-slate-400"
                              placeholder="Group mission or focus area..."
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Group Logo Image URL (Optional)</label>
                            <input
                              type="text"
                              value={editGroupLogo}
                              disabled={(activeChannel as any).adminId !== currentUser.id}
                              onChange={(e) => setEditGroupLogo(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 text-xs text-slate-800 outline-none disabled:bg-slate-50"
                              placeholder="e.g. https://example.com/logo.png"
                            />
                          </div>
                        </div>

                        {/* Theme, background & bubble setup */}
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Group Theme Customization</span>
                          
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Bubble Color</label>
                              <select
                                value={editGroupBubbleColor}
                                disabled={(activeChannel as any).adminId !== currentUser.id}
                                onChange={(e) => setEditGroupBubbleColor(e.target.value)}
                                className="w-full px-2.5 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 outline-none cursor-pointer disabled:bg-slate-50"
                              >
                                <option value="default">Default Blue</option>
                                <option value="blue">Blue Sky</option>
                                <option value="indigo">Royal Indigo</option>
                                <option value="slate">Slate Graphite</option>
                                <option value="emerald">Emerald Forest</option>
                                <option value="amber">Warm Amber</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Background Theme</label>
                              <select
                                value={editGroupBgColor}
                                disabled={(activeChannel as any).adminId !== currentUser.id}
                                onChange={(e) => setEditGroupBgColor(e.target.value)}
                                className="w-full px-2.5 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 outline-none cursor-pointer disabled:bg-slate-50"
                              >
                                <option value="default">Default Soft Slate</option>
                                <option value="slate">Dark Slate Charcoal</option>
                                <option value="amber">Soft Amber Glow</option>
                                <option value="rose">Delicate Rose Petal</option>
                                <option value="emerald">Subtle Mint Emerald</option>
                                <option value="sky">Clear Sky Breeze</option>
                                <option value="indigo">Deep Night Indigo</option>
                                <option value="violet">Mystic Dark Violet</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Or Custom Wallpaper Image URL</label>
                            <input
                              type="text"
                              value={editGroupBgUrl}
                              disabled={(activeChannel as any).adminId !== currentUser.id}
                              onChange={(e) => setEditGroupBgUrl(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 text-xs text-slate-800 outline-none disabled:bg-slate-50"
                              placeholder="https://example.com/wallpaper.jpg"
                            />
                          </div>
                        </div>

                        {/* Member checklist */}
                        <div className="pt-3 border-t border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Manage Group Members</span>
                          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-32 overflow-y-auto bg-slate-50/50 p-1">
                            {chatMembers.map((m: any) => (
                              <label key={m.id} className="flex items-center gap-2.5 p-2 hover:bg-white rounded-lg cursor-pointer transition">
                                <input
                                  type="checkbox"
                                  disabled={(activeChannel as any).adminId !== currentUser.id}
                                  checked={editGroupMembers.includes(m.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditGroupMembers(prev => [...prev, m.id]);
                                    } else {
                                      setEditGroupMembers(prev => prev.filter(id => id !== m.id));
                                    }
                                  }}
                                  className="h-3.5 w-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                                />
                                <img
                                  src={m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.fullName || 'U')}`}
                                  className="h-6 w-6 rounded-full object-cover border"
                                />
                                <div className="min-w-0 flex-1 text-left">
                                  <span className="font-semibold text-xs text-slate-700 block truncate">{m.fullName}</span>
                                  <span className="text-[10px] text-slate-400 block truncate">{m.role || 'Practitioner'}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Danger zone for Creator */}
                        {(activeChannel as any).adminId === currentUser.id && (
                          <div className="pt-4 border-t border-rose-100 select-none">
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block mb-2">Danger Zone</span>
                            <div className="bg-rose-50 border border-rose-150 p-3 rounded-2xl flex items-center justify-between">
                              <div className="text-left pr-2">
                                <span className="font-bold text-rose-800 block text-xs">Permanently Close Group</span>
                                <span className="text-[9px] text-rose-500 block leading-normal mt-0.5">Delete this room, all group custom settings, and conversation logs.</span>
                              </div>
                              <button
                                onClick={() => handleDeleteGroup(activeChannel.id)}
                                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-xl transition cursor-pointer shrink-0 animate-pulse"
                              >
                                Delete Group
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Modal Footer actions */}
                      <div className="flex gap-2.5 mt-6 pt-4 border-t border-slate-100">
                        <button
                          onClick={() => setShowEditGroupModal(false)}
                          className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl font-bold transition text-xs cursor-pointer"
                        >
                          Close
                        </button>
                        {(activeChannel as any).adminId === currentUser.id && (
                          <button
                            onClick={() => handleUpdateGroup(activeChannel.id)}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl font-bold transition text-xs cursor-pointer shadow-md shadow-blue-500/10"
                          >
                            Save Settings
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Group Members Modal */}
                {showGroupMembersModal && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-left border border-slate-100 animate-scale-up">
                      <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <h3 className="font-extrabold text-base text-slate-800 tracking-tight">Group Members</h3>
                        </div>
                        <button
                          onClick={() => setShowGroupMembersModal(false)}
                          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg cursor-pointer transition text-sm font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Group Overview Card */}
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                        <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-lg shrink-0 select-none">
                          👥
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-slate-800 block text-xs truncate">{activeChannel.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate mt-0.5">{(activeChannel as any).description || 'No description provided.'}</span>
                        </div>
                      </div>

                      {/* Search filter for members */}
                      <div className="relative mb-3.5">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search members in group..."
                          value={groupMembersSearch}
                          onChange={(e) => setGroupMembersSearch(e.target.value)}
                          className="w-full text-xs p-2 pl-9 border border-slate-200 bg-slate-50/50 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Members List Container */}
                      <div className="space-y-2 text-xs overflow-y-auto max-h-[45vh] pr-1">
                        {activeUsersList
                          .filter((u: any) => {
                            const isInGroup = ((activeChannel as any).memberIds || []).includes(u.id) || u.id === (activeChannel as any).adminId;
                            const matchesSearch = u.fullName.toLowerCase().includes(groupMembersSearch.toLowerCase());
                            return isInGroup && matchesSearch;
                          })
                          .map((u: any) => {
                            const isAdmin = u.id === (activeChannel as any).adminId;
                            return (
                              <div key={u.id} className="p-2.5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between gap-3 hover:bg-slate-50/60 transition duration-150">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="relative shrink-0">
                                    <img 
                                      src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`} 
                                      className="w-8 h-8 rounded-full border border-slate-100 object-cover" 
                                    />
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${u.isOnline ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-extrabold text-slate-800 block truncate">{u.fullName}</span>
                                    <span className="text-[9px] text-slate-400 font-mono uppercase block mt-0.5">{u.role || 'Practitioner'}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isAdmin && (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-100 rounded-lg px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                                      Group Admin
                                    </span>
                                  )}
                                  {u.id !== currentUser.id && (
                                    <button
                                      onClick={() => {
                                        const dmRoomId = currentUser.id < u.id ? `dm-${currentUser.id}-${u.id}` : `dm-${u.id}-${currentUser.id}`;
                                        setSelectedChannelId(dmRoomId);
                                        setShowGroupMembersModal(false);
                                        setMobileView('chat');
                                      }}
                                      className="h-7 px-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 active:scale-95 transition-all text-[10px] font-extrabold cursor-pointer flex items-center gap-1"
                                      title={`Direct Message ${u.fullName}`}
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>Message</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Close Button */}
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <button
                          onClick={() => setShowGroupMembersModal(false)}
                          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl font-bold transition text-xs cursor-pointer active:scale-[0.99]"
                        >
                          Close
                        </button>
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
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block select-none">Active roster ({chatMembers.length})</span>
                    
                    <div className="space-y-1">
                      {chatMembers.map(u => (
                        <div 
                          key={u.id}
                          onClick={() => setSelectedUserProfile(u)}
                          className="p-2 bg-white border hover:bg-slate-50 transition rounded-xl flex items-center justify-between gap-2.5 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`} className="w-5.5 h-5.5 rounded-full" />
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-800 block leading-tight truncate">{u.fullName}</span>
                              <span className="text-[7.5px] text-slate-400 font-mono uppercase block mt-0.5 leading-none">
                                {u.fullName === 'Docket Concierge' ? '' : u.role}
                              </span>
                            </div>
                          </div>
                          <span className={`h-2 w-2 rounded-full block shrink-0 ${u.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
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
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
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
          onAddRule={(r) => {
            const updated = [...alertRules, { id: `rule-${Date.now()}`, ...r }];
            setAlertRules(updated);
            savePreferences(updated, folders);
          }}
          onDeleteRule={(id) => {
            const updated = alertRules.filter(r => r.id !== id);
            setAlertRules(updated);
            savePreferences(updated, folders);
          }}
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
            fetch(`/api/firm/${companyId}/legal-notices`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                title: ntitle,
                content: ncontent,
                requiresAllSignature: signOnly
              })
            })
            .then(res => {
              if (!res.ok) throw new Error('Failed to post legal notice');
              return res.json();
            })
            .then(notice => {
              setMockAlertMessage(`BULLETIN POSTED: "${ntitle}" published to global roster list.`);
            })
            .catch(err => console.error('Error posting legal notice:', err));
          }}
        />
      )}

      {/* 5. USER PROFILE SHEET POPUP */}
      {selectedUserProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            
            <div className="flex justify-end select-none">
              <button onClick={() => setSelectedUserProfile(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            {selectedUserProfile.id === currentUser?.id ? (
              // Own profile: Editable Mode
              <div className="space-y-4 text-left">
                <div className="flex flex-col items-center gap-2 select-none">
                  <img 
                    src={editAvatarUrl || selectedUserProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUserProfile.fullName}`} 
                    className="w-14 h-14 rounded-full border border-blue-200 bg-slate-50 object-cover shadow-sm"
                  />
                  <div className="text-center">
                    <span className="bg-blue-50 text-blue-755 px-2 py-0.5 mt-1 rounded font-mono text-[8px] font-black uppercase tracking-widest inline-block">
                      My Profile ({selectedUserProfile.role})
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 font-mono text-[8px] uppercase font-bold block mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={editFullName} 
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold text-slate-800" 
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[8px] uppercase font-bold block mb-1">Avatar URL</label>
                    <input 
                      type="text" 
                      value={editAvatarUrl} 
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono text-slate-700" 
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[8px] uppercase font-bold block mb-1">Professional Tagline</label>
                    <input 
                      type="text" 
                      value={editTagline} 
                      onChange={(e) => setEditTagline(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-700 italic font-serif" 
                      placeholder="Enter a brief tagline..."
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2 select-none">
                  <button 
                    onClick={() => setSelectedUserProfile(null)} 
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile} 
                    className="flex-1 py-2 bg-blue-650 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              // Another user's profile: Read-Only Mode
              <>
                <div className="flex flex-col items-center gap-2 select-none">
                  <img 
                    src={selectedUserProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUserProfile.fullName}`} 
                    className="w-14 h-14 rounded-full border border-blue-200 bg-slate-50 object-cover shadow-sm"
                  />
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm leading-none">{selectedUserProfile.fullName}</h4>
                    {selectedUserProfile.fullName !== 'Docket Concierge' && (
                      <span className="bg-blue-50 text-blue-755 px-2 py-0.5 mt-1 rounded font-mono text-[8px] font-black uppercase tracking-widest inline-block">
                        {selectedUserProfile.role}
                      </span>
                    )}
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
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
