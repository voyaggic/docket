import React, { useState } from 'react';
import { 
  BarChart2, Download, RefreshCw, BarChart as BarChartIcon, TrendingUp, Calendar, Clock, Lock, Shield, ArrowUpRight, CheckCircle2, ChevronRight, PieChart as PieIcon, Flame, FileText 
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Cell, Pie 
} from 'recharts';

interface ChatAnalyticsProps {
  onBack: () => void;
  messagesCount: number;
  conversationsCount: number;
}

export default function ChatAnalytics({ onBack, messagesCount, conversationsCount }: ChatAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'today'>('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mockTrafficData = [
    { name: 'Mon', FirmChat: 45, MatterChat: 88, Records: 12 },
    { name: 'Tue', FirmChat: 65, MatterChat: 110, Records: 24 },
    { name: 'Wed', FirmChat: 85, MatterChat: 140, Records: 45 },
    { name: 'Thu', FirmChat: 72, MatterChat: 115, Records: 31 },
    { name: 'Fri', FirmChat: 110, MatterChat: 195, Records: 58 },
    { name: 'Sat', FirmChat: 32, MatterChat: 45, Records: 8 },
    { name: 'Sun', FirmChat: 18, MatterChat: 22, Records: 4 }
  ];

  const mockChannelActivity = [
    { name: 'Firm General', count: 420 },
    { name: '#F-102 Trial', count: 310 },
    { name: '#F-205 Defense', count: 180 },
    { name: '#F-9201 Liability', count: 145 },
    { name: 'Paralegal Filings', count: 95 }
  ];

  const mockShareTypes = [
    { name: 'Word Documents', value: 34, color: '#4f46e5' },
    { name: 'Admissibility Photos', value: 24, color: '#3b82f6' },
    { name: 'PDF Pleadings', value: 42, color: '#06b6d4' }
  ];

  const handleRefreshStats = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 850);
  };

  const trendMetrics = [
    { label: 'Overall Send Efficiency', value: '116ms', change: '-12%', changeType: 'positive', description: 'Avg network message latency' },
    { label: 'Total On Record Ratio', value: '38.4%', change: '+8.2%', changeType: 'positive', description: 'Messages pinned to ledger records' },
    { label: 'Peak Concurrency', value: '12 active', change: '+3', changeType: 'positive', description: 'Firm members online in parallel' },
    { label: 'Legal Acknowledgement Speed', value: '4.2 hrs', change: '-18%', changeType: 'positive', description: 'Mins until notices read' }
  ];

  return (
    <div className="w-full bg-slate-50 min-h-[500px] rounded-3xl border border-slate-205 p-6 space-y-6 text-left animate-fade-in font-sans select-all">
      {/* Analytics Top bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 select-none">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-indigo-650 uppercase font-bold">
            <Lock className="w-3 h-3 text-indigo-500 animate-pulse" />
            <span>Encrypted Room Intelligence</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            <span>Communication & Traffic Audits</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border bg-white rounded-xl p-0.5 text-xxs font-bold shadow-xxs">
            {(['today', '7d', '30d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg transition ${timeRange === range ? 'bg-indigo-600 text-white font-extrabold shadow-xxs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {range === 'today' ? 'Today' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>

          <button 
            onClick={handleRefreshStats}
            className="p-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl hover:text-slate-900 text-slate-400 font-bold flex items-center justify-center cursor-pointer shadow-xxs"
            title="Refresh database records logs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button 
            onClick={onBack}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 cursor-pointer shadow-sm"
          >
            Go Back
          </button>
        </div>
      </div>

      {/* METRIC STRIPS SECTOR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {trendMetrics.map((met, idx) => (
          <div key={idx} className="bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-xxs border-slate-201 hover:border-slate-300 transition-all">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">{met.label}</span>
              <p className="text-2xl font-black text-slate-850 tracking-tight leading-none mt-1">{met.value}</p>
            </div>
            <div className="flex justify-between items-center text-[10px] mt-3 pt-2.5 border-t border-dashed border-slate-100 select-none">
              <span className="text-slate-500 block truncate max-w-[130px] font-sans text-left">{met.description}</span>
              <span className="text-emerald-600 font-bold font-mono">{met.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* COMPACT THREE COLUMN GRID GRAPH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph 1: Traffic Trend over time */}
        <div className="lg:col-span-2 bg-white border rounded-3xl p-5 space-y-4 shadow-xxs">
          <div className="flex justify-between items-center select-none border-b pb-3">
            <div>
              <h4 className="text-xs font-black text-slate-800 block uppercase tracking-wider flex items-center gap-1.5 leading-none">
                <TrendingUp className="w-4 h-4 text-emerald-650" />
                <span>Message Volume Distribution</span>
              </h4>
              <span className="text-[10px] text-slate-405 block font-serif mt-1">Encrypted packets exchanged by stream category</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-indigo-650 bg-indigo-50 rounded p-1 px-2 uppercase leading-none">Firm synced Ledger</span>
          </div>

          <div className="h-[250px] w-full text-xxs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockTrafficData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="MatterChat" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} name="Case Matters Chat" />
                <Line type="monotone" dataKey="FirmChat" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" name="Firm Lobby Chat" />
                <Line type="monotone" dataKey="Records" stroke="#06b6d4" strokeWidth={2} name="On Record Logs" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Share categories */}
        <div className="bg-white border rounded-3xl p-5 space-y-4 shadow-xxs flex flex-col justify-between">
          <div className="border-b pb-3 select-none">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider block flex items-center gap-1.5 leading-none">
              <PieIcon className="w-4 h-4 text-cyan-600" />
              <span>Shared File Mix</span>
            </h4>
            <span className="text-[10px] text-slate-405 mt-1 block font-serif">Total digital assets routed to legal vault</span>
          </div>

          <div className="h-[150px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockShareTypes}
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {mockShareTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xxs font-sans select-none pt-2 border-t border-dashed">
            {mockShareTypes.map((type, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full block shrink-0" style={{ backgroundColor: type.color }} />
                  <span className="font-medium truncate max-w-[120px]">{type.name}</span>
                </div>
                <span className="font-bold font-mono">{type.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ADDITIONAL STATISTICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Activity Heatmap simulation */}
        <div className="bg-white border rounded-3xl p-5 space-y-4 shadow-xxs text-left text-xxs">
          <div className="border-b pb-3 select-none flex justify-between items-center">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider block flex items-center gap-1.5 leading-none">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Rostering Heatmap (Hourly volume)</span>
              </h4>
              <span className="text-[10px] text-slate-405 mt-1 block">Traffic density index across firm working hours</span>
            </div>
            <span className="bg-orange-50 text-orange-605 rounded p-0.5 px-1.5 font-bold font-mono text-[9px]">Lively</span>
          </div>

          <div className="space-y-2 select-none pt-2">
            <div className="grid grid-cols-6 gap-2 text-center text-[9px] text-slate-440 font-mono mb-1">
              <span>08:00</span>
              <span>10:00</span>
              <span>12:00</span>
              <span>14:00</span>
              <span>16:00</span>
              <span>18:00</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              <div className="h-10 bg-indigo-50 border rounded-xl flex items-center justify-center font-bold text-slate-500 hover:scale-105 transition" title="Low density text messages">12</div>
              <div className="h-10 bg-indigo-300 border rounded-xl flex items-center justify-center font-bold text-indigo-900 hover:scale-105 transition" title="Moderate group discussion">45</div>
              <div className="h-10 bg-indigo-600 border rounded-xl text-white font-black flex items-center justify-center hover:scale-105 transition" title="Peak litigation syncing">132</div>
              <div className="h-10 bg-indigo-500 border rounded-xl text-white font-bold flex items-center justify-center hover:scale-105 transition" title="Pleadings drafting logs">88</div>
              <div className="h-10 bg-indigo-400 border rounded-xl text-white font-bold flex items-center justify-center hover:scale-105 transition" title="High legal updates">67</div>
              <div className="h-10 bg-indigo-200 border rounded-xl flex items-center justify-center font-bold text-indigo-900 hover:scale-105 transition">24</div>
            </div>
            <div className="pt-2 flex justify-between text-[8px] text-slate-400 tracking-wider">
              <span>● Minimal Exchange (Lighter Slate)</span>
              <span>● Intense Synchronization (Deeper Indigo)</span>
            </div>
          </div>
        </div>

        {/* Dynamic bar charts - busiest case folders */}
        <div className="bg-white border rounded-3xl p-5 space-y-4 shadow-xxs">
          <div className="border-b pb-3 select-none flex justify-between items-center">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider block flex items-center gap-1.5 leading-none">
                <Flame className="w-4 h-4 text-red-500 animate-bounce" />
                <span>Top Active Stream channels</span>
              </h4>
              <span className="text-[10px] text-slate-410 mt-1 block">Case rooms showing highest thread reply counts</span>
            </div>
            <span className="bg-red-50 text-red-600 rounded p-0.5 px-2 font-bold font-mono text-[9px]">Calculated Live</span>
          </div>

          <div className="h-[140px] w-full text-xxs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChannelActivity} layout="vertical" margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 8, 8, 0]} barSize={12}>
                  {mockChannelActivity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* INSTRUCTIONS SHEET DOWNLOADS MOCK */}
      <div className="p-4 bg-slate-900 text-slate-100 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
        <div className="flex gap-3">
          <div className="p-2.5 bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-left">
            <h5 className="font-extrabold text-xs text-white">Download Secure Compliance Audit Trail</h5>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">Generate encrypted password-protected files in JSON and PDF containing full compliance timestamps.</p>
          </div>
        </div>

        <button
          onClick={() => {
            alert('Your compliance communication report is ready! PDF with SHA-256 integrity checks has been requested.');
          }}
          className="px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shrink-0 transition"
        >
          <Download className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <span>Generate Ledger Export</span>
        </button>
      </div>

    </div>
  );
}
