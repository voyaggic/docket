import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

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

// EXISTING WORKSPACE COMPONENT PANEL IMPORTS
import SetupWizard from './components/SetupWizard';
import ThemeStyles from './components/ThemeStyles';
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

  const handleSetupComplete = async (setupData: {
    settings: Partial<CompanySettings>;
    team: Array<{ fullName: string; email: string; role: any }>;
  }) => {
    setLoading(true);
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
        alert("Setup failed to register firm profile.");
      }
    } catch (err) {
      console.error(err);
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
    <div className="min-h-screen bg-slate-50">
      <SetupWizard userEmail={user?.email || 'associated partner'} onComplete={handleSetupComplete} />
    </div>
  );
};

// ─── CORE MATTERS WORKSPACE DASHBOARD CONSOLE ────────────────────────────────
const WorkspaceDashboard: React.FC = () => {
  const { user: currentUser, company, settings: initialSettings, logout, refreshSession } = useAuth();
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

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
    navigate(`/cases/${caseId}`);
  };

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
    <div className="h-screen overflow-hidden flex text-slate-805" style={{ backgroundColor: theme?.backgroundColor || '#f8fafc', fontFamily: theme?.fontFamily || 'Inter' }} id="app-workspace-layout-canvas">
      
      {/* 1. DYNAMIC COLOR APPLIER OVERRIDES */}
      <ThemeStyles theme={theme} />

      {/* 2. LATERAL PRIMARY ASYNC SIDEBAR */}
      <aside 
        className={`${isSidebarCollapsed ? 'w-[76px]' : 'w-64'} transition-all duration-300 border-r border-slate-200 hidden md:flex flex-col justify-between shrink-0 ease-in-out`} 
        style={{ backgroundColor: theme?.sidebarColor || '#0f172a' }}
      >
        <div className={`flex-grow flex flex-col ${isSidebarCollapsed ? 'p-3' : 'p-5'} overflow-x-hidden overflow-y-auto no-scrollbar`}>
          {/* Logo brand label */}
          <div className="pb-6 border-b flex items-center justify-between" style={{ borderColor: isSidebarLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-sky-400 flex items-center justify-center text-slate-100 font-bold text-base select-none shadow-md shrink-0 text-slate-900">
                <ShieldCheck className="h-5 w-5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="animate-fade-in whitespace-nowrap text-left">
                  <h1 className={`text-xs font-black uppercase tracking-widest ${isSidebarLight ? 'text-slate-805' : 'text-white'}`}>Docket Practice</h1>
                  <span className={`text-[8px] font-mono font-black block tracking-wider leading-none ${isSidebarLight ? 'text-sky-600' : 'text-sky-400'}`}>SECURE SEGMENT</span>
                </div>
              )}
            </div>
            
            {/* Collapse Trigger */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1.5 rounded-lg transition hidden md:block shrink-0 ${isSidebarLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-100 hover:text-white hover:bg-white/10'} ${isSidebarCollapsed ? 'mx-auto' : ''}`}
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
              { key: 'chat', label: getTerm('teamChat', settings), icon: MessagesSquare, badge: 0 },
              { key: 'settings', label: 'Settings', icon: Settings, badge: 0 }
            ]
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
                  <link.icon className={`h-4.5 w-4.5 shrink-0 ${active ? (isSidebarLight ? 'text-sky-600' : 'text-sky-400') : (isSidebarLight ? 'text-slate-500' : 'text-white')}`} />
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
            <img src={currentUser.avatarUrl} className="h-8 w-8 rounded-lg shrink-0 border border-slate-205/10" />
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
          { key: 'reminders', label: getTerm('deadlines', settings), icon: Calendar, badge: deadlines.filter(d => !d.isResolved).length },
          { key: 'settings', label: 'Settings', icon: Settings, badge: 0 }
        ].map(link => {
          const active = activePanel === link.key;
          return (
            <button
              key={link.key}
              onClick={() => handleSidebarNavigate(link.key as any)}
              className="flex-1 flex flex-col items-center justify-center text-center transition py-0.5"
              style={{ color: active ? '#0ea5e9' : '#8e8e93' }}
            >
              <div className="relative">
                <link.icon className={`h-5 w-5 ${active ? 'scale-110' : 'opacity-80'}`} />
              </div>
              <span className="text-[9px] mt-0.5 font-bold truncate max-w-[50px]">{link.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 2.6 MOBILE SIDEBAR DRAWER OVERLAY */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 md:hidden animate-fade-in" onClick={() => setIsMobileSidebarOpen(false)}>
          <div 
            className="w-72 h-full flex flex-col justify-between p-5"
            style={{ backgroundColor: theme?.sidebarColor || '#0f172a' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pb-6 border-b flex items-center justify-between" style={{ borderColor: isSidebarLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="h-9 w-9 rounded-xl bg-sky-400 flex items-center justify-center text-slate-970 text-slate-900 font-bold text-base shadow-md shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h1 className={`text-xs font-black uppercase tracking-widest ${isSidebarLight ? 'text-slate-800' : 'text-white'}`}>Docket</h1>
                  <span className={`text-[8px] font-mono font-black block tracking-wider leading-none ${isSidebarLight ? 'text-sky-600' : 'text-sky-400'}`}>MOBILE SEGMENT</span>
                </div>
              </div>
              <button onClick={() => setIsMobileSidebarOpen(false)} className={`p-1.5 rounded-lg transition ${isSidebarLight ? 'text-slate-500 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}>
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-2 mt-6 flex-grow overflow-y-auto no-scrollbar">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: Home },
                { key: 'clients', label: 'Clients', icon: Users },
                { key: 'cases', label: getTerm('cases', settings), icon: Briefcase },
                { key: 'reminders', label: getTerm('deadlines', settings), icon: Calendar },
                { key: 'settings', label: 'Settings', icon: Settings }
              ].map(link => {
                const active = activePanel === link.key;
                return (
                  <button
                    key={link.key}
                    onClick={() => {
                      handleSidebarNavigate(link.key as any);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full text-xs font-semibold p-3 rounded-xl flex items-center gap-2.5 transition text-left outline-none ${
                      active ? 'bg-slate-800 text-sky-400 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <link.icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="truncate flex-1">{link.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t pt-4 flex items-center justify-between mt-auto" style={{ borderColor: isSidebarLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 overflow-hidden text-left">
                <img src={currentUser.avatarUrl} className="h-8 w-8 rounded-lg shrink-0" />
                <div>
                  <span className={`text-xs font-bold leading-tight block truncate ${isSidebarLight ? 'text-slate-800' : 'text-white'}`}>{currentUser.fullName}</span>
                  <span className={`text-[8px] font-bold block uppercase tracking-wider ${isSidebarLight ? 'text-slate-500' : 'text-slate-400'}`}>{currentUser.role}</span>
                </div>
              </div>
              <button className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white" onClick={handleLogoutTrigger}>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. WORKSPACE WRAPPER */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        
        {/* Compliance Header */}
        <header className="bg-white border-b border-slate-200 p-4 py-3 flex text-xs justify-between items-center pr-6 select-none font-mono shrink-0">
          <div className="flex items-center gap-1.5 text-slate-405 font-bold overflow-hidden text-slate-400">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-md border border-slate-200 bg-slate-50 text-slate-650 hover:text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 mr-1.5 shrink-0 flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px]"
            >
              <Menu className="h-4 w-4" />
            </button>
            <ShieldCheck className="text-emerald-600 h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Tenancy Active Guard:</span>
            <span className="text-slate-900 font-black truncate max-w-[140px] sm:max-w-none">{company?.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold shrink-0">
            <span className="hidden sm:inline">Secure Session (UTC)</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </header>

        {/* Inner Panel scrolling workspace */}
        <div className="flex-grow p-4 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto overflow-y-auto" style={{ fontSize: theme?.fontSize === 'small' ? '0.75rem' : theme?.fontSize === 'large' ? '1rem' : '0.875rem' }}>
          
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
        <Routes>
          {/* Landing / Welcome page public entries */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/registration-pending" element={<RegistrationPendingPage />} />
          <Route path="/invite/:token" element={<PublicRoute><InviteAcceptPage /></PublicRoute>} />
          
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
      </BrowserRouter>
    </AuthProvider>
  );
}
