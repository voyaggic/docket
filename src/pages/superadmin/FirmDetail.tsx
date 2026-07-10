import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Building2, Users, FolderKanban, FileText, ArrowLeft, RefreshCw, Database,
  ShieldCheck, ShieldAlert, KeyRound, Mail, Trash2, Plus, ToggleLeft, ToggleRight,
  Loader2, AlertTriangle, Copy, Check, MessageSquare, ClipboardList, Settings, Globe, Clock
} from 'lucide-react';

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
  isSuperAdmin: boolean;
}

interface FeatureFlag {
  id: string;
  featureName: string;
  isEnabled: boolean;
}

interface NoteItem {
  id: string;
  content: string;
  createdAt: string;
}

interface FirmDetailData {
  company: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    setupComplete: boolean;
    planTier?: string;
    country?: string;
    timezone?: string;
    billingEmail?: string;
    billingPhone?: string;
    suspensionMessage?: string;
    storageQuotaMb?: number;
    createdAt: string;
  };
  users: UserItem[];
  featureFlags: FeatureFlag[];
  notes: NoteItem[];
  stats: {
    casesCount: number;
    totalDocs: number;
    storageBytes: number;
  };
}

export const FirmDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<FirmDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active sub-panel state
  const [activeTab, setActiveTab] = useState<'overview' | 'quota' | 'team' | 'flags' | 'notes' | 'danger'>('overview');

  // Quota form state
  const [storageQuotaInput, setStorageQuotaInput] = useState<number>(1024);
  const [planTierInput, setPlanTierInput] = useState<string>('Standard');
  const [updatingQuota, setUpdatingQuota] = useState(false);

  // Private notes state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Suspension / Action State
  const [suspensionMsgInput, setSuspensionMsgInput] = useState('');
  const [suspensionModalOpen, setSuspensionModalOpen] = useState(false);
  const [actioningSuspension, setActioningSuspension] = useState(false);

  // Deletion state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingFirm, setDeletingFirm] = useState(false);

  // Action status states
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [generatedBypassLinks, setGeneratedBypassLinks] = useState<Record<string, string>>({});
  const [actionInProgressUserId, setActionInProgressUserId] = useState<string | null>(null);

  // @ts-ignore
  const SA_PATH = import.meta.env?.VITE_SUPERADMIN_PATH || 'system-access';

  const fetchFirmDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/sa/firms/${id}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Firm profile not found or platform state invalid.');
      }
      const json = await res.json();
      setData(json);

      // Prepopulate forms
      setStorageQuotaInput(json.company.storageQuotaMb || 1024);
      setPlanTierInput(json.company.planTier || 'Standard');
      setSuspensionMsgInput(json.company.suspensionMessage || '');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve firm details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirmDetail();
  }, [id]);

  const handleUpdateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || storageQuotaInput <= 0) return;

    try {
      setUpdatingQuota(true);
      const res = await fetch(`/api/sa/firms/${id}/quota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storageQuotaMb: storageQuotaInput,
          planTier: planTierInput
        })
      });

      if (!res.ok) throw new Error('Failed to update subscription profile.');
      await fetchFirmDetail();
      alert('Subscription quota updated successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingQuota(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNoteContent.trim()) return;

    try {
      setAddingNote(true);
      const res = await fetch(`/api/sa/firms/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent })
      });

      if (!res.ok) throw new Error('Failed to record administrative note.');
      setNewNoteContent('');
      await fetchFirmDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!id || !window.confirm('Are you sure you want to delete this administrative note?')) return;

    try {
      const res = await fetch(`/api/sa/firms/${id}/notes/${noteId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete note.');
      await fetchFirmDetail();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleFlag = async (featureName: string, isEnabled: boolean) => {
    if (!id) return;

    try {
      const res = await fetch('/api/superadmin/companies/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: id,
          featureName,
          isEnabled
        })
      });
      if (!res.ok) throw new Error('Failed to toggle feature flag.');
      await fetchFirmDetail();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleForceLogout = async (userId: string) => {
    if (!window.confirm('Are you sure you want to terminate this user\'s session? They will be logged out immediately.')) return;

    try {
      setActionInProgressUserId(userId);
      const res = await fetch(`/api/sa/users/${userId}/force-logout`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to terminate user sessions.');
      alert('User session terminated. Client was logged out.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionInProgressUserId(null);
    }
  };

  const handleGenerateBypassLink = async (userId: string) => {
    try {
      setActionInProgressUserId(userId);
      const res = await fetch(`/api/sa/users/${userId}/reset-password`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate secure bypass login link.');
      const resJson = await res.json();
      setGeneratedBypassLinks(prev => ({ ...prev, [userId]: resJson.resetLink }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionInProgressUserId(null);
    }
  };

  const handleToggleSuspension = async () => {
    if (!id || !data) return;
    const isCurrentlyActive = data.company.isActive;

    try {
      setActioningSuspension(true);
      const endpoint = isCurrentlyActive ? 'suspend' : 'activate';
      const res = await fetch(`/api/sa/firms/${id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionMessage: suspensionMsgInput })
      });

      if (!res.ok) throw new Error('Failed to update platform tenancy status.');
      setSuspensionModalOpen(false);
      await fetchFirmDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActioningSuspension(false);
    }
  };

  const handleDeleteFirmPermanently = async () => {
    if (!id || !data || deleteConfirmText !== data.company.name) return;

    try {
      setDeletingFirm(true);
      const res = await fetch('/api/superadmin/companies/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: id,
          action: 'delete'
        })
      });

      if (!res.ok) throw new Error('Failed to delete practice environment.');
      setDeleteModalOpen(false);
      navigate(`/${SA_PATH}/firms`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingFirm(false);
    }
  };

  const copyBypassLink = (userId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedTextId(userId);
    setTimeout(() => setCopiedTextId(null), 2000);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="text-xs font-mono">Retrieving secure firm container data...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to={`/${SA_PATH}/firms`} className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to firms
        </Link>
        <div className="bg-red-950/30 border border-red-900/50 p-6 rounded-lg text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-sm font-bold font-mono text-zinc-200">Error Accessing Practice Profile</h3>
          <p className="text-xs font-mono text-red-400">{error || 'Unknown container communication failure.'}</p>
        </div>
      </div>
    );
  }

  const isSuspended = !data.company.isActive;
  const quotaMb = data.company.storageQuotaMb || 1024;
  const storagePercentage = Math.min(100, Math.round((data.stats.storageBytes / (quotaMb * 1024 * 1024)) * 100));

  return (
    <div className="space-y-6">
      {/* Upper Navigation Anchor */}
      <div className="flex items-center justify-between">
        <Link
          to={`/${SA_PATH}/firms`}
          className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Firm Registry
        </Link>

        <button
          onClick={fetchFirmDetail}
          className="p-1.5 border border-zinc-900 rounded bg-zinc-950/40 text-zinc-400 hover:text-zinc-100 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Profile Overview Header Card */}
      <div className={`bg-zinc-950 border rounded-lg p-6 ${isSuspended ? 'border-red-900/30 bg-red-950/5' : 'border-zinc-900'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Building2 className="w-5 h-5 text-zinc-400" />
              <h1 className="text-lg font-bold text-zinc-100 font-mono truncate">{data.company.name}</h1>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold border ${
                data.company.planTier === 'Enterprise'
                  ? 'bg-purple-950/20 text-purple-400 border-purple-900/30'
                  : data.company.planTier === 'Professional'
                  ? 'bg-blue-950/20 text-blue-400 border-blue-900/30'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}>
                {data.company.planTier || 'Standard'}
              </span>

              {isSuspended ? (
                <span className="flex items-center gap-1 text-[10px] uppercase font-mono font-bold text-red-500 border border-red-900/40 bg-red-950/30 px-2 py-0.5 rounded">
                  <ShieldAlert className="w-3 h-3" />
                  SUSPENDED
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] uppercase font-mono font-bold text-emerald-500 border border-emerald-900/40 bg-emerald-950/20 px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" />
                  ACTIVE
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 flex-wrap">
              <span>Firm ID: <strong className="text-zinc-400 font-medium select-all">{data.company.id}</strong></span>
              <span className="text-zinc-700">•</span>
              <span>Slug: <strong className="text-zinc-400 font-medium">{data.company.slug}</strong></span>
              <span className="text-zinc-700">•</span>
              <span>Created: <strong className="text-zinc-400 font-medium">{new Date(data.company.createdAt).toLocaleDateString()}</strong></span>
            </div>
          </div>

          <div className="flex gap-4 border-t md:border-t-0 border-zinc-900 pt-4 md:pt-0">
            <div className="space-y-0.5 font-mono text-right">
              <span className="text-[10px] text-zinc-500 block uppercase">Users</span>
              <span className="text-sm font-bold text-zinc-300">{data.users.length}</span>
            </div>
            <div className="border-r border-zinc-900 my-1" />
            <div className="space-y-0.5 font-mono text-right">
              <span className="text-[10px] text-zinc-500 block uppercase">Cases</span>
              <span className="text-sm font-bold text-zinc-300">{data.stats.casesCount}</span>
            </div>
            <div className="border-r border-zinc-900 my-1" />
            <div className="space-y-0.5 font-mono text-right">
              <span className="text-[10px] text-zinc-500 block uppercase">Storage</span>
              <span className="text-sm font-bold text-zinc-300">{formatBytes(data.stats.storageBytes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subpanels Tab Navigation */}
      <div className="flex border-b border-zinc-900 overflow-x-auto no-scrollbar font-mono text-xs font-bold gap-1">
        {(['overview', 'quota', 'team', 'flags', 'notes', 'danger'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 transition-all shrink-0 capitalize ${
              activeTab === tab
                ? 'border-red-600 text-red-400 bg-red-950/5'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dynamic Tab Body Render */}
      <div className="space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Practice Details Card */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
              <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <ClipboardList className="w-4 h-4 text-zinc-500" />
                Practice Identity
              </h3>

              <div className="grid grid-cols-2 gap-y-4 gap-x-2 font-mono text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] block">COUNTRY</span>
                  <span className="text-zinc-300 flex items-center gap-1 mt-0.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-600" />
                    {data.company.country || 'US'}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 text-[10px] block">TIMEZONE</span>
                  <span className="text-zinc-300 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                    {data.company.timezone || 'America/New_York'}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 text-[10px] block">BILLING EMAIL</span>
                  <span className="text-zinc-300 mt-0.5 select-all truncate block">
                    {data.company.billingEmail || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 text-[10px] block">BILLING PHONE</span>
                  <span className="text-zinc-300 mt-0.5 select-all block">
                    {data.company.billingPhone || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 text-[10px] block">SETUP COMPLETE</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-1.5 ${
                    data.company.setupComplete ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {data.company.setupComplete ? 'Complete' : 'Pending Wizard'}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 text-[10px] block">TENANCY STATUS</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-1.5 ${
                    !isSuspended ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {isSuspended ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {isSuspended ? 'Suspended' : 'Unrestricted'}
                  </span>
                </div>
              </div>
            </div>

            {/* Platform Metrics Summary */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
              <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <Database className="w-4 h-4 text-zinc-500" />
                Resource Metrics
              </h3>

              <div className="space-y-4">
                {/* Storage usage */}
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Storage Used</span>
                    <span className="text-zinc-300 font-bold">{formatBytes(data.stats.storageBytes)} / {quotaMb} MB</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        storagePercentage > 85 ? 'bg-red-600' : storagePercentage > 50 ? 'bg-yellow-600' : 'bg-red-800'
                      }`}
                      style={{ width: `${storagePercentage}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 font-mono text-xs pt-2">
                  <div className="bg-zinc-900/40 p-3 border border-zinc-900 rounded">
                    <span className="text-[10px] text-zinc-500 block uppercase">Cases Count</span>
                    <span className="text-sm font-bold text-zinc-300 mt-0.5 block">{data.stats.casesCount}</span>
                  </div>

                  <div className="bg-zinc-900/40 p-3 border border-zinc-900 rounded">
                    <span className="text-[10px] text-zinc-500 block uppercase">Documents Count</span>
                    <span className="text-sm font-bold text-zinc-300 mt-0.5 block">{data.stats.totalDocs}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUOTA & PLANS */}
        {activeTab === 'quota' && (
          <div className="max-w-xl bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-5">
            <div>
              <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <Settings className="w-4 h-4 text-zinc-500" />
                Quota & Subscription Settings
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-1.5">
                Upgrading subscription profiles and allocating disk limits triggers automated resource resizing.
              </p>
            </div>

            <form onSubmit={handleUpdateQuota} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-zinc-400 block">Subscription Tier</label>
                <select
                  value={planTierInput}
                  onChange={(e) => setPlanTierInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-red-800"
                >
                  <option value="Standard">Standard (Basic Suite)</option>
                  <option value="Professional">Professional (Team Core)</option>
                  <option value="Enterprise">Enterprise (Premium Cloud)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 block">Storage Quota (Megabytes)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={storageQuotaInput}
                    onChange={(e) => setStorageQuotaInput(parseInt(e.target.value, 10))}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-red-800"
                  />
                  <span className="text-zinc-500 shrink-0">MB</span>
                </div>
                <p className="text-[10px] text-zinc-600">
                  Equivalent to {(storageQuotaInput / 1024).toFixed(2)} GB limit.
                </p>
              </div>

              <button
                type="submit"
                disabled={updatingQuota}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-1.5"
              >
                {updatingQuota && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Apply Configuration Change
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: TEAM & ACCESS */}
        {activeTab === 'team' && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <Users className="w-4 h-4 text-zinc-500" />
                Authorized Workspace Team
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-1.5">
                Revoke credentials, force session logouts, or provision direct bypass links to support administrators.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500">
                    <th className="py-2.5 px-3">Full Name / Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Platform State</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {data.users.map((user) => {
                    const isPrimaryAdmin = user.role === 'ADMIN' || user.isSuperAdmin;
                    const bypassLink = generatedBypassLinks[user.id];

                    return (
                      <tr key={user.id} className="hover:bg-zinc-900/20">
                        <td className="py-3 px-3">
                          <div className="font-bold text-zinc-200">{user.fullName}</div>
                          <div className="text-[10px] text-zinc-500 select-all">{user.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold border ${
                            user.isSuperAdmin
                              ? 'bg-red-950/20 text-red-400 border-red-900/30'
                              : user.role === 'ADMIN'
                              ? 'bg-amber-950/20 text-amber-400 border-amber-900/30'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}>
                            {user.isSuperAdmin ? 'Superadmin' : user.role}
                          </span>
                          {isPrimaryAdmin && (
                            <span className="text-[9px] text-amber-500 font-bold ml-2">★ Admin</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {user.isActive ? (
                            <span className="text-emerald-500 font-bold">● Active</span>
                          ) : (
                            <span className="text-zinc-600">○ Inactive</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-y-2">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button
                              onClick={() => handleForceLogout(user.id)}
                              disabled={actionInProgressUserId === user.id}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 rounded text-[10px] flex items-center gap-1 transition-all"
                            >
                              <KeyRound className="w-3 h-3 text-red-500" />
                              Force Logout
                            </button>

                            <button
                              onClick={() => handleGenerateBypassLink(user.id)}
                              disabled={actionInProgressUserId === user.id}
                              className="px-2.5 py-1 bg-red-950/35 hover:bg-red-950/70 border border-red-900/35 hover:border-red-900/55 text-red-400 hover:text-red-200 rounded text-[10px] flex items-center gap-1 transition-all"
                            >
                              <Mail className="w-3 h-3 text-red-400" />
                              Generate Login Link
                            </button>
                          </div>

                          {bypassLink && (
                            <div className="mt-2 flex items-center gap-1.5 justify-end">
                              <span className="text-[9px] text-zinc-500 truncate max-w-xs break-all select-all font-mono bg-zinc-950 border border-zinc-900 p-1 rounded">
                                {bypassLink}
                              </span>
                              <button
                                onClick={() => copyBypassLink(user.id, bypassLink)}
                                className="p-1 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 rounded transition-colors bg-zinc-900"
                              >
                                {copiedTextId === user.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: INTEGRATIONS & FLAGS */}
        {activeTab === 'flags' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature flag list */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <Plus className="w-4 h-4 text-zinc-500" />
                  Firm Feature Flags
                </h3>
                <p className="text-[11px] text-zinc-500 font-mono mt-1.5">
                  Activate custom modules, advanced API access, or beta capabilities for this tenancy.
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-3 font-mono text-xs">
                {['whatsapp', 'custom_domains', 'ai_assistant', 'sms_billing', 'advanced_calendaring'].map((feature) => {
                  const flag = data.featureFlags.find((f) => f.featureName === feature);
                  const isEnabled = flag ? flag.isEnabled : false;

                  return (
                    <div key={feature} className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-zinc-900 rounded hover:bg-zinc-900/65 transition-colors">
                      <div>
                        <span className="font-bold text-zinc-300 block capitalize">{feature.replace('_', ' ')}</span>
                        <span className="text-[10px] text-zinc-500">Flags are evaluated at practice module routes.</span>
                      </div>
                      <button
                        onClick={() => handleToggleFlag(feature, !isEnabled)}
                        className="text-zinc-400 hover:text-zinc-100"
                      >
                        {isEnabled ? (
                          <ToggleRight className="w-8 h-8 text-red-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-zinc-700" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Integration Status Troubleshooter */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <MessageSquare className="w-4 h-4 text-zinc-500" />
                  Integration Diagnosis
                </h3>
                <p className="text-[11px] text-zinc-500 font-mono mt-1.5">
                  Status breakdown of third-party interfaces to assist with administrator troubleshooting.
                </p>
              </div>

              <div className="space-y-3.5 font-mono text-xs">
                <div className="flex items-start gap-2.5 p-2 bg-zinc-900/20 border border-zinc-900 rounded">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    data.featureFlags.some(f => f.featureName === 'whatsapp' && f.isEnabled) ? 'bg-emerald-500' : 'bg-zinc-600'
                  }`} />
                  <div>
                    <span className="font-bold text-zinc-300 block">WhatsApp Cloud Gateway</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {data.featureFlags.some(f => f.featureName === 'whatsapp' && f.isEnabled)
                        ? 'Gateway connected. Webhook logs healthy.'
                        : 'Module disabled. Click flag to authorize traffic.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 bg-zinc-900/20 border border-zinc-900 rounded">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    data.featureFlags.some(f => f.featureName === 'custom_domains' && f.isEnabled) ? 'bg-emerald-500' : 'bg-zinc-600'
                  }`} />
                  <div>
                    <span className="font-bold text-zinc-300 block">DNS & Custom Domain Verification</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {data.featureFlags.some(f => f.featureName === 'custom_domains' && f.isEnabled)
                        ? 'Edge cluster CNAME verified.'
                        : 'Custom branding disabled. Default docket domain only.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 bg-zinc-900/20 border border-zinc-900 rounded">
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-emerald-500" />
                  <div>
                    <span className="font-bold text-zinc-300 block">SMTP Relays & Transactional Email</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Relay active. Mail deliveries routed through platform pools.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PRIVATE NOTES */}
        {activeTab === 'notes' && (
          <div className="max-w-2xl bg-zinc-950 border border-zinc-900 rounded-lg p-5 space-y-6">
            <div>
              <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <ClipboardList className="w-4 h-4 text-zinc-500" />
                Administrative Private Scratchpad
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-1.5">
                Keep secure private logs regarding escalated tickets, audit logs, or custom billing agreements. These notes are completely hidden from all firm users.
              </p>
            </div>

            {/* Note list */}
            {data.notes.length === 0 ? (
              <div className="border border-dashed border-zinc-800 rounded py-8 text-center text-zinc-500 text-xs font-mono">
                No administrative notes recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {data.notes.map((note) => (
                  <div key={note.id} className="bg-zinc-900/30 border border-zinc-900 rounded p-4 space-y-2 relative group font-mono text-xs">
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="absolute top-4 right-4 p-1 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                      <span>Superadmin Log Entry</span>
                      <span>•</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-zinc-300 whitespace-pre-wrap pr-6 leading-relaxed select-text">{note.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Note form */}
            <form onSubmit={handleAddNote} className="space-y-3 font-mono text-xs pt-4 border-t border-zinc-900">
              <label className="text-zinc-400 block font-bold">Write New Note:</label>
              <textarea
                required
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write firm background info, billing updates, escalation details..."
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-red-800"
              />
              <button
                type="submit"
                disabled={addingNote}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-1.5"
              >
                {addingNote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Commit Note to File
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: DANGER ZONE */}
        {activeTab === 'danger' && (
          <div className="bg-zinc-950 border border-red-950/40 rounded-lg p-5 space-y-6">
            <div>
              <h3 className="text-xs font-bold font-mono text-red-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                DANGER ZONE
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono mt-1.5">
                Destructive and platform-wide practices should be exercised with ultimate care.
              </p>
            </div>

            <div className="divide-y divide-zinc-900 space-y-6">
              {/* Suspension Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="space-y-1 font-mono text-xs">
                  <span className="font-bold text-zinc-200 block">
                    {isSuspended ? 'Lift Tenancy Suspension' : 'Suspend Practice Tenancy'}
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    {isSuspended
                      ? 'Activating the tenancy restores immediate server cluster and API operations for all users.'
                      : 'Suspension blocks client access. Users will see a secure administrative suspension card instead of log in.'}
                  </p>
                </div>

                <button
                  onClick={() => setSuspensionModalOpen(true)}
                  className={`py-2 px-4 rounded font-mono text-xs font-bold transition-colors ${
                    isSuspended
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-950 hover:bg-red-900 border border-red-800/40 text-red-400'
                  }`}
                >
                  {isSuspended ? 'Activate Tenancy' : 'Suspend Tenancy'}
                </button>
              </div>

              {/* Permanently delete firm */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
                <div className="space-y-1 font-mono text-xs">
                  <span className="font-bold text-red-500 block">Permanently Delete Tenancy</span>
                  <p className="text-[11px] text-zinc-500">
                    Purges database files, generated documents, practice logs, and all user sessions permanently. This action is absolutely irreversible.
                  </p>
                </div>

                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold rounded transition-colors"
                >
                  Delete Practice Tenancy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUSPENSION MODAL */}
      {suspensionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden shadow-2xl">
            <div className="border-b border-zinc-900 p-4 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                {isSuspended ? 'REACTIVATE TENANCY' : 'SUSPEND PRACTICING TENANCY'}
              </h3>
              <button onClick={() => setSuspensionModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 font-mono text-xs">
              {!isSuspended ? (
                <>
                  <p className="text-zinc-400">
                    Enter the custom message that will be shown on-screen to users trying to login or interact with the practice system.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-zinc-400 block font-bold">Suspension Message:</label>
                    <textarea
                      required
                      value={suspensionMsgInput}
                      onChange={(e) => setSuspensionMsgInput(e.target.value)}
                      placeholder="e.g. Your firm's account has been suspended due to overdue billing. Please contact billing@docket.com to resolve."
                      rows={4}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-red-800"
                    />
                  </div>
                </>
              ) : (
                <p className="text-zinc-400">
                  Are you sure you want to lift the suspension for <strong className="text-zinc-200">{data.company.name}</strong>? All practitioners will regain immediate system entry.
                </p>
              )}

              <div className="pt-2 border-t border-zinc-900 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSuspensionModalOpen(false)}
                  className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 px-4 py-2 rounded text-[11px]"
                >
                  Close
                </button>
                <button
                  onClick={handleToggleSuspension}
                  disabled={actioningSuspension}
                  className={`px-4 py-2 rounded text-[11px] font-bold flex items-center gap-1.5 ${
                    isSuspended
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {actioningSuspension && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSuspended ? 'Lift Suspension' : 'Enforce Suspension'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETION MODAL */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden shadow-2xl">
            <div className="border-b border-red-950/40 p-4 flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                PERMANENT DELETION OF TENANCY
              </h3>
              <button onClick={() => setDeleteModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 font-mono text-xs">
              <div className="bg-red-950/25 border border-red-900/40 p-3 rounded text-red-400 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-bold uppercase">Critical Purge Warning</h4>
                  <p className="text-[10px] text-red-400/85 mt-0.5">
                    This is absolutely irreversible. It will wipe all document indices, client updates, case logs, and rosters under the tenancy of <strong className="text-zinc-100">{data.company.name}</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-zinc-400 block font-bold">
                  Type the exact firm name <span className="text-zinc-200 font-extrabold">"{data.company.name}"</span> to authorize:
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type firm name here..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 focus:outline-none focus:border-red-800"
                />
              </div>

              <div className="pt-2 border-t border-zinc-900 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 px-4 py-2 rounded text-[11px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteFirmPermanently}
                  disabled={deletingFirm || deleteConfirmText !== data.company.name}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-transparent text-white px-4 py-2 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                >
                  {deletingFirm && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Purge Environment Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
