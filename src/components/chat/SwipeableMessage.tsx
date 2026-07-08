import React, { useRef, useState } from 'react';
import { ChevronDown, Reply } from 'lucide-react';

interface SwipeableMessageProps {
  children: React.ReactNode;
  isOwn: boolean;
  onOpenMenu: () => void;
  onSwipeReply: () => void;
  menuOpen: boolean;
}

export default function SwipeableMessage({ children, isOwn, onOpenMenu, onSwipeReply, menuOpen }: SwipeableMessageProps) {
  const [dragX, setDragX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<any>(null);
  const SWIPE_TRIGGER_THRESHOLD = 60;
  const MAX_SWIPE = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      onOpenMenu();
      if (navigator.vibrate) navigator.vibrate(15);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    // Cancel long-press if the finger moves — this is a swipe, not a hold
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }

    // Only allow swiping if mostly horizontal, to avoid messing with scroll
    if (Math.abs(dx) > Math.abs(dy)) {
      if (isOwn) {
        // Own messages: swipe left to reply
        if (dx < 0) {
          setSwiping(true);
          setDragX(Math.max(dx, -MAX_SWIPE));
        }
      } else {
        // Others' messages: swipe right to reply
        if (dx > 0) {
          setSwiping(true);
          setDragX(Math.min(dx, MAX_SWIPE));
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const triggerCondition = isOwn 
      ? dragX < -SWIPE_TRIGGER_THRESHOLD 
      : dragX > SWIPE_TRIGGER_THRESHOLD;

    if (triggerCondition) {
      onSwipeReply();
      if (navigator.vibrate) navigator.vibrate(10);
    }
    setDragX(0);
    setSwiping(false);
    touchStart.current = null;
  };

  const handleTouchCancel = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setDragX(0);
    setSwiping(false);
    touchStart.current = null;
  };

  return (
    <div
      className="relative group/msg select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Reply icon revealed behind the bubble as it's swiped */}
      {!isOwn && dragX > 4 && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 pointer-events-none"
          style={{ opacity: Math.min(dragX / SWIPE_TRIGGER_THRESHOLD, 1) }}
        >
          <Reply className="w-4 h-4" />
        </div>
      )}
      {isOwn && dragX < -4 && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 pointer-events-none"
          style={{ opacity: Math.min(-dragX / SWIPE_TRIGGER_THRESHOLD, 1) }}
        >
          <Reply className="w-4 h-4" />
        </div>
      )}

      <div
        style={{
          transform: `translateX(${dragX}px)`,
          transition: swiping ? 'none' : 'transform 0.2s cubic-bezier(0.16,1,0.3,1)'
        }}
      >
        {children}
      </div>

      {/* Desktop-only hover arrow trigger — small chevron near the bubble */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenMenu(); }}
        className={`hidden md:flex absolute top-1 ${isOwn ? 'left-1' : 'right-1'} h-5 w-5 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-opacity ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100'}`}
        title="Message options"
      >
        <ChevronDown className="w-3 h-3" />
      </button>
    </div>
  );
}
