import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, LayoutDashboard, FileText, LogOut, Lock, Unlock,
  ClipboardList, Search, Building, User, Terminal, CheckCircle2,
  XCircle, ArrowRight, X, ExternalLink, Loader2, Copy, Check
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
  featureFlags?: FeatureFlag[];
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
  inviteToken?: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  ip: string;
  detail: string;
  endpoint?: string;
  method?: string;
  targetCompanyId?: string;
  targetUserId?: string;
  result?: string;
}

interface SuperadminShellProps {
  children: React.ReactNode;
}

export const SuperadminShell: React.FC<SuperadminShellProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // @ts-ignore
  const SA_PATH = import.meta.env?.VITE_SUPERADMIN_PATH || 'system-access';

  // Panic button confirmation states
  const [panicLevel, setPanicLevel] = useState<0 | 1 | 2>(0);
  const [platformLocked, setPlatformLocked] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Global search HUD panel states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [allCompanies, setAllCompanies] = useState<CompanySummary[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<RegistrationRequest[]>([]);
  const [allLogs, setAllLogs] = useState<AuditEntry[]>([]);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [simulatedEmails, setSimulatedEmails] = useState<Array<{ email: string; link: string; id: string }>>([]);

  // Check initial platform status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/sa/platform-status', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPlatformLocked(data.locked);
        }
      } catch (err) {
        console.error("Failed to check status", err);
      }
    };
    checkStatus();
  }, [location.pathname]);

  // Click outside to dismiss search HUD dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset first panic-button click if 3 seconds elapse without second click
  useEffect(() => {
    if (panicLevel === 1) {
      const timer = setTimeout(() => {
        setPanicLevel(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [panicLevel]);

  // Panic action countdown handler
  useEffect(() => {
    let interval: any;
    if (panicLevel === 2 && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            triggerPanicLock();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [panicLevel, countdown]);

  const loadSearchData = async () => {
    if (dataLoaded || dataLoading) return;
    setDataLoading(true);
    try {
      const [compRes, regRes, logsRes] = await Promise.all([
        fetch('/api/superadmin/companies'),
        fetch('/api/superadmin/registrations'),
        fetch('/api/sa/audit-log?limit=300')
      ]);

      if (compRes.ok) {
        const comps = await compRes.json();
        setAllCompanies(comps);
      }
      if (regRes.ok) {
        const regs = await regRes.json();
        setAllRegistrations(regs);
      }
      if (logsRes.ok) {
        const logs = await logsRes.json();
        setAllLogs(logs);
      }
      setDataLoaded(true);
    } catch (err) {
      console.error("Failed to compile global search indices:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleApproveSearch = async (regId: string, email: string) => {
    setActioningId(regId);
    try {
      const res = await fetch(`/api/superadmin/registrations/${regId}/approve`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        const inviteToken = data.token;
        if (inviteToken) {
          const generatedLink = `${window.location.origin}/invite/${inviteToken}`;
          setSimulatedEmails(prev => [{ email, link: generatedLink, id: regId }, ...prev]);
        }
        // Force refresh raw registrations list:
        const freshRegRes = await fetch('/api/superadmin/registrations');
        if (freshRegRes.ok) {
          const freshRegs = await freshRegRes.json();
          setAllRegistrations(freshRegs);
        }
        // Fire custom window event to force current dashboard page reload if active
        window.dispatchEvent(new CustomEvent('registration-approved', { detail: { id: regId } }));
      } else {
        alert("Operation denied on registration review.");
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
    setTimeout(() => setCopiedId(null), 2000);
  };

  const triggerPanicLock = async () => {
    try {
      const res = await fetch('/api/sa/panic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setPlatformLocked(true);
        // Destroyed session will naturally deny auth. Redirect to login.
        setTimeout(() => {
          window.location.href = `/${SA_PATH}/login`;
        }, 1500);
      }
    } catch (err) {
      console.error("Panic failed", err);
      setPanicLevel(0);
      setCountdown(3);
    }
  };

  const handlePanicClick = () => {
    if (panicLevel === 0) {
      setPanicLevel(1);
    } else if (panicLevel === 1) {
      setPanicLevel(2);
      setCountdown(3);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/sa/logout', { method: 'POST' });
      window.location.href = `/${SA_PATH}/login`;
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // Perform multi-dimensional local keyword search
  const query = searchQuery.trim().toLowerCase();

  const matchingCompanies = query
    ? allCompanies.filter(c => 
        c.company.name.toLowerCase().includes(query) ||
        c.company.id.toLowerCase().includes(query) ||
        c.company.slug.toLowerCase().includes(query) ||
        c.adminEmail.toLowerCase().includes(query)
      ).slice(0, 5)
    : [];

  const matchingRegistrations = query
    ? allRegistrations.filter(r => 
        r.firmName.toLowerCase().includes(query) ||
        r.registrantName.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query) ||
        r.country.toLowerCase().includes(query)
      ).slice(0, 5)
    : [];

  const matchingLogs = query
    ? allLogs.filter(l => 
        l.action.toLowerCase().includes(query) ||
        l.detail.toLowerCase().includes(query) ||
        l.ip.toLowerCase().includes(query) ||
        (l.targetCompanyId && l.targetCompanyId.toLowerCase().includes(query))
      ).slice(0, 5)
    : [];

  const hasAnyResults = query && (matchingCompanies.length > 0 || matchingRegistrations.length > 0 || matchingLogs.length > 0);

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col font-sans">
      {/* Superadmin Header Panel */}
      <header className="border-b border-red-950/40 bg-[#0a0a0f] px-6 py-4 flex items-center justify-between shadow-lg relative z-30">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="bg-red-950/50 p-2 rounded border border-red-500/20">
            <Shield className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-red-500 font-mono">Docket Core Admin</h1>
            <p className="text-[10px] text-zinc-500 font-mono">HYPERVISOR LEVEL-0 ACCESS</p>
          </div>
        </div>

        {/* Global Search Command Center */}
        <div className="flex-1 max-w-md mx-8 relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 text-zinc-650 text-zinc-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Search firms, registrations, audit logs... (CMD+K)"
              value={searchQuery}
              onFocus={loadSearchData}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              className="w-full text-xs pl-10 pr-10 py-2.5 bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-900 focus:border-red-900/40 rounded-lg outline-none transition-all text-zinc-200 placeholder-zinc-600 font-mono"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {dataLoading && (
              <div className="absolute right-3 top-3 animate-spin text-red-500">
                <Loader2 className="h-3 w-3" />
              </div>
            )}
          </div>

          {/* Search HUD Dropdown results */}
          {searchFocused && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[#0c0c12] border border-zinc-900 rounded-xl shadow-2xl p-4 overflow-y-auto max-h-[500px] z-50 text-xs font-mono animate-in fade-in slide-in-from-top-1">
              {!dataLoaded && dataLoading ? (
                <div className="p-4 text-center text-zinc-500 text-[11px] animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-red-500 mx-auto mb-2" />
                  COMPILING SUPERADMIN SEARCH GRAPH...
                </div>
              ) : !searchQuery ? (
                <div className="p-3 text-center text-zinc-600 text-[10px] space-y-1">
                  <p>Type keywords to search globally across database partitions.</p>
                  <p className="text-[#8b1a1a]/70">⚡ Instant actions: Approve registrations & fetch invite tokens directly.</p>
                </div>
              ) : !hasAnyResults ? (
                <div className="p-4 text-center text-zinc-600 text-[10px]">
                  No matches discovered in firms, registrations, or security journals.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Matching Registrations Section */}
                  {matchingRegistrations.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[9px] uppercase tracking-wider text-red-500 font-black border-b border-zinc-900 pb-1 flex items-center gap-1">
                        <ClipboardList className="h-3 w-3 text-red-400" />
                        Pending registrations & invites ({matchingRegistrations.length})
                      </div>
                      <div className="divide-y divide-zinc-900/50">
                        {matchingRegistrations.map((reg) => {
                          const simMatch = simulatedEmails.find(se => se.id === reg.id);
                          const activeToken = reg.inviteToken || (simMatch?.link ? simMatch.link.split('/invite/')[1] : null);
                          const inviteLink = activeToken ? `${window.location.origin}/invite/${activeToken}` : null;

                          return (
                            <div key={reg.id} className="py-2.5 flex items-center justify-between gap-3 text-[11px]">
                              <div>
                                <div className="text-zinc-200 font-bold">{reg.firmName}</div>
                                <div className="text-zinc-500 text-[10px]">
                                  {reg.registrantName} &bull; {reg.email}
                                </div>
                                <div className="text-[9px] text-[#8e1b1b] mt-0.5">
                                  Status: <span className="uppercase font-bold">{reg.status}</span>
                                </div>
                                {inviteLink && (
                                  <div className="mt-1 flex items-center gap-1.5 bg-[#0f1c12] border border-emerald-950 text-emerald-400 p-1 px-1.5 rounded text-[9.5px]">
                                    <span className="truncate max-w-[200px] font-mono font-bold select-all">{inviteLink}</span>
                                    <button 
                                      onClick={() => copyToClipboard(inviteLink, reg.id)}
                                      className="text-emerald-400 hover:text-white"
                                      title="Copy Invite Link"
                                    >
                                      {copiedId === reg.id ? <Check className="h-3 w-3 text-emerald-400 animate-bounce" /> : <Copy className="h-3 w-3" />}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0">
                                {reg.status === 'needs_review' ? (
                                  <button
                                    disabled={actioningId !== null}
                                    onClick={() => handleApproveSearch(reg.id, reg.email)}
                                    className="p-1 px-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded text-[9.5px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                                  >
                                    {actioningId === reg.id ? <Loader2 className="h-3 w-3 animate-spin text-emerald-400" /> : <CheckCircle2 className="h-3 w-3" />}
                                    Approve & Get Link
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSearchFocused(false);
                                      navigate(`/${SA_PATH}/registrations`);
                                    }}
                                    className="p-1 px-2 border border-zinc-800 text-zinc-400 hover:text-white rounded hover:border-zinc-700 text-[9.5px]"
                                  >
                                    Queue <ArrowRight className="h-2.5 w-2.5 inline" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Matching Companies Section */}
                  {matchingCompanies.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[9px] uppercase tracking-wider text-red-500 font-black border-b border-zinc-900 pb-1 flex items-center gap-1">
                        <Building className="h-3 w-3 text-red-400" />
                        Licensed Tenants & Gateway Firms ({matchingCompanies.length})
                      </div>
                      <div className="divide-y divide-zinc-900/50">
                        {matchingCompanies.map((c) => (
                          <div key={c.company.id} className="py-2 flex items-center justify-between gap-3 text-[11px]">
                            <div>
                              <div className="text-zinc-200 font-bold">{c.company.name}</div>
                              <div className="text-zinc-500 text-[10px]">
                                Slug: {c.company.slug} &bull; Admin: {c.adminEmail}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSearchFocused(false);
                                navigate(`/${SA_PATH}/dashboard`);
                              }}
                              className="p-1 px-2 bg-red-950/40 text-red-400 hover:text-white border border-red-900/20 rounded text-[9px] font-bold"
                            >
                              Config
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Logs Section */}
                  {matchingLogs.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[9px] uppercase tracking-wider text-red-500 font-black border-b border-zinc-900 pb-1 flex items-center gap-1">
                        <Terminal className="h-3 w-3 text-red-400" />
                        Security Telemetry Log Matching ({matchingLogs.length})
                      </div>
                      <div className="divide-y divide-zinc-900/50">
                        {matchingLogs.map((l) => (
                          <div key={l.id} className="py-1.5 text-[10px]">
                            <div className="flex items-center justify-between text-[9px] text-zinc-500 mb-0.5">
                              <span>{new Date(l.timestamp).toISOString().replace('T', ' ').substring(0, 16)}</span>
                              <span className="text-zinc-400">{l.ip}</span>
                            </div>
                            <div className="font-bold text-zinc-300">{l.action}</div>
                            <div className="text-zinc-400 text-[9.5px] line-clamp-1">{l.detail}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls & Emergency Section */}
        <div className="flex items-center space-x-6 shrink-0">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2 font-mono text-[10px] uppercase border border-zinc-800 rounded px-2.5 py-1 bg-zinc-950">
            <span className="text-zinc-500">SYSTEM:</span>
            {platformLocked ? (
              <span className="text-red-500 flex items-center gap-1 font-bold">
                <Lock className="h-3 w-3" /> SECURED/LOCKED
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
                <Unlock className="h-3 w-3" /> ACTIVE/LIVE
              </span>
            )}
          </div>

          {/* Panic Trigger Button */}
          {panicLevel === 0 && (
            <button
              onClick={handlePanicClick}
              className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-500/30 hover:border-red-500/50 text-red-100 font-mono text-xs font-bold rounded shadow-lg transition-colors cursor-pointer flex items-center gap-2 uppercase tracking-wide"
            >
              <Lock className="h-3.5 w-3.5 text-red-400 animate-pulse" /> Panic Lockout
            </button>
          )}

          {panicLevel === 1 && (
            <button
              onClick={handlePanicClick}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 animate-pulse border border-red-400 text-white font-mono text-xs font-bold rounded shadow-xl transition-colors cursor-pointer flex items-center gap-2 uppercase tracking-wide"
            >
              ⚠️ CONFIRM LOCKOUT NOW
            </button>
          )}

          {panicLevel === 2 && (
            <button
              disabled
              className="px-4 py-2 bg-red-600 border border-red-400 text-white font-mono text-xs font-bold rounded shadow-xl transition-colors flex items-center gap-2 uppercase tracking-wide cursor-not-allowed"
            >
              🔒 Locking in {countdown}s...
            </button>
          )}

          {/* Logout Button */}
          <button
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
              title="Secure Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Simple Side Menu */}
        <aside className="w-64 border-r border-zinc-900 bg-[#09090c] p-6 flex flex-col space-y-2 shrink-0">
          <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-600 mb-4 px-3">
            CONTROL CONSOLE
          </div>
          <NavLink
            to={`/${SA_PATH}/dashboard`}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded font-mono text-xs transition-colors ${
                isActive
                  ? 'bg-red-950/20 border border-red-900/40 text-red-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>FIRM ENGINE</span>
          </NavLink>

          <NavLink
            to={`/${SA_PATH}/registrations`}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded font-mono text-xs transition-colors ${
                isActive
                  ? 'bg-red-950/20 border border-red-900/40 text-red-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`
            }
          >
            <ClipboardList className="h-4 w-4" />
            <span>REGISTRY QUEUE</span>
          </NavLink>

          <NavLink
            to={`/${SA_PATH}/audit-log`}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded font-mono text-xs transition-colors ${
                isActive
                  ? 'bg-red-950/20 border border-red-900/40 text-red-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`
            }
          >
            <FileText className="h-4 w-4" />
            <span>AUDIT TELEMETRY</span>
          </NavLink>

          <div className="flex-1" />

          {/* Core metadata footer in sidebar */}
          <div className="border-t border-zinc-900 pt-4 px-3 font-mono text-[9px] text-zinc-600 space-y-1">
            <div>HOST IP: 0.0.0.0</div>
            <div>INGRESS PORT: 3000</div>
            <div>STATUS: SECURE REGIME</div>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 overflow-y-auto bg-[#040406] p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SuperadminShell;
