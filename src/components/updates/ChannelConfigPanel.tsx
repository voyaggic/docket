import React, { useState } from 'react';
import { Mail, MessageCircle, Phone, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function ChannelConfigPanel() {
  // EMAIL SMTP CONFIG
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<'success' | 'error' | null>(null);
  const [smtpTestMsg, setSmtpTestMsg] = useState('');

  // WHATSAPP CONFIG
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waBusinessId, setWaBusinessId] = useState('');
  const [showWaToken, setShowWaToken] = useState(false);
  const [waSaved, setWaSaved] = useState(false);
  const [waTesting, setWaTesting] = useState(false);
  const [waTestResult, setWaTestResult] = useState<'success' | 'error' | null>(null);

  // SMS CONFIG (Twilio)
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioFrom, setTwilioFrom] = useState('');
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [smsSaved, setSmsSaved] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState<'success' | 'error' | null>(null);
  const [smsTestTo, setSmsTestTo] = useState('');

  const inputClass = "w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 bg-white outline-none caret-indigo-600 transition text-slate-800";
  const labelClass = "block text-[11px] font-bold text-slate-500 uppercase mb-1";
  const sectionClass = "bg-white border rounded-2xl p-5 space-y-4 shadow-sm";

  const handleSaveSmtp = () => {
    if (!smtpHost || !smtpUser || !smtpPass) return;
    localStorage.setItem('docket_smtp', JSON.stringify({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpFromName }));
    setSmtpSaved(true);
    setTimeout(() => setSmtpSaved(false), 3000);
  };

  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/firm/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom })
      });
      if (res.ok) {
        setSmtpTestResult('success');
        setSmtpTestMsg('Test email sent successfully. Check your inbox.');
      } else {
        setSmtpTestResult('error');
        setSmtpTestMsg('Connection failed. Verify SMTP credentials and host.');
      }
    } catch {
      setSmtpTestResult('error');
      setSmtpTestMsg('Could not reach mail server. Check host and port settings.');
    }
    setSmtpTesting(false);
  };

  const handleSaveWhatsApp = () => {
    if (!waPhoneId || !waToken) return;
    localStorage.setItem('docket_whatsapp', JSON.stringify({ waPhoneId, waToken, waBusinessId }));
    setWaSaved(true);
    setTimeout(() => setWaSaved(false), 3000);
  };

  const handleTestWhatsApp = async () => {
    setWaTesting(true);
    setWaTestResult(null);
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}`, {
        headers: { Authorization: `Bearer ${waToken}` }
      });
      if (res.ok) {
        setWaTestResult('success');
      } else {
        setWaTestResult('error');
      }
    } catch {
      setWaTestResult('error');
    }
    setWaTesting(false);
  };

  const handleSaveSms = () => {
    if (!twilioSid || !twilioToken || !twilioFrom) return;
    localStorage.setItem('docket_twilio', JSON.stringify({ twilioSid, twilioToken, twilioFrom }));
    setSmsSaved(true);
    setTimeout(() => setSmsSaved(false), 3000);
  };

  const handleTestSms = async () => {
    if (!smsTestTo) return;
    setSmsTesting(true);
    setSmsTestResult(null);
    try {
      const res = await fetch('/api/firm/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twilioSid, twilioToken, twilioFrom, to: smsTestTo, message: 'Docket SMS channel test message.' })
      });
      setSmsTestResult(res.ok ? 'success' : 'error');
    } catch {
      setSmsTestResult('error');
    }
    setSmsTesting(false);
  };

  // Load saved values on mount
  React.useEffect(() => {
    const smtp = JSON.parse(localStorage.getItem('docket_smtp') || '{}');
    if (smtp.smtpHost) { setSmtpHost(smtp.smtpHost); setSmtpPort(smtp.smtpPort || '587'); setSmtpUser(smtp.smtpUser); setSmtpPass(smtp.smtpPass); setSmtpFrom(smtp.smtpFrom); setSmtpFromName(smtp.smtpFromName); }
    const wa = JSON.parse(localStorage.getItem('docket_whatsapp') || '{}');
    if (wa.waPhoneId) { setWaPhoneId(wa.waPhoneId); setWaToken(wa.waToken); setWaBusinessId(wa.waBusinessId); }
    const tw = JSON.parse(localStorage.getItem('docket_twilio') || '{}');
    if (tw.twilioSid) { setTwilioSid(tw.twilioSid); setTwilioToken(tw.twilioToken); setTwilioFrom(tw.twilioFrom); }
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center gap-2 pb-2 border-b">
        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Outbound Channel Configuration</h3>
        <span className="text-[11px] text-slate-400 font-semibold">Configure real credentials for Email, WhatsApp and SMS dispatch</span>
      </div>

      {/* EMAIL SMTP */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 border-b pb-3">
          <Mail className="h-5 w-5 text-indigo-600" />
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800">Email — SMTP Configuration</h4>
            <p className="text-[11px] text-slate-400">Connect your firm's email server (Gmail, Outlook, SendGrid, Mailgun etc.)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>SMTP Host *</label>
            <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>SMTP Port *</label>
            <input type="text" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>SMTP Username / Email *</label>
            <input type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="firm@yourdomain.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>SMTP Password / App Key *</label>
            <div className="relative">
              <input type={showSmtpPass ? 'text' : 'password'} value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="App password or API key" className={inputClass + ' pr-10'} />
              <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>From Email Address</label>
            <input type="email" value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)} placeholder="noreply@yourfirm.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>From Display Name</label>
            <input type="text" value={smtpFromName} onChange={e => setSmtpFromName(e.target.value)} placeholder="Docket Legal LLP" className={inputClass} />
          </div>
        </div>

        <div className="bg-slate-50 border rounded-xl p-3 text-[11px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">Common providers:</p>
          <p>• Gmail: host = smtp.gmail.com, port = 587, use App Password (not main password)</p>
          <p>• Outlook/Office365: host = smtp.office365.com, port = 587</p>
          <p>• SendGrid: host = smtp.sendgrid.net, port = 587, user = apikey, password = your API key</p>
        </div>

        {smtpTestResult && (
          <div className={`p-3 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${smtpTestResult === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {smtpTestResult === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{smtpTestMsg}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleTestSmtp} disabled={smtpTesting || !smtpHost} className="px-4 py-2.5 border border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-bold rounded-lg transition disabled:opacity-40 cursor-pointer">
            {smtpTesting ? 'Testing...' : 'Send Test Email'}
          </button>
          <button onClick={handleSaveSmtp} disabled={!smtpHost || !smtpUser || !smtpPass} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5">
            {smtpSaved ? <><Check className="h-4 w-4" /> Saved!</> : 'Save SMTP Settings'}
          </button>
        </div>
      </div>

      {/* WHATSAPP */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 border-b pb-3">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800">WhatsApp Business API</h4>
            <p className="text-[11px] text-slate-400">Connect via Meta Business Manager → WhatsApp Business API credentials</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Phone Number ID *</label>
            <input type="text" value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} placeholder="123456789012345" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>WhatsApp Business Account ID</label>
            <input type="text" value={waBusinessId} onChange={e => setWaBusinessId(e.target.value)} placeholder="987654321098765" className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Permanent Access Token *</label>
            <div className="relative">
              <input type={showWaToken ? 'text' : 'password'} value={waToken} onChange={e => setWaToken(e.target.value)} placeholder="EAAxxxxxxxxxxxxxxx..." className={inputClass + ' pr-10'} />
              <button type="button" onClick={() => setShowWaToken(!showWaToken)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                {showWaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-900 space-y-1">
          <p className="font-bold">How to get these credentials:</p>
          <p>1. Go to developers.facebook.com → My Apps → Your App</p>
          <p>2. WhatsApp → Getting Started → find Phone Number ID and Token</p>
          <p>3. For production, generate a Permanent Token via System User in Business Manager</p>
        </div>

        {waTestResult && (
          <div className={`p-3 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${waTestResult === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {waTestResult === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{waTestResult === 'success' ? 'WhatsApp credentials verified successfully.' : 'Invalid credentials. Check Phone ID and Token.'}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleTestWhatsApp} disabled={waTesting || !waPhoneId || !waToken} className="px-4 py-2.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold rounded-lg transition disabled:opacity-40 cursor-pointer">
            {waTesting ? 'Verifying...' : 'Verify Credentials'}
          </button>
          <button onClick={handleSaveWhatsApp} disabled={!waPhoneId || !waToken} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5">
            {waSaved ? <><Check className="h-4 w-4" /> Saved!</> : 'Save WhatsApp Settings'}
          </button>
        </div>
      </div>

      {/* SMS TWILIO */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 border-b pb-3">
          <Phone className="h-5 w-5 text-sky-600" />
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800">SMS — Twilio Configuration</h4>
            <p className="text-[11px] text-slate-400">Connect your Twilio account to send real SMS to clients</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Twilio Account SID *</label>
            <input type="text" value={twilioSid} onChange={e => setTwilioSid(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>From Phone Number *</label>
            <input type="text" value={twilioFrom} onChange={e => setTwilioFrom(e.target.value)} placeholder="+12345678900" className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Twilio Auth Token *</label>
            <div className="relative">
              <input type={showTwilioToken ? 'text' : 'password'} value={twilioToken} onChange={e => setTwilioToken(e.target.value)} placeholder="Your Twilio auth token" className={inputClass + ' pr-10'} />
              <button type="button" onClick={() => setShowTwilioToken(!showTwilioToken)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                {showTwilioToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Test SMS — Send to number</label>
            <div className="flex gap-2">
              <input type="text" value={smsTestTo} onChange={e => setSmsTestTo(e.target.value)} placeholder="+254700000000" className={inputClass} />
              <button onClick={handleTestSms} disabled={smsTesting || !twilioSid || !twilioToken || !smsTestTo} className="px-4 py-2.5 border border-sky-300 text-sky-700 hover:bg-sky-50 text-xs font-bold rounded-lg transition disabled:opacity-40 cursor-pointer whitespace-nowrap">
                {smsTesting ? 'Sending...' : 'Send Test SMS'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-[11px] text-sky-900 space-y-1">
          <p className="font-bold">How to get Twilio credentials:</p>
          <p>1. Sign up at twilio.com → Console Dashboard</p>
          <p>2. Copy Account SID and Auth Token from the dashboard</p>
          <p>3. Buy or use a trial phone number as your From number</p>
        </div>

        <div className="bg-slate-50 border rounded-xl p-3 text-[11px] text-slate-500 mt-2">
          <p className="font-bold text-slate-700 mb-1">To enable real OTP SMS in signatures:</p>
          <p>Once you save your Twilio credentials above, the Electronic Signatures simulator will automatically use your Twilio account to send real OTP codes to signers' phone numbers.</p>
        </div>

        {smsTestResult && (
          <div className={`p-3 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${smsTestResult === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {smsTestResult === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{smsTestResult === 'success' ? 'Test SMS sent successfully.' : 'SMS failed. Check Twilio SID, token, and from number.'}</span>
          </div>
        )}

        <button onClick={handleSaveSms} disabled={!twilioSid || !twilioToken || !twilioFrom} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5">
          {smsSaved ? <><Check className="h-4 w-4" /> Saved!</> : 'Save SMS Settings'}
        </button>
      </div>
    </div>
  );
}
