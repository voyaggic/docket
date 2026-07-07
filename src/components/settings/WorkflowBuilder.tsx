/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, Plus, Trash, ArrowRight, Save, Clipboard, Sparkles, Check, CheckCircle2,
  Calendar, Laptop, MessageSquare, FileText, Settings, X, RefreshCw, AlertCircle, Edit, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WorkflowAutomation {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  actions: string[];
  isActive: boolean;
  runCount: number;
  successRate: number;
  lastRun: string;
}

const DEFAULT_WORKFLOWS: WorkflowAutomation[] = [
  {
    id: 'wf-1',
    name: 'Automatic Criminal Filing Approvals Alert',
    trigger: 'Matter Stage changed to TRIAL_PREP',
    condition: 'IF matter type equals "Criminal"',
    actions: ['Send email notification to Lead Counsel', 'Create follow-up reminder: "Review trial brief"'],
    isActive: true,
    runCount: 42,
    successRate: 100,
    lastRun: '2026-06-07 14:22'
  },
  {
    id: 'wf-2',
    name: 'New Client KYC Verification Sequence',
    trigger: 'Client Onboarding completed',
    condition: 'IF client risk rating equals "High"',
    actions: ['Add case diary entry: "AML Check Completed"', 'Send WhatsApp message: onboarding confirm'],
    isActive: true,
    runCount: 18,
    successRate: 94.4,
    lastRun: '2026-06-05 09:12'
  },
  {
    id: 'wf-3',
    name: 'Snoozed Deadline Overdue Warnings',
    trigger: 'Deadline Overdue',
    condition: 'IF deadline priority equals "High"',
    actions: ['Send in-app notification to all users', 'Set matter flag: "URGENT OVERDUE"'],
    isActive: false,
    runCount: 129,
    successRate: 98.7,
    lastRun: '2026-06-08 02:40'
  }
];

interface WorkflowBuilderProps {
  companyId: string;
}

