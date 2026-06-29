import crypto from 'crypto';
import { prisma } from './prismaClient';
import {
  Company, CompanySettings, User, Client, Case, CaseEvent,
  Deadline, ClientUpdate, DocumentTemplate, GeneratedDocument,
  ChatMessage, ConsentLog, FeatureFlag, CompanyAnnouncement,
  Invitation, RegistrationRequest, AccessUpdateRequest
} from '../src/types';

// ─────────────────────────────────────────────────────────────────────────
// Default config blocks (used when lazily creating CompanySettings for a
// company that doesn't have a row yet). Kept as named exports in case
// anything else wants them (matches the old db.ts's exports).
// ─────────────────────────────────────────────────────────────────────────

export const defaultWidgets = [
  { widgetId: "upcoming_deadlines", widgetType: "upcoming_deadlines", label: "Upcoming Deadlines and Court Dates", isVisible: true, position: 1, config: { daysAhead: 7, includeTypes: ["Court Filing", "Evidence Delivery", "Hearing", "Trial"], separateCourtDates: false, urgencyThresholds: { today_tomorrow: "red", within_3: "amber", within_7: "blue" }, showAssignedLawyer: true, defaultView: "list" } },
  { widgetId: "pending_updates", widgetType: "pending_updates", label: "Pending Client Updates", isVisible: true, position: 2, config: { limit: 5, showPreview: true, showChannelIcons: true } },
  { widgetId: "recent_activity", widgetType: "recent_activity", label: "Recent Case Activity Feed", isVisible: false, position: 3, config: { limit: 5 } },
  { widgetId: "cases_status", widgetType: "cases_status", label: "Cases by Status Chart", isVisible: false, position: 4, config: {} },
  { widgetId: "docs_awaiting", widgetType: "docs_awaiting", label: "Documents Awaiting Action", isVisible: false, position: 5, config: { limit: 5 } },
  { widgetId: "today_agenda", widgetType: "today_agenda", label: "Today's Agenda", isVisible: false, position: 6, config: {} },
  { widgetId: "notifications_panel", widgetType: "notifications_panel", label: "Notifications History Panel", isVisible: false, position: 7, config: { limit: 10 } }
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

// ─────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────

function toDate(value: any): Date | undefined {
  if (value === undefined || value === null) return undefined;
  return value instanceof Date ? value : new Date(value);
}

// Converts any of the named keys on an object into real Date instances if present.
// Lets route handlers keep passing ISO strings (like the old code always did)
// while Prisma gets proper Date objects.
function withDates<T extends Record<string, any>>(obj: T, keys: string[]): T {
  const copy: any = { ...obj };
  keys.forEach(k => {
    if (copy[k] !== undefined) copy[k] = toDate(copy[k]);
  });
  return copy;
}

const FIFTEEN_MIN = 15 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const PLATFORM_STATE_ID = 'singleton';

// ─────────────────────────────────────────────────────────────────────────
// The db object — same method names as the old JSON-file version.
// Every method is now async and must be awaited by the caller.
// ─────────────────────────────────────────────────────────────────────────

const prismaDb = {
  // ─── COMPANIES ──────────────────────────────────────────────────────
  getCompanies: () => prisma.company.findMany(),

  getCompany: (id: string) => prisma.company.findUnique({ where: { id } }),

  getCompanyBySlug: (slug: string) => prisma.company.findUnique({ where: { slug } }),

  createCompany: (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) =>
    prisma.company.create({ data: company as any }),

  updateCompany: async (id: string, updates: Partial<Company>) => {
    try {
      return await prisma.company.update({ where: { id }, data: updates as any });
    } catch (err: any) {
      if (err.code === 'P2025') return null;
      throw err;
    }
  },

  // Cascades automatically — every Client/Case/User/etc. row tied to this
  // company is removed by the database thanks to onDelete: Cascade in schema.prisma.
  deleteCompany: async (id: string) => {
    try {
      await prisma.company.delete({ where: { id } });
    } catch (err: any) {
      if (err.code !== 'P2025') throw err;
    }
  },

  // ─── COMPANY SETTINGS ───────────────────────────────────────────────
  getSettings: (companyId: string) =>
    prisma.companySettings.upsert({
      where: { companyId },
      update: {},
      create: {
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
        dashboardConfig: defaultDashboardConfig
      } as any
    }),

  updateSettings: (companyId: string, updates: Partial<CompanySettings>) =>
    prisma.companySettings.upsert({
      where: { companyId },
      update: updates as any,
      create: { companyId, ...(updates as any) }
    }),

  // ─── USERS ──────────────────────────────────────────────────────────
  getUsers: (companyId: string) => prisma.user.findMany({ where: { companyId } }),

  getUser: (id: string) => prisma.user.findUnique({ where: { id } }),

  getUserByEmail: (email: string) =>
    prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }),

  createUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) =>
    prisma.user.create({ data: user as any }),

  updateUser: async (id: string, updates: Partial<User>) => {
    try {
      return await prisma.user.update({ where: { id }, data: updates as any });
    } catch (err: any) {
      if (err.code === 'P2025') return null;
      throw err;
    }
  },

  // ─── CLIENTS ────────────────────────────────────────────────────────
  getClients: (companyId: string) => prisma.client.findMany({ where: { companyId } }),

  getClient: (companyId: string, id: string) =>
    prisma.client.findFirst({ where: { id, companyId } }),

  createClient: (companyId: string, client: Omit<Client, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) =>
    prisma.client.create({ data: { ...client, companyId } as any }),

  updateClient: async (companyId: string, id: string, updates: Partial<Client>) => {
    const result = await prisma.client.updateMany({ where: { id, companyId }, data: updates as any });
    if (result.count === 0) return null;
    return prisma.client.findUnique({ where: { id } });
  },

  deleteClient: async (companyId: string, id: string) => {
    const result = await prisma.client.deleteMany({ where: { id, companyId } });
    return result.count > 0;
  },

  // ─── CASES ──────────────────────────────────────────────────────────
  getCases: (companyId: string) => prisma.case.findMany({ where: { companyId } }),

  getCase: (companyId: string, id: string) =>
    prisma.case.findFirst({ where: { id, companyId } }),

  createCase: (companyId: string, item: Omit<Case, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) =>
    prisma.case.create({
      data: withDates({ ...item, companyId }, ['openedDate', 'closedDate', 'statuteOfLimitations']) as any
    }),

  updateCase: async (companyId: string, id: string, updates: Partial<Case>) => {
    const data = withDates(updates as any, ['openedDate', 'closedDate', 'statuteOfLimitations']);
    const result = await prisma.case.updateMany({ where: { id, companyId }, data });
    if (result.count === 0) return null;
    return prisma.case.findUnique({ where: { id } });
  },

  // ─── CASE EVENTS ────────────────────────────────────────────────────
  getCaseEvents: (companyId: string, caseId: string) =>
    prisma.caseEvent.findMany({ where: { companyId, caseId } }),

  createCaseEvent: (companyId: string, event: Omit<CaseEvent, 'id' | 'companyId' | 'createdAt'>) =>
    prisma.caseEvent.create({ data: withDates({ ...event, companyId }, ['eventDate']) as any }),

  // ─── DEADLINES ──────────────────────────────────────────────────────
  getDeadlines: (companyId: string) => prisma.deadline.findMany({ where: { companyId } }),

  getCaseDeadlines: (companyId: string, caseId: string) =>
    prisma.deadline.findMany({ where: { companyId, caseId } }),

  createDeadline: (companyId: string, deadline: Omit<Deadline, 'id' | 'companyId' | 'remindersSent' | 'createdAt' | 'updatedAt'>) =>
    prisma.deadline.create({ data: withDates({ ...deadline, companyId, remindersSent: [] }, ['dueDate']) as any }),

  updateDeadline: async (companyId: string, id: string, updates: Partial<Deadline>) => {
    const data = withDates(updates as any, ['dueDate']);
    const result = await prisma.deadline.updateMany({ where: { id, companyId }, data });
    if (result.count === 0) return null;
    return prisma.deadline.findUnique({ where: { id } });
  },

  updateDeadlineCalendarEventId: async (companyId: string, deadlineId: string, eventId: string | null) => {
    await prisma.deadline.updateMany({
      where: { id: deadlineId, companyId },
      data: { googleCalendarEventId: eventId }
    });
  },

  // ─── CLIENT UPDATES ─────────────────────────────────────────────────
  getClientUpdates: (companyId: string) => prisma.clientUpdate.findMany({ where: { companyId } }),

  createClientUpdate: (companyId: string, update: Omit<ClientUpdate, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) =>
    prisma.clientUpdate.create({ data: withDates({ ...update, companyId }, ['sentAt']) as any }),

  updateClientUpdate: async (companyId: string, id: string, updates: Partial<ClientUpdate>) => {
    const data = withDates(updates as any, ['sentAt']);
    const result = await prisma.clientUpdate.updateMany({ where: { id, companyId }, data });
    if (result.count === 0) return null;
    return prisma.clientUpdate.findUnique({ where: { id } });
  },

  // ─── DOCUMENT TEMPLATES ─────────────────────────────────────────────
  getTemplates: (companyId: string) => prisma.documentTemplate.findMany({ where: { companyId } }),

  getTemplate: (companyId: string, id: string) =>
    prisma.documentTemplate.findFirst({ where: { id, companyId } }),

  createTemplate: (companyId: string, template: Omit<DocumentTemplate, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) =>
    prisma.documentTemplate.create({ data: { ...template, companyId } as any }),

  deleteTemplate: async (companyId: string, id: string) => {
    await prisma.documentTemplate.deleteMany({ where: { id, companyId } });
  },

  // ─── GENERATED DOCUMENTS ────────────────────────────────────────────
  getGeneratedDocuments: (companyId: string) => prisma.generatedDocument.findMany({ where: { companyId } }),

  getCaseGeneratedDocuments: (companyId: string, caseId: string) =>
    prisma.generatedDocument.findMany({ where: { companyId, caseId } }),

  createGeneratedDocument: (companyId: string, document: Omit<GeneratedDocument, 'id' | 'companyId' | 'createdAt'>) =>
    prisma.generatedDocument.create({ data: { ...document, companyId } as any }),

  // ─── CHAT ───────────────────────────────────────────────────────────
  getChatMessages: (companyId: string, caseId: string | null) =>
    prisma.chatMessage.findMany({ where: { companyId, caseId } }),

  createChatMessage: (companyId: string, message: Omit<ChatMessage, 'id' | 'companyId' | 'createdAt'>) =>
    prisma.chatMessage.create({ data: { ...message, companyId } as any }),

  markChatRead: async (companyId: string, caseId: string | null, userId: string) => {
    const messages = await prisma.chatMessage.findMany({ where: { companyId, caseId } });
    const toUpdate = messages.filter(m => !(Array.isArray(m.readBy) && (m.readBy as any[]).includes(userId)));
    await Promise.all(toUpdate.map(m =>
      prisma.chatMessage.update({
        where: { id: m.id },
        data: { readBy: [...(Array.isArray(m.readBy) ? (m.readBy as any[]) : []), userId] }
      })
    ));
  },

  updateChatMessage: async (id: string, messageText: string, editedAt: string) => {
    const msg = await prisma.chatMessage.findUnique({ where: { id } });
    if (!msg || msg.isOnRecord) return null;
    const editHistory = Array.isArray(msg.editHistory) ? [...(msg.editHistory as any[]), msg.message] : [msg.message];
    return prisma.chatMessage.update({
      where: { id },
      data: { message: messageText, editedAt: new Date(editedAt), editHistory }
    });
  },

  deleteChatMessage: async (id: string) => {
    const msg = await prisma.chatMessage.findUnique({ where: { id } });
    if (!msg || msg.isOnRecord) return null;
    return prisma.chatMessage.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), message: 'Message deleted' }
    });
  },

  toggleChatMessageReaction: async (id: string, emoji: string, userId: string) => {
    const msg = await prisma.chatMessage.findUnique({ where: { id } });
    if (!msg) return null;
    const reactions: Record<string, string[]> = { ...((msg.reactions as any) || {}) };
    const list = reactions[emoji] ? [...reactions[emoji]] : [];
    const idx = list.indexOf(userId);
    if (idx > -1) {
      list.splice(idx, 1);
      if (list.length === 0) delete reactions[emoji];
      else reactions[emoji] = list;
    } else {
      reactions[emoji] = [...list, userId];
    }
    return prisma.chatMessage.update({ where: { id }, data: { reactions } });
  },

  markChatMessageOnRecord: async (id: string, userId: string) => {
    const msg = await prisma.chatMessage.findUnique({ where: { id } });
    if (!msg) return null;
    return prisma.chatMessage.update({
      where: { id },
      data: { isOnRecord: true, onRecordAt: new Date(), onRecordById: userId }
    });
  },

  // ─── CONSENT LOGS ───────────────────────────────────────────────────
  getConsentLogs: (companyId: string) => prisma.consentLog.findMany({ where: { companyId } }),

  createConsentLog: (companyId: string, log: Omit<ConsentLog, 'id' | 'companyId' | 'consentedAt'>) =>
    prisma.consentLog.create({ data: { ...log, companyId } as any }),

  // ─── FEATURE FLAGS ──────────────────────────────────────────────────
  getFeatureFlags: async (companyId: string) => {
    let flags = await prisma.featureFlag.findMany({ where: { companyId } });
    if (flags.length === 0) {
      const defaultNames = ['ai_client_updates', 'document_generator', 'team_chat', 'reminders', 'client_updates', 'whatsapp_channel', 'sms_channel'];
      await prisma.featureFlag.createMany({
        data: defaultNames.map(f => ({
          companyId,
          featureName: f,
          isEnabled: f !== 'whatsapp_channel' && f !== 'sms_channel'
        }))
      });
      flags = await prisma.featureFlag.findMany({ where: { companyId } });
    }
    return flags;
  },

  toggleFeatureFlag: (companyId: string, featureName: string, isEnabled: boolean) =>
    prisma.featureFlag.upsert({
      where: { companyId_featureName: { companyId, featureName } },
      update: { isEnabled },
      create: { companyId, featureName, isEnabled }
    }),

  // ─── ANNOUNCEMENTS ──────────────────────────────────────────────────
  getAnnouncements: (companyId: string) =>
    prisma.companyAnnouncement.findMany({ where: { OR: [{ companyId: null }, { companyId }] } }),

  createAnnouncement: (ann: Omit<CompanyAnnouncement, 'id' | 'isDismissed' | 'createdAt'>) =>
    prisma.companyAnnouncement.create({ data: ann as any }),

  // ─── PLATFORM FEEDBACK ──────────────────────────────────────────────
  getPlatformFeedbacks: () => prisma.platformFeedback.findMany(),

  createPlatformFeedback: (companyId: string | null, userId: string | null, type: string, message: string) =>
    prisma.platformFeedback.create({ data: { companyId, userId, type, message } }),

  // ─── INVITATIONS ────────────────────────────────────────────────────
  createInvitation: (invitation: Omit<Invitation, 'id' | 'createdAt'>) =>
    prisma.invitation.create({ data: withDates(invitation as any, ['expiresAt', 'acceptedAt']) }),

  getInvitationByToken: (plainToken: string) => {
    const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
    return prisma.invitation.findUnique({ where: { tokenHash: hash } });
  },

  getInvitationsByCompany: (companyId: string) => prisma.invitation.findMany({ where: { companyId } }),

  markInvitationAccepted: async (id: string) => {
    try {
      return await prisma.invitation.update({ where: { id }, data: { isActive: false, acceptedAt: new Date() } });
    } catch (err: any) {
      if (err.code === 'P2025') return null;
      throw err;
    }
  },

  // Used by the revoke-invitation route — replaces the old loadDb()/saveDb() approach.
  revokeInvitation: async (companyId: string, invitationId: string) => {
    const result = await prisma.invitation.updateMany({
      where: { id: invitationId, companyId },
      data: { isActive: false }
    });
    return result.count > 0;
  },

  expireOldInvitations: async () => {
    await prisma.invitation.updateMany({
      where: { isActive: true, expiresAt: { lt: new Date() } },
      data: { isActive: false }
    });
  },

  // ─── ACCESS UPDATE REQUESTS ─────────────────────────────────────────
  createAccessUpdateRequest: (request: Omit<AccessUpdateRequest, 'id' | 'createdAt'>) =>
    prisma.accessUpdateRequest.create({ data: withDates(request as any, ['expiresAt', 'appliedAt']) }),

  getAccessUpdateByToken: (plainToken: string) => {
    const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
    return prisma.accessUpdateRequest.findUnique({ where: { tokenHash: hash } });
  },

  markAccessUpdateApplied: async (id: string) => {
    try {
      return await prisma.accessUpdateRequest.update({ where: { id }, data: { isActive: false, appliedAt: new Date() } });
    } catch (err: any) {
      if (err.code === 'P2025') return null;
      throw err;
    }
  },

  expireOldAccessUpdates: async () => {
    await prisma.accessUpdateRequest.updateMany({
      where: { isActive: true, expiresAt: { lt: new Date() } },
      data: { isActive: false }
    });
  },

  // ─── REGISTRATION REQUESTS ──────────────────────────────────────────
  createRegistrationRequest: (request: Omit<RegistrationRequest, 'id' | 'createdAt'>) =>
    prisma.registrationRequest.create({ data: request as any }),

  getRegistrationRequests: () => prisma.registrationRequest.findMany({ orderBy: { createdAt: 'asc' } }),

  updateRegistrationRequest: async (id: string, updates: Partial<RegistrationRequest>) => {
    try {
      return await prisma.registrationRequest.update({ where: { id }, data: updates as any });
    } catch (err: any) {
      if (err.code === 'P2025') return null;
      throw err;
    }
  },

  // ─── AUDIT LOG ──────────────────────────────────────────────────────
  createAuditEntry: (entry: {
    action: string; ip: string; detail: string;
    endpoint?: string; method?: string; targetCompanyId?: string; targetUserId?: string; result?: string;
  }) => prisma.auditLog.create({ data: entry }),

  getAuditLog: async (filters?: { limit?: number; action?: string; from?: string; to?: string }) => {
    const where: any = {};
    if (filters?.action) where.action = filters.action;
    if (filters?.from || filters?.to) {
      where.timestamp = {};
      if (filters.from) where.timestamp.gte = new Date(filters.from);
      if (filters.to) where.timestamp.lte = new Date(filters.to);
    }
    return prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || undefined
    });
  },

  // ─── LOGIN ATTEMPTS ─────────────────────────────────────────────────
  recordLoginAttempt: (ip: string, success: boolean) =>
    prisma.loginAttempt.create({ data: { ip, success } }),

  getRecentFailedAttempts: (ip: string) =>
    prisma.loginAttempt.findMany({
      where: { ip, success: false, timestamp: { gt: new Date(Date.now() - FIFTEEN_MIN) } }
    }),

  clearLoginAttempts: async (ip: string) => {
    await prisma.loginAttempt.deleteMany({ where: { ip } });
  },

  cleanOldAttempts: async () => {
    await prisma.loginAttempt.deleteMany({ where: { timestamp: { lt: new Date(Date.now() - TWENTY_FOUR_HOURS) } } });
  },

  // ─── PLATFORM STATE (singleton row) ─────────────────────────────────
  setActiveSuperadminSession: async (sessionId: string | null) => {
    await prisma.platformState.upsert({
      where: { id: PLATFORM_STATE_ID },
      update: { activeSuperadminSessionId: sessionId },
      create: { id: PLATFORM_STATE_ID, activeSuperadminSessionId: sessionId }
    });
  },

  getActiveSuperadminSession: async () => {
    const state = await prisma.platformState.findUnique({ where: { id: PLATFORM_STATE_ID } });
    return state?.activeSuperadminSessionId || null;
  },

  clearActiveSuperadminSession: async () => {
    await prisma.platformState.upsert({
      where: { id: PLATFORM_STATE_ID },
      update: { activeSuperadminSessionId: null },
      create: { id: PLATFORM_STATE_ID, activeSuperadminSessionId: null }
    });
  },

  lockPlatform: async () => {
    await prisma.platformState.upsert({
      where: { id: PLATFORM_STATE_ID },
      update: { platformLocked: true },
      create: { id: PLATFORM_STATE_ID, platformLocked: true }
    });
  },

  unlockPlatform: async () => {
    await prisma.platformState.upsert({
      where: { id: PLATFORM_STATE_ID },
      update: { platformLocked: false },
      create: { id: PLATFORM_STATE_ID, platformLocked: false }
    });
  },

  isPlatformLocked: async () => {
    const state = await prisma.platformState.findUnique({ where: { id: PLATFORM_STATE_ID } });
    return !!state?.platformLocked;
  },

  // ─── DEMO DATA CLONING (used when a delegate joins an established firm) ──
  cloneDemoDataToCompany: async (targetCompanyId: string, targetUserId: string) => {
    const demoCompany = await prisma.company.findUnique({ where: { slug: 'docket-chambers' } });
    if (!demoCompany) return; // no demo seed present — nothing to clone, not an error
    const demoCompanyId = demoCompany.id;
    const demoUser = await prisma.user.findFirst({ where: { companyId: demoCompanyId, isSuperAdmin: true } });
    const demoUserId = demoUser?.id;

    await prisma.$transaction(async (tx) => {
      const clientMap = new Map<string, string>();
      const caseMap = new Map<string, string>();

      const demoSettings = await tx.companySettings.findUnique({ where: { companyId: demoCompanyId } });
      if (demoSettings) {
        const { id, companyId, ...rest } = demoSettings;
        await tx.companySettings.upsert({
          where: { companyId: targetCompanyId },
          update: rest as any,
          create: { companyId: targetCompanyId, ...(rest as any) }
        });
      }

      const demoClients = await tx.client.findMany({ where: { companyId: demoCompanyId } });
      for (const c of demoClients) {
        const { id, companyId, createdAt, updatedAt, ...rest } = c;
        const created = await tx.client.create({ data: { ...rest, companyId: targetCompanyId } as any });
        clientMap.set(id, created.id);
      }

      const demoCases = await tx.case.findMany({ where: { companyId: demoCompanyId } });
      for (const c of demoCases) {
        const { id, companyId, createdAt, updatedAt, clientId, assignedLawyerId, ...rest } = c;
        const created = await tx.case.create({
          data: {
            ...rest,
            companyId: targetCompanyId,
            clientId: clientMap.get(clientId) || clientId,
            assignedLawyerId: assignedLawyerId === demoUserId ? targetUserId : assignedLawyerId
          } as any
        });
        caseMap.set(id, created.id);
      }

      const demoEvents = await tx.caseEvent.findMany({ where: { companyId: demoCompanyId } });
      for (const e of demoEvents) {
        const { id, companyId, createdAt, caseId, ...rest } = e;
        await tx.caseEvent.create({ data: { ...rest, companyId: targetCompanyId, caseId: caseMap.get(caseId) || caseId } as any });
      }

      const demoDeadlines = await tx.deadline.findMany({ where: { companyId: demoCompanyId } });
      for (const d of demoDeadlines) {
        const { id, companyId, createdAt, updatedAt, caseId, ...rest } = d;
        await tx.deadline.create({ data: { ...rest, companyId: targetCompanyId, caseId: caseMap.get(caseId) || caseId } as any });
      }

      const demoUpdates = await tx.clientUpdate.findMany({ where: { companyId: demoCompanyId } });
      for (const u of demoUpdates) {
        const { id, companyId, createdAt, updatedAt, caseId, clientId, draftedById, ...rest } = u;
        await tx.clientUpdate.create({
          data: {
            ...rest,
            companyId: targetCompanyId,
            caseId: caseMap.get(caseId) || caseId,
            clientId: clientMap.get(clientId) || clientId,
            draftedById: draftedById === demoUserId ? targetUserId : draftedById
          } as any
        });
      }

      const demoTemplates = await tx.documentTemplate.findMany({ where: { companyId: demoCompanyId } });
      for (const t of demoTemplates) {
        const { id, companyId, createdAt, updatedAt, ...rest } = t;
        await tx.documentTemplate.create({ data: { ...rest, companyId: targetCompanyId } as any });
      }

      const demoFlags = await tx.featureFlag.findMany({ where: { companyId: demoCompanyId } });
      for (const f of demoFlags) {
        const { id, companyId, updatedAt, ...rest } = f;
        await tx.featureFlag.create({ data: { ...rest, companyId: targetCompanyId } as any });
      }
    });
  },

  // ─── GOOGLE CALENDAR TOKENS ─────────────────────────────────────────
  saveUserCalendarTokens: (userId: string, tokens: { accessToken: string; refreshToken: string; expiresAt: string; connectedAt: string }) =>
    prisma.user.update({ where: { id: userId }, data: { googleCalendar: tokens as any } }),

  getUserCalendarTokens: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return (user?.googleCalendar as any) || null;
  },

  clearUserCalendarTokens: (userId: string) =>
    prisma.user.update({ where: { id: userId }, data: { googleCalendar: null as any } })
};

