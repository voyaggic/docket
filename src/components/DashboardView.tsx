import React, { useState, useEffect } from 'react';
import CustomSelect from '../components/CustomSelect';
import { 
  Briefcase, Calendar, MessageSquare, AlertTriangle, ArrowRight, Check, Edit, 
  Send, User, FileText, CheckCircle2, XCircle, ChevronRight, Edit2, CheckSquare, 
  Loader2, Search, Sliders, Volume2, Plus, ArrowUp, ArrowDown, HelpCircle, 
  Bell, FileCheck, Layers, LayoutGrid, Sparkles, MessageCircle, RefreshCw, Eye,
  ChevronUp, ChevronDown, GripVertical, Mail, Smartphone,
  Bold, Italic, Underline, Link, List, ExternalLink, Palette
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Case, Deadline, ClientUpdate, CompanySettings } from '../types';
import { getTerm } from '../utils/terminology';

interface DashboardViewProps {
  userName: string;
  companyName: string;
  companyId?: string;
  settings?: CompanySettings | null;
  roster?: any[];
  clients?: any[];
  cases: Case[];
  deadlines: Deadline[];
  updates: ClientUpdate[];
  onOpenCase: (caseId: string) => void;
  onNavigateTo: (panel: string) => void;
  onSendUpdate: (updateId: string, message: string, channels: any) => Promise<void>;
  onRefresh?: () => void;
}

// Utility function to determine color brightness for high contrast titles
function isColorLight(hexColor: string): boolean {
  if (!hexColor) return false;
  let color = hexColor.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  if (color.length !== 6) return false;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150;
}

