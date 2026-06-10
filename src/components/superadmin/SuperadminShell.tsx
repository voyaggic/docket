import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, FileText, LogOut, Lock, Unlock } from 'lucide-react';

interface SuperadminShellProps {
  children: React.ReactNode;
}

export const SuperadminShell: React.FC<SuperadminShellProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const SA_PATH = (import.meta as any).env.VITE_SUPERADMIN_PATH || 'system-access';

  // Panic button confirmation states
  const [panicLevel, setPanicLevel] = useState<0 | 1 | 2>(0);
  const [platformLocked, setPlatformLocked] = useState(false);
  const [countdown, setCountdown] = useState(3);

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

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col font-sans">
      {/* Superadmin Header Panel */}
      <header className="border-b border-red-950/40 bg-[#0a0a0f] px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-red-950/50 p-2 rounded border border-red-500/20">
            <Shield className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-red-500 font-mono">Docket Core Admin</h1>
            <p className="text-[10px] text-zinc-500 font-mono">HYPERVISOR LEVEL-0 ACCESS</p>
          </div>
        </div>

        {/* Action Controls & Emergency Section */}
        <div className="flex items-center space-x-6">
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
