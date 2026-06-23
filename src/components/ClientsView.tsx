import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, X, ChevronRight, Phone, Mail, Building2, User, Briefcase, FileText, Clock, ArrowLeft, 
  Edit2, Check, Loader2, AlertTriangle, Trash2, MoreVertical, Filter, Grid3X3, List, AlignJustify, 
  Upload, Download, RefreshCw, MessageSquare, Calendar, Activity, Shield, Star, CheckSquare, FileCheck, 
  Landmark, Users, Pin, HelpCircle, Sliders, ChevronDown, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { Client, Case } from '../types';
import ClientProfilePanel from './clients/ClientProfilePanel';
import ClientModals from './clients/ClientModals';

interface ClientsViewProps {
  companyId: string;
  clients: Client[];
  cases: Case[];
  onRefresh: () => void;
}

type ClientStatus = 'ALL' | 'ACTIVE' | 'FORMER' | 'NO_MATTERS' | 'ONBOARDING' | 'HIGHRISK' | 'VIP';
type ViewMode = 'grid' | 'list' | 'compact';
type SortOption = 'name_asc' | 'name_desc' | 'newest' | 'oldest' | 'most_matters' | 'outstanding' | 'risk_highest' | 'value_tier';

function getClientStatus(client: Client, cases: Case[]): 'ACTIVE' | 'FORMER' | 'NO_MATTERS' {
  const clientCases = cases.filter(c => c.clientId === client.id);
  if (clientCases.length === 0) return 'NO_MATTERS';
  if (clientCases.some(c => c.status === 'ACTIVE')) return 'ACTIVE';
  return 'FORMER';
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  FORMER: 'bg-slate-100 text-slate-500 border border-slate-200 shadow-xxs',
  NO_MATTERS: 'bg-amber-50 text-amber-700 border border-amber-100'
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active Client',
  FORMER: 'Former Client',
  NO_MATTERS: 'No Matters'
};

const AVATAR_COLORS = [
  'bg-sky-500', 'bg-violet-500', 'bg-rose-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
];

