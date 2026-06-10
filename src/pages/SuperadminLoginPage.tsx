import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SuperadminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuperadminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide administrative email and login password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/superadmin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Invalid administrator credentials.');
      }

      // Success - Refresh Auth context session scope
      await refreshSession();
      // Redirect to superadmin dashboard overview
      navigate('/superadmin/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login attempt failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="superadmin-login-view" className="min-h-screen bg-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-xl">
        
        {/* LOGO CARD */}
        <div className="flex flex-col items-center">
          <div className="bg-sky-400 text-slate-950 p-2.5 rounded-xl shadow-sm">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-lg font-black text-white uppercase tracking-widest flex items-center gap-1.5">
            Docket <span className="text-[10px] font-black tracking-wider text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/60">SYSADMIN</span>
          </h2>
          <p className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
            Log in to Supervisor Core Console
          </p>
        </div>

        {error && (
          <div id="super-error-card" className="bg-red-950/40 border border-red-900 p-3.5 rounded-xl flex gap-2 text-red-300 text-xs font-semibold leading-relaxed">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSuperadminLoginSubmit} className="space-y-4">
          {/* EMAIL */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
              Supervisor Email
            </label>
            <input
              type="email"
              required
              id="superadmin-email"
              placeholder="e.g. root@docket.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl font-bold text-white outline-none focus:border-sky-400 transition-all min-h-[44px]"
            />
          </div>

          {/* MASTER SECRET */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
              Supervisor Security Key / Password
            </label>
            <input
              type="password"
              required
              id="superadmin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl font-bold text-white outline-none focus:border-sky-400 transition-all min-h-[44px]"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            id="superadmin-login-submit"
            className="w-full min-h-[44px] bg-sky-400 hover:bg-sky-500 text-slate-950 text-[11px] uppercase tracking-wider font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-55 active:scale-[0.98]"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent"></div>
            ) : (
              <>
                Unlock Core Console <ShieldCheck className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[10px] font-bold text-slate-600 text-center uppercase tracking-wide">
          Docket Inc. Unauthorized Access Prohibited by Criminal Code
        </p>

      </div>
    </div>
  );
};
export default SuperadminLoginPage;
