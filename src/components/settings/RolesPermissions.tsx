/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Shield, KeyRound, Check, X, ShieldAlert, Users, Sliders, ChevronDown, CheckCircle, PlusCircle
} from 'lucide-react';

interface RolePrivilege {
  id: string;
  name: string;
  category: string;
  ADMIN: boolean;
  SENIOR: boolean;
  JUNIOR: boolean;
  PARALEGAL: boolean;
  SECRETARY: boolean;
  EXTERNAL: boolean;
  CLIENT: boolean;
}

const DEFAULT_MATRIX: RolePrivilege[] = [
  { id: 'mat-r', name: 'Read active litigation dockets', category: 'Matters & Dockets', ADMIN: true, SENIOR: true, JUNIOR: true, PARALEGAL: true, SECRETARY: true, EXTERNAL: true, CLIENT: true },
  { id: 'mat-c', name: 'Open new case dockets', category: 'Matters & Dockets', ADMIN: true, SENIOR: true, JUNIOR: true, PARALEGAL: true, SECRETARY: true, EXTERNAL: false, CLIENT: false },
  { id: 'mat-e', name: 'Edit milestones & trial details', category: 'Matters & Dockets', ADMIN: true, SENIOR: true, JUNIOR: true, PARALEGAL: false, SECRETARY: false, EXTERNAL: false, CLIENT: false },
  { id: 'mat-d', name: 'Archive / Delete active matters', category: 'Matters & Dockets', ADMIN: true, SENIOR: true, JUNIOR: false, PARALEGAL: false, SECRETARY: false, EXTERNAL: false, CLIENT: false },
  { id: 'sec-i', name: 'Invite new staff members', category: 'Access Control', ADMIN: true, SENIOR: false, JUNIOR: false, PARALEGAL: false, SECRETARY: false, EXTERNAL: false, CLIENT: false },
  { id: 'sec-p', name: 'Modify billing & billing rates', category: 'Financials', ADMIN: true, SENIOR: true, JUNIOR: false, PARALEGAL: false, SECRETARY: false, EXTERNAL: false, CLIENT: false },
  { id: 'sec-a', name: 'Purge file trash & documents permanently', category: 'Access Control', ADMIN: true, SENIOR: false, JUNIOR: false, PARALEGAL: false, SECRETARY: false, EXTERNAL: false, CLIENT: false },
  { id: 'sec-w', name: 'Design automatic workflow builders', category: 'Automations', ADMIN: true, SENIOR: true, JUNIOR: false, PARALEGAL: false, SECRETARY: false, EXTERNAL: false, CLIENT: false }
];

