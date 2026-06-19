import React, { createContext, useContext, useState, useRef } from 'react';
import { ChatConversation, LegalNotice } from '../components/chat/ChatTypes';

interface ChatGlobalState {
  conversations: ChatConversation[];
  setConversations: React.Dispatch<React.SetStateAction<ChatConversation[]>>;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  selectedChannelId: string;
  setSelectedChannelId: (id: string) => void;
  notices: LegalNotice[];
  setNotices: React.Dispatch<React.SetStateAction<LegalNotice[]>>;
  msgText: string;
  setMsgText: (t: string | ((prev: string) => string)) => void;
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  composerDocked: boolean;
  setComposerDocked: (v: boolean) => void;
  composerMinimized: boolean;
  setComposerMinimized: (v: boolean) => void;
  composerPos: { x: number; y: number };
  setComposerPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isDictating: boolean;
  toggleDictation: () => void;
  dictationError: string | null;
  totalUnreads: number;
  seeded: boolean;
  setSeeded: (v: boolean) => void;
}

const ChatGlobalContext = createContext<ChatGlobalState | null>(null);

export function useChatGlobal() {
  const ctx = useContext(ChatGlobalContext);
  if (!ctx) throw new Error('useChatGlobal must be used within ChatGlobalProvider');
  return ctx;
}

export function ChatGlobalProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('firm-general');
  const [notices, setNotices] = useState<LegalNotice[]>([]);
  const [msgText, setMsgTextState] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [composerDocked, setComposerDocked] = useState(true);
  const [composerMinimized, setComposerMinimized] = useState(false);
  const [composerPos, setComposerPos] = useState({ x: 24, y: 24 });
  const [isDictating, setIsDictating] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const recognitionRef = useRef<any>(null);

  const setMsgText = (t: string | ((prev: string) => string)) => {
    if (typeof t === 'function') {
      setMsgTextState(prev => t(prev));
    } else {
      setMsgTextState(t);
    }
  };

  const totalUnreads = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const toggleDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setDictationError('Voice dictation needs Chrome/Edge over HTTPS, and mic permission for this site.');
      setTimeout(() => setDictationError(null), 5000);
      return;
    }
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    let final = '';
    rec.onstart = () => setIsDictating(true);
    rec.onresult = (ev: any) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript + ' ';
        else interim += ev.results[i][0].transcript;
      }
      setMsgTextState(final + interim);
    };
    rec.onerror = (ev: any) => {
      setIsDictating(false);
      setDictationError(ev.error === 'not-allowed' ? 'Mic access denied — enable it in browser site settings.' : 'Dictation error: ' + ev.error);
      setTimeout(() => setDictationError(null), 5000);
    };
    rec.onend = () => setIsDictating(false);
    recognitionRef.current = rec;
    rec.start();
  };

  return (
    <ChatGlobalContext.Provider value={{
      conversations, setConversations, messages, setMessages,
      selectedChannelId, setSelectedChannelId, notices, setNotices,
      msgText, setMsgText, attachedFiles, setAttachedFiles,
      composerDocked, setComposerDocked, composerMinimized, setComposerMinimized,
      composerPos, setComposerPos, isDictating, toggleDictation, dictationError,
      totalUnreads, seeded, setSeeded
    }}>
      {children}
    </ChatGlobalContext.Provider>
  );
}
