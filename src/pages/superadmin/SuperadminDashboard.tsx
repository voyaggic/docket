import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, Users, FolderKanban, FileClock, 
  Activity, ShieldAlert, CheckCircle, XCircle, 
  Slash, RefreshCw, Send, Settings, Trash2, Megaphone, ToggleLeft, ToggleRight,
  AlertTriangle, CheckCircle2, Mail, Copy, Check, ClipboardList, ExternalLink
} from 'lucide-react';

interface FeatureFlag {
  id: string;
  companyId: string;
  featureName: string;
  isEnabled: boolean;
  updatedAt: string;
}

interface CompanySummary {
  company: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    setupComplete: boolean;
  };
  adminEmail: string;
  userCount: number;
  caseCount: number;
  updateCount: number;
  documentCount: number;
  featureFlags: FeatureFlag[];
}

interface PlatformStatus {
  locked: boolean;
  activeFirms: number;
  totalFirms: number;
  activeSessions: number;
}

interface RegistrationRequest {
  id: string;
  firmName: string;
  registrantName: string;
  email: string;
  country: string;
  firmSize: string;
  referralSource?: string;
  riskScore: 'low' | 'medium' | 'high';
  status: 'pending' | 'needs_review' | 'approved' | 'rejected';
  createdAt: string;
  companyId?: string;
}

