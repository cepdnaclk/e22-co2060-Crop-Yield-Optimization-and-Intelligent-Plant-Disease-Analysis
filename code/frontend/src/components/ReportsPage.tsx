import { useEffect, useMemo, useState } from 'react';
import { Download, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
  PieChart as RePieChart, Pie, Cell,
} from 'recharts';
import { farmAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { translateSeason, translateCrop } from '../utils/dataTranslations';
import { AdminReportFilters } from './admin/AdminReportFilters';

interface HarvestRecord {
  season: string;
  year: number;
  harvestQty: number;
  pointsEarned: number | null;
  createdDate: string;
}

interface FarmerFarm {
  farmId: string;
  crop: string;
  sizeInAcres: number;
  harvests: HarvestRecord[];
}

const defaultCropOptions = ['Paddy', 'Corn', 'Wheat', 'Tomatoes', 'Onions', 'Carrots', 'Cabbage', 'Potatoes'];

const normalizeSeason = (value?: string | null) => {
  if (!value) return '';
  const season = String(value).toLowerCase().trim();
  if (season.includes('maha')) return 'Maha';
  if (season.includes('yala')) return 'Yala';
  return season.charAt(0).toUpperCase() + season.slice(1);
};

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [farms, setFarms] = useState<FarmerFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [years, setYears] = useState<string[]>(['2026', '2025', '2024']);
  const [seasons, setSeasons] = useState<string[]>(['Maha', 'Yala']);
  const [availableCrops, setAvailableCrops] = useState<string[]>([]);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const data = await farmAPI.getAllFarms();
        const fetchedFarms = (data.farms || []).map((farm: any) => ({
          ...farm,
          sizeInAcres: farm.sizeInAcres ?? farm.farmSize ?? 0,
        }));
        setFarms(fetchedFarms);

        const yearSet   = new Set<string>();
        const seasonSet = new Set<string>();
        const cropSet   = new Set<string>();

        fetchedFarms.forEach((farm: FarmerFarm) => {
          if (farm.crop) cropSet.add(farm.crop);
          (farm.harvests || []).forEach((harvest) => {
            if (harvest.year) yearSet.add(String(harvest.year));
            const normalized = normalizeSeason(harvest.season);
            if (normalized) seasonSet.add(normalized);
          });
        });

        setAvailableCrops(Array.from(cropSet).sort());
        const sortedYears = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
        if (sortedYears.length > 0) setYears(sortedYears);
        if (seasonSet.size > 0) setSeasons(Array.from(seasonSet).sort());
      } catch (error) {
        console.error('Failed to fetch report data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  const allHarvests = useMemo(
    () => farms.flatMap((farm) =>
      (farm.harvests || []).map((harvest) => ({ ...harvest, farm }))
    ),
    [farms]
  );

  const filteredHarvests = useMemo(() => {
    return allHarvests.filter((harvest) => {
      const yearMatch   = selectedYear   ? String(harvest.year) === selectedYear : true;
      const seasonMatch = selectedSeason ? normalizeSeason(harvest.season) === normalizeSeason(selectedSeason) : true;
      const cropMatch   = selectedCrop   ? harvest.farm.crop.toLowerCase() === selectedCrop.toLowerCase() : true;
      return yearMatch && seasonMatch && cropMatch;
    });
  }, [allHarvests, selectedYear, selectedSeason, selectedCrop]);

  const filteredFarms = useMemo(() => {
    const farmIds = new Set(filteredHarvests.map((h) => h.farm.farmId));
    return farms.filter((farm) => farmIds.has(farm.farmId));
  }, [farms, filteredHarvests]);

  const totalAcres = useMemo(
    () => filteredFarms.reduce((sum, farm) => sum + Number(farm.sizeInAcres || 0), 0),
    [filteredFarms]
  );

  const totalPoints = useMemo(
    () => filteredHarvests.reduce((sum, harvest) => sum + Number(harvest.pointsEarned || 0), 0),
    [filteredHarvests]
  );

  const cropVarietyData = useMemo(() => {
    const varietyMap = new Map<string, number>();
    filteredFarms.forEach((farm) => {
      varietyMap.set(farm.crop, (varietyMap.get(farm.crop) || 0) + Number(farm.sizeInAcres || 0));
    });
    const result = Array.from(varietyMap.entries()).map(([name, acres]) => ({
      name, acres,
      value: totalAcres > 0 ? parseFloat(((acres / totalAcres) * 100).toFixed(1)) : 0,
    }));
    return result.length > 0 ? result : [{ name: t('reportsPage.noData'), acres: 0, value: 100 }];
  }, [filteredFarms, totalAcres, t]);

  const harvestTrend = useMemo(() => {
    const today = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      trendMap[monthNames[d.getMonth()]] = 0;
    }
    filteredHarvests.forEach((harvest) => {
      const hDate = new Date(harvest.createdDate);
      if (Number.isNaN(hDate.getTime())) return;
      const diffMonths = (today.getFullYear() - hDate.getFullYear()) * 12 + today.getMonth() - hDate.getMonth();
      if (diffMonths >= 0 && diffMonths < 6) {
        const key = monthNames[hDate.getMonth()];
        trendMap[key] = (trendMap[key] || 0) + Number(harvest.harvestQty || 0);
      }
    });
    return Object.keys(trendMap).map((month) => ({ month, qty: trendMap[month] }));
  }, [filteredHarvests]);

  const diseaseData = [
    { name: 'Brown Spot',       value: 40 },
    { name: 'Leaf Blast',       value: 35 },
    { name: 'Bacterial Blight', value: 25 },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

  if (loading) {
    return <div className="p-8 text-center text-gray-500">{t('reportsPage.loadingReports')}</div>;
  }

  return (
    <div className="space-y-6">
      <AdminReportFilters
        selectedYear={selectedYear}
        selectedSeason={selectedSeason}
        selectedCrop={selectedCrop}
        years={years}
        seasons={seasons}
        availableCrops={availableCrops}
        defaultCropOptions={defaultCropOptions}
        onYearChange={setSelectedYear}
        onSeasonChange={setSelectedSeason}
        onCropChange={setSelectedCrop}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
        {/* Total Points Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            borderRadius: '14px', padding: '16px 20px',
            boxShadow: '0 8px 16px -2px rgba(0,0,0,0.15), 0 4px 8px -1px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 16px -2px rgba(0,0,0,0.15), 0 4px 8px -1px rgba(0,0,0,0.1)'; }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <TrendingUp style={{ width: '18px', height: '18px', color: '#16A34A' }} />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              {t('reportsPage.totalPoints')}
            </p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '0', marginBottom: '4px' }} title={Math.round(totalPoints).toLocaleString()}>
              {Math.round(totalPoints).toLocaleString()}
            </p>
            <p style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'normal', marginTop: '4px' }}>
              {t('reportsPage.selectedPeriod')}
            </p>
          </div>
        </div>

        {/* Total Acres Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            borderRadius: '14px', padding: '16px 20px',
            boxShadow: '0 8px 16px -2px rgba(0,0,0,0.15), 0 4px 8px -1px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 16px -2px rgba(0,0,0,0.15), 0 4px 8px -1px rgba(0,0,0,0.1)'; }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <BarChart3 style={{ width: '18px', height: '18px', color: '#1E40AF' }} />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              {t('reportsPage.totalAcres')}
            </p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '0', marginBottom: '4px' }} title={totalAcres.toString()}>
              {totalAcres}
            </p>
            <p style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'normal', marginTop: '4px' }}>
              {t('reportsPage.underCultivation')}
            </p>
          </div>
        </div>

        {/* Crop Varieties Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
            borderRadius: '14px', padding: '16px 20px',
            boxShadow: '0 8px 16px -2px rgba(0,0,0,0.15), 0 4px 8px -1px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 16px -2px rgba(0,0,0,0.15), 0 4px 8px -1px rgba(0,0,0,0.1)'; }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <PieChart style={{ width: '18px', height: '18px', color: '#D97706' }} />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              {t('reportsPage.cropVarieties')}
            </p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '0', marginBottom: '4px' }} title={cropVarietyData.length.toString()}>
              {cropVarietyData.length}
            </p>
            <p style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'normal', marginTop: '4px' }}>
              {t('reportsPage.totalVarieties')}
            </p>
          </div>
        </div>

        {/* Disease Reports Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
            borderRadius: '14px', padding: '16px 20px',
            boxShadow: '0 8px 16px -2px rgba(0,0,0,0.15), 0 4px 8px -1px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 16px -2px rgba(0,0,0,0.15), 0 4px 8px -1px rgba(0,0,0,0.1)'; }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <BarChart3 style={{ width: '18px', height: '18px', color: '#DC2626' }} />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              {t('reportsPage.diseaseReports')}
            </p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '0', marginBottom: '4px' }}>
              12
            </p>
            <p style={{ fontSize: '11px', color: '#DC2626', fontStyle: 'normal', marginTop: '4px', fontWeight: 500 }}>
              {t('reportsPage.requiresAttention')}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Harvest Trend */}
        <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #F7FEF9 100%)', borderRadius: '14px', padding: '20px 24px', border: '1px solid #BBF7D0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-800">{t('reportsPage.harvestTrend')}</h3>
            <button className="text-green-600 hover:text-green-700 flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              {t('reportsPage.export')}
            </button>
          </div>
          <div style={{ padding: '12px', background: '#FFFFFF', borderRadius: '8px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={harvestTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="qty" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }}
                  name={t('reportsPage.harvestQty')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Crop Variety Distribution */}
        <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #F7FEF9 100%)', borderRadius: '14px', padding: '20px 24px', border: '1px solid #BBF7D0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-800">{t('reportsPage.cropVarietyDistribution')}</h3>
            <button className="text-green-600 hover:text-green-700 flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              {t('reportsPage.export')}
            </button>
          </div>
          <div style={{ padding: '12px', background: '#FFFFFF', borderRadius: '8px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={cropVarietyData}
                  cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${translateCrop(name, i18n.language)} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100} fill="#8884d8" dataKey="value"
                >
                  {cropVarietyData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crop Varieties Table */}
        <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #F7FEF9 100%)', borderRadius: '14px', border: '1px solid #BBF7D0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div className="p-6 border-b border-gray-200 bg-white">
            <h3 className="text-gray-800">{t('reportsPage.cropVarietiesSummary')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-700">
                    {t('reportsPage.variety')}
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-700">
                    {t('reportsPage.acres')}
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-700">
                    {t('reportsPage.percentage')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {cropVarietyData.map((variety) => (
                  <tr key={variety.name} className="hover:bg-gray-50">
                    <td className="px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm text-gray-800">
                      {translateCrop(variety.name, i18n.language)}
                    </td>
                    <td className="px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm text-gray-800">{variety.acres}</td>
                    <td className="px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${variety.value}%` }} />
                        </div>
                        <span className="text-gray-700">{variety.value}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disease Summary Table */}
        <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #F7FEF9 100%)', borderRadius: '14px', border: '1px solid #BBF7D0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div className="p-6 border-b border-gray-200 bg-white">
            <h3 className="text-gray-800">{t('reportsPage.diseaseReportsSummary')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-700">
                    {t('reportsPage.diseaseType')}
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-700">
                    {t('reportsPage.percentage')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {diseaseData.map((disease) => (
                  <tr key={disease.name} className="hover:bg-gray-50">
                    <td className="px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm text-gray-800">{disease.name}</td>
                    <td className="px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: `${disease.value}%` }} />
                        </div>
                        <span className="text-gray-700">{disease.value}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Download Reports */}
      <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #F7FEF9 100%)', borderRadius: '14px', padding: '20px 24px', border: '1px solid #BBF7D0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <h3 className="text-gray-800 mb-4">{t('reportsPage.downloadReports')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all">
            <Download className="w-5 h-5 text-green-600" />
            <span className="text-gray-700 font-medium">{t('reportsPage.cropDataReport')}</span>
          </button>
          <button className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all">
            <Download className="w-5 h-5 text-green-600" />
            <span className="text-gray-700 font-medium">{t('reportsPage.harvestSummary')}</span>
          </button>
          <button className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all">
            <Download className="w-5 h-5 text-green-600" />
            <span className="text-gray-700 font-medium">{t('reportsPage.diseaseReportsBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
