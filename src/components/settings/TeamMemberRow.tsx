/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Edit, ToggleLeft, ToggleRight, Mail, Loader2 } from 'lucide-react';

interface Props {
  member: any;
  companyId: string;
  delegatablePages: { key: string; label: string }[];
  onChanged: () => void;
  showToast: (msg: string) => void;
  key?: any;
}

export default function TeamMemberRow({ member, companyId, delegatablePages, onChanged, showToast }: Props) {
  const [editing, setEditing] = useState(false);
  const [pages, setPages] = useState<string[]>(member.allowedPages || []);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState(member.role || 'LAWYER');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  const togglePage = (key: string) => {
    setPages(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const handleToggleActive = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/firm/${companyId}/users/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !member.isActive })
      });
      if (res.ok) {
        showToast(member.isActive ? `Access revoked for ${member.fullName}. They can no longer log in.` : `Access restored for ${member.fullName}.`);
        onChanged();
      } else {
        showToast('Failed to change user access status');
      }
    } catch {
      showToast('Network error while toggling access status');
    } finally {
      setBusy(false);
    }
  };

  // Sends an email link the team member must click to confirm the access change.
  const handleSendAccessUpdate = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/firm/${companyId}/users/${member.id}/access-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ allowedPages: pages })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.emailSent ? `Update link emailed to ${member.email}` : 'Update created — email not sent (check email config)');
        setEditing(false);
      } else {
        showToast(data.error || 'Failed to send update');
      }
    } catch {
      showToast('Network error while requesting access update');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateRoleAndAssignTask = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/firm/${companyId}/users/${member.id}/role-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role, taskTitle, taskDescription })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.emailSent ? `Role updated & task assigned to ${member.fullName} via email!` : `Role updated & task assigned successfully!`);
        setTaskTitle('');
        setTaskDescription('');
        setEditing(false);
        onChanged();
      } else {
        showToast(data.error || 'Failed to update role or assign task');
      }
    } catch {
      showToast('Network error while requesting role & task delegation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <tr className="hover:bg-slate-50/50">
        <td className="p-3 font-bold text-slate-800">{member.fullName}</td>
        <td className="p-3"><span className="p-0.5 px-2 bg-blue-50 border border-blue-100 text-blue-700 rounded font-bold text-[10px]">{member.role}</span></td>
        <td className="p-3 text-slate-500">{member.allowedPages?.length ? member.allowedPages.join(', ') : 'Full access'}</td>
        <td className="p-3">
          {member.isActive ? (
            <span className="p-0.5 px-2 bg-emerald-50 text-emerald-800 font-black rounded-full text-[9px] border border-emerald-100">Active</span>
          ) : (
            <span className="p-0.5 px-2 bg-rose-50 text-rose-700 font-black rounded-full text-[9px] border border-rose-100">Revoked</span>
          )}
        </td>
        <td className="p-3 text-center flex items-center justify-center gap-1.5">
          <button onClick={() => setEditing(!editing)} title="Edit page access" className="p-1 hover:bg-blue-50 border rounded text-blue-500 cursor-pointer">
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleToggleActive} disabled={busy} title={member.isActive ? 'Revoke access' : 'Restore access'}
            className={`p-1 border rounded cursor-pointer ${member.isActive ? 'hover:bg-rose-50 text-rose-500' : 'hover:bg-emerald-50 text-emerald-600'}`}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : member.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          </button>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={5} className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="space-y-4 text-left">
              {/* Section 1: Page Access Delegation */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">1. Delegated Page Access (Emailed Link Confirmation)</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                  {delegatablePages.map(p => (
                    <label key={p.key} className={`flex items-center gap-1.5 p-1.5 border rounded-lg cursor-pointer text-[10px] font-bold ${pages.includes(p.key) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input type="checkbox" checked={pages.includes(p.key)} onChange={() => togglePage(p.key)} className="rounded text-blue-600" />
                      {p.label}
                    </label>
                  ))}
                </div>
                <button onClick={handleSendAccessUpdate} disabled={busy}
                  className="px-3 py-1.5 bg-blue-650 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition">
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                  Email Access Update Link
                </button>
              </div>

              {/* Section 2: Role Editing & Task Assignment */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">2. Edit Role & Delegate Task (Instant Email Notification)</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Assign Role</label>
                    <select 
                      value={role} 
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full text-[10px] font-bold border border-slate-200 p-2 rounded-lg bg-white cursor-pointer focus:border-blue-500"
                    >
                      <option value="LAWYER">Lawyer</option>
                      <option value="PARALEGAL">Paralegal</option>
                      <option value="SECRETARY">Secretary</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Task Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Draft appeal motion" 
                      value={taskTitle} 
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full text-[10px] font-bold border border-slate-200 p-2 rounded-lg bg-white focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Task Description</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Please file by next Friday" 
                      value={taskDescription} 
                      onChange={(e) => setTaskDescription(e.target.value)}
                      className="w-full text-[10px] font-bold border border-slate-200 p-2 rounded-lg bg-white focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button 
                    onClick={handleUpdateRoleAndAssignTask} 
                    disabled={busy || !taskTitle}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-extrabold uppercase rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    Update Role & Delegate Task
                  </button>
                </div>
              </div>

            </div>
          </td>
        </tr>
      )}
    </>
  );
}
