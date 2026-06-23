import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  colorMode: 'light' | 'dark';
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export default function ThemeToggle({ colorMode, onToggle, size = 'md' }: ThemeToggleProps) {
  const isDark = colorMode === 'dark';
  const trackWidth = size === 'sm' ? 44 : 52;
  const trackHeight = size === 'sm' ? 24 : 28;
  const thumbSize = trackHeight - 4;
  const translate = trackWidth - trackHeight;

  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: `${trackWidth}px`,
        height: `${trackHeight}px`,
        minWidth: `${trackWidth}px`,
        minHeight: `${trackHeight}px`,
        padding: 0
      }}
      className={`relative rounded-full transition-colors duration-300 ease-in-out shrink-0 cursor-pointer ${isDark ? 'bg-slate-700' : 'bg-sky-100'}`}
    >
      <span
        style={{
          width: `${thumbSize}px`,
          height: `${thumbSize}px`,
          top: '2px',
          left: '2px',
          transform: isDark ? `translateX(${translate}px)` : 'translateX(0px)'
        }}
        className="absolute rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 ease-in-out"
      >
        {isDark ? <Moon className="h-3 w-3 text-slate-700" /> : <Sun className="h-3 w-3 text-amber-500" />}
      </span>
    </button>
  );
}
