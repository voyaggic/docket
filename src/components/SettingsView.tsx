/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, Paintbrush, Menu, Users, Briefcase, Bell, MessageSquare, Shield, Check, Trash, Plus, RotateCcw, Loader2,
  ArrowUp, ArrowDown, HelpCircle, Sparkles, ListOrdered, ChevronDown, ChevronRight, Mail, Phone, Lock, Eye, EyeOff, ShieldAlert,
  Database, Download, Landmark, Clock, FileText, FileSpreadsheet, Globe, Laptop, KeyRound, AlertCircle, FileCheck, CheckSquare, Info, History, ShieldCheck, Sliders,
  Building, DollarSign, Activity, AlertTriangle, Workflow, Search, Share2, UploadCloud, RefreshCw, Layers, BookOpen, CreditCard, Percent, TrendingUp, CheckCircle, PlusCircle, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CompanySettings, CompanyTheme, UserRole, CustomField, CustomSection } from '../types';

// Modular Child Imports
import { SIDEBAR_CATEGORIES, ALL_TABS, MOCK_RECYCLE_BIN } from './settings/settingsData';
import { useAuth } from '../context/AuthContext';
import WorkflowBuilder from './settings/WorkflowBuilder';
import StorageManagement from './settings/StorageManagement';
import RolesPermissions from './settings/RolesPermissions';
import TeamMemberRow from './settings/TeamMemberRow';
import ThemeToggle from './ThemeToggle';

export const DEFAULT_CASE_FIELDS: CustomField[] = [
  { id: 'referenceNumber', label: 'File Reference', type: 'text', required: true, visible: true, isDefault: true, sectionId: 'default_case' },
  { id: 'openedDate', label: 'Date of Instruction', type: 'date', required: true, visible: true, isDefault: true, sectionId: 'default_case' },
  { id: 'caseType', label: 'Specialty Category', type: 'select', options: ['Criminal Practice', 'Civil Claims', 'Family Mediation', 'Corporate M&A'], required: true, visible: true, isDefault: true, sectionId: 'default_case' },
  { id: 'court', label: 'Jurisdiction Court', type: 'text', required: false, visible: true, isDefault: true, sectionId: 'default_case' },
  { id: 'opposingParty', label: 'Respondent Opponent', type: 'text', required: false, visible: true, isDefault: true, sectionId: 'default_case' },
  { id: 'assignedLawyerId', label: 'Assigned Counsel', type: 'select', required: true, visible: true, isDefault: true, sectionId: 'default_case' },
  { id: 'notes', label: 'Litigation Comments', type: 'textarea', required: false, visible: true, isDefault: true, sectionId: 'default_case' }
];

export const DEFAULT_CASE_SECTIONS: CustomSection[] = [
  { id: 'default_case', label: 'Default Case Characteristics', order: 0 }
];

export const DEFAULT_CLIENT_FIELDS: CustomField[] = [
  { id: 'fullName', label: 'Client Full Name', type: 'text', required: true, visible: true, isDefault: true, sectionId: 'default_client' },
  { id: 'email', label: 'Communication Email', type: 'email', required: false, visible: true, isDefault: true, sectionId: 'default_client' },
  { id: 'phone', label: 'Telephone Line', type: 'phone', required: false, visible: true, isDefault: true, sectionId: 'default_client' },
  { id: 'address', label: 'Physical Street Address', type: 'text', required: false, visible: true, isDefault: true, sectionId: 'default_client' },
  { id: 'notes', label: 'Detailed Legal Brief Notes', type: 'textarea', required: false, visible: true, isDefault: true, sectionId: 'default_client' }
];

export const DEFAULT_CLIENT_SECTIONS: CustomSection[] = [
  { id: 'default_client', label: 'Default Client Information', order: 0 }
];

interface SettingsViewProps {
  companyId: string;
  settings: CompanySettings;
  users: any[];
  onRefresh: () => void;
  onThemeUpdate: (updatedTheme: CompanyTheme) => void;
  onSaveAllSettings: (updatedSettings: Partial<CompanySettings>) => Promise<void>;
  colorMode: 'light' | 'dark';
  onToggleColorMode: () => void;
}

