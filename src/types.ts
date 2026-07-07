/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPERADMIN = "SUPERADMIN",
  ADMIN = "ADMIN",
  LAWYER = "LAWYER",
  PARALEGAL = "PARALEGAL",
  SECRETARY = "SECRETARY"
}

export enum CaseStatus {
  ACTIVE = "ACTIVE",
  ON_HOLD = "ON_HOLD",
  CLOSED = "CLOSED"
}

export enum ClientUpdateStatus {
  DRAFT = "DRAFT",
  APPROVED = "APPROVED",
  SENT = "SENT",
  FAILED = "FAILED"
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  setupComplete: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonStyle: 'rounded' | 'square' | 'pill';
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
  borderRadius: 'sharp' | 'medium' | 'round';
  sidebarColor: string;
  navIconColor: string;
}

export interface CompanySettings {
  id: string;
  companyId: string;
  firmName?: string;
  caseTypes: string[];
  courts: string[];
  referenceFormat?: string;
  address?: string;
  phone?: string;
  email?: string;
  theme: CompanyTheme;
  navigation: Record<string, { visible: boolean; label: string; order: number }>;
  reminderDefaults: {
    daysBefore: number[];
    notifyWhom: 'only_lawyer' | 'whole_team' | 'lawyer_head';
    delivery: ('system' | 'email')[];
  };
  updatePreferences: {
    workflow: 'draft_review' | 'auto_send' | 'manual';
    tone: 'formal' | 'friendly' | 'plain';
    channels: ('email' | 'whatsapp' | 'sms')[];
  };
  branding: Record<string, any>;
  communicationStyle: {
    tone?: string;
    structure?: string;
    commonPhrases?: string[];
    formalityLevel?: string;
    observedPatterns?: string[];
  };
  activeChannels: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    voice: boolean;
  };
  calendarIntegration?: {
    googleEnabled: boolean;
    microsoftEnabled: boolean;
  };
  caseStages: string[];
  dashboardWidgets?: any[];
  firmAnnouncement?: {
    isActive: boolean;
    title: string;
    body: string;
    backgroundColor: string;
    textColor: string;
    position: 'top' | 'below-topbar';
    updatedAt: string;
    updatedBy?: string;
  };
  dashboardConfig?: {
    roleBasedView?: boolean;
    defaultDateRange?: number;
    greetingSubtext?: string;
    showDate?: boolean;
    showFirmName?: boolean;
    metricCards?: any[];
    quickActions?: any[];
    searchConfig?: any;
    metricCardBgColor?: string;
    metricCardTextColor?: string;
  };
  terminology?: Record<string, string>;
  customFields?: {
    case?: CustomField[];
    client?: CustomField[];
    deadline?: CustomField[];
    document?: CustomField[];
  };
  customSections?: {
    case?: CustomSection[];
    client?: CustomSection[];
    deadline?: CustomSection[];
    document?: CustomSection[];
  };
  offices?: any[];
  prismaoffices?: any[];
  bankAccounts?: any[];
  updatedAt: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select' | 'number' | 'checkbox' | 'phone' | 'email' | 'currency' | 'file';
  options?: string[];
  required: boolean;
  visible: boolean;
  isDefault?: boolean;
  sectionId?: string;
  order?: number;
}

export interface CustomSection {
  id: string;
  label: string;
  order: number;
}

export interface PlatformFeedback {
  id: string;
  companyId: string;
  userId: string;
  type: 'category_request' | 'feature_request' | 'bug_report';
  message: string;
  isRead: boolean;
  submittedAt: string;
}

export interface User {
  id: string;
  companyId: string | null;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  isSuperAdmin: boolean;
  // null/undefined = full access (admins, superadmins). Array = restricted to those page keys only.
  allowedPages?: string[] | null;
  googleCalendar?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    connectedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  companyId: string;
  fullName: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  organisation?: string;
  notes?: string;
  customFieldValues?: Record<string, any>;
  createdAt: string;
  updatedAt: string;

