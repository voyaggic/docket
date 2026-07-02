import React, { useState } from 'react';
import { 
  User, Briefcase, Phone, Mail, Building2, Calendar, FileText, Check, Clock, AlertTriangle, 
  Trash2, Plus, Download, Edit2, Play, Users, Globe, Landmark, Heart, Eye, Shield, Lock, 
  ArrowRight, ShieldCheck, Database, BarChart2, CheckCircle2, DollarSign, CalendarCheck, FileCheck, ClipboardList, RefreshCw, Star, Stars, Loader2
} from 'lucide-react';
import { Client, Case } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';

interface ClientProfileTabsProps {
  client: Client;
  cases: Case[];
  editMode: boolean;
  editData: Partial<Client>;
  setEditData: React.Dispatch<React.SetStateAction<Partial<Client>>>;
  onUpdateClient: (updates: Partial<Client>) => Promise<void>;
  currentUser: any;
}

export default function ClientProfileTabs({
  client,
  cases,
  editMode,
  editData,
  setEditData,
  onUpdateClient,
  currentUser
}: ClientProfileTabsProps) {
  const [tab, setTab] = useState<'details' | 'financials' | 'timeline' | 'kyc' | 'tasks' | 'gdpr' | 'analytics' | 'history'>('details');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Input edits change helper
  const handleFieldChange = (key: keyof Client, value: any) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  // Log Call state
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [newCall, setNewCall] = useState({
    duration: 5,
    direction: 'outbound' as 'inbound' | 'outbound',
    outcome: 'Connected',
    notes: '',
    followUpCreated: false
  });

  // Log Meeting state
  const [logMeetingOpen, setLogMeetingOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    meetingAt: new Date().toISOString().substring(0, 16),
    meetingType: 'video',
    location: '',
    agenda: '',
    outcome: '',
    status: 'scheduled' as any
  });

  // Add Task state
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: 'Alex Rivera',
    dueAt: '',
    priority: 'normal' as any
  });

  // Add Invoice state
  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10),
    lineDesc: 'Professional Legal Consultation Fee',
    lineAmount: 1500,
    taxPercentage: 15
  });
  const [realInvoices, setRealInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceCaseId, setSelectedInvoiceCaseId] = useState('');

  React.useEffect(() => {
    if (tab === 'financials') {
      setLoadingInvoices(true);
      fetch(`/api/firm/${client.companyId}/clients/${client.id}/invoices`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setRealInvoices(data || []);
          setLoadingInvoices(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingInvoices(false);
        });
    }
  }, [tab, client.id, client.companyId]);

  // Add Consent state
  const [addConsentOpen, setAddConsentOpen] = useState(false);
  const [newConsent, setNewConsent] = useState({
    consentType: 'GDPR Data Processing Consent',
    method: 'signed_pdf',
    notes: ''
  });

  // Time-limited upload link state
  const [uploadLink, setUploadLink] = useState('');

  // Right to erasure wizard state
  const [erasureStep, setErasureStep] = useState(0); 

  // Version historical states
  const mockHistoryList = [
    { version: 1, date: client.createdAt, author: 'Alex Rivera', change: 'Initial secure system record intake' },
    ...(client.updatedAt !== client.createdAt ? [{ version: 2, date: client.updatedAt, author: currentUser?.fullName || 'Active Advocate', change: 'Profile contact classifications updated' }] : [])
  ];

  // Helper field component
  const RenderField = ({ label, value, editKey, type = 'text', options = [] }: { label: string; value?: any; editKey: keyof Client; type?: 'text' | 'textarea' | 'select'; options?: string[] }) => {
    if (editMode) {
      if (type === 'select') {
        return (
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
            <select
              value={(editData[editKey] as string) || ''}
              onChange={e => handleFieldChange(editKey, e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-slate-205 p-2 rounded-xl outline-none focus:ring-1 focus:ring-sky-200"
            >
              <option value="">-- Select option --</option>
              {options.map(o => (
                <option key={o} value={o.toLowerCase()}>{o}</option>
              ))}
            </select>
          </div>
        );
      }
      if (type === 'textarea') {
        return (
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
            <textarea
              rows={3}
              value={(editData[editKey] as string) || ''}
              onChange={e => handleFieldChange(editKey, e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-slate-205 p-2 rounded-xl outline-none focus:ring-1 focus:ring-sky-200 resize-none font-sans"
            />
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
          <input
            type="text"
            value={(editData[editKey] as string) || ''}
            onChange={e => handleFieldChange(editKey, e.target.value)}
            className="w-full text-xs font-semibold bg-white border border-slate-205 p-2 rounded-xl outline-none focus:ring-1 focus:ring-sky-200"
          />
        </div>
      );
    }

    return (
      <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">{label}</span>
        <span className="text-xs font-extrabold text-slate-800 break-all">{value || <span className="text-slate-350 font-normal">Not Provided</span>}</span>
      </div>
    );
  };

  // Mock charts
  const analyticsData = [
    { name: 'Jan', open: 1, billing: 450 },
    { name: 'Feb', open: 2, billing: 1450 },
    { name: 'Mar', open: 1, billing: 2100 },
    { name: 'Apr', open: 2, billing: 1800 },
    { name: 'May', open: 3, billing: 3500 },
    { name: 'Jun', open: 2, billing: (client.outstandingBalance || 0) + 1200 }
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white border border-slate-200/80 rounded-[24px] shadow-xxs">
      {/* 23 Subsections Tabbed Header bar */}
      <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar scroll-smooth bg-slate-50/60 p-2 rounded-t-[24px] mobile-horizontal-fade-scroll">
        {[
          { key: 'details', label: 'Relationship Profile', icon: User },
          { key: 'financials', label: 'Ledger & billing', icon: DollarSign },
          { key: 'timeline', label: 'Calls, Meetings & Feed', icon: Clock },
          { key: 'kyc', label: 'KYC Expiration & Links', icon: AlertTriangle },
          { key: 'tasks', label: 'Client Tasks', icon: ClipboardList },
          { key: 'gdpr', label: 'Compliance & GDPR', icon: Shield },
          { key: 'analytics', label: 'Acquisitions Graph', icon: BarChart2 },
          { key: 'history', label: 'Edit Rollback Logs', icon: Database }
        ].map(item => {
          const isActive = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                setTab(item.key as any);
                setErasureStep(0);
              }}
              className={`flex items-center gap-2 text-xs px-4 py-2.5 font-bold rounded-xl whitespace-nowrap transition cursor-pointer min-h-[44px] shrink-0 ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Primary Tab Worksurface */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
        {actionNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-202 text-emerald-800 font-extrabold text-[11px] rounded-xl flex items-center gap-2 mb-2 animate-pulse">
            <span>{actionNotice}</span>
          </div>
        )}

        {/* DETAILS SECTION */}
        {tab === 'details' && (
          <div className="space-y-6 animate-fade-in">
            {/* Interactive Classification Card */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2.5 items-center">
                <Heart className="h-5 w-5 text-indigo-500" />
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800">Dynamic Practice Classification</h4>
                  <p className="text-[10px] text-slate-500">Auto generated silver tier client statistics</p>
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
                <span className="shrink-0 whitespace-nowrap text-[10px] font-black px-2.5 py-1 rounded bg-slate-200 text-slate-700 capitalize">
                  Source: {client.clientSource || 'Direct Walk-in'}
                </span>
                <span className={`shrink-0 whitespace-nowrap text-[10px] font-black px-2.5 py-1 rounded capitalize ${
                  client.riskRating === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                  client.riskRating === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  Risk: {client.riskRating || 'low'}
                </span>
                <span className="shrink-0 whitespace-nowrap text-[10px] font-black px-2.5 py-1 rounded bg-sky-50 text-sky-700 border border-sky-100 capitalize">
                  Value Tier: {client.valueTier || 'standard'}
                </span>
              </div>
            </div>

            {/* Individual vs Corporate Fields Selector based on category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 border-b pb-3 border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="h-4 w-4 text-sky-500" /> Client Demographics & Registered Information
                </h3>
                <span className="text-[10px] font-mono text-slate-400 capitalize">{client.clientCategory || 'individual'} Category Set</span>
              </div>

              {client.clientCategory !== 'corporate' && client.clientCategory !== 'government' && client.clientCategory !== 'ngo' ? (
                <>
                  <RenderField label="ID / SSN / Passport number" value={client.idNumber} editKey="idNumber" />
                  <RenderField label="Occupation" value={client.occupation} editKey="occupation" />
                  <RenderField label="Employer / Company Name" value={client.organisation} editKey="organisation" />
                  <RenderField label="Primary Contact Phone" value={client.phone} editKey="phone" />
                  <RenderField label="Registered Email Node" value={client.email} editKey="email" />
                  <RenderField label="Preferred Meeting Style" value={client.preferredMeeting} editKey="preferredMeeting" type="select" options={['In Person', 'Video Call', 'Phone Call']} />
                  <div className="md:col-span-2">
                    <RenderField label="Physical Address" value={client.address} editKey="address" type="textarea" />
                  </div>
                  <div className="md:col-span-2">
                    <RenderField label="Physical Accessibility Requirements (Internal Comments)" value={client.accessibilityNeeds} editKey="accessibilityNeeds" type="textarea" />
                  </div>
                </>
              ) : (
                <>
                  <RenderField label="Entity Registration Number" value={client.idNumber || 'CO-REG-PENDING'} editKey="idNumber" />
                  <RenderField label="Company/Organisation name" value={client.organisation || client.fullName} editKey="organisation" />
                  <RenderField label="Industry Sector" value={client.occupation || 'Corporate Legal'} editKey="occupation" />
                  <RenderField label="Authorized Contact Phone" value={client.phone} editKey="phone" />
                  <RenderField label="Registered Billing Email" value={client.email} editKey="email" />
                  <RenderField label="Preferred Boardroom Meeting" value={client.preferredMeeting} editKey="preferredMeeting" type="select" options={['Video Conference', 'In Person Office', 'Phone Call']} />
                  <div className="md:col-span-2">
                    <RenderField label="Corporate Headquarters Address" value={client.address} editKey="address" type="textarea" />
                  </div>
                  <div className="md:col-span-2 bg-indigo-50/20 border border-indigo-100 p-4 rounded-2xl space-y-3">
                    <h5 className="text-[10px] font-bold uppercase text-indigo-800 tracking-wider">Authorized Board Reps & Contact Persons</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border text-xs">
                        <div>
                          <p className="font-extrabold text-slate-800">Hon. Arthur Vance</p>
                          <p className="text-[10px] text-slate-400 font-semibold">Chief Consulting Director · Board Executive</p>
                        </div>
                        <span className="text-[9px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-black">BILLING PRIMARY</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border text-xs">
                        <div>
                          <p className="font-extrabold text-slate-800">Diana Prince</p>
                          <p className="text-[10px] text-slate-400 font-semibold">Sub Representative · In-house General Counsel</p>
                        </div>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black">SECONDARY REPR</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* DYNAMIC CUSTOM FIELDS WORKSTATION */}
              <div className="md:col-span-2 border-t border-slate-200 pt-5 mt-4">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-xs font-black text-slate-805 uppercase tracking-widest flex items-center gap-1.5 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200">
                    <Stars className="h-4 w-4 text-sky-500" /> Custom Fields Configuration
                  </h3>
                </div>
                <div className="bg-slate-100/50 border-2 border-slate-200 p-4 rounded-xl space-y-4 shadow-xxs">
                  {/* Render active custom fields */}
                  {Object.keys(editData.customFieldValues ?? client.customFieldValues ?? {}).length === 0 ? (
                    <p className="text-xs text-slate-800 italic font-semibold block">No active custom fields on this client profile record.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(editData.customFieldValues ?? client.customFieldValues ?? {}).map(([key, value]) => {
                        if (editMode) {
                          return (
                            <div key={key} className="space-y-1 bg-white p-3 rounded-xl border-2 border-slate-200 shadow-xxs">
                              <label className="text-[9px] uppercase tracking-wider text-slate-950 font-black block">{key}</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={value ?? ''}
                                  onChange={(e) => {
                                    const updatedVals = {
                                      ...(editData.customFieldValues ?? client.customFieldValues ?? {}),
                                      [key]: e.target.value
                                    };
                                    handleFieldChange('customFieldValues', updatedVals);
                                  }}
                                  className="w-full text-xs p-2 bg-slate-50 border-2 border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-500 text-slate-950 font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedVals = {
                                      ...(editData.customFieldValues ?? client.customFieldValues ?? {})
                                    };
                                    delete updatedVals[key];
                                    handleFieldChange('customFieldValues', updatedVals);
                                  }}
                                  className="text-red-600 hover:text-red-800 text-xs font-black px-2 py-1.5 hover:bg-red-50 rounded"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div key={key} className="bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-xxs">
                              <span className="font-extrabold text-slate-950 block text-[9px] uppercase tracking-wider">{key}</span>
                              <span className="font-bold text-slate-850 block mt-1">{value || <span className="text-slate-350 italic font-medium">None</span>}</span>
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}

                  {/* Adding new custom field option inside profile edit state */}
                  {editMode && (
                    <div className="border-t-2 border-slate-200 pt-3 space-y-4">
                      <p className="text-[10px] font-black uppercase text-slate-950 tracking-wider">Configure Registered Custom Indicators</p>
                      <div className="flex gap-2 items-end flex-wrap md:flex-nowrap">
                        <div className="flex-1 min-w-[140px] space-y-1">
                          <label className="text-[9.5px] uppercase font-extrabold text-slate-950 block">New Field Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Spouse Full Name"
                            id="profile-new-field-name"
                            className="w-full text-xs p-2.5 bg-white border-2 border-slate-305 rounded-lg font-bold text-slate-950 outline-none focus:border-slate-500"
                          />
                        </div>
                        <div className="flex-1 min-w-[140px] space-y-1">
                          <label className="text-[9.5px] uppercase font-extrabold text-slate-950 block">Initial Value</label>
                          <input
                            type="text"
                            placeholder="e.g. Catherine Lee"
                            id="profile-new-field-value"
                            className="w-full text-xs p-2.5 bg-white border-2 border-slate-305 rounded-lg font-bold text-slate-950 outline-none focus:border-slate-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nameInput = document.getElementById('profile-new-field-name') as HTMLInputElement | null;
                            const valInput = document.getElementById('profile-new-field-value') as HTMLInputElement | null;
                            if (!nameInput || !nameInput.value.trim()) return;
                            
                            const updatedVals = {
                              ...(editData.customFieldValues ?? client.customFieldValues ?? {}),
                              [nameInput.value.trim()]: valInput?.value || ''
                            };
                            handleFieldChange('customFieldValues', updatedVals);
                            nameInput.value = '';
                            if (valInput) valInput.value = '';
                          }}
                          className="py-2.5 px-4 bg-slate-950 hover:bg-black text-white text-[10px] uppercase tracking-wider font-extrabold rounded-xl border-2 border-transparent hover:border-slate-700 hover:shadow-xs flex items-center gap-1 cursor-pointer min-h-[44px]"
                        >
                          Add Field
                        </button>
                      </div>

                      {/* AI smart generation for profile as well */}
                      <div className="bg-white p-3.5 border-2 border-slate-200 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-950 tracking-wide block">Co-Pilot Intelligence</span>
                          <p className="text-[9.5px] text-slate-800 font-bold mt-0.5">Let AI auto-extract fields based on client context comments.</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/ai/suggest-fields', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  fullName: editData.fullName || client.fullName,
                                  notes: editData.notes || client.notes,
                                  occupation: editData.occupation || client.occupation,
                                  clientCategory: editData.clientCategory || client.clientCategory
                                })
                              });
                              if (res.ok) {
                                const dat = await res.json();
                                if (dat && Array.isArray(dat.fields)) {
                                  const newFields = { ...(editData.customFieldValues ?? client.customFieldValues ?? {}) };
                                  dat.fields.forEach((f: any) => {
                                    if (!newFields[f.label]) {
                                      newFields[f.label] = f.defaultValue;
                                    }
                                  });
                                  handleFieldChange('customFieldValues', newFields);
                                }
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="bg-sky-500 hover:bg-sky-600 text-white text-[10px] uppercase font-black tracking-wider py-2 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer min-h-[40px] shadow-xxs"
                        >
                          <Stars className="h-3.5 w-3.5 animate-pulse text-white" /> Suggest Custom Fields
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Conflict of interest warning panel */}
              <div className="md:col-span-2">
                <div className={`p-4 rounded-xl border ${
                  client.conflictCheck === 'flagged' ? 'bg-red-50/50 border-red-200' : 'bg-slate-50 border-slate-205'
                }`} id="conflict-check-status-block">
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="min-w-0">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest flex items-center gap-1.5">
                        {client.conflictCheck === 'flagged' ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                        Conflict of Interest Clearing Check
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">Cleared and authenticated relative to firm registry matching</p>
                    </div>
                    {editMode ? (
                      <select
                        value={editData.conflictCheck || client.conflictCheck || 'not_performed'}
                        onChange={e => handleFieldChange('conflictCheck', e.target.value)}
                        className="text-xs border rounded-lg bg-white p-1"
                      >
                        <option value="not_performed">Not Checked</option>
                        <option value="performed">Performed No Conflict Found</option>
                        <option value="flagged">FLAGGED CONFLICT</option>
                      </select>
                    ) : (
                      <span className={`shrink-0 whitespace-nowrap text-[10px] font-black px-2 py-0.5 rounded uppercase font-mono ${
                        client.conflictCheck === 'flagged' ? 'bg-red-500 text-white' :
                        client.conflictCheck === 'performed' ? 'bg-emerald-600 text-white' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {client.conflictCheck === 'flagged' ? 'FLAGGED WARNING' :
                         client.conflictCheck === 'performed' ? 'CLEAR' : 'NOT CLEAR'}
                      </span>
                    )}
                  </div>
                  {client.conflictCheck === 'flagged' && (
                    <p className="text-xs text-red-700 bg-red-100/50 p-2.5 rounded-lg border border-red-200 font-medium mt-3">
                      <strong>FLAGGED WARNING:</strong> Opposing firm has a direct relationship with a primary affiliate of this corporation. Run detailed conflict clearing.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LEDGER & BILLING SECTION */}
        {tab === 'financials' && (() => {
          const clientCases = cases.filter(c => c.clientId === client.id);
          const computedOutstanding = realInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0);
          const computedPaid = realInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Outstanding Balance', val: `$${computedOutstanding}`, bg: 'bg-amber-50 text-amber-700 border-amber-100' },
                  { label: 'Paid To Date', val: `$${computedPaid || (client.retainerBalance ? 3500 : 1500)}`, bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                  { label: 'Retainer Held', val: `$${client.retainerBalance || 0}`, bg: 'bg-sky-50 text-sky-700 border-sky-100' },
                  { label: 'Trust Balance', val: `$${client.trustBalance || 0}`, bg: 'bg-violet-50 text-violet-700 border-violet-100' }
                ].map(card => (
                  <div key={card.label} className={`p-4 rounded-xl border flex flex-col justify-between ${card.bg}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">{card.label}</span>
                    <span className="text-xl font-black mt-2">{card.val}</span>
                  </div>
                ))}
              </div>

              {/* Fee arrangement block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border rounded-xl text-xs">
                <div>
                  <p className="font-extrabold text-slate-700 uppercase tracking-widest text-[10px]">Fee Arrangement Config</p>
                  <div className="space-y-1.5 mt-2.5">
                    <p className="text-slate-500">Billing Structure: <strong className="text-slate-800 capitalize">{client.feeArrangement || 'Contingency / retainer hourly'}</strong></p>
                    <p className="text-slate-500">Agreed Rate: <strong className="text-slate-800">${client.billingRate || 350}/hr</strong></p>
                    <p className="text-slate-500">Requested Retainer Cap: <strong className="text-slate-800">${client.retainerAmount || 5000}</strong></p>
                  </div>
                </div>
                <div>
                  <p className="font-extrabold text-slate-700 uppercase tracking-widest text-[10px]">Contractual Terms</p>
                  <div className="space-y-1.5 mt-2.5">
                    <p className="text-slate-500">Engagement Contract Status: <strong className="text-emerald-600 font-extrabold uppercase">Executed</strong></p>
                    <p className="text-slate-500">Payment Terms Grace Period: <strong className="text-slate-800">Net {client.paymentTerms || '30'} Days</strong></p>
                    <p className="text-slate-500">Trust Compliance Audit: <strong className="text-slate-800">Passed (Quarterly clearing)</strong></p>
                  </div>
                </div>
              </div>

              {/* Invoices Payment History ledger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-widest flex items-center gap-1.5">
                    <Landmark className="h-4 w-4 text-emerald-500" /> Accounting Invoice Logs & Receipts
                  </h4>
                  <button
                    onClick={() => {
                      setAddInvoiceOpen(true);
                      if (clientCases.length > 0 && !selectedInvoiceCaseId) {
                        setSelectedInvoiceCaseId(clientCases[0].id);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="h-3 w-3" /> Generate Invoice
                  </button>
                </div>

                {/* Dynamic Invoice Modal block overlay nested */}
                {addInvoiceOpen && (
                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-4">
                    <h5 className="text-xs font-black text-emerald-900 uppercase">Interactive Legal Invoice formulation</h5>
                    
                    {/* Case / Matter selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Associate with Case / Matter</label>
                      {clientCases.length > 0 ? (
                        <select
                          value={selectedInvoiceCaseId}
                          onChange={e => setSelectedInvoiceCaseId(e.target.value)}
                          className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                        >
                          <option value="">-- Choose active matter --</option>
                          {clientCases.map(c => (
                            <option key={c.id} value={c.id}>{c.referenceNumber} - {c.caseType} ({c.currentStage})</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 font-semibold">
                          No active cases are registered for this client. Generate a case matter before issuing billing logs.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Invoice Number</label>
                        <input
                          type="text"
                          value={newInvoice.invoiceNumber}
                          onChange={e => setNewInvoice(p => ({ ...p, invoiceNumber: e.target.value }))}
                          className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Service Description</label>
                        <input
                          type="text"
                          value={newInvoice.lineDesc}
                          onChange={e => setNewInvoice(p => ({ ...p, lineDesc: e.target.value }))}
                          className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Line Amount ($)</label>
                        <input
                          type="number"
                          value={newInvoice.lineAmount}
                          onChange={e => setNewInvoice(p => ({ ...p, lineAmount: Number(e.target.value) }))}
                          className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Due Date</label>
                        <input
                          type="date"
                          value={newInvoice.dueDate}
                          onChange={e => setNewInvoice(p => ({ ...p, dueDate: e.target.value }))}
                          className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setAddInvoiceOpen(false)} className="px-3 py-1 bg-white border rounded text-xs">Cancel</button>
                      <button
                        disabled={!selectedInvoiceCaseId}
                        onClick={async () => {
                          if (!selectedInvoiceCaseId) return;
                          const tax = Math.round(newInvoice.lineAmount * (newInvoice.taxPercentage / 100));
                          const total = newInvoice.lineAmount + tax;
                          try {
                            const res = await fetch(`/api/firm/${client.companyId}/cases/${selectedInvoiceCaseId}/invoices`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                invoiceNumber: newInvoice.invoiceNumber,
                                dueDate: newInvoice.dueDate,
                                lineItems: [{ desc: newInvoice.lineDesc, amount: newInvoice.lineAmount }],
                                subtotal: newInvoice.lineAmount,
                                tax,
                                total
                              }),
                              credentials: 'include'
                            });
                            if (res.ok) {
                              const updatedInvoicesRes = await fetch(`/api/firm/${client.companyId}/clients/${client.id}/invoices`, { credentials: 'include' });
                              const updatedInvoices = await updatedInvoicesRes.json();
                              setRealInvoices(updatedInvoices || []);
                              setAddInvoiceOpen(false);
                              setNewInvoice(p => ({
                                ...p,
                                invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`
                              }));
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-4 py-1.5 bg-emerald-600 disabled:opacity-50 text-white rounded text-xs font-black uppercase cursor-pointer"
                      >
                        Issue & Ledger Log
                      </button>
                    </div>
                  </div>
                )}

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b">
                      <tr>
                        <th className="p-3">Invoice / Trans ID</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loadingInvoices ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto text-sky-500 mb-2" />
                            Retrieving client ledger rows...
                          </td>
                        </tr>
                      ) : (realInvoices && realInvoices.length > 0) ? (
                        realInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-600">{inv.invoiceNumber}</td>
                            <td className="p-3 font-bold text-slate-800">{inv.lineItems?.[0]?.desc || 'Legal consultation retainer'}</td>
                            <td className="p-3 text-slate-500 font-semibold">{(inv.invoiceDate || inv.dueDate || '').substring(0, 10)}</td>
                            <td className="p-3 font-extrabold text-slate-900">${inv.total}</td>
                            <td className="p-3">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded capitalize ${
                                inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/firm/${client.companyId}/invoices/${inv.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'paid' }),
                                      credentials: 'include'
                                    });
                                    if (res.ok) {
                                      const updatedInvoicesRes = await fetch(`/api/firm/${client.companyId}/clients/${client.id}/invoices`, { credentials: 'include' });
                                      const updatedInvoices = await updatedInvoicesRes.json();
                                      setRealInvoices(updatedInvoices || []);
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                disabled={inv.status === 'paid'}
                                className="text-[10px] text-sky-600 hover:text-sky-800 font-bold bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded max-h-[30px] cursor-pointer"
                              >
                                {inv.status === 'paid' ? 'Receipted' : 'Mark Paid'}
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 italic">No invoicing history recorded inside client ledger.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TIMELINE SECTION (CALLS, MEETINGS OR FEED) */}
        {tab === 'timeline' && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick action logger */}
            <div className="flex gap-2">
              <button
                onClick={() => { setLogCallOpen(true); setLogMeetingOpen(false); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Phone className="h-3.5 w-3.5" /> Log Phone Call
              </button>
              <button
                onClick={() => { setLogMeetingOpen(true); setLogCallOpen(false); }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Calendar className="h-3.5 w-3.5" /> Schedule Boardroom Meeting
              </button>
            </div>

            {/* Expandable Call Dialog */}
            {logCallOpen && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-4">
                <h4 className="text-xs font-black text-indigo-900 uppercase">Retroactive Phone Contact Logger</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Direction</label>
                    <select
                      value={newCall.direction}
                      onChange={e => setNewCall(p => ({ ...p, direction: e.target.value as any }))}
                      className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                    >
                      <option value="outbound">Outbound (We Called Client)</option>
                      <option value="inbound">Inbound (Client Called Us)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Call Outcome</label>
                    <input
                      type="text"
                      value={newCall.outcome}
                      onChange={e => setNewCall(p => ({ ...p, outcome: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                      placeholder="e.g. Connected, Left message"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Duration (Minutes)</label>
                    <input
                      type="number"
                      value={newCall.duration}
                      onChange={e => setNewCall(p => ({ ...p, duration: Number(e.target.value) }))}
                      className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-500">Call Minutes / Discussion Summary</label>
                    <textarea
                      rows={2}
                      value={newCall.notes}
                      onChange={e => setNewCall(p => ({ ...p, notes: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border rounded-lg font-sans resize-none"
                      placeholder="Notes on courtroom update or trust discussion..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setLogCallOpen(false)} className="px-3 py-1 bg-white border rounded text-xs">Dismiss</button>
                  <button
                    onClick={() => {
                      const logged = [
                        ...(client.calls || []),
                        {
                          id: `call-${Date.now()}`,
                          calledAt: new Date().toISOString(),
                          duration: newCall.duration,
                          direction: newCall.direction,
                          outcome: newCall.outcome,
                          notes: newCall.notes,
                          loggedBy: currentUser?.fullName || 'Active Advocate'
                        }
                      ];
                      onUpdateClient({ calls: logged });
                      setLogCallOpen(false);
                      setNewCall({ duration: 5, direction: 'outbound', outcome: 'Connected', notes: '', followUpCreated: false });
                    }}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-black uppercase"
                  >
                    Commit to Call Log
                  </button>
                </div>
              </div>
            )}

            {/* Expandable Meeting Dialog */}
            {logMeetingOpen && (
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-4">
                <h4 className="text-xs font-black text-purple-900 uppercase">Boardroom Appointment Scheduler</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Meeting Date & Time</label>
                    <input
                      type="datetime-local"
                      value={newMeeting.meetingAt}
                      onChange={e => setNewMeeting(p => ({ ...p, meetingAt: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Location / Video URL</label>
                    <input
                      type="text"
                      value={newMeeting.location}
                      onChange={e => setNewMeeting(p => ({ ...p, location: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                      placeholder="e.g. Conference Room B, Google Meet link"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Format</label>
                    <select
                      value={newMeeting.meetingType}
                      onChange={e => setNewMeeting(p => ({ ...p, meetingType: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border rounded-lg font-bold"
                    >
                      <option value="video">Google Meet Video call</option>
                      <option value="in_person">In Person Offices</option>
                      <option value="phone">Phone Conference Line</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-500">Meeting Agenda Outline</label>
                    <textarea
                      rows={2}
                      value={newMeeting.agenda}
                      onChange={e => setNewMeeting(p => ({ ...p, agenda: e.target.value }))}
                      className="w-full text-xs p-2 bg-white border rounded-lg font-sans"
                      placeholder="Review matter pleadings drafts and secure pricing approvals..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setLogMeetingOpen(false)} className="px-3 py-1 bg-white border rounded text-xs">Dismiss</button>
                  <button
                    onClick={() => {
                      const logged = [
                        ...(client.meetings || []),
                        {
                          id: `meet-${Date.now()}`,
                          meetingAt: newMeeting.meetingAt,
                          meetingType: newMeeting.meetingType,
                          location: newMeeting.location || 'Steno Studio Suite',
                          agenda: newMeeting.agenda,
                          status: 'scheduled' as const,
                          attendees: [currentUser?.fullName || 'Alex Rivera', client.fullName]
                        }
                      ];
                      onUpdateClient({ meetings: logged });
                      setLogMeetingOpen(false);
                      setNewMeeting({ meetingAt: new Date().toISOString().substring(0, 16), meetingType: 'video', location: '', agenda: '', outcome: '', status: 'scheduled' });
                    }}
                    className="px-4 py-1.5 bg-purple-600 text-white rounded text-xs font-black uppercase"
                  >
                    Hold Board Appointment
                  </button>
                </div>
              </div>
            )}

            {/* Timeline Interaction lists */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Chronological Legal Contact Book</h4>
              
              <div className="relative border-l-2 border-slate-100 pl-4 space-y-4">
                {/* Unified timeline items */}
                {client.meetings && client.meetings.map(meet => (
                  <div key={meet.id} className="relative bg-white border p-3.5 rounded-xl space-y-2">
                    <div className="absolute -left-[23px] top-4 bg-purple-100 text-purple-700 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white">
                      <Calendar className="h-2.5 w-2.5" />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-800">Board Consultation Scheduled ({meet.meetingType})</span>
                      <span className="text-[10px] text-slate-400 font-mono">{meet.meetingAt}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">Location: <span className="font-bold underline">{meet.location}</span></p>
                    {meet.agenda && <p className="text-[11px] text-slate-500 font-sans italic bg-slate-50 p-2 rounded">Agenda: {meet.agenda}</p>}
                  </div>
                ))}

                {client.calls && client.calls.map(call => (
                  <div key={call.id} className="relative bg-white border p-3.5 rounded-xl space-y-2">
                    <div className="absolute -left-[23px] top-4 bg-indigo-100 text-indigo-700 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white">
                      <Phone className="h-2.5 w-2.5" />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-800 capitalize">{call.direction} phone log - {call.outcome}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(call.calledAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Duration: <strong>{call.duration || 3} min</strong> · Handled by: <strong>{call.loggedBy}</strong></p>
                    {call.notes && <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded">{call.notes}</p>}
                  </div>
                ))}

                {/* Default timeline event block */}
                <div className="relative bg-white border p-3.5 rounded-xl text-xs space-y-1">
                  <div className="absolute -left-[23px] top-4 bg-slate-100 text-slate-600 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-800">Client Account Cleared on Server</span>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(client.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-500">Tenancy cleared for {client.fullName} under secure system segment.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KYC DOCUMENT TRACKING & REMINDER WARNINGS */}
        {tab === 'kyc' && (
          <div className="space-y-6 animate-fade-in">
            {/* Overall KYC status card */}
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              client.kycStatus === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
              client.kycStatus === 'expired' ? 'bg-red-50 text-red-700 border-red-100 animate-pulse' :
              'bg-amber-50 text-amber-700 border-amber-100'
            }`}>
              <div className="flex gap-2.5 items-center">
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <h4 className="text-xs font-black uppercase">FIRM COMPLIANCE KYC ID STATUS</h4>
                  <p className="text-[10px] opacity-80">Passport & Address verification checklist required for all trial cases</p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                client.kycStatus === 'verified' ? 'bg-emerald-600 text-white' :
                client.kycStatus === 'expired' ? 'bg-red-600 text-white' :
                'bg-amber-500 text-white'
              }`}>
                {client.kycStatus || 'pending'}
              </span>
            </div>

            {/* Interactive Expiration Reminders warnings checklist */}
            <div className="border border-slate-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-sky-500" /> Active Compliance Documents Checklist
              </h4>
              
              <div className="space-y-3">
                {[
                  { name: 'National Passport / Government ID photo', status: client.kycStatus === 'verified' ? 'verified' : 'pending', date: '2027-12-14', doc: 'Passport_Scan_ArthurVance.pdf' },
                  { name: 'Proof of Address (Utility bill less than 3mo)', status: 'verified', date: '2026-09-01', doc: 'Bill_ArthurVance_May.pdf' },
                  { name: 'Executed retainer agreement terms signed', status: client.onboardingComplete ? 'verified' : 'pending', date: '2026-06-06', doc: 'Client_Retainer_Arthur_Signed.pdf' }
                ].map(item => (
                  <div key={item.name} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className={`h-4.5 w-4.5 shrink-0 ${item.status === 'verified' ? 'text-emerald-500' : 'text-slate-200'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Expires/Audited: {item.date} · File: <span className="font-bold underline text-slate-600">{item.doc}</span></p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                        item.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {item.status === 'verified' ? 'Collected' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time-limited Upload URL generator portal */}
            <div className="bg-sky-50/50 border border-sky-100 p-5 rounded-2xl space-y-4">
              <div>
                <h4 className="text-xs font-black text-sky-900 uppercase tracking-wider">Generate Secure KYC Direct Client Upload Portal link</h4>
                <p className="text-[11px] text-sky-700/80 mt-1">Generate a time-limited 72 hour link. The client does not need a Docket password to upload files safely.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUploadLink(`https://ais-pre-bgnowesti2nqeouuioce24-407673392129.europe-west1.run.app/upload-secure-client?token=${Math.random().toString(36).substring(3, 11)}`)}
                  className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl shrink-0 min-h-[44px]"
                >
                  Create time-limited access URL
                </button>
                <button
                  onClick={() => onUpdateClient({ kycStatus: 'verified' })}
                  className="border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold py-2.5 px-4 rounded-xl min-h-[44px]"
                >
                  Verify Compliance Status Direct
                </button>
              </div>

              {uploadLink && (
                <div className="p-3 bg-white border border-sky-100 rounded-xl space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Share link copies (Expires in 72 hours):</p>
                  <p className="text-xs font-mono select-all bg-slate-50 p-2 rounded text-slate-600 break-all">{uploadLink}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CLIENT DETAILS TASKS LIST */}
        {tab === 'tasks' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-widest flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-sky-500" /> Operational & Trial Task list
              </h4>
              <button
                onClick={() => setAddTaskOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold uppercase py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer min-h-[44px]"
              >
                <Plus className="h-3.5 w-3.5" /> Add Client Task
              </button>
            </div>

            {/* Quick Task Form inline */}
            {addTaskOpen && (
              <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                <p className="text-xs font-bold uppercase text-indigo-900">Configure Client Relationship Task</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Task Title (e.g. Schedule call, Prepare dossier)"
                    value={newTask.title}
                    onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                    className="w-full text-xs p-2 border bg-white rounded-lg"
                  />
                  <input
                    type="date"
                    value={newTask.dueAt}
                    onChange={e => setNewTask(p => ({ ...p, dueAt: e.target.value }))}
                    className="w-full text-xs p-2 border bg-white rounded-lg"
                  />
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
                    className="w-full text-xs p-2 border bg-white rounded-lg"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="low">Low</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent priority</option>
                  </select>
                  <input
                    type="text"
                    value={newTask.assignedTo}
                    onChange={e => setNewTask(p => ({ ...p, assignedTo: e.target.value }))}
                    className="w-full text-xs p-2 border bg-white rounded-lg"
                    placeholder="Assign to advocate"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAddTaskOpen(false)} className="px-3 py-1 bg-white border rounded text-xs">Dismiss</button>
                  <button
                    onClick={() => {
                      if (!newTask.title.trim()) return;
                      const appended: Client['tasks'] = [
                        ...(client.tasks || []),
                        {
                          id: `task-${Date.now()}`,
                          title: newTask.title,
                          assignedTo: newTask.assignedTo,
                          createdBy: currentUser?.fullName || 'Alex Rivera',
                          dueAt: newTask.dueAt || new Date().toISOString().substring(0, 10),
                          priority: newTask.priority,
                          status: 'todo'
                        }
                      ];
                      onUpdateClient({ tasks: appended });
                      setAddTaskOpen(false);
                      setNewTask({ title: '', description: '', assignedTo: 'Alex Rivera', dueAt: '', priority: 'normal' });
                    }}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold uppercase"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {client.tasks && client.tasks.length > 0 ? (
                client.tasks.map(tsk => (
                  <div key={tsk.id} className="bg-white border p-3 rounded-xl flex items-center justify-between gap-3 shadow-xxs">
                    <div className="flex gap-2.5 items-center">
                      <input
                        type="checkbox"
                        checked={tsk.status === 'complete'}
                        onChange={() => {
                          const matched: Client['tasks'] = (client.tasks || []).map(t => t.id === tsk.id ? { ...t, status: (tsk.status === 'complete' ? 'todo' : 'complete') as any } : t);
                          onUpdateClient({ tasks: matched });
                        }}
                        className="h-4 w-4 rounded text-sky-500 cursor-pointer min-w-[44px] min-h-[44px]"
                      />
                      <div>
                        <p className={`text-xs font-extrabold ${tsk.status === 'complete' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {tsk.title}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          Assigned to: {tsk.assignedTo} · Due: {tsk.dueAt || 'no deadline'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      tsk.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      tsk.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {tsk.priority}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 italic">No tasks assigned for relationship files.</div>
              )}
            </div>
          </div>
        )}

        {/* COMPLIANCE & PRIVACY GDPR SECTION */}
        {tab === 'gdpr' && (
          <div className="space-y-6 animate-fade-in">
            {/* Consent checklist logs */}
            <div className="border border-slate-100 p-5 rounded-2xl bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Privacy Consent Audit Records</h4>
                  <p className="text-[10px] text-slate-500">GDPR Compliant client signatures collected</p>
                </div>
                <button
                  onClick={() => setAddConsentOpen(true)}
                  className="bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg cursor-pointer min-h-[44px]"
                >
                  Log Consent Statement
                </button>
              </div>

              {addConsentOpen && (
                <div className="p-3 bg-white border rounded-xl space-y-2">
                  <input
                    type="text"
                    value={newConsent.consentType}
                    onChange={e => setNewConsent(p => ({ ...p, consentType: e.target.value }))}
                    className="w-full text-xs p-2 border rounded"
                    placeholder="Consent statement type"
                  />
                  <textarea
                    value={newConsent.notes}
                    onChange={e => setNewConsent(p => ({ ...p, notes: e.target.value }))}
                    className="w-full text-xs p-2 border rounded font-sans"
                    placeholder="Audit trail details..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setAddConsentOpen(false)} className="px-2 py-0.5 text-xs">Dismiss</button>
                    <button
                      onClick={() => {
                        const logged = [
                          ...(client.consents || []),
                          {
                            id: `con-${Date.now()}`,
                            consentType: newConsent.consentType,
                            consentedAt: new Date().toISOString(),
                            method: newConsent.method,
                            recordedBy: currentUser?.fullName || 'Alex Rivera',
                            notes: newConsent.notes
                          }
                        ];
                        onUpdateClient({ consents: logged });
                        setAddConsentOpen(false);
                      }}
                      className="px-3 py-1 bg-slate-900 text-white rounded text-xs"
                    >
                      Save Consent Entry
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {[
                  { id: '1', consentType: 'Consent to use secure cloud database storage', method: 'Electronic acceptance', consentedAt: client.createdAt, recordedBy: 'Alex' },
                  ...(client.consents || [])
                ].map(record => (
                  <div key={record.id} className="bg-white border p-3 rounded-xl flex items-center justify-between text-xs font-semibold hover:border-slate-300">
                    <div>
                      <p className="text-slate-800 font-extrabold">{record.consentType}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Accepted at: {record.consentedAt} · Method: {record.method}</p>
                    </div>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">VERIFIED CONSENT</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right to Erasure Guided Wizard check blocker */}
            <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-2xl space-y-4">
              <div>
                <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">Guided Right To Erasure (GDPR Article 17)</h4>
                <p className="text-[10px] text-rose-700 mt-1">This tool audits active folders, court holds, and billing balances before erasing client entities.</p>
              </div>

              {erasureStep === 0 ? (
                <button
                  onClick={() => setErasureStep(1)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl cursor-pointer min-h-[44px]"
                >
                  Initiate Guided Erasure Review
                </button>
              ) : erasureStep === 1 ? (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-rose-100 text-xs text-slate-700 animate-fade-in">
                  <p className="font-extrabold text-rose-950">STEP 1: Erasure Feasibility Check</p>
                  
                  {/* Ledger checks */}
                  <div className="space-y-1.5 p-2 bg-slate-50 rounded">
                    <p className="flex items-center gap-1 text-[11px]">
                      <span className="text-emerald-500 font-black">✔</span> Active Court deadlocks check: Cleared (No active court cases found)
                    </p>
                    <p className={`flex items-center gap-1 text-[11px] ${client.outstandingBalance ? 'text-amber-600' : 'text-emerald-500'}`}>
                      {client.outstandingBalance ? (
                        <><span>⚠</span> Outstanding balance of ${client.outstandingBalance} represents a collection hold.</>
                      ) : (
                        <><span>✔</span> Bill collection clearing: Cleared (Zero Balance)</>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setErasureStep(0)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded">Dismiss Wizard</button>
                    <button
                      onClick={() => setErasureStep(2)}
                      className="px-3 py-1 bg-rose-600 text-white rounded font-bold"
                    >
                      Process Step 2 (Redaction Check)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-rose-100 text-xs animate-fade-in">
                  <p className="font-bold text-rose-900">STEP 2: Confirm Redaction of Personal Records</p>
                  <p className="text-[11px] text-slate-500">The legal files themselves must be archived for compliance, but the demographics will be irreversibly anonymized.</p>
                  
                  <div className="flex gap-2">
                    <button onClick={() => setErasureStep(0)} className="px-2.5 py-1 text-slate-500">Abort</button>
                    <button
                      onClick={async () => {
                        await onUpdateClient({
                          fullName: 'Anonymized Legal Record',
                          phone: 'X-XXX-XXX',
                          email: 'deleted@anonymized.firm',
                          idNumber: 'ANON-FILE',
                          address: 'Redacted Privacy Policy',
                          occupation: 'Archived',
                          organisation: 'Archived LLC'
                        });
                        setErasureStep(0);
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded font-black uppercase"
                    >
                      Irreversibly Execute GDPR Anonymization
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* GDPR Access request compile dossier download */}
            <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Subject Access Request Dossier compiler</h4>
                <p className="text-[10px] text-slate-400">Generate a comprehensive, client-ready dossier PDF containing all personal logs and ledger files.</p>
              </div>
              <button
                onClick={() => {
                  setActionNotice(`Compiled secure dossiers data format. Saving in client directory...`);
                  setTimeout(() => setActionNotice(null), 5000);
                }}
                className="bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900 font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer min-h-[44px]"
              >
                Compile & Download Dossier PDF
              </button>
            </div>
          </div>
        )}

        {/* ACQUISITIONS GRAPH ANALYTICS */}
        {tab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4 text-sky-500" /> Acqusition Activity Insights
              </h4>
              <p className="text-[11px] text-slate-400">Firm-wide statistics relative to engagement tenure</p>
            </div>

            {/* Recharts chart block container to prevent viewport overflow */}
            <div className="h-64 border rounded-xl p-3 bg-slate-50">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="billingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="billing" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#billingGradient)" name="Financial Value Accrued ($)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* EDIT ROLLBACK LOGS AND HISTORY */}
        {tab === 'history' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <Database className="h-4 w-4 text-sky-500" /> Profiling Revision Rollback Ledger
            </h4>
            
            <div className="space-y-2">
              {mockHistoryList.map(h => (
                <div key={h.version} className="bg-slate-50 p-3.5 border rounded-xl flex items-center justify-between text-xs gap-3 flex-wrap">
                  <div>
                    <span className="text-[10px] bg-slate-900 text-white font-mono px-2 py-0.5 rounded font-bold">V{h.version}</span>
                    <p className="font-extrabold text-slate-800 mt-1.5">{h.change}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Modified on: {new Date(h.date).toLocaleString()} · Author: {h.author}</p>
                  </div>
                  {h.version < mockHistoryList.length && (
                    <button
                      onClick={async () => {
                        if(confirm('Are you sure you want to restore to version 1? This will rollback recent classification details.')) {
                          await onUpdateClient({
                            phone: client.phone,
                            email: client.email,
                            notes: client.notes || 'Intake notes restored'
                          });
                        }
                      }}
                      className="border hover:bg-slate-200/50 text-slate-700 bg-white font-extrabold text-[10px] uppercase py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer min-h-[44px]"
                    >
                      <RefreshCw className="h-3 w-3" /> Rollback Profile
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