import { memoryDb } from './memoryDb.ts';

let useMemoryDb = false;

// Check if a real DATABASE_URL is provided, if not we immediately fallback to memoryDb
const hasDbUrl = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('//postgres:postgres@localhost:5432/');
if (!hasDbUrl) {
  console.log('[Database] DATABASE_URL is not set or is localhost default. Falling back to memoryDb.');
  useMemoryDb = true;
}

export const db = new Proxy(prismaDb, {
  get(target, prop, receiver) {
    if (useMemoryDb) {
      return (memoryDb as any)[prop];
    }
    const origMethod = (target as any)[prop];
    if (typeof origMethod !== 'function') {
      return origMethod;
    }
    return async function (...args: any[]) {
      try {
        return await origMethod.apply(target, args);
      } catch (err: any) {
        // If it's a Prisma initialization error or connection error, trigger fallback!
        const isInitError = err.message && (
          err.message.includes('PrismaClientInitializationError') ||
          err.name === 'PrismaClientInitializationError' ||
          err.message.includes('Can\'t reach database server') ||
          err.message.includes('ConnectionRefused') ||
          err.message.includes('PrismaClientKnownRequestError') && err.code === 'P1001'
        );
        if (isInitError) {
          console.warn('[Database] Prisma connection failed. Swapping to memoryDb fallback runtime. Error:', err.message);
          useMemoryDb = true;
          return await (memoryDb as any)[prop].apply(memoryDb, args);
        }
        throw err;
      }
    };
  }
});