  // Expanded fields for Dockett relationship management
  photo?: string;
  dateOfFirstEngagement?: string;
  clientSource?: string;
  referredById?: string;
  clientCategory?: 'individual' | 'corporate' | 'government' | 'ngo';
  riskRating?: 'low' | 'medium' | 'high';
  valueTier?: 'standard' | 'silver' | 'gold' | 'platinum';
  isVip?: boolean;
  conflictCheck?: 'not_performed' | 'performed' | 'flagged';
  conflictNotes?: string;
  nextAction?: string;
  nextActionDue?: string;
  nextActionAssignedTo?: string;
  preferredMeeting?: 'in_person' | 'video' | 'phone';
  accessibilityNeeds?: string;
  doNotContactPeriods?: string[]; // JSON/Array of strings
  optOutChannels?: string[];
  internalTags?: string[];
  segments?: string[];
  feeArrangement?: string;
  billingRate?: number;
  paymentTerms?: string;
  retainerAmount?: number;
  retainerBalance?: number;
  trustBalance?: number;
  outstandingBalance?: number;

  onboardingComplete?: boolean;
  onboardingChecklist?: Record<string, { checked: boolean; date?: string; by?: string; fileUrl?: string }>;
  kycStatus?: 'not_started' | 'pending' | 'verified' | 'expired';
  kycDocuments?: Array<{ id: string; type: string; status: string; expiryDate?: string; fileUrl?: string; collectedBy?: string; collectedAt?: string }>;
  engagementLetterStatus?: string;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  retentionPolicy?: string;
  retentionOverrideReason?: string;

  // Embedded related records for standard mock-persistence
  calls?: Array<{ id: string; calledAt: string; duration?: number; direction: 'inbound' | 'outbound'; outcome: string; notes?: string; loggedBy: string; followUpCreated?: boolean }>;
  meetings?: Array<{ id: string; meetingAt: string; duration?: number; meetingType: string; location?: string; attendees?: string[]; agenda?: string; outcome?: string; status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'; fileUrls?: string[] }>;
  tasks?: Array<{ id: string; title: string; description?: string; assignedTo: string; createdBy: string; dueAt?: string; priority: 'low' | 'normal' | 'high' | 'urgent'; status: 'todo' | 'in_progress' | 'complete' | 'cancelled'; subtasks?: Array<{ text: string; done: boolean }> }>;
  followUps?: Array<{ id: string; title: string; notes?: string; assignedTo: string; dueAt: string; status: 'pending' | 'done' | 'snoozed'; snoozeUntil?: string; repeatInterval?: string; completedAt?: string }>;
  relationships?: Array<{ id: string; relativeClientId: string; relationshipType: string; notes?: string }>;
  invoices?: Array<{ id: string; invoiceNumber: string; invoiceDate: string; dueDate: string; lineItems: Array<{ desc: string; amount: number }>; subtotal: number; tax: number; total: number; status: 'pending' | 'paid' | 'overdue'; paidAt?: string }>;
  consents?: Array<{ id: string; consentType: string; consentedAt: string; method: string; recordedBy: string; notes?: string; withdrawnAt?: string }>;
  documentRequests?: Array<{ id: string; documentType: string; description?: string; requestedBy: string; requestedAt: string; dueAt?: string; status: 'pending' | 'received' | 'overdue' | 'cancelled'; reminderSentAt?: string }>;
  secureUploadLinks?: Array<{ id: string; token: string; createdBy: string; expiresAt: string; usedAt?: string; isActive: boolean; uploadedFiles?: string[] }>;
}

export interface Case {
  id: string;
  companyId: string;
  clientId: string;
  referenceNumber?: string;
  caseType?: string;
  court?: string;
  opposingParty?: string;
  assignedLawyerId?: string;
  currentStage?: string;
  status: CaseStatus;
  openedDate: string;
  notes?: string;
  customFieldValues?: Record<string, any>;
  createdAt: string;
  updatedAt: string;

