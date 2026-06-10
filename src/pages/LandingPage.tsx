import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div 
      id="landing-page-root" 
      className="min-h-screen bg-[#070c19] flex items-center justify-center p-4 md:p-8 font-sans text-slate-200 selection:bg-sky-400 selection:text-slate-950"
    >
      {/* Centered Broad Card with Min and Max constraints */}
      <div 
        id="landing-broad-center-card" 
        className="w-full max-w-[680px] min-w-[280px] bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 md:p-14 shadow-2xl flex flex-col items-center text-center space-y-8 backdrop-blur-md"
      >
        {/* Modern Centered Logo (Strictly no SaaS text) */}
        <div id="landing-logo" className="flex flex-col items-center gap-3">
          <div className="bg-sky-400 p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/10">
            <Scale className="h-5 w-5 text-slate-950" />
          </div>
          <span className="font-black text-sm uppercase tracking-widest text-white">Docket</span>
        </div>

        {/* Hero Copy (The middle text) */}
        <div className="space-y-4 max-w-lg">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none uppercase">
            Run your practice. <br />
            <span className="font-semibold text-sky-450 text-sky-400 normal-case italic block pt-2 font-serif text-2xl md:text-3xl">
              Without the complexity.
            </span>
          </h1>
          
          <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">
            Docket provides a beautiful, lightweight digital workspace to coordinate firm cases, critical court deadlines, and automated status channels.
          </p>
        </div>

        {/* Dynamic Light Blue Action CTA Buttons */}
        <div className="w-full pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm">
          <button
            onClick={() => navigate('/register')}
            id="center-btn-start"
            className="w-full sm:w-auto flex-1 bg-sky-400 hover:bg-sky-305 hover:bg-sky-300 text-slate-950 text-[10px] uppercase tracking-widest font-black py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md select-none active:scale-95 border-b-2 border-sky-500"
          >
            Get started free <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => navigate('/login')}
            id="center-btn-signin"
            className="w-full sm:w-auto flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-sky-400 text-[10px] uppercase tracking-widest font-black py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-95"
          >
            Sign into dashboard
          </button>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;
