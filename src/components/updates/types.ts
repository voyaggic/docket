import { Client, Case } from '../../types';

export interface Correspondence {
  id: string;
  companyId: string;
  caseId: string;
  clientId: string;
  referenceNumber: string;
  subject?: string;
  message: string;              // Fallback plain content
  richContent?: string;          // Rich text html
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'FAILED' | 'ARCHIVED' | 'SCHEDULED' | 'EXPIRED';
  priority: 'urgent' | 'normal' | 'low';
  isUrgent: boolean;
  isPrivileged: boolean;
  sourceType: 'manual' | 'ai' | 'template';
  templateId?: string;
  snippetsUsed: string[];
  variables: Record<string, string>;
  disclaimers: Array<{ title: string; content: string; required: boolean }>;
  signatureBlock: { name: string; title: string; firm: string; phone: string; email: string };
  sentById?: string;
  sentOnBehalfOfId?: string;
  ccRecipients: string[];
  bccRecipients: string[];
  secondaryRecipients: string[];
  scheduledFor?: string;
  sendTimeOptimized: boolean;
  approvalLevel: number; // 0, 1, 2, 3
  rejectionReason?: string;
  submittedForApprovalAt?: string;
  submittedById?: string;
  approvedById?: string;
  approvedAt?: string;
  slaDeadline?: string;
  slaBreached: boolean;
  lockedById?: string;
  lockedAt?: string;
  lockExpiresAt?: string;
  expiresAt?: string;
  deliveryReport: {
    email?: { status: 'Sent' | 'Delivered' | 'Bounced' | 'Deferred'; opened: boolean; clickedCount: number; timestamp?: string; bounceReason?: string };
    whatsapp?: { status: 'Sent' | 'Delivered' | 'Read' | 'Failed'; timestamp?: string };
    sms?: { status: 'Sent' | 'Delivered' | 'Failed'; timestamp?: string };
  };
  responses: Array<{
    id: string;
    method: string;
    notes: string;
    actionRequired: boolean;
    timestamp: string;
  }>;
  responseStatus: 'none' | 'expected' | 'received';
  clientEngagementScore?: number;
  auditTrail: Array<{
    id: string;
    action: string;
    performedBy: string;
    timestamp: string;
    details?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  
  // Enriched fields
  caseRef?: string;
  caseType?: string;
  client?: Client;
  parentCase?: Case;
}

export interface CorrespondenceTemplate {
  id: string;
  companyId: string;
  name: string;
  category: string;
  matterType?: string;
  eventType?: string;
  richContent: string;
  variables: string[];
  conditionalBlocks: Array<{ condition: string; content: string }>;
  disclaimers: string[];
  isDefault: boolean;
  isFirmWide: boolean;
  usageCount: number;
  lastUsedAt?: string;
}

export interface Snippet {
  id: string;
  companyId: string;
  title: string;
  category: string;
  richContent: string;
  variables: string[];
  isFirmWide: boolean;
  usageCount: number;
}

export interface WhatsAppTemplate {
  id: string;
  companyId: string;
  name: string;
  category: string;
  language: string;
  body: string;
  header?: string;
  footer?: string;
  buttons?: string[];
  status: 'approved' | 'pending' | 'rejected';
  rejectionReason?: string;
  usageCount: number;
}

export interface EmailDomainConfig {
  domain: string;
  dkimPublicKey: string;
  dkimPrivateKey: string;
  spfRecord: string;
  dmarcRecord: string;
  dkimVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  deliverabilityScore: number;
}
