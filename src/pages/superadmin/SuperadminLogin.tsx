import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertOctagon, HelpCircle, ShieldAlert } from 'lucide-react';

export const SuperadminLogin: React.FC = () => {
  const navigate = useNavigate();
  // @ts-ignore
  const SA_PATH = import.meta.env?.VITE_SUPERADMIN_PATH || 'system-access';

  // Forms
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Statuses
  const [isLocked, setIsLocked] = useState(false);
  const [isCheckingLock, setIsCheckingLock] = useState(true);
  const [mode, setMode] = useState<'login' | 'unlock'>('login');
  const [loading, setLoading] = useState(false);
  const [errorMess, setErrorMess] = useState<string | null>(null);

  // Rate limits
  const [lockedOut, setLockedOut] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  // Check if platform is locked on first mount
  const checkPlatformStatus = async () => {
    try {
      const res = await fetch('/api/sa/platform-status', { credentials: 'include' });
      if (res.status === 503) {
        setIsLocked(true);
        setMode('unlock');
      } else if (res.ok) {
        const data = await res.json();
        setIsLocked(data.locked);
        if (data.locked) {
          setMode('unlock');
        }
      }
    } catch (err) {
      console.error("Lock status check failed", err);
    } finally {
      setIsCheckingLock(false);
    }
  };

  useEffect(() => {
    checkPlatformStatus();
  }, []);

  // Handle countdown if locked out
  useEffect(() => {
    if (lockoutRemaining && lockoutRemaining > 0) {
      const timer = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev && prev <= 1) {
            setLockedOut(false);
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 60 * 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMess(null);

    const url = mode === 'unlock' ? '/api/sa/unlock' : '/api/sa/login';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        navigate(`/${SA_PATH}/dashboard`, { replace: true });
      } else if (res.status === 429) {
        const data = await res.json();
        if (data.error === "locked") {
          setLockedOut(true);
          setLockoutRemaining(data.minutesRemaining || 15);
          setErrorMess("Too many failed attempts. Terminal locked.");
        } else {
          setErrorMess("Rate limit exceeded. Try again in a minute.");
        }
      } else {
        setErrorMess("Access denied: Invalid credentials.");
      }
    } catch (err) {
      setErrorMess("Connection refused. System offline.");
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingLock) {
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-mono text-zinc-300">
      <div className="w-full max-w-sm border border-zinc-900 bg-[#0d0d0d] p-8 rounded shadow-2xl relative">
        
        <div className="absolute top-2 right-4 text-[9px] text-zinc-700 select-none">
          TERM-ID: L0_HYS
        </div>

        {/* Locked status banner */}
        {isLocked && (
          <div className="mb-6 border border-red-950 bg-red-950/20 p-3 rounded flex items-start space-x-3 text-red-400">
            <AlertOctagon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-[10px] space-y-1">
              <div className="font-bold uppercase tracking-wider">PLATFORM LOCKDOWN ACTIVE</div>
              <p className="leading-relaxed">Core system functions are suspended. Emergency positional authentication is required to unlock.</p>
            </div>
          </div>
        )}

        {/* Lockout status banner */}
        {lockedOut && (
          <div className="mb-6 border border-amber-950 bg-amber-950/20 p-3 rounded flex items-start space-x-3 text-amber-500">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[10px] space-y-1">
              <div className="font-bold uppercase tracking-wider">IP TEMPORARILY BLOCKED</div>
              <p className="leading-relaxed">Rate-limiter lockout in effect. Expiry remaining: {lockoutRemaining} minutes.</p>
            </div>
          </div>
        )}

        {/* Header - ZERO BRANDING */}
        <div className="mb-8 text-center">
          <div className="mx-auto h-10 w-10 bg-zinc-950 rounded border border-zinc-800 flex items-center justify-center mb-3">
            <Lock className="h-5 w-5 text-zinc-600" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            {mode === 'unlock' ? 'Emergency System Unlock' : 'Core Identification Required'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase text-zinc-500 font-bold mb-1.5" htmlFor="sa-email">
              Identifier
            </label>
            <input
              id="sa-email"
              type="email"
              required
              disabled={lockedOut || loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#050505] border border-zinc-800 focus:border-zinc-700 rounded px-3 py-2 text-xs text-zinc-100 outline-none transition-colors"
              placeholder="admin@system.level"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase text-zinc-500 font-bold mb-1.5" htmlFor="sa-pass">
              Credential Key
            </label>
            <input
              id="sa-pass"
              type="password"
              required
              disabled={lockedOut || loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#050505] border border-zinc-800 focus:border-zinc-700 rounded px-3 py-2 text-xs text-zinc-100 outline-none transition-colors"
              placeholder="••••••••••••••"
            />
          </div>

          {errorMess && (
            <div className="text-[10px] text-red-500 bg-red-950/10 border border-red-950/20 px-3 py-2 rounded text-center">
              {errorMess}
            </div>
          )}

          <button
            type="submit"
            disabled={lockedOut || loading}
            className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 hover:text-black font-bold py-2.5 rounded text-xs transition-colors cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            {loading ? 'Validating Core Key...' : mode === 'unlock' ? 'Execute Unlock Procedure' : 'Transmit Key'}
          </button>
        </form>

        {/* Sub-toggles */}
        {!isLocked && (
          <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-between text-[9px] text-zinc-600">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'unlock' : 'login');
                setErrorMess(null);
              }}
              className="hover:text-zinc-400 cursor-pointer text-left focus:outline-none"
            >
              {mode === 'login' ? 'Access Lock Interface' : 'Access Sign In Interface'}
            </button>
            <div className="flex items-center gap-1 select-none">
              <HelpCircle className="h-3 w-3" /> System Sec-0
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperadminLogin;
