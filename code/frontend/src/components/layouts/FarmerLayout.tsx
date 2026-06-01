import { Outlet, useNavigate } from 'react-router';
import { Sidebar } from '../Sidebar';
import { AlertCircle } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useInactivityTimeout } from '../../utils/useInactivityTimeout';
import { clearAuthData } from '../../utils/authUtils';
import { NotificationsDropdown } from '../ui/NotificationsDropdown';

export function FarmerLayout() {
  const navigate = useNavigate();
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
    <div className="flex min-h-screen bg-gray-50">
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
                  Session Timeout Warning
                </h3>
                <p className="text-gray-600 mb-4">
                  Your session will expire in <span className="font-bold text-red-600">{countdown}</span> seconds due to inactivity. 
                  Click stay logged in.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowWarning(false);
                      setCountdown(60);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Stay Logged In
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Logout Now
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
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <h1 className="text-gray-800 text-lg md:text-xl font-medium ml-12 lg:ml-0">
            {getCurrentPage() === 'home' && 'Home'}
            {getCurrentPage() === 'crop' && 'Crop Data'}
            {getCurrentPage() === 'disease' && 'Disease'}
            {getCurrentPage() === 'profile' && 'My Profile'}
            {getCurrentPage() === 'reports' && 'Reports'}
            {getCurrentPage() === 'notes' && 'Contact Admin'}
          </h1>
          
          {/* Notifications Only */}
          <NotificationsDropdown />
        </header>

        {/* Main Content */}
        <main className="p-4 md:p-8">
          <Outlet context={{ onNavigate: handleNavigate }} />
        </main>
      </div>
    </div>
  );
}