export default function WorkflowBuilder({ companyId }: WorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<WorkflowAutomation[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowAutomation | null>(null);

  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/firm/${companyId}/workflows`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(rows => setWorkflows(rows.map((r: any) => ({
        ...r,
        actions: Array.isArray(r.actions) ? r.actions : JSON.parse(r.actions || '[]')
      }))))
      .catch(err => console.error('Error loading workflows:', err))
      .finally(() => setLoadingWorkflows(false));
  }, [companyId]);

  // Builder Canvas States
  const [wfName, setWfName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState('Matter Created');
  const [conditionField, setConditionField] = useState('matter_type');
  const [conditionOperator, setConditionOperator] = useState('equals');
  const [conditionValue, setConditionValue] = useState('');
  const [actionsChain, setActionsChain] = useState<string[]>(['Send email notification']);
  const [newActionInput, setNewActionInput] = useState('');

  const handleToggleActive = async (id: string) => {
    const target = workflows.find(w => w.id === id);
    if (!target) return;
    const newActive = !target.isActive;
    setWorkflows(prev => prev.map(wf => wf.id === id ? { ...wf, isActive: newActive } : wf));
    try {
      await fetch(`/api/firm/${companyId}/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: newActive })
      });
    } catch (err) {
      console.error('Error toggling workflow:', err);
    }
  };

  const handleDuplicate = async (wf: WorkflowAutomation) => {
    const { id, runCount, successRate, lastRun, ...rest } = wf as any;
    const payload = { ...rest, name: `${wf.name} (Copy)`, isActive: true };
    try {
      const res = await fetch(`/api/firm/${companyId}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setWorkflows(prev => [{ ...saved, actions: Array.isArray(saved.actions) ? saved.actions : JSON.parse(saved.actions || '[]') }, ...prev]);
      }
    } catch (err) {
      console.error('Error duplicating workflow:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setWorkflows(prev => prev.filter(wf => wf.id !== id));
    try {
      await fetch(`/api/firm/${companyId}/workflows/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error deleting workflow:', err);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!wfName.trim()) return;

    const conditionText = conditionValue 
      ? `IF ${conditionField.replace('_', ' ')} ${conditionOperator} "${conditionValue}"`
      : 'No condition';

    const newWf = {
      name: wfName,
      trigger: selectedTrigger,
      condition: conditionText,
      actions: actionsChain.length > 0 ? actionsChain : ['Send email notification'],
      isActive: true,
      runCount: editingWorkflow ? editingWorkflow.runCount : 0,
      successRate: editingWorkflow ? editingWorkflow.successRate : 100,
      lastRun: editingWorkflow ? editingWorkflow.lastRun : 'Just created'
    };

    try {
      if (editingWorkflow) {
        const res = await fetch(`/api/firm/${companyId}/workflows/${editingWorkflow.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newWf)
        });
        if (res.ok) {
          const updated = await res.json();
          setWorkflows(prev => prev.map(wf => wf.id === editingWorkflow.id ? { ...updated, actions: Array.isArray(updated.actions) ? updated.actions : JSON.parse(updated.actions || '[]') } : wf));
        }
      } else {
        const res = await fetch(`/api/firm/${companyId}/workflows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newWf)
        });
        if (res.ok) {
          const saved = await res.json();
          setWorkflows(prev => [{ ...saved, actions: Array.isArray(saved.actions) ? saved.actions : JSON.parse(saved.actions || '[]') }, ...prev]);
        }
      }
    } catch (err) {
      console.error('Error saving workflow:', err);
    }

    setIsCreating(false);
    setEditingWorkflow(null);
    setWfName('');
    setConditionValue('');
    setActionsChain(['Send email notification']);
  };

  const handleEdit = (wf: WorkflowAutomation) => {
    setEditingWorkflow(wf);
    setWfName(wf.name);
    setSelectedTrigger(wf.trigger);
    
    // Parse condition if exists
    if (wf.condition && wf.condition.startsWith('IF ')) {
      const parts = wf.condition.substring(3).split(' ');
      setConditionField(parts[0] || 'matter_type');
      setConditionOperator(parts[1] || 'equals');
      setConditionValue(parts.slice(2).join(' ').replace(/"/g, ''));
    } else {
      setConditionValue('');
    }
    
    setActionsChain(wf.actions);
    setIsCreating(true);
  };

  return (
    <div className="space-y-6" id="settings-workflow-builder-panel">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">Visual No-Code Workflow Builder</h3>
          <p className="text-xxs text-slate-450 mt-0.5">Automate correspondence, milestone deadlines, task dispatches, and matter stage locks.</p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => {
              setEditingWorkflow(null);
              setWfName('');
              setIsCreating(true);
            }}
            className="p-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer select-none"
          >
            <Plus className="h-4 w-4" /> Create Custom Automation
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isCreating ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-md"
          >
            {/* Header canvas bar */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Laptop className="h-5 w-5 text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-wider">Visual Workflow Canvas Designer</span>
              </div>
              <button 
                onClick={() => {
                  setIsCreating(false);
                  setEditingWorkflow(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xxs font-black text-slate-500 uppercase tracking-widest mb-1.5">Workflow Rules Identifier</label>
                  <input 
                    type="text" 
                    value={wfName}
                    onChange={e => setWfName(e.target.value)}
                    placeholder="E.g., High Risk Client Onboarding Flag Email Trigger"
                    className="w-full text-xs font-bold border p-2.5 rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Graphical Visual Automation Chain Map */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative pt-4">
                
                {/* 1. Triggers Group block */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 relative">
                  <div className="text-[10px] font-black text-indigo-900 bg-indigo-100/50 px-2.5 py-1 rounded w-fit uppercase font-mono mb-2">Block #1: Pick Trigger Event</div>
                  <label className="block text-xxs font-bold text-slate-700">Choose trigger launcher</label>
                  <select 
                    value={selectedTrigger}
                    onChange={e => setSelectedTrigger(e.target.value)}
                    className="w-full text-xs border p-2 bg-white rounded-lg font-bold"
                  >
                    <optgroup label="Matter Milestone Events">
                      <option value="Matter Created">Matter Created</option>
                      <option value="Matter status changed">Matter Status changed</option>
                      <option value="Matter Stage changed to TRIAL_PREP">Matter Stage changed to TRIAL_PREP</option>
                      <option value="Matter assigned to lawyer">Matter assigned to lawyer</option>
                      <option value="Matter Closed">Matter Closed</option>
                    </optgroup>
                    <optgroup label="Calendar Proximity Events">
                      <option value="Deadline Overdue">Deadline Overdue</option>
                      <option value="Deadline resolved">Deadline resolved</option>
                      <option value="Client Onboarding completed">Client Onboarding completed</option>
                    </optgroup>
                  </select>
                  <p className="text-[10px] text-slate-400">Trigger launches execution cycle as soon as database record updates.</p>
                </div>

                {/* Arrow Connector index */}
                <div className="hidden lg:flex justify-center items-center h-full pt-10 text-slate-300">
                  <ArrowRight className="h-6 w-6 animate-pulse" />
                </div>

                {/* 2. Conditions Group block */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 relative">
                  <div className="text-[10px] font-black text-amber-900 bg-amber-100/50 px-2.5 py-1 rounded w-fit uppercase font-mono mb-2">Block #2: Filter Clause (IF)</div>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Filter Field</label>
                      <select 
                        value={conditionField}
                        onChange={e => setConditionField(e.target.value)}
                        className="w-full text-[11px] border p-1.5 bg-white rounded"
                      >
                        <option value="matter_type">Matter Practice Specialty</option>
                        <option value="client_risk_rating">Client Risk Rating</option>
                        <option value="claim_amount">Estimated Claim Amount</option>
                        <option value="deadline_priority">Deadline Priority Label</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Operator</label>
                        <select 
                          value={conditionOperator}
                          onChange={e => setConditionOperator(e.target.value)}
                          className="w-full text-[11px] border p-1.5 bg-white rounded"
                        >
                          <option value="equals">equals</option>
                          <option value="contains">contains</option>
                          <option value="greater_than">is greater than</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Value</label>
                        <input 
                          type="text" 
                          value={conditionValue}
                          onChange={e => setConditionValue(e.target.value)}
                          placeholder="e.g. Criminal, High"
                          className="w-full text-[11px] border p-1.5 bg-white rounded"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">Leave "Value" empty to bypass conditions checks and always execute.</p>
                </div>

                {/* Arrow Connector index */}
                <div className="hidden lg:flex justify-center items-center h-full pt-10 text-slate-300">
                  <ArrowRight className="h-6 w-6 animate-pulse" />
                </div>

                {/* 3. Action Chains block */}
                <div className="border border-indigo-150 rounded-xl p-4 bg-indigo-50/20 space-y-3">
                  <div className="text-[10px] font-black text-emerald-900 bg-emerald-100/50 px-2.5 py-1 rounded w-fit uppercase font-mono mb-2">Block #3: Action Sequences (THEN)</div>
                  
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {actionsChain.map((act, i) => (
                      <div key={i} className="flex justify-between items-center text-xxs p-1.5 bg-white border rounded">
                        <span className="font-bold text-slate-800">{act}</span>
                        <button 
                          type="button" 
                          onClick={() => setActionsChain(actionsChain.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {actionsChain.length === 0 && (
                      <span className="text-xxs text-amber-600 italic leading-none">Add at least one executor action!</span>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <input 
                      type="text"
                      placeholder="Add step... (e.g. Set flags)"
                      value={newActionInput}
                      onChange={e => setNewActionInput(e.target.value)}
                      className="flex-1 text-[11px] border p-1.5 bg-white rounded"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        if (!newActionInput.trim()) return;
                        setActionsChain([...actionsChain, newActionInput.trim()]);
                        setNewActionInput('');
                      }}
                      className="p-1.5 bg-slate-800 text-white rounded text-xxs font-black"
                    >
                      Append
                    </button>
                  </div>

                  {/* Variables Helper Panel block */}
                  <div className="p-1 px-2.5 bg-slate-800 text-white rounded-lg text-[9px] font-mono leading-normal">
                    <span className="block font-bold text-indigo-300">Supported templates variables:</span>
                    [MATTER_REFERENCE] | [CLIENT_NAME] | [LAWYER_NAME]
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-4 border-t select-none">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsCreating(false);
                    setEditingWorkflow(null);
                  }}
                  className="p-2 px-4 border text-xxs font-black uppercase text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveWorkflow}
                  className="p-2 px-5 bg-slate-800 hover:bg-slate-900 text-white text-xxs font-black uppercase rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" /> Save Automation Workflow
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3.5">
              {workflows.map(wf => (
                <div 
                  key={wf.id} 
                  className={`p-4 border rounded-2xl bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-xs transition ${!wf.isActive ? 'opacity-70 bg-slate-50/50' : ''}`}
                >
                  <div className="space-y-1.5 text-left max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-slate-800 text-xs">{wf.name}</h4>
                      <span className={`text-[8px] font-black p-0.5 px-2 rounded-full uppercase ${wf.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                        {wf.isActive ? 'Operational' : 'Paused / Idle'}
                      </span>
                    </div>

                    <div className="text-xxs text-slate-450 font-semibold space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-indigo-600 uppercase font-bold text-[9px]">Trigger event:</span>
                        <span className="text-slate-800 bg-slate-100 p-0.5 px-1.5 rounded">{wf.trigger}</span>
                      </div>
                      {wf.condition && wf.condition !== 'No condition' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-600 uppercase font-bold text-[9px]">Condition criteria:</span>
                          <span className="text-slate-800 font-mono bg-amber-50 p-0.5 px-1.5 rounded border border-amber-100">{wf.condition}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-1.5 flex-wrap">
                        <span className="text-emerald-700 uppercase font-bold text-[9px] shrink-0 mt-0.5">Execution chain:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {wf.actions.map((act, i) => (
                            <React.Fragment key={i}>
                              <span className="text-slate-700 font-bold bg-emerald-50/60 p-0.5 px-1.5 rounded border border-emerald-100/50 text-[10px]">{act}</span>
                              {i < wf.actions.length - 1 && <span className="text-slate-300 shrink-0">&rarr;</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-end gap-3 self-stretch md:self-auto shrink-0 pt-3 md:pt-0 border-t md:border-transparent">
                    {/* Activity usage limits metrics */}
                    <div className="flex gap-4 text-xxs font-mono font-bold leading-tight select-none">
                      <div className="text-right">
                        <span className="block text-[8px] text-slate-400 uppercase">Automated Runs</span>
                        <span className="text-slate-800 font-extrabold">{wf.runCount} times</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] text-slate-400 uppercase">Success Rate</span>
                        <span className="text-emerald-600 font-black">{wf.successRate}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                      {/* Active Toggle selector */}
                      <button 
                        onClick={() => handleToggleActive(wf.id)}
                        className={`w-9 h-5 rounded-full p-0.5 transition relative cursor-pointer outline-none shrink-0 ${wf.isActive ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        title={wf.isActive ? 'Click to Pause' : 'Click to Enable'}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition transform ${wf.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>

                      <button 
                        onClick={() => handleEdit(wf)}
                        className="p-1 px-2 hover:bg-slate-100 text-slate-500 rounded border hover:text-indigo-650"
                        title="Edit Automation Rule"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDuplicate(wf)}
                        className="p-1 px-2 hover:bg-slate-100 text-slate-500 rounded border hover:text-indigo-650"
                        title="Duplicate Rule"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(wf.id)}
                        className="p-1 px-2 bg-red-50 hover:bg-red-100 text-red-500 rounded border border-red-100 hover:text-red-700"
                        title="Destroy Workflow Rule"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
