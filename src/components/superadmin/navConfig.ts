import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Users,
  CreditCard,
  Landmark,
  Globe,
  ToggleLeft,
  Mail,
  MessageSquare,
  MessageCircle,
  Megaphone,
  ShieldCheck,
  KeyRound,
  FileSpreadsheet,
  Activity,
  Database,
  type LucideIcon
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const navigationConfig: NavGroup[] = [
  {
    group: 'Core',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'firms', label: 'Firms / Tenancies', icon: Building2 },
      { id: 'registrations', label: 'Registration Queue', icon: ClipboardList },
      { id: 'users', label: 'Global Users', icon: Users }
    ]
  },
  {
    group: 'Management',
    items: [
      { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
      { id: 'licensing', label: 'Licensing & Seats', icon: Landmark },
      { id: 'domains', label: 'Custom Domains', icon: Globe },
      { id: 'flags', label: 'Feature Flags', icon: ToggleLeft }
    ]
  },
  {
    group: 'Operations',
    items: [
      { id: 'mailbox', label: 'System Mailbox', icon: Mail },
      { id: 'sms', label: 'SMS Gateways', icon: MessageSquare },
      { id: 'whatsapp', label: 'WhatsApp Business', icon: MessageCircle },
      { id: 'broadcasts', label: 'Platform Broadcasts', icon: Megaphone }
    ]
  },
  {
    group: 'Security',
    items: [
      { id: 'access', label: 'Access Control', icon: ShieldCheck },
      { id: 'sessions', label: 'Session Explorer', icon: KeyRound },
      { id: 'audit', label: 'Global Audit Log', icon: FileSpreadsheet }
    ]
  },
  {
    group: 'System',
    items: [
      { id: 'health', label: 'System Health', icon: Activity },
      { id: 'db', label: 'Database Shell', icon: Database }
    ]
  }
];
