import { Outlet, useNavigate } from 'react-router';
import { Sidebar } from '../Sidebar';
import { AlertCircle } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useInactivityTimeout } from '../../utils/useInactivityTimeout';
import { clearAuthData } from '../../utils/authUtils';
import { NotificationsDropdown } from '../ui/NotificationsDropdown';
import LanguageSwitcher from '../LanguageSwitcher';


export function FarmerLayout() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  const WARNING_TIME_MS = 14 * 60 * 1000; // Show warning 1 minute before logout
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(() => {
    // Clear all timers before logout
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    clearAuthData();
    // Use replace instead of push to prevent back navigation issues
    navigate('/', { replace: true });
  }, [navigate]);

  // Session timeout due to inactivity (15 minutes)
  useInactivityTimeout({
    timeout: TIMEOUT_MS,
    onTimeout: handleLogout,
  });

  // Warning dialog before auto-logout
  const resetWarningTimer = useCallback(() => {
    // Hide warning when activity detected
    setShowWarning(false);

    // Clear existing warning timer
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    // Set new warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);
    }, WARNING_TIME_MS);
  }, [WARNING_TIME_MS]);

  useEffect(() => {
    resetWarningTimer();

    return () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, [resetWarningTimer]);

  // Countdown timer for warning
  useEffect(() => {
    if (showWarning && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showWarning, countdown]);

  // Hide warning and reset timer on user activity (only if warning not showing)
  useEffect(() => {
    const handleActivity = () => {
      // Only reset warning timer if warning is not currently showing
      // This allows user to click buttons on the warning modal
      if (!showWarning) {
        resetWarningTimer();
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'click'];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetWarningTimer, showWarning]);

  // Get current page from URL
  const getCurrentPage = () => {
    const path = window.location.pathname;
    if (path.includes('/home')) return 'home';
    if (path.includes('/crop-data')) return 'crop';
    if (path.includes('/disease')) return 'disease';
    if (path.includes('/profile')) return 'profile';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/contact-admin')) return 'notes';
    return 'home';
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      home: t('farmerNav.home'),
      crop: t('farmerNav.cropData'),
      disease: t('farmerNav.disease'),
      profile: t('farmerNav.profile'),
      reports: t('farmerNav.reports'),
      notes: t('farmerNav.contactAdmin'),
    };

    return titles[getCurrentPage()] || t('farmerNav.home');
  };

  const handleNavigate = (page: string) => {
    const routes: Record<string, string> = {
      home: '/farmer/home',
      crop: '/farmer/crop-data',
      disease: '/farmer/disease',
      profile: '/farmer/profile',
      reports: '/farmer/reports',
      notes: '/farmer/contact-admin',
    };
    navigate(routes[page] || '/farmer/home');
  };

  return (
    <div id="farmer-portal-root" className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafb 0%, #f0fdf4 30%, #f8fafc 70%, #ecfdf5 100%)' }}>
      

      {/* Session Timeout Warning */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="bg-yellow-100 rounded-full p-3 flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('sessionTimeout.title')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('sessionTimeout.messageStart')}{' '}
                  <span className="font-bold text-red-600">{countdown}</span>{' '}
                  {t('sessionTimeout.messageEnd')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowWarning(false);
                      setCountdown(60);
                      resetWarningTimer();
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {t('sessionTimeout.stayLoggedIn')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    {t('sessionTimeout.logoutNow')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        currentPage={getCurrentPage()}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <div className="flex-1 w-full lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-20" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(150%)', WebkitBackdropFilter: 'blur(12px) saturate(150%)', borderBottom: '1px solid rgba(229,231,235,0.7)', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #059669, #10b981, #34d399)', borderRadius: '0 0 2px 2px' }} />
          <div className="px-4 md:px-8 py-4 flex items-center justify-between">
            <h1 className="text-gray-800 text-lg md:text-xl font-semibold ml-12 lg:ml-0" style={{ letterSpacing: '-0.01em' }}>
              {getPageTitle()}
            </h1>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <NotificationsDropdown />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 md:p-8 page-enter">
          <Outlet context={{ onNavigate: handleNavigate }} />
        </main>
      </div>
    </div>
  );
}
