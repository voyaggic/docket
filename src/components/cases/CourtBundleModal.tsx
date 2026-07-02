import React, { useState, useRef } from 'react';
import { X, Check, FileText, ChevronRight, HelpCircle, Loader2, List, MoveUp, MoveDown, BookOpen, FileCheck } from 'lucide-react';
import { Case, GeneratedDocument } from '../../types';

interface CourtBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case & { docs?: GeneratedDocument[] };
  linkedCases?: Array<Case & { docs?: GeneratedDocument[] }>;
  onBundleGenerated: (bundleDoc: GeneratedDocument) => void;
  companyId: string;
}

export default function CourtBundleModal({ isOpen, onClose, caseData, linkedCases = [], onBundleGenerated, companyId }: CourtBundleModalProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, 'uploading' | 'done' | 'error'>>({});
  const [savedFileRecords, setSavedFileRecords] = useState<Record<string, any>>({});
  const [step, setStep] = useState(1);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

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
    setError('');
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
    if (selectedDocIds.length === 0 && uploadedFiles.length === 0) {
      setError("Please select or upload at least one document to include in this bundle.");
      return;
    }
    setError('');
    // Update order array to include only selected
    setOrderedDocIds(prev => {
      const filtered = prev.filter(id => selectedDocIds.includes(id));
      const newlyAdded = selectedDocIds.filter(id => !filtered.includes(id));
      return [...filtered, ...newlyAdded];
    });
    setStep(step + 1);
  };

  const handleGenerate = () => {
    setCompiling(true);
    setError('');
    setTimeout(() => {
      setCompiling(false);
      
      const filterDocs = orderedDocIds.map(id => {
        if (id.startsWith('uploaded-')) {
          const idx = parseInt(id.replace('uploaded-', ''), 10);
          const f = uploadedFiles[idx];
          if (f) {
            return {
              id,
              companyId: caseData.companyId,
              caseId: caseData.id,
              content: `[Uploaded Document Content]: File "${f.name}" (${(f.size / 1024).toFixed(1)} KB)`,
              createdAt: new Date().toISOString()
            };
          }
          return null;
        }
        return allAvailableDocs.find(d => d.id === id);
      }).filter(Boolean) as GeneratedDocument[];
      
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
      setSuccessMessage("Court Bundle successfully compiled and added to Case documents list!");
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1500);
    }, 2200);
  };

  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-64 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto relative p-6 flex flex-col">
        
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
              {allAvailableDocs.length === 0 && uploadedFiles.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs border border-dashed rounded-xl space-y-3">
                  <p>No individual file attachments logged in this case yet.</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold rounded-lg cursor-pointer transition-all duration-150"
                  >
                    + Upload Files to Bundle
                  </button>
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
                            className="rounded border-slate-300 text-indigo-600"
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

                  {uploadedFiles.map((file, idx) => {
                    const localId = `uploaded-${idx}`;
                    const isChecked = selectedDocIds.includes(localId);
                    const uploadState = uploadingFiles[localId];
                    return (
                      <div
                        key={localId}
                        onClick={() => uploadState === 'done' && toggleSelectDoc(localId)}
                        className={`p-2.5 rounded-lg border text-xs flex justify-between items-center select-none transition ${
                          uploadState !== 'done' ? 'opacity-60 cursor-wait' : 'cursor-pointer'
                        } ${isChecked ? 'border-indigo-200 bg-indigo-50/25' : 'bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {}} 
                            disabled={uploadState !== 'done'}
                            className="rounded border-slate-300 text-indigo-600" 
                          />
                          <span className="font-bold text-slate-800">{file.name}</span>
                        </div>
                        <span className="text-[10px] flex items-center gap-1.5">
                          {uploadState === 'uploading' && <span className="text-amber-600 font-bold">Uploading...</span>}
                          {uploadState === 'error' && <span className="text-rose-600 font-bold">Upload failed</span>}
                          {uploadState === 'done' && <span className="text-emerald-600 font-bold">Saved ✓</span>}
                          <span className="text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                        </span>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full mt-1 py-2 border border-dashed border-indigo-300 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                  >
                    + Add More Files
                  </button>
                </div>
              )}

              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []) as File[];
                  if (files.length === 0) return;

                  const baseIdx = uploadedFiles.length;
                  setUploadedFiles(prev => [...prev, ...files]);
                  const newIds = files.map((_, i) => `uploaded-${baseIdx + i}`);
                  setSelectedDocIds(prev => [...prev, ...newIds]);

                  // Actually upload each file to R2 via direct backend proxy.
                  // This completely avoids ERR_SSL_VERSION_OR_CIPHER_MISMATCH or CORS issues in the browser.
                  for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const localId = `uploaded-${baseIdx + i}`;
                    setUploadingFiles(prev => ({ ...prev, [localId]: 'uploading' }));

                    try {
                      const uploadRes = await fetch(`/api/firm/${companyId}/cases/${caseData.id}/files/upload-direct?fileName=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}`, {
                        method: 'POST',
                        body: file
                      });
                      if (!uploadRes.ok) {
                        const errData = await uploadRes.json().catch(() => ({}));
                        throw new Error(errData.error || 'Direct upload failed');
                      }
                      const savedRecord = await uploadRes.json();

                      setSavedFileRecords(prev => ({ ...prev, [localId]: savedRecord }));
                      setUploadingFiles(prev => ({ ...prev, [localId]: 'done' }));
                    } catch (err) {
                      console.error(`Error uploading ${file.name}:`, err);
                      setUploadingFiles(prev => ({ ...prev, [localId]: 'error' }));
                    }
                  }
                }}
              />
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

        {/* Banners for Validation & Progress */}
        <div className="space-y-2 select-none">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-2 mb-2">
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-2 mb-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
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