export const SuperadminDashboard: React.FC = () => {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [errorWord, setErrorWord] = useState<string | null>(null);

  // Active expanded company ID for Feature Flags settings view
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Registration states
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [simulatedEmails, setSimulatedEmails] = useState<Array<{ email: string; link: string; id: string }>>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Announcement Builder State
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annTargetId, setAnnTargetId] = useState<string>('all'); // 'all' or specific companyId
  const [annBgColor, setAnnBgColor] = useState('#fee2e2'); // Tailwind bg-red-100 default
  const [annTextColor, setAnnTextColor] = useState('#991b1b'); // Tailwind text-red-800 default
  const [annPosition, setAnnPosition] = useState<'top' | 'bottom'>('top');
  const [annStatus, setAnnStatus] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorWord(null);

      // Fetch companies
      const compRes = await fetch('/api/superadmin/companies', { credentials: 'include' });
      if (!compRes.ok) {
        throw new Error("Credentials invalid or expired.");
      }
      const compData = await compRes.json();
      setCompanies(compData);

      // Fetch platform status
      const statusRes = await fetch('/api/sa/platform-status', { credentials: 'include' });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }

      // Fetch registration requests
      setRegistrationsLoading(true);
      const regRes = await fetch('/api/superadmin/registrations', { credentials: 'include' });
      if (regRes.ok) {
        const regData = await regRes.json();
        setRegistrations(regData);
      }
    } catch (err: any) {
      console.error(err);
      setErrorWord(err.message || "Failed to load firm registry.");
    } finally {
      setLoading(false);
      setRegistrationsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApproveRegistration = async (id: string, email: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/superadmin/registrations/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          const generatedLink = `${window.location.origin}/invite/${data.token}`;
          setSimulatedEmails(prev => [{ email, link: generatedLink, id }, ...prev]);
        }
        await fetchDashboardData();
        // Notify other windows/components
        window.dispatchEvent(new CustomEvent('registration-approved', { detail: { id } }));
      } else {
        alert("Action failed. Please query standard system logs.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectRegistration = async (id: string) => {
    if (!window.confirm("Are you sure you want to REJECT this practice registration?")) return;
    setActioningId(id);
    try {
      const res = await fetch(`/api/superadmin/registrations/${id}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2050);
  };

  const handleCompanyAction = async (companyId: string, action: 'suspend' | 'activate' | 'delete') => {
    if (action === 'delete' && !window.confirm("Verify: Complete deletion of all firm tenant tables, cases, and credentials? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch('/api/superadmin/companies/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, action }),
      });

      if (res.ok) {
        await fetchDashboardData();
      } else {
        alert("Operation denied by secure core.");
      }
    } catch (err) {
      console.error(err);
      alert("Terminal lost packet structure.");
    }
  };

  const handleToggleFlag = async (companyId: string, featureName: string, currentVal: boolean) => {
    try {
      const res = await fetch('/api/superadmin/companies/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, featureName, isEnabled: !currentVal }),
      });

      if (res.ok) {
        // Optimistic local state update for fast response
        setCompanies((prev) =>
          prev.map((c) => {
            if (c.company.id !== companyId) return c;
            const updatedFlags = c.featureFlags.map((f) =>
              f.featureName === featureName ? { ...f, isEnabled: !currentVal, updatedAt: new Date().toISOString() } : f
            );
            return { ...c, featureFlags: updatedFlags };
          })
        );
      } else {
        alert("Flag alteration blocked.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBroadCastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;

    setAnnStatus("Transmitting payload...");
    try {
      const res = await fetch('/api/superadmin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: annTitle,
          body: annBody,
          companyId: annTargetId === 'all' ? null : annTargetId,
          // We can also pass position, colors etc. if supported. The db announcement table supports title, body, companyId, isActive.
          // Wait! To ensure full alignment with custom Announcement Banner Requirements (Feature 10):
          // "announcement builder allows creating global banners... with custom bg, text, body, position"
          // In server.ts line 1795 onwards we saw:
          // db.updateSettings(companyId, { firmAnnouncement: { ... } })
          // If we want a banner on a specific firm, we can trigger db.updateSettings on backend,
          // but the endpoint `/api/superadmin/announcements` creates a general CompanyAnnouncement: { title, body, companyId, isActive }.
          // Let's transmit both properties in req.body.
          backgroundColor: annBgColor,
          textColor: annTextColor,
          position: annPosition,
        }),
      });

      if (res.ok) {
        setAnnStatus("Broadcast active and signed.");
        setAnnTitle('');
        setAnnBody('');
        setTimeout(() => setAnnStatus(null), 3000);
      } else {
        setAnnStatus("Transmission blocked.");
      }
    } catch (err) {
      console.error(err);
      setAnnStatus("Transmission failed.");
    }
  };

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 font-mono text-zinc-500 text-xs">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" /> READING TENANT MAP FROM CORE...
      </div>
    );
  }

  if (errorWord) {
    return (
      <div className="border border-red-950 bg-red-950/10 p-6 rounded font-mono text-xs text-red-400 max-w-xl mx-auto mt-10">
        <ShieldAlert className="h-8 w-8 text-red-500 mb-3" />
        <div className="font-bold uppercase mb-2">SYSTEM HANDSHAKE DENIED</div>
        <p className="mb-4">{errorWord}</p>
        <button 
          onClick={fetchDashboardData}
          className="bg-red-950 text-red-300 font-bold px-4 py-2 rounded hover:bg-red-900 border border-red-500/20 cursor-pointer"
        >
          RETRY CONFLICT LOG
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      
      {/* Bento Grid Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-[#0b0b10] border border-zinc-900 p-5 rounded relative overflow-hidden">
          <div className="absolute top-2 right-2 text-zinc-800"><Building className="h-10 w-10 shrink-0" /></div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">TOTAL TENANTS</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100 mt-2">{status?.totalFirms ?? companies.length}</div>
          <div className="font-mono text-[9px] text-zinc-600 mt-1">REGISTERED FIRMS</div>
        </div>

        <div className="bg-[#0b0b10] border border-zinc-900 p-5 rounded relative overflow-hidden">
          <div className="absolute top-2 right-2 text-emerald-950"><CheckCircle className="h-10 w-10 shrink-0" /></div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">ACTIVE FIRMS</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400 mt-2">
            {companies.filter(c => c.company.isActive).length}
          </div>
          <div className="font-mono text-[9px] text-zinc-600 mt-1">ONLINE INGRESS GATEWAYS</div>
        </div>

        <div className="bg-[#0b0b10] border border-zinc-900 p-5 rounded relative overflow-hidden">
          <div className="absolute top-2 right-2 text-red-950"><XCircle className="h-10 w-10 shrink-0" /></div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">SUSPENDED FIRMS</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-red-400 mt-2">
            {companies.filter(c => !c.company.isActive).length}
          </div>
          <div className="font-mono text-[9px] text-zinc-600 mt-1">OFFLINE FIREWALL BLENDS</div>
        </div>

        <div className="bg-[#0b0b10] border border-zinc-900 p-5 rounded relative overflow-hidden">
          <div className="absolute top-2 right-2 text-zinc-800"><ClipboardList className="h-10 w-10 shrink-0 text-red-950" /></div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">PENDING REGISTRATIONS</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-red-500 mt-2">
            {registrations.filter(r => r.status === 'needs_review' || r.status === 'pending').length}
          </div>
          <div className="font-mono text-[9px] text-zinc-600 mt-1">REVIEWS OUTSTANDING</div>
        </div>

      </section>

      {/* Dynamic Simulated Email Invite Links Panel */}
      {simulatedEmails.length > 0 && (
        <div className="bg-red-950/20 border-2 border-dashed border-red-500/30 rounded-xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
              🚀 NEW TENANT COMPLIANCE LINK ACQUIRED (LOCAL SIMULATION)
            </span>
            <button 
              onClick={() => setSimulatedEmails([])} 
              className="text-[9.5px] uppercase font-bold text-zinc-500 hover:text-white"
            >
              Clear Link Cache
            </button>
          </div>
          <div className="space-y-2">
            {simulatedEmails.map((item, idx) => (
              <div key={idx} className="bg-zinc-950 p-4.5 rounded border border-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-zinc-500 text-[10px]">Invited Target: <strong className="text-zinc-300 font-mono">{item.email}</strong></p>
                  <p className="text-zinc-400 font-bold break-all select-all">{item.link}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <button
                    onClick={() => copyToClipboard(item.link, item.id)}
                    className="p-2 bg-red-950 hover:bg-red-900 border border-red-500/20 text-red-400 hover:text-red-300 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === item.id ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
                    {copiedId === item.id ? 'Copied!' : 'Copy invite link'}
                  </button>
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-2 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded text-xs flex items-center gap-1"
                  >
                    Onboard Gateway <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Dashboard Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Firm Engine List */}
        <section className="lg:col-span-2 space-y-8">

          {/* Prompt Review Queue Segment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4.5 w-4.5 text-red-500" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Pending Verification Reviews ({registrations.filter(r => r.status === 'needs_review' || r.status === 'pending').length})
                </h3>
              </div>
              <Link 
                to="/system-access/registrations"
                className="text-[10px] uppercase font-mono tracking-wider font-bold text-red-500 hover:text-red-400 hover:underline"
              >
                View Full Queue &bull; History &rarr;
              </Link>
            </div>

            <div className="bg-[#0b0b10] border border-zinc-900 rounded overflow-hidden shadow-2xl divide-y divide-zinc-900/40">
              {registrationsLoading ? (
                <div className="p-8 text-center text-zinc-650 font-mono text-[11px] animate-pulse">
                  Querying outstanding law practice compliance applications...
                </div>
              ) : registrations.filter(r => r.status === 'needs_review' || r.status === 'pending').length === 0 ? (
                <div className="p-8 text-center text-zinc-600 font-mono text-[10.5px] space-y-1 italic">
                  <p>All outstanding registrations have been successfully processed.</p>
                  <p className="text-zinc-700 not-italic">No legal practices are current waiting for system invites.</p>
                </div>
              ) : (
                registrations.filter(r => r.status === 'needs_review' || r.status === 'pending').map((req) => (
                  <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/20 hover:bg-zinc-950/50 transition duration-150">
                    <div className="space-y-1.5 flex-1 min-w-0 font-mono">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-200 font-bold text-xs">{req.firmName}</span>
                        {req.riskScore === 'high' && (
                          <span className="text-[8.5px] uppercase font-bold px-2 py-0.5 bg-red-950/80 border border-red-900/60 text-red-400 rounded-full flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> High Risk
                          </span>
                        )}
                        {req.riskScore === 'medium' && (
                          <span className="text-[8.5px] uppercase font-bold px-2 py-0.5 bg-amber-950/80 border border-amber-900/60 text-amber-400 rounded-full flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> Normal Verification
                          </span>
                        )}
                        {req.riskScore === 'low' && (
                          <span className="text-[8.5px] uppercase font-bold px-2 py-0.5 bg-emerald-950/50 border border-emerald-900/40 text-emerald-400 rounded-full">
                            Low Risk Match
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[10.5px] text-zinc-500">
                        <div>Registrant: <strong className="text-zinc-400">{req.registrantName}</strong></div>
                        <div>Email: <strong className="text-zinc-400 select-all">{req.email}</strong></div>
                        <div className="sm:col-span-2 text-[9px] text-zinc-600 mt-1">
                          Applied Juris: {req.country} • Partners: {req.firmSize} • Date: {new Date(req.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        disabled={actioningId !== null}
                        onClick={() => handleApproveRegistration(req.id, req.email)}
                        className="px-3 py-2 bg-emerald-950 hover:bg-emerald-900 disabled:opacity-50 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded text-[10.5px] font-bold uppercase transition block cursor-pointer flex items-center gap-1"
                      >
                        {actioningId === req.id ? <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" /> : <CheckCircle2 className="h-3 w-3" />}
                        Approve & Get Link
                      </button>
                      <button
                        disabled={actioningId !== null}
                        onClick={() => handleRejectRegistration(req.id)}
                        className="px-2.5 py-2 bg-zinc-950 hover:bg-red-950/40 disabled:opacity-50 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-950/40 rounded text-[10.5px] transition block cursor-pointer"
                        title="Decline firm request"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">Firm Registry Engine</h3>
              <button 
                onClick={fetchDashboardData}
                className="p-1 px-2.5 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> REFRESH MAP
              </button>
            </div>

            <div className="bg-[#0b0b10] border border-zinc-900 rounded overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-[11px] text-zinc-400">
                <thead>
                  <tr className="bg-zinc-950/40 border-b border-zinc-900 text-zinc-500 text-[10px] uppercase">
                    <th className="p-4 py-3 font-semibold">Tenant Info</th>
                    <th className="p-4 py-3 font-semibold text-center">Payload Count</th>
                    <th className="p-4 py-3 font-semibold">Gateway Status</th>
                    <th className="p-4 py-3 font-semibold text-right">Engineering Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/50">
                  {companies.map((row) => (
                    <React.Fragment key={row.company.id}>
                      <tr className="hover:bg-zinc-900/20 transition-colors">
                        <td className="p-4">
                          <div className="text-zinc-200 font-bold">{row.company.name}</div>
                          <div className="text-[10px] text-zinc-500">{row.adminEmail}</div>
                          <div className="text-[9px] text-zinc-600 mt-0.5">ID: {row.company.id} • Slug: {row.company.slug}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-zinc-500 text-left max-w-[120px] mx-auto">
                            <div>Users: <span className="text-zinc-300 font-bold">{row.userCount}</span></div>
                            <div>Cases: <span className="text-zinc-300 font-bold">{row.caseCount}</span></div>
                            <div>Feeds: <span className="text-zinc-300 font-bold">{row.updateCount}</span></div>
                            <div>Docs: <span className="text-zinc-300 font-bold">{row.documentCount}</span></div>
                          </div>
                        </td>
                        <td className="p-4">
                          {row.company.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 font-semibold text-[9px] uppercase">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Ingress
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/50 border border-red-500/20 text-red-400 font-semibold text-[9px] uppercase">
                              🔒 Suspended
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2.5">
                          <button
                            onClick={() => setExpandedId(expandedId === row.company.id ? null : row.company.id)}
                            className={`p-1.5 pb-1 rounded border text-[10px] uppercase font-bold tracking-wider cursor-pointer ${
                              expandedId === row.company.id
                                ? 'bg-red-950/30 text-red-400 border-red-500/30'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                            }`}
                            title="Alter Feature Flags Map"
                          >
                            <Settings className="h-3.5 w-3.5 inline mr-1" /> Flags
                          </button>

                          {row.company.isActive ? (
                            <button
                              onClick={() => handleCompanyAction(row.company.id, 'suspend')}
                              className="p-1.5 pb-1 bg-amber-950/30 hover:bg-amber-950/50 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                              title="Suspend Ingress Key"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCompanyAction(row.company.id, 'activate')}
                              className="p-1.5 pb-1 bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                              title="Re-Activate Ingress Key"
                            >
                              Activate
                            </button>
                          )}

                          <button
                            onClick={() => handleCompanyAction(row.company.id, 'delete')}
                            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-950/40 rounded cursor-pointer transition-all"
                            title="Completely Wipe Tenant"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Feature Flags Toggling Console */}
                      {expandedId === row.company.id && (
                        <tr className="bg-[#0e0e15]/40">
                          <td colSpan={4} className="p-5 border-t border-b border-zinc-900">
                            <div className="max-w-2xl">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#9d171d] mb-4 flex items-center gap-1.5">
                                <Settings className="h-3.5 w-3.5 text-red-500" /> ALTERING TENANT EXCLUSIVES: {row.company.name}
                              </h4>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {row.featureFlags && row.featureFlags.map((flag) => (
                                  <div 
                                    key={flag.id} 
                                    className="flex items-center justify-between p-2.5 rounded bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition shadow"
                                  >
                                    <div className="pr-2">
                                      <div className="font-bold text-zinc-300 text-[10px]">{flag.featureName}</div>
                                      <div className="text-[8px] text-zinc-600">Updated: {new Date(flag.updatedAt).toLocaleDateString()}</div>
                                    </div>
                                    <button
                                      onClick={() => handleToggleFlag(row.company.id, flag.featureName, flag.isEnabled)}
                                      className="text-zinc-400 hover:text-white transition cursor-pointer"
                                    >
                                      {flag.isEnabled ? (
                                        <ToggleRight className="h-6 w-6 text-emerald-400" />
                                      ) : (
                                        <ToggleLeft className="h-6 w-6 text-zinc-600" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-600 font-mono italic">
                        NO RECORDED FIRMS RECORDED IN REGISTRY
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

        {/* Dynamic Global Announcement Builder Side Panel */}
        <section className="space-y-4">
          <div className="border-b border-zinc-900 pb-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">Broadcaster System</h3>
          </div>

          <div className="bg-[#0b0b10] border border-zinc-900 p-6 rounded shadow-2xl space-y-6">
            <div className="flex items-center gap-2 text-zinc-300">
              <Megaphone className="h-5 w-5 text-red-500" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Global Announcement Builder</span>
            </div>

            <form onSubmit={handleBroadCastAnnouncement} className="space-y-4 font-mono text-[10px]">
              <div>
                <label className="block text-zinc-500 uppercase font-bold mb-1.5">Sign / Title</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full bg-[#050505] border border-zinc-855 border-zinc-800 focus:border-zinc-700 rounded px-3 py-2 text-xs text-zinc-200 outline-none"
                  placeholder="System scheduled window..."
                />
              </div>

              <div>
                <label className="block text-zinc-500 uppercase font-bold mb-1.5">Body Message (Markdown)</label>
                <textarea
                  required
                  rows={4}
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  className="w-full bg-[#050505] border border-zinc-800 focus:border-zinc-700 rounded px-3 py-2 text-xs text-zinc-200 outline-none"
                  placeholder="Introduce maintenance window details..."
                />
              </div>

              <div>
                <label className="block text-zinc-500 uppercase font-bold mb-1.5">Target Firm Group</label>
                <select
                  value={annTargetId}
                  onChange={(e) => setAnnTargetId(e.target.value)}
                  className="w-full bg-[#050505] border border-zinc-800 focus:border-zinc-700 rounded px-2.5 py-2 text-xs text-zinc-300 outline-none font-mono"
                >
                  <option value="all">Broadcast globally (All Registered Firms)</option>
                  {companies.map(c => (
                    <option key={c.company.id} value={c.company.id}>
                      Direct to current firm: {c.company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 uppercase font-bold mb-1.5">Banner Background</label>
                  <select
                    value={annBgColor}
                    onChange={(e) => setAnnBgColor(e.target.value)}
                    className="w-full bg-[#050505] border border-zinc-800 focus:border-zinc-700 rounded px-2 py-2 text-xs text-zinc-300 outline-none font-mono"
                  >
                    <option value="#fee2e2">Red Soft (#fee2e2)</option>
                    <option value="#fef3c7">Amber Warm (#fef3c7)</option>
                    <option value="#dcfce7">Emerald Safe (#dcfce7)</option>
                    <option value="#dbeafe">Blue High (#dbeafe)</option>
                    <option value="#18181b">Zinc Dark (#18181b)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-500 uppercase font-bold mb-1.5">Banner Text Color</label>
                  <select
                    value={annTextColor}
                    onChange={(e) => setAnnTextColor(e.target.value)}
                    className="w-full bg-[#050505] border border-zinc-800 focus:border-zinc-700 rounded px-2 py-2 text-xs text-zinc-300 outline-none font-mono"
                  >
                    <option value="#991b1b">Red Tinted (#991b1b)</option>
                    <option value="#92400e">Amber Tinted (#92400e)</option>
                    <option value="#166534">Emerald Tinted (#166534)</option>
                    <option value="#1e40af">Blue Tinted (#1e40af)</option>
                    <option value="#f4f4f5">White Classic (#f4f4f5)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 uppercase font-bold mb-1.5">Layout Position</label>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                    <input 
                      type="radio" 
                      name="ann_pos" 
                      value="top" 
                      checked={annPosition === 'top'} 
                      onChange={() => setAnnPosition('top')} 
                      className="accent-red-500"
                    /> Top Banner bar
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                    <input 
                      type="radio" 
                      name="ann_pos" 
                      value="bottom" 
                      checked={annPosition === 'bottom'} 
                      onChange={() => setAnnPosition('bottom')} 
                      className="accent-red-500"
                    /> Bottom Footer bar
                  </label>
                </div>
              </div>

              {annStatus && (
                <div className="p-2 border border-zinc-800 bg-zinc-950 rounded text-center text-red-400 font-bold">
                  {annStatus}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-red-950 hover:bg-red-900 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 font-bold py-2.5 rounded text-xs transition-colors cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Sign & Issue Broadcast
              </button>
            </form>
          </div>
        </section>

      </div>
    </div>
  );
};

export default SuperadminDashboard;
