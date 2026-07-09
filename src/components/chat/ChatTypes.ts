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
  type: 'general' | 'matter' | 'direct' | 'dm' | 'group';
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
  userObj?: any;
}

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
