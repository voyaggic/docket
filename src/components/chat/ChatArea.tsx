import React, { useState } from 'react';
import ChatTypeArea from './ChatTypeArea';

export default function ChatArea() {
  const [messages, setMessages] = useState<string[]>([]);
  
  const handleNewMessage = (msg: string) => {
    setMessages((prev) => [...prev, msg]);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 overflow-hidden" id="chat-area-container">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-10 space-y-2">
            <p className="italic">No messages yet in this discussion.</p>
            <p>Start typing below to see contentEditable and attachment handlers in action!</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div 
              key={i} 
              className="p-3 bg-indigo-50/70 text-slate-800 border border-indigo-100 rounded-2xl w-fit text-sm shadow-xxs max-w-[85%] break-words"
            >
              {m}
            </div>
          ))
        )}
      </div>
      <ChatTypeArea onSendMessage={handleNewMessage} />
    </div>
  );
}
