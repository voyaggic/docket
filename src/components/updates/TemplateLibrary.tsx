import React, { useState } from 'react';
import { X, Search, Plus, Bookmark, Activity, Table } from 'lucide-react';
import { CorrespondenceTemplate } from './types';

interface TemplateLibraryProps {
  onSelect: (template: CorrespondenceTemplate) => void;
  onClose: () => void;
}

export default function TemplateLibrary({ onSelect, onClose }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<CorrespondenceTemplate[]>([
    {
      id: 'tpl-1',
      companyId: '1',
      name: 'Court Hearing Outcome Update',
      category: 'Criminal',
      matterType: 'Criminal Defence',
      eventType: 'Hearing',
      richContent: 'Dear [CLIENT_NAME],<br /><br />I am writing to update you on today\'s session before the [COURT_NAME]. The judge has ordered that the trial be adjourned to [NEXT_HEARING_DATE].<br /><br />We will receive further filings within the next week. We advise preparing standard defense arguments before the deadline.<br /><br />Best regards,<br />[ASSIGNED_LAWYER_NAME]',
      variables: ['CLIENT_NAME', 'COURT_NAME', 'NEXT_HEARING_DATE', 'ASSIGNED_LAWYER_NAME'],
      conditionalBlocks: [],
      disclaimers: ['privilege-standard'],
      isDefault: true,
      isFirmWide: true,
      usageCount: 125,
      lastUsedAt: '2026-06-03T10:00:00Z'
    },
    {
      id: 'tpl-2',
      companyId: '1',
      name: 'Settlement Negotiation Brief',
      category: 'Civil',
      matterType: 'Litigation Dispute',
      eventType: 'Settlement',
      richContent: 'Dear [CLIENT_FIRST_NAME],<br /><br />An updated settlement proposal has been formulated under [MATTER_REFERENCE]. The opposing party has agreed to resolve claims under favorable terms of $[CASE_VALUE] value threshold.<br /><br />Please sign and reply to consent before registry close.',
      variables: ['CLIENT_FIRST_NAME', 'MATTER_REFERENCE', 'CASE_VALUE'],
      conditionalBlocks: [],
      disclaimers: ['full-confidentiality-disclosure'],
      isDefault: false,
      isFirmWide: true,
      usageCount: 47,
      lastUsedAt: '2026-05-29T14:30:00Z'
    },
    {
      id: 'tpl-3',
      companyId: '1',
      name: 'Adjournment Notification Briefing',
      category: 'Civil',
      matterType: 'Family Law',
      eventType: 'Adjournment',
      richContent: 'Dear [CLIENT_NAME],<br /><br />This is a formal update that the matter [MATTER_REFERENCE] before the [COURT_NAME] originally scheduled has been adjourned to [NEXT_HEARING_DATE] due to docket scheduling conflicts.',
      variables: ['CLIENT_NAME', 'MATTER_REFERENCE', 'COURT_NAME', 'NEXT_HEARING_DATE'],
      conditionalBlocks: [],
      disclaimers: [],
      isDefault: false,
      isFirmWide: true,
      usageCount: 33
    }
  ]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'mine' | 'firm'>('all');
  const [showAdd, setShowAdd] = useState(false);

  // New template fields
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState('Criminal');
  const [newContent, setNewContent] = useState('');

  const handleCreate = () => {
    if (!newName || !newContent) return;
    const item: CorrespondenceTemplate = {
      id: `tpl-${Date.now()}`,
      companyId: '1',
      name: newName,
      category: newCat,
      richContent: newContent,
      variables: [],
      conditionalBlocks: [],
      disclaimers: [],
      isDefault: false,
      isFirmWide: true,
      usageCount: 0
    };
    setTemplates([item, ...templates]);
    setNewName('');
    setNewContent('');
    setShowAdd(false);
  };

  const filtered = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                        t.richContent.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'All' || t.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="absolute right-0 top-0 bottom-0 w-85 bg-white border-l border-slate-200 z-40 flex flex-col shadow-2xl animate-slide-in">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 font-sans">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4.5 w-4.5 text-indigo-650" />
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Template Library</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 border-b border-slate-100 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 text-slate-400 h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs border pl-8 pr-3 py-1.5 bg-slate-50 rounded-lg outline-none"
          />
        </div>

        {/* Tab channels bar */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
          {['All', 'Criminal', 'Civil', 'Corporate', 'Property', 'Family', 'Employment'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition select-none cursor-pointer whitespace-nowrap ${
                selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Pane Content scroll */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {showAdd ? (
          <div className="bg-slate-50 p-3 rounded-xl border space-y-3.5 text-xxs font-semibold">
            <h4 className="text-[10px] font-black uppercase text-slate-700">Configure Correspondence Template</h4>
            
            <div className="space-y-1">
              <label className="text-slate-450 uppercase block">Template Name *</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Criminal Defence Hearing report etc..."
                className="w-full p-2 border bg-white rounded-lg text-xs outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-450 uppercase block">Category *</label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                className="w-full p-2 border bg-white rounded-lg text-xs outline-none"
              >
                <option value="Criminal">Criminal</option>
                <option value="Civil">Civil</option>
                <option value="Corporate">Corporate</option>
                <option value="Property">Property</option>
                <option value="Family">Family</option>
                <option value="Employment">Employment</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-450 uppercase block">Rich Content Layout *</label>
              <textarea
                rows={5}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Enter formal letter document template. Use [CLIENT_NAME] tags."
                className="w-full p-2 border bg-white rounded-lg text-xs font-mono resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 p-2 bg-white text-slate-505 border rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName || !newContent}
                className="flex-1 p-2 bg-indigo-650 text-white rounded-lg cursor-pointer"
              >
                Save Template
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-1.5 border border-dashed border-indigo-300 hover:bg-slate-50 text-indigo-600 p-2.5 rounded-xl font-bold text-xxs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> New Template
            </button>

            <div className="space-y-2.5">
              {filtered.map(t => (
                <div
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="p-3 bg-white border border-slate-105 hover:border-indigo-400 rounded-xl transition cursor-pointer space-y-2 text-left shadow-xxs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[10.5px] font-black text-slate-850 leading-tight">
                        {t.name}
                      </h4>
                      <p className="text-[8.5px] text-slate-400 mt-0.5">Category: <b className="text-slate-600">{t.category}</b></p>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-slate-450 bg-slate-50 p-2 rounded-lg leading-relaxed line-clamp-3 italic block font-mono">
                    {t.richContent.replace(/<br\s*\/?>/gi, ' ')}
                  </p>

                  <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-bold border-t pt-1.5">
                    <span className="bg-indigo-50 border border-indigo-150 text-indigo-750 px-1 py-0.5 rounded text-[8px] font-black">
                      {t.variables.length} VARIABLES
                    </span>
                    <span>Used {t.usageCount} times</span>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center italic text-slate-405 py-6">No matching templates found.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
