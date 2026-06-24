import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  UserRole, CaseStatus, ClientUpdateStatus, Company, CompanySettings, User, Client, Case, CaseEvent,
  Deadline, ClientUpdate, DocumentTemplate, GeneratedDocument,
  ChatMessage, ConsentLog, FeatureFlag, CompanyAnnouncement,
  Invitation, RegistrationRequest, AccessUpdateRequest, PlatformFeedback
} from '../src/types';

const DB_PATH = path.join(process.cwd(), 'server', 'memory_db.json');

function generateId(): string {
  return 'mem-' + crypto.randomBytes(8).toString('hex');
}

interface DbState {
  companies: Company[];
  settings: CompanySettings[];
  users: User[];
  clients: Client[];
  cases: Case[];
  caseEvents: CaseEvent[];
  deadlines: Deadline[];
  clientUpdates: ClientUpdate[];
  templates: DocumentTemplate[];
  generatedDocuments: GeneratedDocument[];
  chatMessages: ChatMessage[];
  consentLogs: ConsentLog[];
  featureFlags: FeatureFlag[];
  announcements: CompanyAnnouncement[];
  feedbacks: PlatformFeedback[];
  invitations: Invitation[];
  accessUpdates: AccessUpdateRequest[];
  registrationRequests: RegistrationRequest[];
  auditLogs: any[];
  loginAttempts: any[];
  platformState: { id: string; activeSuperadminSessionId: string | null; platformLocked: boolean };
}

const defaultWidgets = [
  { widgetId: "upcoming_deadlines", widgetType: "upcoming_deadlines", label: "Upcoming Deadlines and Court Dates", isVisible: true, position: 1, config: { daysAhead: 7, includeTypes: ["Court Filing", "Evidence Delivery", "Hearing", "Trial"], separateCourtDates: false, urgencyThresholds: { today_tomorrow: "red", within_3: "amber", within_7: "blue" }, showAssignedLawyer: true, defaultView: "list" } },
  { widgetId: "pending_updates", widgetType: "pending_updates", label: "Pending Client Updates", isVisible: true, position: 2, config: { limit: 5, showPreview: true, showChannelIcons: true } },
  { widgetId: "recent_activity", widgetType: "recent_activity", label: "Recent Case Activity Feed", isVisible: false, position: 3, config: { limit: 5 } },
  { widgetId: "cases_status", widgetType: "cases_status", label: "Cases by Status Chart", isVisible: false, position: 4, config: {} },
  { widgetId: "docs_awaiting", widgetType: "docs_awaiting", label: "Documents Awaiting Action", isVisible: false, position: 5, config: { limit: 5 } },
  { widgetId: "today_agenda", widgetType: "today_agenda", label: "Today's Agenda", isVisible: false, position: 6, config: {} },
  { widgetId: "notifications_panel", widgetType: "notifications_panel", label: "Notifications History Panel", isVisible: false, position: 7, config: { limit: 10 } }
];

