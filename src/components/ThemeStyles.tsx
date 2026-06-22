import React, { useEffect } from 'react';
import { CompanyTheme } from '../types';

export default function ThemeStyles({ theme, colorMode }: { theme: CompanyTheme; colorMode: 'light' | 'dark' }) {
  const isBgLight = colorMode === 'light';

  // Explicit, deliberate light/dark logic — colors are NEVER algorithmically inverted.
  // Brand accent colors (primary/secondary/button) stay exactly as the firm configured
  // them in both modes; only the neutral surface tokens below switch with the mode.
  const activePrimary = theme.primaryColor;
  const activeSecondary = theme.secondaryColor;
  const activeButton = theme.buttonColor;
  const activeText = isBgLight ? (theme.textColor || '#1d1d1f') : '#ffffff';
  const activeBg = isBgLight ? (theme.backgroundColor || '#f5f5f7') : '#000000';
  const activeSidebar = isBgLight ? (theme.sidebarColor || '#0f172a') : '#111112';

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', activePrimary);
    root.style.setProperty('--color-secondary', activeSecondary);
    root.style.setProperty('--color-bg', activeBg);
    root.style.setProperty('--color-text', activeText);
    root.style.setProperty('--color-button', activeButton);
    
    // Border Radius mapping
    const radiusMap = {
      sharp: '0px',
      medium: '8px',
      round: '20px'
    };
    root.style.setProperty('--border-radius-custom', radiusMap[theme.borderRadius] || '8px');

    // Font family mapping
    let fontValue = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", "Helvetica Neue", Helvetica, "Segoe UI", sans-serif';
    if (theme.fontFamily === 'DM Sans') fontValue = '"DM Sans", -apple-system, sans-serif';
    else if (theme.fontFamily === 'Lato') fontValue = '"Lato", -apple-system, sans-serif';
    else if (theme.fontFamily === 'Poppins') fontValue = '"Poppins", -apple-system, sans-serif';
    else if (theme.fontFamily === 'Roboto') fontValue = '"Roboto", -apple-system, sans-serif';
    else if (theme.fontFamily === 'Playfair Display') fontValue = '"Playfair Display", -apple-system, serif';
    else if (theme.fontFamily === 'Inter') fontValue = '"Inter", -apple-system, sans-serif';
    
    root.style.setProperty('--font-family-custom', fontValue);
  }, [theme, isBgLight, activePrimary, activeSecondary, activeButton, activeText, activeBg]);

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
        font-weight: 700 !important; /* Prominent Apple-style bold typography hierarchy */
        color: ${activeText} !important;
      }

      /* Boldness title hierarchies */
      .font-black, .font-extrabold {
        font-weight: 800 !important;
        letter-spacing: -0.025em !important;
      }
      .font-bold {
        font-weight: 700 !important;
        letter-spacing: -0.018em !important;
      }
      .font-semibold {
        font-weight: 600 !important;
        letter-spacing: -0.011em !important;
      }

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
        background-color: ${isBgLight ? 'rgba(255,255,255,0.88)' : 'rgba(28,28,30,0.85)'} !important;
        border: 1px solid ${isBgLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)'} !important;
        border-radius: 16px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02) !important;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      .card-custom:hover {
        border-color: ${isBgLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.25)'} !important;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.04) !important;
      }
      .sidebar-custom {
        background-color: ${activeSidebar} !important;
      }
      
      /* Bento design specific overrides */
      .bento-bar-active {
        background-color: rgba(0, 122, 255, 0.1) !important;
        color: #007aff !important;
        border-left: 3.5px solid #007aff !important;
      }
      .bento-icon-glow {
        color: #007aff !important;
      }
      .bento-chip-sky {
        background-color: rgba(0, 122, 255, 0.1) !important;
        color: #007aff !important;
        border: 1px solid rgba(0, 122, 255, 0.2) !important;
      }

      /* Premium global scrollbar customization matches the active style */
      ::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
      }
      ::-webkit-scrollbar-track {
        background: ${isBgLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)'} !important;
        border-radius: 99px !important;
      }
      ::-webkit-scrollbar-thumb {
        background: ${isBgLight ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.22)'} !important;
        border-radius: 99px !important;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: ${activePrimary} !important;
      }
      /* Firefox scrollbar support */
      * {
        scrollbar-width: thin !important;
        scrollbar-color: ${isBgLight ? 'rgba(0,0,0,0.16) rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.22) rgba(255,255,255,0.02)'} !important;
      }

      /* Beautifully styled custom select dropdown and option elements */
      select, select.bg-slate-50, select.bg-slate-100 {
        background-color: ${isBgLight ? '#ffffff' : '#1c1c1e'} !important;
        color: ${isBgLight ? '#1d1d1f' : '#ffffff'} !important;
        border: 1px solid ${isBgLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)'} !important;
        border-radius: var(--border-radius-custom, 12px) !important;
        padding: 8px 36px 8px 12px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        appearance: none !important;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(isBgLight ? '#475569' : '#a1a1a6')}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e") !important;
        background-repeat: no-repeat !important;
        background-position: right 12px center !important;
        background-size: 14px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        outline: none !important;
      }
      select:hover, select.bg-slate-50:hover, select.bg-slate-100:hover {
        border-color: ${activeButton} !important;
        box-shadow: 0 1px 6px rgba(0,0,0,0.04) !important;
      }
      select:focus {
        border-color: ${activeButton} !important;
        box-shadow: 0 0 0 2px ${activeButton}25 !important;
      }
      select option {
        background-color: ${isBgLight ? '#ffffff' : '#2c2c2e'} !important;
        color: ${isBgLight ? '#1d1d1f' : '#ffffff'} !important;
        padding: 12px !important;
        font-weight: 505 !important;
        font-size: 12px !important;
      }

      /* Apple-style premium Glassmorphism Effects used wisely */
      .glass-style {
        background: ${isBgLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(20, 20, 22, 0.72)'} !important;
        backdrop-filter: blur(20px) saturate(190%) !important;
        -webkit-backdrop-filter: blur(20px) saturate(190%) !important;
        border: 1px solid ${isBgLight ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.08)'} !important;
        box-shadow: ${isBgLight ? '0 8px 32px 0 rgba(15, 23, 42, 0.04)' : '0 8px 32px 0 rgba(0, 0, 0, 0.3)'} !important;
      }

      .popup-overlay-translucent {
        background-color: ${isBgLight ? 'rgba(15, 23, 42, 0.35)' : 'rgba(0, 0, 0, 0.65)'} !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
      }

      /* Dynamic Light / Dark mode overrides for rest of application */
      ${!isBgLight ? `
        .bg-white {
          background-color: #121214 !important;
          color: #ffffff !important;
        }
        .bg-slate-50, .bg-slate-[50], .bg-slate-100 {
          background-color: #1c1c1e !important;
          color: #f5f5f7 !important;
        }
        .border, .border-slate-100, .border-slate-200, .border-slate-205, .border-slate-300 {
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        label, .text-slate-705, .text-slate-700, .text-slate-600, .text-slate-800, .text-slate-900 {
          color: #f5f5f7 !important;
        }
        .text-slate-500 {
          color: #a1a1a6 !important;
        }
        .text-slate-400 {
          color: #8e8e93 !important;
        }
        input, textarea {
          background-color: #1c1c1e !important;
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
        input::placeholder, textarea::placeholder {
          color: #8e8e93 !important;
        }
        header {
          background-color: #121214 !important;
          border-bottom-color: rgba(255, 255, 255, 0.12) !important;
        }
        nav.md\\:hidden {
          background-color: rgba(18, 18, 20, 0.95) !important;
          border-top-color: rgba(255, 255, 255, 0.12) !important;
        }
      ` : ''}
    `}</style>
  );
}