export default function DashboardView({ 
  userName, companyName, companyId = "settings-demo", settings, roster = [], clients = [], 
  cases = [], deadlines = [], updates = [], onOpenCase, onNavigateTo, onSendUpdate, onRefresh 
}: DashboardViewProps) {
  
  // Layout Management State
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [localWidgets, setLocalWidgets] = useState<any[]>([]);
  const [localConfig, setLocalConfig] = useState<any>({});
  const [savingLayout, setSavingLayout] = useState(false);

  // Collapsible and Draggable widget states
  const [collapsedWidgets, setCollapsedWidgets] = useState<Record<string, boolean>>({});
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);

  // Individual draft card controls for the Pending Client Updates bento card
  const [expandedUpdates, setExpandedUpdates] = useState<Record<string, boolean>>({});
  const [draftChannels, setDraftChannels] = useState<Record<string, { email: boolean; whatsapp: boolean; sms: boolean }>>({});
  const [draftSignature, setDraftSignature] = useState<Record<string, string>>({});

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchTab, setSearchTab] = useState<'all' | 'cases' | 'clients' | 'deadlines' | 'chat'>('all');

  // Interactive Calendar view toggler for deadlines widget
  const [deadlineViewMode, setDeadlineViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Inline edits for Draft Communicator
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingTextMessage, setEditingTextMessage] = useState('');
  const [loadingSendId, setLoadingSendId] = useState<string | null>(null);

  // Consent model state
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [consentTargetUpdate, setConsentTargetUpdate] = useState<any | null>(null);

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<'category_request' | 'feature_request' | 'bug_report'>('feature_request');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Real-time Event Simulation Feed (Simulating Pusher activity)
  const [pusherFeed, setPusherFeed] = useState<any[]>([
    { id: 'p1', type: 'system', text: 'Realtime channel established with Docket core', time: 'Just now', icon: 'zap' }
  ]);
  const [simulatingEvent, setSimulatingEvent] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Quick action modals
  const [activeModal, setActiveModal] = useState<'case' | 'deadline' | 'update' | null>(null);
  const [newCaseData, setNewCaseData] = useState({
    clientId: '',
    caseType: 'Civil Litigation',
    court: 'Supreme Court',
    opposingParty: '',
    referenceNumber: '',
    notes: ''
  });
  const [newDeadlineData, setNewDeadlineData] = useState({
    caseId: '',
    title: '',
    dueDate: '',
    deadlineType: 'Court Filing',
    notes: ''
  });
  const [newUpdateData, setNewUpdateData] = useState({
    caseId: '',
    message: '',
    channelEmail: true,
    channelWhatsapp: false,
    channelSms: false
  });

  // Action drawer states
  const [quickDetailItem, setQuickDetailItem] = useState<{ type: string; data: any } | null>(null);

  // Announcement Banner Customizer modal
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementConfig, setAnnouncementConfig] = useState<any>({
    isActive: false,
    title: '',
    body: '',
    backgroundColor: '#fee2e2',
    textColor: '#991b1b',
    position: 'top'
  });

  // Find highest contrast text color for custom bg
  const getContrastColor = (hex: string) => {
    if (!hex || hex.length < 6) return '#334155';
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1E293B' : '#FFFFFF';
  };

  // Wrap highlight/selection inside client updates textarea
  const handleTextareaStyle = (updateId: string, prefix: string, suffix: string, defaultText: string) => {
    const textarea = document.getElementById(`textarea-edit-${updateId}`) as HTMLTextAreaElement | null;
    if (!textarea) {
      setEditingTextMessage(prev => prev + prefix + defaultText + suffix);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const original = textarea.value;
    let selected = original.substring(start, end);
    if (!selected) {
      selected = defaultText;
    }
    const newValue = original.substring(0, start) + prefix + selected + suffix + original.substring(end);
    setEditingTextMessage(newValue);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selected.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Parse rich text rules (Bold, Italic, Underline, list, reference links, doc ref attachments)
  const parseRichText = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return (
      <div className="space-y-1 font-sans text-xs">
        {lines.map((line, lIdx) => {
          let isListItem = false;
          let lineContent = line;
          if (line.trim().startsWith('- ')) {
            isListItem = true;
            lineContent = line.trim().substring(2);
          } else if (line.trim().startsWith('* ')) {
            if (!line.trim().endsWith('*') || line.trim().indexOf('*', 1) === -1) {
              isListItem = true;
              lineContent = line.trim().substring(2);
            }
          }
          
          const renderLineWithTags = (content: string) => {
            let parts: Array<{ type: 'text' | 'bold' | 'italic' | 'underline' | 'link' | 'attachment'; text: string; href?: string }> = [
              { type: 'text', text: content }
            ];

            // 1. Process attachments: [Attached: XYZ] or similar
            let updatedParts: typeof parts = [];
            for (const part of parts) {
              if (part.type === 'text') {
                const regex = /\[Attached:\s*(.*?)\]/g;
                let lastIndex = 0;
                let match;
                while ((match = regex.exec(part.text)) !== null) {
                  if (match.index > lastIndex) {
                    updatedParts.push({ type: 'text', text: part.text.substring(lastIndex, match.index) });
                  }
                  updatedParts.push({ type: 'attachment', text: match[1] });
                  lastIndex = regex.lastIndex;
                }
                if (lastIndex < part.text.length) {
                  updatedParts.push({ type: 'text', text: part.text.substring(lastIndex) });
                }
              } else {
                updatedParts.push(part);
              }
            }
            parts = updatedParts;

            // 2. Process links: [text](href)
            updatedParts = [];
            for (const part of parts) {
              if (part.type === 'text') {
                const regex = /\[(.*?)\]\((.*?)\)/g;
                let lastIndex = 0;
                let match;
                while ((match = regex.exec(part.text)) !== null) {
                  if (match.index > lastIndex) {
                    updatedParts.push({ type: 'text', text: part.text.substring(lastIndex, match.index) });
                  }
                  updatedParts.push({ type: 'link', text: match[1], href: match[2] });
                  lastIndex = regex.lastIndex;
                }
                if (lastIndex < part.text.length) {
                  updatedParts.push({ type: 'text', text: part.text.substring(lastIndex) });
                }
              } else {
                updatedParts.push(part);
              }
            }
            parts = updatedParts;

            // 3. Process underline: <u>text</u>
            updatedParts = [];
            for (const part of parts) {
              if (part.type === 'text') {
                const regex = /<u>(.*?)<\/u>/g;
                let lastIndex = 0;
                let match;
                while ((match = regex.exec(part.text)) !== null) {
                  if (match.index > lastIndex) {
                    updatedParts.push({ type: 'text', text: part.text.substring(lastIndex, match.index) });
                  }
                  updatedParts.push({ type: 'underline', text: match[1] });
                  lastIndex = regex.lastIndex;
                }
                if (lastIndex < part.text.length) {
                  updatedParts.push({ type: 'text', text: part.text.substring(lastIndex) });
                }
              } else {
                updatedParts.push(part);
              }
            }
            parts = updatedParts;

            // 4. Process bold: **text**
            updatedParts = [];
            for (const part of parts) {
              if (part.type === 'text') {
                const regex = /\*\*(.*?)\*\*/g;
                let lastIndex = 0;
                let match;
                while ((match = regex.exec(part.text)) !== null) {
                  if (match.index > lastIndex) {
                    updatedParts.push({ type: 'text', text: part.text.substring(lastIndex, match.index) });
                  }
                  updatedParts.push({ type: 'bold', text: match[1] });
                  lastIndex = regex.lastIndex;
                }
                if (lastIndex < part.text.length) {
                  updatedParts.push({ type: 'text', text: part.text.substring(lastIndex) });
                }
              } else {
                updatedParts.push(part);
              }
            }
            parts = updatedParts;

            // 5. Process italic: *text*
            updatedParts = [];
            for (const part of parts) {
              if (part.type === 'text') {
                const regex = /\*(.*?)\*/g;
                let lastIndex = 0;
                let match;
                while ((match = regex.exec(part.text)) !== null) {
                  if (match.index > lastIndex) {
                    updatedParts.push({ type: 'text', text: part.text.substring(lastIndex, match.index) });
                  }
                  updatedParts.push({ type: 'italic', text: match[1] });
                  lastIndex = regex.lastIndex;
                }
                if (lastIndex < part.text.length) {
                  updatedParts.push({ type: 'text', text: part.text.substring(lastIndex) });
                }
              } else {
                updatedParts.push(part);
              }
            }
            parts = updatedParts;

            return (
              <>
                {parts.map((p, idx) => {
                  if (p.type === 'bold') {
                    return <strong key={idx} className="font-extrabold text-slate-900">{p.text}</strong>;
                  }
                  if (p.type === 'italic') {
                    return <em key={idx} className="italic text-slate-800">{p.text}</em>;
                  }
                  if (p.type === 'underline') {
                    return <span key={idx} className="underline decoration-slate-400">{p.text}</span>;
                  }
                  if (p.type === 'attachment') {
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateTo('documents');
                          showToastBanner(`Accessing matter file: ${p.text}`);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-250 rounded text-[9.0px] font-bold cursor-pointer mx-0.5 align-middle select-none transition shadow-xxs"
                        title={`Click to view doc: ${p.text}`}
                      >
                        <FileText className="h-3 w-3 text-emerald-600 inline" /> {p.text}
                      </button>
                    );
                  }
                  if (p.type === 'link') {
                    return (
                      <a
                        key={idx}
                        href={p.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-sky-600 hover:text-sky-800 underline font-semibold mx-0.5 cursor-pointer"
                      >
                        {p.text} <ExternalLink className="h-2.5 w-2.5 text-sky-500 inline" />
                      </a>
                    );
                  }
                  return <span key={idx}>{p.text}</span>;
                })}
              </>
            );
          };

          if (isListItem) {
            return (
              <div key={lIdx} className="flex gap-2 items-start pl-2">
                <span className="text-sky-500">•</span>
                <span className="text-slate-700">{renderLineWithTags(lineContent)}</span>
              </div>
            );
          }

          return (
            <p key={lIdx} className="text-slate-700 leading-relaxed min-h-[14px]">
              {renderLineWithTags(lineContent)}
            </p>
          );
        })}
      </div>
    );
  };

  // Load backend configurations
  useEffect(() => {
    if (settings) {
      if (settings.dashboardWidgets) {
        setLocalWidgets([...settings.dashboardWidgets].sort((a, b) => (a.position || 0) - (b.position || 0)));
      } else {
        setLocalWidgets(getDefaultWidgets());
      }
      if (settings.dashboardConfig) {
        setLocalConfig(settings.dashboardConfig);
      } else {
        setLocalConfig(getDefaultConfig());
      }
      if (settings.firmAnnouncement) {
        setAnnouncementConfig(settings.firmAnnouncement);
      }
    } else {
      setLocalWidgets(getDefaultWidgets());
      setLocalConfig(getDefaultConfig());
    }
  }, [settings]);

  // Handle live search requests
  useEffect(() => {
    const debouncer = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setSearching(true);
        try {
          const res = await fetch(`/api/firm/${companyId}/search?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            setSearchResults(await res.json());
          }
        } catch (e) {
          console.error("Dashboard global search error:", e);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults(null);
      }
    }, 300);

    return () => clearTimeout(debouncer);
  }, [searchQuery, companyId]);

  // Default widget & layout fallbacks
  function getDefaultWidgets() {
    return [
      { widgetId: "upcoming_deadlines", widgetType: "upcoming_deadlines", label: "Upcoming Deadlines and Court Dates", isVisible: true, position: 1, config: { daysAhead: 7, includeTypes: ["Court Filing", "Evidence Delivery", "Hearing", "Trial"], defaultView: "list" }},
      { widgetId: "pending_updates", widgetType: "pending_updates", label: "Pending Client Updates", isVisible: true, position: 2, config: { limit: 5, showPreview: true, showChannelIcons: true }},
      { widgetId: "recent_activity", widgetType: "recent_activity", label: "Recent Case Activity Feed", isVisible: true, position: 3, config: { limit: 5 }},
      { widgetId: "cases_status", widgetType: "cases_status", label: "Cases by Status Chart", isVisible: true, position: 4, config: {} },
      { widgetId: "docs_awaiting", widgetType: "docs_awaiting", label: "Documents Awaiting Action", isVisible: false, position: 5, config: { limit: 5 }},
      { widgetId: "today_agenda", widgetType: "today_agenda", label: "Today's Agenda", isVisible: false, position: 6, config: {} },
      { widgetId: "notifications_panel", widgetType: "notifications_panel", label: "Notifications History Panel", isVisible: false, position: 7, config: { limit: 10 }}
    ];
  }

  function getDefaultConfig() {
    return {
      roleBasedView: false,
      defaultDateRange: 7,
      greetingSubtext: "Here is what needs your attention today.",
      showDate: true,
      showFirmName: true,
      metricCards: [
        { id: "card_active_cases", label: "Active cases", icon: "briefcase", bgColor: "bg-white", textColor: "text-slate-900", isVisible: true, threshold: 20, clickAction: "navigate_cases" },
        { id: "card_deadlines_week", label: "Deadlines this week", icon: "calendar", bgColor: "bg-white", textColor: "text-slate-900", isVisible: true, threshold: 5, clickAction: "popup_deadlines" },
        { id: "card_pending_updates", label: "Pending updates", icon: "message-square", bgColor: "bg-white", textColor: "text-slate-900", isVisible: true, threshold: 10, clickAction: "popup_updates" },
        { id: "card_unread_messages", label: "Unread messages", icon: "messages-square", bgColor: "bg-white", textColor: "text-slate-900", isVisible: true, threshold: 15, clickAction: "navigate_chat" }
      ],
      quickActions: [
        { id: "action_new_case", label: "New Case", isVisible: true, color: "bg-slate-900 text-white", clickBehavior: "popup" },
        { id: "action_add_deadline", label: "Add Deadline", isVisible: true, color: "bg-slate-800 text-white", clickBehavior: "popup" },
        { id: "action_send_update", label: "Send Update", isVisible: true, color: "bg-sky-400 text-slate-950", clickBehavior: "popup" }
      ],
      searchConfig: {
        categories: [
          { id: "cases", label: "Cases", isEnabled: true },
          { id: "clients", label: "Clients", isEnabled: true },
          { id: "deadlines", label: "Deadlines", isEnabled: true },
          { id: "documents", label: "Documents", isEnabled: true },
          { id: "team", label: "Team Members", isEnabled: true },
          { id: "updates", label: "Updates", isEnabled: true },
          { id: "chat", label: "Chat Messages", isEnabled: true }
        ],
        includeChat: true,
        includeDeactivated: false
      }
    };
  }

  // Greeting based on system hours
  const hours = new Date().getHours();
  let greetingTitle = "Good morning";
  if (hours >= 12 && hours < 17) greetingTitle = "Good afternoon";
  if (hours >= 17) greetingTitle = "Good evening";

  // Compute metrics lists
  const activeCasesList = cases.filter(c => c.status === 'ACTIVE');
  const upcomingDeadlinesList = deadlines.filter(d => !d.isResolved).map(d => {
    const parentCase = cases.find(c => c.id === d.caseId);
    const client = parentCase ? clients.find(cl => cl.id === parentCase.clientId) : null;
    return {
      ...d,
      caseRef: parentCase?.referenceNumber || "DK-Matter",
      clientName: client?.fullName || "General Practice"
    };
  });

  const pendingUpdatesList = updates.filter(u => u.status === 'DRAFT').map(u => {
    const parentCase = cases.find(c => c.id === u.caseId);
    const client = parentCase ? clients.find(cl => cl.id === parentCase.clientId) : null;
    return {
      ...u,
      caseRef: parentCase?.referenceNumber || "DK-Matter",
      clientName: client?.fullName || "General Matter"
    };
  });

  // Create timeline activity traces
  const recentEvents: any[] = [];
  cases.forEach(c => {
    const cl = clients.find(cl => cl.id === c.clientId);
    const evs = (c as any).events || [];
    evs.forEach((e: any) => {
      recentEvents.push({
        ...e,
        caseId: c.id,
        caseRef: c.referenceNumber || "DK-Matter",
        clientName: cl?.fullName || "General Corp"
      });
    });
  });
  recentEvents.sort((a, b) => new Date(b.eventDate || b.createdAt).getTime() - new Date(a.eventDate || a.createdAt).getTime());
  const displayEvents = recentEvents.slice(0, localConfig?.defaultDateRange || 7);

  // Inline Draft actions
  const startEditUpdate = (u: any) => {
    setEditingUpdateId(u.id);
    setEditingTextMessage(u.message);
  };

  const handleSaveInlineEdit = async (updateId: string) => {
    try {
      const res = await fetch(`/api/firm/${companyId}/updates/${updateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editingTextMessage })
      });
      if (res.ok) {
        setEditingUpdateId(null);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openConsentModal = (u: any) => {
    setConsentTargetUpdate(u);
    setConsentModalOpen(true);
  };

  const executeSend = async () => {
    if (!consentTargetUpdate) return;
    setLoadingSendId(consentTargetUpdate.id);
    setConsentModalOpen(false);

    try {
      // Create trace consent log
      await fetch(`/api/firm/${companyId}/updates/${consentTargetUpdate.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: { email: true, whatsapp: true, sms: false } })
      });
      
      const textToUse = editingUpdateId === consentTargetUpdate.id ? editingTextMessage : consentTargetUpdate.message;
      await onSendUpdate(consentTargetUpdate.id, textToUse, { email: true, whatsapp: true });
      
      showToastBanner(`Communication dispatched safely to ${consentTargetUpdate.clientName || 'Client'}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSendId(null);
      setConsentTargetUpdate(null);
    }
  };

  // Toast animation trigger
  const showToastBanner = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification(null);
    }, 4000);
  };

  // Submit platform feedback values
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    setSubmittingFeedback(true);
    setFeedbackSuccess(false);

    try {
      const res = await fetch('/api/platform/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          userId: "usr-admin-demo",
          type: feedbackType,
          message: feedbackMessage
        })
      });

      if (res.ok) {
        setFeedbackSuccess(true);
        setFeedbackMessage('');
        showToastBanner("Thank you! Feedback filed directly into Platform telemetry logs.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Helper to determine if a widget is below the Recent Activity feed
  const isBelowFeed = (id: string) => {
    return ['cases_status', 'docs_awaiting', 'today_agenda', 'notifications_panel'].includes(id);
  };

  // Drag and drop mechanics for widgets located below the recent case activity feed
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isBelowFeed(id)) return;
    setDraggedWidgetId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!isBelowFeed(id) || !draggedWidgetId || draggedWidgetId === id) return;
    e.preventDefault(); // Essential to allow dropping
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!isBelowFeed(targetId) || !draggedWidgetId || draggedWidgetId === targetId) return;

    const sourceIdx = localWidgets.findIndex(w => w.widgetId === draggedWidgetId);
    const targetIdx = localWidgets.findIndex(w => w.widgetId === targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const updated = [...localWidgets];
      // swap positions
      const tempPosition = updated[sourceIdx].position;
      updated[sourceIdx].position = updated[targetIdx].position;
      updated[targetIdx].position = tempPosition;

      // sort and save
      updated.sort((a, b) => (a.position || 0) - (b.position || 0));
      setLocalWidgets(updated);
      
      // Auto-deploy state to backend database synchronously
      try {
        await fetch(`/api/firm/${companyId}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dashboardWidgets: updated,
            dashboardConfig: localConfig
          })
        });
        showToastBanner("Bento widgets realigned. Position saved to secure firm directory.");
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error("Auto-save of draggable layout failed:", err);
      }
    }
    setDraggedWidgetId(null);
  };

  // Save layout configurations on-the-spot
  const handleSaveLayout = async () => {
    setSavingLayout(true);
    try {
      const res = await fetch(`/api/firm/${companyId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboardWidgets: localWidgets,
          dashboardConfig: localConfig
        })
      });

      if (res.ok) {
        setIsCustomizing(false);
        showToastBanner("Bento config saved. All dynamic database records updated.");
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingLayout(false);
    }
  };

  // Toggle widget visibility
  const toggleWidgetVisible = (widgetId: string) => {
    setLocalWidgets(prev => prev.map(w => 
      w.widgetId === widgetId ? { ...w, isVisible: !w.isVisible } : w
    ));
  };

  // Reorder widgets position helper
  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const nextWidgets = [...localWidgets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nextWidgets.length) return;

    const temp = nextWidgets[index];
    nextWidgets[index] = nextWidgets[targetIndex];
    nextWidgets[targetIndex] = temp;

    // Reapply positions
    const fixed = nextWidgets.map((w, i) => ({ ...w, position: i + 1 }));
    setLocalWidgets(fixed);
  };

  // Live Pusher Webhook simulator loop
  const triggerRealtimeSimulation = (simType: string) => {
    setSimulatingEvent(true);
    let mockMsg = '';
    let newEvent: any = null;

    if (simType === 'client_upload') {
      mockMsg = "Pusher Event: Opposing party filed Contract Addendum #44 SLA";
      newEvent = { id: 'p-' + Date.now(), type: 'document', text: 'Marcus Vance signed formal SLA release letter', time: 'Just now', icon: 'file' };
    } else if (simType === 'whatsapp_reply') {
      mockMsg = "Pusher Event: WhatsApp Response registered from Marcus Vance";
      newEvent = { id: 'p-' + Date.now(), type: 'whatsapp', text: '"I will attend the hearing on Friday. Thanks."', time: 'Just now', icon: 'reply' };
    } else {
      mockMsg = "Pusher Event: Auto audit log generated for upcoming deadlines";
      newEvent = { id: 'p-' + Date.now(), type: 'cron', text: 'Supreme Court trial briefing alert issued through mail proxy', time: 'Just now', icon: 'alert' };
    }

    setTimeout(() => {
      setSimulatingEvent(false);
      showToastBanner(mockMsg);
      setPusherFeed(prev => [newEvent, ...prev]);
    }, 850);
  };

  // Submit quick add forms
  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseData.clientId) return;

    try {
      const res = await fetch(`/api/firm/${companyId}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: newCaseData.clientId,
          referenceNumber: newCaseData.referenceNumber || `DK/${new Date().getFullYear()}/${Math.floor(Math.random() * 900) + 100}`,
          caseType: newCaseData.caseType,
          court: newCaseData.court,
          opposingParty: newCaseData.opposingParty || 'Pending Opposing Council',
          assignedLawyerId: 'usr-admin-demo',
          notes: newCaseData.notes
        })
      });

      if (res.ok) {
        setActiveModal(null);
        showToastBanner("New Matter Folder active in company directory.");
        setNewCaseData({ clientId: '', caseType: 'Civil Litigation', court: 'Supreme Court', opposingParty: '', referenceNumber: '', notes: '' });
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadlineData.caseId || !newDeadlineData.title || !newDeadlineData.dueDate) return;

    try {
      const res = await fetch(`/api/firm/${companyId}/deadlines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: newDeadlineData.caseId,
          title: newDeadlineData.title,
          dueDate: newDeadlineData.dueDate,
          deadlineType: newDeadlineData.deadlineType,
          remindDaysBefore: [1, 3, 7],
          notes: newDeadlineData.notes
        })
      });

      if (res.ok) {
        setActiveModal(null);
        showToastBanner("Court Filing deadline locked into active calendar.");
        setNewDeadlineData({ caseId: '', title: '', dueDate: '', deadlineType: 'Court Filing', notes: '' });
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateData.caseId || !newUpdateData.message) return;

    const matchedCase = cases.find(c => c.id === newUpdateData.caseId);
    if (!matchedCase) return;

    try {
      const res = await fetch(`/api/firm/${companyId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: newUpdateData.caseId,
          clientId: matchedCase.clientId,
          draftedById: 'usr-admin-demo',
          message: newUpdateData.message,
          status: 'DRAFT',
          channelsSent: {}
        })
      });

      if (res.ok) {
        setActiveModal(null);
        showToastBanner("Client update drafts updated into dispatch queues.");
        setNewUpdateData({ caseId: '', message: '', channelEmail: true, channelWhatsapp: false, channelSms: false });
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Firm banner update helper
  const saveAnnouncementBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/firm/${companyId}/announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { announcement: announcementConfig } as any // custom handler accepts { announcement }
      });

      const res2 = await fetch(`/api/firm/${companyId}/announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement: announcementConfig })
      });

      if (res2.ok) {
        setAnnouncementModalOpen(false);
        showToastBanner("Banner configuration successfully deployed live.");
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Recharts stages mapping generator
  const getStageChartData = () => {
    const stageCounts: Record<string, number> = {};
    const defaultStages = settings?.caseStages || ["Client Consultation", "Pleadings Built", "Hearing Phase", "Archived"];
    
    defaultStages.forEach(st => {
      stageCounts[st] = 0;
    });

    cases.forEach(c => {
      if (c.status === 'ACTIVE') {
        const stage = c.currentStage || "Client Consultation";
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      }
    });

    return Object.keys(stageCounts).map(stage => ({
      name: stage.length > 15 ? stage.substring(0, 15) + '...' : stage,
      count: stageCounts[stage]
    }));
  };

  // Metrics Card click actions
  const handleMetricCardClick = (actionName: string) => {
    if (actionName === 'navigate_cases') {
      onNavigateTo('cases');
    } else if (actionName === 'popup_deadlines') {
      setQuickDetailItem({
        type: 'deadlines',
        data: upcomingDeadlinesList
      });
    } else if (actionName === 'popup_updates') {
      setQuickDetailItem({
        type: 'updates',
        data: pendingUpdatesList
      });
    } else if (actionName === 'navigate_chat') {
      onNavigateTo('chat');
    }
  };

  // Calendar rendering math helper
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getDeadlinesForDay = (day: Date) => {
    return deadlines.filter(d => {
      const dDate = new Date(d.dueDate);
      return dDate.getDate() === day.getDate() &&
             dDate.getMonth() === day.getMonth() &&
             dDate.getFullYear() === day.getFullYear();
    });
  };

  return (
    <div className="space-y-6 relative" id="dashboard-bento-viewport">

      {/* DYNAMIC FIRM ANNOUNCEMENT BANNER - TOP POSITION */}
      {announcementConfig?.isActive && announcementConfig?.position === 'top' && (
        <div 
          className="p-4 rounded-[18px] border relative transition-all duration-300 flex justify-between items-center animate-fade-in shadow-xs"
          style={{ backgroundColor: announcementConfig.backgroundColor, color: announcementConfig.textColor, borderColor: announcementConfig.textColor + '30' }}
          id="firm-announcement-top"
        >
          <div>
            <h4 className="font-extrabold text-sm flex items-center gap-2">
              <Volume2 className="h-4 w-4 animate-bounce" /> {announcementConfig.title || "Firm Announcement"}
            </h4>
            <p className="text-xs mt-1 font-medium">{announcementConfig.body}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setAnnouncementModalOpen(true)}
              className="text-[10px] px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-bold border border-white/20 transition-all uppercase"
            >
              Modify
            </button>
            <button 
              onClick={() => setAnnouncementConfig((prev: any) => ({ ...prev, isActive: false }))}
              className="text-xs hover:scale-105 opacity-80"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* TOP BAR / NAVIGATION HEADER ROW WITH GLOBAL PATTERN LABELS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/90 backdrop-blur-md p-6 rounded-[24px] border border-slate-200/60 shadow-sm gap-4 glass-style">
        <div className="space-y-1">
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 font-sans" id="greeting-banner-title">
              {greetingTitle}, {userName}
            </h1>
            {localConfig?.showFirmName && (
              <span className="text-[10px] bg-slate-100 text-slate-800 font-extrabold px-2.5 py-1 rounded-lg border border-slate-200 uppercase tracking-wide font-mono">
                {companyName}
              </span>
            )}
            <span className="text-[10px] bg-emerald-100/80 text-emerald-800 font-black px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE TENANT SECURE
            </span>
          </div>
          <p className="text-xs text-slate-800 font-bold" id="greeting-banner-desc">
            {localConfig?.greetingSubtext || "Manage case proceedings, schedule upcoming deadlines, and coordinate updates."}
          </p>
        </div>

        {/* Dynamic User Pill and Live Date Display */}
        <div className="flex flex-wrap items-center gap-3">
          {localConfig?.showDate && (
            <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl font-mono border border-slate-200/50">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-xxs">
            <div className="h-6 w-6 rounded-full bg-slate-900 text-sky-400 flex items-center justify-center text-xs font-black">
              {userName.substring(0, 1)}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-800 leading-none">{userName}</p>
              <p className="text-[8px] font-extrabold text-slate-900 mt-0.5 uppercase tracking-wide">Administrator</p>
            </div>
          </div>

          <button 
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`p-2 rounded-xl border transition ${isCustomizing ? 'bg-sky-450 bg-sky-400 text-slate-950 border-sky-400' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
            title="Configure Dashboard Bento Layout"
          >
            <Sliders className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* DYNAMIC FIRM ANNOUNCEMENT BANNER - BELOW-TOPBAR POSITION */}
      {announcementConfig?.isActive && announcementConfig?.position === 'below-topbar' && (
        <div 
          className="p-4 rounded-[18px] border relative transition-all duration-300 flex justify-between items-center animate-fade-in shadow-xs"
          style={{ backgroundColor: announcementConfig.backgroundColor, color: announcementConfig.textColor, borderColor: announcementConfig.textColor + '30' }}
          id="firm-announcement-below-topbar"
        >
          <div>
            <h4 className="font-extrabold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-bounce" /> {announcementConfig.title || "Attorney Alert Bulletin"}
            </h4>
            <p className="text-xs mt-1 font-medium text-slate-800" style={{ color: announcementConfig.textColor }}>{announcementConfig.body}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setAnnouncementModalOpen(true)}
              className="text-[10px] px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-bold border border-white/20 transition-all uppercase"
            >
              Modify
            </button>
            <button 
              onClick={() => setAnnouncementConfig((prev: any) => ({ ...prev, isActive: false }))}
              className="text-xs hover:scale-105 opacity-80"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* UNIVERSAL SEARCH BAR CONTAINER & DROPDOWN RESULTS */}
      <div className="relative mb-1" id="global-search-container">
        <div className="relative bg-white rounded-xl border border-slate-200 shadow-xxs flex items-center px-3.5 py-2.5 gap-2.5 transition-all">
          <Search className="text-slate-400 h-4.5 w-4.5" />
          <input 
            type="text" 
            placeholder="Search matching clients, cases, files, or notifications..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-normal text-slate-700 bg-transparent placeholder-slate-400 border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-normal hover:bg-slate-200 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Global Search Popover Overlay */}
        {searchQuery && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xxl z-40 max-h-[480px] overflow-hidden flex flex-col animate-fade-in">
            {/* Popover Filter Tab Headers */}
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap gap-1.5">
              {(['all', 'cases', 'clients', 'deadlines', 'chat'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSearchTab(tab)}
                  className={`text-xs px-3.5 py-1.5 font-black rounded-lg uppercase tracking-wider transition cursor-pointer ${searchTab === tab ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Results Grid Scroll Box */}
            <div className="p-4 overflow-y-auto space-y-4 flex-grow max-h-[360px]">
              {searching ? (
                <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Searching firm tenant databases...</span>
                </div>
              ) : searchResults ? (
                <>
                  {/* Cases Match */}
                  {(searchTab === 'all' || searchTab === 'cases') && searchResults.cases?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Matters matched ({searchResults.cases.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {searchResults.cases.map((c: any) => (
                          <div 
                            key={c.id} 
                            onClick={() => { onOpenCase(c.id); setSearchQuery(''); }}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 cursor-pointer flex justify-between items-center transition"
                          >
                            <div className="truncate">
                              <span className="text-[9px] font-mono font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">Ref: {c.referenceNumber}</span>
                              <h5 className="text-xs font-bold text-slate-800 mt-1 truncate">{c.caseType}</h5>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">Client: {c.clientName || 'Individual Client'}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-350" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clients Match */}
                  {(searchTab === 'all' || searchTab === 'clients') && searchResults.clients?.length > 0 && (
                    <div className="space-y-1.5 pet-search-results">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Clients matched ({searchResults.clients.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {searchResults.clients.map((cl: any) => (
                          <div 
                            key={cl.id}
                            onClick={() => { onNavigateTo('cases'); setSearchQuery(''); }}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 cursor-pointer flex justify-between items-center transition"
                          >
                            <div>
                              <h5 className="text-xs font-bold text-slate-800">{cl.fullName}</h5>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{cl.email || cl.phone}</p>
                            </div>
                            <span className="text-[9px] bg-slate-150 bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-600">
                              {cl.activeCasesCount} active case(s)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deadlines match */}
                  {(searchTab === 'all' || searchTab === 'deadlines') && searchResults.deadlines?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Court filings & deadlines ({searchResults.deadlines.length})</h4>
                      <div className="space-y-1.5">
                        {searchResults.deadlines.map((dl: any) => (
                          <div 
                            key={dl.id}
                            onClick={() => { onOpenCase(dl.caseId); setSearchQuery(''); }}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl cursor-pointer flex justify-between items-center transition"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-black bg-red-100 text-red-850 px-1.5 py-0.5 rounded tracking-wide font-mono uppercase">{dl.deadlineType || 'Filing'}</span>
                                <h5 className="text-xs font-bold text-slate-800">{dl.title}</h5>
                              </div>
                              <p className="text-[10px] text-slate-450 text-slate-400 mt-1">Matter Reference: <span className="font-mono text-slate-600 font-bold">{dl.caseRef}</span> — Client: {dl.clientName}</p>
                            </div>
                            <div className="text-right text-[10px] font-mono text-slate-500 font-semibold bg-white border px-2 py-1 rounded-lg">
                              Due: {new Date(dl.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chat matches */}
                  {(searchTab === 'all' || searchTab === 'chat') && searchResults.messages?.length > 0 && (
                    <div className="space-y-1.5 animate-fade-in">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Team Chat Messages matched ({searchResults.messages.length})</h4>
                      <div className="space-y-1.5">
                        {searchResults.messages.map((m: any) => (
                          <div 
                            key={m.id}
                            onClick={() => { onNavigateTo('chat'); setSearchQuery(''); }}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 border rounded-xl cursor-pointer flex gap-2"
                          >
                            <img src={m.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=Alex'} alt="" className="h-6 w-6 rounded-full" />
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">{m.senderName}</span>
                                <span className="text-[8px] text-slate-400 font-mono">{new Date(m.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-[11px] text-slate-505 text-slate-500 italic mt-0.5 truncate">"{m.message}"</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.cases?.length === 0 && searchResults.clients?.length === 0 && searchResults.deadlines?.length === 0 && searchResults.messages?.length === 0 && (
                    <div className="p-8 text-center text-slate-500 font-semibold text-sm">
                      No multi-tenant matches found for key query. Please update inputs.
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 font-semibold text-sm">
                  Type at least 2 characters to initiate global database search scan.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* LAYOUT CUSTOMIZER DRAWER SYSTEM */}
      {isCustomizing && (
        <div className="p-5 max-w-4xl mx-auto w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-[20px] border-[2px] border-slate-300 shadow-lg space-y-4 animate-fade-in" id="dashboard-layout-customizer-panel">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="text-indigo-600 h-5.5 w-5.5" />
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Configure Bento Dashboard DashboardWidgets</h3>
                <p className="text-[11px] font-semibold text-slate-500">Enable/disable, rename display headers, edit indices and save configurations back to companySettings.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setAnnouncementModalOpen(true)}
                className="px-3 py-1.5 bg-white text-slate-750 hover:bg-slate-100 text-[11px] font-semibold border-2 border-slate-250 border-slate-200 rounded-xl flex items-center gap-1 shadow-xxs cursor-pointer transition"
              >
                Config Announcement Banner
              </button>
              <button 
                disabled={savingLayout}
                onClick={handleSaveLayout}
                className="px-4 py-1.5 bg-[#00BCFF] hover:bg-sky-500 border-[2px] border-slate-800 text-black text-[11px] font-normal uppercase tracking-wider rounded-xl flex items-center gap-1 shadow-sm cursor-pointer transition"
              >
                {savingLayout ? (<Loader2 className="h-3 w-3 animate-spin text-black" />) : "Save Custom Layout"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {localWidgets.map((w, index) => (
              <div 
                key={w.widgetId}
                className={`p-3 bg-white border rounded-[16px] flex flex-col justify-between transition-all ${w.isVisible ? 'border-indigo-200 ring-2 ring-indigo-50/50' : 'border-slate-200 opacity-60'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black font-mono tracking-wider text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                      Type: {w.widgetType}
                    </span>
                    <input 
                      type="text" 
                      value={w.label} 
                      onChange={(e) => {
                        const next = [...localWidgets];
                        next[index].label = e.target.value;
                        setLocalWidgets(next);
                      }}
                      className="text-xs font-black text-slate-800 font-sans tracking-tight border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none w-full bg-transparent p-0.5"
                    />
                  </div>
                  
                  {/* Toggle controller */}
                  <button 
                    onClick={() => toggleWidgetVisible(w.widgetId)}
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase transition ${w.isVisible ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-150 bg-slate-200 text-slate-600'}`}
                  >
                    {w.isVisible ? 'Visible' : 'Hidden'}
                  </button>
                </div>

                <div className="flex gap-2 justify-between items-center pt-3 border-t border-slate-100 mt-3">
                  <span className="text-[10px] font-mono text-slate-400">Position index: {w.position}</span>
                  <div className="flex gap-1">
                    <button 
                      disabled={index === 0}
                      onClick={() => moveWidget(index, 'up')}
                      className="p-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-20"
                    >
                      <ArrowUp className="h-3 w-3 text-slate-600" />
                    </button>
                    <button 
                      disabled={index === localWidgets.length - 1}
                      onClick={() => moveWidget(index, 'down')}
                      className="p-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-20"
                    >
                      <ArrowDown className="h-3 w-3 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* METRIC CARDS GRID (stored in settings.dashboardConfig) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-metric-cards-container">
        {(localConfig?.metricCards || getDefaultConfig().metricCards).map((card: any) => {
          if (!card.isVisible) return null;

          // Hydrate count based on ID
          let displayVal = 0;
          if (card.id === 'card_active_cases') displayVal = activeCasesList.length;
          else if (card.id === 'card_deadlines_week') displayVal = upcomingDeadlinesList.length;
          else if (card.id === 'card_pending_updates') displayVal = pendingUpdatesList.length;
          else if (card.id === 'card_unread_messages') displayVal = 6; // Multi-tenant initial chats seeding

          const CardIcon = card.id === 'card_active_cases' ? Briefcase :
                           card.id === 'card_deadlines_week' ? Calendar :
                           card.id === 'card_pending_updates' ? MessageCircle : Bell;

          const isActive = selectedMetricId === card.id;

          // Custom styles per card ID (vibrant default landing state + premium active state)
          let activeCardClass = 'border-slate-305 border-slate-300 border-[2px] bg-slate-50/30 text-slate-800';
          let iconClass = 'bg-slate-100 border-slate-300 text-slate-700';
          let textAccentClass = 'text-slate-950 font-semibold';

          if (card.id === 'card_active_cases') {
            if (isActive) {
              activeCardClass = 'border-sky-500 border-[2px] bg-sky-100 text-sky-950 shadow-sm';
              iconClass = 'bg-sky-200 border-sky-400 text-sky-900';
              textAccentClass = 'text-sky-950 font-bold';
            } else {
              activeCardClass = 'border-sky-300 border-[2px] bg-sky-50/60 text-sky-900 hover:bg-sky-100 shadow-xxs transition duration-150';
              iconClass = 'bg-sky-100 border-sky-300 text-sky-700';
              textAccentClass = 'text-sky-900 font-semibold';
            }
          } else if (card.id === 'card_deadlines_week') {
            if (isActive) {
              activeCardClass = 'border-amber-500 border-[2px] bg-amber-100 text-amber-950 shadow-sm';
              iconClass = 'bg-amber-200 border-amber-400 text-amber-900';
              textAccentClass = 'text-amber-950 font-bold';
            } else {
              activeCardClass = 'border-amber-300 border-[2px] bg-amber-50/60 text-amber-900 hover:bg-amber-100 shadow-xxs transition duration-150';
              iconClass = 'bg-amber-100 border-amber-300 text-amber-700';
              textAccentClass = 'text-amber-900 font-semibold';
            }
          } else if (card.id === 'card_pending_updates') {
            if (isActive) {
              activeCardClass = 'border-purple-500 border-[2px] bg-purple-100 text-purple-950 shadow-sm';
              iconClass = 'bg-purple-200 border-purple-400 text-purple-900';
              textAccentClass = 'text-purple-950 font-bold';
            } else {
              activeCardClass = 'border-purple-300 border-[2px] bg-purple-50/60 text-purple-900 hover:bg-purple-100 shadow-xxs transition duration-150';
              iconClass = 'bg-purple-100 border-purple-300 text-purple-700';
              textAccentClass = 'text-purple-900 font-semibold';
            }
          } else {
            // card_unread_messages
            if (isActive) {
              activeCardClass = 'border-emerald-500 border-[2px] bg-emerald-100 text-emerald-950 shadow-sm';
              iconClass = 'bg-emerald-200 border-emerald-400 text-emerald-900';
              textAccentClass = 'text-emerald-950 font-bold';
            } else {
              activeCardClass = 'border-emerald-300 border-[2px] bg-emerald-50/60 text-emerald-900 hover:bg-emerald-100 shadow-xxs transition duration-150';
              iconClass = 'bg-emerald-100 border-emerald-300 text-emerald-700';
              textAccentClass = 'text-emerald-900 font-semibold';
            }
          }

          return (
            <div 
              key={card.id}
              onClick={() => {
                setSelectedMetricId(isActive ? null : card.id);
                handleMetricCardClick(card.clickAction);
              }}
              className={`cursor-pointer p-4 rounded-[16px] flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm border-[2px] ${activeCardClass}`}
              id={card.id}
            >
              <div className="space-y-0.5">
                <h4 className={`text-[11px] font-normal uppercase tracking-wider ${isActive ? textAccentClass : 'text-slate-500'}`}>
                  {card.id === 'card_active_cases' ? getTerm('activeCases', settings) :
                   card.id === 'card_deadlines_week' ? getTerm('deadlines', settings) :
                   card.id === 'card_pending_updates' ? getTerm('clientUpdates', settings) :
                   card.label}
                </h4>
                <div className="flex items-baseline gap-1 font-sans">
                  <span className={`text-2xl font-normal tracking-tight ${isActive ? textAccentClass : 'text-slate-900'}`}>
                    {displayVal}
                  </span>
                  {displayVal >= card.threshold && (
                    <span 
                      className={`text-[8px] font-mono font-normal uppercase tracking-wider px-1 py-0.2 rounded border ${
                        isActive ? 'bg-slate-100/50 text-slate-600 border-slate-200' : 'bg-slate-100 text-slate-600 border-slate-200 shadow-xxs'
                      }`}
                    >
                      Limit threshold
                    </span>
                  )}
                </div>
              </div>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center border-[2px] transition ${iconClass}`}>
                <CardIcon className="h-4.5 w-4.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN DYNAMICALLY RENDERED BENTO WIDGETS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="dashboard-dynamic-widgets-grid">
        
        {/* CORE WORKSPACE PANEL SYSTEM - MANDATORY */}
        {localWidgets.filter(w => w.isVisible && ['upcoming_deadlines', 'pending_updates', 'recent_activity'].includes(w.widgetType)).map(widget => {
          
          // --- 1. UPCOMING COURT DEADLINES WIDGET ---
          if (widget.widgetType === 'upcoming_deadlines') {
            const isWidgetCollapsed = collapsedWidgets[widget.widgetId];
            return (
              <div 
                key={widget.widgetId}
                className="lg:col-span-12 xl:col-span-8 bg-white rounded-[24px] border-[2px] border-slate-200 p-5 shadow-sm space-y-3.5 widget-upcoming-deadlines flex flex-col justify-between"
                id={`widget-${widget.widgetId}`}
              >
                <div>
                  <div 
                    onClick={() => setCollapsedWidgets(prev => ({ ...prev, [widget.widgetId]: !prev[widget.widgetId] }))}
                    className="flex justify-between items-center cursor-pointer hover:bg-slate-50/85 p-2 rounded-xl transition select-none"
                    title="Click header to collapse or expand"
                  >
                    <div className="space-y-0.5 flex items-center gap-2.5">
                      <div className="h-8.5 w-8.5 rounded-lg bg-[#00BCFF]/10 flex items-center justify-center border border-[#00BCFF]/20 text-[#00BCFF]">
                        <Calendar className="h-4.5 w-4.5" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xs font-normal text-slate-900 uppercase tracking-wider font-display">
                          {widget.label}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-normal">Filtering next {widget.config?.daysAhead || 7} working days.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-amber-100/65 text-amber-800 text-[9px] font-normal px-2.5 py-0.5 rounded-full font-mono uppercase">
                        {upcomingDeadlinesList.length} REMINDERS
                      </span>
                      {isWidgetCollapsed ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {!isWidgetCollapsed && (
                    <div className="space-y-3 mt-3 animate-fade-in">
                      {/* View mode toggle triggers */}
                      <div className="flex justify-end p-0.5">
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeadlineViewMode('list'); }}
                            className={`text-[9px] uppercase tracking-wider font-normal px-2.5 py-1 rounded transition-all cursor-pointer ${deadlineViewMode === 'list' ? 'bg-white text-slate-950 shadow-xxs' : 'text-slate-500 hover:text-slate-950'}`}
                          >
                            List view
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeadlineViewMode('calendar'); }}
                            className={`text-[9px] uppercase tracking-wider font-normal px-2.5 py-1 rounded transition-all cursor-pointer ${deadlineViewMode === 'calendar' ? 'bg-white text-slate-950 shadow-xxs' : 'text-slate-500 hover:text-slate-950'}`}
                          >
                            Monthly Grid
                          </button>
                        </div>
                      </div>

                      {deadlineViewMode === 'list' ? (
                        upcomingDeadlinesList.length === 0 ? (
                          <div className="p-10 text-center text-slate-400 border border-dashed rounded-[20px] text-xs">
                            No critical court filings listed within targeted date ranges.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {upcomingDeadlinesList.slice(0, 6).map(dead => {
                              const diff = Math.ceil((new Date(dead.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                              const color = diff <= 1 ? 'border-red-150 bg-red-50/15' : diff <= 3 ? 'border-amber-105 bg-amber-50/10' : 'border-slate-100 bg-slate-50/20';
                              return (
                                <div 
                                  key={dead.id}
                                  onClick={() => onOpenCase(dead.caseId)}
                                  className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer hover:bg-slate-50 hover:shadow-xs transition-all ${color}`}
                                >
                                  <div className="truncate space-y-0.5">
                                    <span className="text-[7.5px] font-mono font-normal text-slate-500 uppercase bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                      REF: {dead.caseRef}
                                    </span>
                                    <h4 className="text-xs font-normal text-slate-800 truncate" title={dead.title}>{dead.title}</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-normal">
                                      <User className="h-3 w-3 text-slate-400" /> {dead.clientName}
                                    </p>
                                  </div>
                                  <div className="text-right flex flex-col justify-center items-end ml-2 shrink-0">
                                    <span className={`text-[8.5px] px-1.5 py-0.5 font-normal rounded font-mono tracking-wide ${diff <= 1 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-100 text-slate-650 border border-slate-200'}`}>
                                      {diff <= 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `${diff} days`}
                                    </span>
                                    <span className="text-[9px] text-slate-450 mt-1 font-normal font-mono">{new Date(dead.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        /* INTERACTIVE MONTHLY GRID CALENDAR */
                        <div className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[11px] font-normal text-slate-600 uppercase font-mono">
                              {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex gap-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)); }}
                                className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-normal cursor-pointer"
                              >
                                Prev
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)); }}
                                className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-normal cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[10px] text-slate-700 uppercase font-bold border-b border-slate-200 pb-1.5">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="tracking-wide">{d}</div>)}
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(calendarDate).map((day, dIdx) => {
                              if (!day) return <div key={`empty-${dIdx}`} className="bg-slate-50/20 rounded-lg min-h-[50px]" />;
                              const dls = getDeadlinesForDay(day);
                              const isToday = new Date().toDateString() === day.toDateString();
                              const hasDeadlines = dls.length > 0;
                              
                              const containerClass = isToday 
                                ? 'border-[#00BCFF] bg-sky-50 text-slate-900 ring-2 ring-sky-100' 
                                : hasDeadlines 
                                  ? 'border-amber-400 bg-amber-50/90 text-amber-950 shadow-sm ring-1 ring-amber-300/40' 
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 text-slate-800';

                              const textClass = isToday 
                                ? 'text-sky-600 font-black font-mono pl-1 t-0 text-xs md:text-[13px]' 
                                : hasDeadlines 
                                  ? 'text-amber-805 text-amber-900 font-black font-mono pl-1 t-0 text-xs md:text-[13px]' 
                                  : 'text-slate-600 font-bold font-mono pl-1 t-0 text-xs md:text-[13px]';

                              return (
                                <div 
                                  key={day.toISOString()} 
                                  className={`p-1.5 border rounded-xl min-h-[50px] flex flex-col justify-between transition-all ${containerClass}`}
                                >
                                  <span className={textClass}>
                                    {day.getDate()}
                                  </span>
                                  {dls.length > 0 && (
                                    <div className="space-y-1 mt-1">
                                      {dls.slice(0, 2).map((dl: any) => (
                                        <div 
                                          key={dl.id} 
                                          onClick={(resEvent) => { resEvent.stopPropagation(); onOpenCase(dl.caseId); }}
                                          className="text-[8.5px] px-1 py-0.5 bg-white text-amber-850 hover:text-amber-950 border border-amber-250 font-bold rounded-lg leading-tight truncate cursor-pointer hover:bg-amber-100 transition shadow-xxs"
                                          title={`${dl.title} (Click to open matter details)`}
                                        >
                                          {dl.title}
                                        </div>
                                      ))}
                                      {dls.length > 2 && <div className="text-[6.5px] text-center font-bold text-amber-800 font-mono">+{dls.length - 2} more</div>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isWidgetCollapsed && (
                  <div className="pt-2.5 border-t border-slate-105 border-slate-100 flex justify-between items-center text-[10px] text-slate-450 mt-3.5">
                    <span className="flex items-center gap-1 font-normal text-slate-400"><FileCheck className="h-3 w-3 text-emerald-500" /> Synchronized secure state tenancy.</span>
                    <button 
                      onClick={() => {
                        onNavigateTo('reminders');
                        showToastBanner("Opening upcoming court deadlines calendar.");
                      }}
                      className="text-[10px] text-sky-600 hover:text-sky-850 font-semibold flex items-center gap-0.5 uppercase tracking-wider cursor-pointer"
                    >
                      + Quick Deadline Lock
                    </button>
                  </div>
                )}
              </div>
            );
          }

          // --- 2. PENDING CLIENT UPDATES WIDGET (COMMUNICATOR) ---
          if (widget.widgetType === 'pending_updates') {
            const isWidgetCollapsed = collapsedWidgets[widget.widgetId];
            return (
              <div 
                key={widget.widgetId}
                className="lg:col-span-12 xl:col-span-4 bg-white/95 backdrop-blur-md rounded-[24px] border-[2px] border-slate-200 p-6 shadow-sm widget-pending-updates flex flex-col justify-between min-h-[360px] glass-style transition-all duration-300 animate-fade-in"
                id={`widget-${widget.widgetId}`}
              >
                <div>
                  {/* Title Header with click-to-collapse toggle */}
                  <div 
                    onClick={() => setCollapsedWidgets(prev => ({ ...prev, [widget.widgetId]: !prev[widget.widgetId] }))}
                    className="flex justify-between items-center cursor-pointer hover:bg-slate-50/85 p-2 rounded-xl transition select-none"
                    title="Click header to collapse or expand communicator widget"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8.5 w-8.5 rounded-lg bg-[#00BCFF]/10 flex items-center justify-center border border-[#00BCFF]/20 text-[#00BCFF]">
                        <MessageSquare className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="text-xs font-normal text-slate-900 uppercase tracking-wider">
                        {widget.label}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-sky-100/65 text-sky-800 text-[9px] font-normal px-2.5 py-0.5 rounded-full font-mono uppercase">
                        {pendingUpdatesList.length} QUEUED
                      </span>
                      {isWidgetCollapsed ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {!isWidgetCollapsed && (
                    <>
                      {pendingUpdatesList.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 border border-dashed rounded-[20px] text-xs mt-4 flex flex-col items-center justify-center min-h-[160px]">
                          <CheckCircle2 className="h-8 w-8 text-slate-200 mb-2" />
                          <span>All firm draft updates reviewed & dispatched. Queue clear.</span>
                        </div>
                      ) : (
                        <div className="space-y-4 mt-4">
                          {pendingUpdatesList.slice(0, widget.config?.limit || 2).map((upd: any) => {
                            const isDraftExpanded = !!expandedUpdates[upd.id];
                            const isEditing = editingUpdateId === upd.id;
                            
                            // Initialize local channel selections for dynamic visual checkboxes
                            const channels = draftChannels[upd.id] || { email: true, whatsapp: true, sms: false };
                            const signature = draftSignature[upd.id] || userName;

                            const toggleChannel = (type: 'email' | 'whatsapp' | 'sms') => {
                              setDraftChannels(prev => ({
                                ...prev,
                                [upd.id]: {
                                  ...channels,
                                  [type]: !channels[type]
                                }
                              }));
                            };

                            // Apply templates immediately rewrite text
                            const applyTemplate = (tpl: 'status' | 'hearing' | 'docs' | 'settlement' | 'general') => {
                              let msg = upd.message;
                              if (tpl === 'status') {
                                msg = `Dear Client, Regarding your matter ${upd.caseRef}, we've completed our weekly review. Plaudits are on track, and our submissions are fully compliant. Best regards, ${signature}.`;
                              } else if (tpl === 'hearing') {
                                msg = `Urgent Update on ${upd.caseRef}: A courtroom conference has been scheduled. Please ensure you are available. A briefing pack is attached. Sincerely, ${signature}.`;
                              } else if (tpl === 'docs') {
                                msg = `Document Request for ${upd.caseRef}: We kindly ask you to submit your signed affidavits and invoice drafts by email. Advise if you require assistance. Warmly, ${signature}.`;
                              } else if (tpl === 'settlement') {
                                msg = `Settlement Discussion on ${upd.caseRef}: Opponents offered a confidential mediation proposal. We need to schedule a consultation immediately. Regards, ${signature}.`;
                              } else {
                                msg = `Routine Case Update: Matter proceedings are advancing smoothly. We remain on standby for final listings. Best, ${signature}.`;
                              }
                              setEditingTextMessage(msg);
                              if (!isEditing) {
                                startEditUpdate(upd);
                                setEditingTextMessage(msg);
                              }
                            };

                            // Apply AI tone presets smoothly rewrite text
                            const applyTonePreset = (tone: 'formal' | 'warm' | 'brief') => {
                              let msg = isEditing ? editingTextMessage : upd.message;
                              if (tone === 'formal') {
                                msg = `Formal Advice: Notice is hereby served in connection with matter reference ${upd.caseRef}. Be advised that counsel is preparing final affidavits. Sincerely, ${signature}.`;
                              } else if (tone === 'warm') {
                                msg = `Hi! Hope you are doing well. Just a quick reassurance that everything with matter ${upd.caseRef} is on track and looking great! Let me know if you need anything. Best, ${signature}.`;
                              } else if (tone === 'brief') {
                                msg = `Case ${upd.caseRef} Update: Pleadings under active trial preparation. Advancements secured. Regards, ${signature}.`;
                              }
                              setEditingTextMessage(msg);
                              if (!isEditing) {
                                startEditUpdate(upd);
                                setEditingTextMessage(msg);
                              }
                            };

                            return (
                              <div 
                                key={upd.id} 
                                className={`p-4 bg-slate-50/60 border rounded-2xl hover:shadow-md transition duration-300 ${isDraftExpanded ? 'ring-2 ring-sky-300 bg-white border-sky-200' : 'border-slate-200'}`}
                              >
                                {/* Client summary row clicks to expand particulars */}
                                <div 
                                  onClick={() => setExpandedUpdates(prev => ({ ...prev, [upd.id]: !prev[upd.id] }))}
                                  className="flex justify-between items-start cursor-pointer hover:opacity-85 select-none"
                                  title="Click to toggle communication parameters and options"
                                >
                                  <div>
                                    <div className="flex items-center gap-2 font-sans">
                                      <h4 className="text-xs font-medium text-slate-800 truncate max-w-[150px]">{upd.clientName}</h4>
                                      <span className="text-[8.5px] font-normal bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded-full border border-sky-100">Draft Loaded</span>
                                    </div>
                                    <span className="text-[8.5px] text-slate-400 font-mono bg-white border border-slate-150 px-1.5 py-0.5 rounded mt-1 inline-block">REF ID: {upd.caseRef}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] font-normal bg-[#00BCFF]/10 text-sky-850 px-1.5 py-0.5 rounded border border-[#00BCFF]/20 font-mono uppercase">
                                      AI AutoDraft
                                    </span>
                                    {isDraftExpanded ? <ChevronUp className="h-4 w-4 text-slate-450" /> : <ChevronDown className="h-4 w-4 text-slate-450" />}
                                  </div>
                                </div>

                                {/* Body remains hidden unless item expanded */}
                                {isDraftExpanded ? (
                                  <div className="space-y-4 pt-3 border-t border-slate-200 animate-fade-in text-xs">
                                    
                                    {/* Selectable Templates Selector */}
                                    <div className="space-y-1">
                                      <span className="block text-[8px] text-slate-400 font-black uppercase tracking-wider font-mono">Select Letter / Notice Templates</span>
                                      <div className="flex flex-wrap gap-1">
                                        {[
                                          { id: 'status', label: 'Weekly Report' },
                                          { id: 'hearing', label: 'Court Date' },
                                          { id: 'docs', label: 'Request Docs' },
                                          { id: 'settlement', label: 'Offer Alert' },
                                          { id: 'general', label: 'General' }
                                        ].map(t => (
                                          <button
                                            key={t.id}
                                            onClick={() => applyTemplate(t.id as any)}
                                            className="text-[9px] px-2 py-1 bg-white hover:bg-slate-50 border rounded-lg font-bold text-slate-600 transition cursor-pointer"
                                          >
                                            {t.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Edit state textbox */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center">
                                        <label className="block text-[8px] text-slate-400 font-black uppercase tracking-wider">Draft Message Dispatch Core</label>
                                        <button 
                                          onClick={() => {
                                            if (!isEditing) startEditUpdate(upd);
                                            else setEditingUpdateId(null);
                                          }} 
                                          className="text-[9px] text-sky-600 hover:text-sky-800 font-black flex items-center gap-0.5 underline uppercase tracking-tight cursor-pointer"
                                        >
                                          {isEditing ? 'lock field' : 'manual clean edit'}
                                        </button>
                                      </div>
                                      
                                      {isEditing ? (
                                        <div className="w-full border border-slate-200 rounded-lg overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-sky-200 focus-within:border-sky-400">
                                          {/* Rich Text Editor Toolbar */}
                                          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-50 border-b border-slate-200 select-none">
                                            <button 
                                              type="button"
                                              onClick={() => handleTextareaStyle(upd.id, '**', '**', 'bold text')} 
                                              className="p-1 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer" 
                                              title="Bold text"
                                            >
                                              <Bold className="h-3 w-3" />
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={() => handleTextareaStyle(upd.id, '*', '*', 'italic text')} 
                                              className="p-1 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer" 
                                              title="Italic text"
                                            >
                                              <Italic className="h-3 w-3" />
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={() => handleTextareaStyle(upd.id, '<u>', '</u>', 'underline text')} 
                                              className="p-1 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer" 
                                              title="Underline text"
                                            >
                                              <Underline className="h-3 w-3" />
                                            </button>
                                            <span className="w-px h-3.5 bg-slate-300 mx-1" />
                                            <button 
                                              type="button"
                                              onClick={() => handleTextareaStyle(upd.id, '[', '](https://company.clientportal.com/shared/matter_brief_SLA.pdf)', 'Reference Link')} 
                                              className="flex items-center gap-1 py-0.5 px-1.5 hover:bg-slate-200 text-[9px] font-bold text-slate-700 rounded transition cursor-pointer" 
                                              title="Insert Shared Doc URL Link"
                                            >
                                              <Link className="h-3 w-3 text-sky-500" /> Link
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={() => handleTextareaStyle(upd.id, '[Attached: ', ']', 'Signed_SLA_Release_Letter.pdf')} 
                                              className="flex items-center gap-1 py-0.5 px-1.5 hover:bg-slate-200 text-[9px] font-bold text-slate-700 rounded transition cursor-pointer" 
                                              title="Attach Matter File"
                                            >
                                              <FileText className="h-3 w-3 text-emerald-500" /> Doc Ref
                                            </button>
                                            <button 
                                              type="button"
                                              onClick={() => handleTextareaStyle(upd.id, '\n- ', '', 'Item details list item')} 
                                              className="p-1 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer" 
                                              title="Bullet List"
                                            >
                                              <List className="h-3 w-3" />
                                            </button>
                                          </div>
                                          <textarea
                                            id={`textarea-edit-${upd.id}`}
                                            rows={4}
                                            value={editingTextMessage}
                                            onChange={e => setEditingTextMessage(e.target.value)}
                                            className="w-full text-[11px] font-sans p-2.5 bg-white outline-none leading-relaxed text-slate-800 border-none"
                                            placeholder="Write client broadcast message draft..."
                                          />
                                        </div>
                                      ) : (
                                        <div className="p-3 bg-slate-50 border rounded-xl border-slate-200 text-[11.5px] leading-relaxed text-slate-700 font-sans">
                                          {parseRichText(upd.message)}
                                        </div>
                                      )}
                                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mt-0.5">
                                        <span>Words check: {(isEditing ? editingTextMessage : upd.message).split(/\s+/).filter(Boolean).length} words</span>
                                        <span>Characters check: {(isEditing ? editingTextMessage : upd.message).length} chars</span>
                                      </div>
                                    </div>

                                    {/* File attachment simulator */}
                                    <div className="space-y-1">
                                      <span className="block text-[8px] text-slate-400 font-black uppercase tracking-wider font-mono">Attachment Options (Simulated)</span>
                                      <div className="flex gap-1.5">
                                        <button 
                                          onClick={() => {
                                            const appendText = isEditing ? editingTextMessage : upd.message;
                                            setEditingTextMessage(appendText + " [Attachment: Court_Pleadings_Archived.pdf]");
                                            if (!isEditing) startEditUpdate(upd);
                                            showToastBanner("Pleadings PDF attached to communication draft.");
                                          }}
                                          className="flex-1 py-1 px-2 border border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 text-[9px] font-bold text-slate-500 flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                          📎 Court_Pleadings.pdf
                                        </button>
                                        <button 
                                          onClick={() => {
                                            const appendText = isEditing ? editingTextMessage : upd.message;
                                            setEditingTextMessage(appendText + " [Attachment: Billing_Statement.pdf]");
                                            if (!isEditing) startEditUpdate(upd);
                                            showToastBanner("Statement PDF attached to communication draft.");
                                          }}
                                          className="flex-1 py-1 px-2 border border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 text-[9px] font-bold text-slate-500 flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                          📎 Billing_Statement.pdf
                                        </button>
                                      </div>
                                    </div>

                                    {/* Tone presets panel */}
                                    <div className="space-y-1 bg-slate-100/60 p-2.5 rounded-xl border">
                                      <span className="block text-[8.5px] text-slate-500 font-black uppercase font-mono tracking-wider">Tether Intelligent Tone Selector</span>
                                      <div className="flex gap-1.5 mt-1">
                                        <button 
                                          onClick={() => applyTonePreset('formal')}
                                          className="flex-1 py-1.5 px-1 bg-white text-slate-700 font-bold border border-slate-150 rounded-lg text-[9px] hover:bg-slate-50 transition cursor-pointer"
                                        >
                                          Formal Courtly
                                        </button>
                                        <button 
                                          onClick={() => applyTonePreset('warm')}
                                          className="flex-1 py-1.5 px-1 bg-white text-slate-700 font-bold border border-slate-150 rounded-lg text-[9px] hover:bg-slate-50 transition cursor-pointer"
                                        >
                                          Friendly Client
                                        </button>
                                        <button 
                                          onClick={() => applyTonePreset('brief')}
                                          className="flex-1 py-1.5 px-1 bg-white text-slate-700 font-bold border border-slate-150 rounded-lg text-[9px] hover:bg-slate-50 transition cursor-pointer"
                                        >
                                          Short Brief
                                        </button>
                                      </div>
                                    </div>

                                    {/* Notification channel checkboxes */}
                                    <div className="grid grid-cols-3 gap-1.5 py-1">
                                      <label className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-600 truncate cursor-pointer bg-white border border-slate-200 p-2 rounded-xl select-none transition hover:bg-slate-50">
                                        <div className="relative flex items-center justify-center">
                                          <input 
                                            type="checkbox" 
                                            checked={channels.email} 
                                            onChange={() => toggleChannel('email')}
                                            className="sr-only" 
                                          />
                                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                                            channels.email 
                                              ? 'border-blue-500 bg-blue-500' 
                                              : 'border-slate-300 bg-white'
                                          }`}>
                                            {channels.email && (
                                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-scale-up" />
                                            )}
                                          </div>
                                        </div>
                                        <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                                      </label>
                                      <label className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-600 truncate cursor-pointer bg-white border border-slate-200 p-2 rounded-xl select-none transition hover:bg-slate-50">
                                        <div className="relative flex items-center justify-center">
                                          <input 
                                            type="checkbox" 
                                            checked={channels.whatsapp} 
                                            onChange={() => toggleChannel('whatsapp')}
                                            className="sr-only" 
                                          />
                                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                                            channels.whatsapp 
                                              ? 'border-blue-500 bg-blue-500' 
                                              : 'border-slate-300 bg-white'
                                          }`}>
                                            {channels.whatsapp && (
                                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-scale-up" />
                                            )}
                                          </div>
                                        </div>
                                        <MessageCircle className="h-3.5 w-3.5 text-slate-400" /> WhatsApp
                                      </label>
                                      <label className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-600 truncate cursor-pointer bg-white border border-slate-200 p-2 rounded-xl select-none transition hover:bg-slate-50">
                                        <div className="relative flex items-center justify-center">
                                          <input 
                                            type="checkbox" 
                                            checked={channels.sms} 
                                            onChange={() => toggleChannel('sms')}
                                            className="sr-only" 
                                          />
                                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                                            channels.sms 
                                              ? 'border-blue-500 bg-blue-500' 
                                              : 'border-slate-300 bg-white'
                                          }`}>
                                            {channels.sms && (
                                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-scale-up" />
                                            )}
                                          </div>
                                        </div>
                                        <Smartphone className="h-3.5 w-3.5 text-slate-400" /> SMS Text
                                      </label>
                                    </div>

                                    {/* Sign-off text and Action control buttons */}
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-250">
                                      <div className="space-y-1">
                                        <label className="block text-[8px] text-slate-400 font-extrabold uppercase font-mono tracking-wider text-slate-450 border-none">Attorney Signoff stamp</label>
                                        <input 
                                          type="text" 
                                          value={signature} 
                                          onChange={e => setDraftSignature(prev => ({ ...prev, [upd.id]: e.target.value }))}
                                          className="w-full text-[10px] p-1 border rounded bg-white text-slate-800 font-medium outline-none"
                                          placeholder="Attorney Name"
                                        />
                                      </div>
                                      <div className="flex gap-1.5 justify-end items-end">
                                        {isEditing ? (
                                          <>
                                            <button 
                                              onClick={() => handleSaveInlineEdit(upd.id)}
                                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] rounded-lg shadow-xxs cursor-pointer"
                                            >
                                              Save
                                            </button>
                                            <button 
                                              onClick={() => setEditingUpdateId(null)}
                                              className="px-2.5 py-1.5 bg-slate-200 text-slate-600 font-bold text-[9px] rounded-lg cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button 
                                              disabled={loadingSendId === upd.id}
                                              onClick={() => openConsentModal(upd)}
                                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-white font-black text-[9px] rounded-lg flex items-center gap-1 shadow-md cursor-pointer"
                                            >
                                              {loadingSendId === upd.id ? (
                                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                              ) : (
                                                <Send className="h-2.5 w-2.5" />
                                              )}
                                              Dispatch Update
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  /* Clean, short line preview when collapsed */
                                  <p className="text-[11px] text-slate-950 leading-normal truncate italic font-bold mt-1 bg-slate-50/50 p-1 rounded">
                                    "{upd.message}"
                                  </p>
                                )}
                              </div>
                            );
                          })}

                          {pendingUpdatesList.length > (widget.config?.limit || 2) && (
                            <button 
                              onClick={() => onNavigateTo('updates')}
                              className="w-full py-2 border border-dashed border-slate-350 hover:border-slate-400 hover:bg-slate-50 text-slate-800 hover:text-slate-950 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all"
                            >
                              + {pendingUpdatesList.length - (widget.config?.limit || 2)} more updates reviewable inside updates lobby
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!isWidgetCollapsed && (
                  <div className="pt-3 border-t border-slate-100 mt-4">
                    <button 
                      onClick={() => onNavigateTo('updates')}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-xxs tracking-wider uppercase rounded-xl flex items-center justify-center gap-1 shadow-xxs border border-slate-205"
                    >
                      Manage Communications Desk
                    </button>
                  </div>
                )}
              </div>
            );
          }

          // --- 3. RECENT ACTIVITY WIDGET ---
          if (widget.widgetType === 'recent_activity') {
            const isWidgetCollapsed = collapsedWidgets[widget.widgetId];
            return (
              <div 
                key={widget.widgetId}
                className="lg:col-span-12 xl:col-span-12 bg-white rounded-[24px] border-[2px] border-slate-200 p-5 shadow-sm widget-recent-activity flex flex-col justify-between"
                id={`widget-${widget.widgetId}`}
              >
                <div>
                  {/* Click header to collapse or expand recent activity tracks */}
                  <div 
                    onClick={() => setCollapsedWidgets(prev => ({ ...prev, [widget.widgetId]: !prev[widget.widgetId] }))}
                    className="flex justify-between items-center cursor-pointer hover:bg-slate-50/85 p-2 rounded-xl transition select-none"
                    title="Click header to collapse or expand telemetry logs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8.5 w-8.5 rounded-lg bg-[#00BCFF]/10 flex items-center justify-center border border-[#00BCFF]/20 text-[#00BCFF]">
                        <Briefcase className="h-4.5 w-4.5" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xs font-normal text-slate-900 uppercase tracking-wider font-display">
                          {widget.label}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-normal">Firmwide audit logging chronological trail</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-[#00BCFF]/10 text-[#00BCFF] text-[9px] font-normal px-2.5 py-0.5 rounded-full font-mono uppercase">
                        {displayEvents.length} ACTIVITIES
                      </span>
                      {isWidgetCollapsed ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>
                  
                  {!isWidgetCollapsed && (
                    <div className="animate-fade-in">
                      {displayEvents.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 border border-dashed rounded-[20px] text-xs mt-3">
                          No trial records or logging tracks created. Matter logs appear chronologically.
                        </div>
                      ) : (
                        <div className="relative pl-3.5 space-y-3 mt-3 max-h-[220px] overflow-y-auto pr-1 no-scrollbar before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                          {displayEvents.map((ev, idx) => (
                            <div key={idx} className="relative group text-xs animate-fade-in">
                              <div className="absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full bg-[#00BCFF] border border-white flex items-center justify-center ring-4 ring-[#00BCFF]/10" />
                              <div className="space-y-0.5">
                                <div className="flex justify-between items-center text-[9px]">
                                  <span className="font-normal text-[#00BCFF] font-mono">CASE {ev.caseRef}</span>
                                  <span className="text-slate-400 font-normal font-mono">{new Date(ev.eventDate || ev.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h5 className="font-medium text-slate-800 truncate">{ev.title}</h5>
                                <p className="text-[10px] text-slate-500 font-normal line-clamp-2 leading-normal">{ev.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isWidgetCollapsed && (
                  <div className="pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-normal flex items-center gap-1.5 mt-3.5 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Telemetry logs synchronized instantly</span>
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}

        {/* ORGANIZER TAB BOARD DESK FOR OPTIONAL PLUGINS */}
        <div className="col-span-12 mt-4" id="optional-dashboard-desks-selector">
          <div className="glass-style relative px-5 py-4 rounded-[16px] border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-50 to-white/70">
            <div className="space-y-0.5">
              <span className="text-[9px] font-normal uppercase tracking-widest text-[#00BCFF] font-mono">Bento Dashboard Desk Organizer</span>
              <h4 className="text-xs font-normal text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <LayoutGrid className="h-4 w-4 text-[#00BCFF]" strokeWidth={2.0} /> Optional Workspace Desks
              </h4>
              <p className="text-[10px] text-slate-400 font-normal">Click a desk below to instantly toggle visibility.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {localWidgets.filter(w => ['cases_status', 'docs_awaiting', 'today_agenda', 'notifications_panel'].includes(w.widgetId)).map(w => {
                const isActive = w.isVisible;
                const toggle = async () => {
                  const updated = localWidgets.map(widget => {
                    if (widget.widgetId === w.widgetId) {
                      return { ...widget, isVisible: !widget.isVisible };
                    }
                    return widget;
                  });
                  setLocalWidgets(updated);
                  try {
                    await fetch(`/api/firm/${companyId}/settings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        dashboardWidgets: updated,
                        dashboardConfig: localConfig
                      })
                    });
                    if (onRefresh) onRefresh();
                    showToastBanner(`${w.label} visibility configured.`);
                  } catch (e) {
                    console.error(e);
                  }
                };
                
                return (
                  <button
                    key={w.widgetId}
                    type="button"
                    onClick={toggle}
                    className={`text-[11px] px-3.5 py-1.5 font-normal rounded-xl uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer border ${isActive ? 'bg-[#00BCFF] border-[#00BCFF] text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
                    {w.widgetId === 'cases_status' ? 'Matters Stage Chart' :
                     w.widgetId === 'docs_awaiting' ? 'Documents Action' :
                     w.widgetId === 'today_agenda' ? 'Today\'s Agenda' : 'Alert Telemetry'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CORE WORKSPACE PANEL SYSTEM - OPTIONAL / REARRANGEABLE BELOW FEED */}
        {(() => {
          const visibleOptionalWidgets = localWidgets.filter(w => w.isVisible && !['upcoming_deadlines', 'pending_updates', 'recent_activity'].includes(w.widgetType));
          const optionalCount = visibleOptionalWidgets.length;
          
          return visibleOptionalWidgets.map((widget, optIndex) => {
            const spanClass = (optionalCount === 1 || (optionalCount % 2 !== 0 && optIndex === optionalCount - 1)) 
              ? 'lg:col-span-12 xl:col-span-12' 
              : 'lg:col-span-12 xl:col-span-6';

            // --- 4. CASES BY STATUS / STAGE CHART WIDGET (RECHARTS) ---
            if (widget.widgetType === 'cases_status') {
            const chartData = getStageChartData();
            const isWidgetCollapsed = collapsedWidgets[widget.widgetId];
            return (
              <div 
                key={widget.widgetId}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.widgetId)}
                onDragOver={(e) => handleDragOver(e, widget.widgetId)}
                onDrop={(e) => handleDrop(e, widget.widgetId)}
                className={`${spanClass} bg-white/95 backdrop-blur-md rounded-[24px] border-[2px] border-slate-200 p-5 shadow-sm widget-cases-status flex flex-col justify-between transition-all duration-300 relative ${draggedWidgetId === widget.widgetId ? 'opacity-30 scale-95 border-sky-400 border-dashed border-2' : ''}`}
                id={`widget-${widget.widgetId}`}
              >
                <div>
                  <div className="flex justify-between items-center select-none">
                    <div 
                      onClick={() => setCollapsedWidgets(prev => ({ ...prev, [widget.widgetId]: !prev[widget.widgetId] }))}
                      className="flex items-center gap-2 hover:opacity-85 flex-1 py-1 cursor-pointer"
                      title="Click to collapse/expand Cases widget"
                    >
                      <div className="h-8 w-8 rounded-lg bg-[#00BCFF]/10 flex items-center justify-center border border-[#00BCFF]/20 text-[#00BCFF]">
                        <Layers className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="text-xs font-normal text-slate-900 uppercase tracking-wider">{widget.label}</h3>
                      {isWidgetCollapsed ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronUp className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                    <div 
                      className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded"
                      title="Drag to rearrange layout position"
                    >
                      <GripVertical className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {!isWidgetCollapsed && (
                    <div className="animate-fade-in mt-3">
                      <p className="text-[11px] text-slate-450 text-slate-500">Chronological distribution of matters across stages.</p>

                      <div className="h-56 mt-4 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={chartData} 
                            layout="vertical"
                            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              scale="band" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                              width={120}
                            />
                            <Tooltip 
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '11px' }}
                            />
                            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#38bdf8'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {!isWidgetCollapsed && (
                  <div className="pt-3 border-t border-slate-105 border-slate-100 flex justify-between text-[10px] text-slate-400 mt-4">
                    <span>Data pulls from live system state.</span>
                    <span className="font-mono text-slate-600 font-bold">{cases.length} Total Registered Matters</span>
                  </div>
                )}
              </div>
            );
          }

          // --- 5. DOCUMENTS AWAITING ACTION WIDGET ---
          if (widget.widgetType === 'docs_awaiting') {
            const isWidgetCollapsed = collapsedWidgets[widget.widgetId];
            return (
              <div 
                key={widget.widgetId}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.widgetId)}
                onDragOver={(e) => handleDragOver(e, widget.widgetId)}
                onDrop={(e) => handleDrop(e, widget.widgetId)}
                className={`${spanClass} bg-white/95 backdrop-blur-md rounded-[24px] border-[2px] border-slate-200 p-5 shadow-sm widget-docs-awaiting flex flex-col justify-between transition-all duration-300 relative ${draggedWidgetId === widget.widgetId ? 'opacity-30 scale-95 border-sky-400 border-dashed border-2' : ''}`}
                id={`widget-${widget.widgetId}`}
              >
                <div>
                  <div className="flex justify-between items-center select-none">
                    <div 
                      onClick={() => setCollapsedWidgets(prev => ({ ...prev, [widget.widgetId]: !prev[widget.widgetId] }))}
                      className="flex items-center gap-2 hover:opacity-85 flex-1 py-1 cursor-pointer"
                      title="Click to collapse/expand Docs widget"
                    >
                      <div className="h-8 w-8 rounded-lg bg-[#00BCFF]/10 flex items-center justify-center border border-[#00BCFF]/20 text-[#00BCFF]">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="text-xs font-normal text-slate-900 uppercase tracking-wider">{widget.label}</h3>
                      {isWidgetCollapsed ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronUp className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                    <div 
                      className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded"
                      title="Drag to rearrange layout position"
                    >
                      <GripVertical className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  
                  {!isWidgetCollapsed && (
                    <div className="space-y-2 mt-4 animate-fade-in">
                      <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div>
                          <h5 className="text-[11px] font-normal text-slate-700 font-sans">Formal SLA Default Notice</h5>
                          <p className="text-[9px] text-slate-400 font-mono">Template: Letter of Demand</p>
                        </div>
                        <button 
                          onClick={() => onNavigateTo('documents')}
                          className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded font-normal cursor-pointer"
                        >
                          Launch Builder
                        </button>
                      </div>

                      <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div>
                          <h5 className="text-[11px] font-normal text-slate-700 font-sans">Affidavit of Evidence</h5>
                          <p className="text-[9px] text-slate-400 font-mono">Template: Notarized Deposition Statement</p>
                        </div>
                        <button 
                          onClick={() => onNavigateTo('documents')}
                          className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded font-normal cursor-pointer"
                        >
                          Launch Builder
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!isWidgetCollapsed && (
                  <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between mt-4">
                    <span>Automatic compliance checklists.</span>
                    <button onClick={() => onNavigateTo('documents')} className="text-[10px] text-sky-600 font-black cursor-pointer">All templates →</button>
                  </div>
                )}
              </div>
            );
          }

          // --- 6. TODAY'S AGENDA WIDGET ---
          if (widget.widgetType === 'today_agenda') {
            const isWidgetCollapsed = collapsedWidgets[widget.widgetId];
            return (
              <div 
                key={widget.widgetId}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.widgetId)}
                onDragOver={(e) => handleDragOver(e, widget.widgetId)}
                onDrop={(e) => handleDrop(e, widget.widgetId)}
                className={`${spanClass} bg-white/95 backdrop-blur-md rounded-[24px] border-[2px] border-slate-200 p-5 shadow-sm widget-today-agenda flex flex-col justify-between transition-all duration-300 relative ${draggedWidgetId === widget.widgetId ? 'opacity-30 scale-95 border-sky-400 border-dashed border-2' : ''}`}
                id={`widget-${widget.widgetId}`}
              >
                <div>
                  <div className="flex justify-between items-center select-none">
                    <div 
                      onClick={() => setCollapsedWidgets(prev => ({ ...prev, [widget.widgetId]: !prev[widget.widgetId] }))}
                      className="flex items-center gap-2 hover:opacity-85 flex-1 py-1 cursor-pointer"
                      title="Click to collapse/expand Agenda widget"
                    >
                      <div className="h-8 w-8 rounded-lg bg-[#00BCFF]/10 flex items-center justify-center border border-[#00BCFF]/20 text-[#00BCFF]">
                        <CheckCircle2 className="h-4.5 w-4.5 animate-pulse" />
                      </div>
                      <h3 className="text-xs font-normal text-slate-900 uppercase tracking-wider">{widget.label}</h3>
                      {isWidgetCollapsed ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronUp className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                    <div 
                      className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded"
                      title="Drag to rearrange layout position"
                    >
                      <GripVertical className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  
                  {!isWidgetCollapsed && (
                    <div className="space-y-2 mt-4 text-xs font-normal text-slate-650 animate-fade-in">
                      <div 
                        onClick={() => {
                          onNavigateTo('cases');
                          showToastBanner("Opening associated Dispute Matter tracking page.");
                        }}
                        className="p-3 border border-slate-200 rounded-xl bg-slate-50/55 hover:bg-slate-100/50 flex justify-between cursor-pointer hover:-translate-y-0.5 transition duration-150 select-none shadow-xxs"
                        title="Click to view associated mediation matter details"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800">10:00 AM — SLA Mediation</p>
                          <p className="text-[10px] text-slate-400 font-mono">Conference Room #2 with opposition council</p>
                        </div>
                        <span className="text-[8px] bg-sky-50 text-sky-700 border border-sky-100 font-normal px-2 py-0.5 rounded uppercase h-fit">Meeting</span>
                      </div>

                      <div 
                        onClick={() => {
                          onNavigateTo('deadlines');
                          showToastBanner("Opening upcoming court deadlines calendar.");
                        }}
                        className="p-3 border border-slate-200 rounded-xl bg-slate-50/30 hover:bg-slate-100/30 flex justify-between cursor-pointer hover:-translate-y-0.5 transition duration-150 select-none shadow-xxs"
                        title="Click to view full deadlines list and calendar details"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800">03:30 PM — Deposition Review</p>
                          <p className="text-[10px] text-slate-400 font-mono">Pleadings compilation with Sarah paralegal</p>
                        </div>
                        <span className="text-[8px] bg-[#00BCFF]/10 text-sky-850 border border-[#00BCFF]/20 font-normal px-2 py-0.5 rounded uppercase h-fit">Internal</span>
                      </div>
                    </div>
                  )}
                </div>

                {!isWidgetCollapsed && (
                  <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 mt-4">
                    <span>Today's calendar entries.</span>
                  </div>
                )}
              </div>
            );
          }

          // --- 7. NOTIFICATIONS PANEL WIDGET ---
          if (widget.widgetType === 'notifications_panel') {
            const isWidgetCollapsed = collapsedWidgets[widget.widgetId];
            return (
              <div 
                key={widget.widgetId}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.widgetId)}
                onDragOver={(e) => handleDragOver(e, widget.widgetId)}
                onDrop={(e) => handleDrop(e, widget.widgetId)}
                className={`${spanClass} bg-white/95 backdrop-blur-md rounded-[24px] border-[2px] border-slate-200 p-5 shadow-sm widget-notifications-panel flex flex-col justify-between transition-all duration-300 relative ${draggedWidgetId === widget.widgetId ? 'opacity-30 scale-95 border-sky-400 border-dashed border-2' : ''}`}
                id={`widget-${widget.widgetId}`}
              >
                <div>
                  <div className="flex justify-between items-center select-none">
                    <div 
                      onClick={() => setCollapsedWidgets(prev => ({ ...prev, [widget.widgetId]: !prev[widget.widgetId] }))}
                      className="flex items-center gap-2 hover:opacity-85 flex-1 py-1 cursor-pointer"
                      title="Click to collapse/expand Notifications widget"
                    >
                      <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500">
                        <Bell className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="text-xs font-normal text-slate-900 uppercase tracking-wider">{widget.label}</h3>
                      {isWidgetCollapsed ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronUp className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                    <div 
                      className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded"
                      title="Drag to rearrange layout position"
                    >
                      <GripVertical className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  
                  {!isWidgetCollapsed && (
                    <div className="space-y-2 mt-4 text-xs animate-fade-in select-none">
                      <div 
                        onClick={() => {
                          onNavigateTo('cases');
                          showToastBanner("Opening associated Dispute Matter tracking page.");
                        }}
                        className="p-2.5 bg-red-50/10 hover:bg-red-50/20 border border-red-200 rounded-xl cursor-pointer hover:scale-[1.015] transition duration-150 shadow-xxs"
                        title="Click to view Associated Case File"
                      >
                        <p className="font-semibold text-red-800 text-[11px] flex items-center gap-1">🚨 SLA Dispute limit breached!</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Please check evidence deposition inputs.</p>
                      </div>

                      <div 
                        onClick={() => {
                          onNavigateTo('documents');
                          showToastBanner("Opening generated Warning templates folder.");
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer hover:scale-[1.015] transition duration-150 shadow-xxs"
                        title="Click to view warning template document"
                      >
                        <p className="font-semibold text-slate-700 text-[11px] flex items-center gap-1">📄 Template formal warning downloaded.</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Automated state trace saved successfully.</p>
                      </div>

                      <div 
                        onClick={() => {
                          onNavigateTo('team');
                          showToastBanner("Viewing Rivera Alex team profile.");
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer hover:scale-[1.015] transition duration-150 shadow-xxs"
                        title="Click to coordinate with Rivera Alex"
                      >
                        <p className="font-semibold text-slate-700 text-[11px] flex items-center gap-1">👥 Paralegal Assignment Completed</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Alex Rivera finalized file compilation.</p>
                      </div>
                    </div>
                  )}
                </div>

                {!isWidgetCollapsed && (
                  <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 mt-4 font-sans">
                    <span>Audit notifications telemetry.</span>
                  </div>
                )}
              </div>
            );
          }

          return null;
        });
        })()}

        {/* --- 8. LIVE SIMULATOR & WORKSPACE PIPELINE (ALWAYS SOLID ON THE GRID AT END) --- */}
        <div className="lg:col-span-12 xl:col-span-6 bg-white rounded-[24px] border-[2px] border-slate-200 p-5 shadow-sm flex flex-col justify-between" id="pusher-realtime-simulator">
          <div>
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="text-emerald-500 h-4.5 w-4.5" /> Real-time Activities Simulator (Pusher)
                </h3>
                <p className="text-[11px] text-slate-400">Trigger active websocket event simulations to test instantaneous telemetry.</p>
              </div>
              <span className="text-[9px] bg-slate-100 text-slate-600 font-mono font-bold px-2 py-1 rounded">Channel: live-feed</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
              <button 
                onClick={() => triggerRealtimeSimulation('client_upload')}
                disabled={simulatingEvent}
                className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 font-extrabold text-[11px] text-slate-700 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 focus:ring-1 focus:ring-slate-300 cursor-pointer"
              >
                {simulatingEvent ? <Loader2 className="h-3 w-3 animate-spin text-slate-500" /> : "✕ Sim Opponent File"}
              </button>
              <button 
                onClick={() => triggerRealtimeSimulation('whatsapp_reply')}
                disabled={simulatingEvent}
                className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 font-extrabold text-[11px] text-slate-700 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {simulatingEvent ? <Loader2 className="h-3 w-3 animate-spin text-slate-500" /> : "✕ Sim WhatsApp Client Reply"}
              </button>
              <button 
                onClick={() => triggerRealtimeSimulation('cron_job')}
                disabled={simulatingEvent}
                className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 font-extrabold text-[11px] text-slate-700 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {simulatingEvent ? <Loader2 className="h-3 w-3 animate-spin text-slate-500" /> : "✕ Sim Cron Notice Alert"}
              </button>
            </div>

            <div className="mt-4 bg-slate-50 border rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Incoming Event Stream</span>
                <span className="text-emerald-600 animate-pulse">● LIVE CHANNEL</span>
              </div>
              <div className="p-3 max-h-[110px] overflow-y-auto space-y-2 text-[11px]">
                 {pusherFeed.map((feed) => (
                   <div 
                     key={feed.id} 
                     onClick={() => {
                       if (feed.type === 'document') {
                         onNavigateTo('documents');
                         showToastBanner("Redirecting to documents database.");
                       } else if (feed.type === 'whatsapp') {
                         onNavigateTo('chat');
                         showToastBanner("Opening secure client chat portal.");
                       } else if (feed.type === 'cron') {
                         onNavigateTo('deadlines');
                         showToastBanner("Opening critical filings registry.");
                       } else {
                         onNavigateTo('cases');
                       }
                     }}
                     className="flex gap-2 items-start text-slate-600 font-mono cursor-pointer hover:bg-slate-100 p-1 rounded transition duration-150 select-none hover:text-slate-950"
                     title={`Action: Go to associated ${feed.type || 'matter'} screen`}
                   >
                     <span className="text-emerald-500 font-bold">❯</span>
                     <div className="flex-grow">
                       <p className="font-bold text-slate-705 text-slate-800 hover:underline">{feed.text}</p>
                       <span className="text-[9px] text-slate-400 font-sans tracking-wide">{feed.time}</span>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-105 border-slate-100 text-[10px] text-slate-400 mt-4 flex justify-between">
            <span>Client-side event log verified.</span>
            <span className="font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-bold uppercase text-[8px]">Active Pusher Context</span>
          </div>
        </div>

        {/* --- 9. PLATFORM INTEGRATION & FEEDBACK (SOLID GRID PANEL) --- */}
        <div className="lg:col-span-12 xl:col-span-6 bg-white rounded-[24px] border-[2px] border-slate-200 p-5 shadow-sm flex flex-col justify-between" id="platform-feedback">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="text-indigo-500 h-4.5 w-4.5" /> Submit Developer & Feature Feedback
            </h3>
            <p className="text-[11px] text-slate-400">Have suggestions, request custom categories, or found a minor bug? Report directly to firm telemetry records instantly.</p>

            <form onSubmit={handleFeedbackSubmit} className="space-y-3 mt-4">
              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                {(['feature_request', 'category_request', 'bug_report'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFeedbackType(type === 'category_request' ? 'category_request' as any : type)}
                    className={`flex-1 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all cursor-pointer ${feedbackType === type ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 bg-white/40'}`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div>
                <textarea
                  rows={2}
                  required
                  placeholder="Tell us what you'd like to improve or request..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-200 p-3 bg-slate-50/50 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-700 leading-normal"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingFeedback || !feedbackMessage.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition shadow-xs disabled:opacity-40"
                >
                  {submittingFeedback ? 'submitting...' : 'dispatch telemetry feedback'}
                </button>
              </div>
            </form>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-440 text-slate-400 mt-4 flex justify-between">
            <span>Feedback saved with user ID & company trace.</span>
            {feedbackSuccess && <span className="text-emerald-600 font-bold uppercase text-[9px] animate-pulse">✓ Submission saved!</span>}
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS ROW (IF VISIBLE UNDER THE DENSE GRID SPEC) */}
      <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-[24px] flex flex-col sm:flex-row justify-between items-center gap-4 border-[2px] border-slate-800 shadow-lg" id="dashboard-quick-actions-bar">
        <div>
          <h4 className="font-extrabold text-sm tracking-tight">Active Command Center Shortcuts</h4>
          <p className="text-[11px] text-slate-300">Finalize quick case entries on the spot without leaving dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => {
              onNavigateTo('cases');
              showToastBanner("Opening Case Matter registry panel.");
            }}
            className="px-4 py-2.5 bg-white text-slate-950 hover:bg-slate-50 text-xxs font-bold tracking-wider uppercase rounded-xl shadow hover:scale-102 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer animate-fade-in"
            title="Launch Case File registry panel"
          >
            + Launch Case file
          </button>
          <button 
            onClick={() => {
              onNavigateTo('reminders');
              showToastBanner("Opening Calendar & Filing Limits panel.");
            }}
            className="px-4 py-2.5 bg-slate-800 text-white hover:bg-slate-755 text-xxs font-bold tracking-wider uppercase rounded-xl shadow border border-slate-700 hover:scale-102 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer animate-fade-in"
            title="Filing lock & deadline limit panel"
          >
            + Lock Filing Limit
          </button>
          <button 
            onClick={() => {
              onNavigateTo('updates');
              showToastBanner("Opening Client Communication Draft queue.");
            }}
            className="px-4 py-2.5 bg-sky-400 hover:bg-sky-500 text-slate-900 text-xxs font-bold tracking-wider uppercase rounded-xl shadow hover:scale-102 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer animate-fade-in"
            title="Launch draft updates communicator panel"
          >
            + draft update queue
          </button>
        </div>
      </div>

      {/* VERIFY CLIENT CONSENT DIALOG */}
      {consentModalOpen && consentTargetUpdate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-lg z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/90 backdrop-blur-xl rounded-[28px] p-6 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/50 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">Review Dispatch Consent</h4>
                <p className="text-[10px] text-slate-400">Confirm audit trails before client delivery trigger</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border rounded-xl space-y-2 text-xs text-slate-650 leading-relaxed font-sans text-slate-600">
              <p>You are about to dispatch an automated communication regarding matter reference <span className="font-semibold text-slate-900 font-mono">"{consentTargetUpdate.caseRef}"</span> to client <span className="font-semibold text-slate-900">"{consentTargetUpdate.clientName}"</span>.</p>
              <p className="font-mono bg-white p-2 border rounded border-slate-200 text-xxs italic">
                "{editingUpdateId === consentTargetUpdate.id ? editingTextMessage : consentTargetUpdate.message}"
              </p>
              <div className="flex gap-2 font-mono text-slate-400 mt-2 text-[9px]">
                <span>[Active Channels: Email, WhatsApp]</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 italic">
              *Docket SaaS automatically saves a signed audit trace of this dispatch event to company compliance records.
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={executeSend}
                className="flex-grow py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition"
              >
                ✓ I authorize, send cards
              </button>
              <button 
                onClick={() => {
                  setConsentModalOpen(false);
                  setConsentTargetUpdate(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl"
              >
                Abort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK DETAILED LISTING SIDE SHEET SLIDER */}
      {quickDetailItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-lg z-50 flex justify-end animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl max-w-md w-full h-full p-6 shadow-2xl flex flex-col justify-between border-l border-white/40 animate-slide-left">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <h4 className="font-black text-slate-900 uppercase text-xs tracking-wider">
                  Quick Review Sheet: {quickDetailItem.type}
                </h4>
                <button 
                  onClick={() => setQuickDetailItem(null)}
                  className="h-6 w-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[75vh] pr-1">
                {quickDetailItem.type === 'deadlines' ? (
                  quickDetailItem.data.map((dead: any) => (
                    <div key={dead.id} className="p-3 bg-slate-50 border rounded-xl space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[8px] font-mono text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded font-bold">{dead.caseRef}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{new Date(dead.dueDate).toLocaleDateString()}</span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-800">{dead.title}</h5>
                      <p className="text-[10px] text-slate-500">Client: {dead.clientName}</p>
                    </div>
                  ))
                ) : (
                  quickDetailItem.data.map((upd: any) => (
                    <div key={upd.id} className="p-3 bg-slate-50 border rounded-xl space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[8px] font-mono bg-sky-100 text-sky-850 px-1 py-0.2 rounded font-bold">DRAFT</span>
                        <span className="text-[9px] font-mono text-slate-400">{upd.caseRef}</span>
                      </div>
                      <p className="text-xs text-slate-700 italic">"{upd.message}"</p>
                      <p className="text-[9px] text-slate-500 font-black">Recipient: {upd.clientName}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t-2 border-slate-100">
              <button 
                onClick={() => {
                  const target = quickDetailItem.type === 'deadlines' ? 'reminders' : 'updates';
                  setQuickDetailItem(null);
                  onNavigateTo(target);
                }}
                className="w-full py-2.5 bg-[#00BCFF] hover:bg-[#009fd9] text-white font-normal text-xs uppercase tracking-wider rounded-xl text-center shadow transition-all duration-150 cursor-pointer min-h-[44px]"
              >
                open dedicated panel lobby
              </button>
            </div>
              {/* QUICK ACTION MODALS PIPELINE (New Case, Deadline or Client draft update) */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] p-6 max-w-lg w-full shadow-2xl border-2 border-slate-200 animate-scale-up space-y-4 text-center flex flex-col items-center">
            
            {/* Modal Headers */}
            <div className="flex flex-col items-center pb-3 border-b-2 border-slate-100 w-full relative">
              <button 
                onClick={() => setActiveModal(null)} 
                className="absolute right-0 top-0 text-slate-400 hover:text-slate-600 font-normal text-xs bg-slate-100 hover:bg-slate-200 h-6 w-6 rounded-full flex items-center justify-center cursor-pointer transition duration-150"
              >
                ✕
              </button>
              <div className="flex flex-col items-center gap-1.5">
                {activeModal === 'case' ? <Briefcase className="text-slate-800 h-5 w-5" /> :
                 activeModal === 'deadline' ? <Calendar className="text-slate-800 h-5 w-5" /> :
                 <MessageSquare className="text-slate-800 h-5 w-5" />}
                <h4 className="font-normal text-sm uppercase tracking-wider text-slate-905 mt-1">
                  Quick Add: {activeModal === 'case' ? 'Launch Matter File' : activeModal === 'deadline' ? 'Limit Lock Form' : 'communication Draft queue'}
                </h4>
              </div>
            </div>

            {/* CASE MODAL FORM */}
            {activeModal === 'case' && (
              <form onSubmit={handleAddCase} className="space-y-4 w-full flex flex-col items-center">
                <div className="w-full flex flex-col items-center">
                  <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Select Client</label>
                  <select 
                    required
                    value={newCaseData.clientId} 
                    onChange={e => setNewCaseData(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800"
                  >
                    <option value="">-- Choose client context --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.email})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="flex flex-col items-center">
                    <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Matter Reference (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. DK/2026/04"
                      value={newCaseData.referenceNumber}
                      onChange={e => setNewCaseData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                      className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Matter Stage</label>
                    <CustomSelect
                      value={newCaseData.caseType}
                      onChange={(val) => setNewCaseData(prev => ({ ...prev, caseType: val }))}
                      options={[
                        { value: 'Civil Litigation', label: 'Civil Litigation' },
                        { value: 'Criminal Defense', label: 'Criminal Defense' },
                        { value: 'Family Dispute', label: 'Family Dispute' },
                        { value: 'Corporate SLA Claim', label: 'Corporate SLA Claim' },
                      ]}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="flex flex-col items-center">
                    <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Court Jurisdiction</label>
                    <input 
                      type="text" 
                      value={newCaseData.court}
                      onChange={e => setNewCaseData(prev => ({ ...prev, court: e.target.value }))}
                      className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Opposing Party Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Corp Defendants"
                      value={newCaseData.opposingParty}
                      onChange={e => setNewCaseData(prev => ({ ...prev, opposingParty: e.target.value }))}
                      className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800"
                    />
                  </div>
                </div>
                <div className="w-full flex flex-col items-center">
                  <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Matter brief / brief notes</label>
                  <textarea 
                    value={newCaseData.notes}
                    onChange={e => setNewCaseData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800 resize-none font-sans"
                    rows={2}
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#00BCFF] hover:bg-[#009fd9] border-[2px] border-[#00BCFF] hover:border-[#009fd9] text-white text-xs font-normal uppercase tracking-wider rounded-xl transition duration-150 cursor-pointer min-h-[44px]">✓ lock new case matter</button>
              </form>
            )}

            {/* DEADLINE MODAL FORM */}
            {activeModal === 'deadline' && (
              <form onSubmit={handleAddDeadline} className="space-y-4 w-full flex flex-col items-center">
                <div className="w-full flex flex-col items-center">
                  <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Select Case Matter</label>
                  <select 
                    required
                    value={newDeadlineData.caseId} 
                    onChange={e => setNewDeadlineData(prev => ({ ...prev, caseId: e.target.value }))}
                    className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800"
                  >
                    <option value="">-- Choose active matter context --</option>
                    {cases.map(c => <option key={c.id} value={c.id}>{c.referenceNumber || c.id} - {c.caseType} ({clients.find(cl => cl.id === c.clientId)?.fullName})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="flex flex-col items-center">
                    <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Deadline title / brief description</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. File Affidavit of Service"
                      value={newDeadlineData.title}
                      onChange={e => setNewDeadlineData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Target Limit Due Date</label>
                    <input 
                      type="date" 
                      required
                      value={newDeadlineData.dueDate}
                      onChange={e => setNewDeadlineData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800"
                    />
                  </div>
                </div>
                <div className="w-full flex flex-col items-center">
                  <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Action limits Category</label>
                  <select 
                    value={newDeadlineData.deadlineType}
                    onChange={e => setNewDeadlineData(prev => ({ ...prev, deadlineType: e.target.value }))}
                    className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800"
                  >
                    <option value="Court Filing">Court Filing</option>
                    <option value="Evidence Delivery">Evidence Delivery</option>
                    <option value="Trial Hearing">Trial Hearing</option>
                    <option value="Arbitration Notice">Arbitration Notice</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#00BCFF] hover:bg-[#009fd9] border-[2px] border-[#00BCFF] hover:border-[#009fd9] text-white text-xs font-normal uppercase tracking-wider rounded-xl transition duration-150 cursor-pointer min-h-[44px]">✓ lock calendar deadline</button>
              </form>
            )}

            {/* CLIENT UPDATE MODAL FORM */}
            {activeModal === 'update' && (
              <form onSubmit={handleAddUpdate} className="space-y-4 w-full flex flex-col items-center">
                <div className="w-full flex flex-col items-center">
                  <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">Connect case Matter</label>
                  <select 
                    required
                    value={newUpdateData.caseId} 
                    onChange={e => setNewUpdateData(prev => ({ ...prev, caseId: e.target.value }))}
                    className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800"
                  >
                    <option value="">-- Choose active matter context --</option>
                    {cases.map(c => <option key={c.id} value={c.id}>{c.referenceNumber || c.id} - {c.caseType} ({clients.find(cl => cl.id === c.clientId)?.fullName})</option>)}
                  </select>
                </div>
                <div className="w-full flex flex-col items-center">
                  <label className="block text-[10px] font-normal text-slate-400 uppercase mb-1">client notification draft message text</label>
                  <textarea 
                    required
                    placeholder="Provide friendly but compliant progress summary card details..."
                    value={newUpdateData.message}
                    onChange={e => setNewUpdateData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full border-[2px] border-slate-200 hover:border-slate-350 focus:border-slate-450 p-2.5 bg-slate-50 focus:bg-white text-xs text-center rounded-xl outline-none transition duration-150 text-slate-800 resize-none font-sans"
                    rows={3}
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#00BCFF] hover:bg-[#009fd9] border-[2px] border-[#00BCFF] hover:border-[#009fd9] text-white text-xs font-normal uppercase tracking-wider rounded-xl transition duration-150 cursor-pointer min-h-[44px]">✓ lock update queue card</button>
              </form>
            )}

          </div>
        </div>       )}

          </div>
        </div>
      )}

      {/* ANNOUNCEMENT BANNER BUILDER MODAL */}
      {announcementModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-lg z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-[28px] p-6 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-150">
              <h4 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 text-slate-950">
                <Volume2 className="h-5 w-5 text-sky-500 hover:scale-105 transition" /> Firm Announcement Customizer
              </h4>
              <button onClick={() => setAnnouncementModalOpen(false)} className="text-xs bg-slate-100 hover:bg-slate-200 h-6 w-6 rounded-full flex items-center justify-center cursor-pointer transition">✕</button>
            </div>

            <form onSubmit={saveAnnouncementBanner} className="space-y-4 text-xs">
              {/* Genuine small checkbox (even smaller than standard, checkbox not radio) */}
              <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-100 select-none">
                <input 
                  type="checkbox" 
                  id="ann-active"
                  checked={announcementConfig.isActive}
                  onChange={(e) => setAnnouncementConfig((prev: any) => ({ ...prev, isActive: e.target.checked }))}
                  className="w-3.5 h-3.5 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500 focus:ring-1 accent-blue-500 cursor-pointer"
                />
                <label 
                  htmlFor="ann-active"
                  className="font-bold text-slate-700 cursor-pointer text-[9.5px] uppercase tracking-wide"
                >
                  Banner active on Dashboard
                </label>
              </div>

              {/* Light grey border inputs */}
              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1 tracking-wider text-[9.5px]">Announcement Title</label>
                <input 
                  type="text" 
                  required
                  value={announcementConfig.title}
                  onChange={(e) => setAnnouncementConfig((prev: any) => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-slate-300 p-2.5 bg-slate-50 text-slate-800 rounded-xl outline-none focus:bg-white text-xs transition duration-150 focus:border-slate-400"
                  placeholder="Enter main notice header"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1 tracking-wider text-[9.5px]">Message Body</label>
                <textarea 
                  required
                  rows={2}
                  value={announcementConfig.body}
                  onChange={(e) => setAnnouncementConfig((prev: any) => ({ ...prev, body: e.target.value }))}
                  className="w-full border border-slate-300 p-2.5 bg-slate-50 text-slate-800 rounded-xl outline-none focus:bg-white text-xs leading-relaxed transition duration-150 focus:border-slate-400 font-sans"
                  placeholder="Write message particulars..."
                />
              </div>

              {/* Color Grid instead of writing raw hex code */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-500 uppercase tracking-wider text-[9.5px]">Pick Banner Theme Color Palette</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { bg: '#E0F2FE', text: '#0369A1', name: 'Sky Blue' },
                    { bg: '#D1FAE5', text: '#047857', name: 'Emerald' },
                    { bg: '#FEF3C7', text: '#B45309', name: 'Golden' },
                    { bg: '#FCE7F3', text: '#BE185D', name: 'Rose Petal' },
                    { bg: '#F1F5F9', text: '#334155', name: 'Slate Gray' },
                    { bg: '#E0E7FF', text: '#4338CA', name: 'Indigo' }
                  ].map((p) => {
                    const isSelected = announcementConfig.backgroundColor === p.bg;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setAnnouncementConfig((prev: any) => ({
                          ...prev,
                          backgroundColor: p.bg,
                          textColor: p.text
                        }))}
                        className={`p-2 rounded-xl text-center border-2 transition duration-150 cursor-pointer ${
                          isSelected ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={{ backgroundColor: p.bg }}
                      >
                        <span className="text-[10px] font-bold block" style={{ color: p.text }}>
                          {p.name}
                        </span>
                        <span className="text-[7.5px] block opacity-80" style={{ color: p.text }}>
                          {p.bg}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Styled Container having custom color picker with its opacity */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl mt-2 select-none">
                  <div 
                    className="relative w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden transition duration-150 shadow-sm hover:scale-105" 
                    style={{ backgroundColor: announcementConfig.backgroundColor || '#E0F2FE' }}
                  >
                    <input 
                      type="color"
                      value={announcementConfig.backgroundColor || '#E0F2FE'}
                      onChange={(e) => {
                        const bgCol = e.target.value;
                        setAnnouncementConfig((prev: any) => ({
                          ...prev,
                          backgroundColor: bgCol,
                          textColor: getContrastColor(bgCol)
                        }));
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Palette className="h-3.5 w-3.5 pointer-events-none mix-blend-difference text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="block font-bold text-slate-800 text-[10px] uppercase">Custom Theme Color</span>
                    <span className="text-[8.5px] text-slate-500 block">Click circle to open real system color picker</span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-mono text-slate-600 font-bold shadow-xxs">
                      {announcementConfig.backgroundColor}
                    </span>
                  </div>
                </div>

                {/* Dynamic Preview Box */}
                <div 
                  className="p-3.5 rounded-xl border-2 transition-all mt-2.5 flex flex-col justify-center items-center text-center"
                  style={{ backgroundColor: announcementConfig.backgroundColor, color: announcementConfig.textColor, borderColor: announcementConfig.textColor + '25' }}
                >
                  <p className="uppercase font-mono text-[8px] tracking-widest opacity-75 font-semibold">Live Live Design Preview</p>
                  <p className="mt-1 font-extrabold text-[11px]">{announcementConfig.title || "Announcements Header"}</p>
                  <p className="text-[10.5px] mt-0.5 opacity-90 leading-normal font-medium">{announcementConfig.body || "Notice content message."}</p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1 tracking-wider text-[9.5px]">Screen Position</label>
                <CustomSelect
                  value={announcementConfig.position}
                  onChange={(val) => setAnnouncementConfig((prev: any) => ({ ...prev, position: val }))}
                  options={[
                    { value: 'top', label: 'Top (Absolute Header level)' },
                    { value: 'below-topbar', label: 'Below Topbar (Bento level)' },
                  ]}
                />
              </div>

              {/* White text, blue border submit button */}
              <button 
                type="submit" 
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-755 text-white border-[2px] border-blue-600 text-xs font-bold uppercase tracking-wider rounded-xl mt-3 transition shadow cursor-pointer"
              >
                Save Announcement Banner
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC NOTIFICATIONS BANNER DRAWER (TOASTS) */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 animate-slide-up flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-black font-sans">{toastNotification}</span>
        </div>
      )}

    </div>
  );
}
