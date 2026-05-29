/**
 * Admin Dashboard Component
 * Displays system-wide statistics including total farmers,
 * active plots, total farmland, and harvest yields.
 * Fetches and aggregates real-time data from the backend.
 */
import { Users, TrendingUp, Wheat, AlertTriangle, BarChart3, MapPin, Layers, Scale, Link2, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { farmAPI, userAPI } from '../../services/api';
import { FarmerProfile } from './FarmerProfile';
import { formatNumber } from '../../utils/numberUtils';
import { GlassStatCard } from './GlassStatCard';

// Custom hook for count-up animation (only runs on initial load)
function useCountUp(endValue: number, duration: number = 2500) {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number>(0);
  const hasAnimatedRef = useRef(false);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    // If already animated once, just set the value directly
    if (hasAnimatedRef.current) {
      setCount(endValue);
      return;
    }

    // Skip animation during initial load when endValue is 0
    if (initialLoadRef.current && endValue === 0) {
      return;
    }

    // Mark that we're past initial load
    initialLoadRef.current = false;

    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const currentCount = easedProgress * endValue;

      setCount(currentCount);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
        hasAnimatedRef.current = true;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [endValue, duration]);

  return count;
}

export function AdminDashboard() {
  const defaultCropOptions = [
    'Paddy',
    'Corn',
    'Wheat',
    'Tomatoes',
    'Onions',
    'Carrots',
    'Cabbage',
    'Potatoes'
  ];

  const [totalFarmers, setTotalFarmers] = useState(0);
  const [totalHarvest, setTotalHarvest] = useState(0);
  const [activeFarms, setActiveFarms] = useState(0);
  const [totalFarmland, setTotalFarmland] = useState(0);
  const [farmersLastMonthPercentage, setFarmersLastMonthPercentage] = useState(0);
  const [harvestLastSeasonText, setHarvestLastSeasonText] = useState('0.0% from last season');
  const [yieldLastSeasonText, setYieldLastSeasonText] = useState('0.0% from last season');
  const [loading, setLoading] = useState(true);
  const [recentFarmers, setRecentFarmers] = useState<any[]>([]);
  const [recentHarvests, setRecentHarvests] = useState<any[]>([]);
  const [farmsForProfile, setFarmsForProfile] = useState<any[]>([]);
  const [selectedFarmerProfile, setSelectedFarmerProfile] = useState<any | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [availableCrops, setAvailableCrops] = useState<string[]>([]);
  const [showMoreFarmers, setShowMoreFarmers] = useState(false);
  const [showMoreHarvests, setShowMoreHarvests] = useState(false);
  const [adminFirstName, setAdminFirstName] = useState('Admin');
  const [openHeaderDropdown, setOpenHeaderDropdown] = useState<'year' | 'season' | 'crop' | null>(null);
  const headerFilterRef = useRef<HTMLDivElement>(null);

  // Set to current date/season based on metadata
  const currentYear = 2026;
  const currentSeason = 'maha';

  const [selectedYear, setSelectedYear] = useState<number | 'all'>(currentYear);
  const [selectedSeason, setSelectedSeason] = useState<string | 'all'>(currentSeason);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);

  useEffect(() => {
    fetchCrops();
  }, []);

  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        const data = await userAPI.fetchProfile();
        const firstName = data?.user?.firstName?.trim();
        if (firstName) {
          setAdminFirstName(firstName);
        }
      } catch (error) {
        console.error('Error loading admin profile:', error);
      }
    };

    loadAdminProfile();
  }, []);

  useEffect(() => {
    if (availableCrops.length > 0 || selectedCrop === null) {
      fetchDashboardData();
    }
  }, [selectedCrop, selectedYear, selectedSeason, availableCrops.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!headerFilterRef.current?.contains(event.target as Node)) {
        setOpenHeaderDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCrops = async () => {
    try {
      const data = await farmAPI.getAllCrops();
      setAvailableCrops(data.crops || []);
      // Set the first crop as default if no crop is selected
      if (!selectedCrop && (data.crops || []).length > 0) {
        setSelectedCrop(null); // Show all crops by default
      }
    } catch (error) {
      console.error('Error fetching crops:', error);
      setAvailableCrops([]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch farms data for farmer count and active farms
      const farmsData = await farmAPI.getAllFarms();
      let farms = farmsData.farms || [];

      // Filter by selected crop if one is selected (case-insensitive)
      if (selectedCrop) {
        farms = farms.filter((farm: any) => {
          const farmCrop = (farm.crop || '').trim().toLowerCase();
          const selectedCropNormalized = selectedCrop.trim().toLowerCase();
          return farmCrop === selectedCropNormalized;
        });
      }

      setFarmsForProfile(farms);

      // Parse utilities that are resilient to strings for numerical values
      const parseHarvestQty = (value: any): number => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (typeof value === 'string') {
          const normalized = value.replace(/,/g, '').replace(/[^\d.-]/g, '');
          const parsed = Number(normalized);
          return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
      };

      const normalizeSeason = (value: any): string => {
        const seasonRaw = (value || '').toString().trim().toLowerCase();
        if (seasonRaw.includes('maha')) return 'maha';
        if (seasonRaw.includes('yala')) return 'yala';
        return seasonRaw;
      };

      // Fetch all harvests to extract available years and filter
      const harvestData = await farmAPI.getHarvestHistory();
      let allHarvests = harvestData.harvests || [];

      const yearsSet = new Set<number>();
      allHarvests.forEach((h: any) => {
        const y = Number(h.year);
        if (!isNaN(y)) yearsSet.add(y);
      });
      const yearsArray = Array.from(yearsSet).sort((a, b) => b - a);
      if (!yearsArray.includes(currentYear)) yearsArray.unshift(currentYear);
      setAvailableYears(yearsArray);

      // Filter harvests by selected crop
      let harvests = allHarvests;
      if (selectedCrop) {
        harvests = harvests.filter((harvest: any) => {
          const harvestCrop = (harvest.crop || '').trim().toLowerCase();
          const selectedCropNormalized = selectedCrop.trim().toLowerCase();
          return harvestCrop === selectedCropNormalized;
        });
      }

      // Filter based on selected year/season for Farmers/Plots calculation
      let filteredHarvests = harvests;
      if (selectedYear !== 'all') {
        filteredHarvests = filteredHarvests.filter((h: any) => Number(h.year) === Number(selectedYear));
      }
      if (selectedSeason !== 'all') {
        filteredHarvests = filteredHarvests.filter((h: any) => normalizeSeason(h.season) === selectedSeason.toLowerCase());
      }

      // Always base active metrics purely on the farmers who actually have harvests in the matching filter
      const activeNICs = new Set(filteredHarvests.map((h: any) => h.farmerNIC).filter(Boolean));
      const periodFarmsList = farms.filter((f: any) => activeNICs.has(f.farmerNIC));

      setTotalFarmers(activeNICs.size);
      setActiveFarms(periodFarmsList.length);

      // Calculate active farmland by getting the unique acres per farm in this period (so multiple harvests on one plot don't multiply the size)
      const farmAcresMap = new Map<string, number>();
      filteredHarvests.forEach((h: any) => {
        const key = h.farmId || h.farmerNIC;
        if (key) {
          const currentAcres = farmAcresMap.get(key) || 0;
          const harvestAcres = parseHarvestQty(h.acres || h.farmSize || 0);
          if (harvestAcres > currentAcres) {
            farmAcresMap.set(key, harvestAcres);
          }
        }
      });
      const calculatedActiveFarmland = Array.from(farmAcresMap.values()).reduce((sum, acres) => sum + acres, 0);

      setTotalFarmland(calculatedActiveFarmland);
      setFarmsForProfile(farms);

      // Now we also calculate the previous logical period's ACTIVE metrics for comparison
      const smartPrevFilters = () => {
        if (selectedYear === 'all' || selectedSeason === 'all') return null;
        let y = Number(selectedYear);
        let s = selectedSeason.toLowerCase();
        if (s === 'maha') {
          s = 'yala';
        } else if (s === 'yala') {
          s = 'maha';
          y = y - 1;
        } else {
          return null;
        }
        return { year: y, season: s };
      };

      const prevFilt = smartPrevFilters();
      let prevPeriodFarmsList = [];
      if (prevFilt) {
        let prevFilteredHarvests = allHarvests.filter((h: any) =>
          Number(h.year) === prevFilt.year &&
          normalizeSeason(h.season) === prevFilt.season
        );
        if (selectedCrop) {
          prevFilteredHarvests = prevFilteredHarvests.filter((harvest: any) => {
            const harvestCrop = (harvest.crop || '').trim().toLowerCase();
            const selectedCropNormalized = selectedCrop.trim().toLowerCase();
            return harvestCrop === selectedCropNormalized;
          });
        }
        const prevPastNICs = new Set(prevFilteredHarvests.map((h: any) => h.farmerNIC).filter(Boolean));
        prevPeriodFarmsList = farms.filter((f: any) => prevPastNICs.has(f.farmerNIC));
      }

      const prevActiveFarmerNICs = new Set(prevPeriodFarmsList.map((f: any) => f.farmerNIC).filter(Boolean));
      const prevActiveFarmersCount = prevActiveFarmerNICs.size;
      const prevActiveFarmsCount = prevPeriodFarmsList.length;
      const prevActiveFarmland = prevPeriodFarmsList.reduce((sum: number, f: any) => sum + parseHarvestQty(f.sizeInAcres || f.farmSize || 0), 0);

      const lastLabel = (!selectedYear || !selectedSeason) ? 'all time' : 'last season';

      const getGrowthText = (current: number, previous: number) => {
        if (!prevFilt) return `N/A from ${lastLabel}`;
        if (previous === 0) return current > 0 ? `+100.0% from ${lastLabel}` : `0.0% from ${lastLabel}`;
        const pct = ((current - previous) / previous) * 100;
        const capped = Math.min(Math.max(pct, -9999.9), 9999.9);
        const sign = capped > 0 ? '+' : '';
        return `${sign}${capped.toFixed(1)}% from ${lastLabel}`;
      };

      // Reuse the existing state variable but it now holds season-over-season text
      const farmersGrowthText = getGrowthText(activeNICs.size, prevActiveFarmersCount);
      // We'll pass this via state or just calculate it. The file uses `farmersLastMonthPercentage` so let's overwrite that text.
      // Actually, since I have to reuse existing state vars, I'll store the text strings directly if possible, or build them in render.
      // Wait, let me just add state variables or override existing ones smartly.
      // The file has setFarmersLastMonthPercentage(number). I will change the type implicitly or just use the number.
      let calculatedFarmersPercentage = 0;
      if (prevActiveFarmersCount === 0) {
        calculatedFarmersPercentage = activeNICs.size > 0 ? 100 : 0;
      } else {
        calculatedFarmersPercentage = ((activeNICs.size - prevActiveFarmersCount) / prevActiveFarmersCount) * 100;
      }
      setFarmersLastMonthPercentage(calculatedFarmersPercentage);

      // I will need to store growth text for Plots and Farmland too, but right now there's no state for it.
      // I can just bundle it into a new state object if needed, or recalculate in render.
      // Actually I should just calculate it here and use existing states where possible, but I can't easily add new `useState` via replace.
      // Let's modify setFarmersLastMonthPercentage to instead just be the raw percentage, and format it in render.

      // Calculate total harvests by season & year
      const seasonMap = new Map<string, number>();
      const seasonAcresMap = new Map<string, number>();
      harvests.forEach((harvest: any) => {
        const seasonName = normalizeSeason(harvest.season);
        const seasonYear = Number(harvest.year);
        const quantity = parseHarvestQty(harvest.harvestQty);
        const acres = parseHarvestQty(harvest.acres);

        if (!seasonName || Number.isNaN(seasonYear)) return;

        const key = `${seasonYear}|${seasonName}`;
        seasonMap.set(key, (seasonMap.get(key) || 0) + quantity);
        seasonAcresMap.set(key, (seasonAcresMap.get(key) || 0) + acres);
      });

      let thisSeasonTotal = 0;
      let lastSeasonTotal = 0;
      let thisSeasonAcres = 0;
      let lastSeasonAcres = 0;

      if (selectedYear !== 'all' && selectedSeason !== 'all') {
        const targetYear = Number(selectedYear);
        const targetSeason = selectedSeason;
        const thisKey = `${targetYear}|${targetSeason}`;
        const lastName = targetSeason === 'maha' ? 'yala' : 'maha';
        const lastYear = targetSeason === 'maha' ? targetYear : targetYear - 1;
        const lastKey = `${lastYear}|${lastName}`;

        thisSeasonTotal = seasonMap.get(thisKey) || 0;
        lastSeasonTotal = seasonMap.get(lastKey) || 0;
        thisSeasonAcres = seasonAcresMap.get(thisKey) || 0;
        lastSeasonAcres = seasonAcresMap.get(lastKey) || 0;
      } else if (selectedYear !== 'all' && selectedSeason === 'all') {
        const y = Number(selectedYear);
        thisSeasonTotal = (seasonMap.get(`${y}|maha`) || 0) + (seasonMap.get(`${y}|yala`) || 0);
        lastSeasonTotal = (seasonMap.get(`${y - 1}|maha`) || 0) + (seasonMap.get(`${y - 1}|yala`) || 0);
        thisSeasonAcres = (seasonAcresMap.get(`${y}|maha`) || 0) + (seasonAcresMap.get(`${y}|yala`) || 0);
        lastSeasonAcres = (seasonAcresMap.get(`${y - 1}|maha`) || 0) + (seasonAcresMap.get(`${y - 1}|yala`) || 0);
      } else if (selectedYear === 'all' && selectedSeason !== 'all') {
        for (const [key, val] of seasonMap.entries()) {
          if (key.includes(`|${selectedSeason}`)) thisSeasonTotal += val;
        }
        for (const [key, val] of seasonAcresMap.entries()) {
          if (key.includes(`|${selectedSeason}`)) thisSeasonAcres += val;
        }
      } else {
        for (const val of seasonMap.values()) thisSeasonTotal += val;
        for (const val of seasonAcresMap.values()) thisSeasonAcres += val;
      }

      setTotalHarvest(thisSeasonTotal);

      // Instead of 30 day farmers, we already calculated calculatedFarmersPercentage above
      // so we can delete the 30-day block.

      const isComparisonValid = selectedYear !== 'all';
      const lastLabelForHarvest = selectedSeason === 'all' ? 'last year' : 'last season';

      let harvestSeasonText = `N/A from ${lastLabelForHarvest}`;
      if (!isComparisonValid) {
        harvestSeasonText = 'N/A';
      } else if (lastSeasonTotal <= 0.0001) {
        harvestSeasonText = thisSeasonTotal > 0 ? `+100.0% from ${lastLabelForHarvest}` : `0.0% from ${lastLabelForHarvest}`;
      } else {
        const harvestPercentage = ((thisSeasonTotal - lastSeasonTotal) / lastSeasonTotal) * 100;
        const cappedPercentage = Math.min(Math.max(harvestPercentage, -9999.9), 9999.9);
        const sign = cappedPercentage > 0 ? '+' : '';
        harvestSeasonText = `${sign}${cappedPercentage.toFixed(1)}% from ${lastLabelForHarvest}`;
      }
      setHarvestLastSeasonText(harvestSeasonText);

      let yieldSeasonText = `N/A from ${lastLabelForHarvest}`;
      if (!isComparisonValid) {
        yieldSeasonText = 'N/A';
      } else if (thisSeasonAcres <= 0.0001 || lastSeasonAcres <= 0.0001) {
        yieldSeasonText = `N/A from ${lastLabelForHarvest}`;
      } else {
        const thisSeasonYieldPerAcre = thisSeasonTotal / thisSeasonAcres;
        const lastSeasonYieldPerAcre = lastSeasonTotal / lastSeasonAcres;

        if (lastSeasonYieldPerAcre <= 0.0001) {
          yieldSeasonText = `N/A from ${lastLabelForHarvest}`;
        } else {
          const yieldPercentage = ((thisSeasonYieldPerAcre - lastSeasonYieldPerAcre) / lastSeasonYieldPerAcre) * 100;
          const cappedYieldPercentage = Math.min(Math.max(yieldPercentage, -9999.9), 9999.9);
          const sign = cappedYieldPercentage > 0 ? '+' : '';
          yieldSeasonText = `${sign}${cappedYieldPercentage.toFixed(1)}% from ${lastLabelForHarvest}`;
        }
      }
      setYieldLastSeasonText(yieldSeasonText);

      // Get recent farmers from the filtered farms data
      // Extract unique farmers and sort by farm creation date
      const farmerMap = new Map();
      farms.forEach((farm: any) => {
        const farmerKey = farm.farmerNIC;
        if (farmerKey && farm.farmerName && !farmerMap.has(farmerKey)) {
          const nameParts = farm.farmerName.trim().split(' ');
          farmerMap.set(farmerKey, {
            _id: farmerKey,
            name: farm.farmerName,
            firstName: nameParts[0] || 'Unknown',
            lastName: nameParts[1] || '',
            location: farm.district || farm.division || 'Unknown',
            district: farm.district,
            division: farm.division,
            date: farm.createdDate || new Date(),
            image: farm.farmerImage,
            nic: farm.farmerNIC,
            status: 'Active'
          });
        }
      });

      // Convert map to array and sort by date (most recent first)
      const recentFarmersArray = Array.from(farmerMap.values())
        .sort((a: any, b: any) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        })
        .slice(0, 10);

      setRecentFarmers(recentFarmersArray);

      // Store harvests for recent harvests section (using first 10)
      if (harvests.length > 0) {
        setRecentHarvests(harvests.slice(0, 10));
      } else {
        setRecentHarvests([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setTotalFarmers(0);
      setTotalHarvest(0);
      setActiveFarms(0);
      setTotalFarmland(0);
      setFarmersLastMonthPercentage(0);
      setHarvestLastSeasonText('0.0% from last season');
      setYieldLastSeasonText('0.0% from last season');
      setRecentFarmers([]);
      setRecentHarvests([]);
      setFarmsForProfile([]);
    } finally {
      setLoading(false);
    }
  };

  const toFarmerProfileData = (farm: any) => ({
    farmId: farm.farmId || farm._id || 'N/A',
    farmName: farm.farmName || 'Unknown Farm',
    farmerName: farm.farmerName || 'Unknown',
    farmerNIC: farm.farmerNIC || 'N/A',
    phone: farm.phone || 'N/A',
    division: farm.division || 'Unknown',
    district: farm.district || 'Unknown',
    farmSize: farm.farmSize || farm.sizeInAcres || 0,
    crop: farm.crop || 'Unknown',
    status: farm.status || 'active',
    points: Math.round(farm.points || 0),
    farmerImage: farm.farmerImage,
  });

  const openFarmerProfileByNic = (nic: string) => {
    const matchedFarm = farmsForProfile.find((farm) => farm.farmerNIC === nic);
    if (matchedFarm) {
      setSelectedFarmerProfile(toFarmerProfileData(matchedFarm));
    }
  };

  const openFarmerProfileByName = (farmerName: string) => {
    const normalizedName = (farmerName || '').trim().toLowerCase();
    const matchedFarm = farmsForProfile.find(
      (farm) => (farm.farmerName || '').trim().toLowerCase() === normalizedName
    );
    if (matchedFarm) {
      setSelectedFarmerProfile(toFarmerProfileData(matchedFarm));
    }
  };

  // Format date to be more readable
  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) {
      return 'Unknown';
    }

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    if (isNaN(date.getTime())) {
      return 'Unknown';
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Calculate yield per acre for CURRENT SEASON
  const getYieldPerAcre = () => {
    // We reuse the already filtered `totalFarmland` (which represents cultivated acres in current season)
    // and `totalHarvest` (which represents harvest in current season).
    if (totalFarmland === 0) return 0;
    return totalHarvest / totalFarmland;
  };

  // Helper to extract percentage from text like "+12.5% from last season"
  const extractPercentage = (text: string): number | undefined => {
    const match = text.match(/([+-]?\d+\.?\d*)%/);
    return match ? parseFloat(match[1]) : undefined;
  };

  // Apply compact formatter to all dashboard KPIs.
  const formattedFarmers = formatNumber(totalFarmers);
  const formattedActiveFarms = formatNumber(activeFarms);
  const formattedFarmland = formatNumber(totalFarmland);
  // Harvest is internally in kg, so convert to tons before formatting.
  const formattedHarvest = formatNumber(totalHarvest / 1000);
  const formattedYield = formatNumber(getYieldPerAcre());
  const cropOptions = Array.from(new Set([...defaultCropOptions, ...availableCrops]));
  const visibleRecentFarmers = recentFarmers.slice(0, showMoreFarmers ? 10 : 5);
  const visibleRecentHarvests = recentHarvests.slice(0, showMoreHarvests ? 10 : 5);

  const harvestPercentage = extractPercentage(harvestLastSeasonText);
  const yieldPercentage = extractPercentage(yieldLastSeasonText);

  // Count-up animations for all 6 stat cards
  const animatedFarmers = useCountUp(loading ? 0 : totalFarmers);
  const animatedHarvest = useCountUp(loading ? 0 : totalHarvest / 1000);
  const animatedActiveFarms = useCountUp(loading ? 0 : activeFarms);
  const animatedFarmland = useCountUp(loading ? 0 : totalFarmland);
  const animatedYield = useCountUp(loading ? 0 : getYieldPerAcre());
  const animatedDiseaseReports = useCountUp(loading ? 0 : 23);

  const displayFarmers = loading ? '...' : formatNumber(animatedFarmers);
  const displayHarvest = loading ? '...' : formatNumber(animatedHarvest);
  const displayActiveFarms = loading ? '...' : formatNumber(animatedActiveFarms);
  const displayFarmland = loading ? '...' : formatNumber(animatedFarmland);
  const displayYield = loading ? '...' : formatNumber(animatedYield);
  const displayDiseaseReports = loading ? '...' : Math.round(animatedDiseaseReports).toString();
  const currentDate = new Date();
  const currentHour = currentDate.getHours();
  const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const formattedCurrentDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const selectedYearLabel = selectedYear === 'all' ? 'All Years' : String(selectedYear);
  const selectedSeasonLabel = selectedSeason === 'all' ? 'All Seasons' : `${selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1)}`;
  const selectedSeasonYearLabel = `${selectedSeasonLabel} ${selectedYearLabel}`;
  const selectedCropLabel = selectedCrop || 'All Crops';

  const cropSwatchColors: Record<string, string> = {
    Paddy: '#FEF08A',
    Corn: '#FED7AA',
    Wheat: '#FDE68A',
    Tomatoes: '#FECACA',
    Onions: '#E9D5FF',
    Carrots: '#FFEDD5',
    Cabbage: '#BBF7D0',
    Potatoes: '#D6D3D1',
  };

  const dashboardStatCardStyle = {
    background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    borderRadius: '14px',
    padding: '16px 20px',
  };

  const getDashboardIconBoxStyle = (backgroundColor: string) => ({
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  });

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
      
      {/* Welcome Header */}
      <div
        style={{
          backgroundColor: '#15803D',
          borderRadius: '14px',
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
            {`${timeGreeting}, ${adminFirstName} 👋`}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{formattedCurrentDate}</p>
            <span
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#FFFFFF',
                padding: '3px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {selectedSeasonYearLabel}
            </span>
          </div>
        </div>

        <div ref={headerFilterRef} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpenHeaderDropdown(openHeaderDropdown === 'year' ? null : 'year')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#FFFFFF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
              }}
            >
              {selectedYearLabel}
              <ChevronDown style={{ width: '13px', height: '13px', color: 'rgba(255,255,255,0.7)' }} />
            </button>

            {openHeaderDropdown === 'year' && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, minWidth: '150px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear('all');
                    setOpenHeaderDropdown(null);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: '13px', color: selectedYear === 'all' ? '#15803D' : '#374151', fontWeight: selectedYear === 'all' ? 500 : 400, background: selectedYear === 'all' ? '#F0FDF4' : '#FFFFFF', cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    if (selectedYear !== 'all') (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = selectedYear === 'all' ? '#F0FDF4' : '#FFFFFF';
                  }}
                >
                  All Years
                </button>
                {availableYears.map((year) => {
                  const isSelected = selectedYear === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setSelectedYear(year);
                        setOpenHeaderDropdown(null);
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: '13px', color: isSelected ? '#15803D' : '#374151', fontWeight: isSelected ? 500 : 400, background: isSelected ? '#F0FDF4' : '#FFFFFF', cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = isSelected ? '#F0FDF4' : '#FFFFFF';
                      }}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpenHeaderDropdown(openHeaderDropdown === 'season' ? null : 'season')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#FFFFFF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
              }}
            >
              {selectedSeasonLabel}
              <ChevronDown style={{ width: '13px', height: '13px', color: 'rgba(255,255,255,0.7)' }} />
            </button>

            {openHeaderDropdown === 'season' && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, minWidth: '150px', overflow: 'hidden' }}>
                {[
                  { label: 'All Seasons', value: 'all' },
                  { label: 'Maha', value: 'maha' },
                  { label: 'Yala', value: 'yala' },
                ].map((option) => {
                  const isSelected = selectedSeason === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSelectedSeason(option.value);
                        setOpenHeaderDropdown(null);
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: '13px', color: isSelected ? '#15803D' : '#374151', fontWeight: isSelected ? 500 : 400, background: isSelected ? '#F0FDF4' : '#FFFFFF', cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = isSelected ? '#F0FDF4' : '#FFFFFF';
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpenHeaderDropdown(openHeaderDropdown === 'crop' ? null : 'crop')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#FFFFFF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
              }}
            >
              {selectedCropLabel}
              <ChevronDown style={{ width: '13px', height: '13px', color: 'rgba(255,255,255,0.7)' }} />
            </button>

            {openHeaderDropdown === 'crop' && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, minWidth: '150px', overflow: 'hidden', maxHeight: '280px', overflowY: 'auto' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCrop(null);
                    setOpenHeaderDropdown(null);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: '13px', color: selectedCrop === null ? '#15803D' : '#374151', fontWeight: selectedCrop === null ? 500 : 400, background: selectedCrop === null ? '#F0FDF4' : '#FFFFFF', cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    if (selectedCrop !== null) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = selectedCrop === null ? '#F0FDF4' : '#FFFFFF';
                  }}
                >
                  All Crops
                </button>
                {cropOptions.map((crop) => {
                  const isSelected = selectedCrop === crop;
                  return (
                    <button
                      key={crop}
                      type="button"
                      onClick={() => {
                        setSelectedCrop(crop);
                        setOpenHeaderDropdown(null);
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: '13px', color: isSelected ? '#15803D' : '#374151', fontWeight: isSelected ? 500 : 400, background: isSelected ? '#F0FDF4' : '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = isSelected ? '#F0FDF4' : '#FFFFFF';
                      }}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', display: 'inline-block', marginRight: '6px', background: cropSwatchColors[crop] || '#E5E7EB' }} />
                      {crop}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-5 lg:gap-6" style={{ marginTop: 0 }}>
        {/* Active Farmers Card */}
        <div className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group" style={dashboardStatCardStyle}>
          <div className="flex flex-col">
            <div className="flex items-center">
              <div style={getDashboardIconBoxStyle('#DCFCE7')}>
                <Users className="w-5 h-5 text-green-600 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Active Farmers</p>
            <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-gray-900 my-2 break-words min-w-0">
              {displayFarmers}
            </p>
            <p className="text-xs sm:text-sm text-green-700 flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              {loading ? '...' : `${farmersLastMonthPercentage >= 0 ? '+' : ''}${farmersLastMonthPercentage.toFixed(1)}% from last season`}
            </p>
          </div>
        </div>

        {/* Total Harvest Card */}
        <div className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group" style={dashboardStatCardStyle}>
          <div className="flex flex-col">
            <div className="flex items-center">
              <div style={getDashboardIconBoxStyle('#C8E6C9')}>
                <Wheat className="w-5 h-5 text-green-700 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Harvest</p>
            <div className="flex min-w-0 flex-wrap items-baseline gap-1 sm:gap-2 my-2">
              <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words min-w-0">
                {displayHarvest}
              </p>
              <span className="text-xs sm:text-sm font-medium text-gray-600 break-words">tons</span>
            </div>
            <p className="text-xs sm:text-sm text-green-700 flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              {loading ? '...' : harvestLastSeasonText}
            </p>
          </div>
        </div>

        {/* Active Plots Card */}
        <div className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group" style={dashboardStatCardStyle}>
          <div className="flex flex-col">
            <div className="flex items-center">
              <div style={getDashboardIconBoxStyle('#D1FAE5')}>
                <MapPin className="w-5 h-5 text-emerald-600 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Active Plots</p>
            <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-gray-900 my-2 break-words min-w-0">
              {displayActiveFarms}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">
              {loading ? '...' : `Active in ${selectedSeason === 'all' ? 'All Seasons' : selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1)} ${selectedYear === 'all' ? 'All Years' : selectedYear}`}
            </p>
          </div>
        </div>

        {/* Active Farmland Card */}
        <div className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group" style={dashboardStatCardStyle}>
          <div className="flex flex-col">
            <div className="flex items-center">
              <div style={getDashboardIconBoxStyle('#DCEDD5')}>
                <Layers className="w-5 h-5 text-lime-700 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Active Farmland</p>
            <div className="flex min-w-0 flex-wrap items-baseline gap-1 sm:gap-2 my-2">
              <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words min-w-0">
                {displayFarmland}
              </p>
              <span className="text-xs sm:text-sm font-medium text-gray-600 break-words">acres</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">
              {loading ? '...' : `Cultivated in ${selectedSeason === 'all' ? 'All Seasons' : selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1)} ${selectedYear === 'all' ? 'All Years' : selectedYear}`}
            </p>
          </div>
        </div>

        {/* Yield per Acre Card */}
        <div className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group" style={dashboardStatCardStyle}>
          <div className="flex flex-col">
            <div className="flex items-center">
              <div style={getDashboardIconBoxStyle('#D5F5E3')}>
                <TrendingUp className="w-5 h-5 text-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Yield per Acre</p>
            <div className="flex min-w-0 flex-wrap items-baseline gap-1 sm:gap-2 my-2">
              <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words min-w-0">
                {displayYield}
              </p>
              <span className="text-xs sm:text-sm font-medium text-gray-600 break-words">kg</span>
            </div>
            <p className="text-xs sm:text-sm text-green-700 flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              {loading ? '...' : yieldLastSeasonText}
            </p>
          </div>
        </div>

        {/* Disease Reports Card */}
        <div className="shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:cursor-pointer group" style={dashboardStatCardStyle}>
          <div className="flex flex-col">
            <div className="flex items-center">
              <div style={getDashboardIconBoxStyle('#FEE2E2')}>
                <AlertTriangle className="w-5 h-5 text-red-600 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Disease Reports</p>
            <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-gray-900 my-2 break-words min-w-0">
              {displayDiseaseReports}
            </p>
            <p className="text-xs sm:text-sm text-green-700 mt-2">
              {loading ? '...' : 'Requires attention'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Farmers */}
        <div
          style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #F7FEF9 100%)',
            border: '1px solid #BBF7D0',
            borderRadius: '14px',
            padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '12px', borderBottom: '1px solid #D1FAE5' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#111827' }}>Recently Added Farmers</h3>
            <button
              type="button"
              onClick={() => setShowMoreFarmers((prev) => !prev)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #16A34A',
                color: '#16A34A',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#F0FDF4';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF';
              }}
            >
              {showMoreFarmers ? 'View Less' : 'View More'}
            </button>
          </div>
          <div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '32px', paddingBottom: '32px' }}>
                <div style={{ animation: 'spin 1s linear infinite', borderRadius: '9999px', width: '24px', height: '24px', borderTop: '2px solid #16A34A', borderRight: '2px solid transparent' }}></div>
              </div>
            ) : visibleRecentFarmers.length > 0 ? (
              visibleRecentFarmers.map((farmer, index) => {
                // Rotating green shades for each row
                const greenShades = ['#16A34A', '#15803D', '#059669', '#10B981', '#34D399'];
                const borderColor = greenShades[index % greenShades.length];

                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '7px 12px',
                      borderRadius: '0 8px 8px 0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      borderLeft: `3px solid ${borderColor}`,
                      background: 'rgba(255,255,255,0.6)',
                      marginBottom: '6px',
                      animation: 'slideInFromLeft 0.5s ease-out forwards',
                      animationDelay: `${index * 100}ms`,
                      opacity: 0,
                    }}
                    onClick={() => openFarmerProfileByNic(farmer.nic)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.95)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(22,163,74,0.12)';
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.6)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)';
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: '#DCFCE7',
                        color: '#15803D',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {farmer.firstName.charAt(0)}{farmer.lastName.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{farmer.name}</p>
                      <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin style={{ width: '12px', color: '#9CA3AF' }} />
                        {farmer.location} • {formatDate(farmer.date)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px', color: '#9CA3AF' }}>
                <p style={{ fontSize: '14px' }}>No farmers found</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Harvests */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFEF7 100%)',
            border: '1px solid #FDE68A',
            borderRadius: '14px',
            padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '12px', borderBottom: '1px solid #FDE68A' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#111827' }}>Recently Added Harvests</h3>
            <button
              type="button"
              onClick={() => setShowMoreHarvests((prev) => !prev)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #16A34A',
                color: '#16A34A',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#F0FDF4';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF';
              }}
            >
              {showMoreHarvests ? 'View Less' : 'View More'}
            </button>
          </div>
          <div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '32px', paddingBottom: '32px' }}>
                <div style={{ animation: 'spin 1s linear infinite', borderRadius: '9999px', width: '24px', height: '24px', borderTop: '2px solid #16A34A', borderRight: '2px solid transparent' }}></div>
              </div>
            ) : visibleRecentHarvests.length > 0 ? (
              visibleRecentHarvests.map((harvest, index) => {
                // Determine crop badge color with exact color specifications
                const cropName = (harvest.crop || '').toLowerCase();
                let cropBgColor = '';
                let cropTextColor = '';
                let cropBorderColor = '';

                if (cropName.includes('paddy') || cropName.includes('rice')) {
                  cropBgColor = '#FEF08A';
                  cropTextColor = '#713F12';
                  cropBorderColor = '#EAB308';
                } else if (cropName.includes('corn')) {
                  cropBgColor = '#FED7AA';
                  cropTextColor = '#9A3412';
                  cropBorderColor = '#F97316';
                } else if (cropName.includes('wheat')) {
                  cropBgColor = '#FDE68A';
                  cropTextColor = '#92400E';
                  cropBorderColor = '#D97706';
                } else if (cropName.includes('tomato')) {
                  cropBgColor = '#FECACA';
                  cropTextColor = '#991B1B';
                  cropBorderColor = '#EF4444';
                } else if (cropName.includes('onion')) {
                  cropBgColor = '#E9D5FF';
                  cropTextColor = '#6B21A8';
                  cropBorderColor = '#9333EA';
                } else if (cropName.includes('carrot')) {
                  cropBgColor = '#FFEDD5';
                  cropTextColor = '#C2410C';
                  cropBorderColor = '#EA580C';
                } else if (cropName.includes('cabbage')) {
                  cropBgColor = '#BBF7D0';
                  cropTextColor = '#166534';
                  cropBorderColor = '#16A34A';
                } else if (cropName.includes('potato')) {
                  cropBgColor = '#D6D3D1';
                  cropTextColor = '#44403C';
                  cropBorderColor = '#78716C';
                } else {
                  // Default for unknown crops
                  cropBgColor = '#DBEAFE';
                  cropTextColor = '#1E40AF';
                  cropBorderColor = '#3B82F6';
                }

                // Format harvest quantity with comma separators
                const harvestQtyNumber = typeof harvest.harvestQty === 'number' ? harvest.harvestQty : parseFloat(harvest.harvestQty || '0');
                const formattedQty = harvestQtyNumber.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

                return (
                  <div
                    key={index}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '0 8px 8px 0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      borderLeft: `3px solid ${cropBorderColor}`,
                      background: 'rgba(255,255,255,0.6)',
                      marginBottom: '6px',
                      animation: 'fadeInUp 0.5s ease-out forwards',
                      animationDelay: `${index * 100}ms`,
                      opacity: 0,
                    }}
                    onClick={() => openFarmerProfileByName(harvest.farmerName)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.95)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(217,119,6,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.6)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{harvest.farmerName}</p>
                      <p style={{ fontSize: '14px', fontWeight: formattedQty === '0' ? 400 : 700, color: formattedQty === '0' ? '#9CA3AF' : '#15803D', margin: 0 }}>{formattedQty} kg</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span
                        style={{
                          backgroundColor: cropBgColor,
                          color: cropTextColor,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {harvest.crop}
                      </span>
                      <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>{formatDate(harvest.harvestDate)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px', color: '#9CA3AF' }}>
                <p style={{ fontSize: '14px' }}>No harvests found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedFarmerProfile && (
        <FarmerProfile
          farm={selectedFarmerProfile}
          onClose={() => setSelectedFarmerProfile(null)}
        />
      )}
    </div>
  );
}