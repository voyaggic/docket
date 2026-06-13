import React, { useState } from 'react';
import { X, Check, FileText, ChevronRight, HelpCircle, Loader2, List, MoveUp, MoveDown, BookOpen, FileCheck } from 'lucide-react';
import { Case, GeneratedDocument } from '../../types';

interface CourtBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case & { docs?: GeneratedDocument[] };
  linkedCases?: Array<Case & { docs?: GeneratedDocument[] }>;
  onBundleGenerated: (bundleDoc: GeneratedDocument) => void;
}

export default function CourtBundleModal({ isOpen, onClose, caseData, linkedCases = [], onBundleGenerated }: CourtBundleModalProps) {
  const [step, setStep] = useState(1);
  const [compiling, setCompiling] = useState(false);

  // Documents selection list
  const mainDocs = caseData.docs || [];
  const linkedDocsList = linkedCases.flatMap(lc => (lc.docs || []).map(d => ({ ...d, isLinked: true, caseRef: lc.referenceNumber })));
  const allAvailableDocs = [...mainDocs, ...linkedDocsList];

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(allAvailableDocs.map(d => d.id));
  const [orderedDocIds, setOrderedDocIds] = useState<string[]>(allAvailableDocs.map(d => d.id));

  // Settings
  const [bundleTitle, setBundleTitle] = useState(`${caseData.referenceNumber || 'Matter'}_Court_Bundle_Volume_1`);
  const [bundleRef, setBundleRef] = useState(`BUNDLE-${caseData.referenceNumber || 'DK001'}-${Math.floor(Math.random() * 900) + 100}`);
  const [includeCover, setIncludeCover] = useState(true);
  const [includeIndex, setIncludeIndex] = useState(true);
  const [numberingStyle, setNumberingStyle] = useState<'continuous' | 'per_doc' | 'none'>('continuous');
  const [sectionsDividers, setSectionsDividers] = useState(true);

  if (!isOpen) return null;

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const items = [...orderedDocIds];
    const temp = items[idx];
    items[idx] = items[idx - 1];
    items[idx - 1] = temp;
    setOrderedDocIds(items);
  };

  const handleMoveDown = (idx: number) => {
    if (idx === orderedDocIds.length - 1) return;
    const items = [...orderedDocIds];
    const temp = items[idx];
    items[idx] = items[idx + 1];
    items[idx + 1] = temp;
    setOrderedDocIds(items);
  };

  const handleNextStep = () => {
    if (selectedDocIds.length === 0) {
      alert("Please check at least one legal file to bundle.");
      return;
    }
    // Update order array to include only selected
    setOrderedDocIds(prev => prev.filter(id => selectedDocIds.includes(id)));
    setStep(step + 1);
  };

  const handleGenerate = () => {
    setCompiling(true);
    setTimeout(() => {
      setCompiling(false);
      
      const filterDocs = orderedDocIds.map(id => allAvailableDocs.find(d => d.id === id)).filter(Boolean) as GeneratedDocument[];
      
      // Simulate compiling text representation
      const simulatedIndex = `
[===================================================]
         OFFICIAL COURT BUNDLE TABLE OF CONTENTS
[===================================================]
Matter Reference: ${caseData.referenceNumber}
Bundle Reference: ${bundleRef}
Title: ${bundleTitle}
Generated At: ${new Date().toLocaleString()}

1. COVER PAGE & PRE-TRIAL BRIEFING ...... PAGE 01
${filterDocs.map((doc, idx) => {
  const words = doc.content.split(' ').slice(0, 5).join(' ');
  return `${idx + 2}. ${words}... (Uploaded: ${new Date(doc.createdAt).toLocaleDateString()}) ...... PAGE 0${idx + 2}`;
}).join('\n')}
[===================================================]

`;

      const finalGeneratedContent = `--- COURT BUNDLE COVER ---
${bundleTitle.toUpperCase()}
Filing Reference Code: ${bundleRef}
Case Reference: ${caseData.referenceNumber}
${includeIndex ? simulatedIndex : ''}

${filterDocs.map((doc, idx) => {
  return `\n\n--- SECTION ${idx + 1}: DOCUMENT REF ${doc.id} ---\n${doc.content}`;
}).join('\n')}
`;

      const generatedDoc: GeneratedDocument = {
        id: `doc-${Date.now()}-bundle`,
        companyId: caseData.companyId,
        caseId: caseData.id,
        content: finalGeneratedContent,
        createdAt: new Date().toISOString()
      };

      onBundleGenerated(generatedDoc);
      alert("Court Bundle successfully compiled and added to Case documents list!");
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto relative p-6 flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Court Bundle Index Compiler</h3>
              <p className="text-[10px] text-slate-400">Assemble composite briefs according to rules of Court pleading.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Steps Bar */}
        <div className="flex items-center gap-1.5 mb-5 text-[10px] font-black uppercase text-slate-400 select-none">
          <span className={step === 1 ? 'text-indigo-600' : ''}>1. Select Documents</span>
          <ChevronRight className="h-3 w-3" />
          <span className={step === 2 ? 'text-indigo-600' : ''}>2. Bundle Standards & ordering</span>
          <ChevronRight className="h-3 w-3" />
          <span className={step === 3 ? 'text-indigo-600' : ''}>3. Review Paging & compilation</span>
        </div>

        {/* Content Viewports */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-1">

          {/* STEP 1: SELECT FILES */}
          {step === 1 && (
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Check files to include in Court Bundle</span>
              {allAvailableDocs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs border border-dashed rounded-xl">
                  No individual file attachments logged in this case yet.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto p-1 bg-slate-50 border rounded-xl">
                  {allAvailableDocs.map(d => {
                    const isChecked = selectedDocIds.includes(d.id);
                    return (
                      <div 
                        key={d.id}
                        onClick={() => toggleSelectDoc(d.id)}
                        className={`p-2.5 rounded-lg border text-xs flex justify-between items-center cursor-pointer select-none transition ${
                          isChecked ? 'border-indigo-200 bg-indigo-50/25' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {}} // toggled in parent div onClick
                            className="rounded border-slate-305 text-indigo-600"
                          />
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 line-clamp-1">Demand Letter ID {d.id.substring(d.id.length - 4)}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {(d as any).isLinked ? `From Related Case REF ${(d as any).caseRef}` : 'Originating Matter'} • {new Date(d.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 font-mono">
                          {d.content.split(' ').length} words
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ORDER & SETTINGS */}
          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order files checklist */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Arrange Filing Sequence</span>
                <div className="space-y-1 bg-slate-50 p-2 border rounded-xl max-h-[320px] overflow-y-auto">
                  {orderedDocIds.map((id, index) => {
                    const doc = allAvailableDocs.find(item => item.id === id);
                    if (!doc) return null;
                    return (
                      <div key={id} className="p-2 bg-white border rounded-lg flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="truncate max-w-[150px] font-bold">
                          {index + 1}. Doc {doc.id.substring(doc.id.length - 4)}
                        </span>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 border bg-slate-100 hover:bg-slate-200 text-slate-500 rounded disabled:opacity-40"
                          >
                            <MoveUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === orderedDocIds.length - 1}
                            className="p-1 border bg-slate-100 hover:bg-slate-200 text-slate-500 rounded disabled:opacity-40"
                          >
                            <MoveDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Set properties */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Compilation settings</span>
                
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Bundle Title / Name</label>
                    <input 
                      type="text"
                      value={bundleTitle}
                      onChange={e => setBundleTitle(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Bundle Pleading Reference</label>
                    <input 
                      type="text"
                      value={bundleRef}
                      onChange={e => setBundleRef(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg"
                    />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={includeCover}
                        onChange={e => setIncludeCover(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Incorporate Cover Page</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={includeIndex}
                        onChange={e => setIncludeIndex(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Incorporate Auto-Generated Index Summary</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={sectionsDividers}
                        onChange={e => setSectionsDividers(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Place Tab Divider pages</span>
                    </label>
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="block text-[10px] text-slate-500 font-bold">Filing Page Numbering</label>
                    <select
                      value={numberingStyle}
                      onChange={e => setNumberingStyle(e.target.value as any)}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="continuous">Continuous Sequence (e.g. Page 1 to 50)</option>
                      <option value="per_doc">Isolates per Document heading</option>
                      <option value="none">Omit Page numbers completely</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === 3 && (
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Preview Bundle Index Setup</span>
              
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border font-mono text-[10px] leading-relaxed max-h-[280px] overflow-y-auto">
                <span className="text-emerald-400 block">✔ System validation sequence clear. Preparing output structure:</span>
                <p className="border-b border-white/20 pb-2 mb-2 pt-2 text-indigo-300 font-bold font-sans">
                  Index Format: {bundleTitle} • Ref Code: {bundleRef}
                </p>
                <div className="space-y-1 select-none">
                  <p>• [COVER PAGE] {caseData.referenceNumber || 'Matter'}_Briefing_Header</p>
                  {includeIndex && <p>• [INDEX INDEX] Table of Contents details</p>}
                  {orderedDocIds.map((id, index) => {
                    const d = allAvailableDocs.find(item => item.id === id);
                    return (
                      <p key={id}>
                        • [SECTION {index + 1}] Divider &bull; {d?.content.substring(0, 45)}...
                      </p>
                    );
                  })}
                </div>
              </div>

              <div className="bg-amber-55 text-amber-900 border bg-amber-50 rounded-xl p-3 text-xxs flex items-start gap-1.5">
                <HelpCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>Generating will merge contract files using absolute indices. The completed bundle asset acts as a single composite court summary file.</span>
              </div>
            </div>
          )}

        </div>

        {/* Action Controls Footer */}
        <div className="flex justify-between items-center border-t pt-4">
          <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-150 rounded px-2 py-0.5 select-none">
            Selected: {selectedDocIds.length} files
          </span>

          <div className="flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={compiling}
                className="p-2 px-4 border bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl"
              >
                Go Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="p-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer transition min-h-[44px]"
              >
                Proceed &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={compiling}
                className="p-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer transition flex items-center gap-1.5 min-h-[44px]"
              >
                {compiling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Compiling Volumes...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4" />
                    <span>Finalise Bundle</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
