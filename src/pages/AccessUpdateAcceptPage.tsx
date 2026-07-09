/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scale, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';

export const AccessUpdateAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pageLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    cases: 'Cases',
    clients: 'Clients',
    reminders: 'Deadlines & Reminders',
    updates: 'Client Updates',
    documents: 'Documents',
    chat: 'Team Chat',
    settings: 'Settings'
  };

  useEffect(() => {
    if (!token) {
      setError('Missing token');
      setLoading(false);
      return;
    }
    fetch(`/api/access-update/${token}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('invalid_or_expired');
        }
        return res.json();
      })
      .then(data => {
        if (data.expired || !data.isActive) {
          throw new Error('expired');
        }
        setDetails(data);
      })
      .catch(() => {
        setError('This link is invalid, expired, or already used.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/access-update/${token}/apply`, {
        method: 'POST'
      });
      if (res.ok) {
        setDone(true);
      } else {
        setError('Failed to apply this update.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-950" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border-2 border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
        <div className="flex flex-col items-center">
          <div className="bg-slate-900 text-white p-2.5 rounded-xl">
            <Scale className="h-6 w-6 text-sky-400" />
          </div>
          <h2 className="mt-3 text-lg font-black text-slate-900 uppercase tracking-widest">Docket</h2>
        </div>

        {error ? (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="bg-red-50 p-3.5 rounded-full border border-red-200 text-red-600">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <p className="text-xs text-slate-650 font-semibold">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-slate-950 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Go to login
            </button>
          </div>
        ) : done ? (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="bg-emerald-50 p-3.5 rounded-full border border-emerald-200 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-xs text-slate-650 font-semibold">Your access has been updated. Log in again to see the changes.</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Go to login
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <h3 className="text-sm font-black text-slate-900">Hello {details?.fullName},</h3>
            
            {details?.proposedRole || details?.proposedTask ? (
              <div className="space-y-3 text-left bg-slate-50 border p-4 rounded-xl">
                {details?.proposedRole && (
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Proposed Role Update</span>
                    <span className="text-xs font-black text-slate-800 bg-slate-200/60 px-2 py-0.5 rounded uppercase mt-1 inline-block">
                      {details.proposedRole}
                    </span>
                  </div>
                )}
                
                {details?.proposedTask && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Proposed Delegated Task</span>
                    <h4 className="text-xs font-bold text-slate-900 mt-1">{details.proposedTask.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed bg-white border p-2 rounded-lg max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {details.proposedTask.description || 'No description provided.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-650 font-semibold">Your access is being updated to:</p>
                <div className="p-3 bg-slate-50 border rounded-xl text-xs font-bold text-blue-700">
                  {details?.proposedAllowedPages?.length
                    ? details.proposedAllowedPages.map((p: string) => pageLabels[p] || p).join(', ')
                    : 'Full firm access'}
                </div>
              </>
            )}

            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {applying ? 'Applying...' : 'Confirm & Apply Update'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessUpdateAcceptPage;
