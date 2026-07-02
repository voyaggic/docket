import React, { useState } from 'react';
import { 
  ArrowLeft, Check, Edit2, Loader2, Phone, Mail, Building2, User, Key, ShieldCheck, 
  Trash2, Star, CalendarCheck, FileCheck, HelpCircle, FileText, CheckCircle2, ChevronRight, AlertTriangle
} from 'lucide-react';
import { Client, Case } from '../../types';
import ClientProfileTabs from './ClientProfileTabs';

interface ClientProfilePanelProps {
  client: Client;
  cases: Case[];
  companyId: string;
  onRefresh: () => void;
  onClose: () => void;
}

export default function ClientProfilePanel({
  client,
  cases,
  companyId,
  onRefresh,
  onClose
}: ClientProfilePanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Client>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // Local helper update client
  const handleUpdate = async (updates: Partial<Client>) => {
    try {
      const res = await fetch(`/api/firm/${companyId}/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include'
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Update client error', err);
    }
  };

  const handleSaveAllEdits = async () => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/firm/${companyId}/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
        credentials: 'include'
      });
      if (res.ok) {
        setEditMode(false);
        setEditData({});
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditSaving(false);
    }
  };

  const handleStartEditing = () => {
    setEditData({
      fullName: client.fullName,
      phone: client.phone || '',
      email: client.email || '',
      idNumber: client.idNumber || '',
      address: client.address || '',
      occupation: client.occupation || '',
      organisation: client.organisation || '',
      notes: client.notes || '',
      clientCategory: client.clientCategory || 'individual',
      riskRating: client.riskRating || 'low',
      valueTier: client.valueTier || 'standard',
      isVip: client.isVip || false,
      conflictCheck: client.conflictCheck || 'not_performed',
      nextAction: client.nextAction || 'Onboarding checklist initiation',
      nextActionDue: client.nextActionDue || new Date(Date.now() + 86400000).toISOString().substring(0, 10),
      nextActionAssignedTo: client.nextActionAssignedTo || 'Alex Rivera'
    });
    setEditMode(true);
  };

  const handleDeleteClient = async () => {
    try {
      const res = await fetch(`/api/firm/${companyId}/clients/${client.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setDeleteConfirm(false);
        setDeleteInput('');
        onClose();
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Onboarding Checklist items helper
  const defaultChecklistKeys = [
    { key: 'conflict', label: 'Conflict of Interest check cleared' },
    { key: 'identity', label: 'Identity & ID verified' },
    { key: 'engagement', label: 'Engagement letter signed' },
    { key: 'terms', label: 'Terms and conditions accepted' },
    { key: 'retainer', label: 'Initial payment received' }
  ];

  const toggleOnboardingItem = async (key: string) => {
    const list = client.onboardingChecklist || {};
    const existed = list[key]?.checked || false;
    const updatedList = {
      ...list,
      [key]: {
        checked: !existed,
        date: new Date().toISOString().substring(0, 10),
        by: 'Alex Rivera'
      }
    };
    
    // Check if total checked === all keys checked
    const totalChecked = Object.keys(updatedList).filter(k => updatedList[k].checked).length;
    const isFinished = totalChecked >= defaultChecklistKeys.length;

    await handleUpdate({
      onboardingChecklist: updatedList,
      onboardingComplete: isFinished
    });
  };

  const finishedCount = defaultChecklistKeys.filter(item => client.onboardingChecklist?.[item.key]?.checked).length;
  const onboardingPercent = Math.round((finishedCount / defaultChecklistKeys.length) * 100);

  const initials = client.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden min-w-0" id="client-panel-workstation">
      
      {/* 4.1 Sticky Profile Header bar */}
      <div className="bg-white border-b border-slate-250/60 p-4 sm:p-5 sm:px-6 shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xxs sticky top-0 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-xl border hover:bg-slate-100 transition mr-1"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </button>
          
          {/* Avatar Icon customizable */}
          <div className="relative group shrink-0">
            <div 
              className="h-14 w-14 rounded-2xl text-white flex items-center justify-center text-sm font-black shadow-sm"
              style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
            >
              {client.photo ? (
                <img src={client.photo} alt={client.fullName} className="h-full w-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
              ) : (
                <span className="tracking-tight text-md font-black">{initials}</span>
              )}
            </div>
            <button
              onClick={() => {
                const url = prompt('Enter photorealistic JPG URL:');
                if (url) handleUpdate({ photo: url });
              }}
              className="absolute -bottom-1 -right-1 bg-white border border-slate-205 shadow p-1 rounded-lg text-[9px] hover:bg-slate-100 text-slate-600 font-extrabold max-h-[22px]"
            >
              EDIT
            </button>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {editMode ? (
                <input
                  type="text"
                  value={editData.fullName || ''}
                  onChange={e => setEditData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="text-base font-black border border-slate-200 bg-slate-50 p-1.5 rounded-xl outline-none"
                />
              ) : (
                <h2 className="text-base font-black text-slate-900 truncate tracking-tight">{client.fullName}</h2>
              )}
              
              {/* VIP Star rating toggle system */}
              <button
                onClick={() => handleUpdate({ isVip: !client.isVip })}
                className={`p-1 rounded-lg border transition cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center ${
                  client.isVip 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm' 
                    : 'bg-white hover:bg-slate-100 text-slate-400 border-slate-200'
                }`}
                title="VIP status marker toggle"
              >
                <Star className="h-3.5 w-3.5 fill-current" />
              </button>

              <span className="text-[10px] font-black uppercase bg-slate-950 text-white px-2 py-0.5 rounded capitalize">
                {client.clientCategory || 'individual'}
              </span>
            </div>

            {/* Quick dial actions click-to-call direct protocols */}
            <div className="flex items-center gap-3.5 mt-1.5 flex-wrap">
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  onClick={() => {
                    // Logs telephone action simulation
                    const calls = client.calls || [];
                    handleUpdate({
                      calls: [
                        ...calls,
                        {
                          id: `call-${Date.now()}`,
                          calledAt: new Date().toISOString(),
                          direction: 'outbound',
                          outcome: 'Connected (Tel VoIP trigger)',
                          loggedBy: 'Alex Rivera',
                          notes: 'Click-to-call initiated telephonically.'
                        }
                      ]
                    });
                  }}
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100"
                >
                  <Phone className="h-3 w-3" /> {client.phone}
                </a>
              )}
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/"
                >
                  <Mail className="h-3 w-3" /> {client.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action controls button groups */}
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => { setEditMode(false); setEditData({}); }}
                className="text-xs font-extrabold text-slate-500 hover:bg-slate-200/50 px-4 py-2.5 rounded-xl transition cursor-pointer min-h-[44px]"
              >
                Discard
              </button>
              <button
                onClick={handleSaveAllEdits}
                disabled={editSaving}
                className="text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer min-h-[44px]"
              >
                {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Commit Edits
              </button>
            </>
          ) : (
            <button
              onClick={handleStartEditing}
              className="text-xs font-extrabold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-4.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xxs transition cursor-pointer min-h-[44px]"
            >
              <Edit2 className="h-3.5 w-3.5" /> Modify Fields
            </button>
          )}
        </div>
      </div>

      {/* Main workplace canvas scrollable client metrics page */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">

        {/* 4.3 NEXT RELATIONSHIP ACTION INDICATOR CARD */}
        <div className={`p-4 rounded-xl border bg-white shadow-xxs flex items-center justify-between gap-4 flex-wrap border-l-4 ${
          new Date(client.nextActionDue || '') < new Date() ? 'border-l-red-500' : 'border-l-amber-500'
        }`}>
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Next Planned Operational Action Target</span>
            {editMode ? (
              <input
                type="text"
                value={editData.nextAction || ''}
                onChange={e => setEditData(prev => ({ ...prev, nextAction: e.target.value }))}
                className="text-xs font-semibold p-1 border rounded bg-slate-50"
              />
            ) : (
              <p className="text-xs font-bold text-slate-800">{client.nextAction || 'Onboarding compliance document gathering'}</p>
            )}
            <p className="text-[10px] text-slate-400 font-semibold font-mono">
              Due Date: {client.nextActionDue || '2026-06-08'} · Assigned Ownership: {client.nextActionAssignedTo || 'Alex Rivera'}
            </p>
          </div>
          <button
            onClick={() => handleUpdate({ nextAction: 'Cleared', nextActionDue: '', onboardingComplete: true })}
            className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1 border border-emerald-100 min-h-[44px]"
          >
            <Check className="h-3.5 w-3.5" /> Complete Action
          </button>
        </div>

        {/* 4.4 ONBOARDING PROGRESSIVE TRACKER CHECKLIST */}
        <div className="bg-white border rounded-[22px] p-5 shadow-xxs space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <FileCheck className="h-4.5 w-4.5 text-emerald-500" /> Intake Onboarding progressive Checklist
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Check progress milestones relative to regulatory law requirements</p>
            </div>
            
            {client.onboardingComplete ? (
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full uppercase flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Checked & Complete
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-24 bg-slate-100 rounded-full h-2">
                  <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${onboardingPercent}%` }}></div>
                </div>
                <span className="text-[10px] font-black text-slate-600">{onboardingPercent}% ({finishedCount} of 5)</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 items-end">
            {defaultChecklistKeys.map(item => {
              const isChecked = client.onboardingChecklist?.[item.key]?.checked || false;
              return (
                <button
                  key={item.key}
                  onClick={() => toggleOnboardingItem(item.key)}
                  className={`p-3.5 rounded-xl border text-left transition text-xs flex items-center gap-3 cursor-pointer min-h-[44px] ${
                    isChecked 
                      ? 'bg-emerald-50/20 border-emerald-200 text-emerald-800' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/50'
                  }`}
                >
                  <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center ${
                    isChecked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                  }`}>
                    {isChecked && <Check className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold truncate">{item.label}</p>
                    <p className="text-[9px] text-slate-400">
                      {isChecked ? `Done by: ${client.onboardingChecklist?.[item.key]?.by}` : 'Pending collection'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4.5 MULTI-SECTION TABBED WORK AREAS */}
        <ClientProfileTabs
          client={client}
          cases={cases}
          editMode={editMode}
          editData={editData}
          setEditData={setEditData}
          onUpdateClient={handleUpdate}
          currentUser={{ fullName: 'Alex Rivera' }}
        />

        {/* Danger zone panel deletion */}
        <div className="bg-white rounded-[22px] border border-red-200 p-5 shadow-xxs space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <span className="text-xs font-black uppercase text-red-700 tracking-wider">Docket Tenancy Danger Zone</span>
          </div>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-xs font-bold text-red-500 border border-red-200 bg-red-50/30 hover:bg-red-50 px-4.5 py-2.5 rounded-xl transition cursor-pointer min-h-[44px]"
            >
              Exile & Purge client dossier
            </button>
          ) : (
            <div className="space-y-3 bg-red-50/50 p-4 rounded-xl border border-red-200 animate-fade-in text-xs">
              <p className="font-extrabold text-red-900">This action will delete {client.fullName} from core registers permanently.</p>
              <input
                type="text"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="Type name to confirm deletion..."
                className="w-full text-xs border border-red-200 bg-white rounded-lg p-2.5 outline-none font-bold"
              />
              <div className="flex gap-2">
                <button onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }} className="px-3 py-1.5 bg-white border rounded">Close</button>
                <button
                  onClick={handleDeleteClient}
                  disabled={deleteInput !== client.fullName}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold disabled:opacity-40"
                >
                  Permanently Exile Dossier
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
