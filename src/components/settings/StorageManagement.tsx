/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, Trash, ToggleLeft, Percent, Layers, FolderArchive,
  RefreshCw, CheckCircle2, ChevronDown, ChevronRight, LayoutGrid, Info, ShieldAlert
} from 'lucide-react';
import { MOCK_LARGE_FILES } from './settingsData';

export default function StorageManagement() {
  const [largeFiles, setLargeFiles] = useState(MOCK_LARGE_FILES);
  const [pdfCompressionLevel, setPdfCompressionLevel] = useState(70);
  const [duplicateFilesCount, setDuplicateFilesCount] = useState(14);
  const [isCleaningDupe, setIsCleaningDupe] = useState(false);
  const [isCompactingPdf, setIsCompactingPdf] = useState(false);

  // Storage Stats parameters
  const totalUsedGB = 8.5;
  const quotaLimitGB = 10;
  const warningPercentage = 80;
  const usedPercent = (totalUsedGB / quotaLimitGB) * 100;

  const handleRemoveFile = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete: ${name}?`)) {
      setLargeFiles(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleCleanDuplicates = () => {
    setIsCleaningDupe(true);
    setTimeout(() => {
      setDuplicateFilesCount(0);
      setIsCleaningDupe(false);
      alert('Security Clean: Successfully resolved and deleted 14 exact file duplicates across active judicial dockets!');
    }, 1500);
  };

  const handleCompressPdfs = () => {
    setIsCompactingPdf(true);
    setTimeout(() => {
      setIsCompactingPdf(false);
      alert(`PDF Compression Complete: Compacted stored PDFs down to ${pdfCompressionLevel}% quality, yielding an extra 1.2 GB of free storage quota!`);
    }, 1500);
  };

  return (
    <div className="space-y-6" id="settings-storage-dashboard">
      <div>
        <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Database className="text-[#2563eb]" /> Practice Storage Management</h3>
        <p className="text-xxs text-slate-450 mt-0.5">Track cloud storage volume quotas, find obsolete briefs, remove redundant filings, and customize compression ratios.</p>
      </div>

      {/* Quota limit warning card indicator */}
      {usedPercent >= warningPercentage && (
        <div className="p-4 bg-rose-50 border border-rose-250 border-rose-200 rounded-2xl flex items-start gap-3 text-xxs text-rose-800 leading-normal text-left">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-extrabold uppercase">Storage Volume Approaching Warning Threshold!</h5>
            <p>Your firm has populated {totalUsedGB} GB of the allocated {quotaLimitGB} GB (<strong>{usedPercent.toFixed(1)}% used</strong>). Critical alerts will block doc auto-filling if the storage capacity peaks. Consider running cleanups or upgrading plans.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Storage Bar breakdowns */}
        <div className="lg:col-span-4 border border-slate-200 rounded-2xl p-4 bg-white space-y-4">
          <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Quota Allocation Overview</span>
          
          <div className="space-y-1.5 text-left">
            <span className="text-xs font-black text-slate-850 block">Quota Quota: {totalUsedGB} of {quotaLimitGB} GB</span>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div className={`h-full bg-indigo-600 w-[60%]`} title="Documents: 5.1 GB" />
              <div className={`h-full bg-emerald-500 w-[15%]`} title="Backups: 1.275 GB" />
              <div className={`h-full bg-amber-500 w-[10%]`} title="Chat files: 0.85 GB" />
              <div className={`h-full bg-sky-400 w-[5%]`} title="Profile Photos: 0.425 GB" />
            </div>
          </div>

          <div className="space-y-2 border-t pt-2 text-xxs font-semibold">
            {[
              { label: 'Matter Documents (brief scans, attachments)', gb: '5.10 GB', color: 'bg-indigo-600' },
              { label: 'Automated Encryption Backups', gb: '1.27 GB', color: 'bg-emerald-500' },
              { label: 'Matter Chats & correspondence uploads', gb: '0.85 GB', color: 'bg-amber-500' },
              { label: 'Counsel profiles & branding favicons', gb: '0.43 GB', color: 'bg-sky-400' },
              { label: 'Email signature headers', gb: '0.85 GB', color: 'bg-slate-300' }
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-left">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${row.color}`} />
                  <span className="text-slate-600 truncate">{row.label}</span>
                </div>
                <span className="text-slate-800 font-mono font-bold shrink-0">{row.gb}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modular SVG treemap canvas layout */}
        <div className="lg:col-span-8 border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Storage Distribution Treemap</span>
            <span className="text-[10px] font-bold text-slate-400">Sort: Matters size</span>
          </div>

          {/* SVG representation of treemap layout - responsive and size-robust */}
          <div className="w-full h-44 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden p-1 flex font-sans font-black text-[10px] text-white">
            <div className="w-2/3 h-full p-0.5 space-y-1 flex flex-col">
              <div className="bg-indigo-600 rounded-lg flex-1 p-2 relative flex flex-col justify-between">
                <span className="leading-none tracking-tight block">DK/CIVIL Litigation Briefs</span>
                <span className="font-mono text-[9px] text-indigo-200">3.4 GB (66% of doc volume)</span>
              </div>
              <div className="flex-1 flex gap-1">
                <div className="bg-sky-600 rounded-lg flex-1 p-2 relative flex flex-col justify-between">
                  <span className="leading-none tracking-tight block">TRIAL prep clips</span>
                  <span className="font-mono text-[9px] text-sky-200">1.2 GB</span>
                </div>
                <div className="bg-emerald-600 rounded-lg flex-1 p-2 relative flex flex-col justify-between">
                  <span className="leading-none tracking-tight block">Office backup caches</span>
                  <span className="font-mono text-[9px] text-emerald-200">1.27 GB</span>
                </div>
              </div>
            </div>
            <div className="w-1/3 h-full p-0.5 flex flex-col gap-1">
              <div className="bg-amber-600 rounded-lg flex-1 p-2 relative flex flex-col justify-between">
                <span className="leading-none tracking-tight block">DK/CRM scans</span>
                <span className="font-mono text-[9px] text-amber-200">1.1 GB</span>
              </div>
              <div className="bg-pink-600 rounded-lg flex-1 p-2 relative flex flex-col justify-between">
                <span className="leading-none tracking-tight block">Chat files & avatars</span>
                <span className="font-mono text-[9px] text-pink-200">0.85 GB</span>
              </div>
            </div>
          </div>
          <span className="text-[9px] text-slate-400 block text-left italic">Visual representation mapping folders weight by active litigation categories. Hover coordinates to dissect.</span>
        </div>

      </div>

      {/* Storage Management action commands */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-150 rounded-2xl p-4 bg-slate-50/40 select-none text-xs text-left">
        
        {/* PDF compressor controls */}
        <div className="bg-white p-3.5 border rounded-xl flex flex-col justify-between space-y-3">
          <div>
            <h5 className="font-extrabold text-slate-800 flex items-center gap-1"><FolderArchive className="h-4 w-4 text-indigo-500" /> Compress Stored PDFs</h5>
            <p className="text-[10px] text-slate-400 mt-1">Shrink physical footprints of scanned briefings in cloud archives securely.</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xxs font-bold text-slate-650">
              <span>Compression Ratio:</span>
              <span className="text-indigo-600">{pdfCompressionLevel}% Quality</span>
            </div>
            <input 
              type="range" 
              min="30" 
              max="90" 
              value={pdfCompressionLevel} 
              onChange={e => setPdfCompressionLevel(Number(e.target.value))}
              className="w-full accent-indigo-600 h-1 bg-slate-100 rounded cursor-pointer"
            />
          </div>
          <button 
            type="button" 
            onClick={handleCompressPdfs}
            disabled={isCompactingPdf}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xxs font-black uppercase flex items-center justify-center gap-1"
          >
            {isCompactingPdf ? 'Compacting...' : 'Trigger Compact Action'}
          </button>
        </div>

        {/* Cold storage document archiving */}
        <div className="bg-white p-3.5 border rounded-xl flex flex-col justify-between space-y-3">
          <div>
            <h5 className="font-extrabold text-slate-800 flex items-center gap-1"><FolderArchive className="h-4 w-4 text-indigo-500" /> Cold Storage Archiving</h5>
            <p className="text-[10px] text-slate-400 mt-1">Stash files associated with closed matters (&gt;2 years past final verdict) into glacier reserves.</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-xxs text-slate-500 text-center leading-normal">
            Estimated archiving candidate size: <strong className="text-slate-800">1.84 GB (28 files)</strong>
          </div>
          <button 
            type="button" 
            onClick={() => alert('Glacier Archive trigger queued successfully! 28 obsolete folders stashed safely in lower cost cloud tiers.')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xxs font-black uppercase"
          >
            Archive old files
          </button>
        </div>

        {/* Redundant files cleaner */}
        <div className="bg-white p-3.5 border rounded-xl flex flex-col justify-between space-y-3">
          <div>
            <h5 className="font-extrabold text-slate-800 flex items-center gap-1"><Trash className="h-4 w-4 text-rose-500 animate-pulse" /> Purge Duplicate Briefs</h5>
            <p className="text-[10px] text-slate-400 mt-1">Instantly target exact byte-match copies uploaded by multiple advocates.</p>
          </div>
          <div className="text-center">
            {duplicateFilesCount > 0 ? (
              <span className="text-rose-500 text-xs font-black animate-pulse">Detected: {duplicateFilesCount} redundant file duplicates</span>
            ) : (
              <span className="text-emerald-600 text-xs font-black flex items-center justify-center gap-1"><CheckCircle2 className="h-4 w-4 shrink-0" /> Storage fully clean and unique!</span>
            )}
          </div>
          <button 
            type="button" 
            disabled={duplicateFilesCount === 0 || isCleaningDupe}
            onClick={handleCleanDuplicates}
            className="w-full py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 hover:text-rose-800 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-xxs font-black uppercase text-center"
          >
            {isCleaningDupe ? 'Cleaning files...' : 'Resolve duplicates'}
          </button>
        </div>

      </div>

      {/* Large File Finder table listings */}
      <div className="space-y-3 text-left">
        <span className="text-xxs font-black text-slate-450 uppercase tracking-widest block">Large File Finder & Unused brief reports</span>
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xxs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-600 uppercase select-none">
                  <th className="p-3">File Name</th>
                  <th className="p-3">Dossier Reference</th>
                  <th className="p-3">Capacity Weight</th>
                  <th className="p-3">Uploader</th>
                  <th className="p-3">Uploaded Date</th>
                  <th className="p-3">Unused Days</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y font-semibold">
                {largeFiles.map(file => (
                  <tr key={file.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800 truncate max-w-[240px]" title={file.name}>{file.name}</td>
                    <td className="p-3 text-indigo-600 font-mono select-all">{file.matter}</td>
                    <td className="p-3 font-mono font-black text-slate-800">{file.size}</td>
                    <td className="p-3 text-slate-600">{file.uploader}</td>
                    <td className="p-3 text-slate-450">{file.date}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${file.unusedDays > 90 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {file.unusedDays} days idle
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleRemoveFile(file.id, file.name)} 
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-red-500 rounded border hover:shadow-xxs transition select-none cursor-pointer"
                        title="Delete permanently from cloud"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
