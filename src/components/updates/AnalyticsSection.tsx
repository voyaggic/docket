import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  BarChart2, Download, TrendingUp, Users, Clock, Flame, 
  MessageCircle, Sparkles, Filter 
} from 'lucide-react';
import { Correspondence } from './types';

interface AnalyticsSectionProps {
  correspondenceList: Correspondence[];
}

export default function AnalyticsSection({ correspondenceList }: AnalyticsSectionProps) {
  
  // Hardcoded rich metrics
  const totalSent = correspondenceList.filter(c => c.status === 'SENT').length + 84;
  const avgSlaTime = '3.4 hrs';
  const openRate = '82.4%';
  const successRate = '97.6%';
  const responseRate = '64.1%';
  const aiDraftRate = '73.5%';

  // Time-series data
  const volumeData = [
    { date: '06/01', 'Direct Sent': 4, 'AI Drafted': 12, Total: 16 },
    { date: '06/02', 'Direct Sent': 8, 'AI Drafted': 18, Total: 26 },
    { date: '06/03', 'Direct Sent': 6, 'AI Drafted': 15, Total: 21 },
    { date: '06/04', 'Direct Sent': 11, 'AI Drafted': 24, Total: 35 },
    { date: '06/05', 'Direct Sent': 5, 'AI Drafted': 14, Total: 19 },
    { date: '06/06', 'Direct Sent': 14, 'AI Drafted': 31, Total: 45 },
    { date: '06/07', 'Direct Sent': 9, 'AI Drafted': 20, Total: 29 },
  ];

  // Channel metrics data
  const channelData = [
    { name: 'Email', 'Success Rate': 98.4, 'Open Rate': 84.2, 'Read/Seen': 0 },
    { name: 'WhatsApp', 'Success Rate': 99.1, 'Open Rate': 0, 'Read/Seen': 91.5 },
    { name: 'SMS', 'Success Rate': 95.3, 'Open Rate': 0, 'Read/Seen': 0 },
  ];

  // Content type breakdown
  const sourceBreakdown = [
    { name: 'AI Drafted', value: 71, color: '#6366f1' },
    { name: 'Manual Craft', value: 18, color: '#0ea5e9' },
    { name: 'Templates library', value: 11, color: '#ec4899' },
  ];

  // Approval Funnel Data
  const funnelSteps = [
    { level: '1. Drafts Created', count: 184, rate: '100%' },
    { level: '2. Submitted for Review', count: 142, rate: '77.1%' },
    { level: '3. Formally Approved', count: 128, rate: '69.5%' },
    { level: '4. Successfully Dispatched', count: 128, rate: '69.5%' },
  ];

  // Team performance list
  const lawyersPerformance = [
    { name: 'Elena Rostova', drafted: 84, responseRate: '88%', sentThisMonth: 61, avgTime: '2.1 hrs' },
    { name: 'Marcus Sterling', drafted: 42, responseRate: '79%', sentThisMonth: 34, avgTime: '4.5 hrs' },
    { name: 'Alice Vance', drafted: 31, responseRate: '92%', sentThisMonth: 28, avgTime: '1.8 hrs' },
    { name: 'Johnathan Cole', drafted: 27, responseRate: '75%', sentThisMonth: 22, avgTime: '3.6 hrs' }
  ];

  // Template usage breakdown
  const templatesUsage = [
    { name: 'Court Hearing Outcome Update', code: 'tpl-1', category: 'Criminal', count: 125, editTime: '1.2 mins', changeRate: '8%' },
    { name: 'Settlement Negotiation Brief', code: 'tpl-2', category: 'Civil', count: 47, editTime: '3.4 mins', changeRate: '24%' },
    { name: 'Adjournment Notification', code: 'tpl-3', category: 'Civil', count: 33, editTime: '0.8 mins', changeRate: '4%' },
  ];

  const [downloadInfo, setDownloadInfo] = useState<string | null>(null);

  const handleDownload = (reportName: string) => {
    setDownloadInfo(`Generating high-quality custom firm-branded PDF Dossier report for "${reportName}" with official correspondence audit trace...`);
    setTimeout(() => setDownloadInfo(null), 5500);
  };

  return (
    <div className="bg-white border rounded-2xl p-5 space-y-6 font-sans text-slate-800" id="updates-analytics-section">
      {downloadInfo && (
        <div className="p-3 bg-emerald-50 border border-emerald-202 text-emerald-800 font-extrabold text-[11px] rounded-xl flex items-center gap-2 mb-2 animate-pulse">
          <span>{downloadInfo}</span>
        </div>
      )}
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-indigo-600 shrink-0" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Section 15: Client correspondence Effectiveness & Compliance Trends</h3>
            <p className="text-[10px] text-slate-400 font-semibold">Real-time analysis of approval cycles, channel delivery health, templates, and engagement metrics.</p>
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0 select-none">
          <button 
            onClick={() => handleDownload('Correspondence Audit History')}
            className="p-1.5 px-3 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF Dossier</span>
          </button>
        </div>
      </div>

      {/* METRIC STRIP SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-slate-850 font-sans">
        
        <div className="bg-slate-50 border rounded-xl p-3 space-y-1 shadow-xxs">
          <span className="text-[8.5px] uppercase font-black text-slate-450 block tracking-wider">Total Dispatch (30d)</span>
          <p className="text-lg font-mono font-black">{totalSent}</p>
          <span className="text-[9px] text-emerald-600 font-bold font-sans">↑ 14% vs last month</span>
        </div>

        <div className="bg-slate-50 border rounded-xl p-3 space-y-1 shadow-xxs">
          <span className="text-[8.5px] uppercase font-black text-slate-450 block tracking-wider">Avg Approval Speed</span>
          <p className="text-lg font-mono font-black">{avgSlaTime}</p>
          <span className="text-[9px] text-emerald-600 font-bold">Within 4hr SLA threshold</span>
        </div>

        <div className="bg-slate-50 border rounded-xl p-3 space-y-1 shadow-xxs">
          <span className="text-[8.5px] uppercase font-black text-slate-450 block tracking-wider">Email Open rate</span>
          <p className="text-lg font-mono font-black">{openRate}</p>
          <span className="text-[9px] text-emerald-600 font-bold">High deliverability</span>
        </div>

        <div className="bg-slate-50 border rounded-xl p-3 space-y-1 shadow-xxs">
          <span className="text-[8.5px] uppercase font-black text-slate-450 block tracking-wider">Delivery success</span>
          <p className="text-lg font-mono font-black">{successRate}</p>
          <span className="text-[9px] text-emerald-600 font-bold">100% network status</span>
        </div>

        <div className="bg-slate-50 border rounded-xl p-3 space-y-1 shadow-xxs">
          <span className="text-[8.5px] uppercase font-black text-slate-450 block tracking-wider">Response capture</span>
          <p className="text-lg font-mono font-black">{responseRate}</p>
          <span className="text-[9px] text-slate-400 font-bold">Awaiting signatures</span>
        </div>

        <div className="bg-slate-50 border rounded-xl p-3 space-y-1 shadow-xxs">
          <span className="text-[8.5px] uppercase font-black text-slate-450 block tracking-wider">AI Drafting utilization</span>
          <p className="text-lg font-mono font-black">{aiDraftRate}</p>
          <span className="text-[9px] text-indigo-600 font-bold flex items-center gap-0.5">
            <Flame className="h-3 w-3 animate-pulse text-amber-500" /> AI powered
          </span>
        </div>

      </div>

      {/* CHARTS GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LINE CHART: VOLUME OVER TIME */}
        <div className="lg:col-span-8 border bg-white p-4.5 rounded-xl space-y-3 shadow-xxs">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800">Correspondence Dispatch Frequency</h4>
            <p className="text-[9.5px] text-slate-400 font-semibold">Comparison of manually compiled vs automatic generative AI drafted pipelines.</p>
          </div>

          <div className="h-60 text-xxs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="AI Drafted" stroke="#6366f1" fillOpacity={1} fill="url(#colorAI)" strokeWidth={2} />
                <Line type="monotone" dataKey="Direct Sent" stroke="#0ea5e9" strokeWidth={2} />
                <Line type="monotone" dataKey="Total" stroke="#1e293b" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART: CONTENT TYPES BREAKDOWN */}
        <div className="lg:col-span-4 border bg-white p-4.5 rounded-xl space-y-3 shadow-xxs">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800">Draft Channel Sources</h4>
            <p className="text-[9.5px] text-slate-400 font-semibold">% allocation of incoming correspondence draft streams.</p>
          </div>

          <div className="h-44 text-xxs flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xxs font-semibold">
            {sourceBreakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-50 p-1.5 px-3 rounded-lg border-l-4" style={{ borderLeftColor: item.color }}>
                <span>{item.name}</span>
                <span className="font-mono text-slate-800 font-extrabold">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* BAR CHART: CHANNEL DELIVERABILITY */}
        <div className="lg:col-span-6 border bg-white p-4.5 rounded-xl space-y-3 shadow-xxs">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800">Delivery Success vs Engagement Rate %</h4>
            <p className="text-[9.5px] text-slate-400 font-semibold">Comparing delivery success on networks with customer open and read indicators.</p>
          </div>

          <div className="h-60 text-xxs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis domain={[0, 100]} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="Success Rate" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Open Rate" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Read/Seen" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* APPROVAL FUNNEL & SLA REPORT */}
        <div className="lg:col-span-6 border bg-white p-4.5 rounded-xl space-y-3 shadow-xxs">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800">Correspondence Funnel Pipeline Conversion</h4>
            <p className="text-[9.5px] text-slate-400 font-semibold">Audit trail breakdown tracking bottleneck leakage from draft composition to client client inbox delivery.</p>
          </div>

          <div className="space-y-2.5 pt-3">
            {funnelSteps.map((step, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xxs font-extrabold">
                  <span className="text-slate-750 font-sans">{step.level}</span>
                  <span className="font-mono text-indigo-700">{step.count} items ({step.rate})</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-md overflow-hidden border">
                  <div 
                    className="bg-indigo-600 h-full rounded-r-md transition-all duration-500"
                    style={{ width: step.rate }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-205 p-3 rounded-xl flex items-start gap-2 text-xxs font-semibold text-amber-900 mt-4 leading-normal">
            <Clock className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            <div>
              <p className="font-black uppercase">SLA Escalation Notification</p>
              <p className="text-amber-805 mt-0.5">8 drafts are currently approaching approval SLA bounds (80% time elapsed thresholds). Confirm dispatch now.</p>
            </div>
          </div>
        </div>

      </div>

      {/* PERFORMANCE TABLES ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* TEAM PERFORMANCE TABLE */}
        <div className="border bg-white p-4 rounded-xl space-y-3.5 text-xxs font-semibold shadow-xxs">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800">Team SLA Turnaround Leadership</h4>
            <p className="text-[9.5px] text-slate-400 font-semibold">Approval speed, drafted counts, and client engagement ratios per lawyer.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y text-slate-650">
              <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-wider text-slate-450">
                <tr>
                  <th className="p-2 pl-3">Drafter Practitioner</th>
                  <th className="p-2 text-center">Drafted</th>
                  <th className="p-2 text-center">SLA speed</th>
                  <th className="p-2 text-center">Sent ok</th>
                  <th className="p-2 text-right pr-3">Interact Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-705">
                {lawyersPerformance.map((l, idx) => (
                  <tr key={idx} className="hover:bg-slate-55/35">
                    <td className="p-2 pl-3 font-semibold text-slate-800">{l.name}</td>
                    <td className="p-2 text-center font-mono">{l.drafted}</td>
                    <td className="p-2 text-center font-semibold text-amber-600">{l.avgTime}</td>
                    <td className="p-2 text-center font-mono font-bold text-emerald-800">{l.sentThisMonth}</td>
                    <td className="p-2 text-right text-indigo-700 pr-3 font-black">{l.responseRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TEMPLATE ANALYTICS */}
        <div className="border bg-white p-4 rounded-xl space-y-3.5 text-xxs font-semibold shadow-xxs">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-800 font-sans">Template Conversion Analytics</h4>
            <p className="text-[9.5px] text-slate-400 font-semibold">Tracking which letter structures require high modifications by professionals.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y text-slate-655">
              <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-455">
                <tr>
                  <th className="p-2 pl-3">Template Model</th>
                  <th className="p-2 text-center">Code</th>
                  <th className="p-2 text-center">Usage Count</th>
                  <th className="p-2 text-center">Edit Duration</th>
                  <th className="p-2 text-right pr-3">Edit Ratio %</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-705">
                {templatesUsage.map((tpl, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-2 pl-3 text-slate-800 font-semibold">{tpl.name}</td>
                    <td className="p-2 text-center font-mono text-slate-450">{tpl.code}</td>
                    <td className="p-2 text-center font-mono font-bold">{tpl.count}</td>
                    <td className="p-2 text-center text-slate-550">{tpl.editTime}</td>
                    <td className="p-2 text-right pr-3 text-amber-600 font-black">{tpl.changeRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
