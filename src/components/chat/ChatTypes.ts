import { User, Case, Client, ChatMessage } from '../../types';
import { Briefcase, Gavel, FileText, CheckCircle, Clock } from 'lucide-react';

export interface ChatFolder {
  id: string;
  name: string;
  color: string;
  conversationIds: string[];
}

export interface ChatLabel {
  id: string;
  name: string;
  color: string;
}

export interface LegalNotice {
  id: string;
  senderId: string;
  title: string;
  content: string;
  acknowledgedBy: string[]; // List of user IDs with dates
  createdAt: string;
  requiresAllSignature: boolean;
}

export interface KeywordAlertRule {
  id: string;
  keyword: string;
  action: 'notify' | 'flag' | 'highlight';
  isActive: boolean;
  color: string;
}

export interface BroadcastLog {
  id: string;
  message: string;
  recipientsCount: number;
  sentAt: string;
  senderName: string;
}

export interface ChatConversation {
  id: string; // matches case ID or special channel ID e.g., 'firm-general' or 'paralegal-lobby'
  name: string;
  type: 'general' | 'matter' | 'direct';
  isPinned?: boolean;
  isMuted?: boolean;
  muteUntil?: string;
  priority?: 'high' | 'normal' | 'low';
  labels?: string[]; // label IDs
  folderId?: string | null;
  isArchived?: boolean;
  lastMessageAt: string;
  lastMessageText: string;
  unreadCount: number;
  caseObj?: Case;
  clientObj?: Client;
}

// Highly stylized seed users to represent firm members
export const SEED_USERS = [
  {
    id: "usr-admin-demo",
    fullName: "Alex Rivera, Esq.",
    email: "voyyagic@gmail.com",
    role: "Senior Partner",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Alex",
    isOnline: true,
    tagline: "Head of Litigation & Corporate Strategy"
  },
  {
    id: "usr-partner-shara",
    fullName: "Shara Lawson, Counsel",
    email: "shara@docket.legal",
    role: "Partner",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Shara",
    isOnline: true,
    tagline: "Criminal Advocacy Lead"
  },
  {
    id: "usr-associate-ben",
    fullName: "Ben Carter, JD",
    email: "ben@docket.legal",
    role: "Associate",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Ben",
    isOnline: true,
    tagline: "Commercial Defense Advisor"
  },
  {
    id: "usr-paralegal-jenny",
    fullName: "Jenny S., CP",
    email: "jenny@docket.legal",
    role: "Paralegal",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Jenny",
    isOnline: true,
    tagline: "Litigation Support specialist"
  },
  {
    id: "usr-sec-muna",
    fullName: "Muna Ibrahim",
    email: "muna@docket.legal",
    role: "Secretary",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Muna",
    isOnline: false,
    tagline: "Administrative Scheduling and Filings"
  }
];

export const MOCK_CHANNELS: ChatConversation[] = [
  {
    id: 'firm-general',
    name: 'Main Firm Lobbies',
    type: 'general',
    isPinned: true,
    lastMessageAt: '2026-06-07T12:30:11Z',
    lastMessageText: 'Template checklist has been synchronized to cloud file directories.',
    unreadCount: 2,
    priority: 'high'
  },
  {
    id: 'paralegal-lobby',
    name: 'Paralegal Filings Sync',
    type: 'general',
    lastMessageAt: '2026-06-07T09:40:00Z',
    lastMessageText: 'Waiting for client authorization signature for Case #F-9201.',
    unreadCount: 0,
    priority: 'normal'
  }
];

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-seed-1',
    companyId: 'firm-counsel',
    caseId: null,
    sentById: 'usr-paralegal-jenny',
    message: 'Welcome everyone to the secure multi-tenant Docket Vault stream. Type @ to mention or # to reference active matters.',
    readBy: ['usr-admin-demo'],
    createdAt: '2026-06-07T08:15:00Z',
    senderName: 'Jenny S., CP',
    senderRole: 'Paralegal',
    reactions: { '👍': ['usr-admin-demo'], '🚀': ['usr-associate-ben'] }
  },
  {
    id: 'msg-seed-2',
    companyId: 'firm-counsel',
    caseId: null,
    sentById: 'usr-admin-demo',
    message: 'We must verify the #F-102 Case File records before tomorrow\'s pretrial motion hearing. Let\'s make sure we log all updates On-Record.',
    readBy: ['usr-paralegal-jenny'],
    createdAt: '2026-06-07T08:25:00Z',
    senderName: 'Alex Rivera, Esq.',
    senderRole: 'Senior Partner',
    reactions: { '🤝': ['usr-paralegal-jenny'] }
  }
];

// Rich custom presets for templates
export const CHAT_TEMPLATES = [
  {
    name: "Pretrial Audit Prompt",
    text: "Can we get an immediate Status update verification on Case #REF ? Ensure we have verified the statute of limitations, and log this summary on the Trial Record Log."
  },
  {
    name: "Formality Checklist request",
    text: "Please prepare the Formal Retainer & conflict check records tracker for Client @ATTORNEY. All documents must be seeded to Secure Client Drive directories safely."
  },
  {
    name: "Notice of Appearance Notice",
    text: "LEGAL NOTICE: Please review appearance docket logs and acknowledge compliance by tomorrow morning."
  }
];
