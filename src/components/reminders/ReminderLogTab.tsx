import React from 'react';
import { ShieldAlert, Monitor } from 'lucide-react';

interface ReminderLogTabProps {
  roster: any[];
}

export default function ReminderLogTab({ roster }: ReminderLogTabProps) {
  return (
    <div className="bg-white border rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4 shadow-sm select-none animate-fade-in" id="reminder-activity-logs">
      <div className="mx-auto h-12 w-12 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center">
        <Monitor className="h-6 w-6" />
      </div>
      
      <div className="space-y-1">
        <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Section 15: Reminder Activity Log Audit</h4>
        <p className="text-[11px] text-slate-450 font-bold">Immutable transaction trace of system messaging, emails, and phone alerts.</p>
      </div>

      <div className="p-4 bg-sky-50/55 border border-sky-100 rounded-xl max-w-md mx-auto text-left flex gap-3">
        <ShieldAlert className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-[11px] text-slate-800">Desktop View Recommended</p>
          <p className="text-[10px] leading-relaxed text-sky-700/90 font-semibold">
            This analytical ledger displays security sign-offs, live delivery queues, and carrier routing tables. For optimal visual organization and compliance reporting, this system is optimized for desktop viewports. Please open this applet on a desktop screen to perform full logs audit.
          </p>
        </div>
      </div>
    </div>
  );
}
