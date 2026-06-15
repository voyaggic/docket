import React, { useState } from 'react';
import { 
  Plus, Play, X, Trash, ArrowDown, ArrowUp, ChevronRight, Sparkles, Check, 
  HelpCircle, Copy, FileText, Settings, AlignLeft, Calendar, FileCheck, HelpCircle as QueryIcon
} from 'lucide-react';

interface Block {
  id: string;
  type: 'heading' | 'paragraph' | 'signature' | 'party_details' | 'clause_selector' | 'variable' | 'conditional';
  content: string;
  variableName?: string;
  variableType?: string;
  required?: boolean;
  conditionalRule?: {
    variable: string;
    operator: string;
    value: string;
  };
}

interface DocumentBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (template: { name: string; description: string; variables: string[]; content: string }) => void;
}

export default function DocumentBuilder({ isOpen, onClose, onPublish }: DocumentBuilderProps) {
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [useLetterhead, setUseLetterhead] = useState(true);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 'b-1', type: 'heading', content: 'LETTER OF ENGAGEMENT AND MANDATE' },
    { id: 'b-2', type: 'party_details', content: 'Auto-populated from [CLIENT NAME] and firm partner data.' },
    { id: 'b-3', type: 'paragraph', content: 'We hereby confirm that you have requested Docket Legal Partners to act as legal counsel on your behalf concerning the litigation matter as specified in the case description statement.' },
    { id: 'b-4', type: 'variable', content: 'RATES COVENANT', variableName: 'CLIENT BILLING RATE', variableType: 'number', required: true },
    { id: 'b-5', type: 'conditional', content: 'Special Civil Indemnity Paragraph: Under standard Rules of Civil Procedure we include liability exemptions.', variableName: 'MATTER_IS_CIVIL', conditionalRule: { variable: 'Case Type', operator: 'equals', value: 'Civil' } },
    { id: 'b-6', type: 'signature', content: 'Signatures block placeholder' },
  ]);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('b-4');

  const addBlock = (type: Block['type']) => {
    const fresh: Block = {
      id: `b-${Date.now()}`,
      type,
      content: type === 'heading' ? 'New Section Heading' : 
               type === 'variable' ? 'Variable Token field' :
               type === 'conditional' ? 'Conditional toggle section content' : 'New legal covenant paragraph content.',
      variableName: type === 'variable' || type === 'conditional' ? `VARIABLE_${blocks.length + 1}` : undefined,
      variableType: type === 'variable' ? 'text' : undefined,
      required: type === 'variable' ? true : undefined
    };
    setBlocks([...blocks, fresh]);
    setSelectedBlockId(fresh.id);
  };

  const deleteBlock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const copy = [...blocks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= copy.length) return;
    
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setBlocks(copy);
  };

  const updateBlockContent = (id: string, text: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content: text } : b));
  };

  const updateBlockVar = (id: string, field: 'variableName' | 'variableType' | 'required', value: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handlePublish = () => {
    if (!templateName) return;
    const extractedVars = blocks
      .filter(b => b.type === 'variable')
      .map(b => b.variableName || '')
      .filter(Boolean);
    
    // Always include CLIENT NAME as default variable
    if (!extractedVars.includes('CLIENT NAME')) {
      extractedVars.unshift('CLIENT NAME');
    }

    const templateContent = blocks.map(b => {
      if (b.type === 'heading') return `## ${b.content.toUpperCase()}`;
      if (b.type === 'variable') return `[Variable input for ${b.variableName}: ${b.content}]`;
      if (b.type === 'conditional') return `[[Conditional Rule if ${b.conditionalRule?.variable || 'MATTER'} ${b.conditionalRule?.operator || 'is'} ${b.conditionalRule?.value || 'True'}]: ${b.content}]`;
      return b.content;
    }).join('\n\n');

    onPublish({
      name: templateName,
      description: templateDesc || 'No summary overview provided.',
      variables: extractedVars,
      content: templateContent
    });
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-hidden" id="full-visual-template-builder">
      <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Title header bar */}
        <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-400" />
            <div>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest font-mono">WORKSPACE ATELIER</span>
              <h3 className="text-sm font-black uppercase tracking-wider leading-tight">Visual Block Template Composer</h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex gap-1">
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 text-xxs font-bold rounded-md transition ${activeTab === 'edit' ? 'bg-sky-500 text-slate-900' : 'text-slate-400'}`}
              >
                Visual Block Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-xxs font-bold rounded-md transition ${activeTab === 'preview' ? 'bg-sky-500 text-slate-900' : 'text-slate-400'}`}
              >
                Simulated Preview
              </button>
            </div>
            
            <button onClick={onClose} className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white text-xs font-bold transition">
              Close
            </button>
          </div>
        </div>

        {/* Content canvas split view */}
        <div className="flex-1 flex overflow-hidden bg-slate-50">
          
          {/* Left panel is the contents blocks available library */}
          <div className="w-64 border-r bg-white p-4 overflow-y-auto space-y-4 shrink-0">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. Meta Configurations</span>
              <input 
                type="text"
                placeholder="Template Name (e.g. Affidavit)"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none caret-indigo-600 transition font-bold text-slate-800"
              />
              <textarea 
                placeholder="Summary description overview..."
                value={templateDesc}
                onChange={e => setTemplateDesc(e.target.value)}
                rows={2}
                className="w-full text-[10px] p-2 border border-slate-200 rounded-lg outline-none caret-indigo-600 transition font-semibold resize-none mt-1 text-slate-800"
              />
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">2. Standard Layout Content Elements</span>
              <div className="grid grid-cols-1 gap-1.5 text-[11px] font-bold text-slate-700 font-mono">
                <button 
                  onClick={() => addBlock('heading')}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 border rounded-lg transition text-left"
                >
                  <AlignLeft className="h-4 w-4 text-emerald-600 shrink-0" /> Style Heading Line
                </button>
                <button 
                  onClick={() => addBlock('paragraph')}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 border rounded-lg transition text-left"
                >
                  <FileText className="h-4 w-4 text-emerald-600 shrink-0" /> Legal Paragraph Block
                </button>
                <button 
                  onClick={() => addBlock('party_details')}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 border rounded-lg transition text-left"
                >
                  <Settings className="h-4 w-4 text-sky-500 shrink-0" /> Party Auto-Populations
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">3. Token Form Inputs Variables</span>
              <div className="grid grid-cols-1 gap-1.5 text-[11px] font-bold text-slate-700 font-mono">
                <button 
                  onClick={() => addBlock('variable')}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 border border-amber-200 bg-amber-50/10 rounded-lg transition text-left"
                >
                  <Calendar className="h-4 w-4 text-amber-500 shrink-0" /> Add Variable Text Token
                </button>
                <button 
                  onClick={() => addBlock('conditional')}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 border border-violet-200 bg-violet-50/10 rounded-lg transition text-left"
                >
                  <Sparkles className="h-4 w-4 text-violet-500 shrink-0" /> Conditional Case Section
                </button>
                <button 
                  onClick={() => addBlock('signature')}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 border rounded-lg transition text-left"
                >
                  <FileCheck className="h-4 w-4 text-slate-600 shrink-0" /> Corporate Signatures Block
                </button>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-2 bg-slate-55 p-3.5 bg-slate-50 rounded-xl space-y-2 border">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Global Properties</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="use-letterhead-check"
                  checked={useLetterhead}
                  onChange={e => setUseLetterhead(e.target.checked)}
                  className="rounded text-sky-600"
                />
                <label htmlFor="use-letterhead-check" className="text-[10px] font-bold text-slate-600 cursor-pointer uppercase">Include Firm Letterhead</label>
              </div>
            </div>
          </div>

          {/* Center Canvas is the blocks layout */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'edit' ? (
              <div className="max-w-2xl mx-auto bg-white border rounded-2xl shadow-sm p-8 space-y-4 relative min-h-[600px] border-slate-200">
                
                {/* Simulated corporate letterhead */}
                {useLetterhead && (
                  <div className="border-b-2 border-slate-900 pb-3 text-center mb-8 bg-slate-50 p-2.5 rounded-lg border-dashed">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">DOCKET LEGAL CHAMBERS & ASSOCIATES</h2>
                    <p className="text-[9px] text-slate-400 font-mono">100 Supreme Plaza, Suite 400 • legal@docketpractice.com • TEL: (254) 790-1234</p>
                  </div>
                )}

                {blocks.map((block, index) => {
                  const isSelected = block.id === selectedBlockId;
                  return (
                    <div
                      key={block.id}
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`p-3 border rounded-xl relative group transition cursor-pointer ${
                        isSelected ? 'border-sky-500 bg-sky-50/10 shadow-xs' : 'border-slate-150 bg-white hover:border-slate-350 hover:shadow-2xs'
                      }`}
                    >
                      {/* Controls on hover */}
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-0.5 transition bg-white p-0.5 border rounded-lg shadow-sm">
                        <button 
                          onClick={(e) => moveBlock(index, 'up', e)} 
                          disabled={index === 0}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button 
                          onClick={(e) => moveBlock(index, 'down', e)} 
                          disabled={index === blocks.length - 1}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button 
                          onClick={(e) => deleteBlock(block.id, e)} 
                          className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-slate-500"
                        >
                          <Trash className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Header Badge */}
                      <span className="text-[8px] font-black font-mono uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded block w-fit mb-1.5 select-none">
                        {block.type.replace('_', ' ')}
                      </span>

                      {/* Block Rendering based on type */}
                      {block.type === 'heading' && (
                        <input
                          type="text"
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          className="text-sm font-black text-slate-800 bg-transparent w-full border-none outline-none caret-indigo-600 focus:bg-slate-100 p-1 rounded transition"
                        />
                      )}

                      {block.type === 'paragraph' && (
                        <textarea
                          rows={2}
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          className="text-xs text-slate-600 leading-relaxed bg-transparent w-full border-none outline-none caret-indigo-600 focus:bg-slate-100 p-1 rounded resize-none transition"
                        />
                      )}

                      {block.type === 'party_details' && (
                        <div className="p-2.5 bg-slate-50 border rounded-lg text-[10px] text-slate-500 space-y-1">
                          <p className="font-semibold"><strong>[AUTO-MAPPED PARTY DETAIL WRAP]</strong></p>
                          <p>Pulls case litigant name, court, judge details and reference registry variables automatically.</p>
                        </div>
                      )}

                      {block.type === 'variable' && (
                        <div className="space-y-1.5 p-1 bg-amber-50/10 rounded">
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded font-mono">
                              VARIABLE: {block.variableName || 'UNSET'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 capitalize">({block.variableType || 'text'})</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Describe variable purpose here (e.g., Client fee amount or due deadline date)..."
                            value={block.content}
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            className="text-xs text-slate-750 bg-transparent w-full border border-slate-200 bg-white p-1.5 rounded font-semibold outline-none caret-indigo-600 transition"
                          />
                        </div>
                      )}

                      {block.type === 'conditional' && (
                        <div className="space-y-1.5 p-1 border border-dashed border-violet-200 bg-violet-50/10 rounded">
                          <span className="text-[10px] font-extrabold text-violet-700 bg-violet-100/50 px-2 py-0.5 rounded font-mono">
                            CONDITIONAL IF: {block.conditionalRule?.variable || 'Matter Type'} {block.conditionalRule?.operator || 'equals'} "{block.conditionalRule?.value || 'Civil'}"
                          </span>
                          <textarea
                            rows={1}
                            placeholder="Text rendered only when variable matches..."
                            value={block.content}
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            className="text-xs text-slate-755 bg-transparent w-full border border-slate-200 bg-white p-1.5 rounded font-semibold outline-none caret-indigo-600 transition resize-none text-slate-800"
                          />
                        </div>
                      )}

                      {block.type === 'signature' && (
                        <div className="border-t border-slate-200 pt-3 mt-6 flex justify-between text-[10px] text-slate-400 font-mono">
                          <div>
                            <div className="h-10 border-b border-slate-400 w-40 mb-1" />
                            <span>COUNSEL ALEX RIVERA, ESQ.</span>
                          </div>
                          <div>
                            <div className="h-10 border-b border-slate-400 w-40 mb-1" />
                            <span>PRIMARY LITIGANT SIGNATORY</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Simulated preview
              <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-10 space-y-4 shadow-sm min-h-[600px] font-sans text-xs">
                {useLetterhead && (
                  <div className="border-b-2 border-slate-800 pb-3 text-center mb-8">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">DOCKET LEGAL CHAMBERS & ASSOCIATES</h2>
                    <p className="text-[9px] text-slate-400">100 Supreme Plaza, Suite 400 • legal@docketpractice.com • TEL: (254) 790-1234</p>
                  </div>
                )}

                {blocks.map(b => {
                  if (b.type === 'heading') return <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b pb-1 mt-4">{b.content}</h3>;
                  if (b.type === 'paragraph') return <p className="text-slate-600 leading-relaxed font-semibold">{b.content}</p>;
                  if (b.type === 'party_details') return (
                    <div className="my-3 text-[11px] text-slate-700 bg-slate-50 p-3 rounded border font-mono">
                      <p><strong>IN THE HIGH COURT OF REPUBLIC JURISDICTIONS</strong></p>
                      <p className="mt-1">CLIENT REPRESENTATIVE: <strong>MARCUS VANCE, ESQ.</strong></p>
                      <p>COMPLIANCE REFERENCE: <strong>DK-MAT-CIVIL-2026</strong></p>
                    </div>
                  );
                  if (b.type === 'variable') return (
                    <div className="my-2 p-2 bg-amber-50 border border-amber-200 rounded text-slate-700 font-semibold gap-1.5 flex items-center">
                      <span className="font-extrabold text-[9px] uppercase tracking-wider bg-amber-200 text-amber-800 px-1 py-0.5 rounded">VARIABLE FILL GAPS</span>
                      <span>[{b.variableName}]: {b.content}</span>
                    </div>
                  );
                  if (b.type === 'conditional') return (
                    <div className="my-2 p-2 bg-violet-50 border border-violet-100 rounded text-slate-600">
                      <span className="font-extrabold text-[9px] uppercase tracking-wider bg-violet-200 text-violet-800 px-1 py-0.5 rounded mr-1">ACTIVE CONDITIONAL BLOCK</span>
                      <span>{b.content}</span>
                    </div>
                  );
                  if (b.type === 'signature') return (
                    <div className="border-t border-slate-200 pt-6 mt-12 flex justify-between text-[10px] uppercase font-bold text-slate-600">
                      <div>
                        <p className="h-6" />
                        <p>DRAFT SIGNED: ALEX RIVERA</p>
                      </div>
                      <div>
                        <p className="h-6" />
                        <p>DRAFT SIGNED: MARCUS VANCE</p>
                      </div>
                    </div>
                  );
                  return null;
                })}
              </div>
            )}
          </div>

          {/* Right panel is details editing tool for selected block */}
          <div className="w-80 border-l bg-white p-4 overflow-y-auto space-y-4 shrink-0">
            {selectedBlock ? (
              <div className="space-y-4" id="block-property-form">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Properties Inspector</h4>
                  <p className="text-[9px] text-slate-400">Configure parameters for block ID ({selectedBlock.id})</p>
                </div>

                <hr className="border-slate-100" />

                <div className="space-y-2 text-xxs font-semibold">
                  <div>
                    <label className="block text-[9px] font-black text-slate-550 uppercase">Block Type</label>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-1 rounded block mt-1 uppercase font-mono">
                      {selectedBlock.type}
                    </span>
                  </div>

                  {selectedBlock.type === 'variable' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase">Input Token Tag</label>
                        <input
                          type="text"
                          value={selectedBlock.variableName || ''}
                          onChange={(e) => updateBlockVar(selectedBlock.id, 'variableName', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                          className="w-full text-xs p-1.5 border border-slate-200 rounded mt-1 bg-slate-50 outline-none caret-indigo-600 focus:bg-white transition font-mono text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-550 uppercase">Form Validation Rules</label>
                        <select
                          value={selectedBlock.variableType || 'text'}
                          onChange={(e) => updateBlockVar(selectedBlock.id, 'variableType', e.target.value)}
                          className="w-full text-xs p-1.5 border border-slate-200 mt-1 rounded bg-white outline-none transition text-slate-800"
                        >
                          <option value="text">General Plain Text</option>
                          <option value="number">Positive Currency/Numeric</option>
                          <option value="date">Date picker format</option>
                          <option value="dropdown">Preconfigured Select Options</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="checkbox"
                          id="req-prop-chk"
                          checked={selectedBlock.required || false}
                          onChange={(e) => updateBlockVar(selectedBlock.id, 'required', e.target.checked)}
                          className="rounded text-sky-600"
                        />
                        <label htmlFor="req-prop-chk" className="text-[9px] font-black text-slate-500 uppercase cursor-pointer">Required parameter</label>
                      </div>
                    </div>
                  )}

                  {selectedBlock.type === 'conditional' && (
                    <div className="space-y-3 pt-2">
                      <span className="text-[9px] font-black text-slate-500 uppercase block">Rule triggers</span>
                      <div className="p-2 border rounded-lg bg-slate-50 space-y-1.5 text-[10px]">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase">If Case Variable</label>
                          <select className="w-full border p-1 bg-white rounded mt-0.5 font-mono text-[9px]">
                            <option value="Case Type">Matter Type Code</option>
                            <option value="Value">Financial Claims Value</option>
                            <option value="Court">Assigned Litigation Court</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase">Operator</label>
                            <select className="w-full border p-1 bg-white rounded mt-0.5">
                              <option value="equals">Equals</option>
                              <option value="contains">Contains</option>
                              <option value="is_greater">Greater than</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase">Match Value</label>
                            <input
                              type="text"
                              placeholder="Civil"
                              className="w-full border p-1 bg-white rounded mt-0.5 outline-none font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase">Covenant Text Description</label>
                    <textarea
                      rows={4}
                      value={selectedBlock.content}
                      onChange={(e) => updateBlockContent(selectedBlock.id, e.target.value)}
                      className="w-full text-xs border border-slate-200 p-2 mt-1 rounded bg-white resize-none outline-none caret-indigo-600 transition text-slate-800"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-slate-400 text-xxs">
                Select an active block card in the layout workspace to configure inline variables and specific verification logic tools.
              </div>
            )}
          </div>

        </div>

        {/* Footer save operations */}
        <div className="p-4 border-t bg-slate-55 flex justify-between items-center shrink-0 bg-slate-100">
          <div className="flex gap-2">
            <span className="text-xxs text-slate-500 font-semibold self-center font-mono">
              Total Variables: {blocks.filter(b => b.type === 'variable').length} | Conditions: {blocks.filter(b => b.type === 'conditional').length}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-4 py-2 border hover:bg-slate-50 font-bold rounded-xl bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={!templateName}
              className="text-xs px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              Confirm and Publish Template
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
