import React, { useState, useEffect } from 'react';
import { Sparkles, Check, X, AlertTriangle, AlertCircle, FileText } from 'lucide-react';
import { Case } from '../../types';

interface QuickParserProps {
  cases: Case[];
  onAddParsedDeadline: (parsed: {
    title: string;
    dueDate: string;
    deadlineType: string;
    caseId: string;
    priority: string;
    notes?: string;
  }) => void;
}

export default function QuickParser({ cases, onAddParsedDeadline }: QuickParserProps) {
  const [inputText, setInputText] = useState('');
  const [parsedResult, setParsedResult] = useState<any | null>(null);

  // Helper to parse dates like "15 July", "tomorrow", "next Monday"
  const parseNaturalLanguage = (text: string) => {
    if (!text.trim()) return null;

    const lower = text.toLowerCase();
    let detectedDate = new Date();
    let dateFound = false;

    // 1. Detect "tomorrow"
    if (lower.includes('tomorrow')) {
      detectedDate.setDate(detectedDate.getDate() + 1);
      dateFound = true;
    } 
    // 2. Detect "next monday/tuesday/etc."
    else if (lower.includes('next monday')) {
      const currentDay = detectedDate.getDay();
      const daysUntilMonday = (8 - currentDay) % 7 || 7;
      detectedDate.setDate(detectedDate.getDate() + daysUntilMonday);
      dateFound = true;
    } else if (lower.includes('next friday')) {
      const currentDay = detectedDate.getDay();
      const daysUntilFriday = (12 - currentDay) % 7 || 7;
      detectedDate.setDate(detectedDate.getDate() + daysUntilFriday);
      dateFound = true;
    }
    // 3. Detect months e.g. "15 July", "July 15", "25 December"
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    
    // Regex for: numbers followed by month, or month followed by numbers
    const monthRegex = new RegExp(`(?:(\\d{1,2})\\s+)?(${months.join('|')})(?:\\s+(\\d{1,2}))?(?:\\s+(\\d{4}))?`, 'i');
    const match = lower.match(monthRegex);
    if (match) {
      const dayVal = parseInt(match[1] || match[3] || '1');
      const monthStr = match[2];
      const yearVal = parseInt(match[4] || new Date().getFullYear().toString());

      const monthIndex = months.findIndex(m => m === monthStr) % 12;
      detectedDate = new Date(yearVal, monthIndex, dayVal);
      dateFound = true;
    }

    // 4. Time detection like "10am", "2:30pm", "14:00"
    let timeStr = '09:00';
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hrs = parseInt(timeMatch[1]);
      const mins = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3];
      if (ampm) {
        if (ampm.toLowerCase() === 'pm' && hrs < 12) hrs += 12;
        if (ampm.toLowerCase() === 'am' && hrs === 12) hrs = 0;
      }
      detectedDate.setHours(hrs, mins, 0, 0);
      timeStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    } else {
      detectedDate.setHours(9, 0, 0, 0);
    }

    // 5. Detect matter reference of cases list
    let matchedCaseId = '';
    let matchedCaseRef = 'General Obligations';
    for (const cs of cases) {
      const ref = cs.referenceNumber || '';
      if (ref && lower.includes(ref.toLowerCase())) {
        matchedCaseId = cs.id;
        matchedCaseRef = ref;
        break;
      }
    }

    // If case not matched by exact code, search client fullName
    if (!matchedCaseId) {
      for (const cs of cases) {
        const cliName = (cs as any).client?.fullName || '';
        if (cliName && lower.includes(cliName.toLowerCase())) {
          matchedCaseId = cs.id;
          matchedCaseRef = cs.referenceNumber || cliName;
          break;
        }
      }
    }

    // 6. Detect Action type
    let type = 'Filing Pleading';
    if (lower.includes('hearing') || lower.includes('court') || lower.includes('mention') || lower.includes('trial')) {
      type = 'Court Appearance';
    } else if (lower.includes('consultation') || lower.includes('meeting') || lower.includes('client')) {
      type = 'Client Meeting';
    } else if (lower.includes('statute') || lower.includes('limitation') || lower.includes('sol')) {
      type = 'Statute of Limitations';
    } else if (lower.includes('brief') || lower.includes('briefing') || lower.includes('defense') || lower.includes('bundle')) {
      type = 'File Briefs';
    }

    // 7. Detect priority tags
    let priority = 'Normal';
    if (lower.includes('urgent') || lower.includes('critical') || lower.includes('asap') || lower.includes('statute')) {
      priority = 'Critical';
    } else if (lower.includes('high') || lower.includes('important')) {
      priority = 'High';
    }

    // Construct pretty title by stripping references and dates
    let titleClean = text;
    // Strip case refs
    if (matchedCaseId) {
      const caseRefLower = matchedCaseRef.toLowerCase();
      titleClean = titleClean.replace(new RegExp(caseRefLower, 'ig'), '').trim();
    }
    // Capitalize first letter
    titleClean = titleClean.charAt(0).toUpperCase() + titleClean.slice(1);

    return {
      title: titleClean || 'Time Sensitive Task',
      dueDate: detectedDate.toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
      deadlineType: type,
      caseId: matchedCaseId || (cases[0]?.id || ''),
      caseRef: matchedCaseRef,
      priority: priority,
      confidence: dateFound ? 'high' : 'medium'
    };
  };

  useEffect(() => {
    const result = parseNaturalLanguage(inputText);
    setParsedResult(result);
  }, [inputText, cases]);

  const handleSave = () => {
    if (!parsedResult) return;
    onAddParsedDeadline({
      title: parsedResult.title,
      dueDate: parsedResult.dueDate,
      deadlineType: parsedResult.deadlineType,
      caseId: parsedResult.caseId,
      priority: parsedResult.priority,
      notes: `Quick NLP Parsed from: "${inputText}"`
    });
    setInputText('');
    setParsedResult(null);
  };

  return (
    <div className="bg-white border text-slate-800 rounded-2xl p-5 shadow-xs transition hover:shadow-sm" id="nlp-quick-parser">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Section 1: Intelligent Quick NLP Entry</h4>
          <p className="text-[10px] text-slate-400">Type naturally to instantly schedule. Focus input box by pressing 'N' anywhere.</p>
        </div>
      </div>

      <div className="relative">
        <input 
          id="nlp-fast-input"
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="E.g. DK-2026-401 hearing tomorrow 2pm in Chambers Supreme Court..." 
          className="w-full text-xs p-3.5 bg-slate-50 border border-slate-250 hover:bg-slate-50/50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-150 font-sans tracking-wide pr-12 focus:bg-white transition"
        />
        {inputText && (
          <button 
            type="button" 
            onClick={() => setInputText('')} 
            className="absolute right-3 top-3 p-1 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {parsedResult && inputText.trim() && (
        <div className="mt-3.5 p-4 bg-indigo-50/15 border border-indigo-100 rounded-xl animate-fade-in space-y-3.5">
          <div className="flex justify-between items-center text-xxs font-extrabold uppercase text-slate-400">
            <span className="text-indigo-700 block">Autoparsed preview results</span>
            {parsedResult.confidence === 'high' ? (
              <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-150 flex items-center gap-1 font-mono">
                <Check className="h-3 w-3" /> High confidence match
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-150 flex items-center gap-1 font-mono">
                <AlertCircle className="h-3 w-3" /> Check date accuracy
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xxs font-semibold text-slate-705">
            <div className="md:col-span-2">
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Parsed title & description</label>
              <input 
                type="text" 
                value={parsedResult.title} 
                onChange={e => setParsedResult({ ...parsedResult, title: e.target.value })}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-850 font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Due date & time</label>
              <input 
                type="datetime-local" 
                value={parsedResult.dueDate} 
                onChange={e => setParsedResult({ ...parsedResult, dueDate: e.target.value })}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-850 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Linked Court Matter</label>
              <select 
                value={parsedResult.caseId} 
                onChange={e => setParsedResult({ ...parsedResult, caseId: e.target.value })}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-850"
              >
                {cases.map(cs => (
                  <option key={cs.id} value={cs.id}>
                    {cs.referenceNumber} • {(cs as any).client?.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Task Category</label>
              <select 
                value={parsedResult.deadlineType} 
                onChange={e => setParsedResult({ ...parsedResult, deadlineType: e.target.value })}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-850"
              >
                <option value="Court Appearance">Court Appearance</option>
                <option value="Filing Pleading">Filing Pleading</option>
                <option value="Client Meeting">Client Meeting</option>
                <option value="Statute of Limitations">Statute of Limitations</option>
                <option value="File Briefs">File Briefs</option>
                <option value="Other Obligations">Other Obligations</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Priority SLA</label>
              <select 
                value={parsedResult.priority} 
                onChange={e => setParsedResult({ ...parsedResult, priority: e.target.value })}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-850"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 text-xxs font-bold pt-2 border-t">
            <button 
              type="button" 
              onClick={() => setParsedResult(null)} 
              className="p-2 border bg-white hover:bg-slate-50 text-slate-550 rounded-lg cursor-pointer"
            >
              Clear NLP Sandbox
            </button>
            <button 
              type="button" 
              onClick={handleSave} 
              className="p-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 cursor-pointer transition shadow"
            >
              <Check className="h-4.5 w-4.5 shrink-0" />
              <span>Confirm & Add to Live Ledger</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
