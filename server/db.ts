import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  Company, CompanySettings, User, Client, Case, CaseEvent, 
  Deadline, ClientUpdate, DocumentTemplate, GeneratedDocument, 
  ChatMessage, ConsentLog, FeatureFlag, CompanyAnnouncement, 
  UserRole, CaseStatus, ClientUpdateStatus,
  Invitation, RegistrationRequest, AccessUpdateRequest
} from '../src/types';

const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/app/data/db.json'
  : path.join(process.cwd(), 'db.json');

export const defaultWidgets = [
  {
    widgetId: "upcoming_deadlines",
    widgetType: "upcoming_deadlines",
    label: "Upcoming Deadlines and Court Dates",
    isVisible: true,
    position: 1,
    config: {
      daysAhead: 7,
      includeTypes: ["Court Filing", "Evidence Delivery", "Hearing", "Trial"],
      separateCourtDates: false,
      urgencyThresholds: { today_tomorrow: "red", within_3: "amber", within_7: "blue" },
      showAssignedLawyer: true,
      defaultView: "list"
    }
  },
  {
    widgetId: "pending_updates",
    widgetType: "pending_updates",
    label: "Pending Client Updates",
    isVisible: true,
    position: 2,
    config: {
      limit: 5,
      showPreview: true,
      showChannelIcons: true
    }
  },
  {
    widgetId: "recent_activity",
    widgetType: "recent_activity",
    label: "Recent Case Activity Feed",
    isVisible: false,
    position: 3,
    config: {
      limit: 5
    }
  },
  {
    widgetId: "cases_status",
    widgetType: "cases_status",
    label: "Cases by Status Chart",
    isVisible: false,
    position: 4,
    config: {}
  },
  {
    widgetId: "docs_awaiting",
    widgetType: "docs_awaiting",
    label: "Documents Awaiting Action",
    isVisible: false,
    position: 5,
    config: {
      limit: 5
    }
  },
  {
    widgetId: "today_agenda",
    widgetType: "today_agenda",
    label: "Today's Agenda",
    isVisible: false,
    position: 6,
    config: {}
  },
  {
    widgetId: "notifications_panel",
    widgetType: "notifications_panel",
    label: "Notifications History Panel",
    isVisible: false,
    position: 7,
    config: {
      limit: 10
    }
  }
];

