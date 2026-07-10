import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, FolderKanban, FileText, Search, Plus, Filter,
  ArrowUpDown, ExternalLink, ShieldCheck, ShieldAlert, Loader2, Copy, Check,
  ChevronRight, Database, Calendar, Globe
} from 'lucide-react';

interface CompanySummary {
  company: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    setupComplete: boolean;
    planTier?: string;
    country?: string;
    storageQuotaMb?: number;
    billingEmail?: string;
    createdAt: string;
  };
  stats: {
    users: { total: number; active: number; suspended: number };
    cases: { total: number; active: number; closed: number };
    totalDocs: number;
    storageBytes: number;
    lastActivity: string;
  };
}

export const FirmManagement: React.FC = () => {
  const [summaries, setSummaries] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'storage' | 'users' | 'activity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newFirmName, setNewFirmName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminFullName, setNewAdminFullName] = useState('');
  const [newPlanTier, setNewPlanTier] = useState('Standard');
  const [newCountry, setNewCountry] = useState('US');
  const [modalSuccessData, setModalSuccessData] = useState<{ inviteLink: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // @ts-ignore
  const SA_PATH = import.meta.env?.VITE_SUPERADMIN_PATH || 'system-access';

  const fetchFirms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/sa/firms', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to retrieve firm registry.');
      }
      const data = await res.json();
      setSummaries(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve firm registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirms();
  }, []);

  const handleCreateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirmName || !newAdminEmail || !newAdminFullName) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/sa/firms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmName: newFirmName,
          adminEmail: newAdminEmail,
          adminFullName: newAdminFullName,
          planTier: newPlanTier,
          country: newCountry
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create firm.');
      }

      const data = await res.json();
      setModalSuccessData({ inviteLink: data.inviteLink });
      await fetchFirms();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create firm.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = () => {
    if (!modalSuccessData?.inviteLink) return;
    navigator.clipboard.writeText(modalSuccessData.inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const resetCreateForm = () => {
    setNewFirmName('');
    setNewAdminEmail('');
    setNewAdminFullName('');
    setNewPlanTier('Standard');
    setNewCountry('US');
    setModalSuccessData(null);
    setIsModalOpen(false);
  };

  // Filter and sort computation
  const filteredFirms = summaries.filter((item) => {
    const matchesSearch =
      item.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.company.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.company.billingEmail && item.company.billingEmail.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTier =
      tierFilter === 'all' ||
      (item.company.planTier || 'Standard').toLowerCase() === tierFilter.toLowerCase();

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.company.isActive) ||
      (statusFilter === 'suspended' && !item.company.isActive);

    return matchesSearch && matchesTier && matchesStatus;
  });

  const sortedFirms = [...filteredFirms].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.company.name.localeCompare(b.company.name);
    } else if (sortBy === 'storage') {
      comparison = a.stats.storageBytes - b.stats.storageBytes;
    } else if (sortBy === 'users') {
      comparison = a.stats.users.total - b.stats.users.total;
    } else if (sortBy === 'activity') {
      comparison = new Date(a.stats.lastActivity).getTime() - new Date(b.stats.lastActivity).getTime();
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleSort = (field: 'name' | 'storage' | 'users' | 'activity') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // default to desc for metrics
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono text-zinc-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-500" />
            Firms & Tenancies
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Provision, manage, suspend, and monitor all firm environments on the platform.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto bg-red-600 hover:bg-red-700 text-white text-xs font-mono py-2 px-4 rounded transition-colors shadow-lg shadow-red-950/20"
        >
          <Plus className="w-4 h-4" />
          Create Firm Manually
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900/50 p-4 rounded text-xs font-mono text-red-400">
          {error}
        </div>
      )}

      {/* Filter HUD panel */}
      <div className="bg-zinc-950/50 border border-zinc-900 rounded p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search firms by name, slug, or billing email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded pl-10 pr-4 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-red-800"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Plan filter */}
          <div className="flex items-center space-x-2 bg-zinc-900/60 border border-zinc-800 rounded px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-transparent text-xs font-mono text-zinc-300 focus:outline-none"
            >
              <option value="all">All Plans</option>
              <option value="Standard">Standard</option>
              <option value="Professional">Professional</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center space-x-2 bg-zinc-900/60 border border-zinc-800 rounded px-2.5 py-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-mono text-zinc-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Header & Sort Controls */}
      <div className="flex items-center justify-between px-2 text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold">
        <div>Showing {sortedFirms.length} of {summaries.length} firms</div>
        <div className="flex gap-4">
          <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            Name
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSort('users')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            Users
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSort('storage')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            Storage
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => toggleSort('activity')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            Activity
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Registry Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          <span className="text-xs font-mono">Loading firm database summaries...</span>
        </div>
      ) : sortedFirms.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-lg py-16 text-center text-zinc-500 font-mono text-xs">
          No firms match the applied filters.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedFirms.map((item) => {
            const isSuspended = !item.company.isActive;
            const quotaMb = item.company.storageQuotaMb || 1024;
            const usedPercentage = Math.min(100, Math.round((item.stats.storageBytes / (quotaMb * 1024 * 1024)) * 100));

            return (
              <div
                key={item.company.id}
                className={`group relative bg-zinc-950 border transition-all duration-200 rounded-lg p-5 ${
                  isSuspended
                    ? 'border-red-900/30 bg-red-950/5 hover:border-red-900/55'
                    : 'border-zinc-900 hover:border-zinc-800 bg-zinc-950'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Firm Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-zinc-400 select-all">
                        #{item.company.id.slice(0, 8)}
                      </span>
                      <h2 className="text-sm font-bold text-zinc-100 truncate font-mono">
                        {item.company.name}
                      </h2>
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold border ${
                        item.company.planTier === 'Enterprise'
                          ? 'bg-purple-950/20 text-purple-400 border-purple-900/30'
                          : item.company.planTier === 'Professional'
                          ? 'bg-blue-950/20 text-blue-400 border-blue-900/30'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}>
                        {item.company.planTier || 'Standard'}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                        <Globe className="w-3 h-3 text-zinc-600" />
                        {item.company.country || 'US'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                      <span>Slug: <strong className="text-zinc-400 font-medium">{item.company.slug}</strong></span>
                      <span className="text-zinc-700">•</span>
                      <span>Created: <strong className="text-zinc-400 font-medium">{new Date(item.company.createdAt).toLocaleDateString()}</strong></span>
                    </div>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:w-2/5 shrink-0">
                    {/* User summary */}
                    <div className="space-y-1 font-mono">
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <Users className="w-3.5 h-3.5 text-zinc-600" />
                        USERS
                      </div>
                      <div className="text-xs font-bold text-zinc-300">
                        {item.stats.users.total} <span className="text-[10px] text-zinc-500 font-normal">({item.stats.users.active} active)</span>
                      </div>
                    </div>

                    {/* Case summary */}
                    <div className="space-y-1 font-mono">
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <FolderKanban className="w-3.5 h-3.5 text-zinc-600" />
                        CASES
                      </div>
                      <div className="text-xs font-bold text-zinc-300">
                        {item.stats.cases.total} <span className="text-[10px] text-zinc-500 font-normal">({item.stats.cases.active} active)</span>
                      </div>
                    </div>

                    {/* Storage Summary */}
                    <div className="space-y-1 font-mono col-span-2">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-zinc-600" />
                          STORAGE
                        </span>
                        <span>{usedPercentage}% of {quotaMb} MB</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usedPercentage > 85 ? 'bg-red-600' : usedPercentage > 50 ? 'bg-yellow-600' : 'bg-red-800'
                          }`}
                          style={{ width: `${usedPercentage}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-bold text-zinc-400 mt-1">
                        {formatBytes(item.stats.storageBytes)} used
                      </div>
                    </div>
                  </div>

                  {/* Status & Navigation */}
                  <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                    <div className="flex flex-col items-end mr-2">
                      {isSuspended ? (
                        <div className="flex items-center gap-1.5 text-red-500 font-mono text-xs font-bold bg-red-950/25 border border-red-900/35 px-2 py-0.5 rounded">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Suspended
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-500 font-mono text-xs font-bold bg-emerald-950/15 border border-emerald-900/25 px-2 py-0.5 rounded">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Active
                        </div>
                      )}
                      <span className="text-[9px] font-mono text-zinc-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        Act: {item.stats.lastActivity ? new Date(item.stats.lastActivity).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>

                    <Link
                      to={`/${SA_PATH}/firms/${item.company.id}`}
                      className="p-2 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 bg-zinc-900/30 hover:bg-zinc-900/90 rounded transition-colors"
                      title="Manage Firm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Firm Manually Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden shadow-2xl">
            <div className="border-b border-zinc-900 p-4 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-500" />
                CREATE FIRM MANUALLY
              </h3>
              <button onClick={resetCreateForm} className="text-zinc-500 hover:text-zinc-300">
                &times;
              </button>
            </div>

            {!modalSuccessData ? (
              <form onSubmit={handleCreateFirm} className="p-5 space-y-4 font-mono text-xs">
                {/* Firm Name */}
                <div className="space-y-1.5">
                  <label className="text-zinc-400 block">Firm / Company Name</label>
                  <input
                    type="text"
                    required
                    value={newFirmName}
                    onChange={(e) => setNewFirmName(e.target.value)}
                    placeholder="e.g. Apex Law Partners"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-red-800"
                  />
                </div>

                {/* Admin Full Name */}
                <div className="space-y-1.5">
                  <label className="text-zinc-400 block">Lead Administrator Full Name</label>
                  <input
                    type="text"
                    required
                    value={newAdminFullName}
                    onChange={(e) => setNewAdminFullName(e.target.value)}
                    placeholder="e.g. Marcus Vance Esq."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-red-800"
                  />
                </div>

                {/* Admin Email */}
                <div className="space-y-1.5">
                  <label className="text-zinc-400 block">Lead Administrator Email</label>
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="e.g. admin@apexpartners.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-red-800"
                  />
                </div>

                {/* Plan Tier & Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-zinc-400 block">Plan Tier</label>
                    <select
                      value={newPlanTier}
                      onChange={(e) => setNewPlanTier(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-red-800"
                    >
                      <option value="Standard">Standard (1GB)</option>
                      <option value="Professional">Professional (5GB)</option>
                      <option value="Enterprise">Enterprise (50GB)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-400 block">Country Code</label>
                    <input
                      type="text"
                      required
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      placeholder="e.g. US"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-red-800"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-900 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 px-4 py-2 rounded text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-[11px] font-bold flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Provision Practice Cluster
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 space-y-4 font-mono text-xs">
                <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded text-emerald-400 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Firm Provisioned Successfully!</h4>
                    <p className="text-[10px] text-emerald-500/80 mt-0.5">
                      The core practice group, settings module, and lead admin invitation have been initialized on standard containers.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-zinc-400 block">Copy Administrator Invite Link:</span>
                  <p className="text-[10px] text-zinc-500">
                    Send this link directly to the firm administrator. They will use this link to complete their custom onboarding wizard and start the system.
                  </p>

                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2.5 rounded">
                    <span className="text-[10px] text-zinc-300 break-all select-all flex-1 font-mono">
                      {modalSuccessData.inviteLink}
                    </span>
                    <button
                      onClick={copyInviteLink}
                      className="p-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 rounded transition-colors shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-900 flex justify-end">
                  <button
                    onClick={resetCreateForm}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded text-[11px]"
                  >
                    Done & Return
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
