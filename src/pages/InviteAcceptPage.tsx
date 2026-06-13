import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Scale, ShieldAlert, CheckCircle2, UserPlus, Mail, Loader2 } from 'lucide-react';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';

interface InvitationDetails {
  email: string;
  firmName: string;
  role: string;
  expired: boolean;
  isActive: boolean;
}

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check URL query parameter error e.g. email mismatch
  const queryError = searchParams.get('error');

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Missing invitation validation token.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/invitations/${token}`);
        if (!res.ok) {
          throw new Error('This invitation link is invalid or has expired. Please contact support.');
        }

        const data: InvitationDetails = await res.json();
        if (data.expired || !data.isActive) {
          throw new Error('This invitation link has expired or was already utilized.');
        }

        setDetails(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to authenticate this invitation link.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleOAuthSuccess = async (redirectUrl: string) => {
    // Refresh the central context
    await refreshSession();
    // Redirect to the onboarding wizard or the main dashboard
    navigate(redirectUrl || '/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-950" />
        <p className="mt-4 text-xs font-semibold text-slate-500 tracking-wider uppercase animate-pulse">Verifying secure token credentials...</p>
      </div>
    );
  }

  return (
    <div id="invite-page-container" className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white border-2 border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
        
        {/* LOGO CONTAINER */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xs">
            <Scale className="h-6 w-6 text-sky-400" />
          </div>
          <h2 className="mt-3 text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
            Docket <span className="text-[10px] font-black tracking-wider text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">SAAS</span>
          </h2>
        </div>

        {/* ERROR STATE */}
        {error ? (
          <div id="invite-error-view" className="flex flex-col items-center text-center space-y-4">
            <div className="bg-red-50 p-3.5 rounded-full border border-red-200 text-red-600">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Invitation Invalid</h3>
              <p className="text-xs text-slate-650 leading-relaxed font-semibold max-w-xs">{error}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-slate-950 hover:bg-black text-white text-xs font-bold leading-none rounded-lg cursor-pointer"
            >
              Go to marketing page
            </button>
          </div>
        ) : details ? (
          <div id="invite-valid-view" className="space-y-5">
            
            {/* EMAIL MISMATCH DISPLAY WARNING */}
            {queryError === 'email_mismatch' && (
              <div className="bg-amber-50 border-2 border-amber-200 p-3.5 rounded-xl flex gap-1.5 text-amber-850 text-xs font-semibold leading-relaxed">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-amber-600" />
                <span>
                  You logged in with a Google account that does not match this invite. 
                  Please connect using <strong>{details.email}</strong>.
                </span>
              </div>
            )}

            <div className="text-center space-y-1">
              <span className="text-[9px] uppercase tracking-widest font-black inline-block py-1 px-2.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                ⚡ Invitation Authorized
              </span>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight pt-1">
                Welcome to Docket
              </h1>
              <p className="text-sm font-extrabold text-[#00BCFF] tracking-wide">
                Join firm: {details.firmName}
              </p>
              <p className="text-xs font-semibold text-slate-600 pt-1">
                You are joining as a {details.role === 'admin' ? 'firm administrator' : `${details.role} collaborator`}.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 block">Invited Email Target</span>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-800">{details.email}</span>
              </div>
            </div>

            {/* OAUTH DEPLOYMENT COMPONENT */}
            <div className="space-y-2">
              <GoogleSignInButton 
                token={token} 
                onAuthSuccess={handleOAuthSuccess}
                onAuthFailure={(url) => navigate(url)}
              />
              <p className="text-[9.5px] font-bold text-slate-405 text-center leading-normal">
                You must sign in with the exact invited Google address. 
                Single-use validation token active &bull; Expires in 48h.
              </p>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
};
export default InviteAcceptPage;
