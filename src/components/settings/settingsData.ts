/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Briefcase, Paintbrush, Shield, Building, Landmark, ShieldAlert, Layers,
  Users, KeyRound, Activity, Lock, Laptop, FileCheck, Bell, MessageSquare,
  FileText, MessagesSquare, Workflow, Sparkles, Clock, Mail, Globe, Phone,
  Share2, Download, Trash, Database, History, ListOrdered, UploadCloud,
  Percent, CreditCard, BookOpen, AlertTriangle, Calendar, Info, AlertCircle,
  Sliders, TrendingUp, Cloud, DollarSign, FileSpreadsheet, ShieldCheck, HelpCircle
} from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon: any;
  category: string;
  keys: string;
}

export const SIDEBAR_CATEGORIES = [
  { id: 'FIRM', title: 'FIRM' },
  { id: 'TEAM', title: 'TEAM' },
  { id: 'PAGES', title: 'PAGES' },
  { id: 'AUTOMATION', title: 'AUTOMATION' },
  { id: 'COMMUNICATIONS', title: 'COMMUNICATIONS' },
  { id: 'INTEGRATIONS', title: 'INTEGRATIONS' },
  { id: 'DATA', title: 'DATA' },
  { id: 'FINANCIAL', title: 'FINANCIAL' },
  { id: 'COMPLIANCE', title: 'COMPLIANCE' },
  { id: 'PERFORMANCE', title: 'PERFORMANCE' },
  { id: 'ACCOUNT', title: 'ACCOUNT' }
];

