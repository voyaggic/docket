import React, { useRef } from 'react';
import { Paperclip, Bold, Italic, Send } from 'lucide-react';

interface ChatTypeAreaProps {
  onSendMessage: (msg: string) => void;
}

export default function ChatTypeArea({ onSendMessage }: ChatTypeAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (inputRef.current?.innerText.trim()) {
      onSendMessage(inputRef.current.innerText);
      inputRef.current.innerText = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-white border-t border-slate-200" id="chat-type-area">
      <div className="flex items-center gap-3 bg-slate-50/80 rounded-2xl p-2 border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          id="chat-type-file-input"
        />
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="p-2 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
          type="button"
          id="chat-type-attach"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div 
          ref={inputRef}
          contentEditable 
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          className="flex-1 p-2 bg-transparent outline-none text-sm text-slate-800 min-h-[24px] max-h-[120px] overflow-y-auto cursor-text empty:before:content-[attr(placeholder)] empty:before:text-slate-415 empty:before:text-slate-400 empty:before:pointer-events-none empty:before:italic"
          placeholder="Type message..."
          id="chat-type-text-input"
        />

        <div className="flex gap-2 border-l border-slate-200 pl-2">
          <button className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded transition cursor-pointer" type="button"><Bold className="w-4 h-4" /></button>
          <button className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded transition cursor-pointer" type="button"><Italic className="w-4 h-4" /></button>
        </div>
        
        <button 
          onClick={handleSend} 
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer shrink-0"
          type="button"
          id="chat-type-send-btn"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
