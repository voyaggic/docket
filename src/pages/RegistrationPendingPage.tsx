import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2, Scale, AlertTriangle, ArrowRight, Hourglass, RefreshCw, XCircle } from 'lucide-react';

export const RegistrationPendingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Load initial fallback values from router state or localStorage
  const initialEmail = location.state?.email || localStorage.getItem('docket_pending_registration_email') || '';
  const initialFirmName = location.state?.firmName || 'registered practicing firm';
  const initialStatus = location.state?.status || 'needs_review';
  const initialMessage = location.state?.message || 'Registration is pending review.';

  const [email, setEmail] = useState(initialEmail);
  const [firmName, setFirmName] = useState(initialFirmName);
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState(initialMessage);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  // Core status fetcher
  const checkStatus = async (showLoading = false) => {
    if (!email) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/registration/status?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status && data.status !== 'none') {
          setStatus(data.status);
          setFirmName(data.firmName || firmName);
          setMessage(data.message || message);
          if (data.inviteToken) {
            setInviteToken(data.inviteToken);
          }
        } else {
          // If no active registration request was found on server, clear state
          setStatus('none');
        }
      }
    } catch (err) {
      console.error("Error querying registration status:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial check on mount
  useEffect(() => {
    if (email) {
      checkStatus(true);
    } else {
      setLoading(false);
    }
  }, [email]);

  // Polling effect: while state is 'needs_review' or 'pending', check status every 5 seconds
  useEffect(() => {
    let intervalId: any;
    const shouldPoll = status === 'needs_review' || status === 'pending';
    
    if (shouldPoll && email) {
      setIsPolling(true);
      intervalId = setInterval(() => {
        checkStatus(false);
      }, 5000);
    } else {
      setIsPolling(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, email]);

  const handleStartOver = () => {
    localStorage.removeItem('docket_pending_registration_email');
    navigate('/register');
  };

  const handleProceedToSetup = () => {
    // Clear registration pending since they are actively converting
    localStorage.removeItem('docket_pending_registration_email');
    if (inviteToken) {
      navigate(`/invite/${inviteToken}`);
    }
  };

  if (loading) {
    return (
      <div id="pending-page-container" className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border-2 border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-450 border-t-transparent mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verifying Partnership Registers...</p>
        </div>
      </div>
    );
  }

  // If no pending email is registered/present
  if (!email || status === 'none') {
    return (
      <div id="pending-page-container" className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className="flex justify-center">
            <div className="bg-sky-50 p-4 rounded-xl">
              <Scale className="h-8 w-8 text-sky-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">No Active Registration</h1>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              We couldn't identify any pending firm registration from this computer. Create your workspace registries to launch Docket.
            </p>
          </div>
          <button
            onClick={handleStartOver}
            className="w-full bg-slate-900 text-white rounded-xl py-3 px-4 text-xs font-black uppercase hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            Register new firm
          </button>
        </div>
      </div>
    );
  }

  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';

  return (
    <div id="pending-page-container" className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white border border-slate-250 rounded-2xl p-8 space-y-6 shadow-sm">
        
        {/* LOGO AREA */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xs">
            <Scale className="h-6 w-6 text-sky-400" />
          </div>
          <h2 className="mt-3 text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
            Docket <span className="text-[10px] font-black tracking-wider text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">SAAS</span>
          </h2>
        </div>

        {/* CONDITION STATE CHANNELS */}
        {isApproved ? (
          <div id="approved-state-view" className="space-y-6 text-center">
            {/* Animated Check icon */}
            <div className="flex justify-center">
              <div className="bg-emerald-50 text-emerald-650 p-4 rounded-full border border-emerald-200 animate-bounce">
                <CheckCircle2 className="h-10 w-10 text-emerald-650 font-black" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Setup Approved!</h1>
              <p className="text-xs font-bold text-slate-650 leading-relaxed">
                Your partnership register request for <strong>{firmName}</strong> has been authorized!
              </p>

              {inviteToken ? (
                <button
                  onClick={handleProceedToSetup}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  Proceed to Setup Account <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl inline-flex items-center gap-2 max-w-full">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-black text-slate-800 truncate">{email}</span>
                </div>
              )}
              
              <p className="text-xs text-slate-500 leading-relaxed pt-2">
                Click the secure button above to accept and complete your registration profile immediately, or access the link sent to your mail carrier.
              </p>
            </div>
          </div>
        ) : isRejected ? (
          <div id="rejected-state-view" className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="bg-rose-50 text-rose-600 p-4 rounded-full border border-rose-200">
                <XCircle className="h-10 w-10 text-rose-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Request Declined</h1>
              <p className="text-xs font-bold text-slate-650 leading-relaxed">
                Unfortunately, your practice request for <strong>{firmName}</strong> was denied manually by supervisors security checks.
              </p>
              <p className="text-xs text-rose-800 bg-rose-50/50 border border-rose-200 p-3 rounded-xl font-semibold leading-relaxed">
                Reason: Free-email domain usage restrictions or existing firm name correlation.
              </p>
            </div>

            <button
              onClick={handleStartOver}
              className="w-full bg-slate-950 text-white rounded-xl py-3 px-4 text-xs font-black uppercase hover:bg-slate-850 transition cursor-pointer"
            >
              Start New Application
            </button>
          </div>
        ) : (
          <div id="pending-state-view" className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="bg-amber-50 text-amber-655 p-4 rounded-full border border-amber-200 relative">
                <Hourglass className="h-10 w-10 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                {isPolling && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-sky-500 border border-white animate-ping" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Registration Under Audit</h1>
              <p className="text-xs font-bold text-slate-655 leading-relaxed">
                Your partnership registry for <strong>{firmName}</strong> is pending manual platform approval.
              </p>
              <div className="text-xs text-amber-800 bg-amber-50/50 border border-amber-200 p-3.5 rounded-xl font-semibold leading-relaxed">
                {message || "Our team manually verifies registrations with high similarity ratios or free domain addresses to prevent database spam."}
              </div>
              
              <div className="inline-flex items-center gap-1.5 justify-center py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                <RefreshCw className="h-3 w-3 text-sky-450 animate-spin" style={{ animationDuration: '3s' }} />
                Checking status real-time...
              </div>

              <p className="text-xs font-bold text-slate-650 leading-relaxed pt-1">
                We generally authorize reviewed firm request credentials within 2-4 business hours. If approved, we will send access link to <strong>{email}</strong> or automatically unlock this screen!
              </p>
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="border-t border-slate-200 pt-4 text-center flex flex-col items-center gap-2">
          <button 
            type="button" 
            onClick={handleStartOver}
            id="pending-start-over-btn"
            className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 underline"
          >
            Cancel request / Start over
          </button>
          
          <Link 
            to="/" 
            id="pending-return-link"
            className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-sky-550 hover:text-sky-655"
          >
            Return to homepage <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
};
export default RegistrationPendingPage;