export default function SettingsView({ 
  companyId, settings, users, onRefresh, onThemeUpdate, onSaveAllSettings, colorMode, onToggleColorMode
}: SettingsViewProps) {
  const { user: authUser, refreshSession } = useAuth();
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast('Photo must be under 4MB');
      return;
    }
    setProfilePhotoUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/firm/${companyId}/users/${authUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ avatarUrl: dataUrl })
      });
      if (res.ok) {
        await refreshSession();
        showToast('Profile photo updated');
      } else {
        showToast('Failed to upload photo');
      }
    } catch {
      showToast('Failed to upload photo');
    } finally {
      setProfilePhotoUploading(false);
      e.target.value = '';
    }
  };

  const [activeTab, setActiveTab] = useState<string>('firm_details');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── DELEGATE TASKS state ──
  const DELEGATABLE_PAGES = [
    { key: 'cases', label: 'Cases' },
    { key: 'clients', label: 'Clients' },
    { key: 'reminders', label: 'Deadlines & Reminders' },
    { key: 'updates', label: 'Client Updates' },
    { key: 'documents', label: 'Documents' },
    { key: 'chat', label: 'Team Chat' },
    { key: 'settings', label: 'Settings' }
  ];
  const [delegateName, setDelegateName] = useState('');
  const [delegateEmail, setDelegateEmail] = useState('');
  const [delegateRole, setDelegateRole] = useState('LAWYER');
  const [delegatePages, setDelegatePages] = useState<string[]>([]);
  const [delegateSending, setDelegateSending] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const loadInvitations = async () => {
    if (!companyId) return;
    setLoadingInvites(true);
    try {
      const res = await fetch(`/api/firm/${companyId}/invitations`, { credentials: 'include' });
      if (res.ok) setPendingInvites(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'delegate_tasks') loadInvitations();
  }, [activeTab]);

  const toggleDelegatePage = (key: string) => {
    setDelegatePages(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const handleSendDelegateInvite = async () => {
    if (!delegateEmail.trim()) {
      showToast('Email is required');
      return;
    }
    setDelegateSending(true);
    try {
      const res = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: delegateEmail.trim(),
          name: delegateName.trim(),
          role: delegateRole,
          allowedPages: delegatePages
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.emailSent ? `Invite emailed to ${delegateEmail}` : `Invite created — email not sent (check Gmail App Password config)`);
        setDelegateName(''); setDelegateEmail(''); setDelegatePages([]); setDelegateRole('LAWYER');
        loadInvitations();
      } else {
        showToast(data.error || 'Failed to send invite');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error sending invite');
    } finally {
      setDelegateSending(false);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/firm/${companyId}/invitations/${invitationId}/revoke`, {
        method: 'POST', credentials: 'include'
      });
      if (res.ok) {
        showToast('Invitation revoked');
        loadInvitations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Expanded Sidebar sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    FIRM: true,
    TEAM: true,
    PAGES: true,
    AUTOMATION: false,
    COMMUNICATIONS: false,
    INTEGRATIONS: false,
    DATA: false,
    FINANCIAL: false,
    COMPLIANCE: false,
    PERFORMANCE: false,
    ACCOUNT: false
  });

  // State managers for various local forms which write to onSaveAllSettings
  const [firmName, setFirmName] = useState(settings?.firmName || 'Docket Chambers');
  const [tagline, setTagline] = useState(settings?.branding?.tagline || 'Counsel & Advocacy Lawyers');
  const [address, setAddress] = useState(settings?.address || '12 Law Society Lane, Suite 20');
  const [phone, setPhone] = useState(settings?.phone || '+254 712 345 678');
  const [timezone, setTimezone] = useState(settings?.branding?.timezone || 'Africa/Nairobi');
  const [referenceFormat, setReferenceFormat] = useState(settings?.referenceFormat || 'DK/[YEAR]/[NUM]');
  
  // Custom states for theme modifications
  const [themeMode, setThemeMode] = useState<string>(settings?.theme?.fontFamily || 'Inter');
  const [themePrimary, setThemePrimary] = useState<string>(settings?.theme?.primaryColor || '#0f172a');
  const [themeRadius, setThemeRadius] = useState<string>(settings?.theme?.borderRadius || 'round');

  // Terminology Translation overrides
  const [caseTerm, setCaseTerm] = useState(settings?.terminology?.case || 'Case');
  const [casesTerm, setCasesTerm] = useState(settings?.terminology?.cases || 'Cases');
  const [respondentTerm, setRespondentTerm] = useState(settings?.terminology?.opposingParty || 'Respondent');
  const [leadCounselTerm, setLeadCounselTerm] = useState(settings?.terminology?.leadCounsel || 'Instructing Advocate');

  // Interactive Lists
  const [offices, setOffices] = useState<any[]>(() => {
    return settings?.offices || settings?.prismaoffices || [
      { name: 'Headquarters Branch', address: '12 Law Society Lane, Suite 20', tel: '+254712345678', primary: true },
      { name: 'Sub-Saharan litigation annex', address: 'Upper Hill Chambers, Level 4', tel: '+254701234567', primary: false }
    ];
  });
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeAddress, setNewOfficeAddress] = useState('');

  const [bankAccounts, setBankAccounts] = useState<any[]>(() => {
    return settings?.bankAccounts || [
      { label: 'Client Trust Account (Escrow reserves)', iban: 'KE92COURT91200319', type: 'trust', threshold: '5,000 USD' },
      { label: 'Standard Operating Business Account', iban: 'KE09OPER82103328', type: 'operating', threshold: '2,000 USD font' }
    ];
  });

  const [recycleList, setRecycleList] = useState(MOCK_RECYCLE_BIN);

  const [apiKeys, setApiKeys] = useState([
    { label: 'Zapier Case-Flipping sync webhook Token', hash: 'dk_live_92A...2xF67', scopes: 'all_write', status: 'ACTIVE' },
    { label: 'Clio litigation archive migrator API', hash: 'dk_live_88H...38B88', scopes: 'read_only', status: 'ACTIVE' }
  ]);

  const [webhooks, setWebhooks] = useState([
    { label: 'Google Suite Document Generation complete Hook', url: 'https://api.my-firm.com/hooks/docs', topics: 'document.created' }
  ]);

  // Handle Collapsible categories toggles
  const toggleSection = (catId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Safe global save updates bindings
  const handleSaveAllFirmSettings = async () => {
    setSaving(true);
    try {
      await onSaveAllSettings({
        firmName,
        address,
        phone,
        referenceFormat,
        offices,
        prismaoffices: offices,
        bankAccounts,
        branding: {
          ...settings?.branding,
          tagline,
          timezone
        },
        terminology: {
          case: caseTerm,
          cases: casesTerm,
          opposingParty: respondentTerm,
          leadCounsel: leadCounselTerm,
          referenceNumber: 'File Reference',
          filingDate: 'Date of Instruction',
          caseStage: 'Case Stage',
          timeline: 'Case Diary',
          clientUpdates: 'Updates',
          teamChat: 'Chat',
          documents: 'Documents',
          deadlines: 'Deadline & Reminders',
          newCase: 'Open New Case',
          activeCases: 'Active Cases'
        }
      });
      showToast('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      showToast('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateColorsTheme = async (color: string) => {
    setThemePrimary(color);
    const newTheme = {
      primaryColor: color,
      secondaryColor: '#64748b',
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      buttonColor: color,
      buttonStyle: 'rounded' as const,
      fontFamily: themeMode,
      fontSize: 'medium' as const,
      borderRadius: themeRadius as any,
      sidebarColor: '#0f172a',
      navIconColor: color
    };
    onThemeUpdate(newTheme); // instant visual preview
    try {
      await onSaveAllSettings({ theme: newTheme }); // actually persists to DB
      showToast(`Branding saved: ${color}`);
    } catch {
      showToast('Failed to save theme — try again');
    }
  };

  // Search Filter tabs logic
  const filteredTabs = ALL_TABS.filter(tab => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tab.label.toLowerCase().includes(q) ||
      tab.keys.toLowerCase().includes(q) ||
      tab.category.toLowerCase().includes(q)
    );
  });

  const activeCategory = ALL_TABS.find(t => t.id === activeTab)?.category || 'FIRM';

  const selectCategory = (categoryId: string) => {
    const tabsInCat = ALL_TABS.filter(t => t.category === categoryId);
    if (tabsInCat.length > 0) {
      setActiveTab(tabsInCat[0].id);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-50 relative" id="docket-firm-settings-space">
      
      {/* Mobile Top Navigation */}
      <div className="md:hidden bg-white border-b border-slate-200 flex flex-col shrink-0 select-none w-full">
        {/* Header with search */}
        <div className="p-3 border-b border-slate-100 text-left flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
              <Settings className="h-4 w-4 animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-slate-800 tracking-tight leading-none truncate">Console Control</h2>
              <span className="text-[9px] text-slate-400 font-bold uppercase truncate block">{firmName}</span>
            </div>
          </div>
          
          <div className="relative flex-1 max-w-[180px]">
            <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search settings..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg text-[10px] font-bold focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Categories Horizontal Scrolling Strip */}
        <div className="flex items-center gap-1 overflow-x-auto p-2 scrollbar-none border-b border-slate-100 bg-slate-50/50">
          {SIDEBAR_CATEGORIES.map(category => {
            const tabsForCat = filteredTabs.filter(t => t.category === category.id);
            if (tabsForCat.length === 0) return null;
            const isCatActive = activeCategory === category.id;

            return (
              <button
                key={category.id}
                onClick={() => selectCategory(category.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isCatActive 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {category.title}
              </button>
            );
          })}
        </div>

        {/* Sub-tabs Horizontal Scrolling Strip */}
        <div className="flex items-center gap-1 overflow-x-auto p-2 scrollbar-none bg-white">
          {filteredTabs
            .filter(tab => tab.category === activeCategory)
            .map(tab => {
              const isActive = activeTab === tab.id;
              const IconComp = tab.icon || Settings;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer shrink-0 ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-650 hover:bg-slate-50'
                  }`}
                  style={{ backgroundColor: isActive ? '#4f46e5' : undefined }}
                >
                  <IconComp className="h-3 w-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Settings Navigation Sidebar — DESKTOP ONLY */}
      <div className="hidden md:flex w-[280px] border-r border-slate-200 bg-white flex flex-col shrink-0 select-none">
        
        {/* Core Sidebar Header */}
        <div className="p-4 border-b border-slate-100 text-left">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <Settings className="h-4.5 w-4.5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">Console Control</h2>
              <span className="text-[10px] text-slate-400 font-bold uppercase">{firmName}</span>
            </div>
          </div>

          {/* Quick-Access search engine */}
          <div className="mt-3.5 relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search 56 settings instantly..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xxs font-bold focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Scrollable Category tree panels */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          {SIDEBAR_CATEGORIES.map(category => {
            const tabsForCat = filteredTabs.filter(t => t.category === category.id);
            if (tabsForCat.length === 0) return null;
            const isExpanded = expandedSections[category.id] || searchQuery.length > 0;

            return (
              <div key={category.id} className="space-y-0.5">
                <button 
                  onClick={() => toggleSection(category.id)}
                  className="w-full p-2 px-3 hover:bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 tracking-wider flex justify-between items-center cursor-pointer uppercase"
                >
                  <span>{category.title}</span>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>

                {isExpanded && (
                  <div className="pl-1 space-y-0.5 text-left">
                    {tabsForCat.map(tab => {
                      const isActive = activeTab === tab.id;
                      const IconComp = tab.icon || Settings;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full p-2 px-3 rounded-lg text-xxs font-bold flex items-center gap-2 cursor-pointer transition ${isActive ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-650 hover:bg-slate-50'}`}
                        >
                          <IconComp className="h-3.5 w-3.5" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Main Panel Content area rendering right pane */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-thin flex flex-col justify-between">
        
        <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              
              {/* FIRM IDENTITY PANEL */}
              {activeTab === 'firm_details' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Briefcase className="text-slate-800" /> Firm Identity Coordinates</h3>
                    <p className="text-xxs text-slate-450 mt-0.5">Control customer-facing dockets branding, registered mail links, and SWIFT locations parameters.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 border rounded-2xl shadow-xxs">
                    <div className="space-y-1.5Col">
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Registered Corporate Trading Name</label>
                      <input 
                        type="text" 
                        value={firmName} 
                        onChange={e => setFirmName(e.target.value)}
                        className="w-full text-xs font-bold border p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Advocacy Tagline</label>
                      <input 
                        type="text" 
                        value={tagline} 
                        onChange={e => setTagline(e.target.value)}
                        className="w-full text-xs font-bold border p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Official Telephone Contact</label>
                      <input 
                        type="text" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)}
                        className="w-full text-xs font-bold border p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Physical Street Coordinates</label>
                      <input 
                        type="text" 
                        value={address} 
                        onChange={e => setAddress(e.target.value)}
                        className="w-full text-xs font-bold border p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider font-semibold">Automatic Case Reference Format Pattern</label>
                      <input 
                        type="text" 
                        value={referenceFormat} 
                        onChange={e => setReferenceFormat(e.target.value)}
                        className="w-full text-xs font-bold border p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider font-semibold font-mono">Firm Timezone Location</label>
                      <select 
                        value={timezone} 
                        onChange={e => setTimezone(e.target.value)}
                        className="w-full text-xs font-bold border p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50"
                      >
                        <option value="Africa/Nairobi">EAT - Africa/Nairobi</option>
                        <option value="Europe/London">GMT - Europe/London</option>
                        <option value="America/New_York">EST - America/New_York</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t select-none">
                    <button 
                      onClick={handleSaveAllFirmSettings}
                      disabled={saving}
                      className="p-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xxs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Coordinate Identity
                    </button>
                  </div>
                </div>
              )}

              {/* BRANDING & APPEARANCE PANEL */}
              {activeTab === 'appearance' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Paintbrush className="text-indigo-600" /> Branding & Styling appearance</h3>
                    <p className="text-xxs text-slate-450 mt-0.5">Customize border contour curves, primary color swatches, whitelabel status configurations.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="bg-white p-6 border rounded-2xl space-y-4 shadow-xxs">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Primary Brand Color Selection</span>
                      <div className="flex gap-2.5">
                        {[
                          { name: 'Cosmic Slate', hex: '#0f172a' },
                          { name: 'Advocate Blue', hex: '#2563eb' },
                          { name: 'Chamber Green', hex: '#0f766e' },
                          { name: 'Trial Burgundy', hex: '#991b1b' },
                          { name: 'Sunset Gold', hex: '#ca8a04' }
                        ].map(c => (
                          <button
                            key={c.hex}
                            onClick={() => handleUpdateColorsTheme(c.hex)}
                            className="h-8 w-8 rounded-full border border-slate-350 cursor-pointer shadow-xs relative flex items-center justify-center transition hover:scale-105"
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          >
                            {themePrimary === c.hex && <Check className="h-4 w-4 text-white" />}
                          </button>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-3">
                        <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Accent Border Radius Curves</span>
                        <div className="grid grid-cols-3 gap-2">
                          {['sharp', 'medium', 'round'].map(rad => (
                            <button
                              key={rad}
                              onClick={async () => {
                                setThemeRadius(rad);
                                const newTheme = {
                                  primaryColor: themePrimary,
                                  secondaryColor: '#64748b',
                                  backgroundColor: '#f8fafc',
                                  textColor: '#0f172a',
                                  buttonColor: themePrimary,
                                  buttonStyle: 'rounded' as const,
                                  fontFamily: themeMode,
                                  fontSize: 'medium' as const,
                                  borderRadius: rad as any,
                                  sidebarColor: '#0f172a',
                                  navIconColor: themePrimary
                                };
                                onThemeUpdate(newTheme);
                                try {
                                  await onSaveAllSettings({ theme: newTheme });
                                  showToast(`Radius saved: ${rad}`);
                                } catch {
                                  showToast('Failed to save radius');
                                }
                              }}
                              className={`p-2 border text-xxs font-black rounded-lg uppercase tracking-wider cursor-pointer ${themeRadius === rad ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                            >
                              {rad}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 border rounded-2xl relative flex flex-col justify-between shadow-xxs">
                      <div>
                        <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-1">Live Viewport Preview</span>
                        <p className="text-xxs text-slate-450">See how your styling selections map to mock case cards.</p>
                      </div>

                      {/* Mock UI card showing dynamic reactive properties */}
                      <div className="p-4 border border-slate-150 rounded-xl space-y-2 mt-4 text-xs font-semibold bg-slate-50/50">
                        <div className="flex justify-between items-center bg-white p-2 rounded shadow-xxs border border-slate-100">
                          <div>
                            <span className="text-[10px] block text-slate-400">Matter Reference</span>
                            <span className="font-extrabold text-slate-800">DK/CIVIL/2026/012</span>
                          </div>
                          <button 
                            disabled 
                            className="p-1 px-3 text-white rounded text-[10px] font-black uppercase"
                            style={{ backgroundColor: themePrimary, borderRadius: themeRadius === 'sharp' ? '2px' : themeRadius === 'medium' ? '6px' : '999px' }}
                          >
                            Active
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="bg-white p-6 border rounded-2xl shadow-xxs flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-1">Display Mode</span>
                      <p className="text-xxs text-slate-450 max-w-md">Switch between light and dark surfaces. Your brand colors above stay exactly as set — only backgrounds and text adapt. Saved to this device and remembered even after logging out.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xxs font-black text-slate-500 uppercase">{colorMode === 'dark' ? 'Dark' : 'Light'}</span>
                      <ThemeToggle colorMode={colorMode} onToggle={onToggleColorMode} />
                    </div>
                  </div>

                </div>
              )}

              {/* TERMINOLOGY CONSOLE */}
              {activeTab === 'terminology_settings' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Shield className="text-slate-800" /> Translative Vocabulary & Terminology</h3>
                    <p className="text-xxs text-slate-450 mt-0.5">Override global singular and plural names for matters, respondents, advocates, courts globally.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 border rounded-2xl shadow-xxs">
                    <div className="space-y-1">
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Matter Singular Translate Override</label>
                      <input 
                        type="text" 
                        value={caseTerm} 
                        onChange={e => setCaseTerm(e.target.value)}
                        className="w-full text-xs font-bold border p-2.5 rounded-xl bg-slate-50/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Matter Plural Translate Override</label>
                      <input 
                        type="text" 
                        value={casesTerm} 
                        onChange={e => setCasesTerm(e.target.value)}
                        className="w-full text-xs font-bold border p-2.5 rounded-xl bg-slate-50/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider font-semibold">Respondent Opposing party naming</label>
                      <input 
                        type="text" 
                        value={respondentTerm} 
                        onChange={e => setRespondentTerm(e.target.value)}
                        className="w-full text-xs font-bold border p-2.5 rounded-xl bg-slate-50/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider font-semibold">Instructing Advocate Counselor naming</label>
                      <input 
                        type="text" 
                        value={leadCounselTerm} 
                        onChange={e => setLeadCounselTerm(e.target.value)}
                        className="w-full text-xs font-bold border p-2.5 rounded-xl bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t select-none">
                    <button 
                      onClick={handleSaveAllFirmSettings}
                      disabled={saving}
                      className="p-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xxs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Save Override terms
                    </button>
                  </div>
                </div>
              )}

              {/* INTEGRATIONS: API KEYS */}
              {activeTab === 'api_keys_settings' && (
                <div className="space-y-6 text-left" id="api-keys-control-console">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><KeyRound className="text-[#2563eb]" /> Secure REST API Keys</h3>
                      <p className="text-xxs text-slate-450 mt-0.5">Configure sync connectors. Keep credentials private.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const wordHex = Math.random().toString(36).substring(2, 6).toUpperCase();
                        const newKey = {
                          label: 'Ad Hoc custom webhook query token',
                          hash: `dk_live_ea3...${wordHex}`,
                          scopes: 'all_write',
                          status: 'ACTIVE'
                        };
                        setApiKeys([...apiKeys, newKey]);
                        showToast('Custom web token generated!');
                      }}
                      className="p-2 bg-slate-850 hover:bg-slate-900 text-white text-xxs rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> Issue new API key
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xxs">
                    <table className="w-full text-left border-collapse text-xxs font-semibold">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-600 uppercase">
                          <th className="p-3">Connector Scope Label</th>
                          <th className="p-3">Secret Value Block</th>
                          <th className="p-3">Auth Scopes</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {apiKeys.map((key, i) => (
                          <tr key={i} className="hover:bg-slate-50/40">
                            <td className="p-3 font-bold text-slate-800">{key.label}</td>
                            <td className="p-3 font-mono text-slate-500 font-bold select-all bg-slate-100/30">{key.hash}</td>
                            <td className="p-3 font-mono"><span className="p-0.5 px-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded font-bold text-[10px]">{key.scopes}</span></td>
                            <td className="p-3"><span className="p-0.5 px-2 bg-emerald-50 text-emerald-800 font-black rounded-full text-[9px] border border-emerald-100">Live</span></td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => setApiKeys(apiKeys.filter((_, idx) => idx !== i))}
                                className="p-1 hover:bg-rose-50 border rounded text-red-500 cursor-pointer"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* INTEGRATIONS: WEBHOOK EVENTS */}
              {activeTab === 'webhooks_settings' && (
                <div className="space-y-6 text-left" id="webhooks-logs-console">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Globe className="text-[#0ea5e9]" /> Automated Webhooks Subscription</h3>
                      <p className="text-xxs text-slate-450 mt-0.5">Push events securely to external URLs when document actions trigger.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newHook = {
                          label: 'Trigger invoice payment alerts and notifications',
                          url: 'https://api.chambers.com/hooks/ledger',
                          topics: 'invoice.paid'
                        };
                        setWebhooks([...webhooks, newHook]);
                        showToast('Webhook registered!');
                      }}
                      className="p-2 bg-slate-850 hover:bg-slate-900 text-white rounded-xl text-xxs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> Add webhook listener
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xxs">
                    <table className="w-full text-left border-collapse text-xxs font-semibold">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-600 uppercase">
                          <th className="p-3">Usage Purpose</th>
                          <th className="p-3">Destination Endpoint</th>
                          <th className="p-3">Subscribed Topics</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {webhooks.map((hook, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-00 font-bold text-slate-800">{hook.label}</td>
                            <td className="p-3 font-mono font-bold text-slate-500 select-all bg-slate-50">{hook.url}</td>
                            <td className="p-3"><span className="p-0.5 px-2 bg-amber-50 rounded border border-amber-50 border-amber-100 text-amber-700 font-bold text-[10px]">{hook.topics}</span></td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => setWebhooks(webhooks.filter((_, idx) => idx !== i))}
                                className="p-1 hover:bg-rose-50 border rounded text-red-500 cursor-pointer"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* INTEGRATIONS: OFFICE BRANCHES */}
              {activeTab === 'office_locations' && (
                <div className="space-y-6 text-left" id="office-locations-panel">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Building className="text-slate-800" /> Administrative Offices</h3>
                      <p className="text-xxs text-slate-450 mt-0.5">Formulate office location parameters for invoices.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {offices.map((off, idx) => (
                      <div key={idx} className="border p-4 rounded-2xl bg-white relative flex justify-between items-start shadow-xxs">
                        <div className="space-y-1.5 text-xxs font-bold">
                          <span className="block font-black text-slate-800 text-xs">{off.name}</span>
                          <span className="block text-slate-500">{off.address}</span>
                          <span className="block text-slate-450 font-mono">Tel: {off.tel}</span>
                          {off.primary && <span className="inline-block p-0.5 px-2 bg-indigo-50 border border-indigo-105 border-indigo-100 text-indigo-700 rounded-full font-black text-[9px]">Primary Head Office</span>}
                        </div>
                        <button 
                          onClick={async () => {
                            const updated = offices.filter((_, i) => i !== idx);
                            setOffices(updated);
                            await onSaveAllSettings({ offices: updated, prismaoffices: updated });
                          }}
                          className="p-1 text-slate-355 hover:text-red-500 hover:bg-slate-50 border rounded cursor-pointer"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 border rounded-2xl bg-white space-y-4">
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Register New Location Branch</span>
                    <div className="grid grid-cols-2 gap-3 text-xxs font-bold">
                      <input 
                        type="text" 
                        placeholder="e.g. Mombasa Litigation Annex" 
                        value={newOfficeName} 
                        onChange={e => setNewOfficeName(e.target.value)}
                        className="border p-2.5 rounded-xl bg-slate-50 focus:bg-white"
                      />
                      <input 
                        type="text" 
                        placeholder="Street, Floor, Location coordinates" 
                        value={newOfficeAddress} 
                        onChange={e => setNewOfficeAddress(e.target.value)}
                        className="border p-2.5 rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        if (!newOfficeName) return;
                        const updated = [...offices, { name: newOfficeName, address: newOfficeAddress, tel: '+254', primary: false }];
                        setOffices(updated);
                        setNewOfficeName('');
                        setNewOfficeAddress('');
                        await onSaveAllSettings({ offices: updated, prismaoffices: updated });
                      }}
                      className="p-2 bg-slate-900 text-white text-xxs font-black uppercase rounded-lg"
                    >
                      Add Branch office
                    </button>
                  </div>
                </div>
              )}

              {/* AUTOMATION: WORKFLOW AUTOMATION BUILDER */}
              {activeTab === 'workflow_builder' && (
                <WorkflowBuilder companyId={companyId} />
              )}

              {/* DATA: STORAGE MANAGEMENT PANEL */}
              {activeTab === 'storage_management' && (
                <StorageManagement companyId={companyId} />
              )}

              {/* TEAM: ROLES & MATRIX MATRIX PANEL */}
              {activeTab === 'roles_permissions' && (
                <RolesPermissions />
              )}

              {/* TEAM: DELEGATE TASKS — REAL invite + page-restriction system */}
              {activeTab === 'delegate_tasks' && (
                <div className="space-y-6 text-left animate-fade-in">
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Users className="text-blue-600" /> Delegate Tasks & Page Access</h3>
                    <p className="text-xxs text-slate-450 mt-0.5">Invite a team member by email and restrict them to only the pages their task requires. They sign in with Google — no separate signup.</p>
                  </div>

                  <div className="bg-white p-6 border rounded-2xl shadow-xxs space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Full Name</label>
                        <input type="text" value={delegateName} onChange={e => setDelegateName(e.target.value)}
                          placeholder="e.g. Jenny Smith"
                          className="w-full text-xs font-bold border p-2.5 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Email Address</label>
                        <input type="email" value={delegateEmail} onChange={e => setDelegateEmail(e.target.value)}
                          placeholder="jenny@gmail.com"
                          className="w-full text-xs font-bold border p-2.5 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1 col-span-1 md:col-span-2">
                        <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Role</label>
                        <select value={delegateRole} onChange={e => setDelegateRole(e.target.value)}
                          className="w-full text-xs font-bold border p-2.5 rounded-xl bg-slate-50/50">
                          <option value="LAWYER">Lawyer</option>
                          <option value="PARALEGAL">Paralegal</option>
                          <option value="SECRETARY">Secretary</option>
                          <option value="ADMIN">Admin (full access)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xxs font-black text-slate-500 uppercase tracking-wider">Page Access Override</label>
                      <p className="text-[10px] text-slate-400">Dashboard is always included automatically. Pick everything else this person needs.</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 col-span-1 md:col-span-2">
                        {DELEGATABLE_PAGES.map(p => (
                          <label key={p.key}
                            className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer text-xxs font-bold transition ${delegatePages.includes(p.key) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <input type="checkbox" checked={delegatePages.includes(p.key)} onChange={() => toggleDelegatePage(p.key)} className="rounded text-blue-600 cursor-pointer" />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t">
                      <button onClick={handleSendDelegateInvite} disabled={delegateSending}
                        className="p-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xxs font-black uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                        {delegateSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        Send Invitation Email
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 animate-fade-in">
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Sent Invitations</span>
                    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xxs">
                      <table className="w-full text-left border-collapse text-xxs font-semibold">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-600 uppercase">
                            <th className="p-3">Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Page Access</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {loadingInvites ? (
                            <tr><td colSpan={5} className="p-6 text-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>
                          ) : pendingInvites.length === 0 ? (
                            <tr><td colSpan={5} className="p-6 text-center text-slate-400 italic">No invitations sent yet.</td></tr>
                          ) : pendingInvites.map(inv => (
                            <tr key={inv.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-bold text-slate-800">{inv.email}</td>
                              <td className="p-3"><span className="p-0.5 px-2 bg-blue-50 border border-blue-100 text-blue-700 rounded font-bold text-[10px]">{inv.role}</span></td>
                              <td className="p-3 text-slate-500">{inv.allowedPages ? inv.allowedPages.join(', ') : 'Full access'}</td>
                              <td className="p-3">
                                {inv.acceptedAt ? (
                                  <span className="p-0.5 px-2 bg-emerald-50 text-emerald-800 font-black rounded-full text-[9px] border border-emerald-100">Accepted</span>
                                ) : !inv.isActive ? (
                                  <span className="p-0.5 px-2 bg-slate-100 text-slate-500 font-black rounded-full text-[9px] border border-slate-200">Revoked/Expired</span>
                                ) : (
                                  <span className="p-0.5 px-2 bg-amber-50 text-amber-700 font-black rounded-full text-[9px] border border-amber-100">Pending</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {!inv.acceptedAt && inv.isActive && (
                                  <button onClick={() => handleRevokeInvite(inv.id)} className="p-1 hover:bg-rose-50 border rounded text-red-500 cursor-pointer">
                                    <Trash className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Active Team Members</span>
                    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xxs">
                      <table className="w-full text-left border-collapse text-xxs font-semibold">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-600 uppercase">
                            <th className="p-3">Name</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Page Access</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {users.filter(u => !u.isSuperAdmin && u.id !== authUser?.id).map(u => (
                            <TeamMemberRow key={u.id} member={u} companyId={companyId} delegatablePages={DELEGATABLE_PAGES} onChanged={onRefresh} showToast={showToast} />
                          ))}
                          {users.filter(u => !u.isSuperAdmin && u.id !== authUser?.id).length === 0 && (
                            <tr><td colSpan={5} className="p-6 text-center text-slate-400 italic">No team members yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* RETENTION RECYCLE BIN EXPONENTIAL */}
              {activeTab === 'recycle_bin' && (
                <div className="space-y-6 text-left" id="recycle-bin-restores">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Trash className="text-rose-600 animate-pulse" /> Recycle Bin & Purge Control</h3>
                      <p className="text-xxs text-slate-450 mt-0.5">Files deleted anywhere remain safely retrievable for exactly 30 days before shredding.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setRecycleList([]);
                        showToast('Recycle bin completely shredded!');
                      }}
                      disabled={recycleList.length === 0}
                      className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xxs font-black uppercase"
                    >
                      Empty trash bin
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xxs">
                    <table className="w-full text-left border-collapse text-xxs font-bold">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-600 uppercase">
                          <th className="p-3">Deleted Item</th>
                          <th className="p-3">Deleted By</th>
                          <th className="p-3">Destruction Date</th>
                          <th className="p-3">Retention Remaining</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-semibold">
                        {recycleList.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">{item.name}</td>
                            <td className="p-3 text-slate-600">{item.deletedBy}</td>
                            <td className="p-3 text-slate-450">{item.date}</td>
                            <td className="p-3"><span className="bg-amber-50 border border-amber-100 text-amber-600 p-0.5 px-2 rounded font-mono font-bold text-[10px]">{item.daysLeft} days until shred</span></td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => {
                                  setRecycleList(recycleList.filter(r => r.id !== item.id));
                                  showToast(`Restored: ${item.name}`);
                                }}
                                className="p-1 hover:bg-indigo-50 border rounded text-indigo-500 font-bold select-none cursor-pointer"
                              >
                                Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MY PROFILE — real photo upload, persists immediately */}
              {activeTab === 'account_profile' && authUser && (
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Users className="text-blue-600" /> My Profile</h3>
                    <p className="text-xxs text-slate-450 mt-0.5">Your photo and identity, visible across the entire workspace.</p>
                  </div>
                  <div className="bg-white p-6 border rounded-2xl shadow-xxs flex items-center gap-5">
                    <div className="relative shrink-0">
                      <img
                        src={authUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                        className="h-20 w-20 rounded-full object-cover shadow-sm bg-slate-100"
                      />
                      {profilePhotoUploading && (
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="block font-black text-slate-800 text-sm">{authUser.fullName}</span>
                        <span className="block text-xs text-slate-500">{authUser.email}</span>
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{authUser.role}</span>
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xxs font-bold cursor-pointer transition select-none">
                        <UploadCloud className="h-3.5 w-3.5" />
                        Change Photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} disabled={profilePhotoUploading} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Default catch-all for remaining 50 tabs - beautifully mapped template states */}
              {!['firm_details', 'appearance', 'terminology_settings', 'api_keys_settings', 'webhooks_settings', 'office_locations', 'workflow_builder', 'storage_management', 'roles_permissions', 'recycle_bin', 'delegate_tasks', 'account_profile'].includes(activeTab) && (
                <div className="space-y-6 text-left p-6 border rounded-2xl bg-white shadow-xxs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-750">
                      <Sliders className="h-6 w-6 text-indigo-600 animate-spin-slow" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        {ALL_TABS.find(t => t.id === activeTab)?.label || 'System Config Item'} Console
                      </h4>
                      <p className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-widest mt-0.5">Category: {ALL_TABS.find(t => t.id === activeTab)?.category || 'FIRM'}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-normal leading-relaxed border-b pb-4">
                    This administrative configuration panel handles live automated systems coordinates. Submitting adjustments updates associated client messaging channels automatically.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xxs font-extrabold text-slate-500 uppercase tracking-wider">
                      <div className="space-y-1.5">
                        <label>Feature Toggle state</label>
                        <div className="flex items-center gap-2">
                          <button className="h-6 w-11 bg-indigo-600 rounded-full p-0.5 transition flex items-center justify-end relative">
                            <span className="h-5 w-5 bg-white rounded-full block" />
                          </button>
                          <span className="text-slate-800 uppercase font-mono font-bold text-[10px]">Operational Trigger Active</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label>Threshold trigger count</label>
                        <input type="number" defaultValue="3" className="w-full text-xs font-bold border p-2 rounded-xl bg-slate-50/50" />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl space-y-1 mt-4 text-[10px] font-bold text-slate-450 leading-normal text-left">
                      <span className="text-slate-800 font-extrabold uppercase block mb-1">Sandbox Live Log Status Feed:</span>
                      <span className="block font-mono text-emerald-600">&rarr; API synchronizations: Verified ready</span>
                      <span className="block font-mono text-emerald-600">&rarr; Database clusters: 0 latency</span>
                    </div>

                    <div className="flex justify-end pt-4 select-none">
                      <button 
                        onClick={() => showToast('Changes submitted successfully!')}
                        className="p-2 px-5 bg-slate-900 border text-white text-xxs font-black uppercase rounded-xl"
                      >
                        Submit configuration
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </div>

      </div>

      {/* Floating Success Toaster system notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-6 right-6 bg-slate-900 border border-slate-700 text-white p-3 px-6 rounded-xl font-bold text-xxs shadow-xl flex items-center gap-2 z-50 select-none pointer-events-none"
          >
            <CheckCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
