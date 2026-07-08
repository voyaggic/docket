import React, { useEffect, useRef } from 'react';
import { Reply, Copy, Pin, Landmark } from 'lucide-react';

interface MessageContextMenuProps {
  isOwn: boolean;
  isPinned: boolean;
  onReply: () => void;
  onCopy: () => void;
  onPin: () => void;
  onRecord: () => void;
  onClose: () => void;
  anchorMode: 'dropdown' | 'sheet'; // dropdown = desktop hover arrow, sheet = mobile long-press
}

export default function MessageContextMenu({
  isOwn, isPinned,
  onReply, onCopy, onPin, onRecord, onClose, anchorMode
}: MessageContextMenuProps) {
  const [positionClass, setPositionClass] = React.useState('top-full mt-1');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current && anchorMode === 'dropdown') {
      const rect = menuRef.current.getBoundingClientRect();
      const overflowBottom = rect.bottom > window.innerHeight;
      if (overflowBottom) {
        setPositionClass('bottom-full mb-1');
      }
    }
  }, [anchorMode]);

  const items = [
    { icon: Reply, label: 'Reply', action: onReply, iconColor: 'text-blue-500' },
    { icon: Pin, label: isPinned ? 'Unpin' : 'Pin', action: onPin, iconColor: isPinned ? 'text-amber-500' : 'text-slate-500' },
    { icon: Landmark, label: 'On Record', action: onRecord, iconColor: 'text-emerald-500' },
    { icon: Copy, label: 'Copy text', action: onCopy, iconColor: 'text-slate-500' },
  ];

  // --- MOBILE BOTTOM SHEET ---
  if (anchorMode === 'sheet') {
    return (
      <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end animate-fade-in" onClick={onClose}>
        <div
          className="w-full bg-white rounded-t-3xl p-2 pb-6 animate-slide-up-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />
          <div className="divide-y divide-slate-100">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { item.action(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-800 active:bg-slate-55 cursor-pointer"
              >
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- DESKTOP DROPDOWN ---
  return (
    <div
      ref={menuRef}
      className={`absolute ${isOwn ? 'right-0' : 'left-0'} ${positionClass} w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-scale-up select-none`}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.action(); onClose(); }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <item.icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
          {item.label}
        </button>
      ))}
    </div>
  );
}

