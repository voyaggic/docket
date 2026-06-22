import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChatGlobal } from '../../context/ChatGlobalContext';
import { MessageCircle, Send, Paperclip, Mic, X, Maximize2 } from 'lucide-react';

export default function GlobalFloatingComposer() {
  const { user: currentUser, company } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    conversations, messages, setMessages, selectedChannelId,
    msgText, setMsgText, attachedFiles, setAttachedFiles,
    composerDocked, setComposerDocked, composerMinimized, setComposerMinimized,
    composerPos, setComposerPos, isDictating, toggleDictation, dictationError,
    totalUnreads
  } = useChatGlobal();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Panel is positioned at a fixed left/top base; live dragging is done purely via
  // CSS transform (GPU-composited, no layout reflow) for zero-lag tracking.
  const dragState = useRef<{ dragging: boolean; startMouseX: number; startMouseY: number; baseX: number; baseY: number; curX: number; curY: number; rafId: number | null }>({
    dragging: false, startMouseX: 0, startMouseY: 0, baseX: 0, baseY: 0, curX: 0, curY: 0, rafId: null
  });

  const startDrag = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, select')) return;
    const panel = panelRef.current;
    if (!panel) return;
    e.preventDefault();
    dragState.current.dragging = true;
    dragState.current.startMouseX = e.clientX;
    dragState.current.startMouseY = e.clientY;
    dragState.current.baseX = composerPos.x ?? 24;
    dragState.current.baseY = composerPos.y ?? 24;
    dragState.current.curX = dragState.current.baseX;
    dragState.current.curY = dragState.current.baseY;
    panel.style.transition = 'none';
    panel.style.willChange = 'transform';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const applyTransform = () => {
      const panel = panelRef.current;
      const ds = dragState.current;
      if (panel && ds.dragging) {
        panel.style.transform = `translate3d(${ds.curX - ds.baseX}px, ${ds.curY - ds.baseY}px, 0)`;
      }
      ds.rafId = null;
    };

    const onMove = (e: MouseEvent) => {
      const ds = dragState.current;
      if (!ds.dragging) return;
      const maxX = window.innerWidth - 360;
      const maxY = window.innerHeight - 80;
      ds.curX = Math.max(0, Math.min(maxX, ds.baseX + (e.clientX - ds.startMouseX)));
      ds.curY = Math.max(0, Math.min(maxY, ds.baseY + (e.clientY - ds.startMouseY)));
      if (ds.rafId === null) {
        ds.rafId = requestAnimationFrame(applyTransform);
      }
    };

    const onUp = () => {
      const ds = dragState.current;
      if (!ds.dragging) return;
      ds.dragging = false;
      if (ds.rafId !== null) {
        cancelAnimationFrame(ds.rafId);
        ds.rafId = null;
      }
      document.body.style.userSelect = '';
      const panel = panelRef.current;
      if (panel) {
        panel.style.transition = '';
        panel.style.willChange = '';
        panel.style.transform = '';
      }
      // Commit final position to React state exactly once, after drag ends.
      setComposerPos({ x: ds.curX, y: ds.curY });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [composerPos.x, composerPos.y, setComposerPos]);

  // @ts-ignore
  const SA_PATH = import.meta.env?.VITE_SUPERADMIN_PATH || 'system-access';
  const onSuperadminPage = location.pathname.startsWith(`/${SA_PATH}`);
  // Hard stop — never mount any part of firm chat (panel, bubble, or message data)
  // inside the superadmin panel. Superadmin operates across firms; leaking a single
  // firm's chat widget there is both wrong UX and a tenant-isolation risk.
  if (onSuperadminPage) return null;

  const onChatPage = location.pathname.startsWith('/chat');
  // Docked composer renders inline inside TeamChatView when on /chat — don't double-render here
  if (composerDocked && onChatPage) return null;
  // If docked and NOT on chat page, only show the small unread bubble — never the full panel
  if (composerDocked && !onChatPage && !composerMinimized) {
    return (
      <button
        onClick={() => navigate('/chat')}
        style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 9997 }}
        className="hidden md:flex w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-2xl items-center justify-center cursor-pointer transition hover:scale-110 active:scale-95"
        title="Open chat"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {totalUnreads > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse">
            {totalUnreads}
          </span>
        )}
      </button>
    );
  }
  if (!currentUser) return null;

  const activeChannel = conversations.find((c: any) => c.id === selectedChannelId);
  const channelMessages = messages.filter((m: any) =>
    (m.caseId === selectedChannelId || (selectedChannelId === 'firm-general' && !m.caseId)) && !m.replyToId
  ).slice(-6);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setAttachedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    if (!msgText.trim() && attachedFiles.length === 0) return;
    const id = `msg-${Date.now()}`;
    const finish = (fileData: any[]) => {
      setMessages((prev: any[]) => [...prev, {
        id,
        companyId: company?.id,
        caseId: selectedChannelId === 'firm-general' ? null : selectedChannelId,
        sentById: currentUser.id,
        message: msgText,
        attachments: fileData,
        readBy: [],
        reactions: {},
        createdAt: new Date().toISOString(),
        senderName: currentUser.fullName,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatarUrl
      }]);
      setMsgText('');
      setAttachedFiles([]);
    };
    if (attachedFiles.length) {
      Promise.all(attachedFiles.map(f => new Promise<any>(res => {
        const r = new FileReader();
        r.onload = ev => res({ name: f.name, type: f.type, dataUrl: ev.target?.result });
        r.readAsDataURL(f);
      }))).then(finish);
    } else {
      finish([]);
    }
  };

  const onDockClick = () => {
    setComposerDocked(true);
    setComposerMinimized(false);
    navigate('/chat');
  };

  if (composerMinimized) {
    return (
      <button
        onClick={() => setComposerMinimized(false)}
        style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 9997 }}
        className="hidden md:flex w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-2xl items-center justify-center cursor-pointer transition hover:scale-110 active:scale-95"
        title="Open floating chat"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {totalUnreads > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse">
            {totalUnreads}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      onMouseDown={startDrag}
      style={{
        position: 'fixed',
        left: composerPos.x !== undefined ? composerPos.x : 24,
        top: composerPos.y !== undefined ? composerPos.y : 24,
        zIndex: 9997,
        width: 360,
        cursor: 'grab'
      }}
      className="hidden md:flex bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up flex-col max-h-[520px] active:cursor-grabbing"
    >
      <div
        className="px-4 py-2.5 bg-blue-600 text-white flex items-center justify-between select-none shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold truncate">{activeChannel?.name || 'Secure Chat'}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onDockClick} title="Open full chat page" className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setComposerMinimized(true)} title="Minimize" className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50 min-h-[160px]">
        {channelMessages.length === 0 ? (
          <p className="text-center text-[11px] text-slate-400 py-6">No messages yet</p>
        ) : (
          channelMessages.map((m: any) => {
            const isOwn = m.sentById === currentUser.id;
            return (
              <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-[11px] ${isOwn ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'}`}>
                  {!isOwn && <span className="block text-[8px] font-bold opacity-60 mb-0.5">{m.senderName}</span>}
                  <p className="break-words font-sans">{m.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {dictationError && (
        <div className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-bold border-t border-rose-100">{dictationError}</div>
      )}

      <div className="p-2.5 border-t bg-white shrink-0">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
        {attachedFiles.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {attachedFiles.map((f, i) => (
              <span key={i} className="text-[9px] bg-blue-50 text-blue-700 rounded-lg px-2 py-1 font-bold">{f.name}</span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition cursor-pointer shrink-0">
            <Paperclip className="w-4 h-4" />
          </button>
          <button onClick={toggleDictation} className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${isDictating ? 'bg-rose-500 text-white animate-pulse' : 'hover:bg-slate-100 text-slate-400'}`}>
            <Mic className="w-4 h-4" />
          </button>
          <textarea
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message…"
            rows={1}
            className="flex-1 text-xs p-2 rounded-xl bg-slate-100 outline-none resize-none border-0 max-h-[80px]"
          />
          <button onClick={handleSend} disabled={!msgText.trim() && attachedFiles.length === 0}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer disabled:opacity-40 transition shrink-0 active:scale-90">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
