import React, { useState } from 'react';
import { 
  Bell, Check, RefreshCw, AlertTriangle, AlertCircle, Trash, HelpCircle, Send, CheckCircle2, ShieldAlert 
} from 'lucide-react';

interface ReminderLogTabProps {
  roster: any[];
}

export default function ReminderLogTab({ roster }: ReminderLogTabProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'SENT' | 'UPCOMING' | 'ACKS'>('SENT');
  const [logItems, setLogItems] = useState([
    { id: '1', title: 'File Reply to Defense Case', when: '2026-06-06 14:00', recipient: 'Alex Rivera', channel: 'Email', status: 'Delivered', ack: true },
    { id: '2', title: 'Client consultation briefing', when: '2026-06-07 09:30', recipient: 'Elena Rostova', channel: 'SMS', status: 'Delivered', ack: false },
    { id: '3', title: 'Supreme Court mention attendance', when: '2026-06-05 10:00', recipient: 'Elena Rostova', channel: 'WhatsApp', status: 'Delivered', ack: true }
  ]);

  const [upcomingItems, setUpcomingItems] = useState([
    { id: 'u1', title: 'Pleading submissions review', due: '2026-06-12 11:00', interval: '3-day reminder', channel: 'Email' },
    { id: 'u2', title: 'Mediation prep checklist', due: '2026-06-18 16:30', interval: '7-day reminder', channel: 'Email/SMS' }
  ]);

  const handleResend = (id: string) => {
    setSuccessMessage(`Alert Resent! Notification ID: ${id} has been re-enqueued to delivery systems.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleCancelUpcoming = (id: string) => {
    setUpcomingItems(upcomingItems.filter(item => item.id !== id));
  };

  const handleAcknowledge = (id: string) => {
    setLogItems(logItems.map(item => item.id === id ? { ...item, ack: true } : item));
  };

  return (
    <div className="bg-white border rounded-2xl p-5 space-y-4 text-xxs" id="reminder-activity-logs">
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-2 mb-2 select-none animate-fade-in">
          <span>{successMessage}</span>
        </div>
      )}
      {/* Tab Switcher menu */}
      <div className="flex justify-between items-center pb-2 border-b">
        <div className="flex items-center gap-1.5">
          <Bell className="h-5 w-5 text-sky-500" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 font-sans">Section 15: Reminder Activity Log Audit</h4>
            <p className="text-[10px] text-slate-400 font-semibold font-sans">Immutable transaction trace of system messaging, emails, and phone alerts.</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-0.5 rounded-lg select-none font-extrabold text-[10px]">
          {(['SENT', 'UPCOMING', 'ACKS'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`p-1.5 px-3.5 rounded-md cursor-pointer transition ${activeTab === tab ? 'bg-white shadow text-slate-800' : 'text-slate-450 hover:text-slate-700'}`}
            >
              {tab === 'SENT' && 'Sent Log'}
              {tab === 'UPCOMING' && 'Upcoming Alarms'}
              {tab === 'ACKS' && 'Acknowledgements'}
            </button>
          ))}
        </div>
      </div>

      {/* VIEWPORT CONTROLLER */}
      {activeTab === 'SENT' && (
        <div className="space-y-2">
          {logItems.map(log => (
            <div key={log.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center text-slate-705">
              <div className="space-y-1">
                <span className="text-[8px] bg-slate-200 text-slate-655 px-1.5 py-0.5 rounded font-black font-sans uppercase">
                  Channel: {log.channel}
                </span>
                <p className="font-extrabold text-slate-850 text-[11px] leading-tight">{log.title}</p>
                <div className="flex items-center gap-1.5 text-slate-450 text-[9.5px]">
                  <span>Sent to: <b className="text-slate-550">{log.recipient}</b></span>
                  <span>&bull;</span>
                  <span className="font-mono">{log.when}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 px-1.5 py-0.5 rounded font-black font-sans uppercase">
                    Received OK
                  </span>
                  {log.ack ? (
                    <span className="text-[9px] text-emerald-600 block font-bold font-sans mt-0.5">✓ Acknowledged</span>
                  ) : (
                    <button 
                      onClick={() => handleAcknowledge(log.id)}
                      className="text-[9px] text-sky-550 hover:underline block font-sans mt-0.5 font-bold"
                    >
                      Mark Signed-off
                    </button>
                  )}
                </div>

                <button 
                  onClick={() => handleResend(log.id)}
                  className="p-1 px-3 bg-white border rounded hover:bg-slate-50 text-slate-600 font-bold font-sans cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Resend</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'UPCOMING' && (
        <div className="space-y-2">
          {upcomingItems.map(up => (
            <div key={up.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-[8px] bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded font-black font-sans uppercase">
                  {up.interval}
                </span>
                <p className="font-extrabold text-slate-850 text-[11px]">{up.title}</p>
                <p className="text-slate-400 text-[10px]">Expected queue dispatch on: <b className="font-mono">{up.due}</b> via <b className="text-slate-500">{up.channel}</b></p>
              </div>

              <div className="flex gap-1.5">
                <button 
                  onClick={() => handleCancelUpcoming(up.id)}
                  className="p-1 px-3 border border-red-200 hover:bg-red-50 text-red-650 rounded-lg font-bold font-sans cursor-pointer whitespace-nowrap"
                >
                  Mute Alarm
                </button>
                <button 
                  onClick={() => handleResend(up.id)}
                  className="p-1 px-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold font-sans cursor-pointer whitespace-nowrap"
                >
                  Trigger Instantly
                </button>
              </div>
            </div>
          ))}
          {upcomingItems.length === 0 && (
            <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
              No upcoming automatic alarms in queue scheduler.
            </div>
          )}
        </div>
      )}

      {activeTab === 'ACKS' && (
        <div className="space-y-2">
          <div className="bg-slate-550 bg-slate-800 text-white p-3 rounded-xl flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-semibold text-[10.5px]">Risk compliance monitoring is active. All alerts require counselor signatures.</span>
          </div>

          {logItems.map(log => {
            return (
              <div key={log.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center text-slate-705">
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-800 leading-tight">{log.title}</p>
                  <p className="text-[10px] text-slate-405">Counsel assigned: <b className="text-slate-550">{log.recipient}</b></p>
                </div>

                <div>
                  {log.ack ? (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 px-2 py-1 rounded font-black font-sans uppercase">
                      ✓ Sign-off Complete
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="bg-amber-50 text-amber-800 border border-amber-250 px-2 py-1 rounded font-black font-sans uppercase animate-pulse">
                        ⚠️ Pending Sign-off
                      </span>
                      <button 
                        onClick={() => handleAcknowledge(log.id)}
                        className="p-1 px-2.2 bg-sky-500 hover:bg-sky-600 text-white rounded font-bold cursor-pointer"
                      >
                        Sign
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
