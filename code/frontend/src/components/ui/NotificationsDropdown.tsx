import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, ShieldCheck, Loader2, MapPin, Map } from 'lucide-react';
import { floodAPI } from '../../services/api';

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [floodData, setFloodData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = async () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    
    // Fetch latest data when opening if we haven't already, or to refresh it
    if (willOpen) {
      setLoading(true);
      try {
        const data = await floodAPI.getNearbyFloods();
        setFloodData(data);
      } catch (err) {
        console.error("Failed to load flood forecast for notifications:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Calculate unread count based on severity
  let unreadCount = 0;
  let hasActiveFloodThreat = false;
  
  if (floodData?.highestAlert && (
      floodData.highestAlert.severity === 'EXTREME' || 
      floodData.highestAlert.severity === 'SEVERE' || 
      floodData.highestAlert.severity === 'ABOVE_NORMAL'
  )) {
    unreadCount += 1;
    hasActiveFloodThreat = true;
  } else if (!floodData?.locationConfigured) {
      unreadCount += 1; // Prompt to configure location
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center text-[10px] md:text-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="fixed left-2 right-2 sm:absolute sm:left-auto sm:right-0 mt-2 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} New
              </span>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {/* Dynamic Flood Notification */}
            {loading ? (
              <div className="p-6 flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin text-green-600 mb-2" />
                <p className="text-xs">Loading flood data...</p>
              </div>
            ) : (
              <div className="p-4 hover:bg-gray-50 transition-colors">
                {!floodData?.locationConfigured ? (
                  <div className="flex gap-3">
                    <div className="bg-slate-100 p-2 rounded-full h-fit flex-shrink-0">
                      <Map className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">Flood Tracking Offline</h4>
                      <p className="text-xs text-gray-500 mt-1">Set your coordinates to enable active tracking.</p>
                    </div>
                  </div>
                ) : floodData?.highestAlert ? (
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-full h-fit flex-shrink-0 ${hasActiveFloodThreat ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <AlertTriangle className={`w-5 h-5 ${hasActiveFloodThreat ? 'text-red-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">
                        {floodData.highestAlert.severity} Threat
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-medium text-gray-800">{floodData.highestAlert.gaugeName}</span> • Trend: {floodData.highestAlert.forecastTrend}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full h-fit flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">No Floods Nearby</h4>
                      <p className="text-xs text-gray-500 mt-1">Safe within 10km.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
            <button 
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-green-600 hover:text-green-700"
            >
              Close Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
