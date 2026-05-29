/**
 * Farmer Home Dashboard
 * Displays a personalized greeting, points summary, disease heat map,
 * and a dashboard summary.
 */
import { Star, HandIcon, SearchIcon, FileText, AlertTriangle, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { userAPI, farmAPI } from '../services/api';
import { SummaryCard } from './SummaryCard';
import farmerImage from 'figma:asset/8d18ad2077654c1f65710d650ff192f7ba499f8c.png';
import { formatNumber } from '../utils/numberUtils';
import { EmailVerificationModal } from './ui/EmailVerificationModal';

// Hook used by Home dashboard (and others) to load summary metrics.
export function useHomeDashboardData() {
  const [totalFarmers, setTotalFarmers] = useState<number>(0);
  const [totalHarvest, setTotalHarvest] = useState<number>(0);
  const [yieldPerAcre, setYieldPerAcre] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        // fetch farms and count unique farmers
        const farmsResp = await farmAPI.getAllFarms();
        const farms = farmsResp?.farms || [];
        const uniqueFarmers = new Set(farms.map((f: any) => f.farmerNIC));
        const farmland = farms.reduce((sum: number, f: any) => {
          return sum + (f.farmSize || f.sizeInAcres || 0);
        }, 0);

        // fetch harvests to compute total harvest
        const harvestResp = await farmAPI.getHarvestHistory();
        const harvests = harvestResp?.harvests || [];
        const totalHarvestQty = harvests.reduce((sum: number, h: any) => {
          return sum + (h.harvestQty || 0);
        }, 0);

        setTotalFarmers(uniqueFarmers.size);
        setTotalHarvest(totalHarvestQty);
        setYieldPerAcre(farmland === 0 ? 0 : totalHarvestQty / farmland);
      } catch (err: any) {
        console.error('Error loading dashboard metrics', err);
        setError(err?.message || 'Failed to load metrics');
        setTotalFarmers(0);
        setTotalHarvest(0);
        setYieldPerAcre(0);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const formattedTotalFarmers = formatNumber(totalFarmers);
  const formattedTotalHarvest = formatNumber(totalHarvest);
  const formattedYieldPerAcre = formatNumber(yieldPerAcre);

  return {
    totalFarmers, totalHarvest, yieldPerAcre, loading, error,
    formattedTotalFarmers, formattedTotalHarvest, formattedYieldPerAcre
  };
}

interface HomePageProps {
  onNavigate?: (page: string) => void;
}

export function HomePage({ onNavigate: onNavigateProp }: HomePageProps) {
  // Dynamic User State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const outletContext = useOutletContext<{ onNavigate: (page: string) => void }>();
  const onNavigate = onNavigateProp || outletContext?.onNavigate || (() => { });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await userAPI.fetchProfile();
        if (data && data.user) {
          setUserProfile(data.user);
          // Show verification modal if email is not verified
          if (data.user.emailVerified === false) {
            setShowVerificationModal(true);
          }
        }
      } catch (error: any) {
        // Backend returned 403 emailUnverified (session consistency check)
        if (error?.response?.status === 403 && error?.response?.data?.emailUnverified) {
          setShowVerificationModal(true);
          // Store what the backend told us about the email if available
          if (error.response.data.email) {
            setUserProfile((prev: any) => ({ ...prev, email: error.response.data.email }));
          }
        } else {
          console.error("Failed to load user profile:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // use shared hook to load metrics (total farmers/harvest/yield) for dashboard
  const { totalFarmers, totalHarvest, yieldPerAcre, loading: metricsLoading, error: metricsError } = useHomeDashboardData();

  // metrics are not currently shown in HomePage UI but hook ensures data is fetched

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      {/* Email Verification Modal — blocks access for unverified farmers */}
      {showVerificationModal && (
        <EmailVerificationModal
          email={userProfile?.email || ''}
          firstName={userProfile?.firstName}
          onVerified={() => setShowVerificationModal(false)}
        />
      )}

      {/* Top Section - Welcome & Points */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">
                Welcome, {loading ? '...' : (userProfile?.firstName || 'Farmer')}
              </h2>
              <p className="text-xs md:text-sm text-gray-600">
                Account Status: <span className="text-cyan-600 font-medium">Active</span>
              </p>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                <span className="font-medium">Season:</span> {loading ? '...' : 'Maha'}
              </p>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                <span className="font-medium">Location:</span> {loading ? '...' : `${userProfile?.district || 'Unknown District'} / ${userProfile?.division || 'Unknown Division'}`}
              </p>
            </div>
            <img
              src={userProfile?.image || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'}
              alt="Farmer Profile"
              className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-gray-200"
            />
          </div>
        </div>

        {/* Points Summary Card */}
        <SummaryCard
          hoverable={false}
          className="w-full"
          title="Points Summary"
          subtext={
            <span className="text-xs text-teal-600 flex items-center gap-1">
              This season
            </span>
          }
        >
          <div className="flex items-center gap-3 md:gap-4 mb-4">
            <Star className="w-10 h-10 md:w-12 md:h-12 text-yellow-400 fill-yellow-400" />
            <div>
              <p className="text-xs md:text-sm text-gray-600">Total Points:</p>
              <p className="text-3xl md:text-4xl font-bold text-gray-800">
                {loading ? '...' : Math.round(Number(userProfile?.points) || 0)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs md:text-sm text-gray-600">Season: Maha</p>
            <p className="text-xs md:text-sm text-gray-600 mt-1">Points This Season</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">420</p>
          </div>
        </SummaryCard>
      </div>

      {/* Middle Section - Alerts & Heat Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Alerts & Warnings */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Alerts & Warnings</h3>
          <div className="space-y-3 md:space-y-4">
            <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-xl p-3 md:p-4 text-white">
              <HandIcon className="w-6 h-6 md:w-8 md:h-8 mb-2" />
              <p className="text-xs md:text-sm font-medium">Flood Risk Expected In</p>
              <p className="text-xs md:text-sm">in Your Area</p>
            </div>
            <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-xl p-3 md:p-4 text-white relative">
              <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs">1</span>
              </div>
              <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 mb-2" />
              <p className="text-xs md:text-sm font-medium">Possible Disease</p>
              <p className="text-xs md:text-sm">Outbreak Nearby</p>
            </div>
          </div>
        </div>

        {/* Disease Heat Map */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 lg:col-span-2">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Disease Heat Map</h3>
          <div className="flex gap-2 md:gap-4 overflow-x-auto">
            {/* Activity Scale */}
            <div className="flex flex-col justify-between text-xs text-gray-600 w-16 md:w-24 flex-shrink-0">
              <div>
                <p className="text-gray-700 font-medium mb-2">Report Frequency</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-red-900 rounded"></div>
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-red-700 rounded"></div>
                <span>Very High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-red-500 rounded"></div>
                <span>High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-orange-500 rounded"></div>
                <span>Elevated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-orange-400 rounded"></div>
                <span>Moderate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-yellow-400 rounded"></div>
                <span>Alert</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-yellow-300 rounded"></div>
                <span>Warning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-yellow-200 rounded"></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-green-300 rounded"></div>
                <span>Very Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-green-200 rounded"></div>
                <span>None</span>
              </div>
            </div>

            {/* Map Visualization */}
            <div className="flex-1 relative bg-gray-50 rounded-lg overflow-hidden min-h-[280px] flex items-center justify-center">
              <img src="/src/assets/sri_lanka_heatmap.png" alt="Sri Lanka Disease Heatmap" className="w-full h-full object-contain mix-blend-multiply opacity-90" />
            </div>

            {/* Advisory */}
            <div className="w-32 text-xs">
              <h4 className="font-semibold text-gray-800 mb-3">Advisory & Tips</h4>
              <ul className="space-y-2 text-gray-600">
                <li>Nearthy Leaf Blast</li>
                <li>Early morning humidity</li>
                <li>High Risk Zone</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}