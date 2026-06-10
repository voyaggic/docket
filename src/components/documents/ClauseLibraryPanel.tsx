import React, { useState } from 'react';
import { Search, Plus, Check, FileText, Sparkles, BookOpen, Clock, Heart, HelpCircle, X } from 'lucide-react';

export interface Clause {
  id: string;
  title: string;
  category: string;
  matterType: string;
  jurisdiction: string;
  content: string;
  varsCount: number;
  usageCount: number;
  isFavorite?: boolean;
}

interface ClauseLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertClause?: (content: string) => void;
}

export default function ClauseLibraryPanel({ isOpen, onClose, onInsertClause }: ClauseLibraryPanelProps) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Custom new clause state
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('Contracts');
  const [newMatter, setNewMatter] = useState('Civil');
  const [newJurisdiction, setNewJurisdiction] = useState('Kenyan Court');
  const [newContent, setNewContent] = useState('');

  const [clauses, setClauses] = useState<Clause[]>([
    {
      id: 'cl-1',
      title: 'Dispute Resolution & Kenyan Court Grid',
      category: 'Disclaimer clauses',
      matterType: 'Civil Litigation',
      jurisdiction: 'Kenya',
      content: 'Any dispute, controversy or claim arising out of or relating to this agreement shall be settled through arbitration under the Nairobi Centre for International Arbitration (NCIA) rules.',
      varsCount: 2,
      usageCount: 88,
      isFavorite: true
    },
    {
      id: 'cl-2',
      title: 'Standard Indemnification',
      category: 'Contract clauses',
      matterType: 'Commercial',
      jurisdiction: 'United Kingdom',
      content: 'The client agrees to indemnify, defend and hold harmless the Firm from any liabilities, claims, or costs resulting from acts or omissions of the client.',
      varsCount: 1,
      usageCount: 142
    },
    {
      id: 'cl-3',
      title: 'Mutual Non-Disclosure Covenant',
      category: 'Contract clauses',
      matterType: 'Corporate',
      jurisdiction: 'Generic',
      content: 'The parties shall hold and maintain the Confidential Information in the strictest confidence and shall not disclose such information to any third party without consent.',
      varsCount: 3,
      usageCount: 210,
      isFavorite: true
    },
    {
      id: 'cl-4',
      title: 'Affidavit Service Attestation Statement',
      category: 'Affidavit clauses',
      matterType: 'Procedure',
      jurisdiction: 'South Africa',
      content: 'I, [SERVER NAME], solemnly declare that on the [DATE OF SERVICE], I served a true copy of the court summons upon the defendant, [RECIPIENT NAME] at their primary domicile.',
      varsCount: 4,
      usageCount: 45
    }
  ]);

  const handleCreateClause = () => {
    if (!newTitle || !newContent) return;
    const item: Clause = {
      id: `cl-${Date.now()}`,
      title: newTitle,
      category: newCat,
      matterType: newMatter,
      jurisdiction: newJurisdiction,
      content: newContent,
      varsCount: (newContent.match(/\[.*?\]/g) || []).length,
      usageCount: 0
    };
    setClauses([item, ...clauses]);
    setNewTitle('');
    setNewContent('');
    setShowAddForm(false);
  };

  const toggleFavorite = (id: string) => {
    setClauses(clauses.map(c => c.id === id ? { ...c, isFavorite: !c.isFavorite } : c));
  };

  const filteredClauses = clauses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                          c.content.toLowerCase().includes(search.toLowerCase());
    const matchesCat = catFilter === 'All' || c.category === catFilter;
    return matchesSearch && matchesCat;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l z-50 flex flex-col transition-all pr-1" id="clause-library-panel">
      
      {/* Header */}
      <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-sky-400 animate-pulse" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider">Clause Reference Repository</h3>
            <p className="text-[10px] text-slate-300">Quick-inject verified legal clauses</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* AI Recommendation Alert */}
      <div className="p-3 bg-violet-50 border-b border-violet-100 flex gap-2 items-start" id="ai-clause-suggest">
        <Sparkles className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <span className="text-[10px] font-bold text-violet-800 block">AI Recommendation Engine</span>
          <p className="text-[10px] text-slate-600 leading-tight">
            Based on active case parameters, we suggest injecting the <strong>Dispute Resolution NCIA Clause</strong> for high compliance.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-3 bg-slate-50 space-y-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search clause library..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 border bg-white rounded-lg outline-none focus:border-slate-400"
          />
        </div>

        {/* Categories Grid */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {['All', 'Contract clauses', 'Affidavit clauses', 'Disclaimer clauses'].map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 whitespace-nowrap rounded border shrink-0 transition ${
                catFilter === cat ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {showAddForm ? (
          <div className="p-3 border rounded-xl bg-slate-50 space-y-3 relative" id="new-clause-form">
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add Standard Custom Clause
            </h4>
            <div className="space-y-2 text-xxs">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Clause Title</label>
                <input
                  type="text"
                  placeholder="e.g. Arbitration Jurisdiction"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full border p-1.5 mt-0.5 bg-white rounded outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Category</label>
                  <select
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    className="w-full border p-1 bg-white rounded mt-0.5"
                  >
                    <option value="Contract clauses">Contracts</option>
                    <option value="Affidavit clauses">Affidavits</option>
                    <option value="Disclaimer clauses">Disclaimers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Jurisdiction</label>
                  <input
                    type="text"
                    placeholder="e.g. Kenya"
                    value={newJurisdiction}
                    onChange={e => setNewJurisdiction(e.target.value)}
                    className="w-full border p-1 bg-white rounded mt-0.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Clause Body (use [VAL] for tokens)</label>
                <textarea
                  rows={4}
                  placeholder="The parties covenant that..."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full border p-1.5 mt-0.5 bg-white rounded outline-none resize-none"
                />
              </div>

              <div className="flex gap-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1 border hover:bg-slate-100 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateClause}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded"
                >
                  Save Clause
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-400 hover:text-slate-600 transition font-bold text-xxs tracking-wider uppercase rounded-xl flex items-center justify-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Append New Standard Clause
          </button>
        )}

        {/* Clauses List */}
        <div className="space-y-2.5" id="clause-list-scroller">
          {filteredClauses.map(c => (
            <div key={c.id} className="p-3 border rounded-xl hover:border-slate-300 bg-white shadow-2xs space-y-2 transition relative group">
              <div className="flex justify-between items-start">
                <div className="pr-5">
                  <h5 className="text-[11px] font-bold text-slate-800 leading-tight inline-flex items-center gap-1 mr-1">
                    {c.title}
                  </h5>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {c.category.split(' ')[0]}
                    </span>
                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                      {c.jurisdiction}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleFavorite(c.id)}
                  className={`text-slate-300 hover:text-amber-500 pointer-events-auto ${c.isFavorite ? 'text-amber-500' : ''}`}
                >
                  <Heart className="h-3 w-3 fill-current" />
                </button>
              </div>

              <p className="text-[10px] text-slate-500 font-mono lead-relaxed bg-slate-50 p-2 border rounded-lg whitespace-pre-wrap">{c.content}</p>

              <div className="flex justify-between items-center text-[9px] pt-1">
                <span className="text-slate-400 font-semibold font-mono">Usage Rate: {c.usageCount} injections</span>
                <button
                  onClick={() => onInsertClause && onInsertClause(c.content)}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[8px] transition shadow-xs"
                >
                  + Inject Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
