import React, { useState } from 'react';
import { ShieldAlert, LogOut, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RevokedScreen: React.FC = () => {
  const { user, company, logout, refreshSession } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await refreshSession();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-rose-500/30">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent blur-sm" />

        <div className="flex flex-col items-center">
          <div className="bg-rose-950/50 border border-rose-500/30 text-rose-400 p-4 rounded-2xl animate-pulse">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <h2 className="mt-4 text-xl font-black text-white tracking-tight uppercase">
            Access Suspended
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Deactivated by Workspace Administrator
          </p>
        </div>

        <div className="border-t border-b border-slate-800 py-4 text-left">
          <p className="text-xs text-slate-300 leading-relaxed font-semibold">
            Hello <span className="text-white font-black">{user?.fullName}</span>,
          </p>
          <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
            Your credentials to the <span className="text-white font-bold">{company?.name || 'Firm'}</span> Docket practice portal have been revoked by your administrator. You cannot view cases, send messages, or perform firm activities while inactive.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={handleCheckNow}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold rounded-xl transition duration-150 disabled:opacity-50 cursor-pointer shadow-md shadow-white/5 active:scale-98"
          >
            {checking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                Verifying Access Status...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 text-slate-950" />
                Check Status Now
              </>
            )}
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition duration-150 cursor-pointer active:scale-98"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Sign Out of Account
          </button>
        </div>

        <div className="pt-2">
          <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase flex items-center justify-center gap-1.5 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            Listening for Administrator Restoration
          </p>
        </div>
      </div>
    </div>
  );
};
