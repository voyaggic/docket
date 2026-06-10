import React, { useEffect, useState } from 'react';
import { 
  FileText, Shield, UserX, UserCheck, Play, Radio, AlertTriangle, 
  Terminal, Search, RefreshCw, Calendar, Eye
} from 'lucide-react';

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

export const SuperadminAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [limitFilter, setLimitFilter] = useState(200);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorWord, setErrorWord] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setErrorWord(null);

      // Build url with query params
      const params = new URLSearchParams();
      params.append('limit', limitFilter.toString());
      if (actionFilter) params.append('action', actionFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await fetch(`/api/sa/audit-log?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error("Unable to authenticate or fetch audit telemetry logs.");
      }
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      setErrorWord(err.message || "Failed to load audit telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter, limitFilter, fromDate, toDate]);

  // Client side text search over loaded logs as extra polish
  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const s = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(s) ||
      log.ip.toLowerCase().includes(s) ||
      log.detail.toLowerCase().includes(s) ||
      (log.endpoint && log.endpoint.toLowerCase().includes(s)) ||
      (log.targetCompanyId && log.targetCompanyId.toLowerCase().includes(s))
    );
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20';
      case 'LOGIN_FAILED':
        return 'bg-red-950/40 text-red-400 border border-red-500/20 font-bold';
      case 'PANIC_BUTTON_TRIGGERED':
        return 'bg-red-600/20 text-red-300 border border-red-500 animate-pulse font-bold';
      case 'PLATFORM_UNLOCKED':
        return 'bg-blue-950/40 text-blue-400 border border-blue-500/20 font-bold';
      case 'SESSION_EXPIRED':
      case 'SESSION_SUPERSEDED':
        return 'bg-amber-955 bg-amber-950/40 text-amber-500 border border-amber-500/20';
      case 'COMPANY_SUSPENDED':
      case 'COMPANY_DELETED':
        return 'bg-rose-950/40 text-rose-400 border border-rose-500/20';
      case 'COMPANY_ACTIVATED':
        return 'bg-teal-950/40 text-teal-400 border border-teal-500/20';
      case 'INVALID_PATH_ACCESS':
        return 'bg-amber-950/50 text-amber-500 border border-amber-500/30';
      default:
        return 'bg-zinc-900 border border-zinc-800 text-zinc-400';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return <UserCheck className="h-3 w-3 mr-1 text-emerald-400" />;
      case 'LOGIN_FAILED':
        return <UserX className="h-3 w-3 mr-1 text-red-500" />;
      case 'PANIC_BUTTON_TRIGGERED':
        return <AlertTriangle className="h-3 w-3 mr-1 text-red-400 animate-pulse" />;
      default:
        return <Terminal className="h-3 w-3 mr-1 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-red-500" />
          <h2 className="font-bold uppercase tracking-wider text-zinc-300">Security Ingress & Audit Telemetry</h2>
        </div>
        <button 
          onClick={fetchAuditLogs}
          disabled={loading}
          className="p-1 px-2.5 bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-900 rounded tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> REFRESH TERMINAL
        </button>
      </div>

      {/* Audit Log Filter Bar */}
      <section className="bg-[#0b0b10] border border-zinc-900 p-5 rounded space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          
          {/* Action filter option */}
          <div className="space-y-1.5">
            <label className="text-zinc-500 uppercase font-bold text-[9px] block">Action Directive</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-zinc-300 outline-none"
            >
              <option value="">ALL DIRECTIVES</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="SESSION_EXPIRED">SESSION_EXPIRED</option>
              <option value="SESSION_SUPERSEDED">SESSION_SUPERSEDED</option>
              <option value="API_REQUEST">API_REQUEST</option>
              <option value="COMPANY_SUSPENDED">COMPANY_SUSPENDED</option>
              <option value="COMPANY_ACTIVATED">COMPANY_ACTIVATED</option>
              <option value="COMPANY_DELETED">COMPANY_DELETED</option>
              <option value="FEATURE_FLAG_CHANGED">FEATURE_FLAG_CHANGED</option>
              <option value="ANNOUNCEMENT_CREATED">ANNOUNCEMENT_CREATED</option>
              <option value="PANIC_BUTTON_TRIGGERED">PANIC_BUTTON_TRIGGERED</option>
              <option value="PLATFORM_UNLOCKED">PLATFORM_UNLOCKED</option>
              <option value="INVALID_PATH_ACCESS">INVALID_PATH_ACCESS</option>
            </select>
          </div>

          {/* Records limit option */}
          <div className="space-y-1.5">
            <label className="text-zinc-500 uppercase font-bold text-[9px] block">Trace Records Limit</label>
            <select
              value={limitFilter}
              onChange={(e) => setLimitFilter(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-zinc-300 outline-none"
            >
              <option value="50">Last 50 Records</option>
              <option value="100">Last 100 Records</option>
              <option value="200">Last 200 Records</option>
              <option value="500">Last 500 Records</option>
            </select>
          </div>

          {/* Date range selection */}
          <div className="space-y-1.5">
            <label className="text-zinc-500 uppercase font-bold text-[9px] block">From Timestamp</label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-zinc-350 outline-none block text-zinc-300"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-500 uppercase font-bold text-[9px] block">To Timestamp</label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-zinc-350 outline-none block text-zinc-300"
              />
            </div>
          </div>

          {/* Interactive Search input */}
          <div className="space-y-1.5">
            <label className="text-zinc-500 uppercase font-bold text-[9px] block">In-Memory filter</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-700">
                <Search className="h-3 w-3" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-[#1a1a24] focus:border-[#252538] rounded pl-8 pr-3 py-1.5 text-[11px] outline-none placeholder-zinc-700 text-zinc-200"
                placeholder="Lookup detail, IP..."
              />
            </div>
          </div>

        </div>
      </section>

      {/* Main Terminal List Display */}
      {errorWord ? (
        <div className="border border-red-950 bg-red-950/10 p-5 rounded text-red-400">
          ⚠️ telemetry readout error: {errorWord}
        </div>
      ) : (
        <div className="bg-[#09090d] border border-zinc-900 rounded overflow-hidden shadow-xl">
          <div className="bg-zinc-950/60 p-3 px-4 border-b border-zinc-900 flex items-center justify-between text-zinc-500 text-[10px]">
            <div>LOG INDEX SEQUENCE (LOADED: {filteredLogs.length} • TOTAL RAW: {logs.length})</div>
            <div className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> SECURE CONSOLE READY</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[11px] text-zinc-400">
              <thead>
                <tr className="bg-zinc-950/20 border-b border-zinc-900 text-zinc-600 text-[9px] uppercase">
                  <th className="p-3.5 pl-4 font-semibold">Timestamp UTC</th>
                  <th className="p-3.5 font-semibold">Operator IP</th>
                  <th className="p-3.5 font-semibold">Action Directive</th>
                  <th className="p-3.5 font-semibold">Payload Summary / Details</th>
                  <th className="p-3.5 font-semibold text-right pr-4">Extra Identifiers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/40">
                {filteredLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-900/10 hover:text-zinc-250 transition-colors">
                    <td className="p-3.5 pl-4 text-zinc-500 select-all shrink-0">
                      {new Date(entry.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="p-3.5 text-zinc-400 select-all font-mono">
                      {entry.ip}
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] uppercase tracking-wide font-semibold ${getActionBadgeColor(entry.action)}`}>
                        {getActionIcon(entry.action)} {entry.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-zinc-300 leading-relaxed max-w-sm break-words select-text">
                      {entry.detail}
                    </td>
                    <td className="p-3.5 text-right font-mono text-[9px] text-zinc-605 text-zinc-550 space-y-0.5 pr-4 select-all">
                      {entry.targetCompanyId && <div>Company: <span className="text-zinc-500">{entry.targetCompanyId}</span></div>}
                      {entry.targetUserId && <div>User: <span className="text-zinc-500">{entry.targetUserId}</span></div>}
                      {entry.endpoint && <div>URI: <span className="text-zinc-500">{entry.method} {entry.endpoint}</span></div>}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-zinc-700 italic">
                      NO AUDIT TELEMETRY SEGMENTS RECORDED IN TIMEFRAME
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminAuditLog;
