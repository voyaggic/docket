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

      h1, h2, h3, h4, h5, h6 {
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
         DARK MODE — ONE deliberate navy surface, applied uniformly,
         using wildcard selectors so every "text-slate-XXX" / "bg-slate-XXX"
         variant gets caught — including the non-standard numbers used
         throughout the app. Colored cards (bg-emerald-*, bg-amber-*,
         bg-violet-*, bg-red-*, bg-sky-*, etc.) are intentionally NOT
         matched — they stay exactly as designed in both modes.
         ============================================================ */
      ${!isBgLight ? `
        .bg-white, [class*="bg-white"],
        [class*="bg-slate-"], [class*="bg-gray-"], [class*="bg-zinc-"] {
          background-color: ${darkSurface} !important;
          color: #eef2f6 !important;
        }
        .border, [class*="border-slate-"], [class*="border-gray-"], [class*="border-zinc-"] {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        /* Ensure white borders on chat, deadlines, and reminders are dark-mode grey */
        [class*="border-white"], .border-white,
        [class*="chat"] .border-white, 
        [class*="reminders"] .border-white,
        [class*="deadline"] .border-white {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        label, [class*="text-slate-"], [class*="text-gray-"], [class*="text-zinc-"] {
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

        .cases-view-container input, .cases-view-container select, .cases-view-container textarea,
        .reminders-view-container input, .reminders-view-container select, .reminders-view-container textarea {
          background: ${darkSurface} !important;
          color: #eef2f6 !important;
          border-color: rgba(255, 255, 255, 0.18) !important;
        }
      ` : ''}
    `}</style>
  );
}
