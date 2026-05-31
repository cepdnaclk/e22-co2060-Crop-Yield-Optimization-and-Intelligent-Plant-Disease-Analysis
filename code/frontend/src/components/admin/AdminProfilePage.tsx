import { User, Mail, Phone, MapPin, Calendar, Save, Edit2, Shield, Loader, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import { toast } from 'sonner';

export function AdminProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'admin',
    address: '',
    district: '',
    division: '',
    createdAt: new Date().toISOString(),
    image: '',
  });

  const districts = [
    'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota',
    'Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale',
    'Matara','Monaragala','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userAPI.fetchProfile();
      if (data && data.user) {
        setFormData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          role: data.user.role || 'admin',
          address: data.user.address || '',
          district: data.user.district || '',
          division: data.user.division || '',
          createdAt: data.user.createdAt || new Date().toISOString(),
          image: data.user.image || '',
        });
      }
    } catch (error) {
      console.error("Failed to load admin profile:", error);
      setError('Failed to load profile data');
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        district: formData.district,
        division: formData.division,
      };

      const response = await userAPI.updateProfile(updateData);

      // Update local storage if the user profile was updated
      const authData = localStorage.getItem('agriconnect_auth');
      if (authData && response.user) {
        try {
          const parsed = JSON.parse(authData);
          parsed.user = { ...parsed.user, ...response.user };
          localStorage.setItem('agriconnect_auth', JSON.stringify(parsed));
          // Dispatch a custom event so the sidebar can update immediately
          window.dispatchEvent(new Event('storage'));
        } catch (e) {
          console.error("Failed to update local storage auth data", e);
        }
      }

      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error("Failed to update profile", error);
      toast.error('Failed to save changes');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const fullName = `${formData.firstName} ${formData.lastName}`.trim() || 'Admin User';

  return (
    <div className="max-w-4xl space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/30 overflow-hidden">
            {formData.image && !formData.image.includes('blank-profile') ? (
              <img src={formData.image} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-12 h-12" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-white text-3xl font-semibold mb-2">{fullName}</h1>
            <p className="text-green-100 mb-1 capitalize">{formData.role}</p>
            <span className="inline-flex px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
              Active Administrator
            </span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <h2 className="text-gray-800 mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-green-600" />
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">First Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-800 font-medium">{formData.firstName || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Last Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-800 font-medium">{formData.lastName || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <p className="text-gray-800 font-medium">{formData.email}</p>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </label>
            <p className="text-gray-800 font-medium">{formData.phone}</p>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Member Since
            </label>
            <p className="text-gray-800 font-medium">
              {new Date(formData.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Location Information */}
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <h2 className="text-gray-800 mb-6 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          Location Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600 mb-1 block">Address</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-800 font-medium">{formData.address || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">District</label>
            {isEditing ? (
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                <option value="">Select a District</option>
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            ) : (
              <p className="text-gray-800 font-medium">{formData.district || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">DS Division</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-800 font-medium">{formData.division || 'N/A'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Role Information */}
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <h2 className="text-gray-800 mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          Role & Permissions
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Role</label>
            <p className="text-gray-800 font-medium capitalize">{formData.role}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-green-800 text-sm">
              <strong>Access Level:</strong> Full administrative access to manage farmers,
              harvest data, reports, and system settings.
            </p>
          </div>
        </div>
      </div>
    </div >
  );
}
