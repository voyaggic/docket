import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scale, ArrowRight, CornerDownRight, AlertCircle, Sparkles, ChevronDown } from 'lucide-react';
import { countriesList } from '../utils/countries';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [firmName, setFirmName] = useState('');
  const [registrantName, setRegistrantName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('United States');
  const [firmSize, setFirmSize] = useState('1-5');
  const [referralSource, setReferralSource] = useState('Search Engine');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Searchable Country Dropdown states
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('United States');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter countries list based on search term
  const filteredCountries = countriesList.filter(c =>
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search term back to chosen country
        setSearchTerm(country);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [country]);

  // Sync SearchTerm with country if initialized or selected
  useEffect(() => {
    setSearchTerm(country);
  }, [country]);

  const handleSelectCountry = (chosenCountry: string) => {
    setCountry(chosenCountry);
    setSearchTerm(chosenCountry);
    setIsOpen(false);
  };

  const handleRegisterInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firmName.trim() || !registrantName.trim() || !email.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/registration/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmName,
          registrantName,
          email,
          country,
          firmSize,
          referralSource
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed. Please audit inputs.');
      }

      // Navigate to pending setup page passing state info
      navigate('/registration-pending', {
        state: {
          email,
          firmName,
          status: data.status,
          message: data.message
        }
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to submit registration request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="register-page-container" className="min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-[540px] bg-white border border-slate-200/80 rounded-2xl p-8 md:p-10 space-y-6 shadow-xs">
        
        {/* LOGO AREA */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900 text-white p-2.5 rounded-xl">
            <Scale className="h-5 w-5 text-sky-400" />
          </div>
          <h2 className="mt-3.5 text-base font-black text-slate-900 uppercase tracking-widest">
            Docket
          </h2>
          <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
            Register your practice firm
          </p>
        </div>

        {error && (
          <div id="register-error-banner" className="bg-red-50 border-2 border-red-200 p-3.5 rounded-xl flex gap-2 text-red-700 text-xs font-semibold leading-relaxed">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-650" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegisterInput} className="space-y-4">
          
          {/* FIRM NAME */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-700 block">
              Firm or Chambers Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              id="register-firm-name"
              placeholder="e.g. Chambers & Partners"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-950 outline-none focus:bg-white focus:border-slate-800 transition-all min-h-[44px]"
            />
          </div>

          {/* REGISTRANT FULL NAME */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-700 block">
              Your Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              id="register-registrant-name"
              placeholder="e.g. Sarah Jenkins, Esq."
              value={registrantName}
              onChange={(e) => setRegistrantName(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-950 outline-none focus:bg-white focus:border-slate-800 transition-all min-h-[44px]"
            />
          </div>

          {/* EMAIL ADDRESS */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-700 block">
              Primary Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              id="register-email"
              placeholder="e.g. sarah.jenkins@jenkinslaw.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-950 outline-none focus:bg-white focus:border-slate-800 transition-all min-h-[44px]"
            />
          </div>

          {/* JURISDICTION / COUNTRY */}
          <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-700 block">
              Country / Jurisdiction <span className="text-red-500">*</span>
            </label>
            <div className="relative select-none">
              <input
                type="text"
                id="register-country-input"
                placeholder="Search and select country..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => {
                  setIsOpen(true);
                }}
                className="w-full text-xs p-3 pr-10 bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-950 outline-none focus:bg-white focus:border-slate-800 transition-all min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 p-1 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Dropdown Options list */}
            {isOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border-2 border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 animate-fade-in">
                {filteredCountries.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 font-bold">No countries found</div>
                ) : (
                  filteredCountries.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`w-full text-left text-xs p-2.5 font-bold hover:bg-slate-55 hover:bg-slate-100 transition-colors ${
                        country === c ? 'bg-sky-50 text-sky-600' : 'text-slate-900'
                      }`}
                    >
                      {c}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* FIRM SIZE RADIO BUTTONS */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-700 block">
              Firm Size / Partners <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {['1-5', '6-20', '21-50', '50+'].map((size) => (
                <label 
                  key={size}
                  className={`border rounded-xl p-3 flex items-center gap-2.5 cursor-pointer transition-all ${
                    firmSize === size 
                      ? 'border-slate-800 bg-slate-50 text-slate-950 font-extrabold shadow-2xs' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-600 font-bold'
                  }`}
                >
                  <input
                    type="radio"
                    name="firmSize"
                    value={size}
                    checked={firmSize === size}
                    onChange={() => setFirmSize(size)}
                    className="sr-only" // Hidden natively but focused correctly
                  />
                  {/* Small, tiny custom circle checkbox indicator */}
                  <div className={`h-2.5 w-2.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    firmSize === size ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
                  }`}>
                    {firmSize === size && (
                      <span className="h-1 w-1 rounded-full bg-white block" />
                    )}
                  </div>
                  <span className="text-xs">{size} members</span>
                </label>
              ))}
            </div>
          </div>

          {/* REFERRAL SOURCE */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-700 block">
              How did you hear about us?
            </label>
            <select
              value={referralSource}
              id="register-referrals"
              onChange={(e) => setReferralSource(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-950 outline-none focus:bg-white focus:border-slate-800 transition-all min-h-[44px]"
            >
              <option value="Search Engine">Search Engine</option>
              <option value="Recommended by Peer">Recommended by Peer</option>
              <option value="Legal Tech Review">Legal Tech Review</option>
              <option value="Conference / Event">Conference / Event</option>
              <option value="Social Media">Social Media</option>
            </select>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            id="register-submit-btn"
            className="w-full min-h-[44px] bg-slate-950 hover:bg-black text-white text-[11px] uppercase tracking-wider font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-transparent hover:border-slate-800 transition-all shadow-xs disabled:opacity-55 active:scale-[0.985]"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                Create your firm account <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-slate-150 pt-4 text-center">
          <p className="text-xs font-semibold text-slate-600">
            Already have an account?{' '}
            <Link 
              to="/login" 
              id="register-sign-in-link"
              className="text-sky-500 hover:text-sky-600 font-extrabold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};
export default RegisterPage;