export const ALL_TABS: TabItem[] = [
  // FIRM
  { id: 'firm_details', label: 'Firm Identity', icon: Briefcase, category: 'FIRM', keys: 'name tagline established logo letterhead email phone social physical postal reference signature established timezone date established registration' },
  { id: 'appearance', label: 'Branding & Appearance', icon: Paintbrush, category: 'FIRM', keys: 'theme colors secondary background fonts radius print stylesheet whitelabel loading favicon css primary button' },
  { id: 'terminology_settings', label: 'Terminology', icon: Shield, category: 'FIRM', keys: 'naming labels client case court advocate updates chat reminders billing vocab terminology translations singular plural' },
  { id: 'office_locations', label: 'Office Locations', icon: Building, category: 'FIRM', keys: 'branch primary location address phone email head office branches map geocode' },
  { id: 'banking_finance', label: 'Banking & Finance', icon: Landmark, category: 'FIRM', keys: 'operating trust client account swift iban bank name invoice details bank transfer routing' },
  { id: 'compliance_legal', label: 'Compliance & Legal', icon: ShieldAlert, category: 'FIRM', keys: 'insurance standing indemnity annual renewal due date calendar liability insurer standing' },
  { id: 'practice_areas', label: 'Practice Areas', icon: Layers, category: 'FIRM', keys: 'specialization commercial litigation family intellectual property conveyancing criminal business practice specialist' },

  // TEAM
  { id: 'team_members', label: 'Team Members', icon: Users, category: 'TEAM', keys: 'invite roster staff member role activity login history directory members roster' },
  { id: 'roles_permissions', label: 'Roles & Permissions', icon: KeyRound, category: 'TEAM', keys: 'matrix allow deny senior lawyer paralegal secretary hierarchy level access privileges effective' },
  { id: 'delegate_tasks', label: 'Delegate Tasks', icon: Users, category: 'TEAM', keys: 'delegate task page access restrict allow invitation lawyer paralegal secretary' },
  { id: 'user_activity', label: 'User Activity', icon: Activity, category: 'TEAM', keys: 'usage clicks logins devices ip active duration audit log peak adoption analytics' },
  { id: 'security_access', icon: Lock, label: 'Security & Access', category: 'TEAM', keys: '2fa two-factor ip allowlist CIDR session timeout account lockout device login hours restrict blocking single' },

  // PAGES
  { id: 'page_dashboard', label: 'Dashboard', icon: Laptop, category: 'PAGES', keys: 'widgets announcements metrics quick actions date ranges greeting visibility banner announcement' },
  { id: 'page_cases', label: 'Cases', icon: FileCheck, category: 'PAGES', keys: 'stages tabs detail panel custom milestones priority labels milestones' },
  { id: 'page_clients', label: 'Clients', icon: Users, category: 'PAGES', keys: 'categories risk rating kyc segments duplicate onboarding checklist onboarding kyc risk value' },
  { id: 'page_updates', label: 'Updates', icon: MessageSquare, category: 'PAGES', keys: 'compose templates email domain whatsapp sms approval chain draft retry approval drafted tones length' },
  { id: 'page_reminders', label: 'Reminders', icon: Bell, category: 'PAGES', keys: 'deadlines holiday calendar limitation period snooze auto logging priority template snooze cron' },
  { id: 'page_documents', label: 'Documents', icon: FileText, category: 'PAGES', keys: 'categories clause library generation format watermarks review workflow bundle ocr semantic file templates bundle' },
  { id: 'page_chat', label: 'Chat', icon: MessagesSquare, category: 'PAGES', keys: 'on record edit window broadcast classification video voice tags retention restriction screenshots' },

  // AUTOMATION
  { id: 'workflow_builder', label: 'Workflow Builder', icon: Workflow, category: 'AUTOMATION', keys: 'no-code automation trigger condition action delay chain variables rules Visual visual nodes builder' },
  { id: 'auto_ai', label: 'AI Configuration', icon: Sparkles, category: 'AUTOMATION', keys: 'gemini api confidence thresholds tone style profile translation search provider fallback models analysis' },
  { id: 'auto_cron', label: 'Cron & Scheduling', icon: Clock, category: 'AUTOMATION', keys: 'background automated reminders digest maintenance retry schedule run simulator scan' },
  { id: 'notification_rules', label: 'Notification Rules', icon: Bell, category: 'AUTOMATION', keys: 'escalation emergency contact warnings alert recipients digest footer rules alarm threshold breach' },

  // COMMUNICATIONS
  { id: 'comm_email', label: 'Email Configuration', icon: Mail, category: 'COMMUNICATIONS', keys: 'smtp sendgrid dkim spf dmarc custom domain bounce templates relay authentications' },
  { id: 'comm_whatsapp', label: 'WhatsApp', icon: Globe, category: 'COMMUNICATIONS', keys: 'sandbox meta business whatsapp profile template test message parameters business credentials' },
  { id: 'comm_sms', label: 'SMS', icon: Phone, category: 'COMMUNICATIONS', keys: 'twilio sender phone warning limits cellular gate twilio_enabled character warning' },
  { id: 'notification_templates', label: 'Notification Templates', icon: FileText, category: 'COMMUNICATIONS', keys: 'email template draft custom body placeholders variables invite signature alert' },

  // INTEGRATIONS
  { id: 'connected_apps', label: 'Connected Apps', icon: Share2, category: 'INTEGRATIONS', keys: 'google Microsoft outlook docusign zapier calendar sync dropbox cloud apps integrations third-party' },
  { id: 'api_keys_settings', label: 'API Keys', icon: KeyRound, category: 'INTEGRATIONS', keys: 'generate credentials webhook prefix active revoked api_keys credentials secret hash' },
  { id: 'webhooks_settings', label: 'Webhooks', icon: Globe, category: 'INTEGRATIONS', keys: 'endpoints topics notifications payload trigger tests logs retry secret signature url' },
  { id: 'calendar_sync', label: 'Calendar Sync', icon: Clock, category: 'INTEGRATIONS', keys: 'two-way sync google calendar outlook calendar reminders sync syncs exchange bidirectional' },
  { id: 'cloud_storage', label: 'Cloud Storage', icon: Cloud, category: 'INTEGRATIONS', keys: 'dropbox google drive aws s3 file backup quota folders connected mounts cloud storage' },

  // DATA
  { id: 'custom_fields_settings', label: 'Custom Fields', icon: ListOrdered, category: 'DATA', keys: 'field layouts select text date checkbox groups list ordered dependencies calculated drag dropdown sections' },
  { id: 'import_migration', label: 'Import & Migration', icon: UploadCloud, category: 'DATA', keys: 'clio CSV templates excel upload maps categories validation clio import Excel file mapping' },
  { id: 'export_backup', label: 'Export & Backup', icon: Download, category: 'DATA', keys: 'full export backup encryption aws s3 json csv zip backup files periodic retention scheduling' },
  { id: 'recycle_bin', label: 'Recycle Bin', icon: Trash, category: 'DATA', keys: 'soft deleted restore wipe purge auto-purge warning recycle bin delete trash records' },
  { id: 'storage_management', label: 'Storage Management', icon: Database, category: 'DATA', keys: 'quota limit large files compression duplicate PDFs size space chart treemap largest space analytics' },
  { id: 'retention_policies', label: 'Retention Policies', category: 'DATA', icon: History, keys: 'active closed purge limits compliance audit log data review retention schedules statute limitation period' },

  // FINANCIAL
  { id: 'billing_rates', label: 'Billing Rates', icon: DollarSign, category: 'FINANCIAL', keys: 'hourly rates role overrides currency change logs' },
  { id: 'invoice_configuration', label: 'Invoice Configuration', icon: FileSpreadsheet, category: 'FINANCIAL', keys: 'invoice prefix tax sequence background billing bank details logo footer template PDF margins interest' },
  { id: 'tax_settings', label: 'Tax Settings', icon: Percent, category: 'FINANCIAL', keys: 'vat gst sales tax exempt clients disbursements status registration configuration' },
  { id: 'payment_methods', label: 'Payment Methods', icon: CreditCard, category: 'FINANCIAL', keys: 'bank transfer cash credit card cheque mobile money gateways checks' },
  { id: 'expense_categories', label: 'Expense Categories', icon: ListOrdered, category: 'FINANCIAL', keys: 'disbursements court fees expert travel postage gl code photcopy expert witness travel category' },

  // COMPLIANCE
  { id: 'regulatory_config', label: 'Regulatory Configuration', icon: Shield, category: 'COMPLIANCE', keys: 'regulatory body registration annual renewal stand law society bar association standings' },
  { id: 'practicing_certificates', label: 'Practicing Certificates', icon: FileCheck, category: 'COMPLIANCE', keys: 'advocates credentials lawyer renewal notification alert practiced certificate license' },
  { id: 'cle_cpd', label: 'CLE/CPD Tracking', icon: BookOpen, category: 'COMPLIANCE', keys: 'legal education cpd hours requirements certificates training credits advocates lawyers' },
  { id: 'aml_config', label: 'AML Configuration', icon: ShieldCheck, category: 'COMPLIANCE', keys: 'anti-money laundering checks search risk templates flow compliance money laundering check' },
  { id: 'gdpr_mgmt', label: 'GDPR Management', icon: Info, category: 'COMPLIANCE', keys: 'data subject access dpo erasure requests timeline response privacy policies notice active requests' },
  { id: 'conflict_interest', label: 'Conflict of Interest', icon: AlertTriangle, category: 'COMPLIANCE', keys: 'check database query database search flags clearance checklist conflict clearance checks' },
  { id: 'compliance_calendar', label: 'Compliance Calendar', icon: Calendar, category: 'COMPLIANCE', keys: 'deadlines annual filings tax audits calendar regulatory reports' },

  // PERFORMANCE
  { id: 'app_health', label: 'Application Health', icon: Activity, category: 'PERFORMANCE', keys: 'uptime latency loading error rates raw sessions graph load ping speeds api loads' },
  { id: 'feature_usage_analytics', label: 'Feature Usage Analytics', icon: Sliders, category: 'PERFORMANCE', keys: 'heatmap feature list user adoption trends active modules underutilized features' },
  { id: 'error_reporting', label: 'Error Reporting', icon: AlertCircle, category: 'PERFORMANCE', keys: 'stacktrace diagnostics severity screenshot automated report logging manual bugs' },
  { id: 'feedback_suggestions', label: 'Feedback & Suggestions', icon: HelpCircle, category: 'PERFORMANCE', keys: 'feature request bug report vote nps survey comments boards satisfaction' },

  // ACCOUNT
  { id: 'billing_plan', label: 'Subscription Plan', icon: Landmark, category: 'ACCOUNT', keys: 'plan limits executive chamber upgrade licenses annual quota storage matters seats upgrade' },
  { id: 'usage_stats', label: 'Usage Statistics', icon: TrendingUp, category: 'ACCOUNT', keys: 'api calls ai tokens storage additions eom forecast metrics trends charts' },
  { id: 'billing_invoices', label: 'Invoices & Billing', icon: FileText, category: 'ACCOUNT', keys: 'financial invoices payments ledger download statements billing history statements receipts status' },
  { id: 'account_profile', label: 'My Profile', icon: Users, category: 'ACCOUNT', keys: 'profile photo picture avatar name email account my profile' }
];

