/**
 * Farmer Profile Page
 * Fetches and displays the authenticated user's personal details,
 * contact information, and assigned district officer data.
 * Fully mobile-responsive.
 */
import { User, MapPin, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';

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
    <div className="max-w-4xl space-y-4 md:space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-5 md:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/30 flex-shrink-0">
            <User className="w-10 h-10 md:w-12 md:h-12" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-white text-2xl md:text-3xl font-semibold mb-1">{fullName || 'Farmer'}</h1>
            <p className="text-green-100 mb-2 text-sm">NIC: {profile.nic || 'N/A'}</p>
            <span className="inline-flex px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
              Active Member
            </span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl shadow-sm p-5 md:p-8 border border-gray-100">
        <h2 className="text-gray-800 mb-4 md:mb-6 flex items-center gap-2 text-base md:text-lg font-semibold">
          <User className="w-5 h-5 text-green-600" />
          Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 block">Full Name</label>
            <p className="text-gray-800 font-medium text-sm md:text-base">{fullName}</p>
          </div>
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 block">NIC</label>
            <p className="text-gray-800 font-medium text-sm md:text-base break-all">{profile.nic}</p>
          </div>
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Phone Number
            </label>
            <p className="text-gray-800 font-medium text-sm md:text-base">{profile.phone || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </label>
            <p className="text-gray-800 font-medium text-sm md:text-base break-all">{profile.email || 'N/A'}</p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs md:text-sm text-gray-500 mb-1 flex items-center gap-1.5">
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
      <div className="bg-white rounded-2xl shadow-sm p-5 md:p-8 border border-gray-100">
        <h2 className="text-gray-800 mb-4 md:mb-6 flex items-center gap-2 text-base md:text-lg font-semibold">
          <MapPin className="w-5 h-5 text-green-600" />
          Location Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="sm:col-span-2">
            <label className="text-xs md:text-sm text-gray-500 mb-1 block">Address</label>
            <p className="text-gray-800 font-medium text-sm md:text-base">{profile.address || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 block">Division</label>
            <p className="text-gray-800 font-medium text-sm md:text-base">{profile.division || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs md:text-sm text-gray-500 mb-1 block">District</label>
            <p className="text-gray-800 font-medium text-sm md:text-base">{profile.district || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Assigned Officer */}
      <div className="bg-white rounded-2xl shadow-sm p-5 md:p-8 border border-gray-100">
        <h2 className="text-gray-800 mb-4 md:mb-6 text-base md:text-lg font-semibold">Assigned District Officer</h2>
        <div className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 md:w-6 md:h-6 text-green-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-800 font-medium mb-1 text-sm md:text-base">
              District Office: {profile.district || 'N/A'}
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
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4">
        <p className="text-blue-800 text-xs md:text-sm">
          <strong>Note:</strong> To update any profile information, please contact your district officer
          or visit your nearest agricultural office.
        </p>
      </div>
    </div>
  );
}