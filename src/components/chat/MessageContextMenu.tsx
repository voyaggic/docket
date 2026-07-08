import React, { useEffect, useRef } from 'react';
import { Reply, Copy, Forward, Pin, Star, CheckSquare, Trash2, ChevronDown } from 'lucide-react';

interface MessageContextMenuProps {
  isOwn: boolean;
  isPinned: boolean;
  isStarred: boolean;
  onReply: () => void;
  onCopy: () => void;
  onForward: () => void;
  onPin: () => void;
  onStar: () => void;
  onSelect: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onClose: () => void;
  anchorMode: 'dropdown' | 'sheet'; // dropdown = desktop hover arrow, sheet = mobile long-press
}

export default function MessageContextMenu({
  isOwn, isPinned, isStarred,
  onReply, onCopy, onForward, onPin, onStar, onSelect,
  onDeleteForMe, onDeleteForEveryone, onClose, anchorMode
}: MessageContextMenuProps) {
  const [showDeleteSubmenu, setShowDeleteSubmenu] = React.useState(false);
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
    { icon: Reply, label: 'Reply', action: onReply, iconColor: 'text-blue-600' },
    { icon: Copy, label: 'Copy', action: onCopy, iconColor: 'text-slate-500' },
    { icon: Forward, label: 'Forward', action: onForward, iconColor: 'text-slate-500', flip: true },
    { icon: Pin, label: isPinned ? 'Unpin' : 'Pin', action: onPin, iconColor: isPinned ? 'text-amber-500' : 'text-slate-500' },
    { icon: Star, label: isStarred ? 'Unstar' : 'Star', action: onStar, iconColor: isStarred ? 'text-yellow-500' : 'text-slate-500', fill: isStarred },
    { icon: CheckSquare, label: 'Select', action: onSelect, iconColor: 'text-slate-500' },
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
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-800 active:bg-slate-50"
              >
                <item.icon className={`w-5 h-5 ${item.iconColor} ${item.fill ? 'fill-current' : ''}`} style={item.flip ? { transform: 'scaleX(-1)' } : {}} />
                {item.label}
              </button>
            ))}

            {!showDeleteSubmenu ? (
              <button
                onClick={() => setShowDeleteSubmenu(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-rose-600 active:bg-rose-50"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
            ) : (
              <div className="pt-1">
                {isOwn && (
                  <button
                    onClick={() => { onDeleteForEveryone(); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-rose-600 active:bg-rose-50"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete for everyone
                  </button>
                )}
                <button
                  onClick={() => { onDeleteForMe(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-800 active:bg-slate-50"
                >
                  <Trash2 className="w-5 h-5 text-slate-500" />
                  Delete for me
                </button>
              </div>
            )}
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
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          <item.icon className={`w-3 h-3 ${item.iconColor} ${item.fill ? 'fill-current' : ''}`} style={item.flip ? { transform: 'scaleX(-1)' } : {}} />
          {item.label}
        </button>
      ))}

      <div className="h-px bg-slate-100 my-0.5" />

      {!showDeleteSubmenu ? (
        <button
          onClick={() => setShowDeleteSubmenu(true)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition"
        >
          <span className="flex items-center gap-2"><Trash2 className="w-3 h-3" /> Delete</span>
          <ChevronDown className="w-2.5 h-2.5 -rotate-90 text-rose-400" />
        </button>
      ) : (
        <>
          {isOwn && (
            <button
              onClick={() => { onDeleteForEveryone(); onClose(); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition"
            >
              <Trash2 className="w-3 h-3 text-rose-500" /> For everyone
            </button>
          )}
          <button
            onClick={() => { onDeleteForMe(); onClose(); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <Trash2 className="w-3 h-3 text-slate-400" /> For me
          </button>
        </>
      )}
    </div>
  );
}
