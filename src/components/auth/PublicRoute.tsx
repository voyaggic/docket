import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  const autoSignin = localStorage.getItem('docket_auto_signin_google') === 'true';
  const isInvitePath = window.location.pathname.startsWith('/invite/');
  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  useEffect(() => {
    // Only auto sign-in if user session is absent, not loading, the auto-signin indicator is set,
    // they are NOT on an explicit team invitation link page, and NOT in an iframe.
    if (!user && !isLoading && autoSignin && !isInvitePath && !inIframe) {
      window.location.href = '/api/auth/google';
    }
  }, [user, isLoading, autoSignin, isInvitePath, inIframe]);

  if (isLoading || (!user && autoSignin && !isInvitePath && !inIframe)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent"></div>
        <p className="mt-4 text-xs font-semibold text-slate-500 tracking-wider uppercase animate-pulse">
          {autoSignin && !isInvitePath ? 'Signing you in with Google...' : 'Loading secure session...'}
        </p>
      </div>
    );
  }

  if (user) {
    // @ts-ignore
    const SA_PATH = import.meta.env?.VITE_SUPERADMIN_PATH || 'system-access';
    if (user.isSuperAdmin) {
      return <Navigate to={`/${SA_PATH}/dashboard`} replace />;
    }
    const setupCompleted = user.setupComplete || false;
    if (setupCompleted) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // If not logged in and there is an active pending email in localStorage, restrict to waiting screen
  const pendingEmail = localStorage.getItem('docket_pending_registration_email');
  if (pendingEmail) {
    return <Navigate to="/registration-pending" replace />;
  }

  return <>{children}</>;
};
export default PublicRoute;
