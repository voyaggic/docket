import React, { useState } from 'react';
import { BookOpen, Search, Copy, Check, Plus, Tag, HelpCircle, X } from 'lucide-react';

interface Precedent {
  id: string;
  title: string;
  matterType: string;
  description: string;
  content: string;
  tags: string[];
  usageCount: number;
}

interface PrecedentLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  caseType?: string;
  onImportPrecedent?: (text: string) => void;
}

const DEFAULT_PRECEDENTS: Precedent[] = [
  {
    id: 'pr-1',
    title: 'Breach of Commercial Covenant Defence',
    matterType: 'Civil',
    description: 'Defense brief asserting lack of material damage and non-occurrence of precedent conditions under Commercial Contracts.',
    content: 'The Defendant denies that any breach of clause 14 has occurred. Alternatively, if such breach did occur (which is denied), the Plaintiff has failed to prove any material loss. No specific damage has been pleaded, and the claim remains purely speculative.',
    tags: ['Contracts', 'Commercial', 'Default defence'],
    usageCount: 42
  },
  {
    id: 'pr-2',
    title: 'Criminal Representation Mitigating Factors',
    matterType: 'Criminal',
    description: 'Standard mitigation statements for first-time offenders showing active cooperation and clean prior character lists.',
    content: 'The Defendant submits that they have co-operated fully with the authorities at every stage of the investigation. Given the clean record and absence of prior convictions, we pray for non-custodial or educational supervision orders in lieu of confinement.',
    tags: ['Mitigation', 'Criminal', 'Cooperation'],
    usageCount: 29
  },
  {
    id: 'pr-3',
    title: 'Family Custody Consent Order Framework',
    matterType: 'Family',
    description: 'Bilateral access schedule focusing on standard civil holidays, dual parental responsibilities, and schooling adjustments.',
    content: 'Both Parents shall have shared parental responsibility for the child. The child shall reside primarily with the Mother during school terms, with reasonable alternate weekend access scheduled to the Father from Friday 16:00 to Sunday 18:00.',
    tags: ['Child support', 'Custody', 'Consent order'],
    usageCount: 51
  },
  {
    id: 'pr-4',
    title: 'Strict Liability Exclusion Particulars',
    matterType: 'Civil',
    description: 'Demurrer submission asserting statutory exemptions and force majeure exceptions on industrial premises liability claims.',
    content: 'The Defendant relies on the Statutory Exclusion of Premise Liability under section 4(2) of the Act, which completely exonerates the proprietor upon proving that reasonable preventative inspections were systematically recorded.',
    tags: ['Torts', 'Industrial', 'Exclusion'],
    usageCount: 18
  },
  {
    id: 'pr-5',
    title: 'Intellectual Property Work-for-Hire Waiver',
    matterType: 'Transactional',
    description: 'Pleading confirm-assignment clause asserting employer ownership of proprietary code under software consultancy contracts.',
    content: 'Pursuant to Clause 12 of the Software Development Services Agreement dated 4th May, any and all intellectual property rights, inventions, and software source codes created during the contract period belong solely and exclusively to the Company.',
    tags: ['IP', 'Software', 'Employment'],
    usageCount: 23
  }
];

