import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ArrowRight,CalendarClock, FolderKanban, MessagesSquare} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      id="landing-page-root"
      className="min-h-screen bg-[#070c19] relative overflow-hidden flex flex-col font-sans text-slate-200 selection:bg-sky-400 selection:text-slate-950"
    >
      {/* Ambient glow backdrop — premium feel, purely decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-sky-500/10 blur-[140px] animate-glow-pulse"
      />

      {/* Minimal top bar */}
      <header className="relative z-10 w-full flex items-center justify-between px-6 md:px-10 py-6 animate-fade-in-1">
        <div className="flex items-center gap-2">
          <div className="bg-sky-400 p-1.5 rounded-lg flex items-center justify-center">
            <Scale className="h-3.5 w-3.5 text-slate-950" />
          </div>
          <span className="font-black text-xs uppercase tracking-widest text-white">Docket</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-[10px] uppercase tracking-widest font-bold text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 md:px-8 py-16">
        <div className="max-w-2xl space-y-6 animate-fade-in-2">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] uppercase">
            Run your practice.
            <span className="block font-serif italic font-medium normal-case text-sky-400 text-2xl md:text-3xl pt-3">
              Without the complexity.
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed max-w-lg mx-auto">
            A lightweight workspace built for firms — track every case, never miss a court deadline, and keep clients informed automatically.
          </p>

          <div className="pt-4 flex flex-col items-center gap-3">
            <button
              onClick={() => navigate('/register')}
              className="bg-sky-400 hover:bg-sky-300 text-slate-950 text-[11px] uppercase tracking-widest font-black py-4 px-10 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-500/20 active:scale-95 border-b-2 border-sky-500 hover:-translate-y-0.5"
            >
              Get started free <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] text-slate-500 font-medium">No credit card required</span>
          </div>
        </div>
      </main>

      {/* Minimal pain-point strip */}
      <section className="relative z-10 border-t border-slate-800/60 px-6 md:px-10 py-10 animate-fade-in-3">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          {[
            {
              icon: CalendarClock,
              title: 'Never miss a deadline',
              desc: 'Court dates and filings tracked automatically, with reminders that reach you before they matter.',
            },
            {
              icon: FolderKanban,
              title: 'One place for every case',
              desc: 'Stop juggling spreadsheets and paper files — matters, documents, and clients live together.',
            },
            {
              icon: MessagesSquare,
              title: 'Clients stay informed',
              desc: 'Automated status updates mean fewer calls asking "any news?" and more time to actually work.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center gap-3 group cursor-default"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center transition-all duration-300 group-hover:border-sky-400/50 group-hover:-translate-y-1">
                <item.icon className="h-4 w-4 text-sky-400" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wide">{item.title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-[220px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Slim footer */}
      <footer className="relative z-10 text-center py-6 text-[10px] text-slate-600 font-medium border-t border-slate-800/40">
        © {new Date().getFullYear()} Docket. Built for the modern practice.
      </footer>
    </div>
  );
};

export default LandingPage;
