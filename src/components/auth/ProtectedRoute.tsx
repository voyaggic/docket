import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RevokedScreen } from './RevokedScreen';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, company, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent"></div>
        <p className="mt-4 text-xs font-semibold text-slate-500 tracking-wider uppercase animate-pulse">Loading secure session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (company && !company.isActive && !user.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-md w-full bg-zinc-900/60 border border-red-950/40 rounded-lg p-8 space-y-6 shadow-2xl">
          <div className="w-12 h-12 bg-red-950/30 border border-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-widest">
              FIRM TENANCY SUSPENDED
            </h2>
            <p className="text-xs font-mono text-zinc-500">
              {company.name || 'Your practicing firm'}
            </p>
          </div>
          <div className="bg-red-950/15 border border-red-900/20 p-4 rounded text-xs font-mono text-red-400 leading-relaxed text-left select-text whitespace-pre-wrap">
            {company.suspensionMessage || 'Your firm has been temporarily suspended. Please contact your system administrator or billing contact to reinstate access.'}
          </div>
          <p className="text-[10px] font-mono text-zinc-600">
            Access to client rosters, ongoing cases, and case document storage is completely halted until resolved.
          </p>
        </div>
      </div>
    );
  }

  if (user.isActive === false && !user.isSuperAdmin) {
    return <RevokedScreen />;
  }

  // Superadmins go straight to their dashboard
  // @ts-ignore
  const SA_PATH = import.meta.env?.VITE_SUPERADMIN_PATH || 'system-access';
  if (user.isSuperAdmin) {
    return <Navigate to={`/${SA_PATH}/dashboard`} replace />;
  }

  const setupCompleted = user.setupComplete || false;
  if (!setupCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
