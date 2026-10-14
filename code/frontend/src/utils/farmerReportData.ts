export interface HarvestRecord {
  recordId?: string;
  season: string;
  year: number;
  harvestQty: number | null;
  pointsEarned: number | null;
  createdDate: string;
}

export interface FarmerFarm {
  farmId: string;
  farmName?: string;
  location?: string;
  district?: string;
  division?: string;
  crop: string;
  sizeInAcres: number | null;
  status?: string;
  createdDate?: string;
  harvests: HarvestRecord[];
}

export interface DiseaseRecord {
  recordId: string;
  farmId: string | null;
  farmName: string;
  crop: string | null;
  disease: string;
  confidence: number | null;
  location?: string;
  notes?: string;
  createdDate: string | null;
}

export interface FarmerReportData {
  generatedAt: string;
  farmer: {
    farmerId: string;
    firstName?: string;
    lastName?: string;
    nic?: string;
    phone?: string;
    email?: string;
    address?: string;
    district?: string;
    division?: string;
  };
  farms: FarmerFarm[];
  diseaseRecords: DiseaseRecord[];
}

export interface ReportFilters { year: string; season: string; crop: string | null }
export type FarmerReportKind = 'crop' | 'harvest' | 'disease';

export const normalizeSeason = (value?: string | null) => {
  const season = String(value || '').toLowerCase().trim();
  if (season.includes('maha') || season === 'මහ') return 'Maha';
  if (season.includes('yala') || season === 'යල') return 'Yala';
  return season.charAt(0).toUpperCase() + season.slice(1);
};

export function recordedNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function recordYear(date: string | null): string {
  if (!date || Number.isNaN(new Date(date).getTime())) return '';
  return new Intl.DateTimeFormat('en', { timeZone: 'Asia/Colombo', year: 'numeric' }).format(new Date(date));
}

// The disease analysis model stores probabilities (0..1); legacy entries may
// already contain percentages, so preserve those instead of multiplying twice.
export function confidencePercent(value: unknown): number | null {
  const parsed = recordedNumber(value);
  if (parsed === null || parsed > 100) return null;
  return parsed <= 1 ? parsed * 100 : parsed;
}

// Crop reports are a current farm register. Year/season select recorded harvest
// activity, not historical land ownership or historical crop assignments.
export function selectFarmerRecords(data: FarmerReportData, filters: ReportFilters) {
  const cropFarms = data.farms.filter(farm => !filters.crop || farm.crop?.toLowerCase() === filters.crop.toLowerCase());
  const harvests = cropFarms.flatMap(farm => (farm.harvests || []).map(harvest => ({ ...harvest, farm })))
    .filter(harvest => (!filters.year || String(harvest.year) === filters.year)
      && (!filters.season || normalizeSeason(harvest.season) === normalizeSeason(filters.season)))
    .sort((a, b) => (b.year - a.year) || String(b.createdDate || '').localeCompare(String(a.createdDate || '')));
  const farmIds = new Set(harvests.map(harvest => harvest.farm.farmId));
  const farms = cropFarms.filter(farm => (!filters.year && !filters.season) || farmIds.has(farm.farmId));
  // Disease entries do not store an agricultural season. Never infer one from
  // the calendar month or silently remove entries using harvest activity.
  const diseases = data.diseaseRecords.filter(entry => (!filters.crop || entry.crop?.toLowerCase() === filters.crop.toLowerCase())
    && (!filters.year || recordYear(entry.createdDate) === filters.year))
    .sort((a, b) => String(b.createdDate || '').localeCompare(String(a.createdDate || '')));
  return { farms, harvests, diseases };
}

export function summarizeCrops(farms: FarmerFarm[]) {
  const crops = new Map<string, { name: string; farms: number; acres: number; missingArea: number }>();
  farms.forEach(farm => {
    const name = farm.crop || 'Not recorded';
    const item = crops.get(name) || { name, farms: 0, acres: 0, missingArea: 0 };
    item.farms++;
    const area = recordedNumber(farm.sizeInAcres);
    if (area === null) item.missingArea++;
    else item.acres += area;
    crops.set(name, item);
  });
  return Array.from(crops.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function summarizeDiseases(records: DiseaseRecord[]) {
  const counts = new Map<string, number>();
  records.forEach(entry => counts.set(entry.disease, (counts.get(entry.disease) || 0) + 1));
  return Array.from(counts, ([name, count]) => ({ name, count, value: count * 100 / records.length }))
    .sort((a, b) => b.count - a.count);
}