  // New fields for comprehensive docket and litigation management
  priority?: string;
  caseValue?: number;
  budget?: number;
  flags?: string[];
  tags?: string[];
  statuteOfLimitations?: string | null;
  observers?: string[];
  outcome?: string;
  outcomeNotes?: string;
  closedDate?: string;
  isLegalHold?: boolean;
  isArchived?: boolean;
  deadlines?: any[];
  riskLevel?: string;
  riskFactors?: string[];
  updates?: any[];
  docs?: GeneratedDocument[];
}

export interface CaseEvent {
  id: string;
  companyId: string;
  caseId: string;
  createdById?: string;
  eventType?: string;
  title: string;
  description?: string;
  eventDate?: string;
  createdAt: string;
}

export interface Deadline {
  id: string;
  companyId: string;
  caseId: string;
  title: string;
  deadlineType?: string;
  dueDate: string;
  remindDaysBefore: number[];
  notifyAll: boolean;
  isResolved: boolean;
  remindersSent: number[];
  googleCalendarEventId?: string;
  customFieldValues?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientUpdate {
  id: string;
  companyId: string;
  caseId: string;
  clientId: string;
  draftedById?: string;
  message: string;
  status: ClientUpdateStatus;
  channelsSent: Record<string, boolean>;
  sentAt?: string;

  // Approval workflow
  submittedForApprovalAt?: string;
  submittedById?: string;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;

  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplate {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  templateContent: string;
  variables: string[];
  structure: any;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDocument {
  id: string;
  companyId: string;
  caseId: string;
  templateId?: string;
  generatedById?: string;
  content: string;
  fileUrl?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  companyId: string;
  caseId: string | null; // null = general team chat
  sentById: string;
  message: string;
  fileUrl?: string;
  readBy: string[];
  createdAt: string;

  senderName?: string;
  senderAvatar?: string | null;
  senderRole?: string;
  
  isOnRecord?: boolean;
  onRecordAt?: string;
  onRecordById?: string;
  editedAt?: string;
  editHistory?: any[];
  deletedAt?: string;
  isDeleted?: boolean;
  reactions?: Record<string, string[]>;
  replyToId?: string | null;
  isPinned?: boolean;
  attachments?: any[];
  threadCount?: number;
  mentions?: string[];
  references?: any[];
}

export interface ConsentLog {
  id: string;
  userId: string;
  companyId: string;
  action: string;
  consented: boolean;
  consentedAt: string;
}

export interface FeatureFlag {
  id: string;
  companyId: string;
  featureName: string;
  isEnabled: boolean;
  updatedAt: string;
}

export interface CompanyAnnouncement {
  id: string;
  companyId: string | null; // null = all companies
  title: string;
  body: string;
  isActive: boolean;
  isDismissed: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface Invitation {
  id: string;
  companyId: string;
  email: string;
  role: string;
  name?: string;
  allowedPages?: string[] | null; // pages this invited member will be restricted to
  tokenHash: string;        // SHA-256 hash of actual token
  expiresAt: string;        // ISO datetime
  acceptedAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AccessUpdateRequest {
  id: string;
  companyId: string;
  userId: string;
  proposedAllowedPages: string[] | null;
  tokenHash: string;
  expiresAt: string;
  appliedAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface RegistrationRequest {
  id: string;
  firmName: string;
  registrantName: string;
  email: string;
  country: string;
  firmSize: string;
  referralSource?: string;
  riskScore: string;        // "low" | "medium" | "high"
  status: string;           // "pending" | "approved" | "rejected" | "needs_review"
  companyId?: string;       // set when approved
  inviteToken?: string;     // custom added
  createdAt: string;
}

export interface Clause {
  id: string;
  companyId: string;
  title: string;
  category: string;
  matterType: string;
  jurisdiction: string;
  content: string;
  usageCount: number;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourtBundle {
  id: string;
  companyId: string;
  caseId: string;
  title: string;
  court: string;
  status: string; // Draft, Final, Submitted
  version: number;
  storageKey?: string;
  documentOrder: any; // list of { type: 'file' | 'generated', id: string, dividerLabel?: string }
  createdAt: string;
  updatedAt: string;
}

export interface SignatureRequest {
  id: string;
  companyId: string;
  caseId: string;
  documentId?: string;
  documentType: string; // "generated" | "file"
  title: string;
  signingOrder: string; // "parallel" | "sequential"
  status: string; // Pending, Completed, Expired, Void
  expiresAt?: string;
  documentHash: string;
  signatories: Signatory[];
  createdAt: string;
  updatedAt: string;
}

export interface Signatory {
  id: string;
  signatureRequestId: string;
  name: string;
  email: string;
  role: string;
  status: string; // Pending, Signed
  signedAt?: string;
  otpCodeHash?: string;
  otpExpiresAt?: string;
  signatureTypedText?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}