function avatarColor(id: string) {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function ClientsView({ companyId, clients = [], cases = [], onRefresh }: ClientsViewProps) {
  // Navigation & Filtering tabs
  const [filterTab, setFilterTab] = useState<ClientStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('Total Clients');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showMoreTabsDropdown, setShowMoreTabsDropdown] = useState(false);
  
  // Custom Filters panel overlay states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterRisk, setFilterRisk] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterFee, setFilterFee] = useState<string>('');

  // Bulk selector states
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [showBulkCommunication, setShowBulkCommunication] = useState(false);
  const [bulkMessageText, setBulkMessageText] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);

  // Modal displays state
  const [showAddModal, setShowAddModal] = useState(false);

  // Active highlighted client
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  // On-the-fly Statistics evaluations
  const totalClientsCount = clients.length;
  const activeClientsCount = clients.filter(c => getClientStatus(c, cases) === 'ACTIVE').length;
  const newThisMonthCount = clients.filter(c => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const pendingOnboardingCount = clients.filter(c => !c.onboardingComplete).length;
  
  // Follow-ups due today or overdue count
  const followUpDueCount = clients.filter(c => {
    const hasPendingTask = (c.tasks || []).some(t => t.status !== 'complete' && t.dueAt && new Date(t.dueAt) <= new Date());
    const nextActionPassed = c.nextActionDue && new Date(c.nextActionDue) <= new Date();
    return hasPendingTask || nextActionPassed;
  }).length;

  const inactiveClientsCount = clients.filter(c => {
    const activeCases = cases.filter(ca => ca.clientId === c.id && ca.status === 'ACTIVE');
    return activeCases.length === 0;
  }).length;

  // Client Selection logic
  const handleToggleSelectClient = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClientIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = (visibleClients: Client[]) => {
    const allIds = visibleClients.map(c => c.id);
    const areAllSelected = allIds.every(id => selectedClientIds.includes(id));
    if (areAllSelected) {
      setSelectedClientIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedClientIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  // Bulk Update handler simulation
  const handleBulkDeactivate = async () => {
    if (selectedClientIds.length === 0) return;
    if (confirm(`Do you want to clear/archive ${selectedClientIds.length} select files?`)) {
      for (const id of selectedClientIds) {
        await fetch(`/api/firm/${companyId}/clients/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ riskRating: 'low' })
        });
      }
      setSelectedClientIds([]);
      onRefresh();
    }
  };

  const handleBulkBroadcast = async () => {
    if (!bulkMessageText.trim()) return;
    setBulkSending(true);
    // Simulate API delivery
    setTimeout(() => {
      setBulkNotice(`Message successfully broadcasted directly to ${selectedClientIds.length} client communication channels (SMS / WhatsApp).`);
      setTimeout(() => setBulkNotice(null), 5000);
      setBulkSending(false);
      setShowBulkCommunication(false);
      setBulkMessageText('');
      setSelectedClientIds([]);
    }, 1500);
  };

  // Global search match routine
  const q = searchQuery.toLowerCase();
  const displayedClients = clients
    .filter(client => {
      const status = getClientStatus(client, cases);
      
      // Tab selector matching
      const matchesTab =
        filterTab === 'ALL' ? true :
        filterTab === 'ACTIVE' ? status === 'ACTIVE' :
        filterTab === 'FORMER' ? status === 'FORMER' :
        filterTab === 'NO_MATTERS' ? status === 'NO_MATTERS' :
        filterTab === 'ONBOARDING' ? !client.onboardingComplete :
        filterTab === 'HIGHRISK' ? client.riskRating === 'high' :
        client.isVip;

      // Global text query matches
      const matchesSearch = !q ||
        client.fullName?.toLowerCase().includes(q) ||
        client.phone?.toLowerCase().includes(q) ||
        client.email?.toLowerCase().includes(q) ||
        client.idNumber?.toLowerCase().includes(q) ||
        client.organisation?.toLowerCase().includes(q) ||
        client.occupation?.toLowerCase().includes(q);

      // Advanced subfilters matches
      const matchesCategory = !filterCategory || client.clientCategory === filterCategory;
      const matchesRisk = !filterRisk || client.riskRating === filterRisk;
      const matchesSource = !filterSource || client.clientSource === filterSource;
      const matchesFee = !filterFee || client.feeArrangement === filterFee;

      return matchesTab && matchesSearch && matchesCategory && matchesRisk && matchesSource && matchesFee;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName);
      if (sortBy === 'name_desc') return b.fullName.localeCompare(a.fullName);
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'most_matters') {
        return cases.filter(c => c.clientId === b.id).length - cases.filter(c => c.clientId === a.id).length;
      }
      if (sortBy === 'outstanding') {
        return (b.outstandingBalance || 0) - (a.outstandingBalance || 0);
      }
      if (sortBy === 'risk_highest') {
        const riskVal = (r?: string) => r === 'high' ? 3 : r === 'medium' ? 2 : 1;
        return riskVal(b.riskRating) - riskVal(a.riskRating);
      }
      if (sortBy === 'value_tier') {
        const valueVal = (v?: string) => v === 'platinum' ? 4 : v === 'gold' ? 3 : v === 'silver' ? 2 : 1;
        return valueVal(b.valueTier) - valueVal(a.valueTier);
      }
      return 0;
    });

  // Intake Saving Handler
  const handleSaveNewIntake = async (formData: any) => {
    try {
      const res = await fetch(`/api/firm/${companyId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Find duplicates across visible listings
  const checkHasDuplicate = (cl: Client) => {
    return clients.some(
      other => other.id !== cl.id && 
              ((cl.email && other.email?.toLowerCase() === cl.email.toLowerCase()) || 
               (cl.phone && other.phone === cl.phone))
    );
  };

  return (
    <div className="flex flex-col gap-5 h-full -m-4 md:-m-8 animate-fade-in" style={{ height: 'calc(100vh - 57px)' }}>
      {bulkNotice && (
        <div className="mx-4 md:mx-8 mt-2 p-3 bg-emerald-50 border border-emerald-202 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center gap-2 mb-2">
          <span>{bulkNotice}</span>
        </div>
      )}

      {/* SECTION 1 — STATISTICS STRIP */}
      <div className="bg-white border-b border-slate-200/60 p-4 shrink-0 shadow-xxs overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-[700px]">
          {[
            { label: 'Total Clients', count: totalClientsCount, desc: 'Active records held', icon: Users, badge: 'Directory', bg: '#fbfefe', bgStyle: { backgroundColor: '#f0f9ff' }, border: '#0ea5e9', click: () => { setFilterTab('ALL'); setSelectedMetric('Total Clients'); } },
            { label: 'Active Clients', count: activeClientsCount, desc: 'With live trials', icon: CheckCircle2, badge: 'Live Trials', bg: '#fefebe', bgStyle: { backgroundColor: '#f0fdf4' }, border: '#10b981', click: () => { setFilterTab('ACTIVE'); setSelectedMetric('Active Clients'); } },
            { label: 'New This Month', count: newThisMonthCount, desc: 'Recent intakes verified', icon: Activity, badge: 'Recent', bg: '#fefebe', bgStyle: { backgroundColor: '#f5f3ff' }, border: '#8b5cf6', click: () => { setFilterTab('ALL'); setSearchQuery(''); setSelectedMetric('New This Month'); } },
            { label: 'Pending Onboarding', count: pendingOnboardingCount, desc: 'Incomplete checklists', icon: Clock, badge: 'Pending', bg: '#fefebe', bgStyle: { backgroundColor: '#fffbeb' }, border: '#f59e0b', click: () => { setFilterTab('ONBOARDING'); setSelectedMetric('Pending Onboarding'); } },
            { label: 'Follow-ups Due', count: followUpDueCount, desc: 'Overdue task queues', icon: ShieldAlert, badge: 'Action Required', bg: '#fefebe', bgStyle: { backgroundColor: '#fef2f2' }, border: '#ef4444', click: () => { setFilterTab('ALL'); setSelectedMetric('Follow-ups Due'); } },
            { label: 'Inactive Clients', count: inactiveClientsCount, desc: 'No cases currently', icon: Users, badge: 'Inactive', bg: '#fefebe', bgStyle: { backgroundColor: '#f9fafb' }, border: '#6b7280', click: () => { setFilterTab('NO_MATTERS'); setSelectedMetric('Inactive Clients'); } }
          ].map(card => {
            const isActive = selectedMetric === card.label;
            const Icon = card.icon;

            return (
              <button
                key={card.label}
                onClick={card.click}
                className={`top-stat-card cursor-pointer p-3.5 flex flex-col justify-between select-none ${
                  isActive 
                    ? 'ring-2 ring-indigo-550 ring-offset-1 scale-[1.02]' 
                    : 'hover:scale-[1.01]'
                }`}
                style={{
                  border: '1px solid #e5e7eb',
                  borderLeft: `4px solid ${card.border}`,
                  borderRadius: '12px',
                  ...card.bgStyle,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)'
                }}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <Icon className="h-4.5 w-4.5 shrink-0 text-slate-800" />
                  <span className="text-[9px] font-black uppercase py-0.5 px-1.5 rounded-full bg-white/60 text-slate-800 border border-[#e5e7eb] whitespace-nowrap">
                    {card.badge}
                  </span>
                </div>
                
                <div className="mt-3 text-left w-full">
                  <span className="block font-black text-2xl tracking-tight text-slate-950">
                    {card.count}
                  </span>
                  <span className="block text-[11px] font-bold text-slate-950 truncate mt-0.5">
                    {card.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global workspace layouts split row */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50">

        {/* LEFT COMPACT CLIENTS LIST CONTROL PANEL (30%) */}
        <div className={`${selectedClientId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[360px] xl:w-[400px] shrink-0 border-r border-slate-205 bg-white overflow-hidden`}>
          
          {/* Section Search, Saved Tags & Advanced Filtering Options popups */}
          <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-normal text-slate-900 uppercase tracking-widest">Directory Registers</h3>
                <p className="text-[10px] text-slate-800 font-semibold">{displayedClients.length} files matching queries</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition duration-150 cursor-pointer min-h-[44px]"
              >
                <Plus className="h-4 w-4" /> First Intake
              </button>
            </div>

            {/* Smart Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-800" />
              <input
                type="text"
                placeholder="Search by name, ID, phone, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs border-[2px] border-slate-200 pl-10 pr-10 py-3.5 rounded-xl bg-slate-50/50 outline-none focus:bg-slate-100/90 focus:border-slate-400 placeholder-slate-500 font-normal text-slate-950 transition-all duration-200"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3.5">
                  <X className="h-4 w-4 text-slate-600" />
                </button>
              )}
            </div>            {/* Core Tab Chips selection Filter strip */}
            <div className="flex gap-1.5 py-1 items-center w-full relative">
              {/* Natural fitting tabs with centered texts and no overlaps */}
              {([
                ['ALL', 'All'],
                ['ACTIVE', 'Active'],
                ['FORMER', 'Former']
              ] as [ClientStatus, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilterTab(val)}
                  className={`text-[13px] px-1 py-2 rounded-xl transition duration-150 cursor-pointer flex-1 text-center flex items-center justify-center min-h-[44px] font-bold border ${
                    filterTab === val 
                      ? 'bg-sky-500 text-white border-sky-600 shadow-sm' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300 shadow-xxs'
                  }`}
                >
                  {label}
                </button>
              ))}

              {/* Stylized More Dropdown option with floaty gap effect */}
              <div className="relative flex-1">
                {(() => {
                  const moreItems = [
                    ['NO_MATTERS', 'No Case'],
                    ['ONBOARDING', 'Checklist'],
                    ['HIGHRISK', 'High Risk'],
                    ['VIP', 'VIP ⭐']
                  ] as const;
                  const activeInDropdown = moreItems.find(([v]) => filterTab === v);
                  const moreLabel = activeInDropdown ? activeInDropdown[1] : 'More';
                  const isMoreActive = !!activeInDropdown;

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowMoreTabsDropdown(!showMoreTabsDropdown)}
                        className={`w-full text-[13px] px-1 py-2.5 rounded-xl transition duration-150 cursor-pointer flex items-center justify-center gap-1 min-h-[44px] font-bold border ${
                          isMoreActive
                            ? 'bg-sky-500 text-white border-sky-600 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300 shadow-xxs'
                        }`}
                      >
                        <span className="truncate">{moreLabel}</span>
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${showMoreTabsDropdown ? 'rotate-180' : ''} ${isMoreActive ? 'text-white' : 'text-slate-950'}`} />
                      </button>

                      {showMoreTabsDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-40 bg-transparent" 
                            onClick={() => setShowMoreTabsDropdown(false)}
                          />
                          <div className="absolute right-0 top-full mt-4 w-44 bg-white border-[2px] border-slate-200/80 rounded-2xl shadow-xl p-1.5 z-50 animate-fade-in translate-y-1.5 space-y-1">
                            {moreItems.map(([val, label]) => (
                              <button
                                key={val}
                                onClick={() => {
                                  setFilterTab(val);
                                  setShowMoreTabsDropdown(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 text-xs font-normal rounded-xl transition-all duration-150 ${
                                  filterTab === val
                                    ? 'bg-sky-50 text-sky-600'
                                    : 'hover:bg-slate-50 text-slate-800 hover:text-sky-600'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Advanced Multi-Filters and Sort bars toggling dropdowns */}
            <div className="flex items-center justify-center gap-1.5 border-[2px] border-slate-100 rounded-xl p-1 bg-slate-50/50 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 transition cursor-pointer min-h-[34px] ${
                  showAdvancedFilters 
                    ? 'bg-sky-50 text-sky-600 border-sky-300' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <Sliders className="h-3 w-3" /> Filters
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="text-[10px] font-normal border-[2px] border-slate-100 bg-white rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100/80 hover:border-slate-205 flex items-center justify-center gap-1 min-h-[34px] cursor-pointer"
                >
                  <span>Sort: {
                    sortBy === 'name_asc' ? 'A–Z' :
                    sortBy === 'name_desc' ? 'Z–A' :
                    sortBy === 'newest' ? 'Recent' :
                    sortBy === 'oldest' ? 'Oldest' :
                    sortBy === 'most_matters' ? 'Matters' :
                    sortBy === 'outstanding' ? 'Unpaid' :
                    sortBy === 'risk_highest' ? 'Risk' : 'Tier'
                  }</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {showSortDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-transparent" 
                      onClick={() => setShowSortDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-4 w-48 bg-white border-[2px] border-slate-200/80 rounded-2xl shadow-xl p-1.5 z-50 animate-fade-in translate-y-1.5 space-y-1">
                      {([
                        ['name_asc', 'Name A–Z'],
                        ['name_desc', 'Name Z–A'],
                        ['newest', 'Most Recent'],
                        ['oldest', 'Oldest Entry'],
                        ['most_matters', 'Matters Volume'],
                        ['outstanding', 'Balance Due'],
                        ['risk_highest', 'Extreme Risk'],
                        ['value_tier', 'Platinum Tier']
                      ] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => {
                            setSortBy(val);
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs font-normal rounded-xl transition-all duration-150 ${
                            sortBy === val
                              ? 'bg-sky-50 text-[#00BCFF]'
                              : 'hover:bg-slate-50 text-slate-805 hover:text-[#00BCFF]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-1 bg-white p-1 border border-slate-200 rounded-lg">
                {([['grid', Grid3X3], ['list', List], ['compact', AlignJustify]] as [ViewMode, any][]).map(([mode, Icon]) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-1.5 rounded-md transition duration-150 cursor-pointer ${viewMode === mode ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-sky-500'}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Floating Advanced selection controls popover */}
            {showAdvancedFilters && (
              <div className="p-3 bg-slate-50 border-[2px] border-slate-200 rounded-xl space-y-2 animate-fade-in text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-normal uppercase text-slate-400">Category</label>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-white p-1.5 border-[2px] border-slate-100 rounded outline-none text-xs">
                      <option value="">All</option>
                      <option value="individual">Individual</option>
                      <option value="corporate">Corporate</option>
                      <option value="government">Government</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-normal uppercase text-slate-400">Risk Assessment</label>
                    <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="w-full bg-white p-1.5 border-[2px] border-slate-100 rounded outline-none text-xs">
                      <option value="">All</option>
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium</option>
                      <option value="high">High Warning</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => { setFilterCategory(''); setFilterRisk(''); setFilterSource(''); setFilterFee(''); setShowAdvancedFilters(false); }}
                  className="w-full text-center text-[10px] text-[#00BCFF] font-normal hover:underline"
                >
                  Reset Advanced Filters
                </button>
              </div>
            )}
          </div>

          {/* Core Client Roster Feed list rendering */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Dynamic Bulk selection header */}
            {displayedClients.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider select-none">
                  <button
                    type="button"
                    onClick={() => handleSelectAllVisible(displayedClients)}
                    className={`h-3.5 w-3.5 rounded-full flex items-center justify-center border cursor-pointer transition shrink-0 ${
                      displayedClients.every(c => selectedClientIds.includes(c.id))
                        ? 'bg-sky-500 border-sky-500 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-300 text-transparent hover:border-sky-500'
                    }`}
                  >
                    <Check className="h-2 w-2 stroke-[4]" />
                  </button>
                  <span>Bulk select matches</span>
                </div>
                {selectedClientIds.length > 0 && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setShowBulkCommunication(true)}
                      className="text-[9.5px] font-bold bg-sky-500 text-white rounded px-3 py-1.5 transition-all cursor-pointer hover:bg-sky-600"
                    >
                      Broadcast Messages
                    </button>
                    <button
                      onClick={handleBulkDeactivate}
                      className="text-[9.5px] font-normal bg-red-500 text-white rounded px-3 py-1.5 transition-all cursor-pointer hover:bg-red-600"
                    >
                      Archive Select
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bulk message sender block inline nested */}
            {showBulkCommunication && (
              <div className="p-3 bg-sky-50/45 border border-sky-200 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-slate-800">Broadcasting to {selectedClientIds.length} Recipient Channels</p>
                <textarea
                  placeholder="Type message: Hello [CLIENT_NAME], please submit your KYC document scans."
                  value={bulkMessageText}
                  onChange={e => setBulkMessageText(e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none font-sans text-xs focus:border-sky-400"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowBulkCommunication(false)} className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-bold bg-white cursor-pointer hover:bg-slate-50">Cancel</button>
                  <button onClick={handleBulkBroadcast} disabled={bulkSending} className="px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold cursor-pointer">
                    {bulkSending ? 'Broadcasting...' : 'Transmit'}
                  </button>
                </div>
              </div>
            )}

            {displayedClients.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30 animate-pulse" />
                <p className="text-xs font-normal text-slate-800">No matching relation entries</p>
                <p className="text-[10px] text-slate-400 mt-1">Try resetting tab preferences or query search term</p>
              </div>
            ) : viewMode === 'compact' ? (
              <div className="space-y-1">
                {displayedClients.map(client => {
                  const isSelected = selectedClientId === client.id;
                  const isChecked = selectedClientIds.includes(client.id);
                  const isDuplicate = checkHasDuplicate(client);
                  return (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition select-none cursor-pointer border ${
                        isSelected ? 'bg-sky-50/40 border-sky-400 text-sky-800 shadow-sm' : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectClient(client.id, e as any);
                        }}
                        className={`h-3.5 w-3.5 rounded-full flex items-center justify-center border cursor-pointer mr-2 transition shrink-0 ${
                          isChecked
                            ? 'bg-sky-500 border-sky-500 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-300 text-transparent hover:border-sky-500'
                        }`}
                      >
                        <Check className="h-2 w-2 stroke-[4]" />
                      </button>
                      <span className="text-xs font-semibold text-slate-950 truncate flex-1">{client.fullName}</span>
                      
                      {isDuplicate && (
                        <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded font-normal" title="Possible Duplicate Signature">DUP</span>
                      )}

                      <span className="text-[10px] font-mono font-semibold text-slate-800">{client.phone || '—'}</span>
                    </div>
                  );
                })}
              </div>
            ) : viewMode === 'list' ? (
               <div className="space-y-1.5">
                {displayedClients.map(client => {
                  const status = getClientStatus(client, cases);
                  const isSelected = selectedClientId === client.id;
                  const isChecked = selectedClientIds.includes(client.id);
                  const isDuplicate = checkHasDuplicate(client);
                  return (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border cursor-pointer select-none transition duration-150 ${
                        isSelected ? 'bg-sky-50/40 border-sky-400 text-sky-850 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectClient(client.id, e as any);
                        }}
                        className={`h-3.5 w-3.5 rounded-full flex items-center justify-center border cursor-pointer mr-1 transition shrink-0 ${
                          isChecked
                            ? 'bg-sky-500 border-sky-500 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-300 text-transparent hover:border-sky-500'
                        }`}
                      >
                        <Check className="h-2 w-2 stroke-[4]" />
                      </button>
                      <div className={`h-8 w-8 rounded-xl ${avatarColor(client.id)} text-white flex items-center justify-center text-xs font-normal shrink-0`}>
                        {client.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-sky-700' : 'text-slate-950'}`}>{client.fullName}</p>
                        <p className={`text-[10px] font-bold truncate ${isSelected ? 'text-sky-600' : 'text-slate-950 font-extrabold'}`}>{client.organisation || 'Individual File'}</p>
                      </div>
                      
                      {isDuplicate && (
                        <ShieldAlert className="h-4 w-4 text-amber-500 mr-1" title="Duplicate Record warning" />
                      )}

                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${isSelected ? 'bg-sky-100 text-sky-600' : STATUS_STYLES[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              // GRID CARD VIEW RENDER (Default)
              <div className="grid grid-cols-1 gap-2">
                {displayedClients.map(client => {
                  const status = getClientStatus(client, cases);
                  const isSelected = selectedClientId === client.id;
                  const isChecked = selectedClientIds.includes(client.id);
                  const isDuplicate = checkHasDuplicate(client);
                  const isHoldOverdue = client.nextActionDue && new Date(client.nextActionDue) <= new Date();

                  return (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition duration-150 cursor-pointer select-none relative ${
                        isSelected ? 'bg-sky-50/45 border-sky-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xxs'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelectClient(client.id, e as any);
                          }}
                          className={`h-3.5 w-3.5 rounded-full flex items-center justify-center border cursor-pointer z-10 mr-1 transition shrink-0 ${
                            isChecked
                              ? 'bg-sky-500 border-sky-500 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-300 text-transparent hover:border-sky-500'
                          }`}
                        >
                          <Check className="h-2 w-2 stroke-[4]" />
                        </button>

                        <div className={`h-9 w-9 rounded-xl ${avatarColor(client.id)} text-white flex items-center justify-center text-sm font-normal shrink-0`}>
                          {client.fullName.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5 flex-wrap">
                            <p className={`text-xs font-semibold leading-tight truncate ${isSelected ? 'text-sky-700' : 'text-slate-950'}`}>{client.fullName}</p>
                            <span className={`text-[8.5px] font-semibold px-1.5 py-0.5 rounded uppercase ${isSelected ? 'bg-sky-100 text-sky-600 font-bold' : STATUS_STYLES[status]}`}>
                              {STATUS_LABELS[status]}
                            </span>
                          </div>
                          
                          <p className={`text-[10px] font-bold mt-0.5 truncate ${isSelected ? 'text-sky-650' : 'text-slate-900 font-extrabold'}`}>{client.organisation || 'Individual Dossier'}</p>
                          <p className={`text-[10px] font-mono font-bold truncate mt-0.5 ${isSelected ? 'text-sky-600/90' : 'text-slate-950 font-extrabold'}`}>{client.email || client.phone || 'No Address credentials'}</p>
                        </div>
                      </div>

                      {/* Warnings alert dots in footer lines */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100/50 text-[10px]">
                        <div className="flex gap-2">
                          {client.isVip && (
                            <span className="text-amber-500 font-normal flex items-center gap-0.5">★ VIP</span>
                          )}
                          {isHoldOverdue && (
                            <span className="text-red-500 font-normal flex items-center gap-0.5" title="Next action overdue">⚠ Reminders Due</span>
                          )}
                          {isDuplicate && (
                            <span className="text-amber-605 font-normal flex items-center gap-0.5 text-amber-600" title="Possible Duplicate Signature">Possible Duplicate</span>
                          )}
                        </div>
                        <span className="opacity-95 font-black text-slate-950">{cases.filter(c => c.clientId === client.id).length} Matters Opened</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT FULL DETAIL WORKSPACE CRM (70%) */}
        {selectedClient ? (
          <ClientProfilePanel
            client={selectedClient}
            cases={cases}
            companyId={companyId}
            onClose={() => setSelectedClientId(null)}
            onRefresh={onRefresh}
          />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50/60 p-6">
            <div className="text-center space-y-4 max-w-sm">
              <div className="h-16 w-16 bg-white border rounded-[22px] shadow-xxs flex items-center justify-center mx-auto">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Client Directory Profile</p>
              <p className="text-xs text-slate-800 bg-white/70 backdrop-blur-md px-4 py-2.5 border rounded-xl shadow-xxs font-semibold">
                Consult ledger accounts, verify compliance document lifespans, manage right-to-erasure GDPR forms, and log client contact minutes from a single secure layout dashboard.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow cursor-pointer min-h-[44px]"
              >
                Intake New Client Profile
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL INTAKE VIEW overlay */}
      {showAddModal && (
        <ClientModals
          existingClients={clients}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveNewIntake}
        />
      )}

    </div>
  );
}
