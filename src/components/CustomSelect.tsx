import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = '-- Select --',
  className = ''
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border-[2px] border-slate-200 rounded-xl text-xs font-normal text-slate-800 hover:bg-slate-100/70 hover:border-slate-300 transition-all outline-none focus:bg-slate-100 focus:border-slate-400"
      >
        <span className={selected ? 'text-slate-950 font-normal text-center flex-1' : 'text-slate-500 font-normal text-center flex-1'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Floating Dropdown */}
      {open && (
        <div className="absolute z-50 mt-4 w-full bg-white border-[2px] border-slate-200/80 rounded-2xl shadow-xl p-1.5 overflow-hidden animate-fade-in translate-y-1">
          {/* Optional placeholder row */}
          {placeholder && (
            <div
              onClick={() => { onChange(''); setOpen(false); }}
              className="px-3 py-2.5 text-xs text-slate-400 font-normal italic hover:bg-slate-50 cursor-pointer rounded-xl border-b border-slate-100"
            >
              {placeholder}
            </div>
          )}

          {options.map((opt, idx) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`
                px-3 py-2.5 text-xs font-normal cursor-pointer transition-all flex items-center justify-between rounded-xl
                ${value === opt.value
                  ? 'bg-sky-50 text-[#00BCFF]'
                  : 'text-slate-800 hover:bg-slate-50 hover:text-[#00BCFF]'
                }
              `}
            >
              <span>{opt.label}</span>
              {value === opt.value && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#00BCFF]" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}