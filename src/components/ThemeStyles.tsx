import React, { useEffect } from 'react';
import { CompanyTheme } from '../types';

function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(15,23,42,${alpha})`;
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  if (color.length !== 6) return `rgba(15,23,42,${alpha})`;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ThemeStyles({ theme, colorMode }: { theme: CompanyTheme; colorMode: 'light' | 'dark' }) {
  const isBgLight = colorMode === 'light';

  // Brand accent colors are NEVER touched by dark mode — only neutral surfaces switch.
  const activePrimary = theme.primaryColor;
  const activeSecondary = theme.secondaryColor;
  const activeButton = theme.buttonColor;
  const activeText = isBgLight ? (theme.textColor || '#1d1d1f') : '#eef2f6';

  // The ONE dark surface color — the exact navy used on the sidebar, applied
  // uniformly everywhere in dark mode. No separate blacks or grays anywhere.
  const darkSurface = theme.sidebarColor || '#0f172a';
  const activeBg = isBgLight ? (theme.backgroundColor || '#f5f5f7') : darkSurface;
  const activeSidebar = theme.sidebarColor || '#0f172a';

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', activePrimary);
    root.style.setProperty('--color-secondary', activeSecondary);
    root.style.setProperty('--color-bg', activeBg);
    root.style.setProperty('--color-text', activeText);
    root.style.setProperty('--color-button', activeButton);
    root.style.setProperty('--color-surface-dark', darkSurface);

    const radiusMap = { sharp: '0px', medium: '8px', round: '20px' };
    root.style.setProperty('--border-radius-custom', radiusMap[theme.borderRadius] || '8px');

    let fontValue = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", "Helvetica Neue", Helvetica, "Segoe UI", sans-serif';
    if (theme.fontFamily === 'DM Sans') fontValue = '"DM Sans", -apple-system, sans-serif';
    else if (theme.fontFamily === 'Lato') fontValue = '"Lato", -apple-system, sans-serif';
    else if (theme.fontFamily === 'Poppins') fontValue = '"Poppins", -apple-system, sans-serif';
    else if (theme.fontFamily === 'Roboto') fontValue = '"Roboto", -apple-system, sans-serif';
    else if (theme.fontFamily === 'Playfair Display') fontValue = '"Playfair Display", -apple-system, serif';
    else if (theme.fontFamily === 'Inter') fontValue = '"Inter", -apple-system, sans-serif';

    root.style.setProperty('--font-family-custom', fontValue);
  }, [theme, colorMode, activePrimary, activeSecondary, activeButton, activeText, activeBg, darkSurface]);

  return (
    <style>{`
      body {
        font-family: var(--font-family-custom), -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", "Segoe UI", sans-serif !important;
        background-color: ${activeBg} !important;
        color: ${activeText} !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        letter-spacing: -0.015em;
      }

      h1:not(#card_active_cases h4):not(#card_deadlines_week h4):not(#card_pending_updates h4):not(#card_unread_messages h4):not(aside *),
      h2:not(#card_active_cases h4):not(#card_deadlines_week h4):not(#card_pending_updates h4):not(#card_unread_messages h4):not(aside *),
      h3:not(#card_active_cases h4):not(#card_deadlines_week h4):not(#card_pending_updates h4):not(#card_unread_messages h4):not(aside *),
      h4:not(#card_active_cases h4):not(#card_deadlines_week h4):not(#card_pending_updates h4):not(#card_unread_messages h4):not(aside *),
      h5:not(#card_active_cases h4):not(#card_deadlines_week h4):not(#card_pending_updates h4):not(#card_unread_messages h4):not(aside *),
      h6:not(#card_active_cases h4):not(#card_deadlines_week h4):not(#card_pending_updates h4):not(#card_unread_messages h4):not(aside *) {
        font-family: var(--font-family-custom), -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro", sans-serif !important;
        letter-spacing: -0.022em !important;
        font-weight: 700 !important;
        color: ${activeText} !important;
      }

      .font-black, .font-extrabold { font-weight: 800 !important; letter-spacing: -0.025em !important; }
      .font-bold { font-weight: 700 !important; letter-spacing: -0.018em !important; }
      .font-semibold { font-weight: 600 !important; letter-spacing: -0.011em !important; }

      p, span, div, button, input, textarea, select {
        font-family: var(--font-family-custom), -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", sans-serif;
        letter-spacing: -0.011em;
      }

      .btn-custom {
        background-color: var(--color-button, #007aff) !important;
        border-radius: var(--border-radius-custom, 12px) !important;
        color: #ffffff !important;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      .btn-custom:hover {
        opacity: 0.95;
        transform: translateY(-0.5px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      }

      .card-custom {
        background-color: ${isBgLight ? 'rgba(255,255,255,0.88)' : hexToRgba(darkSurface, 0.92)} !important;
        border: 1px solid ${isBgLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)'} !important;
        border-radius: 16px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02) !important;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      .card-custom:hover {
        border-color: ${isBgLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.25)'} !important;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.04) !important;
      }
      .sidebar-custom { background-color: ${activeSidebar} !important; }

      .bento-bar-active { background-color: rgba(0, 122, 255, 0.1) !important; color: #007aff !important; border-left: 3.5px solid #007aff !important; }
      .bento-icon-glow { color: #007aff !important; }
      .bento-chip-sky { background-color: rgba(0, 122, 255, 0.1) !important; color: #007aff !important; border: 1px solid rgba(0, 122, 255, 0.2) !important; }

      ::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
      ::-webkit-scrollbar-track { background: ${isBgLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.04)'} !important; border-radius: 99px !important; }
      ::-webkit-scrollbar-thumb { background: ${isBgLight ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.22)'} !important; border-radius: 99px !important; }
      ::-webkit-scrollbar-thumb:hover { background: ${activePrimary} !important; }
      * { scrollbar-width: thin !important; scrollbar-color: ${isBgLight ? 'rgba(0,0,0,0.16) rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.22) rgba(255,255,255,0.04)'} !important; }

      select, select.bg-slate-50, select.bg-slate-100 {
        background-color: ${isBgLight ? '#ffffff' : darkSurface} !important;
        color: ${isBgLight ? '#1d1d1f' : '#eef2f6'} !important;
        border: 1px solid ${isBgLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)'} !important;
        border-radius: var(--border-radius-custom, 12px) !important;
        padding: 8px 36px 8px 12px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        appearance: none !important;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(isBgLight ? '#475569' : '#cbd5e1')}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e") !important;
        background-repeat: no-repeat !important;
        background-position: right 12px center !important;
        background-size: 14px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        outline: none !important;
      }
      select:hover, select.bg-slate-50:hover, select.bg-slate-100:hover { border-color: ${activeButton} !important; box-shadow: 0 1px 6px rgba(0,0,0,0.04) !important; }
      select:focus { border-color: ${activeButton} !important; box-shadow: 0 0 0 2px ${activeButton}25 !important; }
      select option {
        background-color: ${isBgLight ? '#ffffff' : darkSurface} !important;
        color: ${isBgLight ? '#1d1d1f' : '#eef2f6'} !important;
        padding: 12px !important;
        font-weight: 505 !important;
        font-size: 12px !important;
      }

      .glass-style {
        background: ${isBgLight ? 'rgba(255, 255, 255, 0.72)' : hexToRgba(darkSurface, 0.72)} !important;
        backdrop-filter: blur(20px) saturate(190%) !important;
        -webkit-backdrop-filter: blur(20px) saturate(190%) !important;
        border: 1px solid ${isBgLight ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.1)'} !important;
        box-shadow: ${isBgLight ? '0 8px 32px 0 rgba(15, 23, 42, 0.04)' : '0 8px 32px 0 rgba(0, 0, 0, 0.3)'} !important;
      }

      .popup-overlay-translucent {
        background-color: ${isBgLight ? 'rgba(15, 23, 42, 0.35)' : 'rgba(0, 0, 0, 0.65)'} !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
      }

      /* ============================================================
         SAFEGUARD DASHBOARD TOP METRIC CARDS — Preserve light-theme
         colors and dark metrics/icons colorations in both themes.
         ============================================================ */
      #card_active_cases,
      .cases-view-container #card_active_cases,
      .reminders-view-container #card_active_cases {
        background-color: #f0fdf4 !important; /* bg-emerald-50 */
        border-color: #bbf7d0 !important; /* border-emerald-200 */
      }
      #card_active_cases h4 {
        color: #16a34a !important; /* text-emerald-600 */
      }
      #card_active_cases span,
      #card_active_cases div {
        color: #15803d !important; /* text-emerald-700 */
      }
      #card_active_cases .border {
        background-color: #bbf7d0 !important;
        color: #166534 !important;
        border-color: #86efac !important;
      }

      #card_deadlines_week,
      .cases-view-container #card_deadlines_week,
      .reminders-view-container #card_deadlines_week {
        background-color: #fffbeb !important; /* bg-amber-50 */
        border-color: #fde68a !important; /* border-amber-200 */
      }
      #card_deadlines_week h4 {
        color: #d97706 !important; /* text-amber-600 */
      }
      #card_deadlines_week span,
      #card_deadlines_week div {
        color: #b45309 !important; /* text-amber-700 */
      }
      #card_deadlines_week .border {
        background-color: #fde68a !important;
        color: #92400e !important;
        border-color: #fcd34d !important;
      }

      #card_pending_updates,
      .cases-view-container #card_pending_updates,
      .reminders-view-container #card_pending_updates {
        background-color: #faf5ff !important; /* bg-violet-50 */
        border-color: #e9d5ff !important; /* border-violet-200 */
      }
      #card_pending_updates h4 {
        color: #8b5cf6 !important; /* text-violet-500 */
      }
      #card_pending_updates span,
      #card_pending_updates div {
        color: #6d28d9 !important; /* text-violet-700 */
      }
      #card_pending_updates .border {
        background-color: #e9d5ff !important;
        color: #5b21b6 !important;
        border-color: #d8b4fe !important;
      }

      #card_unread_messages,
      .cases-view-container #card_unread_messages,
      .reminders-view-container #card_unread_messages {
        background-color: #fef2f2 !important; /* bg-red-50 */
        border-color: #fecaca !important; /* border-red-200 */
      }
      #card_unread_messages h4 {
        color: #ef4444 !important; /* text-red-500 */
      }
      #card_unread_messages span,
      #card_unread_messages div {
        color: #be123c !important; /* text-red-700 */
      }
      #card_unread_messages .border {
        background-color: #fecaca !important;
        color: #991b1b !important;
        border-color: #fca5a5 !important;
      }

       /* ============================================================
         ABSOLUTE GUARANTEE FOR TOP METRIC CARDS IMMUNITY
         ============================================================ */
      .top-stat-card, .top-stat-card * {
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
      }
      /* Ensure that the text colors elements in top-stat-card ALWAYS remain high-contrast slate-950/slate-805 */
      .top-stat-card span:not(.font-black.uppercase):not(.bg-slate-950 *):not(.bg-slate-950) {
        color: #020617 !important;
      }
      .top-stat-card .text-slate-950,
      .top-stat-card span.text-slate-950,
      .top-stat-card [class*="text-slate-950"] {
        color: #020617 !important; /* text-slate-950 */
      }
      .top-stat-card .text-slate-800,
      .top-stat-card span.text-slate-800,
      .top-stat-card [class*="text-slate-800"] {
        color: #1e293b !important; /* text-slate-800 */
      }
      /* Keep the badge styling perfectly exact, high-contrast dark with white text */
      .top-stat-card span.bg-slate-950 {
        background-color: #020617 !important;
        color: #ffffff !important;
        border-color: #1e293b !important;
      }

      /* ============================================================
         DARK MODE — ONE deliberate navy surface, applied uniformly,
         using wildcard selectors so every "text-slate-XXX" / "bg-slate-XXX"
         variant gets caught. SIDEBAR (aside) and dashboard key cards
         are explicitly exempted from ALL dark mode theme overrides.
         ============================================================ */
      ${!isBgLight ? `
        .bg-white:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *),
        [class*="bg-white"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *),
        [class*="bg-slate-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *),
        [class*="bg-gray-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *),
        [class*="bg-zinc-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *) {
          background-color: ${darkSurface} !important;
          color: #eef2f6 !important;
        }

        .border:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *),
        [class*="border-slate-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *),
        [class*="border-gray-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *),
        [class*="border-zinc-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *) {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }

        /* Ensure white/light-grey borders on chat, deadlines, and reminders are dark-mode grey */
        [class*="border-white"]:not(aside):not(aside *):not(.top-stat-card):not(.top-stat-card *), .border-white:not(aside):not(aside *):not(.top-stat-card):not(.top-stat-card *),
        [class*="chat"] .border-white:not(aside):not(aside *), 
        [class*="reminders"] .border-white:not(aside):not(aside *):not(.top-stat-card):not(.top-stat-card *),
        [class*="deadline"] .border-white:not(aside):not(aside *) {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }

        label:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *),
        [class*="text-slate-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *),
        [class*="text-gray-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *),
        [class*="text-zinc-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *) {
          color: #eef2f6 !important;
        }

        input, textarea {
          background-color: ${darkSurface} !important;
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.18) !important;
        }
        input::placeholder, textarea::placeholder, ::placeholder { color: #94a3b8 !important; }
        header { background-color: ${darkSurface} !important; border-bottom-color: rgba(255, 255, 255, 0.12) !important; }
        nav.md\\:hidden { background-color: ${hexToRgba(darkSurface, 0.97)} !important; border-top-color: rgba(255, 255, 255, 0.12) !important; }

        /* Bento Dashboard Layout Customizer Section dark mode styling */
        #dashboard-layout-customizer-panel {
          background: ${darkSurface} !important;
          background-image: none !important;
          border: 2px solid rgba(255, 255, 255, 0.12) !important;
        }
        #dashboard-layout-customizer-panel h3,
        #dashboard-layout-customizer-panel h4,
        #dashboard-layout-customizer-panel h5 {
          color: #ffffff !important;
        }
        #dashboard-layout-customizer-panel p {
          color: #94a3b8 !important;
        }
        #dashboard-layout-customizer-panel .bg-white,
        #dashboard-layout-customizer-panel [class*="bg-white"],
        #dashboard-layout-customizer-panel .bg-slate-[50-200],
        #dashboard-layout-customizer-panel [class*="bg-slate-"] {
          background-color: ${isBgLight ? '#ffffff' : hexToRgba(darkSurface, 0.5)} !important;
          color: #eef2f6 !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        #dashboard-layout-customizer-panel input {
          background-color: ${darkSurface} !important;
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.18) !important;
        }

        /* ============================================================
           HIGH SPECIFICITY PAGES CLEANUP RULES TO OVERRIDE CSS PRESETS
           ============================================================ */
        
        /* Cases view overrides */
        .cases-view-container, 
        .cases-view-container .bg-white:not(.top-stat-card):not(.top-stat-card *), 
        .cases-view-container [class*="bg-white"]:not(.top-stat-card):not(.top-stat-card *),
        .cases-view-container .bg-slate-50:not(.top-stat-card):not(.top-stat-card *), 
        .cases-view-container [class*="bg-slate-"]:not(.top-stat-card):not(.top-stat-card *) {
          background-color: ${darkSurface} !important;
          color: #eef2f6 !important;
        }
        .cases-view-container .border:not(.top-stat-card):not(.top-stat-card *),
        .cases-view-container .border-t:not(.top-stat-card):not(.top-stat-card *),
        .cases-view-container .border-b:not(.top-stat-card):not(.top-stat-card *),
        .cases-view-container .border-l:not(.top-stat-card):not(.top-stat-card *),
        .cases-view-container .border-r:not(.top-stat-card):not(.top-stat-card *),
        .cases-view-container [class*="border-slate-"]:not(.top-stat-card):not(.top-stat-card *),
        .cases-view-container [class*="border-gray-"]:not(.top-stat-card):not(.top-stat-card *) {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        .cases-view-container input, .cases-view-container select, .cases-view-container textarea,
        .cases-view-container input:focus, .cases-view-container select:focus, .cases-view-container textarea:focus {
          background: ${darkSurface} !important;
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.18) !important;
        }

        /* Reminders/Deadlines view overrides */
        .reminders-view-container, 
        .reminders-view-container .bg-white:not(.top-stat-card):not(.top-stat-card *), 
        .reminders-view-container [class*="bg-white"]:not(.top-stat-card):not(.top-stat-card *),
        .reminders-view-container .bg-slate-50:not(.top-stat-card):not(.top-stat-card *), 
        .reminders-view-container [class*="bg-slate-"]:not(.top-stat-card):not(.top-stat-card *) {
          background-color: ${darkSurface} !important;
          color: #eef2f6 !important;
        }
        .reminders-view-container .border:not(.top-stat-card):not(.top-stat-card *),
        .reminders-view-container .border-t:not(.top-stat-card):not(.top-stat-card *),
        .reminders-view-container .border-b:not(.top-stat-card):not(.top-stat-card *),
        .reminders-view-container .border-l:not(.top-stat-card):not(.top-stat-card *),
        .reminders-view-container .border-r:not(.top-stat-card):not(.top-stat-card *),
        .reminders-view-container [class*="border-slate-"]:not(.top-stat-card):not(.top-stat-card *),
        .reminders-view-container [class*="border-gray-"]:not(.top-stat-card):not(.top-stat-card *),
        .reminders-view-container [class*="border-zinc-"]:not(.top-stat-card):not(.top-stat-card *) {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        .reminders-view-container input, .reminders-view-container select, .reminders-view-container textarea,
        .reminders-view-container input:focus, .reminders-view-container select:focus, .reminders-view-container textarea:focus {
          background: ${darkSurface} !important;
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.18) !important;
        }

        /* Chat view overrides */
        [class*="chat"] .border, [class*="chat"] [class*="border-slate-"], [class*="chat"] [class*="border-gray-"] {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        [class*="chat"] input, [class*="chat"] textarea, [class*="chat"] select, [class*="chat"] .chat-composer-input {
          background-color: ${darkSurface} !important;
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.18) !important;
        }
        [class*="chat"] .bg-white, [class*="chat"] [class*="bg-white"],
        [class*="chat"] .bg-slate-50, [class*="chat"] [class*="bg-slate-"] {
          background-color: ${darkSurface} !important;
          color: #eef2f6 !important;
        }
      ` : ''}
    `}</style>
  );
}