// Cloud storage connected folder mapping icons
export const MOCK_LARGE_FILES = [
  { id: 'f-1', name: 'Court_Bundle_Trial_Pleadings_Signature.pdf', size: '24.1 MB', matter: 'DK/CIV/2026/012', uploader: 'Alex Rivera, Esq.', date: '14 May 2026', unusedDays: 24 },
  { id: 'f-2', name: 'Video_Footage_Accident_Corroboration.mp4', size: '189.5 MB', matter: 'DK/CRM/2401', uploader: 'Senior Partner', date: '02 June 2026', unusedDays: 6 },
  { id: 'f-3', name: 'Corporate_Tax_Audit_Ledger_2025.xlsx', size: '42.3 MB', matter: 'DK/TAX/5092', uploader: 'Secretary Clerk', date: '29 April 2026', unusedDays: 40 },
  { id: 'f-4', name: 'Property_Title_Deed_Scans_HighRes.zip', size: '78.2 MB', matter: 'DK/PROP/0312', uploader: 'James Carter', date: '12 Jan 2026', unusedDays: 145 },
  { id: 'f-5', name: 'Expert_Advocate_Scientific_Report.pdf', size: '12.8 MB', matter: 'DK/CIV/2026/001', uploader: 'Alex Rivera, Esq.', date: '03 March 2026', unusedDays: 92 }
];

export const MOCK_RECYCLE_BIN = [
  { id: 'r-1', name: 'Draft_Submissions_Old.docx', type: 'document', deletedBy: 'Alex Rivera', date: '05 June 2026', daysLeft: 27 },
  { id: 'r-2', name: 'Client_John_Doe_Archived_Profile', type: 'client', deletedBy: 'Secretary Clerk', date: '01 June 2026', daysLeft: 23 },
  { id: 'r-3', name: 'DK/PROP/092 - Title Deeds dispute (Pre-onboarding file)', type: 'matter', deletedBy: 'Senior Partner', date: '18 May 2026', daysLeft: 9 },
  { id: 'r-4', name: 'Snooze_Filing_Deadline_Alert_Rule', type: 'reminder', deletedBy: 'Alex Rivera', date: '07 June 2026', daysLeft: 29 }
];