export default function PrecedentLibraryPanel({ isOpen, onClose, caseType, onImportPrecedent }: PrecedentLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customPrecedents, setCustomPrecedents] = useState<Precedent[]>(() => {
    try {
      const saved = localStorage.getItem('docket_precedent_library');
      return saved ? JSON.parse(saved) : DEFAULT_PRECEDENTS;
    } catch {
      return DEFAULT_PRECEDENTS;
    }
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addNewMode, setAddNewMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState(caseType || 'Civil');
  const [newDesc, setNewDesc] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('');

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSavePrecedent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    const added: Precedent = {
      id: 'pr-custom-' + Date.now(),
      title: newTitle,
      matterType: newType,
      description: newDesc,
      content: newContent,
      tags: newTagsStr.split(',').map(t => t.trim()).filter(Boolean),
      usageCount: 0
    };

    const updated = [added, ...customPrecedents];
    setCustomPrecedents(updated);
    localStorage.setItem('docket_precedent_library', JSON.stringify(updated));

    // Reset
    setNewTitle('');
    setNewDesc('');
    setNewContent('');
    setNewTagsStr('');
    setAddNewMode(false);
  };

  const filteredPrecedents = customPrecedents.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q));
    
    return matchesSearch;
  });

  return (
    <div className="fixed inset-y-0 right-0 w-80 md:w-96 bg-white shadow-2xl z-50 border-l border-slate-200 flex flex-col animate-slide-in" id="precedent-library-drawer">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-sky-400" />
          <h3 className="font-bold text-sm">Precedent Library</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Action Toggle Tab */}
      <div className="flex border-b text-xs font-bold bg-slate-50">
        <button
          onClick={() => setAddNewMode(false)}
          className={`flex-1 p-3 text-center border-b-2 transition ${!addNewMode ? 'border-sky-500 text-sky-500 bg-white' : 'border-transparent text-slate-500'}`}
        >
          Browse Precedents
        </button>
        <button
          onClick={() => setAddNewMode(true)}
          className={`flex-1 p-3 text-center border-b-2 transition ${addNewMode ? 'border-sky-500 text-sky-500 bg-white' : 'border-transparent text-slate-500'}`}
        >
          + Add Pleading Precedent
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!addNewMode ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-3 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search legal precedents/winning texts..."
                className="w-full text-xs pl-11 pr-4 py-2.5 border rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-1 focus:ring-sky-150 transition"
              />
            </div>

            {/* List */}
            {filteredPrecedents.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No matching legal precedents located.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPrecedents.map(prec => (
                  <div key={prec.id} className="p-3.5 bg-slate-50 border border-slate-250/20 rounded-xl space-y-2.5 hover:shadow-xs transition">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold text-sky-705 text-sky-800 bg-sky-50 border border-sky-150 rounded px-1.5 py-0.5 animate-fadeIn">
                        {prec.matterType} Standard Statement
                      </span>
                      <span className="text-[9px] text-slate-400">Used {prec.usageCount} times</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{prec.title}</h4>
                      <p className="text-[10px] text-slate-550 mt-0.5">{prec.description}</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border text-xxs text-slate-600 italic block leading-relaxed max-h-[100px] overflow-y-auto">
                      "{prec.content}"
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {prec.tags.map((t, idx) => (
                        <span key={idx} className="text-[8px] bg-slate-100 font-medium text-slate-550 px-1 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2 justify-end pt-1 border-t">
                      {onImportPrecedent && (
                        <button
                          onClick={() => {
                            onImportPrecedent(prec.content);
                            prec.usageCount++;
                          }}
                          className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5 outline-none"
                        >
                          Import inline &rarr;
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(prec.id, prec.content)}
                        className="text-[10px] text-slate-500 font-bold hover:text-slate-800 cursor-pointer flex items-center gap-1 focus:outline-none"
                      >
                        {copiedId === prec.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-2.5 w-2.5" />
                            <span>Copy Citation</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSavePrecedent} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-650 uppercase">Precedent Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="E.g. Breach of Duty Exclusion Clause"
                className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-sky-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-650 uppercase">Matter Category</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full text-xs p-2 border rounded-xl outline-none"
                >
                  <option value="Civil">Civil Claims</option>
                  <option value="Criminal">Criminal Practice</option>
                  <option value="Family">Family Mediation</option>
                  <option value="Transactional">Corporate M&A</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-650 uppercase">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={e => setNewTagsStr(e.target.value)}
                  placeholder="Torts, Exemption"
                  className="w-full text-xs p-2 border rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-650 uppercase">Brief Explanation</label>
              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="When is this argument appropriate to deploy?"
                className="w-full text-xs p-2.5 border rounded-xl outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-650 uppercase">Precedent Statement Content</label>
              <textarea
                required
                rows={5}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Write the precise wording of the winning brief citation or consent rules..."
                className="w-full text-xs p-2.5 border rounded-xl outline-none leading-relaxed font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition min-h-[44px]"
            >
              Commit to Precedent Library
            </button>
          </form>
        )}
      </div>

      {/* Info Footnote */}
      <div className="p-3.5 bg-slate-50 border-t text-[10px] text-slate-400 flex items-center gap-1.5">
        <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
        <span>Precedent texts are automatically logged, cataloged, and made search-ready for future drafts.</span>
      </div>
    </div>
  );
}
