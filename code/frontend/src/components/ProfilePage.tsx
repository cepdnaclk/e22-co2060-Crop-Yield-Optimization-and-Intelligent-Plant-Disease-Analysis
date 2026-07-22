/**
 * Farmer Profile Page
 * Fetches and displays the authenticated user's personal details,
 * contact information, and assigned district officer data.
 * Fully mobile-responsive.
 */
import { User, MapPin, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { userAPI } from '../services/api';
import { translateDistrict, translateDivision } from '../utils/locationTranslations';

interface FarmerProfile {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  division: string;
  createdAt?: string;
  nic: string;
}

export function ProfilePage() {
  const { i18n } = useTranslation();
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const getProfile = async () => {
      try {
        const response = await userAPI.fetchProfile();
        setProfile(response.user);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    getProfile();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-sm text-gray-500">Loading profile data...</div>;
  }

  if (error || !profile) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm">
        {error || 'Profile not found'}
      </div>
    );
  }

  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  const regDate = profile.createdAt ? new Date(profile.createdAt) : new Date();

  return (
    <div className="max-w-4xl space-y-4 md:space-y-6 stagger-children">
      {/* Profile Header */}
      <div className="rounded-2xl p-5 md:p-8 text-white relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #059669 0%, #047857 40%, #0d9488 100%)',
        boxShadow: '0 8px 32px rgba(5, 150, 105, 0.25), 0 4px 12px rgba(0,0,0,0.1)',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20px', right: '100px', width: '90px', height: '90px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '20px', right: '180px', width: '50px', height: '50px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6 relative" style={{ zIndex: 1 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: '-4px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))',
            }} />
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0" style={{ border: '3px solid rgba(255,255,255,0.4)', position: 'relative' }}>
              <User className="w-10 h-10 md:w-12 md:h-12" />
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-white text-2xl md:text-3xl font-semibold mb-1" style={{ letterSpacing: '-0.02em' }}>{fullName || 'Farmer'}</h1>
            <p className="text-green-100 mb-2 text-sm" style={{ opacity: 0.85 }}>NIC: {profile.nic || 'N/A'}</p>
            <span className="inline-flex px-4 py-1.5 rounded-full text-sm font-medium" style={{
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              ✓ Active Member
            </span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl p-5 md:p-8 card-hover accent-border-green" style={{
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #10b981',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <h2 className="text-gray-800 mb-4 md:mb-6 flex items-center gap-2 text-base md:text-lg font-semibold">
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User className="w-4 h-4 text-green-600" />
          </div>
          Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 block font-medium">Full Name</label>
            <p className="text-gray-800 font-medium text-sm md:text-base">{fullName}</p>
          </div>
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 block font-medium">NIC</label>
            <p className="text-gray-800 font-medium text-sm md:text-base break-all">{profile.nic}</p>
          </div>
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5" />
              Phone Number
            </label>
            <p className="text-gray-800 font-medium text-sm md:text-base">{profile.phone || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </label>
            <p className="text-gray-800 font-medium text-sm md:text-base break-all">{profile.email || 'N/A'}</p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs md:text-sm text-gray-500 mb-1 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              Registered Date
            </label>
            <p className="text-gray-800 font-medium text-sm md:text-base">
              {regDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Location Information */}
      <div className="bg-white rounded-2xl p-5 md:p-8 card-hover" style={{
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #3b82f6',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <h2 className="text-gray-800 mb-4 md:mb-6 flex items-center gap-2 text-base md:text-lg font-semibold">
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          Location Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="sm:col-span-2">
            <label className="text-xs md:text-sm text-gray-500 mb-1 block font-medium">Address</label>
            <p className="text-gray-800 font-medium text-sm md:text-base">{profile.address || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 block font-medium">Division</label>
            <p className="text-gray-800 font-medium text-sm md:text-base">{translateDivision(profile.division, i18n.language as 'en' | 'si') || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 block font-medium">District</label>
            <p className="text-gray-800 font-medium text-sm md:text-base">{translateDistrict(profile.district, i18n.language as 'en' | 'si') || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Assigned Officer */}
      <div className="bg-white rounded-2xl p-5 md:p-8 card-hover" style={{
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #f59e0b',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <h2 className="text-gray-800 mb-4 md:mb-6 flex items-center gap-2 text-base md:text-lg font-semibold">
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User className="w-4 h-4 text-amber-600" />
          </div>
          Assigned District Officer
        </h2>
        <div className="flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl" style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1px solid #bbf7d0',
        }}>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{
            background: 'linear-gradient(135deg, #bbf7d0, #86efac)',
          }}>
            <User className="w-5 h-5 md:w-6 md:h-6 text-green-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-800 font-medium mb-1 text-sm md:text-base">
              District Office: {translateDistrict(profile.district, i18n.language as 'en' | 'si') || 'N/A'}
            </h3>
            <p className="text-gray-600 text-xs md:text-sm mb-1">
              Contact your local agrarian service center for updates to your profile.
            </p>
            <p className="text-gray-600 text-xs md:text-sm">
              Your officer manages crop data entry and provides agricultural guidance.
            </p>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="rounded-xl p-3 md:p-4 flex items-start gap-3" style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '1px solid #93c5fd',
        borderLeft: '4px solid #3b82f6',
      }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
          <FileText className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <p className="text-blue-800 text-xs md:text-sm">
          <strong>Note:</strong> To update any profile information, please contact your district officer
          or visit your nearest agricultural office.
        </p>
      </div>
    </div>
  );
}