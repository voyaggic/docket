export type BentoWidgetType =
  | 'upcoming_deadlines' | 'pending_updates' | 'recent_activity'
  | 'cases_status' | 'docs_awaiting' | 'today_agenda' | 'notifications_panel';

export interface BentoWidget {
  widgetId: string;
  widgetType: BentoWidgetType;
  label: string;
  isVisible: boolean;
  position: number;
  config: Record<string, any>;
}

export const WIDGET_SHORT_LABELS: Record<string, string> = {
  cases_status: 'Matters Stage Chart',
  docs_awaiting: 'Documents Action',
  today_agenda: "Today's Agenda",
  notifications_panel: 'Alert Telemetry',
};

export function getDefaultWidgets(): BentoWidget[] {
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

export function getDefaultConfig() {
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
