import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RevokedScreen } from './RevokedScreen';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

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
