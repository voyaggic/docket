import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Hourglass, CheckCircle2, XCircle, AlertTriangle, 
  Search, LogOut, RefreshCw, Layers, Users, Globe2, Mail, ExternalLink 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const { logout } = useAuth();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [simulatedEmails, setSimulatedEmails] = useState<Array<{ email: string; link: string }>>([]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/registrations');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error("Failed to query superadmin requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleApprove = async (id: string, email: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/superadmin/registrations/${id}/approve`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          const generatedLink = `${window.location.origin}/invite/${data.token}`;
          setSimulatedEmails(prev => [{ email, link: generatedLink }, ...prev]);
        }
        await fetchRegistrations();
      } else {
        alert("Action failed. Please query standard system logs.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Are you sure you want to REJECT this practice registration?")) return;
    setActioningId(id);
    try {
      const res = await fetch(`/api/superadmin/registrations/${id}/reject`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchRegistrations();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesQuery = 
      req.firmName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.registrantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesQuery;
    return matchesQuery && req.status === filterStatus;
  });

  // Calculate stats
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'needs_review').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div id="superadmin-dashboard-root" className="min-h-screen bg-slate-905 bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Banner Bar */}
      <header className="bg-slate-900 border-b border-slate-800 py-3 px-6 md:px-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-sky-400 text-slate-950 p-2 rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white leading-none">Docket System Core</h1>
            <span className="text-[9px] font-mono font-black text-sky-400 tracking-wider">SUPERVISOR COMPLIANCE SEGMENT</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => fetchRegistrations()}
            className="p-1 px-2.5 rounded-lg border border-slate-700 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
          <button
            onClick={() => logout()}
            className="p-1 px-2.5 rounded-lg border border-red-900/40 bg-red-950/20 hover:bg-red-950/30 text-red-400 text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6 overflow-y-auto">
        
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Total Applications</span>
            <span className="text-2xl font-black text-white mt-1">{totalCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-450 text-amber-400">Needs Supervisor Review</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-amber-400">{pendingCount}</span>
              {pendingCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-450 bg-amber-400 animate-pulse" />}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Approved Tenants</span>
            <span className="text-2xl font-black text-emerald-400 mt-1">{approvedCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-red-450 text-red-500">Rejected Applications</span>
            <span className="text-2xl font-black text-red-500 mt-1">{rejectedCount}</span>
          </div>
        </div>

        {/* Localized email simulator popup */}
        {simulatedEmails.length > 0 && (
          <div className="bg-slate-900 border-2 border-dashed border-sky-450/40 rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                📧 Local Dev Invite Delivery Simulation Active
              </span>
              <button 
                onClick={() => setSimulatedEmails([])} 
                className="text-[9.5px] uppercase font-black text-slate-400 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
              {simulatedEmails.map((item, index) => (
                <div key={index} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono leading-relaxed space-y-1">
                  <p className="text-slate-400"><strong>To:</strong> {item.email}</p>
                  <p className="text-slate-400 flex items-center gap-1">
                    <strong>Invite Link:</strong> 
                    <a href={item.link} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-0.5">
                      {item.link} <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter / Search Actions */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-3.5 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 text-slate-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by Firm, registrant or email address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-slate-600 transition-all text-white font-semibold"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl text-xs py-2.5 px-4 font-bold text-white outline-none focus:border-slate-700 min-h-[44px]"
            >
              <option value="all">All Submissions</option>
              <option value="needs_review">Needs Review (High Similarity / Public Domain)</option>
              <option value="approved">Approved Applications</option>
              <option value="rejected">Rejected Applications</option>
            </select>
          </div>
        </div>

        {/* Applications List Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 select-none">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Registration Applications Queue</span>
            <span className="text-[10px] text-slate-500 font-mono">Found {filteredRequests.length} applications</span>
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
              <p className="mt-3 text-xs text-slate-500 font-mono">Re-indexing practice registrations database...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-1">
              <Layers className="h-8 w-8 mx-auto text-slate-650 opacity-40" />
              <p className="text-xs font-bold uppercase tracking-wider">No application request records found</p>
              <p className="text-[11px] font-semibold text-slate-605">Registration criteria checks completed cleanly.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredRequests.map((req) => {
                return (
                  <div key={req.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/10 hover:bg-slate-900/50 transition-colors">
                    
                    {/* Left Info: Registry Request Profile */}
                    <div className="space-y-1.5 flex-1 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-white">{req.firmName}</h4>
                        {req.riskScore === 'high' && (
                          <span className="text-[8.5px] uppercase font-black px-2 py-0.5 bg-red-950/80 border border-red-900/60 text-red-400 rounded-full flex items-center gap-1 shrink-0">
                            <AlertTriangle className="h-2.5 w-2.5" /> High Risk (Similarity Match)
                          </span>
                        )}
                        {req.riskScore === 'medium' && (
                          <span className="text-[8.5px] uppercase font-black px-2 py-0.5 bg-amber-950/80 border border-amber-900/60 text-amber-400 rounded-full flex items-center gap-1 shrink-0">
                            <AlertTriangle className="h-2.5 w-2.5" /> Medium Risk (Free Domain)
                          </span>
                        )}
                        {req.riskScore === 'low' && (
                          <span className="text-[8.5px] uppercase font-black px-2 py-0.5 bg-emerald-950/50 border border-emerald-900/40 text-emerald-400 rounded-full shrink-0">
                            Low Risk (Auto Approved)
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Users className="h-3 w-3 text-slate-500 shrink-0" />
                          <span>Registrant: <strong>{req.registrantName}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                          <span>Email: <strong className="text-slate-350">{req.email}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5 truncate">
                          <Globe2 className="h-3 w-3 text-slate-500 shrink-0" />
                          <span>Jurisdiction: <strong>{req.country}</strong> &bull; Size: <strong>{req.firmSize} partners</strong></span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono pt-0.5 shrink-0">
                          Applied: {new Date(req.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Right action status indicators */}
                    <div className="flex items-center gap-2 md:self-center">
                      {req.status === 'needs_review' ? (
                        <>
                          <button
                            disabled={actioningId !== null}
                            onClick={() => handleApprove(req.id, req.email)}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-black py-2 px-3.5 rounded-lg border border-transparent shadow-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer min-h-[38px]"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve Registration
                          </button>
                          <button
                            disabled={actioningId !== null}
                            onClick={() => handleReject(req.id)}
                            className="bg-slate-800 hover:bg-red-950 hover:text-red-400 hover:border-red-900/50 disabled:opacity-50 text-slate-300 text-xs font-extrabold py-2 px-3 rounded-lg border border-slate-705 shadow-xs transition-all shrink-0 flex items-center gap-1 cursor-pointer min-h-[38px]"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      ) : req.status === 'approved' ? (
                        <div className="flex items-center gap-1 py-1.5 px-3 bg-emerald-950/40 border border-emerald-900/40 rounded-full text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Approved
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 py-1.5 px-3 bg-red-950/40 border border-red-900/40 rounded-full text-red-400 text-xs font-bold">
                          <XCircle className="h-3.5 w-3.5 text-red-500" /> Rejected
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

    </div>
  );
};
export default SuperadminDashboard;
