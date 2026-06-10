import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { BarChart2, Download, Check, HelpCircle, FileText, Calendar, Cloud, Database } from 'lucide-react';

// Color themes
const COLORS = ['#0284c7', '#14b8a6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

export default function DocumentAnalytics() {
  // Mock data for graphs
  const monthlyVolumeData = [
    { month: 'Jul', Generated: 12, Uploaded: 18 },
    { month: 'Aug', Generated: 15, Uploaded: 22 },
    { month: 'Sep', Generated: 18, Uploaded: 24 },
    { month: 'Oct', Generated: 25, Uploaded: 31 },
    { month: 'Nov', Generated: 29, Uploaded: 28 },
    { month: 'Dec', Generated: 36, Uploaded: 35 },
    { month: 'Jan', Generated: 42, Uploaded: 38 },
    { month: 'Feb', Generated: 54, Uploaded: 44 },
    { month: 'Mar', Generated: 61, Uploaded: 48 },
    { month: 'Apr', Generated: 78, Uploaded: 52 },
    { month: 'May', Generated: 89, Uploaded: 56 },
    { month: 'Jun', Generated: 104, Uploaded: 62 },
  ];

  const categoryDistributionData = [
    { name: 'Pleadings', value: 34 },
    { name: 'Evidence', value: 45 },
    { name: 'Contracts', value: 67 },
    { name: 'Correspondence', value: 120 },
    { name: 'Court Orders', value: 22 },
    { name: 'Expert Reports', value: 15 },
  ];

  const templateUsageData = [
    { name: 'Demand Letter', count: 184 },
    { name: 'Affidavit Service', count: 145 },
    { name: 'Retainer Covenant', count: 98 },
    { name: 'E-Sign NDA', count: 62 },
    { name: 'Court Summons', count: 48 },
  ];

  const turnaroundTimeData = [
    { name: 'A. Rivera', hours: 4.2 },
    { name: 'M. Vance', hours: 2.5 },
    { name: 'C. Wood', hours: 8.4 },
    { name: 'D. Chambers', hours: 5.1 },
    { name: 'S. Cooper', hours: 1.8 },
  ];

  return (
    <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-6" id="documents-analytics-panel">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-sky-500" /> Executive Compliance & Document Analytics
          </h3>
          <p className="text-[11px] text-slate-400">Continuous monitoring of firm storage quotas, templates throughput and compliance metrics</p>
        </div>
        <button 
          onClick={() => {
            const rowContent = turnaroundTimeData.map(r => `${r.name},${r.hours}`).join("\n");
            const blob = new Blob([`Reviewer,Average Hours\n${rowContent}`], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Docket_Performance_Report.csv`;
            a.click();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xxs font-bold transition shadow-md"
        >
          <Download className="h-3.5 w-3.5" /> Export Compliance Audit CSV
        </button>
      </div>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Graph 1: Volume Over Time */}
        <div className="border rounded-2xl p-4 space-y-3">
          <div>
            <h4 className="text-xs font-black text-slate-700">Document Expansion Trend</h4>
            <p className="text-[10px] text-slate-400">Monthly breakdown of AI-generated vs. manual uploads (Last 12 Months)</p>
          </div>
          <div className="h-64 h-min-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyVolumeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip wrapperStyle={{ fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="Generated" stroke="#0284c7" fillOpacity={1} fill="url(#colorGen)" />
                <Area type="monotone" dataKey="Uploaded" stroke="#14b8a6" fillOpacity={1} fill="url(#colorUpload)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Categories Pie */}
        <div className="border rounded-2xl p-4 space-y-3">
          <div>
            <h4 className="text-xs font-black text-slate-700">Matter Category Allocations</h4>
            <p className="text-[10px] text-slate-400">Proportional classification of document files across the firm database</p>
          </div>
          <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="w-1/2 h-full min-w-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-1.5 self-center">
              {categoryDistributionData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-[10px] text-slate-600 font-semibold">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate">{entry.name}</span>
                  <span className="text-slate-400 ml-auto font-mono text-[9px]">{entry.value} docs</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graph 3: Template Usage */}
        <div className="border rounded-2xl p-4 space-y-3">
          <div>
            <h4 className="text-xs font-black text-slate-700">Top Performing Templates</h4>
            <p className="text-[10px] text-slate-400">Total cumulative generations per standard document template layout</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={templateUsageData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {templateUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 4: Turnaround Time */}
        <div className="border rounded-2xl p-4 space-y-3">
          <div>
            <h4 className="text-xs font-black text-slate-700">Average Document Review SLA</h4>
            <p className="text-[10px] text-slate-400">Total median turnaround hours from submission to partner approval sign-off</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={turnaroundTimeData} layout="vertical" margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} />
                <Tooltip wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="hours" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Compliance indicators footer */}
      <div className="p-4 bg-slate-50 border rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="compliance-subreports">
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Audit Trail Integrity</span>
          <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-xs">
            <Check className="h-4 w-4" /> 100% Immutable Verified
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tamper Certificate</span>
          <div className="text-slate-700 font-extrabold font-mono text-[11px]">
            SHA-256 Enabled
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Storage Status</span>
          <div className="text-slate-700 text-xxs font-semibold">
            2.4 GB of 10 GB limit (24%)
          </div>
          <div className="w-full bg-slate-250 h-1.5 rounded-full overflow-hidden bg-slate-200">
            <div className="bg-sky-600 h-full rounded-full" style={{ width: '24%' }} />
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Monthly Gps / API</span>
          <div className="text-slate-700 text-[11px] font-bold">
            185 of 1,000 generations
          </div>
        </div>
      </div>
    </div>
  );
}