const defaultDashboardConfig = {
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

const defaultAnnouncement = {
  isActive: false,
  title: "",
  body: "",
  backgroundColor: "#fee2e2",
  textColor: "#991b1b",
  position: "top" as const,
  updatedAt: ""
};

function getInitialState(): DbState {
  const companyId = "company-default";
  const userId = "usr-alex-rivera";

  const defaultCompany: Company = {
    id: companyId,
    name: "Docket Legal Chambers",
    slug: "docket-chambers",
    setupComplete: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const defaultSettings: CompanySettings = {
    id: "settings-default",
    companyId,
    firmName: "Docket Legal Chambers",
    caseTypes: ["Criminal", "Civil", "Family", "Commercial"],
    courts: ["District Court", "High Court", "Supreme Court"],
    referenceFormat: "DK/[YEAR]/[NUM]",
    address: "100 Law Chambers Way, Suite 400",
    phone: "+1 (555) 123-4567",
    email: "voyyagic@gmail.com",
    theme: {
      primaryColor: '#0f172a',
      secondaryColor: '#64748b',
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      buttonColor: '#38bdf8',
      buttonStyle: 'rounded',
      fontFamily: 'Inter',
      fontSize: 'medium',
      borderRadius: 'round',
      sidebarColor: '#0f172a',
      navIconColor: '#38bdf8'
    },
    navigation: {
      dashboard: { visible: true, label: 'Dashboard', order: 1 },
      cases: { visible: true, label: 'Cases', order: 2 },
      reminders: { visible: true, label: 'Deadline & Reminders', order: 3 },
      updates: { visible: true, label: 'Updates', order: 4 },
      documents: { visible: true, label: 'Documents', order: 5 },
      chat: { visible: true, label: 'Chat', order: 6 },
      settings: { visible: true, label: 'Settings', order: 7 }
    },
    reminderDefaults: { daysBefore: [1, 3, 7], notifyWhom: 'whole_team', delivery: ['system', 'email'] },
    updatePreferences: { workflow: 'draft_review', tone: 'formal', channels: ['email'] },
    branding: {},
    communicationStyle: {
      tone: 'Professional and Friendly',
      observedPatterns: ['clear milestones', 'proactive status notices'],
      structure: 'High compliance with automated message templates'
    },
    activeChannels: { email: true, whatsapp: false, sms: false, voice: false },
    caseStages: ["Client Consultation", "Pleadings Built", "Hearing Phase", "Archived"],
    dashboardWidgets: defaultWidgets,
    firmAnnouncement: defaultAnnouncement,
    dashboardConfig: defaultDashboardConfig,
    updatedAt: new Date().toISOString()
  };

  const defaultUser: User = {
    id: userId,
    companyId,
    fullName: "Alex Rivera",
    email: "voyyagic@gmail.com",
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=Alex`,
    role: UserRole.ADMIN,
    isActive: true,
    isSuperAdmin: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const client1: Client = {
    id: "client-1",
    companyId,
    fullName: "Acme Corporation",
    email: "legal@acme.com",
    phone: "+1 (555) 987-6543",
    address: "456 Enterprise Boulevard, Tech City",
    notes: "Key enterprise client for corporate restructuring and IP litigation.",
    isVip: true,
    riskRating: "low",
    valueTier: "platinum",
    kycStatus: "verified",
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const client2: Client = {
    id: "client-2",
    companyId,
    fullName: "Johnathan Miller",
    email: "john.miller@example.com",
    phone: "+1 (555) 234-5678",
    address: "789 Residential Way, Green Town",
    notes: "Individual client for personal civil dispute and real estate consulting.",
    isVip: false,
    riskRating: "medium",
    valueTier: "gold",
    kycStatus: "verified",
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const case1: Case = {
    id: "case-1",
    companyId,
    clientId: "client-1",
    referenceNumber: "DK/2026/001",
    caseType: "Commercial",
    court: "Supreme Court",
    opposingParty: "Globex Industries Inc.",
    assignedLawyerId: userId,
    currentStage: "Pleadings Built",
    status: CaseStatus.ACTIVE,
    openedDate: new Date().toISOString(),
    priority: "High",
    caseValue: 750000,
    budget: 50000,
    statuteOfLimitations: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const case2: Case = {
    id: "case-2",
    companyId,
    clientId: "client-2",
    referenceNumber: "DK/2026/002",
    caseType: "Civil",
    court: "District Court",
    opposingParty: "City Housing Authority",
    assignedLawyerId: userId,
    currentStage: "Hearing Phase",
    status: CaseStatus.ACTIVE,
    openedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "Medium",
    caseValue: 120000,
    budget: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const deadline1: Deadline = {
    id: "deadline-1",
    companyId,
    caseId: "case-1",
    title: "File Opposition Brief",
    deadlineType: "Court Filing",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    remindDaysBefore: [1, 3, 7],
    notifyAll: true,
    isResolved: false,
    remindersSent: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const deadline2: Deadline = {
    id: "deadline-2",
    companyId,
    caseId: "case-2",
    title: "Evidentiary Hearing Schedule",
    deadlineType: "Hearing",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    remindDaysBefore: [1, 2],
    notifyAll: false,
    isResolved: false,
    remindersSent: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const featureFlags = [
    { id: "flag-1", companyId, featureName: "ai_client_updates", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-2", companyId, featureName: "document_generator", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-3", companyId, featureName: "team_chat", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-4", companyId, featureName: "reminders", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-5", companyId, featureName: "client_updates", isEnabled: true, updatedAt: new Date().toISOString() },
    { id: "flag-6", companyId, featureName: "whatsapp_channel", isEnabled: false, updatedAt: new Date().toISOString() },
    { id: "flag-7", companyId, featureName: "sms_channel", isEnabled: false, updatedAt: new Date().toISOString() }
  ];

  const chatMessages: ChatMessage[] = [
    {
      id: "msg-1",
      companyId,
      caseId: "case-1",
      sentById: userId,
      message: "Hey team, the draft for the opposition brief is nearly ready. I'll need a peer-review by tomorrow noon.",
      readBy: [userId],
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  return {
    companies: [defaultCompany],
    settings: [defaultSettings],
    users: [defaultUser],
    clients: [client1, client2],
    cases: [case1, case2],
    caseEvents: [],
    deadlines: [deadline1, deadline2],
    clientUpdates: [],
    templates: [],
    generatedDocuments: [],
    chatMessages,
    consentLogs: [],
    featureFlags,
    announcements: [],
    feedbacks: [],
    invitations: [],
    accessUpdates: [],
    registrationRequests: [],
    auditLogs: [],
    loginAttempts: [],
    platformState: { id: "singleton", activeSuperadminSessionId: null, platformLocked: false }
  };
}

let dbCache: DbState | null = null;

function loadDb(): DbState {
  if (dbCache) return dbCache;
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      dbCache = JSON.parse(content);
      return dbCache!;
    }
  } catch (error) {
    console.error('[MemoryDB] Failed to load JSON db, using seeded defaults:', error);
  }
  dbCache = getInitialState();
  saveDb(dbCache);
  return dbCache;
}

function saveDb(state: DbState) {
  try {
    const parentDir = path.dirname(DB_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('[MemoryDB] Failed to save JSON db:', error);
  }
}

export const memoryDb = {
  // ─── COMPANIES ──────────────────────────────────────────────────────
  getCompanies: async (): Promise<Company[]> => {
    return loadDb().companies;
  },

  getCompany: async (id: string): Promise<Company | null> => {
    return loadDb().companies.find(c => c.id === id) || null;
  },

  getCompanyBySlug: async (slug: string): Promise<Company | null> => {
    return loadDb().companies.find(c => c.slug === slug) || null;
  },

  createCompany: async (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> => {
    const db = loadDb();
    const newCompany: Company = {
      ...company,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.companies.push(newCompany);
    saveDb(db);
    return newCompany;
  },

  updateCompany: async (id: string, updates: Partial<Company>): Promise<Company | null> => {
    const db = loadDb();
    const idx = db.companies.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.companies[idx] = {
      ...db.companies[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
    return db.companies[idx];
  },

  deleteCompany: async (id: string): Promise<void> => {
    const db = loadDb();
    db.companies = db.companies.filter(c => c.id !== id);
    db.settings = db.settings.filter(s => s.companyId !== id);
    db.users = db.users.filter(u => u.companyId !== id);
    db.clients = db.clients.filter(c => c.companyId !== id);
    db.cases = db.cases.filter(c => c.companyId !== id);
    db.caseEvents = db.caseEvents.filter(e => e.companyId !== id);
    db.deadlines = db.deadlines.filter(d => d.companyId !== id);
    db.clientUpdates = db.clientUpdates.filter(u => u.companyId !== id);
    db.templates = db.templates.filter(t => t.companyId !== id);
    db.generatedDocuments = db.generatedDocuments.filter(d => d.companyId !== id);
    db.chatMessages = db.chatMessages.filter(m => m.companyId !== id);
    db.consentLogs = db.consentLogs.filter(l => l.companyId !== id);
    db.featureFlags = db.featureFlags.filter(f => f.companyId !== id);
    db.announcements = db.announcements.filter(a => a.companyId !== id);
    db.invitations = db.invitations.filter(i => i.companyId !== id);
    db.accessUpdates = db.accessUpdates.filter(u => u.companyId !== id);
    saveDb(db);
  },

  // ─── COMPANY SETTINGS ───────────────────────────────────────────────
  getSettings: async (companyId: string): Promise<CompanySettings> => {
    const db = loadDb();
    let found = db.settings.find(s => s.companyId === companyId);
    if (!found) {
      found = {
        id: generateId(),
        companyId,
        caseTypes: ["Criminal", "Civil", "Family"],
        courts: ["High Court", "Supreme Court"],
        caseStages: ["Client Consultation", "Pleadings Built", "Hearing Phase", "Archived"],
        theme: {
          primaryColor: '#1e293b', secondaryColor: '#475569', backgroundColor: '#f8fafc',
          textColor: '#0f172a', buttonColor: '#2563eb', buttonStyle: 'rounded', fontFamily: 'Inter',
          fontSize: 'medium', borderRadius: 'medium', sidebarColor: '#0f172a', navIconColor: '#94a3b8'
        },
        navigation: {
          dashboard: { visible: true, label: 'Dashboard', order: 1 },
          cases: { visible: true, label: 'Cases', order: 2 },
          reminders: { visible: true, label: 'Deadline & Reminders', order: 3 },
          updates: { visible: true, label: 'Updates', order: 4 },
          documents: { visible: true, label: 'Documents', order: 5 },
          chat: { visible: true, label: 'Chat', order: 6 },
          settings: { visible: true, label: 'Settings', order: 7 }
        },
        reminderDefaults: { daysBefore: [1, 3, 7], notifyWhom: 'whole_team', delivery: ['system'] },
        updatePreferences: { workflow: 'draft_review', tone: 'formal', channels: ['email'] },
        branding: {},
        communicationStyle: {},
        activeChannels: { email: true, whatsapp: false, sms: false, voice: false },
        dashboardWidgets: defaultWidgets,
        firmAnnouncement: defaultAnnouncement,
        dashboardConfig: defaultDashboardConfig,
        updatedAt: new Date().toISOString()
      };
      db.settings.push(found);
      saveDb(db);
    }
    return found;
  },

  updateSettings: async (companyId: string, updates: Partial<CompanySettings>): Promise<CompanySettings> => {
    const db = loadDb();
    const idx = db.settings.findIndex(s => s.companyId === companyId);
    if (idx !== -1) {
      db.settings[idx] = {
        ...db.settings[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      } as CompanySettings;
    } else {
      const newSettings: CompanySettings = {
        id: generateId(),
        companyId,
        caseTypes: ["Criminal", "Civil", "Family"],
        courts: ["High Court", "Supreme Court"],
        caseStages: ["Client Consultation", "Pleadings Built", "Hearing Phase", "Archived"],
        theme: {
          primaryColor: '#1e293b', secondaryColor: '#475569', backgroundColor: '#f8fafc',
          textColor: '#0f172a', buttonColor: '#2563eb', buttonStyle: 'rounded', fontFamily: 'Inter',
          fontSize: 'medium', borderRadius: 'medium', sidebarColor: '#0f172a', navIconColor: '#94a3b8'
        },
        navigation: {
          dashboard: { visible: true, label: 'Dashboard', order: 1 },
          cases: { visible: true, label: 'Cases', order: 2 },
          reminders: { visible: true, label: 'Deadline & Reminders', order: 3 },
          updates: { visible: true, label: 'Updates', order: 4 },
          documents: { visible: true, label: 'Documents', order: 5 },
          chat: { visible: true, label: 'Chat', order: 6 },
          settings: { visible: true, label: 'Settings', order: 7 }
        },
        reminderDefaults: { daysBefore: [1, 3, 7], notifyWhom: 'whole_team', delivery: ['system'] },
        updatePreferences: { workflow: 'draft_review', tone: 'formal', channels: ['email'] },
        branding: {},
        communicationStyle: {},
        activeChannels: { email: true, whatsapp: false, sms: false, voice: false },
        dashboardWidgets: defaultWidgets,
        firmAnnouncement: defaultAnnouncement,
        dashboardConfig: defaultDashboardConfig,
        ...updates,
        updatedAt: new Date().toISOString()
      } as CompanySettings;
      db.settings.push(newSettings);
    }
    saveDb(db);
    return db.settings.find(s => s.companyId === companyId)!;
  },

  // ─── USERS ──────────────────────────────────────────────────────────
  getUsers: async (companyId: string): Promise<User[]> => {
    return loadDb().users.filter(u => u.companyId === companyId);
  },

  getUser: async (id: string): Promise<User | null> => {
    return loadDb().users.find(u => u.id === id) || null;
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    return loadDb().users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  createUser: async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
    const db = loadDb();
    const newUser: User = {
      ...user,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as User;
    db.users.push(newUser);
    saveDb(db);
    return newUser;
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User | null> => {
    const db = loadDb();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = {
      ...db.users[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    } as User;
    saveDb(db);
    return db.users[idx];
  },

  // ─── CLIENTS ────────────────────────────────────────────────────────
  getClients: async (companyId: string): Promise<Client[]> => {
    return loadDb().clients.filter(c => c.companyId === companyId);
  },

  getClient: async (companyId: string, id: string): Promise<Client | null> => {
    return loadDb().clients.find(c => c.id === id && c.companyId === companyId) || null;
  },

  createClient: async (companyId: string, client: Omit<Client, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
    const db = loadDb();
    const newClient: Client = {
      ...client,
      id: generateId(),
      companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.clients.push(newClient);
    saveDb(db);
    return newClient;
  },

  updateClient: async (companyId: string, id: string, updates: Partial<Client>): Promise<Client | null> => {
    const db = loadDb();
    const idx = db.clients.findIndex(c => c.id === id && c.companyId === companyId);
    if (idx === -1) return null;
    db.clients[idx] = {
      ...db.clients[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
    return db.clients[idx];
  },

  deleteClient: async (companyId: string, id: string): Promise<boolean> => {
    const db = loadDb();
    const len = db.clients.length;
    db.clients = db.clients.filter(c => !(c.id === id && c.companyId === companyId));
    saveDb(db);
    return db.clients.length < len;
  },

  // ─── CASES ──────────────────────────────────────────────────────────
  getCases: async (companyId: string): Promise<Case[]> => {
    return loadDb().cases.filter(c => c.companyId === companyId);
  },

  getCase: async (companyId: string, id: string): Promise<Case | null> => {
    return loadDb().cases.find(c => c.id === id && c.companyId === companyId) || null;
  },

  createCase: async (companyId: string, item: Omit<Case, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>): Promise<Case> => {
    const db = loadDb();
    const newCase: Case = {
      ...item,
      id: generateId(),
      companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.cases.push(newCase);
    saveDb(db);
    return newCase;
  },

  updateCase: async (companyId: string, id: string, updates: Partial<Case>): Promise<Case | null> => {
    const db = loadDb();
    const idx = db.cases.findIndex(c => c.id === id && c.companyId === companyId);
    if (idx === -1) return null;
    db.cases[idx] = {
      ...db.cases[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
    return db.cases[idx];
  },

  // ─── CASE EVENTS ────────────────────────────────────────────────────
  getCaseEvents: async (companyId: string, caseId: string): Promise<CaseEvent[]> => {
    return loadDb().caseEvents.filter(e => e.companyId === companyId && e.caseId === caseId);
  },

  createCaseEvent: async (companyId: string, event: Omit<CaseEvent, 'id' | 'companyId' | 'createdAt'>): Promise<CaseEvent> => {
    const db = loadDb();
    const newEvent: CaseEvent = {
      ...event,
      id: generateId(),
      companyId,
      createdAt: new Date().toISOString()
    };
    db.caseEvents.push(newEvent);
    saveDb(db);
    return newEvent;
  },

  // ─── DEADLINES ──────────────────────────────────────────────────────
  getDeadlines: async (companyId: string): Promise<Deadline[]> => {
    return loadDb().deadlines.filter(d => d.companyId === companyId);
  },

  getCaseDeadlines: async (companyId: string, caseId: string): Promise<Deadline[]> => {
    return loadDb().deadlines.filter(d => d.companyId === companyId && d.caseId === caseId);
  },

  createDeadline: async (companyId: string, deadline: Omit<Deadline, 'id' | 'companyId' | 'remindersSent' | 'createdAt' | 'updatedAt'>): Promise<Deadline> => {
    const db = loadDb();
    const newDeadline: Deadline = {
      ...deadline,
      id: generateId(),
      companyId,
      remindersSent: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.deadlines.push(newDeadline);
    saveDb(db);
    return newDeadline;
  },

  updateDeadline: async (companyId: string, id: string, updates: Partial<Deadline>): Promise<Deadline | null> => {
    const db = loadDb();
    const idx = db.deadlines.findIndex(d => d.id === id && d.companyId === companyId);
    if (idx === -1) return null;
    db.deadlines[idx] = {
      ...db.deadlines[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
    return db.deadlines[idx];
  },

  updateDeadlineCalendarEventId: async (companyId: string, deadlineId: string, eventId: string | null): Promise<void> => {
    const db = loadDb();
    const idx = db.deadlines.findIndex(d => d.id === deadlineId && d.companyId === companyId);
    if (idx !== -1) {
      db.deadlines[idx].googleCalendarEventId = eventId || undefined;
      saveDb(db);
    }
  },

  // ─── CLIENT UPDATES ─────────────────────────────────────────────────
  getClientUpdates: async (companyId: string): Promise<ClientUpdate[]> => {
    return loadDb().clientUpdates.filter(u => u.companyId === companyId);
  },

  createClientUpdate: async (companyId: string, update: Omit<ClientUpdate, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>): Promise<ClientUpdate> => {
    const db = loadDb();
    const newUpdate: ClientUpdate = {
      ...update,
      id: generateId(),
      companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.clientUpdates.push(newUpdate);
    saveDb(db);
    return newUpdate;
  },

  updateClientUpdate: async (companyId: string, id: string, updates: Partial<ClientUpdate>): Promise<ClientUpdate | null> => {
    const db = loadDb();
    const idx = db.clientUpdates.findIndex(u => u.id === id && u.companyId === companyId);
    if (idx === -1) return null;
    db.clientUpdates[idx] = {
      ...db.clientUpdates[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
    return db.clientUpdates[idx];
  },

  // ─── DOCUMENT TEMPLATES ─────────────────────────────────────────────
  getTemplates: async (companyId: string): Promise<DocumentTemplate[]> => {
    return loadDb().templates.filter(t => t.companyId === companyId);
  },

  getTemplate: async (companyId: string, id: string): Promise<DocumentTemplate | null> => {
    return loadDb().templates.find(t => t.id === id && t.companyId === companyId) || null;
  },

  createTemplate: async (companyId: string, template: Omit<DocumentTemplate, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>): Promise<DocumentTemplate> => {
    const db = loadDb();
    const newTemplate: DocumentTemplate = {
      ...template,
      id: generateId(),
      companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.templates.push(newTemplate);
    saveDb(db);
    return newTemplate;
  },

  deleteTemplate: async (companyId: string, id: string): Promise<void> => {
    const db = loadDb();
    db.templates = db.templates.filter(t => !(t.id === id && t.companyId === companyId));
    saveDb(db);
  },

  // ─── GENERATED DOCUMENTS ────────────────────────────────────────────
  getGeneratedDocuments: async (companyId: string): Promise<GeneratedDocument[]> => {
    return loadDb().generatedDocuments.filter(d => d.companyId === companyId);
  },

  getCaseGeneratedDocuments: async (companyId: string, caseId: string): Promise<GeneratedDocument[]> => {
    return loadDb().generatedDocuments.filter(d => d.companyId === companyId && d.caseId === caseId);
  },

  createGeneratedDocument: async (companyId: string, document: Omit<GeneratedDocument, 'id' | 'companyId' | 'createdAt'>): Promise<GeneratedDocument> => {
    const db = loadDb();
    const newDoc: GeneratedDocument = {
      ...document,
      id: generateId(),
      companyId,
      createdAt: new Date().toISOString()
    };
    db.generatedDocuments.push(newDoc);
    saveDb(db);
    return newDoc;
  },

  // ─── CHAT ───────────────────────────────────────────────────────────
  getChatMessages: async (companyId: string, caseId: string | null): Promise<ChatMessage[]> => {
    return loadDb().chatMessages.filter(m => m.companyId === companyId && m.caseId === caseId);
  },

  createChatMessage: async (companyId: string, message: Omit<ChatMessage, 'id' | 'companyId' | 'createdAt'>): Promise<ChatMessage> => {
    const db = loadDb();
    const newMsg: ChatMessage = {
      ...message,
      id: generateId(),
      companyId,
      createdAt: new Date().toISOString()
    };
    db.chatMessages.push(newMsg);
    saveDb(db);
    return newMsg;
  },

  markChatRead: async (companyId: string, caseId: string | null, userId: string): Promise<void> => {
    const db = loadDb();
    db.chatMessages.forEach(m => {
      if (m.companyId === companyId && m.caseId === caseId) {
        if (!m.readBy.includes(userId)) {
          m.readBy.push(userId);
        }
      }
    });
    saveDb(db);
  },

  updateChatMessage: async (id: string, messageText: string, editedAt: string): Promise<ChatMessage | null> => {
    const db = loadDb();
    const msg = db.chatMessages.find(m => m.id === id);
    if (!msg || msg.isOnRecord) return null;
    msg.editHistory = Array.isArray(msg.editHistory) ? [...msg.editHistory, msg.message] : [msg.message];
    msg.message = messageText;
    msg.editedAt = editedAt;
    saveDb(db);
    return msg;
  },

  deleteChatMessage: async (id: string): Promise<ChatMessage | null> => {
    const db = loadDb();
    const msg = db.chatMessages.find(m => m.id === id);
    if (!msg || msg.isOnRecord) return null;
    msg.isDeleted = true;
    msg.deletedAt = new Date().toISOString();
    msg.message = 'Message deleted';
    saveDb(db);
    return msg;
  },

  toggleChatMessageReaction: async (id: string, emoji: string, userId: string): Promise<ChatMessage | null> => {
    const db = loadDb();
    const msg = db.chatMessages.find(m => m.id === id);
    if (!msg) return null;
    msg.reactions = msg.reactions || {};
    const list = msg.reactions[emoji] || [];
    const idx = list.indexOf(userId);
    if (idx > -1) {
      list.splice(idx, 1);
      if (list.length === 0) delete msg.reactions[emoji];
      else msg.reactions[emoji] = list;
    } else {
      msg.reactions[emoji] = [...list, userId];
    }
    saveDb(db);
    return msg;
  },

  markChatMessageOnRecord: async (id: string, userId: string): Promise<ChatMessage | null> => {
    const db = loadDb();
    const msg = db.chatMessages.find(m => m.id === id);
    if (!msg) return null;
    msg.isOnRecord = true;
    msg.onRecordAt = new Date().toISOString();
    msg.onRecordById = userId;
    saveDb(db);
    return msg;
  },

  // ─── CONSENT LOGS ───────────────────────────────────────────────────
  getConsentLogs: async (companyId: string): Promise<ConsentLog[]> => {
    return loadDb().consentLogs.filter(l => l.companyId === companyId);
  },

  createConsentLog: async (companyId: string, log: Omit<ConsentLog, 'id' | 'companyId' | 'consentedAt'>): Promise<ConsentLog> => {
    const db = loadDb();
    const newLog: ConsentLog = {
      ...log,
      id: generateId(),
      companyId,
      consentedAt: new Date().toISOString()
    } as any;
    db.consentLogs.push(newLog);
    saveDb(db);
    return newLog;
  },

  // ─── FEATURE FLAGS ──────────────────────────────────────────────────
  getFeatureFlags: async (companyId: string): Promise<FeatureFlag[]> => {
    const db = loadDb();
    const list = db.featureFlags.filter(f => f.companyId === companyId);
    if (list.length === 0) {
      const defaultNames = ['ai_client_updates', 'document_generator', 'team_chat', 'reminders', 'client_updates', 'whatsapp_channel', 'sms_channel'];
      const created: FeatureFlag[] = defaultNames.map(f => ({
        id: generateId(),
        companyId,
        featureName: f,
        isEnabled: f !== 'whatsapp_channel' && f !== 'sms_channel',
        updatedAt: new Date().toISOString()
      }));
      db.featureFlags.push(...created);
      saveDb(db);
      return created;
    }
    return list;
  },

  toggleFeatureFlag: async (companyId: string, featureName: string, isEnabled: boolean): Promise<FeatureFlag> => {
    const db = loadDb();
    let found = db.featureFlags.find(f => f.companyId === companyId && f.featureName === featureName);
    if (found) {
      found.isEnabled = isEnabled;
      found.updatedAt = new Date().toISOString();
    } else {
      found = {
        id: generateId(),
        companyId,
        featureName,
        isEnabled,
        updatedAt: new Date().toISOString()
      };
      db.featureFlags.push(found);
    }
    saveDb(db);
    return found;
  },

  // ─── ANNOUNCEMENTS ──────────────────────────────────────────────────
  getAnnouncements: async (companyId: string): Promise<CompanyAnnouncement[]> => {
    return loadDb().announcements.filter(a => a.companyId === null || a.companyId === companyId);
  },

  createAnnouncement: async (ann: Omit<CompanyAnnouncement, 'id' | 'isDismissed' | 'createdAt'>): Promise<CompanyAnnouncement> => {
    const db = loadDb();
    const newAnn: CompanyAnnouncement = {
      ...ann,
      id: generateId(),
      isDismissed: false,
      createdAt: new Date().toISOString()
    };
    db.announcements.push(newAnn);
    saveDb(db);
    return newAnn;
  },

  // ─── PLATFORM FEEDBACK ──────────────────────────────────────────────
  getPlatformFeedbacks: async (): Promise<PlatformFeedback[]> => {
    return loadDb().feedbacks;
  },

  createPlatformFeedback: async (companyId: string, userId: string, type: string, message: string): Promise<PlatformFeedback> => {
    const db = loadDb();
    const feedback: PlatformFeedback = {
      id: generateId(),
      companyId,
      userId,
      type: type as any,
      message,
      isRead: false,
      submittedAt: new Date().toISOString()
    };
    db.feedbacks.push(feedback);
    saveDb(db);
    return feedback;
  },

  // ─── INVITATIONS ────────────────────────────────────────────────────
  createInvitation: async (invitation: Omit<Invitation, 'id' | 'createdAt'>): Promise<Invitation> => {
    const db = loadDb();
    const newInv: Invitation = {
      ...invitation,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    db.invitations.push(newInv);
    saveDb(db);
    return newInv;
  },

  getInvitationByToken: async (plainToken: string): Promise<Invitation | null> => {
    const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
    return loadDb().invitations.find(i => i.tokenHash === hash) || null;
  },

  getInvitationsByCompany: async (companyId: string): Promise<Invitation[]> => {
    return loadDb().invitations.filter(i => i.companyId === companyId);
  },

  markInvitationAccepted: async (id: string): Promise<Invitation | null> => {
    const db = loadDb();
    const found = db.invitations.find(i => i.id === id);
    if (!found) return null;
    found.isActive = false;
    found.acceptedAt = new Date().toISOString();
    saveDb(db);
    return found;
  },

  revokeInvitation: async (companyId: string, invitationId: string): Promise<boolean> => {
    const db = loadDb();
    const found = db.invitations.find(i => i.id === invitationId && i.companyId === companyId);
    if (!found) return false;
    found.isActive = false;
    saveDb(db);
    return true;
  },

  expireOldInvitations: async (): Promise<void> => {
    const db = loadDb();
    const now = new Date();
    db.invitations.forEach(i => {
      if (i.isActive && new Date(i.expiresAt) < now) {
        i.isActive = false;
      }
    });
    saveDb(db);
  },

  // ─── ACCESS UPDATE REQUESTS ─────────────────────────────────────────
  createAccessUpdateRequest: async (request: Omit<AccessUpdateRequest, 'id' | 'createdAt'>): Promise<AccessUpdateRequest> => {
    const db = loadDb();
    const newReq: AccessUpdateRequest = {
      ...request,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    db.accessUpdates.push(newReq);
    saveDb(db);
    return newReq;
  },

  getAccessUpdateByToken: async (plainToken: string): Promise<AccessUpdateRequest | null> => {
    const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
    return loadDb().accessUpdates.find(u => u.tokenHash === hash) || null;
  },

  markAccessUpdateApplied: async (id: string): Promise<AccessUpdateRequest | null> => {
    const db = loadDb();
    const found = db.accessUpdates.find(u => u.id === id);
    if (!found) return null;
    found.isActive = false;
    found.appliedAt = new Date().toISOString();
    saveDb(db);
    return found;
  },

  expireOldAccessUpdates: async (): Promise<void> => {
    const db = loadDb();
    const now = new Date();
    db.accessUpdates.forEach(u => {
      if (u.isActive && new Date(u.expiresAt) < now) {
        u.isActive = false;
      }
    });
    saveDb(db);
  },

  // ─── REGISTRATION REQUESTS ──────────────────────────────────────────
  createRegistrationRequest: async (request: Omit<RegistrationRequest, 'id' | 'createdAt'>): Promise<RegistrationRequest> => {
    const db = loadDb();
    const newReq: RegistrationRequest = {
      ...request,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    db.registrationRequests.push(newReq);
    saveDb(db);
    return newReq;
  },

  getRegistrationRequests: async (): Promise<RegistrationRequest[]> => {
    return loadDb().registrationRequests;
  },

  updateRegistrationRequest: async (id: string, updates: Partial<RegistrationRequest>): Promise<RegistrationRequest | null> => {
    const db = loadDb();
    const idx = db.registrationRequests.findIndex(r => r.id === id);
    if (idx === -1) return null;
    db.registrationRequests[idx] = {
      ...db.registrationRequests[idx],
      ...updates
    };
    saveDb(db);
    return db.registrationRequests[idx];
  },

  // ─── AUDIT LOG ──────────────────────────────────────────────────────
  createAuditEntry: async (entry: {
    action: string; ip: string; detail: string;
    endpoint?: string; method?: string; targetCompanyId?: string; targetUserId?: string; result?: string;
  }): Promise<any> => {
    const db = loadDb();
    const log = {
      id: generateId(),
      ...entry,
      timestamp: new Date().toISOString()
    };
    db.auditLogs.push(log);
    saveDb(db);
    return log;
  },

  getAuditLog: async (filters?: { limit?: number; action?: string; from?: string; to?: string }): Promise<any[]> => {
    let logs = loadDb().auditLogs;
    if (filters?.action) logs = logs.filter(l => l.action === filters.action);
    if (filters?.from) logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.from!));
    if (filters?.to) logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.to!));
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (filters?.limit) logs = logs.slice(0, filters.limit);
    return logs;
  },

  // ─── LOGIN ATTEMPTS ─────────────────────────────────────────────────
  recordLoginAttempt: async (ip: string, success: boolean): Promise<any> => {
    const db = loadDb();
    const log = {
      id: generateId(),
      ip,
      success,
      timestamp: new Date().toISOString()
    };
    db.loginAttempts.push(log);
    saveDb(db);
    return log;
  },

  getRecentFailedAttempts: async (ip: string): Promise<any[]> => {
    const fifteenMinAgo = Date.now() - (15 * 60 * 1000);
    return loadDb().loginAttempts.filter(l => l.ip === ip && !l.success && new Date(l.timestamp).getTime() > fifteenMinAgo);
  },

  clearLoginAttempts: async (ip: string): Promise<void> => {
    const db = loadDb();
    db.loginAttempts = db.loginAttempts.filter(l => l.ip !== ip);
    saveDb(db);
  },

  cleanOldAttempts: async (): Promise<void> => {
    const db = loadDb();
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    db.loginAttempts = db.loginAttempts.filter(l => new Date(l.timestamp).getTime() > twentyFourHoursAgo);
    saveDb(db);
  },

  // ─── PLATFORM STATE (singleton row) ─────────────────────────────────
  setActiveSuperadminSession: async (sessionId: string | null): Promise<void> => {
    const db = loadDb();
    db.platformState.activeSuperadminSessionId = sessionId;
    saveDb(db);
  },

  getActiveSuperadminSession: async (): Promise<string | null> => {
    return loadDb().platformState.activeSuperadminSessionId;
  },

  clearActiveSuperadminSession: async (): Promise<void> => {
    const db = loadDb();
    db.platformState.activeSuperadminSessionId = null;
    saveDb(db);
  },

  lockPlatform: async (): Promise<void> => {
    const db = loadDb();
    db.platformState.platformLocked = true;
    saveDb(db);
  },

  unlockPlatform: async (): Promise<void> => {
    const db = loadDb();
    db.platformState.platformLocked = false;
    saveDb(db);
  },

  isPlatformLocked: async (): Promise<boolean> => {
    return loadDb().platformState.platformLocked;
  },

  // ─── DEMO DATA CLONING ──────────────────────────────────────────────
  cloneDemoDataToCompany: async (targetCompanyId: string, targetUserId: string): Promise<void> => {
    // Just a stub for memoryDb setup (can clone memory arrays if needed, but not critical)
    console.log('[MemoryDB] cloneDemoDataToCompany called:', targetCompanyId, targetUserId);
  },

  // ─── GOOGLE CALENDAR TOKENS ─────────────────────────────────────────
  saveUserCalendarTokens: async (userId: string, tokens: { accessToken: string; refreshToken: string; expiresAt: string; connectedAt: string }): Promise<User | null> => {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    user.googleCalendar = tokens;
    saveDb(db);
    return user;
  },

  getUserCalendarTokens: async (userId: string): Promise<any | null> => {
    const user = loadDb().users.find(u => u.id === userId);
    return user?.googleCalendar || null;
  },

  clearUserCalendarTokens: async (userId: string): Promise<User | null> => {
    const db = loadDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    user.googleCalendar = undefined;
    saveDb(db);
    return user;
  }
};
