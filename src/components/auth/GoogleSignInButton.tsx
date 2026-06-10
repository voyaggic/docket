import React, { useState, useEffect } from 'react';

interface GoogleSignInButtonProps {
  token?: string; // Invitation token
  onAuthSuccess?: (redirectUrl: string) => void;
  onAuthFailure?: (redirectUrl: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ 
  token = '', 
  onAuthSuccess, 
  onAuthFailure 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin is from standard domains or localhost/127.0.0.1
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setLoading(false);
        if (onAuthSuccess) {
          onAuthSuccess(event.data.redirectUrl);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        setLoading(false);
        if (onAuthFailure) {
          onAuthFailure(event.data.redirectUrl);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAuthSuccess, onAuthFailure]);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/google/url?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        throw new Error('Could not initiate Google authentication URL.');
      }
      const data = await res.json();
      
      // Open popup with provider's Google URL directly
      const authWindow = window.open(
        data.url,
        'docket_oauth_popup',
        'width=600,height=750,status=no,resizable=yes,scrollbars=yes'
      );

      if (!authWindow) {
        setLoading(false);
        setError('Popup blocked. Please allow popups for this site.');
      } else {
        let pollingInterval: NodeJS.Timeout;
        let checkClosed: NodeJS.Timeout;

        // Fallback polling: periodically check if session is authenticated
        pollingInterval = setInterval(async () => {
          try {
            const checkRes = await fetch('/api/auth/me', { credentials: 'include' });
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData && checkData.user) {
                clearInterval(pollingInterval);
                clearInterval(checkClosed);
                
                let redirectUrl = '/dashboard';
                const company = checkData.company;
                if (!company || !company.setupComplete) {
                  redirectUrl = '/onboarding';
                }
                
                setLoading(false);
                if (onAuthSuccess) {
                  onAuthSuccess(redirectUrl);
                }
                try {
                  authWindow.close();
                } catch (e) {}
              }
            }
          } catch (pollingErr) {
            // Ignore temporary polling errors
          }
        }, 1000);

        // Reset loading if user closes popup without completing auth
        checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            clearInterval(pollingInterval);
            setLoading(false);
          }
        }, 500);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to start authentication flow.');
      console.error(err);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <button
        type="button"
        disabled={loading}
        onClick={handleSignIn}
        id="google-signin-btn"
        className="w-full min-h-[44px] flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-slate-300 rounded-xl shadow-xs text-slate-800 hover:text-slate-900 font-bold hover:bg-slate-50 border-slate-300 hover:border-slate-400 focus:outline-none transition-all duration-155 transform active:scale-[0.98] disabled:opacity-50 cursor-pointer text-xs"
      >
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent"></div>
        ) : (
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" width="100%" height="100%">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-.1.3-1.01 2.53v2.1l3.01 2.33c1.76-1.63 2.75-4.02 2.75-6.81z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.01-2.33c-.83.56-1.9.9-3.13.9c-3.1 0-5.72-2.1-6.66-4.93H1.05v2.33C3.04 20.8 7.18 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.34 14.73c-.24-.72-.38-1.5-.38-2.3c0-.8.14-1.58.38-2.3V7.8H1.05c-.83 1.66-1.3 3.52-1.3 5.48c0 1.96.47 3.82 1.3 5.48l4.29-3.33z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0C7.18 0 3.04 3.2 1.05 7.8l4.29 3.33c.94-2.83 3.56-4.93 6.66-4.93z"
            />
          </svg>
        )}
        <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
      </button>
      {error && (
        <p className="mt-2 text-[10px] text-red-650 font-semibold uppercase tracking-wider block text-center" id="google-signin-error">
          {error}
        </p>
      )}
    </div>
  );
};
export default GoogleSignInButton;
