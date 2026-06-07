/**
 * Farmer Home Dashboard
 * Displays a personalized greeting, points summary, disease heat map,
 * and a dashboard summary.
 */
import { Star, HandIcon, SearchIcon, FileText, AlertTriangle, MapPin, ShieldCheck, Loader2, Map } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { userAPI, farmAPI, floodAPI } from '../services/api';
import { SummaryCard } from './SummaryCard';
import farmerImage from 'figma:asset/8d18ad2077654c1f65710d650ff192f7ba499f8c.png';
import { formatNumber } from '../utils/numberUtils';
import { EmailVerificationModal } from './ui/EmailVerificationModal';
import { FloodMapModal } from './ui/FloodMapModal';
import { DiseaseHeatMap } from './DiseaseHeatMap';

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
  const [floodData, setFloodData] = useState<any>(null);
  const [floodLoading, setFloodLoading] = useState<boolean>(true);
  const [showMapModal, setShowMapModal] = useState<boolean>(false);

  const outletContext = useOutletContext<{ onNavigate: (page: string) => void }>();
  const onNavigate = onNavigateProp || outletContext?.onNavigate || (() => { });

  const fetchFloodForecast = async () => {
    try {
      setFloodLoading(true);
      const data = await floodAPI.getNearbyFloods();
      setFloodData(data);
    } catch (err) {
      console.error("Failed to load flood forecast:", err);
    } finally {
      setFloodLoading(false);
    }
  };

  useEffect(() => {
    fetchFloodForecast();
  }, []);

  const handleLocationSelect = async (lat: number, lng: number, address: string) => {
    try {
      await userAPI.updateProfile({
        floodLatitude: lat,
        floodLongitude: lng,
        floodLocationName: address
      });
      const data = await userAPI.fetchProfile();
      if (data && data.user) {
        setUserProfile(data.user);
      }
      await fetchFloodForecast();
    } catch (err) {
      console.error("Error updating tracking location:", err);
    }
  };

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
            {/* Dynamic Flood Forecasting Widget */}
            {floodLoading ? (
              <div className="bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center animate-pulse" style={{ padding: '16px', minHeight: '100px' }}>
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                  <p className="text-xs text-gray-500">Checking flood gauges...</p>
                </div>
              </div>
            ) : !floodData?.locationConfigured ? (
              <div className="rounded-xl text-white border border-slate-700 shadow-lg overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #334155, #0f172a)', padding: '14px' }}>
                <Map className="w-6 h-6 mb-2 text-green-400" />
                <p className="font-bold tracking-wide uppercase" style={{ fontSize: '12px', marginBottom: '4px' }}>Flood Alerts Offline</p>
                <p className="text-gray-300" style={{ fontSize: '11px', lineHeight: '1.4', marginBottom: '12px' }}>Set your coordinates to enable active localized flood tracking within a 10 km zone.</p>
                <button
                  onClick={() => setShowMapModal(true)}
                  className="w-full text-xs font-bold bg-white text-gray-800 hover:bg-green-50 active:scale-95 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 border border-white cursor-pointer"
                  style={{ padding: '10px 14px' }}
                >
                  <MapPin className="w-4 h-4 text-green-600 animate-bounce" />
                  <span>Pin Map Location</span>
                </button>
              </div>
            ) : floodData?.highestAlert ? (
              <div className={`relative text-white rounded-xl shadow-lg border overflow-hidden ${floodData.highestAlert.severity === 'EXTREME' || floodData.highestAlert.severity === 'SEVERE' ? 'border-red-500 animate-pulse' : 'border-amber-600'}`}
                style={{
                  background: floodData.highestAlert.severity === 'EXTREME' || floodData.highestAlert.severity === 'SEVERE'
                    ? 'linear-gradient(to bottom right, #dc2626, #7f1d1d)'
                    : 'linear-gradient(to bottom right, #f59e0b, #b45309)',
                  padding: '14px'
                }}
              >
                <AlertTriangle className="w-6 h-6 mb-1" />
                <p className="font-bold tracking-wide uppercase" style={{ fontSize: '12px' }}>
                  🚨 {floodData.highestAlert.severity} FLOOD THREAT
                </p>
                <p className="font-medium truncate" style={{ fontSize: '12px', marginTop: '4px', lineHeight: '1.3' }}>{floodData.highestAlert.gaugeName}</p>
                <p className="font-semibold" style={{ fontSize: '11px', marginTop: '4px', color: 'rgba(255,255,255,0.85)' }}>
                  {floodData.highestAlert.distance} km away · Trend: {floodData.highestAlert.forecastTrend}
                </p>
                <button
                  onClick={() => setShowMapModal(true)}
                  className="w-full bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-white flex items-center justify-center gap-1.5 transition-all font-semibold border border-white/15 cursor-pointer"
                  style={{ marginTop: '12px', padding: '8px', fontSize: '11px' }}
                >
                  <Map className="w-3.5 h-3.5" />
                  Change Location
                </button>
              </div>
            ) : (
              <div className="rounded-xl text-white border border-emerald-800 shadow-lg overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #047857, #022c22)', padding: '14px' }}>
                <ShieldCheck className="w-6 h-6 mb-1 text-green-300 animate-pulse" />
                <p className="font-semibold flex items-center gap-1.5" style={{ fontSize: '12px' }}>
                  🟢 Safe: No Floods Nearby
                </p>
                <p className="text-green-100" style={{ fontSize: '11px', marginTop: '4px', lineHeight: '1.4' }}>
                  No active flood threats within 10 km of your tracking zone.
                </p>
                <button
                  onClick={() => setShowMapModal(true)}
                  className="w-full bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-white flex items-center justify-center gap-1.5 transition-all font-semibold border border-white/15 cursor-pointer"
                  style={{ marginTop: '12px', padding: '8px', fontSize: '11px' }}
                >
                  <MapPin className="w-3.5 h-3.5 text-green-200 flex-shrink-0" />
                  <span>Change Location</span>
                </button>
              </div>
            )}
            <div className="rounded-xl text-white relative" style={{ background: 'linear-gradient(to bottom right, #15803d, #166534)', padding: '12px 14px' }}>
              <div className="absolute top-2 right-2 bg-red-500 rounded-full flex items-center justify-center" style={{ width: '18px', height: '18px' }}>
                <span style={{ fontSize: '10px' }}>1</span>
              </div>
              <AlertTriangle className="w-6 h-6 mb-1" />
              <p className="font-medium" style={{ fontSize: '13px' }}>Possible Disease</p>
              <p style={{ fontSize: '13px' }}>Outbreak Nearby</p>
            </div>
          </div>
        </div>
        {/* Disease Heat Map */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 lg:col-span-2">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Disease Heat Map</h3>

          {/* Desktop layout: legend | map | advisory side by side */}
          <div className="hidden sm:flex gap-4">
            {/* Activity Scale */}
            <div className="flex flex-col justify-between text-xs text-gray-600 w-24 flex-shrink-0">
              <p className="text-gray-700 font-medium mb-2">Report Frequency</p>
              {[
                { color: 'bg-red-900', label: 'Critical' },
                { color: 'bg-red-700', label: 'Very High' },
                { color: 'bg-red-500', label: 'High' },
                { color: 'bg-orange-500', label: 'Elevated' },
                { color: 'bg-orange-400', label: 'Moderate' },
                { color: 'bg-yellow-400', label: 'Alert' },
                { color: 'bg-yellow-300', label: 'Warning' },
                { color: 'bg-yellow-200', label: 'Low' },
                { color: 'bg-green-300', label: 'Very Low' },
                { color: 'bg-green-200', label: 'None' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-6 h-3 ${color} rounded flex-shrink-0`}></div>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Map */}
            <div className="flex-1 relative bg-gray-50 rounded-lg overflow-hidden min-h-[280px] flex items-center justify-center">
              <DiseaseHeatMap />
            </div>

            {/* Advisory */}
            <div className="w-32 text-xs flex-shrink-0">
              <h4 className="font-semibold text-gray-800 mb-3">Advisory & Tips</h4>
              <ul className="space-y-2 text-gray-600">
                <li>Nearthy Leaf Blast</li>
                <li>Early morning humidity</li>
                <li>High Risk Zone</li>
              </ul>
            </div>
          </div>

          {/* Mobile layout: map full-width, compact legend below */}
          <div className="sm:hidden space-y-3">
            <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ minHeight: '220px' }}>
              <DiseaseHeatMap />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
              {[
                { color: 'bg-red-900', label: 'Critical' },
                { color: 'bg-red-700', label: 'Very High' },
                { color: 'bg-red-500', label: 'High' },
                { color: 'bg-orange-500', label: 'Elevated' },
                { color: 'bg-orange-400', label: 'Moderate' },
                { color: 'bg-yellow-400', label: 'Alert' },
                { color: 'bg-yellow-300', label: 'Warning' },
                { color: 'bg-yellow-200', label: 'Low' },
                { color: 'bg-green-300', label: 'Very Low' },
                { color: 'bg-green-200', label: 'None' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-5 h-2.5 ${color} rounded flex-shrink-0`}></div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <FloodMapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onLocationSelect={handleLocationSelect}
        initialLatitude={userProfile?.floodLatitude}
        initialLongitude={userProfile?.floodLongitude}
      />
    </div>
  );
}