export const defaultDashboardConfig = {
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

export const defaultAnnouncement = {
  isActive: false,
  title: "",
  body: "",
  backgroundColor: "#fee2e2",
  textColor: "#991b1b",
  position: "top" as const,
  updatedAt: ""
};

export interface SuperadminAuditEntry {
  id: string;
  action: string;
  ip: string;
  timestamp: string;
  detail: string;
  endpoint?: string;
  method?: string;
  targetCompanyId?: string;
  targetUserId?: string;
  result?: string;
}

export interface LoginAttempt {
  id: string;
  ip: string;
  timestamp: string;
  success: boolean;
}

export interface DatabaseSchema {
  companies: Company[];
  companySettings: CompanySettings[];
  users: User[];
  clients: Client[];
  cases: Case[];
  caseEvents: CaseEvent[];
  deadlines: Deadline[];
  clientUpdates: ClientUpdate[];
  documentTemplates: DocumentTemplate[];
  generatedDocuments: GeneratedDocument[];
  chatMessages: ChatMessage[];
  consentLogs: ConsentLog[];
  featureFlags: FeatureFlag[];
  announcements: CompanyAnnouncement[];
  platformFeedbacks?: any[];
  invitations?: Invitation[];
  registrationRequests?: RegistrationRequest[];
  accessUpdates?: AccessUpdateRequest[];
  superadminAuditLog: SuperadminAuditEntry[];
  loginAttempts: LoginAttempt[];
  activeSuperadminSessionId: string | null;
  platformLocked: boolean;
}

function getInitialData(): DatabaseSchema {
  // Pre-configured default companies
  const demoCompanyId = "comp-docket-chambers";
  const demoCompany: Company = {
    id: demoCompanyId,
    name: "Docket Legal Chambers",
    slug: "docket-chambers",
    setupComplete: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const defaultTheme = {
    primaryColor: '#0f172a', // Slate 900
    secondaryColor: '#64748b', // Slate 500
    backgroundColor: '#f1f5f9', // Bento Slate Light Gray
    textColor: '#0f172a', // Slate Text
    buttonColor: '#38bdf8', // Bento sky active accent
    buttonStyle: 'rounded' as const,
    fontFamily: 'Inter',
    fontSize: 'medium' as const,
    borderRadius: 'round' as const, // Round 20px corners
    sidebarColor: '#0f172a', // Cool Dark Slate
    navIconColor: '#38bdf8', // Active sky highlight
  };

  const demoSettings: CompanySettings = {
    id: "settings-demo",
    companyId: demoCompanyId,
    firmName: "Docket Legal Chambers",
    caseTypes: ["Criminal", "Civil", "Family", "Transactional", "Conveyancing"],
    courts: ["Supreme Court", "High Court of Appeal", "District Magistrate Court"],
    referenceFormat: "DK/[YEAR]/[NUM]",
    address: "740 Docket Boulevard, Suite 100, New York, NY",
    phone: "+1 (555) 362-5389",
    email: "contact@docket-chambers.com",
    theme: defaultTheme,
    navigation: {
      "dashboard": { visible: true, label: "Dashboard", order: 1 },
      "cases": { visible: true, label: "Cases", order: 2 },
      "reminders": { visible: true, label: "Deadline & Reminders", order: 3 },
      "updates": { visible: true, label: "Updates", order: 4 },
      "documents": { visible: true, label: "Documents", order: 5 },
      "chat": { visible: true, label: "Chat", order: 6 },
      "settings": { visible: true, label: "Settings", order: 7 }
    },
    reminderDefaults: {
      daysBefore: [1, 3, 7],
      notifyWhom: "whole_team",
      delivery: ["system", "email"]
    },
    updatePreferences: {
      workflow: "draft_review",
      tone: "friendly",
      channels: ["email", "whatsapp", "sms"]
    },
    branding: {},
    communicationStyle: {
      tone: "Friendly but professional",
      formalityLevel: "Moderate",
      commonPhrases: ["We're pleased to report", "Please let us know if you need any clarification"],
      structure: "Personalized greeting, event summary, clear next steps, professional closing."
    },
    activeChannels: {
      email: true,
      whatsapp: true,
      sms: true,
      voice: false
    },
    caseStages: ["Client Consultation", "File Opened", "Pleadings Built", "Hearing Phase", "Judgement Issued", "Archived"],
    dashboardWidgets: defaultWidgets,
    firmAnnouncement: defaultAnnouncement,
    dashboardConfig: defaultDashboardConfig,
    updatedAt: new Date().toISOString()
  };

  const demoUsers: User[] = [
    {
      id: "usr-admin-demo",
      companyId: demoCompanyId,
      fullName: "Alex Rivera",
      email: "voyyagic@gmail.com", // Pre-populated user email as admin and lawyer
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      role: UserRole.ADMIN,
      isActive: true,
      isSuperAdmin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "usr-lawyer-demo",
      companyId: demoCompanyId,
      fullName: "Sarah Jenkins, Esq.",
      email: "sarah.jenkins@docket.com",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
      role: UserRole.LAWYER,
      isActive: true,
      isSuperAdmin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "usr-paralegal-demo",
      companyId: demoCompanyId,
      fullName: "James Carter",
      email: "james.carter@docket.com",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      role: UserRole.PARALEGAL,
      isActive: true,
      isSuperAdmin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const demoClients: Client[] = [
    {
      id: "cli-1",
      companyId: demoCompanyId,
      fullName: "Marcus Aurelius Vance",
      idNumber: "ID-9083112",
      phone: "+1 (555) 789-1223",
      email: "marcus.vance@rome.org",
      address: "12 Imperial Way, Rome, NY",
      occupation: "SaaS Product Architect",
      organisation: "Acme Cloud Solutions",
      notes: "Preferred update channel: WhatsApp. Very detailed-oriented client who appreciates timelines.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "cli-2",
      companyId: demoCompanyId,
      fullName: "Helena Rostova",
      idNumber: "ID-1123998",
      phone: "+1 (555) 443-4488",
      email: "helena.rostova@warpeace.net",
      address: "888 Yasnaya Polyana Rd, Petersburg, PA",
      occupation: "Independent Publisher",
      organisation: "Rostov Publishing Co.",
      notes: "Main point of contact for Rostov Publishing family disputes.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const demoCases: Case[] = [
    {
      id: "case-1",
      companyId: demoCompanyId,
      clientId: "cli-1",
      referenceNumber: "DK/2026/001",
      caseType: "Civil",
      court: "Supreme Court",
      opposingParty: "Apex Global Holdings Inc.",
      assignedLawyerId: "usr-admin-demo",
      currentStage: "Pleadings Built",
      status: CaseStatus.ACTIVE,
      openedDate: "2026-03-10T12:00:00Z",
      notes: "Contractual breach regarding cloud architecture provisioning SLA. Opposing counsel is extremely passive-aggressive.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "case-2",
      companyId: demoCompanyId,
      clientId: "cli-2",
      referenceNumber: "DK/2026/002",
      caseType: "Family",
      court: "District Magistrate Court",
      opposingParty: "Anatole Rostov",
      assignedLawyerId: "usr-lawyer-demo",
      currentStage: "Client Consultation",
      status: CaseStatus.ACTIVE,
      openedDate: "2026-05-15T10:00:00Z",
      notes: "Estate division of Rostov publishing archives. Needs swift mediation to prevent assets freeze.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const demoEvents: CaseEvent[] = [
    {
      id: "event-1",
      companyId: demoCompanyId,
      caseId: "case-1",
      createdById: "usr-admin-demo",
      eventType: "Filing",
      title: "Initial Complaint Deposited",
      description: "Signed contractual pleadings and claim particulars filed with the Supreme Court clerk.",
      eventDate: "2026-03-12T14:30:00Z",
      createdAt: "2026-03-12T15:00:00Z"
    },
    {
      id: "event-2",
      companyId: demoCompanyId,
      caseId: "case-1",
      createdById: "usr-admin-demo",
      eventType: "Mediation",
      title: "First Settlement Arbitration Fail",
      description: "Proposed settlement of $250k rejected. Defendant claims architectural flaws were caused by client negligence.",
      eventDate: "2026-04-18T10:00:00Z",
      createdAt: "2026-04-18T16:00:00Z"
    }
  ];

  const demoDeadlines: Deadline[] = [
    {
      id: "dead-1",
      companyId: demoCompanyId,
      caseId: "case-1",
      title: "Defense Pleadings Reply Due Date",
      deadlineType: "Court Filing",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      remindDaysBefore: [1, 3, 7],
      notifyAll: true,
      isResolved: false,
      remindersSent: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "dead-2",
      companyId: demoCompanyId,
      caseId: "case-2",
      title: "Asset Ledger Submission",
      deadlineType: "Evidence Delivery",
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
      remindDaysBefore: [1, 3],
      notifyAll: false,
      isResolved: false,
      remindersSent: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const demoUpdates: ClientUpdate[] = [
    {
      id: "upd-1",
      companyId: demoCompanyId,
      caseId: "case-1",
      clientId: "cli-1",
      draftedById: "usr-admin-demo",
      message: "Hello Marcus, we have drafted and filed our primary pleadings reply with the Supreme Court. Let's touch base on Thursday to align on our evidence discovery bundle. Best regards, Docket Legal Chambers.",
      status: ClientUpdateStatus.SENT,
      channelsSent: { email: true, whatsapp: true },
      sentAt: "2026-03-13T09:00:00Z",
      createdAt: "2026-03-12T16:10:00Z",
      updatedAt: "2026-03-13T09:00:00Z"
    },
    {
      id: "upd-2",
      companyId: demoCompanyId,
      caseId: "case-1",
      clientId: "cli-1",
      draftedById: "usr-admin-demo",
      message: "Hello Marcus, we wanted to inform you that our mediation meeting yesterday did not resolve our SLA claim. The defendants declined our settlement. However, our legal pleadings are exceptionally strong, and we are preparing for the upcoming filing deadline. Talk to you soon.",
      status: ClientUpdateStatus.DRAFT,
      channelsSent: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const demoTemplates: DocumentTemplate[] = [
    {
      id: "tpl-1",
      companyId: demoCompanyId,
      name: "Formal Demand Letter",
      description: "Professional SLA default demand for contract disputes and breach damages.",
      templateContent: `To,
[OPPOSING PARTY]

REGARDING: Contract Dispute SLA Default Breach
CASE REFERENCE: [CASE REFERENCE]

Dear Counsel,

We write to you on behalf of our client, [CLIENT NAME] (ID: [CLIENT ID]), in relation to the ongoing SLA default dispute currently listed under Court Reference [CASE REFERENCE] in the [COURT].

Our client notes with severe concern that despite multiple attempts at amicable mediation, your client, [OPPOSING PARTY], continues to fail to fulfill its structural provisioning obligations. Take note that we demand immediate settlement or complete fulfillment within fourteen (14) days from today.

Best regards,
[FIRM NAME]
Signed: [LAWYER NAME]`,
      variables: ["OPPOSING PARTY", "CASE REFERENCE", "CLIENT NAME", "CLIENT ID", "COURT", "FIRM NAME", "LAWYER NAME"],
      structure: { type: "demand_letter", complexity: "standard" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "tpl-2",
      companyId: demoCompanyId,
      name: "Affidavit of Fact",
      description: "Stamped testimony declaration of facts for court submission.",
      templateContent: `IN THE [COURT]

In the Matter of:
[CLIENT NAME] v. [OPPOSING PARTY]
Case Reference: [CASE REFERENCE]

I, [CLIENT NAME], residing at [CLIENT ADDRESS], occupation [CLIENT OCCUPATION], do hereby make oath and declare as follows:

1. I am the Plaintiff in this legal suit.
2. The facts deposed to herein are true and correct to the best of my knowledge, information, and personal belief.
3. On the day of dispute, [OPPOSING PARTY] committed a major breach.
4. (Space for further testimony statements)

Signed and Sworn by the Deponent on this day.
Deponent Signature: __________________

Commissioner of Oaths stamp: __________________`,
      variables: ["COURT", "CLIENT NAME", "OPPOSING PARTY", "CASE REFERENCE", "CLIENT ADDRESS", "CLIENT OCCUPATION"],
      structure: { type: "affidavit", complexity: "verified" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const demoMessages: ChatMessage[] = [
    {
      id: "msg-1",
      companyId: demoCompanyId,
      caseId: null, // general
      sentById: "usr-lawyer-demo",
      message: "Good morning team! Let's review the active timelines for today.",
      readBy: ["usr-admin-demo", "usr-paralegal-demo"],
      createdAt: new Date(Date.now() - 3600000).toISOString() // 1hr ago
    },
    {
      id: "msg-2",
      companyId: demoCompanyId,
      caseId: null, // general
      sentById: "usr-admin-demo",
      message: "Morning! I am finalizing pleadings for Marcus Vance. Our Supreme Court deadline is approaching soon.",
      readBy: ["usr-lawyer-demo", "usr-paralegal-demo"],
      createdAt: new Date(Date.now() - 1800000).toISOString() // 30m ago
    },
    {
      id: "msg-3",
      companyId: demoCompanyId,
      caseId: "case-1", // case-specific
      sentById: "usr-paralegal-demo",
      message: "Hi Alex, I have fully compiled the SLA contracts into the Case folder. Let me know if you need any additional citations.",
      readBy: ["usr-admin-demo"],
      createdAt: new Date(Date.now() - 900000).toISOString() // 15m ago
    }
  ];

  const demoFlags: FeatureFlag[] = [
    { id: "flag-1", companyId: demoCompanyId, featureName: "ai_client_updates", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-2", companyId: demoCompanyId, featureName: "document_generator", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-3", companyId: demoCompanyId, featureName: "team_chat", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-4", companyId: demoCompanyId, featureName: "reminders", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-5", companyId: demoCompanyId, featureName: "client_updates", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-6", companyId: demoCompanyId, featureName: "whatsapp_channel", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-7", companyId: demoCompanyId, featureName: "sms_channel", isEnabled: true, updatedAt: new Date().toISOString() }
  ];

  const demoAnnouncements: CompanyAnnouncement[] = [
    {
      id: "ann-1",
      companyId: null,
      title: "Welcome to Docket Platform",
      body: "Docket SaaS v1.2 is officially live! Your communication style, document generation workflows, and multi-tenant firm isolation are automatically operational.",
      isActive: true,
      isDismissed: false,
      createdAt: new Date().toISOString()
    }
  ];

  return {
    companies: [demoCompany],
    companySettings: [demoSettings],
    users: demoUsers,
    clients: demoClients,
    cases: demoCases,
    caseEvents: demoEvents,
    deadlines: demoDeadlines,
    clientUpdates: demoUpdates,
    documentTemplates: demoTemplates,
    generatedDocuments: [],
    chatMessages: demoMessages,
    consentLogs: [],
    featureFlags: demoFlags,
    announcements: demoAnnouncements,
    platformFeedbacks: [],
    invitations: [],
    registrationRequests: [],
    accessUpdates: [],
    superadminAuditLog: [],
    loginAttempts: [],
    activeSuperadminSessionId: null,
    platformLocked: false
  };
}

// Global In-Memory representation with automatic persistence
let dbData: DatabaseSchema;

export function loadDb(): DatabaseSchema {
  if (dbData) return dbData;

  try {
    if (fs.existsSync(DB_PATH)) {
      const info = fs.readFileSync(DB_PATH, 'utf-8');
      dbData = JSON.parse(info);
      
      let changed = false;
      if (!dbData.superadminAuditLog) {
        dbData.superadminAuditLog = [];
        changed = true;
      }
      if (!dbData.loginAttempts) {
        dbData.loginAttempts = [];
        changed = true;
      }
      if (dbData.activeSuperadminSessionId === undefined) {
        dbData.activeSuperadminSessionId = null;
        changed = true;
      }
      if (dbData.platformLocked === undefined) {
        dbData.platformLocked = false;
        changed = true;
      }
      
      if (changed) {
        saveDb(dbData);
      }
      return dbData;
    }
  } catch (err) {
    console.error("Error reading database file, resetting schema", err);
  }

  // Pre-populate and save
  dbData = getInitialData();
  saveDb(dbData);
  return dbData;
}

export function saveDb(data: DatabaseSchema): void {
  try {
    dbData = data;
    const parent = path.dirname(DB_PATH);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to write to database file", err);
  }
}

/**
 * Tenant scoped CRUD functions
 */
export const db = {
  // Companies
  getCompanies: () => loadDb().companies,
  getCompany: (id: string) => loadDb().companies.find(c => c.id === id),
  getCompanyBySlug: (slug: string) => loadDb().companies.find(c => c.slug === slug),
  createCompany: (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = loadDb();
    const newCompany: Company = {
      ...company,
      id: `comp-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.companies.push(newCompany);
    saveDb(data);
    return newCompany;
  },
  updateCompany: (id: string, updates: Partial<Company>) => {
    const data = loadDb();
    const index = data.companies.findIndex(c => c.id === id);
    if (index === -1) return null;
    data.companies[index] = { ...data.companies[index], ...updates, updatedAt: new Date().toISOString() };
    saveDb(data);
    return data.companies[index];
  },
  deleteCompany: (id: string) => {
    const data = loadDb();
    data.companies = data.companies.filter(c => c.id !== id);
    data.companySettings = data.companySettings.filter(s => s.companyId !== id);
    data.users = data.users.filter(u => u.companyId !== id);
    data.clients = data.clients.filter(c => c.companyId !== id);
    data.cases = data.cases.filter(c => c.companyId !== id);
    data.caseEvents = data.caseEvents.filter(e => e.companyId !== id);
    data.deadlines = data.deadlines.filter(d => d.companyId !== id);
    data.clientUpdates = data.clientUpdates.filter(u => u.companyId !== id);
    data.documentTemplates = data.documentTemplates.filter(t => t.companyId !== id);
    data.generatedDocuments = data.generatedDocuments.filter(d => d.companyId !== id);
    data.chatMessages = data.chatMessages.filter(m => m.companyId !== id);
    data.consentLogs = data.consentLogs.filter(l => l.companyId !== id);
    data.featureFlags = data.featureFlags.filter(f => f.companyId !== id);
    saveDb(data);
  },

  // Company Settings
  getSettings: (companyId: string) => {
    const data = loadDb();
    let s = data.companySettings.find(cs => cs.companyId === companyId);
    if (!s) {
      // Create lazy settings if missing
      s = {
        id: `set-${Math.random().toString(36).substr(2, 9)}`,
        companyId,
        caseTypes: ["Criminal", "Civil", "Family"],
        courts: ["High Court", "Supreme Court"],
        caseStages: ["Client Consultation", "Pleadings Built", "Hearing Phase", "Archived"],
        theme: {
          primaryColor: '#1e293b',
          secondaryColor: '#475569',
          backgroundColor: '#f8fafc',
          textColor: '#0f172a',
          buttonColor: '#2563eb',
          buttonStyle: 'rounded',
          fontFamily: 'Inter',
          fontSize: 'medium',
          borderRadius: 'medium',
          sidebarColor: '#0f172a',
          navIconColor: '#94a3b8'
        },
        navigation: {
          "dashboard": { visible: true, label: "Dashboard", order: 1 },
          "cases": { visible: true, label: "Cases", order: 2 },
          "reminders": { visible: true, label: "Deadline & Reminders", order: 3 },
          "updates": { visible: true, label: "Updates", order: 4 },
          "documents": { visible: true, label: "Documents", order: 5 },
          "chat": { visible: true, label: "Chat", order: 6 },
          "settings": { visible: true, label: "Settings", order: 7 }
        },
        reminderDefaults: {
          daysBefore: [1, 3, 7],
          notifyWhom: "whole_team",
          delivery: ["system"]
        },
        updatePreferences: {
          workflow: "draft_review",
          tone: "formal",
          channels: ["email"]
        },
        branding: {},
        communicationStyle: {},
        activeChannels: {
          email: true,
          whatsapp: false,
          sms: false,
          voice: false
        },
        dashboardWidgets: defaultWidgets,
        firmAnnouncement: defaultAnnouncement,
        dashboardConfig: defaultDashboardConfig,
        updatedAt: new Date().toISOString()
      };
      data.companySettings.push(s);
      saveDb(data);
    }
    return s;
  },
  updateSettings: (companyId: string, updates: Partial<CompanySettings>) => {
    const data = loadDb();
    const index = data.companySettings.findIndex(cs => cs.companyId === companyId);
    if (index === -1) {
      const ns: CompanySettings = {
        ...(updates as any),
        id: `set-${Math.random().toString(36).substr(2, 9)}`,
        companyId,
        updatedAt: new Date().toISOString()
      };
      data.companySettings.push(ns);
      saveDb(data);
      return ns;
    }
    data.companySettings[index] = { ...data.companySettings[index], ...updates, updatedAt: new Date().toISOString() };
    saveDb(data);
    return data.companySettings[index];
  },

  // Users
  getUsers: (companyId: string) => loadDb().users.filter(u => u.companyId === companyId),
  getUser: (id: string) => loadDb().users.find(u => u.id === id),
  getUserByEmail: (email: string) => loadDb().users.find(u => u.email.toLowerCase() === email.toLowerCase()),
  createUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = loadDb();
    const newUser: User = {
      ...user,
      id: `usr-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.users.push(newUser);
    saveDb(data);
    return newUser;
  },
  updateUser: (id: string, updates: Partial<User>) => {
    const data = loadDb();
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    data.users[index] = { ...data.users[index], ...updates, updatedAt: new Date().toISOString() };
    saveDb(data);
    return data.users[index];
  },

  // Clients
  getClients: (companyId: string) => loadDb().clients.filter(c => c.companyId === companyId),
  getClient: (companyId: string, id: string) => loadDb().clients.find(c => c.companyId === companyId && c.id === id),
  createClient: (companyId: string, client: Omit<Client, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => {
    const data = loadDb();
    const newClient: Client = {
      ...client,
      companyId,
      id: `cli-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.clients.push(newClient);
    saveDb(data);
    return newClient;
  },
  updateClient: (companyId: string, id: string, updates: Partial<Client>) => {
    const data = loadDb();
    const index = data.clients.findIndex(c => c.companyId === companyId && c.id === id);
    if (index === -1) return null;
    data.clients[index] = { ...data.clients[index], ...updates, updatedAt: new Date().toISOString() };
    saveDb(data);
    return data.clients[index];
  },
  deleteClient: (companyId: string, id: string) => {
    const data = loadDb();
    const index = data.clients.findIndex(c => c.companyId === companyId && c.id === id);
    if (index === -1) return false;
    data.clients.splice(index, 1);
    saveDb(data);
    return true;
  },

  // Cases
  getCases: (companyId: string) => loadDb().cases.filter(c => c.companyId === companyId),
  getCase: (companyId: string, id: string) => loadDb().cases.find(c => c.companyId === companyId && c.id === id),
  createCase: (companyId: string, item: Omit<Case, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => {
    const data = loadDb();
    const newCase: Case = {
      ...item,
      companyId,
      id: `case-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.cases.push(newCase);
    saveDb(data);
    return newCase;
  },
  updateCase: (companyId: string, id: string, updates: Partial<Case>) => {
    const data = loadDb();
    const index = data.cases.findIndex(c => c.companyId === companyId && c.id === id);
    if (index === -1) return null;
    data.cases[index] = { ...data.cases[index], ...updates, updatedAt: new Date().toISOString() };
    saveDb(data);
    return data.cases[index];
  },

  // Case Events
  getCaseEvents: (companyId: string, caseId: string) => loadDb().caseEvents.filter(e => e.companyId === companyId && e.caseId === caseId),
  createCaseEvent: (companyId: string, event: Omit<CaseEvent, 'id' | 'companyId' | 'createdAt'>) => {
    const data = loadDb();
    const newEvent: CaseEvent = {
      ...event,
      companyId,
      id: `event-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    data.caseEvents.push(newEvent);
    saveDb(data);
    return newEvent;
  },

  // Deadlines
  getDeadlines: (companyId: string) => loadDb().deadlines.filter(d => d.companyId === companyId),
  getCaseDeadlines: (companyId: string, caseId: string) => loadDb().deadlines.filter(d => d.companyId === companyId && d.caseId === caseId),
  createDeadline: (companyId: string, deadline: Omit<Deadline, 'id' | 'companyId' | 'remindersSent' | 'createdAt' | 'updatedAt'>) => {
    const data = loadDb();
    const newDeadline: Deadline = {
      ...deadline,
      companyId,
      id: `dead-${Math.random().toString(36).substr(2, 9)}`,
      remindersSent: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.deadlines.push(newDeadline);
    saveDb(data);
    return newDeadline;
  },
  updateDeadline: (companyId: string, id: string, updates: Partial<Deadline>) => {
    const data = loadDb();
    const index = data.deadlines.findIndex(d => d.companyId === companyId && d.id === id);
    if (index === -1) return null;
    data.deadlines[index] = { ...data.deadlines[index], ...updates, updatedAt: new Date().toISOString() };
    saveDb(data);
    return data.deadlines[index];
  },

  // Client Updates
  getClientUpdates: (companyId: string) => loadDb().clientUpdates.filter(u => u.companyId === companyId),
  createClientUpdate: (companyId: string, update: Omit<ClientUpdate, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => {
    const data = loadDb();
    const newUpdate: ClientUpdate = {
      ...update,
      companyId,
      id: `upd-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.clientUpdates.push(newUpdate);
    saveDb(data);
    return newUpdate;
  },
  updateClientUpdate: (companyId: string, id: string, updates: Partial<ClientUpdate>) => {
    const data = loadDb();
    const index = data.clientUpdates.findIndex(u => u.companyId === companyId && u.id === id);
    if (index === -1) return null;
    data.clientUpdates[index] = { ...data.clientUpdates[index], ...updates, updatedAt: new Date().toISOString() };
    saveDb(data);
    return data.clientUpdates[index];
  },

  // Document Templates
  getTemplates: (companyId: string) => loadDb().documentTemplates.filter(t => t.companyId === companyId),
  getTemplate: (companyId: string, id: string) => loadDb().documentTemplates.find(t => t.companyId === companyId && t.id === id),
  createTemplate: (companyId: string, template: Omit<DocumentTemplate, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => {
    const data = loadDb();
    const newTemplate: DocumentTemplate = {
      ...template,
      companyId,
      id: `tpl-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.documentTemplates.push(newTemplate);
    saveDb(data);
    return newTemplate;
  },
  deleteTemplate: (companyId: string, id: string) => {
    const data = loadDb();
    data.documentTemplates = data.documentTemplates.filter(t => !(t.companyId === companyId && t.id === id));
    saveDb(data);
  },

  // Generated Documents
  getGeneratedDocuments: (companyId: string) => loadDb().generatedDocuments.filter(d => d.companyId === companyId),
  getCaseGeneratedDocuments: (companyId: string, caseId: string) => loadDb().generatedDocuments.filter(d => d.companyId === companyId && d.caseId === caseId),
  createGeneratedDocument: (companyId: string, document: Omit<GeneratedDocument, 'id' | 'companyId' | 'createdAt'>) => {
    const data = loadDb();
    const newDoc: GeneratedDocument = {
      ...document,
      companyId,
      id: `gdoc-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    data.generatedDocuments.push(newDoc);
    saveDb(data);
    return newDoc;
  },

  // Chat Messages
  getChatMessages: (companyId: string, caseId: string | null) => {
    return loadDb().chatMessages.filter(m => m.companyId === companyId && m.caseId === caseId);
  },
  createChatMessage: (companyId: string, message: Omit<ChatMessage, 'id' | 'companyId' | 'createdAt'>) => {
    const data = loadDb();
    const newMessage: ChatMessage = {
      ...message,
      companyId,
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    data.chatMessages.push(newMessage);
    saveDb(data);
    return newMessage;
  },
  markChatRead: (companyId: string, caseId: string | null, userId: string) => {
    const data = loadDb();
    let updated = false;
    data.chatMessages.forEach(m => {
      if (m.companyId === companyId && m.caseId === caseId && !m.readBy.includes(userId)) {
        m.readBy.push(userId);
        updated = true;
      }
    });
    if (updated) saveDb(data);
  },
  updateChatMessage: (id: string, messageText: string, editedAt: string) => {
    const data = loadDb();
    const msg = data.chatMessages.find(m => m.id === id);
    if (msg) {
      if (!msg.isOnRecord) {
        if (!msg.editHistory) msg.editHistory = [];
        msg.editHistory.push(msg.message);
        msg.message = messageText;
        msg.editedAt = editedAt;
        saveDb(data);
        return msg;
      }
    }
    return null;
  },
  deleteChatMessage: (id: string) => {
    const data = loadDb();
    const msg = data.chatMessages.find(m => m.id === id);
    if (msg) {
      if (!msg.isOnRecord) {
        msg.isDeleted = true;
        msg.deletedAt = new Date().toISOString();
        msg.message = "Message deleted";
        saveDb(data);
        return msg;
      }
    }
    return null;
  },
  toggleChatMessageReaction: (id: string, emoji: string, userId: string) => {
    const data = loadDb();
    const msg = data.chatMessages.find(m => m.id === id);
    if (msg) {
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) {
        msg.reactions[emoji] = [];
      }
      
      const idx = msg.reactions[emoji].indexOf(userId);
      if (idx > -1) {
        msg.reactions[emoji].splice(idx, 1);
        if (msg.reactions[emoji].length === 0) {
          delete msg.reactions[emoji];
        }
      } else {
        msg.reactions[emoji].push(userId);
      }
      saveDb(data);
      return msg;
    }
    return null;
  },
  markChatMessageOnRecord: (id: string, userId: string) => {
    const data = loadDb();
    const msg = data.chatMessages.find(m => m.id === id);
    if (msg) {
      msg.isOnRecord = true;
      msg.onRecordAt = new Date().toISOString();
      msg.onRecordById = userId;
      saveDb(data);
      return msg;
    }
    return null;
  },

  // Consent Logs
  getConsentLogs: (companyId: string) => loadDb().consentLogs.filter(l => l.companyId === companyId),
  createConsentLog: (companyId: string, log: Omit<ConsentLog, 'id' | 'companyId' | 'consentedAt'>) => {
    const data = loadDb();
    const newLog: ConsentLog = {
      ...log,
      companyId,
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      consentedAt: new Date().toISOString()
    };
    data.consentLogs.push(newLog);
    saveDb(data);
    return newLog;
  },

  // Feature Flags
  getFeatureFlags: (companyId: string) => {
    const data = loadDb();
    const flags = data.featureFlags.filter(f => f.companyId === companyId);
    if (flags.length === 0) {
      // Create defaults
      const defaultNames = ['ai_client_updates', 'document_generator', 'team_chat', 'reminders', 'client_updates', 'whatsapp_channel', 'sms_channel'];
      const newFlags = defaultNames.map(f => {
        const flag: FeatureFlag = {
          id: `flag-${Math.random().toString(36).substr(2, 9)}`,
          companyId,
          featureName: f,
          isEnabled: f !== 'whatsapp_channel' && f !== 'sms_channel', // default channels
          updatedAt: new Date().toISOString()
        };
        data.featureFlags.push(flag);
        return flag;
      });
      saveDb(data);
      return newFlags;
    }
    return flags;
  },
  toggleFeatureFlag: (companyId: string, featureName: string, isEnabled: boolean) => {
    const data = loadDb();
    const index = data.featureFlags.findIndex(f => f.companyId === companyId && f.featureName === featureName);
    if (index !== -1) {
      data.featureFlags[index].isEnabled = isEnabled;
      data.featureFlags[index].updatedAt = new Date().toISOString();
    } else {
      data.featureFlags.push({
        id: `flag-${Math.random().toString(36).substr(2, 9)}`,
        companyId,
        featureName,
        isEnabled,
        updatedAt: new Date().toISOString()
      });
    }
    saveDb(data);
  },

  // Announcements
  getAnnouncements: (companyId: string) => {
    return loadDb().announcements.filter(a => a.companyId === null || a.companyId === companyId);
  },
  createAnnouncement: (ann: Omit<CompanyAnnouncement, 'id' | 'isDismissed' | 'createdAt'>) => {
    const data = loadDb();
    const newAnn: CompanyAnnouncement = {
      ...ann,
      id: `ann-${Math.random().toString(36).substr(2, 9)}`,
      isDismissed: false,
      createdAt: new Date().toISOString()
    };
    data.announcements.push(newAnn);
    saveDb(data);
    return newAnn;
  },

  // Platform Feedback
  getPlatformFeedbacks: () => {
    const data = loadDb();
    if (!data.platformFeedbacks) data.platformFeedbacks = [];
    return data.platformFeedbacks;
  },
  createPlatformFeedback: (companyId: string, userId: string, type: string, message: string) => {
    const data = loadDb();
    if (!data.platformFeedbacks) data.platformFeedbacks = [];
    const newFeedback = {
      id: `feed-${Math.random().toString(36).substr(2, 9)}`,
      companyId,
      userId,
      type,
      message,
      isRead: false,
      submittedAt: new Date().toISOString()
    };
    data.platformFeedbacks.push(newFeedback);
    saveDb(data);
    return newFeedback;
  },

  // Invitations
  createInvitation: (invitation: Omit<Invitation, 'id' | 'createdAt'>) => {
    const data = loadDb();
    const newInvitation: Invitation = {
      ...invitation,
      id: `inv-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    if (!data.invitations) data.invitations = [];
    data.invitations.push(newInvitation);
    saveDb(data);
    return newInvitation;
  },
  getInvitationByToken: (plainToken: string) => {
    const data = loadDb();
    const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
    if (!data.invitations) return null;
    return data.invitations.find(i => i.tokenHash === hash);
  },
  getInvitationsByCompany: (companyId: string) => {
    const data = loadDb();
    if (!data.invitations) return [];
    return data.invitations.filter(i => i.companyId === companyId);
  },
  markInvitationAccepted: (id: string) => {
    const data = loadDb();
    if (!data.invitations) return null;
    const index = data.invitations.findIndex(i => i.id === id);
    if (index === -1) return null;
    data.invitations[index] = {
      ...data.invitations[index],
      isActive: false,
      acceptedAt: new Date().toISOString()
    };
    saveDb(data);
    return data.invitations[index];
  },
  expireOldInvitations: () => {
    const data = loadDb();
    if (!data.invitations) return;
    let changed = false;
    const now = new Date();
    data.invitations = data.invitations.map(i => {
      if (i.isActive && new Date(i.expiresAt) < now) {
        changed = true;
        return { ...i, isActive: false };
      }
      return i;
    });
    if (changed) {
      saveDb(data);
    }
  },

  // Access update requests (email-confirmed permission changes)
  createAccessUpdateRequest: (request: Omit<AccessUpdateRequest, 'id' | 'createdAt'>) => {
    const data = loadDb();
    const newReq: AccessUpdateRequest = {
      ...request,
      id: `acu-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    if (!data.accessUpdates) data.accessUpdates = [];
    data.accessUpdates.push(newReq);
    saveDb(data);
    return newReq;
  },
  getAccessUpdateByToken: (plainToken: string) => {
    const data = loadDb();
    const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
    return (data.accessUpdates || []).find(r => r.tokenHash === hash) || null;
  },
  markAccessUpdateApplied: (id: string) => {
    const data = loadDb();
    if (!data.accessUpdates) return null;
    const idx = data.accessUpdates.findIndex(r => r.id === id);
    if (idx === -1) return null;
    data.accessUpdates[idx] = { ...data.accessUpdates[idx], isActive: false, appliedAt: new Date().toISOString() };
    saveDb(data);
    return data.accessUpdates[idx];
  },
  expireOldAccessUpdates: () => {
    const data = loadDb();
    if (!data.accessUpdates) return;
    const now = new Date();
    let changed = false;
    data.accessUpdates = data.accessUpdates.map(r => {
      if (r.isActive && new Date(r.expiresAt) < now) { changed = true; return { ...r, isActive: false }; }
      return r;
    });
    if (changed) saveDb(data);
  },

  // Registration requests
  createRegistrationRequest: (request: Omit<RegistrationRequest, 'id' | 'createdAt'>) => {
    const data = loadDb();
    const newRequest: RegistrationRequest = {
      ...request,
      id: `req-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    if (!data.registrationRequests) data.registrationRequests = [];
    data.registrationRequests.push(newRequest);
    saveDb(data);
    return newRequest;
  },
  getRegistrationRequests: () => {
    const data = loadDb();
    return data.registrationRequests || [];
  },
  updateRegistrationRequest: (id: string, updates: Partial<RegistrationRequest>) => {
    const data = loadDb();
    if (!data.registrationRequests) return null;
    const index = data.registrationRequests.findIndex(r => r.id === id);
    if (index === -1) return null;
    data.registrationRequests[index] = {
      ...data.registrationRequests[index],
      ...updates
    };
    saveDb(data);
    return data.registrationRequests[index];
  },

  // ─── SUPERADMIN ADDITION START ───
  // Audit log
  createAuditEntry(entry: Omit<SuperadminAuditEntry, 'id' | 'timestamp'>) {
    const data = loadDb();
    const newEntry: SuperadminAuditEntry = {
      ...entry,
      id: `audit-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    if (!data.superadminAuditLog) data.superadminAuditLog = [];
    data.superadminAuditLog.push(newEntry);
    saveDb(data);
    return newEntry;
  },
  getAuditLog(filters?: { limit?: number; action?: string; from?: string; to?: string }) {
    const data = loadDb();
    let log = [...(data.superadminAuditLog || [])];
    
    if (filters) {
      if (filters.action) {
        log = log.filter(e => e.action === filters.action);
      }
      if (filters.from) {
        const fromDate = new Date(filters.from);
        log = log.filter(e => new Date(e.timestamp) >= fromDate);
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        log = log.filter(e => new Date(e.timestamp) <= toDate);
      }
    }
    
    // Sort newest first
    log.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (filters?.limit) {
      log = log.slice(0, filters.limit);
    }
    return log;
  },
  
  // Login attempts
  recordLoginAttempt(ip: string, success: boolean) {
    const data = loadDb();
    const newAttempt: LoginAttempt = {
      id: `att-${Math.random().toString(36).substr(2, 9)}`,
      ip,
      timestamp: new Date().toISOString(),
      success
    };
    if (!data.loginAttempts) data.loginAttempts = [];
    data.loginAttempts.push(newAttempt);
    saveDb(data);
    return newAttempt;
  },
  getRecentFailedAttempts(ip: string) {
    const data = loadDb();
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    return (data.loginAttempts || []).filter(
      a => a.ip === ip && !a.success && new Date(a.timestamp).getTime() > fifteenMinutesAgo
    );
  },
  clearLoginAttempts(ip: string) {
    const data = loadDb();
    data.loginAttempts = (data.loginAttempts || []).filter(a => a.ip !== ip);
    saveDb(data);
  },
  cleanOldAttempts() {
    const data = loadDb();
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    data.loginAttempts = (data.loginAttempts || []).filter(
      a => new Date(a.timestamp).getTime() > twentyFourHoursAgo
    );
    saveDb(data);
  },
  
  // Session management
  setActiveSuperadminSession(sessionId: string | null) {
    const data = loadDb();
    data.activeSuperadminSessionId = sessionId;
    saveDb(data);
  },
  getActiveSuperadminSession() {
    const data = loadDb();
    return data.activeSuperadminSessionId || null;
  },
  clearActiveSuperadminSession() {
    const data = loadDb();
    data.activeSuperadminSessionId = null;
    saveDb(data);
  },
  
  // Platform lock
  lockPlatform() {
    const data = loadDb();
    data.platformLocked = true;
    saveDb(data);
  },
  unlockPlatform() {
    const data = loadDb();
    data.platformLocked = false;
    saveDb(data);
  },
  isPlatformLocked() {
    const data = loadDb();
    return !!data.platformLocked;
  },
  cloneDemoDataToCompany(targetCompanyId: string, targetUserId: string) {
    const data = loadDb();
    const demoCompanyId = "comp-docket-chambers";
    const demoUserId = "usr-admin-demo";

    // Maps for mapped IDs
    const clientMap = new Map<string, string>();
    const caseMap = new Map<string, string>();
    const templateMap = new Map<string, string>();

    // 1. Company Settings
    const oldSettings = data.companySettings?.find(s => s.companyId === demoCompanyId);
    if (oldSettings) {
      if (!data.companySettings) data.companySettings = [];
      data.companySettings.push({
        ...oldSettings,
        id: `set-${Math.random().toString(36).substr(2, 9)}`,
        companyId: targetCompanyId
      });
    }

    // 2. Clients
    const demoClients = data.clients?.filter(c => c.companyId === demoCompanyId) || [];
    demoClients.forEach(c => {
      const newId = `cli-${Math.random().toString(36).substr(2, 9)}`;
      clientMap.set(c.id, newId);
      if (!data.clients) data.clients = [];
      data.clients.push({
        ...c,
        id: newId,
        companyId: targetCompanyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    // 3. Cases
    const demoCases = data.cases?.filter(c => c.companyId === demoCompanyId) || [];
    demoCases.forEach(c => {
      const newId = `case-${Math.random().toString(36).substr(2, 9)}`;
      caseMap.set(c.id, newId);
      if (!data.cases) data.cases = [];
      data.cases.push({
        ...c,
        id: newId,
        companyId: targetCompanyId,
        clientId: clientMap.get(c.clientId) || c.clientId,
        assignedLawyerId: c.assignedLawyerId === demoUserId ? targetUserId : c.assignedLawyerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    // 4. Case Events
    const demoEvents = data.caseEvents?.filter(e => e.companyId === demoCompanyId) || [];
    demoEvents.forEach(e => {
      const newId = `ev-${Math.random().toString(36).substr(2, 9)}`;
      if (!data.caseEvents) data.caseEvents = [];
      data.caseEvents.push({
        ...e,
        id: newId,
        companyId: targetCompanyId,
        caseId: caseMap.get(e.caseId) || e.caseId,
        createdAt: new Date().toISOString()
      });
    });

    // 5. Deadlines
    const demoDeadlines = data.deadlines?.filter(d => d.companyId === demoCompanyId) || [];
    demoDeadlines.forEach(d => {
      const newId = `ded-${Math.random().toString(36).substr(2, 9)}`;
      if (!data.deadlines) data.deadlines = [];
      data.deadlines.push({
        ...d,
        id: newId,
        companyId: targetCompanyId,
        caseId: caseMap.get(d.caseId) || d.caseId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    // 6. Client Updates
    const demoUpdates = data.clientUpdates?.filter(u => u.companyId === demoCompanyId) || [];
    demoUpdates.forEach(u => {
      const newId = `upd-${Math.random().toString(36).substr(2, 9)}`;
      if (!data.clientUpdates) data.clientUpdates = [];
      data.clientUpdates.push({
        ...u,
        id: newId,
        companyId: targetCompanyId,
        caseId: caseMap.get(u.caseId) || u.caseId,
        clientId: clientMap.get(u.clientId) || u.clientId,
        draftedById: u.draftedById === demoUserId ? targetUserId : u.draftedById,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    // 7. Document Templates
    const demoTemplates = data.documentTemplates?.filter(t => t.companyId === demoCompanyId) || [];
    demoTemplates.forEach(t => {
      const newId = `tmp-${Math.random().toString(36).substr(2, 9)}`;
      templateMap.set(t.id, newId);
      if (!data.documentTemplates) data.documentTemplates = [];
      data.documentTemplates.push({
        ...t,
        id: newId,
        companyId: targetCompanyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    // 8. Generated Documents
    const demoGendocs = data.generatedDocuments?.filter(d => d.companyId === demoCompanyId) || [];
    demoGendocs.forEach(d => {
      const newId = `gdoc-${Math.random().toString(36).substr(2, 9)}`;
      if (!data.generatedDocuments) data.generatedDocuments = [];
      data.generatedDocuments.push({
        ...d,
        id: newId,
        companyId: targetCompanyId,
        caseId: caseMap.get(d.caseId) || d.caseId,
        templateId: templateMap.get(d.templateId) || d.templateId,
        generatedById: d.generatedById === demoUserId ? targetUserId : d.generatedById,
        createdAt: new Date().toISOString()
      });
    });

    // 9. Chat Messages
    const demoChatMsg = data.chatMessages?.filter(m => m.companyId === demoCompanyId) || [];
    demoChatMsg.forEach(m => {
      const newId = `msg-${Math.random().toString(36).substr(2, 9)}`;
      if (!data.chatMessages) data.chatMessages = [];
      data.chatMessages.push({
         ...m,
         id: newId,
         companyId: targetCompanyId,
         sentById: m.sentById === demoUserId ? targetUserId : m.sentById,
         createdAt: new Date().toISOString()
      });
    });

    // 10. Feature Flags
    const demoFlags = data.featureFlags?.filter(f => f.companyId === demoCompanyId) || [];
    demoFlags.forEach(f => {
      const newId = `flag-${Math.random().toString(36).substr(2, 9)}`;
      if (!data.featureFlags) data.featureFlags = [];
      data.featureFlags.push({
        ...f,
        id: newId,
        companyId: targetCompanyId,
        updatedAt: new Date().toISOString()
      });
    });

    saveDb(data);
  },

  // Calendar token management
  saveUserCalendarTokens(userId: string, tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    connectedAt: string;
  }) {
    const data = loadDb();
    const index = data.users.findIndex(u => u.id === userId);
    if (index === -1) return null;
    (data.users[index] as any).googleCalendar = tokens;
    saveDb(data);
    return data.users[index];
  },

  getUserCalendarTokens(userId: string) {
    const user = loadDb().users.find(u => u.id === userId);
    return (user as any)?.googleCalendar || null;
  },

  clearUserCalendarTokens(userId: string) {
    const data = loadDb();
    const index = data.users.findIndex(u => u.id === userId);
    if (index === -1) return;
    delete (data.users[index] as any).googleCalendar;
    saveDb(data);
  },

  updateDeadlineCalendarEventId(companyId: string, deadlineId: string, eventId: string | null) {
    const data = loadDb();
    const index = data.deadlines.findIndex(d => d.companyId === companyId && d.id === deadlineId);
    if (index === -1) return;
    (data.deadlines[index] as any).googleCalendarEventId = eventId;
    saveDb(data);
  }
};
