import { useState } from 'react';
import { toast } from 'sonner';
import { Lock, Mail, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router';
import { userAPI } from '../services/api';

interface LoginPageProps {
  onLogin?: (userType: 'farmer' | 'admin') => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'farmer' | 'admin'>('farmer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call the backend API to login, explicitly passing the selected userType
      const response = await userAPI.login({
        email,
        password,
        intendedRole: userType
      });

      // Store auth data in localStorage
      // We no longer need to fallback since the backend strictly validates the role
      const actualRole = response.user?.type || response.user?.role || userType;
      const mappedUserType = (actualRole === 'user') ? 'farmer' : actualRole;

      const authData = {
        userType: mappedUserType,
        email: response.user?.email || email,
        token: response.token,
        isAuthenticated: true,
        timestamp: new Date().toISOString(),
        userId: response.user?._id,
        firstName: response.user?.firstName,
        lastName: response.user?.lastName,
      };
      localStorage.setItem('agriconnect_auth', JSON.stringify(authData));
      
      // Initialize activity timestamp for inactivity timeout
      localStorage.setItem('lastActivityTime', Date.now().toString());

      toast.success('Login successful! Welcome back.');

      // Navigate based on user type
      if (mappedUserType === 'farmer') {
        navigate('/farmer/home');
      } else {
        navigate('/admin/dashboard');
      }

      // Call legacy onLogin if provided (for backwards compatibility)
      if (onLogin) {
        onLogin(mappedUserType as 'farmer' | 'admin');
      }
    } catch (err: any) {
      console.error('Login error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        fullError: err
      });

      let errorMessage = 'Failed to login. Please check your credentials and try again.';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please make sure the backend is running.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Background Image with Overlay */}
      <div
        className="hidden lg:flex flex-1 relative bg-cover bg-center"
        style={{ backgroundImage: `url(https://images.unsplash.com/photo-1701461497603-92d693136b00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyaWNlJTIwZmllbGQlMjBwYWRkeSUyMGZhcm0lMjBhZ3JpY3VsdHVyZXxlbnwxfHx8fDE3NzE0MzQxNzN8MA&ixlib=rb-4.1.0&q=80&w=1080)` }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-green-900/60"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            AGRICONNECT
          </h1>
          <p className="text-xl text-green-50 leading-relaxed max-w-lg">
            Empowering Sri Lankan farmers with data-driven insights and real-time disease and disaster monitoring
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
              <p className="text-green-600">Enter your credentials to access the dashboard</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Login As Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Login As
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleDropdown}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg text-left flex items-center justify-between hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <span className="text-gray-800 font-medium">
                      {userType === 'farmer' ? 'Farmer' : 'Admin / District Officer'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setUserType('farmer');
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-green-50 transition-colors ${userType === 'farmer' ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-800'
                          }`}
                      >
                        Farmer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserType('admin');
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-green-50 transition-colors ${userType === 'admin' ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-800'
                          }`}
                      >
                        Admin / District Officer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              {/* Removed inline error message to prevent duplication with sonner toast */}

              {/* Forgot Password */}
              <div className="text-right">
                <a href="#" className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center">
              <p className="text-sm text-green-600">
                Don't have an account?{' '}
                <a href="#" className="font-medium hover:text-green-700 transition-colors">
                  Contact your district officer
                </a>
              </p>
            </div>
          </div>

          {/* Ministry Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-green-700 font-medium">
              Department of Agriculture - Sri Lanka
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}