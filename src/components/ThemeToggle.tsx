import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  colorMode: 'light' | 'dark';
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export default function ThemeToggle({ colorMode, onToggle, size = 'md' }: ThemeToggleProps) {
  const isDark = colorMode === 'dark';
  const trackW = size === 'sm' ? 'w-12' : 'w-14';
  const trackH = size === 'sm' ? 'h-6' : 'h-7';
  const thumbSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const translate = size === 'sm' ? 'translate-x-6' : 'translate-x-7';

  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative ${trackW} ${trackH} rounded-full transition-colors duration-300 ease-in-out shrink-0 cursor-pointer ${isDark ? 'bg-slate-700' : 'bg-sky-100'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 ${thumbSize} rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 ease-in-out ${isDark ? translate : 'translate-x-0'}`}
      >
        {isDark ? <Moon className="h-3.5 w-3.5 text-slate-700" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
      </span>
    </button>
  );
}
