import React from 'react';
import { LayoutGrid, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

interface BentoDashboardCustomizerProps {
  localWidgets: any[];
  setLocalWidgets: (widgets: any[]) => void;
  isCustomizing: boolean;
  setIsCustomizing: (val: boolean) => void;
  toggleWidgetVisible: (widgetId: string) => void;
  moveWidget: (index: number, direction: 'up' | 'down') => void;
  savingLayout: boolean;
  handleSaveLayout: () => void;
  setAnnouncementModalOpen: (val: boolean) => void;
}

export const BentoDashboardCustomizer: React.FC<BentoDashboardCustomizerProps> = ({
  localWidgets,
  setLocalWidgets,
  isCustomizing,
  setIsCustomizing,
  toggleWidgetVisible,
  moveWidget,
  savingLayout,
  handleSaveLayout,
  setAnnouncementModalOpen,
}) => {
  if (!isCustomizing) return null;

  return (
    <div 
      className="p-5 max-w-4xl mx-auto w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-[20px] border-[2px] border-slate-300 shadow-lg space-y-4 animate-fade-in" 
      id="dashboard-layout-customizer-panel"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="text-indigo-600 h-5.5 w-5.5" />
          <div className="text-left">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
              Configure Bento Dashboard Widgets
            </h3>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
              Enable/disable, rename display headers, edit indices and save configurations back to companySettings.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setAnnouncementModalOpen(true)}
            className="px-3 py-1.5 bg-white text-slate-750 hover:bg-slate-100 text-[11px] font-semibold border-2 border-slate-200 rounded-xl flex items-center gap-1 shadow-xxs cursor-pointer transition"
          >
            Config Announcement Banner
          </button>
          <button 
            disabled={savingLayout}
            onClick={handleSaveLayout}
            className="px-4 py-1.5 bg-[#00BCFF] hover:bg-sky-500 border-[2px] border-slate-800 text-black text-[11px] font-normal uppercase tracking-wider rounded-xl flex items-center gap-1 shadow-sm cursor-pointer transition"
          >
            {savingLayout ? (
              <Loader2 className="h-3 w-3 animate-spin text-black" />
            ) : (
              "Save Custom Layout"
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {localWidgets.map((w, index) => (
          <div 
            key={w.widgetId}
            className={`p-3 bg-white border rounded-[16px] flex flex-col justify-between transition-all ${
              w.isVisible 
                ? 'border-indigo-200 ring-2 ring-indigo-50/50' 
                : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1 text-left w-[70%]">
                <span className="text-[8px] font-black font-mono tracking-wider text-slate-400 uppercase bg-slate-105 bg-slate-100 px-1.5 py-0.5 rounded">
                  Type: {w.widgetType}
                </span>
                <input 
                  type="text" 
                  value={w.label} 
                  onChange={(e) => {
                    const next = [...localWidgets];
                    next[index].label = e.target.value;
                    setLocalWidgets(next);
                  }}
                  className="text-xs font-bold text-slate-800 font-sans tracking-tight border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none w-full bg-transparent p-0.5"
                />
              </div>
              
              {/* Toggle controller */}
              <button 
                onClick={() => toggleWidgetVisible(w.widgetId)}
                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase transition shrink-0 ${
                  w.isVisible 
                    ? 'bg-indigo-100 text-indigo-800' 
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {w.isVisible ? 'Visible' : 'Hidden'}
              </button>
            </div>

            <div className="flex gap-2 justify-between items-center pt-3 border-t border-slate-100 mt-3">
              <span className="text-[10px] font-mono text-slate-400">
                Position index: {w.position}
              </span>
              <div className="flex gap-1">
                <button 
                  disabled={index === 0}
                  onClick={() => moveWidget(index, 'up')}
                  className="p-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-20 cursor-pointer"
                >
                  <ArrowUp className="h-3 w-3 text-slate-600" />
                </button>
                <button 
                  disabled={index === localWidgets.length - 1}
                  onClick={() => moveWidget(index, 'down')}
                  className="p-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-20 cursor-pointer"
                >
                  <ArrowDown className="h-3 w-3 text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
