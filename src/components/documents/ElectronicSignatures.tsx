import React, { useState } from 'react';
import { 
  PenTool, Eye, Check, Clock, X, Trash, Mail, Phone, Lock, 
  Download, AlertCircle, Send, Plus, Users, ShieldCheck, ChevronRight
} from 'lucide-react';
import { Case, GeneratedDocument } from '../../types';

interface Signatory {
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'signed' | 'declined';
  signedAt?: string;
}

interface SignatureRequest {
  id: string;
  title: string;
  caseRef: string;
  caseId: string;
  signatories: Signatory[];
  status: 'Awaiting' | 'Sent' | 'Partially' | 'Fully' | 'Declined';
  sentAt: string;
  expiresAt: string;
  signingOrder: 'parallel' | 'sequential';
}

interface ElectronicSignaturesProps {
  cases: Case[];
  documents: GeneratedDocument[];
  onAddDocToMatter?: (newDoc: any) => void;
}

export default function ElectronicSignatures({ cases, documents, onAddDocToMatter }: ElectronicSignaturesProps) {
  const [activeTab, setActiveTab] = useState<'Sent' | 'Partially' | 'Fully' | 'Declined'>('Sent');
  const [showSetup, setShowSetup] = useState(false);
  
  // Interactive signing simulator state
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatedRequest, setSimulatedRequest] = useState<SignatureRequest | null>(null);
  const [simulatedSignerEmail, setSimulatedSignerEmail] = useState('');
  const [simSignatureText, setSimSignatureText] = useState('');
  const [simOtpCode, setSimOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Form states
  const [selectedDocId, setSelectedDocId] = useState('');
  const [newSignatories, setNewSignatories] = useState<Signatory[]>([
    { name: 'Marcus Vance', email: 'vance@example.com', role: 'Primary Litigant', status: 'pending' }
  ]);
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempRole, setTempRole] = useState('Litigant');
  const [signOrder, setSignOrder] = useState<'parallel' | 'sequential'>('parallel');

  const [requests, setRequests] = useState<SignatureRequest[]>([
    {
      id: 'sig-101',
      title: 'Commercial Lease Agreement Amendment Contract',
      caseRef: 'DK-MAT-CIVIL-2026',
      caseId: 'case-1',
      sentAt: '2026-06-03',
      expiresAt: '2026-07-03',
      signingOrder: 'parallel',
      status: 'Sent',
      signatories: [
        { name: 'Alex Rivera, Esq.', email: 'alex@docket.com', role: 'Managing Partner', status: 'signed', signedAt: '2026-06-04' },
        { name: 'Charles Wood, Lessee', email: 'charles.wood@gmail.com', role: 'Lessee', status: 'pending' }
      ]
    },
    {
      id: 'sig-102',
      title: 'Expert Eyewitness Witness Deposition affidavit',
      caseRef: 'DK-CRM-2026-03',
      caseId: 'case-2',
      sentAt: '2026-06-02',
      expiresAt: '2026-06-15',
      signingOrder: 'sequential',
      status: 'Partially',
      signatories: [
        { name: 'Dr. Evelyn Chambers', email: 'evelyn.chambers@med.org', role: 'Expert Witness', status: 'signed', signedAt: '2026-06-03' },
        { name: 'Officer Donald Cooper', email: 'donald.cooper@police.gov', role: 'Arresting Officer', status: 'pending' }
      ]
    },
    {
      id: 'sig-103',
      title: 'Retainer Covenant Terms and Trust Agreement',
      caseRef: 'DK-MAT-CIVIL-2026',
      caseId: 'case-1',
      sentAt: '2026-05-15',
      expiresAt: '2026-06-15',
      signingOrder: 'parallel',
      status: 'Fully',
      signatories: [
        { name: 'Marcus Vance', email: 'vance@example.com', role: 'Client', status: 'signed', signedAt: '2026-05-15' },
        { name: 'Alex Rivera, Esq.', email: 'alex@docket.com', role: 'Partner', status: 'signed', signedAt: '2026-05-15' }
      ]
    }
  ]);

  const addSignatory = () => {
    if (!tempName || !tempEmail) return;
    setNewSignatories([...newSignatories, { name: tempName, email: tempEmail, role: tempRole, status: 'pending' }]);
    setTempName('');
    setTempEmail('');
  };

  const removeSignatory = (idx: number) => {
    setNewSignatories(newSignatories.filter((_, i) => i !== idx));
  };

  const handleCreateRequest = () => {
    const matchedDoc = documents.find(d => d.id === selectedDocId);
    const matchedCase = cases.find(c => c.id === matchedDoc?.caseId);

    const fresh: SignatureRequest = {
      id: `sig-${Date.now().toString().slice(-3)}`,
      title: matchedDoc ? `AI Assembled Legal Dossier (#${matchedDoc.id.slice(-4)})` : 'Custom Signature Document',
      caseRef: matchedCase?.referenceNumber || 'DK-GEN',
      caseId: matchedDoc?.caseId || '',
      signatories: newSignatories,
      status: 'Sent',
      sentAt: new Date().toISOString().split('T')[0],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      signingOrder: signOrder
    };

    setRequests([fresh, ...requests]);
    setShowSetup(false);
    setSelectedDocId('');
    setNewSignatories([{ name: 'Marcus Vance', email: 'vance@example.com', role: 'Primary Litigant', status: 'pending' }]);
  };

  // Launch Signing Simulator
  const launchSimulatorForRequest = (req: SignatureRequest) => {
    const nextPending = req.signatories.find(s => s.status === 'pending');
    if (!nextPending) {
      showToast("This document is already fully signed by all signatories!");
      return;
    }
    setSimulatedRequest(req);
    setSimulatedSignerEmail(nextPending.email);
    setSimSignatureText(nextPending.name);
    setOtpSent(false);
    setOtpVerified(false);
    setSimOtpCode('');
    setShowSimulator(true);
  };

  const triggerMockOtpSend = () => {
    setOtpSent(true);
    showToast(`MOCK SMS-OTP TRIGGERED: A simulated secure verification token "4092" has been sent to external signer address.`);
  };

  const verifyMockOtp = () => {
    if (simOtpCode === '4092' || simOtpCode === '4092') {
      setOtpVerified(true);
    } else {
      showToast("Invalid verification code! Use mock bypass '4092' to simulate security approval.");
    }
  };

  const completeSigningBySigner = () => {
    if (!simulatedRequest) return;
    
    // Create new list
    const updatedRequests = requests.map(req => {
      if (req.id === simulatedRequest.id) {
        let updatedSignatories = req.signatories.map(sig => {
          if (sig.email === simulatedSignerEmail) {
            return { ...sig, status: 'signed' as const, signedAt: new Date().toISOString().split('T')[0] };
          }
          return sig;
        });

        // Determine request status
        const totalPending = updatedSignatories.filter(s => s.status === 'pending').length;
        let finalStatus = req.status;
        if (totalPending === 0) {
          finalStatus = 'Fully';
          // Append signed statement into matter folders
          if (onAddDocToMatter) {
            onAddDocToMatter({
              caseId: req.caseId,
              content: `SECURE SIGNED RECORD: ${req.title}\nSTATUS: FULLY SIGNED & TAMPERPROOF REGISTERED\n\nCO-SIGNERS:\n${updatedSignatories.map(s => `- ${s.name} (${s.role}) SIGNED ON ${s.signedAt}`).join('\n')}\n\n===================================\nTAMPERPROOF COMPLIANCE CHECK\n===================================\nDocument SHA256 Hash Checksum: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\nAudit Geolocation: Verified Kenya Ingress Tunnel`,
              status: 'Approved',
              folder: 'Contracts'
            });
          }
        } else {
          finalStatus = 'Partially';
        }

        return { ...req, status: finalStatus, signatories: updatedSignatories };
      }
      return req;
    });

    setRequests(updatedRequests);
    setShowSimulator(false);
    setSimulatedRequest(null);
  };

  const filteredRequests = requests.filter(r => r.status === activeTab);

  return (
    <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-5" id="e-signatures-panel-wrapper">
      
      {/* Header bar */}
      <div className="flex justify-between items-center pb-3 border-b">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <PenTool className="h-5 w-5 text-sky-600" /> Electronic Signatures Dashboard
          </h3>
          <p className="text-xxs text-slate-400">Dispatch legal agreements securely and collect digital validations</p>
        </div>
        <button 
          onClick={() => setShowSetup(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Send className="h-4 w-4" /> Send for Signature
        </button>
      </div>

      {/* State list tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b">
        {(['Sent', 'Partially', 'Fully', 'Declined'] as const).map(tab => {
          const reqCount = requests.filter(r => r.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xxs font-black uppercase tracking-wider px-3.5 py-2 whitespace-nowrap rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === tab ? 'bg-slate-900 border-slate-900 text-sky-400 shadow-sm' : 'bg-white text-slate-505 text-slate-600 hover:border-slate-350'
              }`}
            >
              <span>{tab} Requests</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${activeTab === tab ? 'bg-sky-500 text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
                {reqCount}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid of sign requests dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredRequests.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl">
            No active signature requests logged in the "{activeTab}" filter category.
          </div>
        ) : (
          filteredRequests.map(req => {
            const nextPending = req.signatories.find(s => s.status === 'pending');
            return (
              <div key={req.id} className="p-4 border rounded-2xl bg-slate-50 hover:border-slate-300 transition space-y-3 relative group">
                
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono font-black text-slate-400 uppercase">REQUEST ID: {req.id} • MATTER: {req.caseRef}</span>
                    <h4 className="text-xs font-black text-slate-800 leading-tight pt-0.5">{req.title}</h4>
                    <span className="text-[9px] font-semibold text-slate-400 block pt-1">Issued: {req.sentAt} • Expires: {req.expiresAt}</span>
                  </div>
                  
                  {/* Status Badge */}
                  <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    req.status === 'Fully' ? 'bg-emerald-100 text-emerald-800' :
                    req.status === 'Partially' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {req.status}
                  </span>
                </div>

                <div className="h-px bg-slate-200" />

                {/* Signatories list panel tracker */}
                <div className="space-y-1.5 text-xxs font-semibold">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Signatories Sign Route ({req.signingOrder})</span>
                  <div className="grid grid-cols-1 gap-1">
                    {req.signatories.map((sig, sidx) => (
                      <div key={sidx} className="flex justify-between items-center bg-white p-1.5 border rounded-lg">
                        <div className="truncate pr-4">
                          <span className="font-bold text-slate-800 block">{sig.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono italic block">{sig.email} ({sig.role})</span>
                        </div>
                        <span className={`text-[8px] font-bold uppercase py-0.5 px-2 rounded font-mono ${
                          sig.status === 'signed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {sig.status === 'signed' ? `Signed ${sig.signedAt}` : 'Pending signature'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated Externals Client Portal Button */}
                {nextPending && (
                  <div className="pt-3 flex gap-2 justify-end">
                    <button 
                      onClick={() => launchSimulatorForRequest(req)}
                      className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xxs font-bold transition shadow-xs flex items-center gap-1"
                    >
                      <Users className="h-3.5 w-3.5 text-sky-400" /> Launch Client Sign Simulator
                    </button>
                  </div>
                )}

              </div>
            )
          })
        )}
      </div>

      {/* 1. SETUP WORKFLOW MODAL */}
      {showSetup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
            
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-sky-400 animate-pulse" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Configure E-Signature Dispatch</h3>
                  <p className="text-[10px] text-slate-300">Set sign routing rules and map signatories list</p>
                </div>
              </div>
              <button onClick={() => setShowSetup(false)} className="text-xs font-bold bg-slate-800 p-1 px-2.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition">
                Close
              </button>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 text-xxs font-semibold">
              
              {/* Doc list */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Select Document to Dispatch</label>
                <select 
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                  className="w-full text-xs p-2.5 border bg-white rounded-lg outline-none"
                >
                  <option value="">-- Choose generated document files --</option>
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>Dossier Document #({d.id.slice(-4)}) - {d.content.slice(0, 45)}...</option>
                  ))}
                </select>
              </div>

              {/* Order togglers */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setSignOrder('parallel')}
                  className={`p-3 border rounded-xl cursor-pointer transition text-center ${signOrder === 'parallel' ? 'border-sky-505 border-sky-500 bg-sky-50/10' : 'bg-white'}`}
                >
                  <span className="font-extrabold text-[10px] text-slate-800 block">Parallel Signing Workflow</span>
                  <p className="text-[9px] text-slate-400 mt-0.5">All signatories receive contracts instantly simultaneously</p>
                </div>
                <div 
                  onClick={() => setSignOrder('sequential')}
                  className={`p-3 border rounded-xl cursor-pointer transition text-center ${signOrder === 'sequential' ? 'border-sky-505 border-sky-500 bg-sky-50/10' : 'bg-white'}`}
                >
                  <span className="font-extrabold text-[10px] text-slate-800 block">Sequential Step Routing</span>
                  <p className="text-[9px] text-slate-400 mt-0.5">Documents path sequentially in turn; step A must sign before step B</p>
                </div>
              </div>

              {/* Current signatories roster additions */}
              <div className="p-4 border bg-white rounded-2xl space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block border-b pb-1">Signatories Roster List</span>
                
                <div className="space-y-1.5">
                  {newSignatories.map((sig, sidx) => (
                    <div key={sidx} className="flex justify-between items-center p-2 bg-slate-50 border rounded-lg">
                      <div>
                        <span className="font-bold text-slate-800">{sig.name} ({sig.role})</span>
                        <span className="text-[9px] text-slate-400 block font-mono">{sig.email}</span>
                      </div>
                      <button 
                        onClick={() => removeSignatory(sidx)}
                        disabled={sidx === 0}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-extrabold text-slate-400 uppercase">Signer Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Officer Cooper" 
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      className="w-full border p-1 rounded font-bold"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-extrabold text-slate-400 uppercase">Signer Email</label>
                    <input 
                      type="email" 
                      placeholder="cooper@police.gov" 
                      value={tempEmail}
                      onChange={e => setTempEmail(e.target.value)}
                      className="w-full border p-1 rounded font-mono"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={addSignatory}
                    className="p-1 px-3 bg-slate-900 text-white hover:bg-slate-800 rounded font-bold uppercase tracking-wider text-[9px] mt-1"
                  >
                    + Invite Signer
                  </button>
                </div>
              </div>

            </div>

            <div className="p-4 border-t bg-slate-100 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => setShowSetup(false)}
                className="px-4 py-2 border hover:bg-slate-50 font-bold bg-white rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateRequest}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
              >
                Dispatch Contracts for Signing
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. SIGNING EXPERIENCE SIMULATOR POPUP */}
      {showSimulator && simulatedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-lg overflow-hidden">
            
            {/* Simulator Header Branding */}
            <div className="p-4 bg-sky-950 text-white border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-sky-400" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest font-mono text-sky-400">DOCKET SIGN SECURE® PORTAL</h4>
                  <p className="text-[9px] text-slate-300">Identity-Verified electronic execution center</p>
                </div>
              </div>
              <button onClick={() => setShowSimulator(false)} className="text-slate-400 hover:text-white shrink-0 text-xs">Close</button>
            </div>

            <div className="p-5 space-y-4 text-xxs font-semibold">
              
              <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Recipient Signer Scope</span>
                <p className="text-xs font-black text-slate-850">Actively Representing: {simulatedSignerEmail}</p>
                <p className="text-slate-500 leading-relaxed font-semibold">You have been requested by Alex Rivera, Esq., of Docket Legal to sign the contract document. Please complete OTP security checks below.</p>
              </div>

              {/* Secure verification simulation */}
              {!otpVerified ? (
                <div className="p-4 border rounded-xl bg-slate-50 text-center space-y-3" id="mock-otp-interface">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Signer Multifactor Verification</span>
                    <p className="text-slate-500 shrink-0 text-[10px]">Verify your identity using simulated Mobile SMS-OTP token authentication</p>
                  </div>

                  {!otpSent ? (
                    <button 
                      type="button"
                      onClick={triggerMockOtpSend}
                      className="w-full py-2 bg-slate-900 text-white hover:bg-slate-800 font-bold uppercase rounded-lg tracking-wider text-[10px] transition"
                    >
                      Request OTP Security Code
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2 max-w-[200px] mx-auto">
                        <input 
                          type="text" 
                          placeholder="Enter OTP '4092'" 
                          value={simOtpCode}
                          onChange={e => setSimOtpCode(e.target.value)}
                          className="w-full p-2 border bg-white rounded-lg text-center font-bold tracking-widest text-sm text-slate-800"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={verifyMockOtp}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase rounded-lg text-[9px]"
                      >
                        Verify Identity
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Verified, proceed to signing
                <div className="space-y-4" id="signer-execution-pad">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 flex gap-2 items-center">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Identity Verified. Secure tamperproof certificate generated.</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Type Signature Validation Statement</label>
                    <input 
                      type="text"
                      value={simSignatureText}
                      onChange={e => setSimSignatureText(e.target.value)}
                      placeholder="Type your name to sign"
                      className="w-full p-2.5 border text-xs bg-slate-50 font-bold focus:bg-white rounded-lg outline-none"
                    />
                    <p className="text-[9px] text-slate-400 leading-normal pt-1 italic font-medium">By typing your name, you acknowledge consent to legal execution of the electronic document under standard Electronic Transactions acts.</p>
                  </div>

                  {/* Draw Signature simulation canvas pad representation */}
                  <div className="p-4 border-2 border-dashed bg-slate-50 rounded-xl text-center relative pointer-events-auto" id="sig-pad-sim">
                    <PenTool className="h-4 w-4 text-slate-400 absolute left-2 top-2" />
                    <span className="text-[12px] italic text-slate-700 block font-serif underline tracking-wide py-4">
                      {simSignatureText || 'Sign here...'}
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono block">SIMULATED DRAWING PAD</span>
                  </div>

                  <button 
                    type="button"
                    onClick={completeSigningBySigner}
                    disabled={!simSignatureText}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded-lg tracking-wider transition text-xxs shadow-md"
                  >
                    Complete Signing & Lock Document
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white p-3.5 px-5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-sans z-[999] animate-fade-in border border-slate-800">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
