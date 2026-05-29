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
import { FloodMapModal } from './ui/FloodMapModal';

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
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
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
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-center min-h-[110px] animate-pulse">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                  <p className="text-xs text-gray-500">Checking flood gauges...</p>
                </div>
              </div>
            ) : !floodData?.locationConfigured ? (
              <div className="bg-slate-800 bg-linear-to-br from-slate-700 to-slate-800 rounded-2xl p-4 text-white border border-slate-600 shadow-lg">
                <Map className="w-6 h-6 md:w-8 md:h-8 mb-2 text-green-400" />
                <p className="text-xs md:text-sm font-bold tracking-wide mb-1 uppercase">Flood Alerts Offline</p>
                <p className="text-[11px] text-gray-300 mb-4 leading-normal">Set your coordinates to enable active localized flood tracking within a 10 km zone.</p>
                <button
                  onClick={() => setShowMapModal(true)}
                  className="w-full py-2.5 px-4 text-xs font-bold bg-white text-gray-800 hover:bg-green-50 active:scale-95 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 border border-white cursor-pointer hover:shadow-lg"
                >
                  <MapPin className="w-4 h-4 text-green-600 animate-bounce" />
                  <span>Pin Map Location</span>
                </button>
              </div>
            ) : floodData?.highestAlert ? (
              <div className={`relative p-4 text-white rounded-2xl shadow-lg border ${
                floodData.highestAlert.severity === 'EXTREME' || floodData.highestAlert.severity === 'SEVERE'
                  ? 'bg-red-800 bg-linear-to-br from-red-600 to-red-750 border-red-500 animate-pulse'
                  : 'bg-amber-600 bg-linear-to-br from-amber-500 to-amber-650 border-amber-500'
              }`}>
                <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 mb-2" />
                <p className="text-xs md:text-sm font-bold tracking-wide uppercase">
                  🚨 {floodData.highestAlert.severity} FLOOD THREAT
                </p>
                <p className="text-xs font-medium mt-1 leading-tight">{floodData.highestAlert.gaugeName}</p>
                <p className="text-[11px] text-gray-100 mt-1 font-semibold">
                  Distance: {floodData.highestAlert.distance} km away • Trend: {floodData.highestAlert.forecastTrend}
                </p>
                <button
                  onClick={() => setShowMapModal(true)}
                  className="mt-4 w-full py-2 px-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-[11px] text-white flex items-center justify-center gap-1.5 transition-all font-semibold border border-white/15 cursor-pointer shadow-sm"
                >
                  <Map className="w-3.5 h-3.5" />
                  Change Location
                </button>
              </div>
            ) : (
              <div className="bg-emerald-850 bg-linear-to-br from-emerald-800 to-emerald-900 rounded-2xl p-4 text-white border border-emerald-700 shadow-lg">
                <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 mb-2 text-green-300 animate-pulse" />
                <p className="text-xs md:text-sm font-semibold flex items-center gap-1.5">
                  🟢 Safe: No Floods Nearby
                </p>
                <p className="text-[11px] text-green-100 mt-1 leading-tight">
                  No active flood threats detected within 10 km of your selected tracking zone.
                </p>
                <button
                  onClick={() => setShowMapModal(true)}
                  className="mt-4 w-full py-2 px-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-[11px] text-white flex items-center justify-center gap-1.5 truncate transition-all font-semibold border border-white/15 cursor-pointer shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5 text-green-200" />
                  <span className="truncate">Change location ({floodData.locationName || `${floodData.latitude.toFixed(3)}, ${floodData.longitude.toFixed(3)}`})</span>
                </button>
              </div>
            )}
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