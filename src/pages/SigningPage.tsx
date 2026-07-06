import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Check, AlertCircle, Loader2, PenTool } from 'lucide-react';

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<any>(null);

  const [otpRequested, setOtpRequested] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);

  const [signatureText, setSignatureText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/sign/${token}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'This signing link is invalid or has expired.');
        setInfo(data);
        if (data.status === 'signed') setCompleted(true);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleRequestOtp = async () => {
    setOtpSending(true);
    setOtpMsg(null);
    try {
      const res = await fetch(`/api/sign/${token}/request-otp`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');
      setOtpRequested(true);
      setOtpMsg(data.message);
    } catch (err: any) {
      setOtpMsg(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpMsg(null);
    try {
      const res = await fetch(`/api/sign/${token}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      setOtpVerified(true);
    } catch (err: any) {
      setOtpMsg(err.message);
    }
  };

  const handleCompleteSign = async () => {
    if (!signatureText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureTypedText: signatureText.trim(), otpCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete signing.');
      setCompleted(true);
    } catch (err: any) {
      setOtpMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md text-center space-y-3 shadow-sm">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h1 className="text-sm font-black text-slate-800 uppercase">Signing Link Unavailable</h1>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-emerald-200 rounded-2xl p-8 max-w-md text-center space-y-3 shadow-sm">
          <Check className="h-10 w-10 text-emerald-600 mx-auto" />
          <h1 className="text-sm font-black text-slate-800 uppercase">Document Signed</h1>
          <p className="text-xs text-slate-500">
            Thank you, {info?.signatoryName}. Your signature on "{info?.documentTitle}" has been recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 bg-sky-950 text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-sky-400" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-sky-400">Secure Document Signing</h4>
            <p className="text-[10px] text-slate-300">{info?.documentTitle}</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 border rounded-xl text-xs">
            <p className="font-bold text-slate-800">Signing as: {info?.signatoryName}</p>
            <p className="text-slate-500">{info?.signatoryEmail}</p>
          </div>

          {!otpVerified ? (
            <div className="space-y-3">
              {!otpRequested ? (
                <button
                  onClick={handleRequestOtp}
                  disabled={otpSending}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg disabled:opacity-50"
                >
                  {otpSending ? 'Sending code...' : 'Send Verification Code to My Email'}
                </button>
              ) : (
                <>
                  <p className="text-xs text-slate-500">Enter the 6-digit code sent to your email.</p>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full p-3 border rounded-lg text-center text-lg font-mono tracking-widest"
                  />
                  <button
                    onClick={handleVerifyOtp}
                    disabled={otpCode.length !== 6}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg disabled:opacity-50"
                  >
                    Verify Code
                  </button>
                </>
              )}
              {otpMsg && <p className="text-xs text-center text-slate-500">{otpMsg}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <Check className="h-4 w-4" /> Identity verified.
              </div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Type your full name to sign</label>
              <input
                type="text"
                value={signatureText}
                onChange={e => setSignatureText(e.target.value)}
                placeholder={info?.signatoryName}
                className="w-full p-3 border rounded-lg font-serif italic"
              />
              <div className="p-4 border-2 border-dashed rounded-xl text-center bg-slate-50">
                <PenTool className="h-4 w-4 text-slate-400 mx-auto mb-2" />
                <span className="text-sm italic font-serif underline">{signatureText || 'Your signature will appear here'}</span>
              </div>
              <button
                onClick={handleCompleteSign}
                disabled={!signatureText.trim() || submitting}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Completing...' : 'Complete Signing & Lock Document'}
              </button>
              {otpMsg && <p className="text-xs text-center text-red-600">{otpMsg}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
