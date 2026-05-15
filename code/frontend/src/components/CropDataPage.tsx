import { MapPin, Wheat, TrendingUp, Calendar, Loader, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { farmAPI, userAPI } from '../services/api';

interface HarvestDetail {
  _id: string;
  season: string;
  year: string | number;
  harvestQty: number;
  pointsEarned?: number | null;
  createdDate: string;
}

interface FarmWithHarvests {
  _id: string;
  farmName: string;
  location: string;
  crop: string;
  farmSize: number;
  harvests: HarvestDetail[];
}

export function CropDataPage() {
  const [farms, setFarms] = useState<FarmWithHarvests[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingPoints, setRefreshingPoints] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');

  useEffect(() => {
    fetchMyFarms();
  }, []);

  const fetchMyFarms = async () => {
    try {
      setLoading(true);
      // Fetch the currently logged-in user's profile to get their NIC
      const profileData = await userAPI.fetchProfile();
      const userNic = profileData?.user?.nic;

      if (!userNic) {
        throw new Error("Could not find user NIC to filter farms.");
      }

      // Fetch all farms and filter down to just this farmer's farms
      const data = await farmAPI.getAllFarms();
      const allFarms = data.farms || [];
      const myFarms = allFarms.filter((farm: any) => farm.farmerNIC === userNic);

      setFarms(myFarms);
    } catch (err: any) {
      console.error("Failed to load crop data:", err);
      setError("Failed to load your cultivation records.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPoints = async () => {
    try {
      setRefreshingPoints(true);
      await farmAPI.recalculatePoints();
      // Refetch user profile to get the updated global points, and refetch farms
      await fetchMyFarms();
      // In a real app we might want to also trigger a global auth config update here if the navbar needs it
    } catch (err) {
      console.error("Failed to refresh points", err);
    } finally {
      setRefreshingPoints(false);
    }
  };

  const flatHarvests = useMemo(
    () =>
      farms.flatMap((farm) =>
        (farm.harvests || []).map((harvest) => ({
          ...harvest,
          farmId: farm._id,
          farmName: farm.farmName,
          location: farm.location,
          crop: farm.crop,
          acres: farm.farmSize,
        })),
      ),
    [farms],
  );

  const filterOptions = useMemo(() => {
    const years = Array.from(new Set(flatHarvests.map((record) => String(record.year)))).sort((a, b) => Number(b) - Number(a));
    const seasons = Array.from(new Set(flatHarvests.map((record) => record.season))).sort();
    const crops = Array.from(new Set(flatHarvests.map((record) => record.crop))).sort();

    return { years, seasons, crops };
  }, [flatHarvests]);

  const filteredHarvests = useMemo(() => {
    return flatHarvests
      .filter((record) => (selectedYear ? String(record.year) === selectedYear : true))
      .filter((record) => (selectedSeason ? record.season === selectedSeason : true))
      .filter((record) => (selectedCrop ? record.crop === selectedCrop : true))
      .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  }, [flatHarvests, selectedYear, selectedSeason, selectedCrop]);

  const filteredFarms = useMemo(() => {
    const farmsById = new Map<string, FarmWithHarvests>();

    filteredHarvests.forEach((record) => {
      const matchingFarm = farms.find((farm) => farm._id === record.farmId);

      if (matchingFarm) {
        farmsById.set(matchingFarm._id, matchingFarm);
      }
    });

    return Array.from(farmsById.values());
  }, [farms, filteredHarvests]);

  const totalYield = filteredHarvests.reduce((sum, record) => sum + (record.harvestQty || 0), 0);
  const totalAcres = filteredFarms.reduce((sum, farm) => sum + (farm.farmSize || 0), 0);
  const totalRecords = filteredHarvests.length;
  const avgYieldPerAcre = totalAcres > 0 ? (totalYield / 1000) / totalAcres : 0;
  const totalYieldTons = totalYield / 1000;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filter Toolbar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFEF7 100%)',
          border: '1px solid #FDE68A',
          borderRadius: '14px',
          padding: '20px 24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  padding: '10px 14px',
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#111827',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <option value="">All Years</option>
                {filterOptions.years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>Season</label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                style={{
                  padding: '10px 14px',
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#111827',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <option value="">All Seasons</option>
                {filterOptions.seasons.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>Crop</label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                style={{
                  padding: '10px 14px',
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#111827',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <option value="">All Crops</option>
                {filterOptions.crops.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleRefreshPoints}
            disabled={refreshingPoints}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshingPoints ? 'animate-spin' : ''}`} />
            {refreshingPoints ? 'Recalculating...' : 'Refresh Points'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-xs md:text-sm mb-1">Total Yield</p>
              <p className="text-2xl md:text-4xl font-bold text-gray-900">{totalYieldTons.toFixed(1)} <span className="text-sm md:text-lg font-normal text-gray-600">tons</span></p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wheat className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-xs md:text-sm mb-1">Total Acres</p>
              <p className="text-2xl md:text-4xl font-bold text-gray-900">{totalAcres.toFixed(1)}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-xs md:text-sm mb-1">Avg Yield/Acre</p>
              <p className="text-2xl md:text-4xl font-bold text-gray-900">{avgYieldPerAcre.toFixed(2)} <span className="text-sm md:text-lg font-normal text-gray-600">t/ac</span></p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-xs md:text-sm mb-1">Total Records</p>
              <p className="text-2xl md:text-4xl font-bold text-gray-900">{totalRecords}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Cultivation Records */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-800">Cultivation Records</h3>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {filteredHarvests.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No harvest records found.</p>
          ) : (
            filteredHarvests.map((record) => (
              <div key={record._id} className="border border-gray-200 rounded-xl p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-2">
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-gray-800 mb-1">{record.season} {record.year}</h4>
                    <p className="text-xs md:text-sm text-gray-600">Farm: {record.farmName}</p>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs md:text-sm font-medium w-fit">
                    Verified
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Date Recorded</p>
                    <p className="text-xs md:text-sm font-medium text-gray-800">{new Date(record.createdDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Location</p>
                    <p className="text-xs md:text-sm font-medium text-gray-800">{record.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Acres Cultivated</p>
                    <p className="text-xs md:text-sm font-medium text-gray-800">{record.acres} acres</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Paddy Variety</p>
                    <p className="text-xs md:text-sm font-medium text-gray-800">{record.crop}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Harvested Yield</p>
                    <p className="text-xs md:text-sm font-medium text-gray-800">{(record.harvestQty / 1000).toFixed(2)} tons</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs md:text-sm text-gray-600">Points Earned</p>
                    <p className="text-lg md:text-xl font-bold text-green-600">
                      {record.pointsEarned === null || record.pointsEarned === undefined
                        ? 'Pending'
                        : `+${Math.round(record.pointsEarned)} points`}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}