import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SuperadminRouteProps {
  children: React.ReactNode;
}

export const SuperadminRoute: React.FC<SuperadminRouteProps> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();

  // @ts-ignore
  const SA_PATH = import.meta.env?.VITE_SUPERADMIN_PATH || 'system-access';

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/sa/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setAuthorized(true);
          setLastActivity(Date.now());
          setShowWarning(false);
          return true;
        }
      }
    } catch (err) {
      console.error("Auth check failed", err);
    }
    setAuthorized(false);
    return false;
  };

  // Initial Check
  useEffect(() => {
    const runInitialCheck = async () => {
      const isOk = await checkAuth();
      setChecking(false);
      if (!isOk) {
        navigate(`/${SA_PATH}/login`, { replace: true });
      }
    };
    runInitialCheck();
  }, [navigate, SA_PATH]);

  // Background Check on Interval (Every 5 minutes)
  useEffect(() => {
    if (checking || !authorized) return;

    const intervalId = setInterval(async () => {
      const isOk = await checkAuth();
      if (!isOk) {
        navigate(`/${SA_PATH}/login`, { replace: true });
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [checking, authorized, navigate, SA_PATH]);

  // Session Warning & Expiry Timer (Checked every second)
  useEffect(() => {
    if (checking || !authorized) return;

    const timerId = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      const twentyFiveMinutes = 25 * 60 * 1000;
      const thirtyMinutes = 30 * 60 * 1000;

      if (elapsed >= thirtyMinutes) {
        setAuthorized(false);
        navigate(`/${SA_PATH}/login`, { replace: true });
      } else if (elapsed >= twentyFiveMinutes) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [checking, authorized, lastActivity, navigate, SA_PATH]);

  const handleExtendSession = async () => {
    const isOk = await checkAuth();
    if (!isOk) {
      navigate(`/${SA_PATH}/login`, { replace: true });
    }
  };

  if (checking) {
    // Blank dark screen, no spinner, no text
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  if (!authorized) {
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  return (
    <>
      {showWarning && (
        <div id="sa-session-warning-banner" className="fixed top-0 left-0 right-0 bg-amber-500 text-zinc-950 px-4 py-2.5 flex items-center justify-between font-mono text-xs font-bold z-50 shadow-md">
          <span>⚠️ Warning: Superadmin session will expire in 5 minutes due to inactivity.</span>
          <button 
            onClick={handleExtendSession}
            className="bg-zinc-950 text-white px-3 py-1.5 rounded hover:bg-zinc-800 transition cursor-pointer font-bold uppercase tracking-wider text-[10px]"
          >
            Extend Session
          </button>
        </div>
      )}
      {children}
    </>
  );
};

export default SuperadminRoute;
