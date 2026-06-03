/**
 * Farmer Portal Sidebar Navigation
 * Displays navigation links and user profile info.
 * Handles mobile responsive states with a slide-in overlay.
 */
import { Home, Sprout, AlertTriangle, User, FileText, LogOut, Menu, X, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { userAPI } from '../services/api';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function Sidebar({ currentPage, onNavigate, onLogout }: SidebarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<any>({});

  useEffect(() => {
    const loadFarmerUser = async () => {
      // Load initially from local storage for fast render
      const authDataStr = localStorage.getItem('agriconnect_auth');
      if (authDataStr) {
        try {
          const authData = JSON.parse(authDataStr);
          if (authData.user) {
            setUserData(authData.user);
          } else {
            setUserData({
              firstName: authData.firstName,
              lastName: authData.lastName,
              email: authData.email
            });
          }
        } catch (e) {
          console.error("Failed to parse auth data", e);
        }
      }

      // Fetch fresh data from backend
      try {
        const response = await userAPI.fetchProfile();
        if (response && response.user) {
          setUserData(response.user);
          if (authDataStr) {
            const parsed = JSON.parse(authDataStr);
            parsed.user = { ...parsed.user, ...response.user };
            localStorage.setItem('agriconnect_auth', JSON.stringify(parsed));
          }
        }
      } catch (err) {
        console.error("Failed to fetch fresh farmer profile for sidebar", err);
      }
    };

    loadFarmerUser();

    // Listen for storage events to update immediately if edited elsewhere
    window.addEventListener('storage', loadFarmerUser);

    return () => {
      window.removeEventListener('storage', loadFarmerUser);
    };
  }, []);

  const menuItems = [
    { id: 'home', label: t('farmerNav.home'), icon: Home },
    { id: 'crop', label: t('farmerNav.cropData'), icon: Sprout },
    { id: 'disease', label: t('farmerNav.disease'), icon: AlertTriangle },
    { id: 'notes', label: t('farmerNav.contactAdmin'), icon: MessageSquare },
    { id: 'reports', label: t('farmerNav.reports'), icon: FileText },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsOpen(false);
  };

  const displayName = userData.firstName || userData.lastName
    ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
    : t('common.farmer');

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-green-700 text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40
        w-64 bg-gradient-to-b from-green-800 to-green-700 text-white flex flex-col h-screen
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-green-600/30">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2 rounded-lg backdrop-blur-sm">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-semibold text-xl">AgriConnect</h1>
              <p className="text-xs text-green-200">{t('farmerNav.portal')}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-6 py-4 transition-all ${isActive
                  ? 'bg-green-600/50 text-white border-r-4 border-white'
                  : 'text-green-50 hover:bg-green-600/30'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Farmer Profile & Logout */}
        <div className="p-6 border-t border-green-600/30">
          {/* Farmer Profile Button */}
          <button
            onClick={() => handleNavigate('profile')}
            className="w-full flex items-center gap-3 mb-4 p-3 rounded-lg hover:bg-green-600/30 transition-all"
          >
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center overflow-hidden border-2 border-green-500">
              {userData?.image && !userData.image.includes('blank-profile') ? (
                <img src={userData.image} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-green-200 truncate">{userData?.email || t('common.member')}</p>
            </div>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 transition-all text-green-50 hover:bg-green-600/50 rounded-lg border border-green-600/30"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">{t('common.logout')}</span>
          </button>
        </div>
      </div>
    </>
  );
}