export default function RolesPermissions() {
  const [matrix, setMatrix] = useState<RolePrivilege[]>(DEFAULT_MATRIX);
  const [testUser, setTestUser] = useState('Alex Rivera');
  const [testUserRole, setTestUserRole] = useState<'ADMIN' | 'SENIOR' | 'JUNIOR' | 'PARALEGAL' | 'SECRETARY' | 'EXTERNAL' | 'CLIENT'>('SENIOR');
  const [customRules, setCustomRules] = useState<string[]>([
    'Can edit documents of category "Pleadings" regardless of ownership',
    'Cannot view Bank Swift Operating Accounts'
  ]);
  const [newRule, setNewRule] = useState('');

  const handleToggleCell = (id: string, role: 'ADMIN' | 'SENIOR' | 'JUNIOR' | 'PARALEGAL' | 'SECRETARY' | 'EXTERNAL' | 'CLIENT') => {
    if (role === 'ADMIN') return; // Admin always gets true for all permission metrics
    setMatrix(prev => prev.map(row => {
      if (row.id === id) {
        return {
          ...row,
          [role]: !row[role]
        };
      }
      return row;
    }));
  };

  const handleAddCustomRule = () => {
    if (!newRule.trim()) return;
    setCustomRules([...customRules, newRule.trim()]);
    setNewRule('');
  };

  return (
    <div className="space-y-6" id="settings-roles-permissions-panel">
      <div>
        <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Shield className="text-indigo-600" /> Operational Roles & Privileges Control Matrix</h3>
        <p className="text-xxs text-slate-450 mt-0.5">Edit granular page-by-page access gates, promote staff tiers, configure automatic inherits paths, and test permissions.</p>
      </div>

      {/* Visual Role Hierarchy tree representation */}
      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 select-none text-xxs text-center">
        <span className="text-[10px] font-black text-indigo-950 uppercase tracking-widest block text-left">Counsel Hierarchy Inheritance Pipeline</span>
        <div className="flex flex-wrap justify-between items-center gap-2 bg-white rounded-xl border border-slate-100 p-3 leading-tight relative">
          
          {[
            { tag: 'ADMIN', label: 'Company Owner', desc: 'Uncontrolled omnipotent permissions, can purge audits' },
            { tag: 'SENIOR', label: 'Senior Advocate / Partner', desc: 'Inherits lower, manages case files rate schedules' },
            { tag: 'JUNIOR', label: 'Junior Lawyer', desc: 'Inherits lower, edits cases & drafting templates' },
            { tag: 'PARALEGAL', label: 'Paralegal Clerk', desc: 'Inherits lower, populates custom folders only' },
            { tag: 'SECRETARY', label: 'Assigned Secretary', desc: 'Inherits base, schedules dates & court calendars' },
            { tag: 'EXTERNAL', label: 'Consultant Counsel', desc: 'Views allocated briefs, chats in designated cells' },
            { tag: 'CLIENT', label: 'Retainer Client', desc: 'View-only, receives update notifications & signs briefs' }
          ].map((node, i, arr) => (
            <React.Fragment key={node.tag}>
              <div className="p-2 border rounded-xl shadow-xxs bg-slate-50/50 hover:bg-slate-50 border-slate-200 text-left min-w-[130px] flex-1">
                <span className="block font-black text-slate-800 font-mono text-[9px] mb-0.5">{node.tag}</span>
                <span className="block font-bold text-slate-500 text-[10px]">{node.label}</span>
                <span className="block text-[8px] text-slate-400 mt-0.5 leading-none">{node.desc}</span>
              </div>
              {i < arr.length - 1 && (
                <span className="text-slate-300 font-black animate-pulse font-mono hidden xl:inline">&rarr;</span>
              )}
            </React.Fragment>
          ))}

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Permission matrix table */}
        <div className="lg:col-span-8 border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xxs select-none">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-black text-slate-600 uppercase">
                <th className="p-3">Privileges Statement</th>
                <th className="p-1.5 text-center">ADM</th>
                <th className="p-1.5 text-center">SNR</th>
                <th className="p-1.5 text-center">JNR</th>
                <th className="p-1.5 text-center">PAR</th>
                <th className="p-1.5 text-center">SEC</th>
                <th className="p-1.5 text-center">EXT</th>
                <th className="p-1.5 text-center">CLI</th>
              </tr>
            </thead>
            <tbody className="divide-y font-semibold">
              {matrix.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="p-3">
                    <span className="block font-bold text-slate-800">{row.name}</span>
                    <span className="block text-[9px] text-slate-400">{row.category}</span>
                  </td>
                  {(['ADMIN', 'SENIOR', 'JUNIOR', 'PARALEGAL', 'SECRETARY', 'EXTERNAL', 'CLIENT'] as const).map(role => {
                    const isAllowed = row[role];
                    const isAdm = role === 'ADMIN';
                    return (
                      <td key={role} className="p-1 text-center font-bold">
                        <button 
                          onClick={() => handleToggleCell(row.id, role)}
                          disabled={isAdm}
                          className={`h-6 w-6 rounded-md inline-flex items-center justify-center transition border ${isAllowed ? 'bg-indigo-50 border-indigo-150 text-indigo-600' : 'bg-rose-50/40 border-rose-100 text-rose-500'} ${isAdm ? 'opacity-50 cursor-not-allowed bg-indigo-50 text-indigo-700 font-black' : 'cursor-pointer hover:shadow-xxs'}`}
                        >
                          {isAllowed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 bg-slate-50/30 border-t text-[10px] text-slate-500 text-left">
            💡 Clicking any allowance node in the matrix toggle-flips privileges instantly. Safe backups are committed.
          </div>
        </div>

        {/* User preview dashboard & custom rules parameters */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Live Permission testing gate */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 text-left">
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Safe Privileges Sandbox Preview</span>
            
            <div className="space-y-2 text-xxs font-bold">
              <div>
                <label className="block text-[10px] text-slate-500">Pick Counselor to probe:</label>
                <select 
                  value={testUser}
                  onChange={e => {
                    setTestUser(e.target.value);
                    const mapping: Record<string, 'ADMIN' | 'SENIOR' | 'JUNIOR' | 'PARALEGAL' | 'SECRETARY' | 'EXTERNAL' | 'CLIENT'> = {
                      'Alex Rivera': 'SENIOR',
                      'Senior Partner': 'ADMIN',
                      'Secretary Clerk': 'SECRETARY',
                      'Staff Attorney': 'JUNIOR',
                      'Retainer client Joe': 'CLIENT'
                    };
                    setTestUserRole(mapping[e.target.value] || 'JUNIOR');
                  }}
                  className="w-full border p-2 bg-slate-50 focus:bg-white rounded-xl text-xs font-bold"
                >
                  <option value="Alex Rivera">Alex Rivera, Instructing Lawyer</option>
                  <option value="Senior Partner">Senior Partner, Executive</option>
                  <option value="Secretary Clerk">Secretary Clerk, Admin Staff</option>
                  <option value="Staff Attorney">Staff Attorney, Associate</option>
                  <option value="Retainer client Joe">Joe Client, Beneficiary</option>
                </select>
              </div>

              <div>
                <span className="block text-[10px] text-slate-500 mt-1">Effective assigned Role:</span>
                <span className="inline-block p-1 px-2.5 bg-slate-800 text-slate-100 rounded-full font-mono text-[9px] mt-1 uppercase tracking-wider">{testUserRole}</span>
              </div>

              <div className="border-t pt-2 space-y-1 text-xxs font-semibold">
                <span className="text-[10px] font-bold text-slate-600 block">Tested Sandbox Allowances:</span>
                {matrix.map(pv => {
                  const allowed = pv[testUserRole];
                  return (
                    <div key={pv.id} className="flex justify-between items-center py-0.5">
                      <span className="text-slate-650 truncate max-w-[180px]">{pv.name}</span>
                      <span className={`font-mono font-bold text-[9px] ${allowed ? 'text-emerald-600 bg-emerald-50 px-1 rounded' : 'text-rose-500 bg-rose-50 px-1 rounded'}`}>
                        {allowed ? 'GRANTED' : 'DENIED'}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Custom procedural exceptions */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 text-left">
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Custom Exception rules</span>
            
            <div className="space-y-1.5">
              {customRules.map((rule, idx) => (
                <div key={idx} className="p-2 border rounded-xl text-xxs font-bold text-slate-650 bg-slate-50/50 flex justify-between items-start leading-tight">
                  <span>{rule}</span>
                  <button 
                    type="button" 
                    onClick={() => setCustomRules(customRules.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-500 shrink-0 ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5 pt-2">
              <input 
                type="text" 
                placeholder="Declare custom override..."
                value={newRule}
                onChange={e => setNewRule(e.target.value)}
                className="flex-1 text-xxs border p-2 rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              />
              <button 
                type="button" 
                onClick={handleAddCustomRule}
                className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl"
              >
                <PlusCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
