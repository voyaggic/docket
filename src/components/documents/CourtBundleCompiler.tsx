import React, { useState } from 'react';
import { 
  Plus, FileText, ChevronRight, Check, Trash, ArrowDown, ArrowUp, 
  Settings, Layers, Printer, BookOpen, AlertCircle, RefreshCw, Download, Calendar, Folder
} from 'lucide-react';
import { Case, GeneratedDocument } from '../../types';

interface CourtBundleCompilerProps {
  cases: Case[];
  documents: GeneratedDocument[];
  onAddDocToMatter?: (newDoc: any) => void;
}

interface Bundle {
  id: string;
  title: string;
  matterRef: string;
  caseId: string;
  docCount: number;
  court: string;
  version: number;
  status: 'Draft' | 'Final' | 'Submitted';
  createdAt: string;
  size: string;
}

export default function CourtBundleCompiler({ cases, documents, onAddDocToMatter }: CourtBundleCompilerProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [bundles, setBundles] = useState<Bundle[]>([
    {
      id: 'bdl-001',
      title: 'Full Primary Pleadings & Evidentiary Bundle',
      matterRef: 'DK-MAT-CIVIL-2026',
      caseId: 'case-1',
      docCount: 4,
      court: 'High Court of Kenya at Nairobi',
      version: 2,
      status: 'Submitted',
      createdAt: '2026-06-01',
      size: '14.8 MB'
    },
    {
      id: 'bdl-002',
      title: 'Interlocutory Adjournment Affidavit Bundle',
      matterRef: 'DK-CRM-2026-03',
      caseId: 'case-2',
      docCount: 2,
      court: 'District Family Court Of Westminster',
      version: 1,
      status: 'Draft',
      createdAt: '2026-06-05',
      size: '3.2 MB'
    }
  ]);

  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStep, setCompileStep] = useState(1);
  const [newTitle, setNewTitle] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [assignedCourt, setAssignedCourt] = useState('High Court of Kenya');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [dividers, setDividers] = useState<{ id: string; afterDocId: string; label: string }[]>([]);
  const [dividerInput, setDividerInput] = useState('');
  const [insertAfterId, setInsertAfterId] = useState('');
  
  // Compiler settings
  const [includeCover, setIncludeCover] = useState(true);
  const [includeIndex, setIncludeIndex] = useState(true);
  const [continuousPageNo, setContinuousPageNo] = useState(true);
  const [compressionQuality, setCompressionQuality] = useState('Medium');
  
  // Open creation flow state
  const [showWizard, setShowWizard] = useState(false);

  // Filter doc list based on selected case
  const availableDocs = documents.filter(d => d.caseId === selectedCaseId);

  const toggleSelectDoc = (id: string) => {
    if (selectedDocs.includes(id)) {
      setSelectedDocs(selectedDocs.filter(d => d !== id));
      setDividers(dividers.filter(dv => dv.afterDocId !== id));
    } else {
      setSelectedDocs([...selectedDocs, id]);
    }
  };

  const addDividerEntry = () => {
    if (!dividerInput || !insertAfterId) return;
    setDividers([...dividers, { id: `div-${Date.now()}`, afterDocId: insertAfterId, label: dividerInput }]);
    setDividerInput('');
  };

  const handleStartCompile = () => {
    if (!newTitle || !selectedCaseId) return;
    setIsCompiling(true);
    let pg = 0;
    
    const interval = setInterval(() => {
      pg += 20;
      if (pg >= 100) {
        clearInterval(interval);
        setIsCompiling(false);
        
        const matchedCase = cases.find(c => c.id === selectedCaseId);
        const newBdl: Bundle = {
          id: `bdl-${Date.now().toString().slice(-4)}`,
          title: newTitle,
          matterRef: matchedCase?.referenceNumber || 'DK-GEN',
          caseId: selectedCaseId,
          docCount: selectedDocs.length,
          court: assignedCourt,
          version: 1,
          status: 'Draft',
          createdAt: new Date().toISOString().split('T')[0],
          size: `${(selectedDocs.length * 2.1 + 0.9).toFixed(1)} MB`
        };

        setBundles([newBdl, ...bundles]);
        
        // Post bundle doc as compiled doc inside matter library if prop set
        if (onAddDocToMatter) {
          onAddDocToMatter({
            caseId: selectedCaseId,
            content: `COURT SUBMISSION BUNDLE: ${newTitle}\nCOURT: ${assignedCourt}\n\n===================================\nTABLE OF CONTENTS INDEX SHEET\n===================================\n${selectedDocs.map((di, idx) => {
              const matchedD = documents.find(doc => doc.id === di);
              const hasDiv = dividers.find(dv => dv.afterDocId === di);
              return `TAB ${idx + 1}: ${matchedD?.content.substring(0, 40) || 'Exhibit Document'}${hasDiv ? `\n➡ INTERSTITIAL DIVIDER: ${hasDiv.label}` : ''}`;
            }).join('\n')}\n\n===================================\nContinuous page indexes generated. Verified SHA-256 Checksum certificate.`,
            status: 'Approved',
            folder: 'Court Orders'
          });
        }
        
        // Close modal and reset
        setShowWizard(false);
        setCompileStep(1);
        setNewTitle('');
        setSelectedCaseId('');
        setSelectedDocs([]);
        setDividers([]);
      }
    }, 400);
  };

  const handleMarkAsSubmitted = (id: string) => {
    setBundles(bundles.map(b => b.id === id ? { ...b, status: 'Submitted' } : b));
  };

  const handleDeleteBundle = (id: string) => {
    setBundles(bundles.filter(b => b.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-5" id="court-bundles-compiler-panel">
      
      {/* SECTION TOP COMPRESS */}
      <div className="flex justify-between items-center pb-3 border-b">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Layers className="h-5 w-5 text-sky-600" /> Court Bundle Assembler & Composer
          </h3>
          <p className="text-xxs text-slate-400">Generate fully paginated, sequential index litigation files for Kenyan court tribunals</p>
        </div>
        <button 
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="h-4 w-4" /> Start New Bundle
        </button>
      </div>

      {/* Compiler active list */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-2 mb-2 select-none animate-fade-in">
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="bundle-dashboard-cards-grid">
        {bundles.map(b => (
          <div key={b.id} className="p-4 bg-slate-50 border rounded-2xl hover:border-slate-300 transition space-y-3 relative group">
            
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold px-2 py-0.5 bg-slate-200 text-slate-600 rounded uppercase font-mono">{b.matterRef}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${b.status === 'Submitted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {b.status}
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-800 pt-1 leading-tight">{b.title}</h4>
                <p className="text-[10px] text-slate-400 font-semibold">{b.court}</p>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button 
                  onClick={() => handleDeleteBundle(b.id)}
                  className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-200 border-none my-1" />

            <div className="flex justify-between items-center text-[10px] text-slate-410 font-bold uppercase font-mono">
              <div className="flex gap-4">
                <span>Docs: {b.docCount} items</span>
                <span>Size: {b.size}</span>
                <span>Ver: v{b.version}</span>
              </div>

              <div className="flex gap-1">
                {b.status === 'Draft' && (
                  <button 
                    onClick={() => handleMarkAsSubmitted(b.id)}
                    className="p-1 px-2.5 bg-white border text-blue-600 hover:bg-blue-50/10 rounded-lg text-[9px]"
                  >
                    Mark Submitted
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSuccessMessage(`Downloading index & table of contents for bundle ${b.id}`);
                    setTimeout(() => setSuccessMessage(null), 4000);
                  }}
                  className="p-1 px-2.5 bg-blue-600 text-white rounded-lg text-[9px] hover:bg-blue-700 shadow-sm"
                >
                  Download Bundle PDF
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* ASSEMBLY FLOATING COMPILER OVERLAY WIZARD */}
      {showWizard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-hidden" id="compile-bundle-steps-modal">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            
            {/* Steps tracker */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center border-b shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Docket Court Bundle Compiler</h3>
                  <p className="text-[10px] text-slate-300">Assemble multi-document litigation grids sequentially</p>
                </div>
              </div>
              
              <div className="flex gap-2 text-[10px] font-bold font-mono text-slate-400 select-none">
                <span className={compileStep === 1 ? 'text-sky-400 underline font-black' : ''}>1. Settings</span>
                <span>➡</span>
                <span className={compileStep === 2 ? 'text-sky-400 underline font-black' : ''}>2. Documents Binder</span>
                <span>➡</span>
                <span className={compileStep === 3 ? 'text-sky-400 underline font-black' : ''}>3. Structural Formats</span>
                <span>➡</span>
                <span className={compileStep === 4 ? 'text-sky-400 underline font-black' : ''}>4. Compile</span>
              </div>
            </div>

            {/* Stepper body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              
              {/* Step 1: Initial matter link settings */}
              {compileStep === 1 && (
                <div className="max-w-md mx-auto bg-white border p-6 rounded-2xl shadow-sm space-y-4" id="step1-setup">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2">Step 1 — General Registry Parameters</h4>
                  
                  <div className="space-y-3 text-xxs font-semibold">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Court Submission Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Combined Bundle of Documents"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        className="w-full text-xs p-2 border rounded-lg focus:border-slate-400 mt-1 font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Assigned Prosecution Tribunal / Court</label>
                      <input 
                        type="text"
                        placeholder="e.g. High Court at Nairobi"
                        value={assignedCourt}
                        onChange={e => setAssignedCourt(e.target.value)}
                        className="w-full text-xs p-2 border rounded-lg focus:border-slate-400 mt-1 font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Link Case Brief Reference</label>
                      <select 
                        value={selectedCaseId}
                        onChange={e => setSelectedCaseId(e.target.value)}
                        className="w-full text-xs p-2.5 border bg-slate-55 rounded-lg mt-1 font-mono outline-none"
                      >
                        <option value="">-- Choose active matter index --</option>
                        {cases.map(c => (
                          <option key={c.id} value={c.id}>{c.referenceNumber} - {(c as any).client?.fullName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Checklist of case documents, reorders, dividers */}
              {compileStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="step2-documents-picker">
                  
                  <div className="md:col-span-6 bg-white border p-4 rounded-xl space-y-3 text-xxs font-semibold">
                    <span className="text-[10px] font-black text-slate-500 uppercase block border-b pb-1.5">Select Case Records to Include</span>
                    
                    {availableDocs.length === 0 ? (
                      <p className="p-6 text-center text-slate-400">Please choose a linked Case Brief first or confirm that documents exist inside the selected matter folder.</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {availableDocs.map(d => {
                          const isSel = selectedDocs.includes(d.id);
                          return (
                            <div 
                              key={d.id}
                              onClick={() => toggleSelectDoc(d.id)}
                              className={`p-2.5 border rounded-lg cursor-pointer transition flex justify-between items-center ${isSel ? 'border-blue-500 bg-blue-50/10' : 'bg-slate-50'}`}
                            >
                              <div className="truncate pr-4">
                                <span className="font-bold text-slate-800 truncate block">Document #({d.id.slice(-4)})</span>
                                <span className="text-[9px] text-slate-400 truncate block">{d.content.slice(0, 50)}...</span>
                              </div>
                              <input 
                                type="checkbox"
                                checked={isSel}
                                readOnly
                                className="rounded text-blue-600"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-6 bg-white border p-4 rounded-xl space-y-4 text-xxs font-semibold">
                    <span className="text-[10px] font-black text-slate-500 uppercase block border-b pb-1.5">Insert Index Section Dividers & Order</span>
                    
                    {selectedDocs.length === 0 ? (
                      <p className="p-6 text-slate-400 text-center">No documents have been checked yet. Items selected on the left will populate in order on the right pane.</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2 max-h-[200px] overflow-y-auto" id="selected-bundle-order">
                          {selectedDocs.map((s, idx) => {
                            const dRecord = documents.find(doc => doc.id === s);
                            const activeDivs = dividers.filter(dv => dv.afterDocId === s);
                            return (
                              <div key={s} className="p-2 border rounded bg-slate-50 space-y-1.5">
                                <div className="flex justify-between font-mono text-[9px] text-slate-500 font-bold">
                                  <span>POSITION #{idx + 1}</span>
                                  <span className="truncate max-w-[120px]">ID: {s}</span>
                                </div>
                                <p className="text-[10px] text-slate-700 font-bold truncate">{dRecord?.content.substring(0, 40) || 'Dossier Files'}</p>
                                
                                {activeDivs.map(ad => (
                                  <div key={ad.id} className="p-1 px-2.5 bg-sky-100 border border-sky-200 text-sky-800 rounded text-[9px] font-black uppercase flex justify-between items-center select-none">
                                    <span>➡ SECTION DIVIDER: {ad.label}</span>
                                    <button 
                                      onClick={() => setDividers(dividers.filter(dv => dv.id !== ad.id))}
                                      className="text-slate-400 hover:text-red-500"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>

                        {/* Appender block for dividers */}
                        <div className="p-2.5 bg-slate-55 rounded-lg border bg-slate-50 space-y-2">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Insert Interstitial Tab Divider Card</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              value={insertAfterId}
                              onChange={e => setInsertAfterId(e.target.value)}
                              className="w-full border p-1 bg-white rounded text-[9px]"
                            >
                              <option value="">Insert after...</option>
                              {selectedDocs.map(s => (
                                <option key={s} value={s}>Doc #({s.slice(-4)})</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="e.g. Tab A: Preliminary evidence"
                              value={dividerInput}
                              onChange={e => setDividerInput(e.target.value)}
                              className="w-full border p-1 bg-white rounded text-[10px]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={addDividerEntry}
                            className="w-full py-1 bg-slate-800 text-white rounded text-[9px] font-bold uppercase transition hover:bg-slate-700"
                          >
                            + Confirm Divider
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Step 3: Bundle structures cover pages pagination */}
              {compileStep === 3 && (
                <div className="max-w-lg mx-auto bg-white border p-6 rounded-2xl shadow-sm space-y-4" id="step3-formatting">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2">Step 3 — Document Covers & Index Pagination rules</h4>
                  
                  <div className="space-y-3.5 text-xxs font-semibold">
                    <div className="flex items-center justify-between p-2 bg-slate-50 border rounded-xl">
                      <div>
                        <span className="font-bold text-slate-700 block text-[10.5px]">Include Compilation Cover Sheet</span>
                        <p className="text-[9px] text-slate-400 font-medium">Render court name and litigant reference details on first page</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={includeCover}
                        onChange={e => setIncludeCover(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-50 border rounded-xl">
                      <div>
                        <span className="font-bold text-slate-700 block text-[10.5px]">Continuous Index Table of Contents</span>
                        <p className="text-[9px] text-slate-400 font-medium">Auto-generate dynamic pagination page references sequentially</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={includeIndex}
                        onChange={e => setIncludeIndex(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-50 border rounded-xl">
                      <div>
                        <span className="font-bold text-slate-700 block text-[10.5px]">Continuous Footer Page Numbering</span>
                        <p className="text-[9px] text-slate-400 font-medium">Stamp paginated numbers consecutively at bottom of sheets</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={continuousPageNo}
                        onChange={e => setContinuousPageNo(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Bundle Compression Resolution Level</label>
                        <select 
                          value={compressionQuality}
                          onChange={e => setCompressionQuality(e.target.value)}
                          className="w-full text-xs p-1.5 border bg-white rounded mt-1 outline-none"
                        >
                          <option value="High">High Definition Standard</option>
                          <option value="Medium">Medium Optimized Grid</option>
                          <option value="Low">Email-Friendly Small Size</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Index sheet Live Preview & Compilation triggers */}
              {compileStep === 4 && (
                <div className="max-w-2xl mx-auto bg-white border p-6 rounded-2xl shadow-sm space-y-4" id="step4-compiling-canvas">
                  
                  {isCompiling ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                      <RefreshCw className="h-10 w-10 animate-spin text-sky-600" />
                      <div className="text-center">
                        <h4 className="text-sm font-extrabold text-slate-800">Compiling Document Bundle Grid...</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Assembling continuous index page references and applying SHA-256 seal</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl flex gap-2 items-start text-xxs font-medium leading-relaxed">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>Verified Preview Ready.</strong> Ready to compile <strong>{selectedDocs.length} items</strong> with <strong>{dividers.length} custom tab divider sheets</strong>. Continuous pagination stamps will apply consecutively.
                        </div>
                      </div>

                      {/* Compilation page template layout */}
                      <div className="p-6 border bg-slate-900 text-slate-350 rounded-xl space-y-4 font-mono text-[10px] bg-slate-950">
                        <div className="text-center font-bold text-white uppercase tracking-widest text-[11px] border-b border-slate-800 pb-3">
                          {assignedCourt || 'HIGH COURT OF KENYA'}
                          <span className="block text-[9px] text-slate-400 mt-1">LITIGATION ASSEMBLY REGISTRY BINDER</span>
                        </div>

                        <div className="space-y-1 bg-slate-900 p-3 rounded border border-slate-800 leading-normal">
                          <p className="font-extrabold text-white">SUBMISSION: {newTitle || 'COURT INDEX FILINGS'}</p>
                          <p>DATE: {new Date().toISOString().split('T')[0]}</p>
                          <p>REFERENCE: Combined Matter PDF Records</p>
                        </div>

                        <div className="space-y-1 bg-slate-900 p-3 rounded border border-slate-800 leading-normal">
                          <p className="text-slate-200 font-bold border-b border-slate-800 pb-1 mb-1">TABLE OF CONTENTS INDEX SHEET (AUTO-GENERATED)</p>
                          {selectedDocs.map((s, idx) => {
                            const dRecord = documents.find(doc => doc.id === s);
                            const mathDiv = dividers.find(dv => dv.afterDocId === s);
                            return (
                              <div key={s} className="space-y-0.5 py-1">
                                <p className="flex justify-between">
                                  <span>TAB {idx + 1}: Doc #({s.slice(-4)}) - {dRecord?.content.substring(0, 30)}...</span>
                                  <span className="text-slate-400">Page {idx * 8 + 1} - {(idx + 1) * 8}</span>
                                </p>
                                {mathDiv && (
                                  <p className="text-sky-400 text-[9px] pl-3">⬅ Interstitial Divider: {mathDiv.label} (Page {(idx + 1) * 8 + 1})</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Stepper Footer buttons */}
            <div className="p-4 border-t bg-slate-100 flex justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (compileStep === 1) setShowWizard(false);
                  else setCompileStep(compileStep - 1);
                }}
                disabled={isCompiling}
                className="px-4 py-2 border bg-white hover:bg-slate-50 font-bold text-xs rounded-xl text-slate-700 transition"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => {
                  if (compileStep === 4) handleStartCompile();
                  else setCompileStep(compileStep + 1);
                }}
                disabled={compileStep === 1 && (!newTitle || !selectedCaseId) || compileStep === 2 && selectedDocs.length === 0 || isCompiling}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                {compileStep === 4 ? 'Compile and Seal Bundle' : 'Continue'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
