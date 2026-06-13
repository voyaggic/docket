import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Scale, AlertTriangle, ArrowRight } from 'lucide-react';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const errorCode = searchParams.get('error');
  const reasonCode = searchParams.get('reason'); // catches ?reason=no_account from register redirect

  React.useEffect(() => {
    if (errorCode || reasonCode) {
      localStorage.removeItem('docket_auto_signin_google');
    }
  }, [errorCode, reasonCode]);

  const isNoAccount = errorCode === 'no_account' || reasonCode === 'no_account';

  let errorMessage: string | null = null;
  if (isNoAccount) {
    errorMessage = "No account found. Register your firm first, or check your email for an invite link.";
  } else if (errorCode === 'deactivated') {
    errorMessage = "Your account has been deactivated. Please contact your firm administrator.";
  } else if (errorCode === 'email_mismatch') {
    errorMessage = "You signed in with a Google account that does not match this invitation. Please sign in with the correct email.";
  } else if (errorCode === 'expired') {
    errorMessage = "This invitation link has expired. The lifespan limit is 48 hours. Please request a new invite.";
  } else if (errorCode === 'auth_failed') {
    errorMessage = "Google Authentication was unsuccessful. Please check connection configurations.";
  }

  const handleOAuthSuccess = async (redirectUrl: string) => {
    // Refresh central context session cache
    await refreshSession();
    navigate(redirectUrl || '/dashboard');
  };

  return (
    <div id="login-page-container" className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white border-2 border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
        
        {/* LOGO AREA */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xs">
            <Scale className="h-6 w-6 text-sky-400" />
          </div>
          <h2 className="mt-3 text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
            Docket <span className="text-[10px] font-black tracking-wider text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">SAAS</span>
          </h2>
          <p className="mt-1 text-2xl font-black text-slate-900 leading-tight block text-center uppercase tracking-tight">
            Welcome back
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
            Access secure legal dossier console
          </p>
        </div>

        {/* ERROR NOTIFICATIONS */}
        {errorMessage && (
          <div id="login-error-card" className="bg-red-50 border-2 border-red-200 p-3.5 rounded-xl flex gap-2 text-red-700 text-xs font-semibold leading-relaxed">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-650" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isNoAccount ? (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-3 text-center">
            <p className="text-amber-900 font-black text-sm">This Google account has no workspace.</p>
            <p className="text-amber-700 text-xs font-semibold leading-relaxed">
              Your firm must be registered and approved before you can sign in. Check your email for an invitation link, or register below.
            </p>
            <Link to="/register" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition">
              Register Your Firm <ArrowRight className="h-4 w-4 text-sky-400" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <GoogleSignInButton 
              onAuthSuccess={handleOAuthSuccess} 
              onAuthFailure={(url) => navigate(url)}
            />
            <p className="text-[10.5px] font-bold text-slate-500 text-center tracking-normal leading-relaxed">
              Docket uses Google Single Sign-on for secure workspace compliance. 
              Sign in with the Google Account associated with your firm profile.
            </p>
          </div>
        )}

        {/* FOOTER ACCENTS */}
        <div className="border-t border-slate-150 pt-4 flex flex-col gap-2 items-center text-center">
          <p className="text-xs font-semibold text-slate-600">
            Need to register a new firm?{' '}
            <Link 
              to="/register" 
              id="login-create-account-link"
              className="text-sky-500 hover:text-sky-600 font-extrabold hover:underline"
            >
              Get started free
            </Link>
          </p>
          <p className="text-[9.5px] font-bold text-slate-400 hover:text-slate-500 transition-colors">
            Docket Compliance Guard Core v1.2 &bull; Active Multi-tenancy Isolation Enabled
          </p>
        </div>

      </div>
    </div>
  );
};
export default LoginPage;
//
