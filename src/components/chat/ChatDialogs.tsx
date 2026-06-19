import React, { useState } from 'react';
import { 
  XSquare, Info, Shield, Clipboard, CheckCircle, Plus, AlertCircle, Trash, Download, FileText, Send, Landmark, Bell, Sliders, Volume2, Key, ToggleLeft, ToggleRight, Fingerprint
} from 'lucide-react';
import { KeywordAlertRule, LegalNotice } from './ChatTypes';

// Dialog 1: Export Chat Dialog
interface ExportChatDialogProps {
  onClose: () => void;
  conversationName: string;
}

export function ExportChatDialog({ onClose, conversationName }: ExportChatDialogProps) {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [exportingState, setExportingState] = useState<'idle' | 'running' | 'done'>('idle');

  const handleRunExport = () => {
    setExportingState('running');
    setTimeout(() => {
      setExportingState('done');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 chat-dialog-overlay bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-all font-sans">
      <div className="bg-white rounded-3xl border shadow-2xl p-6 max-w-md w-full space-y-4 text-left">
        <div className="flex justify-between items-center border-b pb-3 select-none">
          <div className="flex items-center gap-1.5 text-blue-650">
            <Download className="w-5 h-5 text-blue-600" />
            <span className="font-black text-sm">Vault Export Center</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer">
            <XSquare className="w-5 h-5" />
          </button>
        </div>

        {exportingState === 'done' ? (
          <div className="text-center p-5 space-y-3 select-none">
            <div className="mx-auto w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800">Export Prepared Successfully</h4>
            <p className="text-xxs text-slate-400 leading-relaxed font-sans">
              Your encrypted archive file representing <b>{conversationName}</b> has been assembled and encrypted with signature ID: <b>SHA256-VLT-91A</b>.
            </p>
            <div className="pt-3 flex gap-2 justify-center">
              <button onClick={onClose} className="px-5 py-2 bg-blue-650 hover:bg-blue-700 text-white font-black text-xs rounded-xl">
                Finish & Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xxs">
            <p className="text-slate-400 font-sans leading-normal">
              Acquire certified exports of chat room ledgers for legal compliance.
            </p>

            <div className="space-y-1.5 select-none text-slate-700">
              <label className="font-bold text-slate-500 uppercase tracking-wider block">1. File Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(['pdf', 'csv', 'json'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`p-2 border rounded-xl font-bold cursor-pointer transition uppercase text-center ${format === f ? 'bg-blue-50 border-blue-500 text-blue-700 font-black' : 'hover:bg-slate-50 border-slate-200'}`}
                  >
                    {f} file
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 uppercase tracking-wider block">2. Protection Keys (Mock)</label>
              <div className="flex items-center justify-between p-2 border border-slate-100 rounded-xl bg-slate-50 select-none">
                <div>
                  <span className="font-extrabold text-slate-705 block">Enable Password Seal</span>
                  <span className="text-[9px] text-slate-400 font-sans block mt-0.5">Encrypt file using a secondary passkey code</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPasswordProtected(!isPasswordProtected)}
                  className={`text-blue-600 focus:outline-none cursor-pointer ${isPasswordProtected ? 'opacity-100' : 'opacity-40'}`}
                >
                  {isPasswordProtected ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              {isPasswordProtected && (
                <div className="space-y-1 animate-fade-in mt-1.5">
                  <input
                    type="password"
                    placeholder="Enter compliance seal password..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full text-xxs border p-2 bg-slate-50 focus:bg-white rounded-lg outline-none"
                  />
                  <span className="text-[8px] text-slate-400 block font-mono italic">Recommended: Minimum 8 characters in length</span>
                </div>
              )}
            </div>

            <div className="space-y-2 select-none">
              <label className="font-bold text-slate-500 uppercase tracking-wider block">3. Structural Inclusions</label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-650">
                <input
                  type="checkbox"
                  checked={includeTimeline}
                  onChange={e => setIncludeTimeline(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>Include audit logging checklist details (read-receipt receipts metadata)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={onClose} className="px-4 py-2 border bg-white hover:bg-slate-50 text-slate-500 font-extrabold rounded-xl">
                Cancel
              </button>
              <button
                disabled={exportingState === 'running' || (isPasswordProtected && !password.trim())}
                onClick={handleRunExport}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-extrabold rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow"
              >
                {exportingState === 'running' ? 'Preparing pack...' : 'Generate Archive'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Dialog 2: Keyword Alerts Config
interface KeywordAlertsConfigProps {
  onClose: () => void;
  rules: KeywordAlertRule[];
  onAddRule: (rule: Omit<KeywordAlertRule, 'id'>) => void;
  onDeleteRule: (id: string) => void;
}

export function KeywordAlertsConfig({ onClose, rules, onAddRule, onDeleteRule }: KeywordAlertsConfigProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [action, setAction] = useState<'notify' | 'flag' | 'highlight'>('notify');
  const [color, setColor] = useState('#ef4444');

  const handleCreate = () => {
    if (!newKeyword.trim()) return;
    onAddRule({
      keyword: newKeyword.trim().toLowerCase(),
      action,
      isActive: true,
      color
    });
    setNewKeyword('');
  };

  return (
    <div className="fixed inset-0 chat-dialog-overlay bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-all font-sans">
      <div className="bg-white rounded-3xl border shadow-2xl p-6 max-w-md w-full space-y-4 text-left">
        <div className="flex justify-between items-center border-b pb-3 select-none">
          <div className="flex items-center gap-1.5 text-blue-605">
            <Volume2 className="w-5 h-5 text-blue-600" />
            <span className="font-black text-sm">Spike Alert Management</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer">
            <XSquare className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans font-sans">
          Specify core vocabularies (e.g. <i>statute, strike, settlement, urgent</i>). The ledger triggers acoustic bells and persistent crimson overlays on match.
        </p>

        {/* List rules */}
        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 font-sans">
          {rules.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center italic text-slate-400 text-xxs bg-slate-50 select-none">
              No alert keywords recorded yet. Create one below.
            </div>
          ) : (
            rules.map(r => (
              <div key={r.id} className="p-2.5 border rounded-xl bg-slate-50 flex justify-between items-center text-xxs font-sans">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <div>
                    <span className="font-extrabold block text-slate-800">"{r.keyword}"</span>
                    <span className="text-[9px] text-slate-400 uppercase font-mono block mt-0.5">{r.action} rule active</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteRule(r.id)}
                  className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer transition flex items-center justify-center"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Composer section */}
        <div className="p-3 border rounded-2xl bg-blue-50/10 border-blue-100 space-y-3.5 text-xxs">
          <label className="font-extrabold text-[9.5px] text-blue-905 block uppercase select-none">Index new Keyword Alarm</label>
          
          <div className="space-y-1">
            <input
              type="text"
              placeholder="Keyword or phrase (e.g. statute)..."
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              className="w-full text-xxs border p-2 bg-white rounded-xl outline-none focus:ring-1 focus:ring-blue-300 font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 select-none">
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Trigger Event</span>
              <select
                value={action}
                onChange={e => setAction(e.target.value as any)}
                className="w-full bg-white border p-1 rounded-lg text-xxs text-slate-600 outline-none"
              >
                <option value="notify">Dnd override chime</option>
                <option value="flag">Flag case profile</option>
                <option value="highlight">Amber highlight</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Marker Color</span>
              <div className="flex gap-1.5 items-center mt-1">
                {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'].map(col => (
                  <button
                    key={col}
                    onClick={() => setColor(col)}
                    className={`w-4 h-4 rounded-full block border cursor-pointer border-white ${color === col ? 'ring-2 ring-blue-500 scale-110' : ''}`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1 mt-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Keyword Rule</span>
          </button>
        </div>

        <div className="flex justify-end select-none">
          <button onClick={onClose} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl cursor-pointer">
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  );
}

// Dialog 3: Notification Setup Dialog
interface NotificationSetupDialogProps {
  onClose: () => void;
}

export function NotificationSetupDialog({ onClose }: NotificationSetupDialogProps) {
  const [channels, setChannels] = useState({
    acousticChime: true,
    emailDigest: true,
    mobilePush: false,
    dndOverride: false
  });

  return (
    <div className="fixed inset-0 chat-dialog-overlay bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-all font-sans">
      <div className="bg-white rounded-3xl border shadow-2xl p-6 max-w-sm w-full space-y-4 text-left">
        <div className="flex justify-between items-center border-b pb-3 select-none">
          <div className="flex items-center gap-1.5 text-blue-605">
            <Bell className="w-5 h-5 text-blue-600" />
            <span className="font-black text-sm">Notifications Matrix</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer">
            <XSquare className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans select-none">
          Tune your real-time notification rules below. These selections configure localized browser timers.
        </p>

        <div className="space-y-2 select-none text-xxs font-sans">
          {[
            { key: 'acousticChime', title: 'Acoustic Message Chimes', desc: 'Play modern click-sound on incoming drafts' },
            { key: 'emailDigest', title: 'Daily Mentions Digest', desc: 'Summary of @mentions logged to inbox' },
            { key: 'mobilePush', title: 'Secure Device Push Alerts', desc: 'Sync state with multi-device notification servers' },
            { key: 'dndOverride', title: 'Urgent Case Override', desc: 'Acoustic chime sounds despite active busy status' }
          ].map(it => (
            <div key={it.key} className="p-2.5 border rounded-xl hover:bg-slate-50 flex items-center justify-between gap-3 transition">
              <div>
                <span className="font-extrabold text-slate-705 block leading-tight">{it.title}</span>
                <span className="text-[9px] text-slate-400 font-sans block mt-0.5 leading-tight">{it.desc}</span>
              </div>
              <button
                onClick={() => setChannels(prev => ({ ...prev, [it.key]: !prev[it.key as keyof typeof channels] }))}
                className={`text-blue-600 focus:outline-none cursor-pointer ${channels[it.key as keyof typeof channels] ? 'opacity-100' : 'opacity-40'}`}
              >
                {channels[it.key as keyof typeof channels] ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>
          ))}
        </div>

        <div className="pt-2 select-none">
          <button onClick={onClose} className="w-full py-2 bg-blue-650 hover:bg-blue-700 text-white font-black text-xs rounded-xl">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

// Dialog 4: Legal Notice Composer Dialog
interface LegalNoticeComposerDialogProps {
  onClose: () => void;
  onPostNotice: (title: string, content: string, signOnly: boolean) => void;
}

export function LegalNoticeComposerDialog({ onClose, onPostNotice }: LegalNoticeComposerDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [signOnly, setSignOnly] = useState(true);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onPostNotice(title.trim(), content.trim(), signOnly);
    onClose();
  };

  return (
    <div className="fixed inset-0 chat-dialog-overlay bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-all font-sans">
      <div className="bg-white rounded-3xl border shadow-2xl p-6 max-w-md w-full space-y-4 text-left animate-fade-in">
        <div className="flex justify-between items-center border-b pb-3 select-none">
          <div className="flex items-center gap-1.5 text-amber-801 text-amber-800">
            <Landmark className="w-5 h-5 text-amber-600" />
            <span className="font-black text-sm">Post Legal Notice Bulletin</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-755 cursor-pointer">
            <XSquare className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[10.5px] text-slate-400 font-sans leading-normal">
          Draft a legally binding bulletin that forces immediate acknowledgment checks from case managers online.
        </p>

        <div className="space-y-3 text-xxs font-sans">
          <div className="space-y-1">
            <span className="text-[8px] font-bold text-slate-450 block uppercase select-none">Notice Heading reference</span>
            <input
              type="text"
              placeholder="e.g., CASE RESOLUTION DIRECTIVE #F-102"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-xxs border p-2 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-1 focus:ring-amber-500 font-sans"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[8px] font-bold text-slate-450 block uppercase select-none">Bulletin Content</span>
            <textarea
              placeholder="Write formal instructions requiring adherence..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              className="w-full text-xxs border p-2 bg-slate-50 focus:bg-white rounded-xl outline-none focus:ring-1 focus:ring-amber-500 resize-none font-sans"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-slate-650 p-1 bg-amber-50/50 rounded-lg">
            <input
              type="checkbox"
              checked={signOnly}
              onChange={e => setSignOnly(e.target.checked)}
              className="rounded text-amber-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-[9.5px]">Force explicit acknowledgement (recorded to ledger trail)</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 select-none border-t">
          <button onClick={onClose} className="px-4 py-2 border bg-white hover:bg-slate-50 text-slate-500 font-extrabold rounded-xl">
            Cancel
          </button>
          <button
            disabled={!title.trim() || !content.trim()}
            onClick={handleSubmit}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish bulletin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
