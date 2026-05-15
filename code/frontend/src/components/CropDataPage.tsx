import { Download, Layers, MapPin, Wheat, TrendingUp, Calendar, Loader, RefreshCw } from 'lucide-react';
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
  const [sortBy, setSortBy] = useState<'newest' | 'highestYield'>('newest');
  const [selectedHarvestIds, setSelectedHarvestIds] = useState<string[]>([]);

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
      .filter((record) => (selectedCrop ? record.crop === selectedCrop : true));
  }, [flatHarvests, selectedYear, selectedSeason, selectedCrop]);

  const displayedHarvests = useMemo(() => {
    return [...filteredHarvests].sort((a, b) => {
      if (sortBy === 'highestYield') {
        return (b.harvestQty || 0) - (a.harvestQty || 0);
      }

      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
    });
  }, [filteredHarvests, sortBy]);

  useEffect(() => {
    setSelectedHarvestIds((currentSelection) =>
      currentSelection.filter((id) => filteredHarvests.some((record) => record._id === id)),
    );
  }, [filteredHarvests]);

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

  const selectedVisibleHarvests = displayedHarvests.filter((record) => selectedHarvestIds.includes(record._id));

  const handleToggleHarvestSelection = (harvestId: string) => {
    setSelectedHarvestIds((currentSelection) =>
      currentSelection.includes(harvestId)
        ? currentSelection.filter((id) => id !== harvestId)
        : [...currentSelection, harvestId],
    );
  };

  const handleExportCsv = () => {
    if (selectedVisibleHarvests.length === 0) {
      return;
    }

    const escapeCsvValue = (value: string | number | null | undefined) => {
      const normalizedValue = value === null || value === undefined ? '' : String(value);
      return `"${normalizedValue.replace(/"/g, '""')}"`;
    };

    const csvRows = [
      ['Season', 'Year', 'Farm', 'Location', 'Crop', 'Acres', 'Harvest Qty (kg)', 'Points Earned', 'Date Recorded'],
      ...selectedVisibleHarvests.map((record) => [
        record.season,
        record.year,
        record.farmName,
        record.location,
        record.crop,
        record.acres,
        record.harvestQty,
        record.pointsEarned ?? '',
        new Date(record.createdDate).toLocaleDateString(),
      ]),
    ];

    const csvContent = csvRows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = downloadUrl;
    downloadLink.download = 'crop-data-export.csv';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);
  };

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
            className="flex min-w-[140px] items-center justify-center gap-2 rounded-full border border-green-100 bg-green-50 px-8 py-2 text-sm font-semibold text-green-700 shadow-sm transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-green-600 ${refreshingPoints ? 'animate-spin' : ''}`} />
            {refreshingPoints ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6" style={{ marginTop: 0 }}>
        <div
          className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', borderRadius: '14px', padding: '16px 20px' }}
        >
          <div className="flex flex-col">
            <div className="flex items-center">
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#C8E6C9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <Wheat className="w-5 h-5 text-green-700 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Yield</p>
            <div className="flex min-w-0 flex-wrap items-baseline gap-1 sm:gap-2 my-2">
              <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words min-w-0">{totalYieldTons.toFixed(1)}</p>
              <span className="text-xs sm:text-sm font-medium text-gray-600 break-words">tons</span>
            </div>
            <p className="text-xs sm:text-sm text-green-700 flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              Filtered harvest output
            </p>
          </div>
        </div>

        <div
          className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', borderRadius: '14px', padding: '16px 20px' }}
        >
          <div className="flex flex-col">
            <div className="flex items-center">
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <Layers className="w-5 h-5 text-lime-700 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Acres</p>
            <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-gray-900 my-2 break-words min-w-0">{totalAcres.toFixed(1)}</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">Cultivated land in the filtered set</p>
          </div>
        </div>

        <div
          className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', borderRadius: '14px', padding: '16px 20px' }}
        >
          <div className="flex flex-col">
            <div className="flex items-center">
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#D5F5E3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <TrendingUp className="w-5 h-5 text-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Avg Yield/Acre</p>
            <div className="flex min-w-0 flex-wrap items-baseline gap-1 sm:gap-2 my-2">
              <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words min-w-0">{avgYieldPerAcre.toFixed(2)}</p>
              <span className="text-xs sm:text-sm font-medium text-gray-600 break-words">t/ac</span>
            </div>
            <p className="text-xs sm:text-sm text-green-700 flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              Average yield efficiency
            </p>
          </div>
        </div>

        <div
          className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', borderRadius: '14px', padding: '16px 20px' }}
        >
          <div className="flex flex-col">
            <div className="flex items-center">
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <Calendar className="w-5 h-5 text-green-600 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Records</p>
            <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-gray-900 my-2 break-words min-w-0">{totalRecords}</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">Harvest entries in view</p>
          </div>
        </div>
      </div>

      {/* Cultivation Records */}
      <div className="rounded-xl bg-[#f9fafb]">
        <div className="p-4 md:p-6 border-b border-transparent space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>
                Cultivation Records
              </h3>
              <span style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', border: '0.5px solid #e5e7eb', borderRadius: 20, padding: '3px 10px' }}>
                {displayedHarvests.length} records
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="crop-record-sort" style={{ fontSize: 13, color: '#6b7280', marginRight: 6 }}>Sort by</label>

                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <select
                    id="crop-record-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'highestYield')}
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: '#ffffff',
                      border: '0.5px solid #d1d5db',
                      borderRadius: 8,
                      padding: '5px 30px 5px 10px',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#111827',
                    }}
                  >
                    <option value="newest">Newest</option>
                    <option value="highestYield">Highest Yield</option>
                  </select>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', right: 8, pointerEvents: 'none' }} aria-hidden>
                    <path d="M6 9l6 6 6-6" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {selectedVisibleHarvests.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCsv}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#2d6a4f',
                    color: '#ffffff',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '8px 12px',
                    transition: 'background-color 0.2s ease',
                    border: 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#1a4731';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#2d6a4f';
                  }}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {displayedHarvests.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No harvest records found.</p>
          ) : (
            <div className="space-y-4">
              {displayedHarvests.map((record) => (
              <div
                key={record._id}
                className={`overflow-hidden rounded-[22px] bg-white transition-[box-shadow,transform] duration-200 ease-in-out hover:-translate-y-[2px] hover:shadow-[0_6px_24px_rgba(0,0,0,0.09)] ${
                  selectedHarvestIds.includes(record._id) ? 'ring-2 ring-green-200' : ''
                }`}
                style={{
                  border: '0.5px solid #e5e7eb',
                  borderLeft: '3px solid #2d6a4f',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  backgroundColor: '#ffffff',
                }}
              >
                <div className="flex flex-col justify-between gap-3 border-b sm:flex-row sm:items-center" style={{ borderBottom: '0.5px solid #f0f0f0', padding: '16px 20px 14px' }}>
                  <div className="flex items-center" style={{ gap: 10 }}>
                    <h4 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: 0 }}>
                      {record.season} {record.year}
                    </h4>

                    <span
                      className="inline-flex items-center"
                      style={{ background: '#e8f5e9', color: '#2d6a4f', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, gap: 5 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 2C10.34 2 8.8 2.5 7.5 3.36C6.2 4.23 5.24 5.46 4.78 6.94C4.32 8.42 4.39 9.98 5.08 11.5C5.77 13.02 6.95 14.38 8.45 15.12C9.95 15.86 11.66 15.93 13.2 15.31C14.74 14.69 15.98 13.48 16.7 11.95C17.42 10.42 17.46 8.71 16.8 7.18C16.14 5.65 14.85 4.47 13.3 3.86C12.68 3.64 12.34 3.52 12 3.5V2Z" fill="#2d6a4f"/>
                        <path d="M5 20C5 17.79 6.79 16 9 16H15C17.21 16 19 17.79 19 20V21H5V20Z" fill="#2d6a4f"/>
                      </svg>
                      <span>Farm: {record.farmName}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-start">
                    <span
                      className="inline-flex items-center"
                      style={{
                        background: '#dcfce7',
                        color: '#16a34a',
                        fontWeight: 600,
                        padding: '5px 12px',
                        borderRadius: 20,
                        fontSize: 11,
                        border: '0.5px solid #86efac',
                        gap: 4,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="#16a34a" />
                      </svg>
                      <span>Verified</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleHarvestSelection(record._id)}
                      aria-pressed={selectedHarvestIds.includes(record._id)}
                      style={{
                        background: selectedHarvestIds.includes(record._id) ? '#2d6a4f' : '#ffffff',
                        color: selectedHarvestIds.includes(record._id) ? '#ffffff' : '#6b7280',
                        border: selectedHarvestIds.includes(record._id) ? '0.5px solid #2d6a4f' : '0.5px solid #d1d5db',
                        borderRadius: 20,
                        padding: '5px 12px',
                        fontSize: 11,
                        fontWeight: 500,
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedHarvestIds.includes(record._id)) {
                          (e.currentTarget as HTMLButtonElement).style.background = '#2d6a4f';
                          (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#2d6a4f';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedHarvestIds.includes(record._id)) {
                          (e.currentTarget as HTMLButtonElement).style.background = '#2d6a4f';
                          (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#2d6a4f';
                        } else {
                          (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                          (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db';
                        }
                      }}
                    >
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded ${
                          selectedHarvestIds.includes(record._id) ? 'bg-[#2d6a4f] text-white border border-[#2d6a4f]' : 'bg-white text-[#6b7280] border border-[#d1d5db]'
                        }`}
                        aria-hidden="true"
                        style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}
                      >
                        {selectedHarvestIds.includes(record._id) ? '✓' : ''}
                      </span>
                      <span>Select</span>
                    </button>
                  </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', background: '#f8fdf9' }}>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    <div className="relative px-4 py-3.5">
                      <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-gray-400">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 2v3M16 2v3M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        Date Recorded
                      </p>
                      <p className="text-[15px] font-semibold text-gray-900">{new Date(record.createdDate).toLocaleDateString()}</p>
                    </div>
                    <div className="relative px-4 py-3.5 before:absolute before:left-0 before:top-[14px] before:bottom-[14px] before:w-px before:bg-[#e5e7eb]">
                      <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-gray-400">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-5.69 7-11a7 7 0 1 0-14 0c0 5.31 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8"/></svg>
                        Location
                      </p>
                      <p className="text-[15px] font-semibold text-gray-900">{record.location}</p>
                    </div>
                    <div className="relative px-4 py-3.5 before:absolute before:left-0 before:top-[14px] before:bottom-[14px] before:w-px before:bg-[#e5e7eb]">
                      <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-gray-400">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        Acres Cultivated
                      </p>
                      <p className="text-[15px] font-semibold text-gray-900">{record.acres} acres</p>
                    </div>
                    <div className="relative px-4 py-3.5 before:absolute before:left-0 before:top-[14px] before:bottom-[14px] before:w-px before:bg-[#e5e7eb]">
                      <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-gray-400">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20c0-5-4-9-9-9 0 5 4 9 9 9Zm0 0c0-5 4-9 9-9 0 5-4 9-9 9Zm0 0V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        Paddy Variety
                      </p>
                      <p className="text-[15px] font-semibold text-gray-900">{record.crop}</p>
                    </div>
                    <div className="relative bg-[#f0fdf4] px-4 py-3.5 before:absolute before:left-0 before:top-[14px] before:bottom-[14px] before:w-px before:bg-[#e5e7eb]">
                      <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-gray-400">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v18M6 8h12M8 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        Harvested Yield
                      </p>
                      <p className="text-[16px] font-semibold text-green-600">{(record.harvestQty / 1000).toFixed(2)} tons</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between" style={{ borderTop: '0.5px solid #f0f0f0', padding: '12px 20px' }}>
                    <div className="flex items-center gap-2">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 2l2.09 4.24L18.6 7l-3.3 2.9.98 4.55L12 11.9 7.72 14.45 8.7 9.9 5.4 7l4.51-.76L12 2z" fill="#fbbf24"/>
                        <circle cx="12" cy="17" r="3" fill="#f59e0b" />
                      </svg>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', margin: 0 }}>Points Earned</p>
                    </div>

                    {record.pointsEarned === null || record.pointsEarned === undefined ? (
                      <span
                        style={{
                          background: '#fffbeb',
                          border: '0.5px solid #fcd34d',
                          color: '#b45309',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '5px 13px',
                          borderRadius: 20,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M6 2v6h.01L12 13l6-5V2H6z" fill="#f59e0b" />
                          <path d="M6 22h12v-2H6v2z" fill="#f59e0b" />
                        </svg>
                        <span>Pending review</span>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff7ed', padding: '6px 14px', borderRadius: 20, fontWeight: 700, color: '#b45309' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" fill="#f59e0b" />
                          <path d="M12 7v6l3 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ color: '#92400e' }}>{Math.round(record.pointsEarned)} points</span>
                      </span>
                    )}
                  </div>
                </div>
            ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}