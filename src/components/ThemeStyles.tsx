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
         DARK MODE — ONE deliberate navy surface, applied uniformly,
         using wildcard selectors so every "text-slate-XXX" / "bg-slate-XXX"
         variant gets caught. SIDEBAR (aside) and dashboard key cards, 
         KPI cards, and customizer are explicitly exempted.
         ============================================================ */
      ${!isBgLight ? `
        .bg-white:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *),
        [class*="bg-white"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *),
        [class*="bg-slate-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *),
        [class*="bg-gray-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *),
        [class*="bg-zinc-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *) {
          background-color: ${darkSurface} !important;
          color: #eef2f6 !important;
        }

        .border:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *),
        [class*="border-slate-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *),
        [class*="border-gray-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *),
        [class*="border-zinc-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *) {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }

        /* Ensure white/light-grey borders on chat, deadlines, and reminders are dark-mode grey */
        [class*="border-white"]:not(aside):not(aside *), .border-white:not(aside):not(aside *),
        [class*="chat"] .border-white:not(aside):not(aside *), 
        [class*="reminders"] .border-white:not(aside):not(aside *),
        [class*="deadline"] .border-white:not(aside):not(aside *) {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }

        label:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *),
        [class*="text-slate-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *),
        [class*="text-gray-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *),
        [class*="text-zinc-"]:not(aside):not(aside *):not(#card_active_cases):not(#card_active_cases *):not(#card_deadlines_week):not(#card_deadlines_week *):not(#card_pending_updates):not(#card_pending_updates *):not(#card_unread_messages):not(#card_unread_messages *):not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *):not([id^="cases-stats-strip"]):not([id^="cases-stats-strip"] *):not(#dashboard-layout-customizer-panel):not(#dashboard-layout-customizer-panel *) {
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

        /* Customizer Panel Dark Theme Fix */
        #dashboard-layout-customizer-panel {
          background-image: none !important;
          background-color: ${darkSurface} !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
        #dashboard-layout-customizer-panel h3,
        #dashboard-layout-customizer-panel p {
          color: #eef2f6 !important;
        }
        #dashboard-layout-customizer-panel input,
        #dashboard-layout-customizer-panel select {
          color: #ffffff !important;
          background-color: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
        #dashboard-layout-customizer-panel button {
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
        #dashboard-layout-customizer-panel button.bg-white {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
        }
        #dashboard-layout-customizer-panel div[class*="bg-white"],
        #dashboard-layout-customizer-panel div[class*="bg-slate-"],
        #dashboard-layout-customizer-panel div.bg-white {
          background-color: rgba(255, 255, 255, 0.05) !important;
          background-image: none !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        #dashboard-layout-customizer-panel span {
          color: #cbd5e1 !important;
        }

        /* ============================================================
           HIGH SPECIFICITY PAGES CLEANUP RULES TO OVERRIDE CSS PRESETS
           ============================================================ */
        
        /* Cases view overrides */
        .cases-view-container, 
        .cases-view-container .bg-white:not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *), 
        .cases-view-container [class*="bg-white"]:not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *),
        .cases-view-container .bg-slate-50:not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *), 
        .cases-view-container [class*="bg-slate-"]:not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *) {
          background-color: ${darkSurface} !important;
          color: #eef2f6 !important;
        }
        .cases-view-container .border,
        .cases-view-container .border-t,
        .cases-view-container .border-b,
        .cases-view-container .border-l,
        .cases-view-container .border-r,
        .cases-view-container [class*="border-slate-"],
        .cases-view-container [class*="border-gray-"] {
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
        .reminders-view-container .bg-white:not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *), 
        .reminders-view-container [class*="bg-white"]:not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *),
        .reminders-view-container .bg-slate-50:not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *), 
        .reminders-view-container [class*="bg-slate-"]:not(.top-stat-card):not(.top-stat-card *):not(#cases-stats-strip):not(#cases-stats-strip *) {
          background-color: ${darkSurface} !important;
          color: #eef2f6 !important;
        }
        .reminders-view-container .border,
        .reminders-view-container .border-t,
        .reminders-view-container .border-b,
        .reminders-view-container .border-l,
        .reminders-view-container .border-r,
        .reminders-view-container [class*="border-slate-"],
        .reminders-view-container [class*="border-gray-"],
        .reminders-view-container [class*="border-zinc-"] {
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

      /* ============================================================
         UNIFIED & ULTRA-PERSISTENT KPI CARDS STYLE OVERRIDES
         Force them to keep their exact look, background-colors, borders
         and dark-slate legends/values in BOTH Light and Dark themes.
         ============================================================ */
      body .top-stat-card,
      body [id^="cases-stats-strip"] > div,
      body #cases-stats-strip > div {
        border-width: 1px !important;
        border-style: solid !important;
        border-color: #e2e8f0 !important;
        border-radius: 12px !important;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04) !important;
        transition: all 0.2s ease-in-out !important;
        min-height: 104px !important;
        padding: 14px !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        color: #0f172a !important;
      }
      
      body .top-stat-card h4, body .top-stat-card span, body .top-stat-card div, body .top-stat-card p, body .top-stat-card button, body .top-stat-card input,
      body [id^="cases-stats-strip"] > div h4, body [id^="cases-stats-strip"] > div span, body [id^="cases-stats-strip"] > div div,
      body #cases-stats-strip > div h4, body #cases-stats-strip > div span, body #cases-stats-strip > div div {
        color: #0c111d !important; /* Force all labels and values to dark charcoal */
      }
      
      body .top-stat-card svg,
      body [id^="cases-stats-strip"] > div svg,
      body #cases-stats-strip > div svg {
        color: #334155 !important; /* Force icon coloring as slate-700 */
      }

      /* Specific light backgrounds mapped rigidly across BOTH light and dark modes */
      body .top-stat-card.bg-emerald-50, body [class*="bg-emerald-50"], body [style*="background-color: rgb(240, 253, 244)"] { background-color: #f0fdf4 !important; border-left: 4px solid #10b981 !important; }
      body .top-stat-card.bg-amber-50, body [class*="bg-amber-50"], body [style*="background-color: rgb(255, 251, 235)"] { background-color: #fffbeb !important; border-left: 4px solid #f59e0b !important; }
      body .top-stat-card.bg-violet-50, body [class*="bg-violet-50"], body [style*="background-color: rgb(245, 243, 255)"] { background-color: #f5f3ff !important; border-left: 4px solid #8b5cf6 !important; }
      body .top-stat-card.bg-red-50, body [class*="bg-red-50"], body [style*="background-color: rgb(254, 242, 242)"] { background-color: #fef2f2 !important; border-left: 4px solid #ef4444 !important; }
      body .top-stat-card.bg-sky-50, body [class*="bg-sky-50"], body [style*="background-color: rgb(240, 249, 255)"] { background-color: #f0f9ff !important; border-left: 4px solid #0ea5e9 !important; }
      body .top-stat-card.bg-blue-50, body [class*="bg-blue-50"], body [style*="background-color: rgb(239, 246, 255)"] { background-color: #eff6ff !important; border-left: 4px solid #3b82f6 !important; }
      body .top-stat-card.bg-orange-50, body [class*="bg-orange-50"], body [style*="background-color: rgb(255, 247, 237)"] { background-color: #fff7ed !important; border-left: 4px solid #f97316 !important; }
      body .top-stat-card.bg-yellow-50, body [class*="bg-yellow-50"], body [style*="background-color: rgb(254, 252, 232)"] { background-color: #fefce8 !important; border-left: 4px solid #eab308 !important; }
      body .top-stat-card.bg-slate-50, body [class*="bg-slate-50"], body [style*="background-color: rgb(249, 250, 251)"] { background-color: #f9fafb !important; border-left: 4px solid #6b7280 !important; }
      body .top-stat-card.bg-teal-50, body [class*="bg-teal-50"], body [style*="background-color: rgb(240, 253, 250)"] { background-color: #f0fdfa !important; border-left: 4px solid #14b8a6 !important; }
      body .top-stat-card.bg-rose-50, body [class*="bg-rose-50"], body [style*="background-color: rgb(255, 241, 242)"] { background-color: #fff1f2 !important; border-left: 4px solid #f43f5e !important; }
      body .top-stat-card.bg-white, body [style*="background-color: rgb(255, 255, 255)"] { background-color: #ffffff !important; border-left: 4px solid #6b7280 !important; }

      /* Force standard rounded-full badge inside stats cards */
      body .top-stat-card span[class*="rounded-full"],
      body [id^="cases-stats-strip"] span[class*="rounded-full"],
      body #cases-stats-strip span[class*="rounded-full"] {
        background-color: rgba(255, 255, 255, 0.72) !important;
        border: 1px solid #e2e8f0 !important;
        color: #334155 !important;
      }
    `}</style>
  );
}
