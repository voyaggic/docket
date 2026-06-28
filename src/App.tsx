import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatGlobalProvider, useChatGlobal } from './context/ChatGlobalContext';
import GlobalFloatingComposer from './components/chat/GlobalFloatingComposer';

// ROUTE GUARDS
import { PublicRoute } from './components/auth/PublicRoute';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingRoute } from './components/auth/OnboardingRoute';

// SUPERADMIN MODULES
import { SuperadminRoute } from './components/superadmin/SuperadminRoute';
import { SuperadminShell } from './components/superadmin/SuperadminShell';
import { SuperadminLogin } from './pages/superadmin/SuperadminLogin';
import { SuperadminDashboard } from './pages/superadmin/SuperadminDashboard';
import { SuperadminAuditLog } from './pages/superadmin/SuperadminAuditLog';
import { SuperadminRegistrations } from './pages/superadmin/SuperadminRegistrations';

// PAGES
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RegistrationPendingPage } from './pages/RegistrationPendingPage';
import { InviteAcceptPage } from './pages/InviteAcceptPage';
import { AccessUpdateAcceptPage } from './pages/AccessUpdateAcceptPage';

// EXISTING WORKSPACE COMPONENT PANEL IMPORTS
import SetupWizard from './components/SetupWizard';
import ThemeStyles from './components/ThemeStyles';
import ThemeToggle from './components/ThemeToggle';
import DashboardView from './components/DashboardView';
import CasesView from './components/CasesView';
import RemindersView from './components/RemindersView';
import UpdatesView from './components/UpdatesView';
import DocumentsView from './components/DocumentsView';
import TeamChatView from './components/TeamChatView';
import SettingsView from './components/SettingsView';
import ClientsView from './components/ClientsView';

