import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail, CheckCircle2, Scale, AlertTriangle, ArrowRight, Hourglass } from 'lucide-react';

export const RegistrationPendingPage: React.FC = () => {
  const location = useLocation();
  const { email, firmName, status, message } = (location.state as any) || {
    email: 'associated guest inbox',
    firmName: 'registered practicing firm',
    status: 'needs_review',
    message: 'Registration is pending review.'
  };

  const isApproved = status === 'approved';

  return (
    <div id="pending-page-container" className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white border-2 border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
        
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
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Check Your Inbox!</h1>
              <p className="text-xs font-bold text-slate-650 leading-relaxed">
                Your practice register request for <strong>{firmName}</strong> was approved automatically. 
                We have transmitted an invitation credentials setup link to:
              </p>
              
              <div className="py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl inline-flex items-center gap-2 max-w-full">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-black text-slate-800 truncate">{email}</span>
              </div>
              
              <p className="text-xs font-bold text-slate-650 leading-relaxed pt-2">
                Click the secure registration link in the email package to complete your administrative setup.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-1 text-[11px] font-semibold text-slate-500 leading-normal">
              <p>&bull; The invitation secure setup link will expire in <strong>48 hours</strong>.</p>
              <p>&bull; Didn't receive the prompt? Wait up to 3 minutes or examine spam/junk partitions.</p>
              <p>&bull; Check server terminal logs for simulated email delivery URLs of local development testing.</p>
            </div>
          </div>
        ) : (
          <div id="pending-state-view" className="space-y-6 text-center">
            {/* Hourglass/Needs Review state */}
            <div className="flex justify-center">
              <div className="bg-amber-50 text-amber-655 p-4 rounded-full border border-amber-200">
                <Hourglass className="h-10 w-10 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Registration Under Audit</h1>
              <p className="text-xs font-bold text-slate-650 leading-relaxed">
                Your partnership registry for <strong>{firmName}</strong> is pending manual platform approval.
              </p>
              <p className="text-xs text-amber-800 bg-amber-50/50 border border-amber-200 p-3 rounded-xl font-semibold leading-relaxed">
                {message || "Our team manually verifies registrations with high similarity ratios or free domain addresses to prevent database spam."}
              </p>
              <p className="text-xs font-bold text-slate-650 leading-relaxed pt-2">
                We generally authorize reviewed firm request credentials within 2-4 business hours. If approved, we will send access link to <strong>{email}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="border-t border-slate-150 pt-4 text-center">
          <Link 
            to="/" 
            id="pending-return-link"
            className="inline-flex items-center gap-1 text-xs font-black uppercase text-sky-550 hover:text-sky-655"
          >
            Return to homepage <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
};
export default RegistrationPendingPage;
