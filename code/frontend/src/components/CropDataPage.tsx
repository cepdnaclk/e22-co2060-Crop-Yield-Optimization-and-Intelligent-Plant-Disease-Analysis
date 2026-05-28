import { Download, Layers, MapPin, Wheat, TrendingUp, Calendar, Loader, RefreshCw, BarChart3, Sprout } from 'lucide-react';
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
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader className="w-8 h-8 animate-spin text-green-600" />
        <p style={{ fontSize: '14px', color: '#6B7280' }}>Loading your cultivation data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#FEF2F2', color: '#DC2626', borderRadius: '14px', border: '1px solid #FECACA', fontSize: '14px' }}>
        {error}
      </div>
    );
  }

  const filterSelectStyle = {
    padding: '9px 14px', background: 'white', border: '1.5px solid #E5E7EB',
    borderRadius: '10px', fontSize: '13px', fontWeight: 500 as const, color: '#111827',
    cursor: 'pointer', transition: 'border-color 0.2s', minWidth: '130px',
  };

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div style={{ background: 'linear-gradient(135deg, #065F46 0%, #047857 50%, #059669 100%)', borderRadius: '16px', padding: '26px 30px', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20px', right: '100px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '46px', height: '46px', background: 'rgba(255,255,255,0.15)', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
              <Sprout style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '21px', fontWeight: '700', margin: 0 }}>My Crop Data</h2>
              <p style={{ fontSize: '13px', opacity: 0.85, margin: '2px 0 0' }}>Track your cultivation records, yields & performance</p>
            </div>
          </div>
          <button
            onClick={handleRefreshPoints}
            disabled={refreshingPoints}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 20px', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: refreshingPoints ? 'not-allowed' : 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.2s', opacity: refreshingPoints ? 0.7 : 1 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshingPoints ? 'animate-spin' : ''}`} />
            {refreshingPoints ? 'Refreshing...' : 'Refresh Points'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <BarChart3 style={{ width: '18px', height: '18px', color: '#6B7280' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginRight: '4px' }}>Filters</span>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={filterSelectStyle}>
            <option value="">All Years</option>
            {filterOptions.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} style={filterSelectStyle}>
            <option value="">All Seasons</option>
            {filterOptions.seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)} style={filterSelectStyle}>
            <option value="">All Crops</option>
            {filterOptions.crops.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
        {/* Total Yield */}
        <div className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', borderRadius: '16px', padding: '18px 20px', border: '1px solid #A7F3D0' }}>
          <div className="flex flex-col">
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #059669, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
              <Wheat style={{ width: '18px', height: '18px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Total Yield</p>
            <div className="flex items-baseline gap-1 my-1">
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">{totalYieldTons.toFixed(1)}</p>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>tons</span>
            </div>
            <p style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <TrendingUp style={{ width: '13px', height: '13px' }} />Filtered output
            </p>
          </div>
        </div>

        {/* Total Acres */}
        <div className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', borderRadius: '16px', padding: '18px 20px', border: '1px solid #93C5FD' }}>
          <div className="flex flex-col">
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563EB, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
              <Layers style={{ width: '18px', height: '18px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Total Acres</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 my-1">{totalAcres.toFixed(1)}</p>
            <p style={{ fontSize: '12px', color: '#2563EB', marginTop: '4px' }}>Cultivated land area</p>
          </div>
        </div>

        {/* Avg Yield/Acre */}
        <div className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', borderRadius: '16px', padding: '18px 20px', border: '1px solid #FCD34D' }}>
          <div className="flex flex-col">
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #D97706, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}>
              <TrendingUp style={{ width: '18px', height: '18px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Avg Yield/Acre</p>
            <div className="flex items-baseline gap-1 my-1">
              <p className="text-2xl lg:text-3xl font-bold text-gray-900">{avgYieldPerAcre.toFixed(2)}</p>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>t/ac</span>
            </div>
            <p style={{ fontSize: '12px', color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <TrendingUp style={{ width: '13px', height: '13px' }} />Yield efficiency
            </p>
          </div>
        </div>

        {/* Total Records */}
        <div className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group"
          style={{ background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)', borderRadius: '16px', padding: '18px 20px', border: '1px solid #D8B4FE' }}>
          <div className="flex flex-col">
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
              <Calendar style={{ width: '18px', height: '18px', color: 'white' }} />
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Total Records</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 my-1">{totalRecords}</p>
            <p style={{ fontSize: '12px', color: '#7C3AED', marginTop: '4px' }}>Harvest entries</p>
          </div>
        </div>
      </div>

      {/* Cultivation Records */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #059669, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wheat style={{ width: '16px', height: '16px', color: 'white' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Cultivation Records</h3>
              <span style={{ fontSize: 11, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>
                {displayedHarvests.length} records
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Sort</span>
                <select id="crop-record-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'newest' | 'highestYield')}
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: '#111827', cursor: 'pointer' }}>
                  <option value="newest">Newest</option>
                  <option value="highestYield">Highest Yield</option>
                </select>
              </div>
              {selectedVisibleHarvests.length > 0 && (
                <button type="button" onClick={handleExportCsv}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #059669, #10B981)', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, padding: '7px 14px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(5,150,105,0.3)' }}>
                  <Download className="h-3.5 w-3.5" />Export CSV
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {displayedHarvests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
              <Wheat style={{ width: '40px', height: '40px', margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>No harvest records found</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Try adjusting your filters</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {displayedHarvests.map((record) => {
                const isSelected = selectedHarvestIds.includes(record._id);
                return (
                <div key={record._id} style={{ borderRadius: '14px', overflow: 'hidden', transition: 'all 0.2s', border: isSelected ? '1.5px solid #10B981' : '1px solid #E5E7EB', background: isSelected ? '#F0FDF4' : '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg, #065F46, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar style={{ width: '15px', height: '15px', color: 'white' }} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>{record.season} {record.year}</h4>
                        <span style={{ fontSize: '11px', color: '#6B7280' }}>{new Date(record.createdDate).toLocaleDateString()}</span>
                      </div>
                      <span style={{ background: '#ECFDF5', color: '#059669', padding: '3px 9px', borderRadius: 20, fontSize: '10px', fontWeight: 600, border: '1px solid #A7F3D0' }}>🌾 {record.farmName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 600, padding: '3px 9px', borderRadius: 20, fontSize: '10px', border: '1px solid #86EFAC' }}>✓ Verified</span>
                      <button type="button" onClick={() => handleToggleHarvestSelection(record._id)}
                        style={{ width: '26px', height: '26px', borderRadius: '7px', border: isSelected ? '1.5px solid #10B981' : '1.5px solid #D1D5DB', background: isSelected ? '#10B981' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px', color: isSelected ? 'white' : '#9CA3AF', transition: 'all 0.15s' }}>
                        {isSelected ? '✓' : ''}
                      </button>
                    </div>
                  </div>
                  {/* Data Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', background: '#FAFBFC' }}>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                        <MapPin style={{ width: '11px', height: '11px', color: '#9CA3AF' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</span>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', margin: 0 }}>{record.location}</p>
                    </div>
                    <div style={{ padding: '12px 14px', borderLeft: '1px solid #F3F4F6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                        <Layers style={{ width: '11px', height: '11px', color: '#9CA3AF' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acres</span>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', margin: 0 }}>{record.acres} acres</p>
                    </div>
                    <div style={{ padding: '12px 14px', borderLeft: '1px solid #F3F4F6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                        <Sprout style={{ width: '11px', height: '11px', color: '#9CA3AF' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crop</span>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', margin: 0 }}>{record.crop}</p>
                    </div>
                    <div style={{ padding: '12px 14px', borderLeft: '1px solid #F3F4F6', background: '#F0FDF4' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                        <TrendingUp style={{ width: '11px', height: '11px', color: '#059669' }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yield</span>
                      </div>
                      <p style={{ fontSize: '17px', fontWeight: 700, color: '#059669', margin: 0 }}>{(record.harvestQty / 1000).toFixed(2)} tons</p>
                    </div>
                  </div>
                  {/* Points Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', borderTop: '1px solid #F3F4F6', background: '#FEFCE8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '14px' }}>⭐</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>Points Earned</span>
                    </div>
                    {record.pointsEarned === null || record.pointsEarned === undefined ? (
                      <span style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>⏳ Pending review</span>
                    ) : (
                      <span style={{ background: '#FDE68A', color: '#92400E', fontSize: '13px', fontWeight: 700, padding: '5px 14px', borderRadius: 20 }}>🏆 {Math.round(record.pointsEarned)} pts</span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}