import { 
  Briefcase, Calendar, MessageSquare, FileText, Settings, Users, LogOut, Loader2, Home, MessagesSquare, ShieldCheck,
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { CompanySettings, CompanyTheme, Case, Deadline, ClientUpdate, GeneratedDocument, Client, DocumentTemplate } from './types';
import { getTerm } from './utils/terminology';
import './index.css';

// ─── ONBOARDING FLOW SETUP WIZARD WRAPPER ────────────────────────────────────
const OnboardingWrapper: React.FC = () => {
  const { user, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleSetupComplete = async (setupData: {
    settings: Partial<CompanySettings>;
    team: Array<{ fullName: string; email: string; role: any }>;
  }) => {
    setLoading(true);
    setSetupError(null);
    try {
      const response = await fetch('/api/firm/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(setupData)
      });
      if (response.ok) {
        await refreshSession();
        // Shift cleanly into dashboard console
        navigate('/dashboard');
      } else {
        setSetupError("Setup failed to register firm profile.");
      }
    } catch (err) {
      console.error(err);
      setSetupError("Network or server communication failure.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
        <p className="text-xs text-slate-400 font-mono">Provisioning legal secure cloud workspace tenant...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {setupError && (
        <div className="p-3 max-w-md mx-auto bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-2 mb-4 animate-pulse">
          <span>{setupError}</span>
        </div>
      )}
      <SetupWizard userEmail={user?.email || 'associated partner'} onComplete={handleSetupComplete} />
    </div>
  );
};

// ─── CORE MATTERS WORKSPACE DASHBOARD CONSOLE ────────────────────────────────
const WorkspaceDashboard: React.FC = () => {
  const { user: currentUser, company, settings: initialSettings, logout, refreshSession } = useAuth();
  const { totalUnreads } = useChatGlobal();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<'dashboard' | 'clients' | 'cases' | 'reminders' | 'updates' | 'documents' | 'chat' | 'settings'>('dashboard');
  
  // Workspace specific collections loaded on tenancy validation
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [theme, setTheme] = useState<CompanyTheme | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [updates, setUpdates] = useState<ClientUpdate[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [roster, setRoster] = useState<any[]>([]);

  const [viewingCaseId, setViewingCaseId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isSidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState<boolean>(false);

  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('docket-color-mode');
      return stored === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleColorMode = () => {
    setColorMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('docket-color-mode', next);
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const location = useLocation();
  const { caseId: urlCaseId } = useParams<{ caseId: string }>();

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/clients')) setActivePanel('clients');
    else if (path.includes('/cases')) setActivePanel('cases');
    else if (path.includes('/reminders')) setActivePanel('reminders');
    else if (path.includes('/updates')) setActivePanel('updates');
    else if (path.includes('/documents')) setActivePanel('documents');
    else if (path.includes('/chat')) setActivePanel('chat');
    else if (path.includes('/settings')) setActivePanel('settings');
    else setActivePanel('dashboard');
  }, [location.pathname]);

  useEffect(() => {
    if (urlCaseId && cases.length > 0) {
      setViewingCaseId(urlCaseId);
      setActivePanel('cases');
    }
  }, [urlCaseId, cases]);

  useEffect(() => {
    try {
      localStorage.setItem('isSidebarCollapsed', String(isSidebarCollapsed));
    } catch (err) {
      console.error(err);
    }
  }, [isSidebarCollapsed]);

  const syncWorkspaceData = async () => {
    if (!company) return;
    try {
      const cId = company.id;
      // Concurrent fetch remaining isolated lists for this secure company tenant
      const [casR, cliR, dlnR, updR, tplR, docR, usdR, meR] = await Promise.all([
        fetch(`/api/firm/${cId}/cases`),
        fetch(`/api/firm/${cId}/clients`),
        fetch(`/api/firm/${cId}/deadlines`),
        fetch(`/api/firm/${cId}/updates`),
        fetch(`/api/firm/${cId}/templates`),
        fetch(`/api/firm/${cId}/documents`),
        fetch(`/api/firm/${cId}/users`),
        fetch('/api/auth/me')
      ]);

      if (casR.ok) setCases(await casR.json());
      if (cliR.ok) setClients(await cliR.json());
      if (dlnR.ok) setDeadlines(await dlnR.json());
      if (updR.ok) setUpdates(await updR.json());
      if (tplR.ok) setTemplates(await tplR.json());
      if (docR.ok) setDocuments(await docR.json());
      if (usdR.ok) setRoster(await usdR.json());
      
      if (meR.ok) {
        const fresh = await meR.json();
        setSettings(fresh.settings || {});
        setTheme(fresh.settings?.theme || null);
      }
    } catch (err) {
      console.error("Workspace synchronization failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncWorkspaceData();
  }, [company]);

  const handleDispatchUpdate = async (updateId: string, message: string, channels: any) => {
    if (!company) return;
    try {
      const res = await fetch(`/api/firm/${company.id}/updates/${updateId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, channels })
      });
      if (res.ok) {
        await syncWorkspaceData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAllSettings = async (updatedSettings: Partial<CompanySettings>) => {
    if (!company) return;
    try {
      const res = await fetch(`/api/firm/${company.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        await refreshSession();
        await syncWorkspaceData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSidebarNavigate = (panel: typeof activePanel) => {
    setActivePanel(panel);
    setViewingCaseId(null);
    const pathMap: Record<string, string> = {
      dashboard: '/dashboard',
      clients: '/clients',
      cases: '/cases',
      reminders: '/reminders',
      updates: '/updates',
      documents: '/documents',
      chat: '/chat',
      settings: '/settings'
    };
    navigate(pathMap[panel] || '/dashboard');
  };

  const handleOpenSpecificCase = (caseId: string) => {
    setViewingCaseId(caseId);
    setActivePanel('cases');
    navigate('/cases');
  };

  // Page access: SUPERADMIN + firm ADMIN see everything. Restricted members see only
  // their assigned pages, plus Dashboard which is always available as a home base.
  const ALWAYS_ALLOWED_PAGES = ['dashboard'];
  const hasFullAccess = currentUser?.isSuperAdmin || currentUser?.role === 'ADMIN';
  const isPageAllowed = (pageKey: string): boolean => {
    if (hasFullAccess) return true;
    if (ALWAYS_ALLOWED_PAGES.includes(pageKey)) return true;
    return (currentUser?.allowedPages || []).includes(pageKey);
  };

  // Route guard: if the current page isn't allowed for this user, bounce them
  // to the first page they DO have access to (never leave them on a blocked screen).
  useEffect(() => {
    if (!currentUser || loading) return;
    if (!isPageAllowed(activePanel)) {
      const fallback = (currentUser.allowedPages || []).find(p => p !== 'settings') || 'dashboard';
      setActivePanel(fallback as any);
      navigate(`/${fallback}`);
    }
  }, [activePanel, currentUser, loading]);

  const isSidebarLight = (() => {
    const hex = theme?.sidebarColor || '#0f172a';
    let color = hex.replace('#', '');
    if (color.length === 3) {
      color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
    }
    if (color.length !== 6) return false;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150;
  })();

  const handleLogoutTrigger = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-slate-505 text-slate-400" />
        <p className="text-xs text-slate-400 font-mono">Decrypting company practice segment ledger boards...</p>
      </div>
    );
  }

  // Fallback check
  if (!currentUser) return null;

  return (
    <div className="h-screen overflow-hidden flex text-slate-805" style={{ backgroundColor: 'var(--color-bg)', fontFamily: theme?.fontFamily || 'Inter' }} id="app-workspace-layout-canvas">
      
      {/* 1. DYNAMIC COLOR APPLIER OVERRIDES */}
      <ThemeStyles theme={theme} colorMode={colorMode} />

      {/* 2. LATERAL PRIMARY ASYNC SIDEBAR */}
      <aside 
        className={`${isSidebarCollapsed ? 'w-[76px]' : 'w-64'} transition-all duration-300 border-r border-slate-200 hidden md:flex flex-col justify-between shrink-0 ease-in-out`} 
        style={{ backgroundColor: theme?.sidebarColor || '#0f172a' }}
      >
        <div className={`flex-grow flex flex-col ${isSidebarCollapsed ? 'p-3' : 'p-5'} overflow-y-auto no-scrollbar`}>
          <div className={`pb-6 border-b flex ${isSidebarCollapsed ? 'flex-col items-center gap-3' : 'items-center justify-between'}`} style={{ borderColor: isSidebarLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}>
            <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-2'}`}>
              <div className="h-8 w-8 rounded-lg bg-sky-400 flex items-center justify-center text-slate-900 shrink-0 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </div>
              {!isSidebarCollapsed && (
                <span className="text-xs font-bold text-sky-400 tracking-wide whitespace-nowrap animate-fade-in">Docket</span>
              )}
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1.5 rounded-lg transition-all duration-200 hidden md:block shrink-0 hover:scale-110 ${isSidebarLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Side Panel Tabs */}
          <nav className="space-y-2 mt-6 flex-1">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: Home, badge: 0 },
              { key: 'clients', label: 'Clients', icon: Users, badge: clients.length },
              { key: 'cases', label: getTerm('cases', settings), icon: Briefcase, badge: cases.filter(c => c.status === 'ACTIVE').length },
              { key: 'reminders', label: getTerm('deadlines', settings), icon: Calendar, badge: deadlines.filter(d => !d.isResolved).length },
              { key: 'updates', label: getTerm('clientUpdates', settings), icon: MessageSquare, badge: updates.filter(u => u.status === 'DRAFT').length },
              { key: 'documents', label: getTerm('documents', settings), icon: FileText, badge: 0 },
              { key: 'chat', label: getTerm('teamChat', settings), icon: MessagesSquare, badge: totalUnreads },
              { key: 'settings', label: 'Settings', icon: Settings, badge: 0 }
            ]
            .filter(link => isPageAllowed(link.key))
            .map(link => {
              const active = activePanel === link.key;
              return (
                <button
                  key={link.key}
                  onClick={() => handleSidebarNavigate(link.key as any)}
                  title={isSidebarCollapsed ? link.label : undefined}
                  className={`relative w-full text-xs font-semibold p-3 rounded-xl flex items-center transition text-left outline-none ${
                    isSidebarCollapsed ? 'justify-center' : 'gap-2.5'
                  } ${
                    active 
                      ? isSidebarLight 
                        ? 'bg-slate-100 text-sky-600 border-l-2 border-sky-600 font-bold' 
                        : 'bg-slate-800 text-sky-400 border-l-2 border-sky-400 font-bold' 
                      : isSidebarLight 
                        ? 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="relative shrink-0">
                    <link.icon className={`h-4.5 w-4.5 ${active ? (isSidebarLight ? 'text-sky-600' : 'text-sky-400') : (isSidebarLight ? 'text-slate-500' : 'text-white')}`} />
                    {isSidebarCollapsed && link.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 z-10 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none border-2 border-slate-900">
                        {link.badge > 9 ? '9+' : link.badge}
                      </span>
                    )}
                  </span>
                  {!isSidebarCollapsed && (
                    <span className="truncate flex-1">{link.label}</span>
                  )}
                  {!isSidebarCollapsed && link.badge > 0 && (
                    <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none shrink-0">
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Real User Profile Footer */}
        <div className={`border-t flex ${isSidebarCollapsed ? 'p-3 flex-col gap-3 items-center justify-center' : 'p-5 items-center justify-between'}`} style={{ borderColor: isSidebarLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 overflow-hidden">
            <img src={currentUser.avatarUrl} className="h-8 w-8 rounded-full shrink-0 object-cover object-center border border-slate-205/10 bg-slate-100" style={{ width: '32px', height: '32px', minWidth: '32px' }} />
            {!isSidebarCollapsed && (
              <div className="space-y-0.5 max-w-[130px] text-left">
                <span className={`text-xs font-bold block truncate ${isSidebarLight ? 'text-slate-805' : 'text-white'}`}>{currentUser.fullName}</span>
                <span className={`text-[8.5px] font-black block tracking-wider uppercase truncate ${isSidebarLight ? 'text-slate-500' : 'text-slate-400'}`}>{currentUser.role}</span>
              </div>
            )}
          </div>
          <button 
            title="Sign out of Docket Session"
            className={`p-1.5 rounded-lg border hover:bg-white/10 transition shrink-0 cursor-pointer ${isSidebarLight ? 'border-slate-350 text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'border-white/10 text-slate-400 hover:text-white'} ${isSidebarCollapsed ? 'w-full flex justify-center' : ''}`}
            onClick={handleLogoutTrigger}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>

      {/* 2.5 MOBILE BOTTOM TAB BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 pb-5 px-1.5 flex items-center justify-around shadow-lg">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: Home, badge: 0 },
          { key: 'clients', label: 'Clients', icon: Users, badge: clients.length },
          { key: 'cases', label: getTerm('cases', settings), icon: Briefcase, badge: cases.filter(c => c.status === 'ACTIVE').length },
          { key: 'reminders', label: getTerm('deadlines', settings), icon: Calendar, badge: deadlines.filter(d => !d.isResolved).length }
        ].filter(link => isPageAllowed(link.key)).map(link => {
          const active = activePanel === link.key;
          return (
            <button
              key={link.key}
              onClick={() => handleSidebarNavigate(link.key as any)}
              className="flex-1 flex flex-col items-center justify-center text-center py-0.5 transition-transform duration-200 active:scale-90"
              style={{ color: active ? '#0ea5e9' : '#8e8e93' }}
            >
              <div className="relative">
                <link.icon className={`h-5 w-5 transition-transform duration-200 ${active ? 'scale-110' : 'opacity-80'}`} />
                {link.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none border-2 border-white">
                    {link.badge > 9 ? '9+' : link.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] mt-0.5 font-bold truncate max-w-[50px]">{link.label}</span>
            </button>
          );
        })}
        {[
          { key: 'updates', icon: MessageSquare },
          { key: 'documents', icon: FileText },
          { key: 'chat', icon: MessagesSquare },
          { key: 'settings', icon: Settings }
        ].filter(link => isPageAllowed(link.key)).length > 0 && (
          <button
            onClick={() => setIsMoreSheetOpen(true)}
            className="flex-1 flex flex-col items-center justify-center text-center py-0.5 transition-transform duration-200 active:scale-90"
            style={{ color: ['updates', 'documents', 'chat', 'settings'].includes(activePanel) ? '#0ea5e9' : '#8e8e93' }}
          >
            <div className="relative">
              <Menu className={`h-5 w-5 transition-transform duration-200 ${['updates', 'documents', 'chat', 'settings'].includes(activePanel) ? 'scale-110' : 'opacity-80'}`} />
              {(updates.filter(u => u.status === 'DRAFT').length + totalUnreads) > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none border-3 border-white">
                  {(updates.filter(u => u.status === 'DRAFT').length + totalUnreads) > 9 ? '9+' : (updates.filter(u => u.status === 'DRAFT').length + totalUnreads)}
                </span>
              )}
            </div>
            <span className="text-[9px] mt-0.5 font-bold truncate max-w-[50px]">More</span>
          </button>
        )}
      </nav>

      {/* FLOATING VERTICAL SHORTCUTS — MOBILE ONLY */}
      <div className="md:hidden fixed right-3 bottom-[84px] z-50 flex flex-col gap-2 select-none pointer-events-none">
        {[
          { key: 'updates', icon: MessageSquare, badge: updates.filter(u => u.status === 'DRAFT').length },
          { key: 'documents', icon: FileText, badge: 0 },
          { key: 'chat', icon: MessagesSquare, badge: totalUnreads },
          { key: 'settings', icon: Settings, badge: 0 }
        ].filter(link => isPageAllowed(link.key)).map(link => {
          const active = activePanel === link.key;
          return (
            <button
              key={link.key}
              onClick={() => handleSidebarNavigate(link.key as any)}
              className={`pointer-events-auto h-9 w-9 rounded-full flex items-center justify-center shadow-lg border transition-all duration-200 active:scale-90 relative ${
                active 
                  ? 'bg-sky-500 text-white border-sky-400' 
                  : 'bg-white/95 backdrop-blur-sm text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none border border-white">
                  {link.badge > 9 ? '9+' : link.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MOBILE "MORE" BOTTOM SHEET — overflow pages live here */}
      {isMoreSheetOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 animate-fade-in" onClick={() => setIsMoreSheetOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 pb-8 animate-slide-up-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">More</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'updates', label: getTerm('clientUpdates', settings), icon: MessageSquare, badge: updates.filter(u => u.status === 'DRAFT').length },
                { key: 'documents', label: getTerm('documents', settings), icon: FileText, badge: 0 },
                { key: 'chat', label: getTerm('teamChat', settings), icon: MessagesSquare, badge: totalUnreads },
                { key: 'settings', label: 'Settings', icon: Settings, badge: 0 }
              ].filter(link => isPageAllowed(link.key)).map(link => {
                const active = activePanel === link.key;
                return (
                  <button
                    key={link.key}
                    onClick={() => { handleSidebarNavigate(link.key as any); setIsMoreSheetOpen(false); }}
                    className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-transform duration-200 active:scale-95 ${active ? 'border-sky-300 bg-sky-50 text-sky-600' : 'border-slate-200 text-slate-600'}`}
                  >
                    <link.icon className="h-5 w-5" />
                    <span className="text-xs font-bold">{link.label}</span>
                    {link.badge > 0 && (
                      <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                        {link.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. WORKSPACE WRAPPER */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        
        {/* Compliance Header */}
        <header className="bg-white border-b border-slate-200 p-4 py-3 flex text-xs justify-between items-center pr-6 select-none font-mono shrink-0">
          <div className="flex items-center gap-1.5 text-slate-405 font-bold overflow-hidden text-slate-400">
            <ShieldCheck className="text-emerald-600 h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Tenancy Active Guard:</span>
            <span className="text-slate-900 font-black truncate max-w-[140px] sm:max-w-none">{company?.name}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-semibold shrink-0">
            <ThemeToggle colorMode={colorMode} onToggle={toggleColorMode} size="sm" />
            <span className="hidden sm:inline">Secure Session (UTC)</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </header>

        {/* Inner Panel scrolling workspace */}
        <div 
          key={activePanel} 
          className={`page-transition flex-grow ${
            activePanel === 'chat'
              ? 'h-full overflow-hidden p-0 max-w-full'
              : activePanel === 'updates'
                ? 'pb-24 md:pb-8 overflow-y-auto p-1.5 md:p-8 max-w-full'
                : 'pb-24 md:pb-8 overflow-y-auto p-3 md:p-8 max-w-7xl'
          } w-full mx-auto`}
          style={{ fontSize: theme?.fontSize === 'small' ? '0.75rem' : theme?.fontSize === 'large' ? '1rem' : '0.875rem' }}
        >
          
          {activePanel === 'clients' && (
            <ClientsView
              companyId={company?.id}
              clients={clients}
              cases={cases}
              onRefresh={syncWorkspaceData}
            />
          )}

          {activePanel === 'dashboard' && (
            <DashboardView 
              userName={currentUser.fullName}
              companyName={company?.name}
              companyId={company?.id}
              settings={settings}
              roster={roster}
              clients={clients}
              cases={cases}
              deadlines={deadlines}
              updates={updates}
              onOpenCase={handleOpenSpecificCase}
              onNavigateTo={handleSidebarNavigate}
              onSendUpdate={handleDispatchUpdate}
              onRefresh={syncWorkspaceData}
            />
          )}

          {activePanel === 'cases' && (
            <CasesView 
              companyId={company?.id}
              clients={clients}
              cases={cases}
              lawyers={roster.map(u => ({ id: u.id, fullName: u.fullName }))}
              onOpenCase={handleOpenSpecificCase}
              onRefresh={syncWorkspaceData}
              viewingCaseId={viewingCaseId}
              onCloseDetail={() => setViewingCaseId(null)}
              settings={settings || {}}
              documents={documents}
            />
          )}

          {activePanel === 'reminders' && (
            <RemindersView 
              companyId={company?.id}
              deadlines={deadlines}
              cases={cases}
              clients={clients}
              roster={roster}
              onRefresh={syncWorkspaceData}
              settings={settings || {}}
              onOpenCase={handleOpenSpecificCase}
            />
          )}

          {activePanel === 'updates' && (
            <UpdatesView 
              companyId={company?.id}
              updates={updates}
              cases={cases}
              onRefresh={syncWorkspaceData}
              onSendUpdate={handleDispatchUpdate}
            />
          )}

          {activePanel === 'documents' && (
            <DocumentsView 
              companyId={company?.id}
              templates={templates}
              documents={documents}
              cases={cases}
              onRefresh={syncWorkspaceData}
            />
          )}

          {activePanel === 'chat' && (
            <TeamChatView 
              companyId={company?.id}
              cases={cases}
              clients={clients}
              deadlines={deadlines}
              documents={documents}
              users={roster}
              currentUser={{
                id: currentUser.id,
                fullName: currentUser.fullName,
                email: currentUser.email,
                role: currentUser.role,
                avatarUrl: currentUser.avatarUrl
              }}
              onRefresh={syncWorkspaceData}
              settings={settings || {}}
            />
          )}

          {activePanel === 'settings' && (
            <SettingsView 
              companyId={company?.id}
              settings={settings || {} as any}
              users={roster}
              onRefresh={syncWorkspaceData}
              onThemeUpdate={(t) => setTheme(t)}
              onSaveAllSettings={handleSaveAllSettings}
              colorMode={colorMode}
              onToggleColorMode={toggleColorMode}
            />
          )}

        </div>
      </main>
    </div>
  );
};

// ─── MAIN REACTOR ROUTER EXPORT ──────────────────────────────────────────────
export default function App() {
  // @ts-ignore
  const SA_PATH = import.meta.env?.VITE_SUPERADMIN_PATH || 'system-access';

  return (
    <AuthProvider>
      <BrowserRouter>
        <ChatGlobalProvider>
          <Routes>
          {/* Landing / Welcome page public entries */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/registration-pending" element={<RegistrationPendingPage />} />
          <Route path="/invite/:token" element={<PublicRoute><InviteAcceptPage /></PublicRoute>} />
          <Route path="/access-update/:token" element={<AccessUpdateAcceptPage />} />
          
          {/* Onboarding multi-step setup wizards */}
          <Route path="/onboarding" element={
            <OnboardingRoute>
              <OnboardingWrapper />
            </OnboardingRoute>
          } />
          
          {/* Standard secure practice modules */}
          <Route path="/dashboard" element={
            <ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>
          } />
          <Route path="/clients" element={
            <ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>
          } />
          <Route path="/cases" element={
            <ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>
          } />
          <Route path="/cases/:caseId" element={
            <ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>
          } />
          <Route path="/reminders" element={
            <ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>
          } />
          <Route path="/updates" element={
            <ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>
          } />
          <Route path="/documents" element={
            <ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>
          } />

          {/* Superadmin supervisors control segment */}
          <Route path={`/${SA_PATH}/login`} element={<SuperadminLogin />} />
          <Route path={`/${SA_PATH}/dashboard`} element={
            <SuperadminRoute>
              <SuperadminShell>
                <SuperadminDashboard />
              </SuperadminShell>
            </SuperadminRoute>
          } />
          <Route path={`/${SA_PATH}/registrations`} element={
            <SuperadminRoute>
              <SuperadminShell>
                <SuperadminRegistrations />
              </SuperadminShell>
            </SuperadminRoute>
          } />
          <Route path={`/${SA_PATH}/audit-log`} element={
            <SuperadminRoute>
              <SuperadminShell>
                <SuperadminAuditLog />
              </SuperadminShell>
            </SuperadminRoute>
          } />

          {/* Fallback route redirection */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <GlobalFloatingComposer />
        </ChatGlobalProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
