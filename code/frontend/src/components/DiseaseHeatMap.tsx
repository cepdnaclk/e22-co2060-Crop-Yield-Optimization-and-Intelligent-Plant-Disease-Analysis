import React, { useEffect, useState } from 'react';
import { svgPaths } from 'srilanka-districts-map/dist/districtData';
import { farmAPI } from '../services/api';
import { Loader2 } from 'lucide-react';

// Color map based on threshold values (0 - 1000+)
const getColorByCount = (count: number): string => {
  if (count === 0) return '#bbf7d0'; // bg-green-200 (None)
  if (count <= 124) return '#86efac'; // bg-green-300 (Very Low)
  if (count <= 249) return '#fef08a'; // bg-yellow-200 (Low)
  if (count <= 374) return '#fde047'; // bg-yellow-300 (Warning)
  if (count <= 499) return '#facc15'; // bg-yellow-400 (Alert)
  if (count <= 624) return '#fb923c'; // bg-orange-400 (Moderate)
  if (count <= 749) return '#f97316'; // bg-orange-500 (Elevated)
  if (count <= 874) return '#ef4444'; // bg-red-500 (High)
  if (count <= 999) return '#b91c1c'; // bg-red-700 (Very High)
  return '#7f1d1d'; // bg-red-900 (Critical)
};

export const DiseaseHeatMap: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await farmAPI.getDiseaseStats();
        // The backend returns normalized district names (lowercase, hyphens for spaces).
        // districtData in the package uses spaces instead of hyphens for some e.g. "nuwara eliya",
        // and sometimes different spellings (e.g., "moneragala" vs "monaragala", "rathnapura" vs "ratnapura").
        // Let's create a mapping that aligns backend hyphens to package keys.
        const normalizedStats: Record<string, number> = {};
        
        const districtKeyMapping: Record<string, string> = {
          'monaragala': 'moneragala',
          'ratnapura': 'rathnapura',
          'nuwara-eliya': 'nuwara eliya'
        };

        for (const [key, value] of Object.entries(data)) {
          const mappedKey = districtKeyMapping[key] || key;
          normalizedStats[mappedKey] = Number(value);
        }

        setStats(normalizedStats);
      } catch (error) {
        console.error("Failed to load disease heatmap stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDistrictName = (key: string) => {
    return key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="w-full h-full relative min-h-[280px] flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden group">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 z-10">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-2" />
          <p className="text-sm text-gray-500 font-medium">Loading map data...</p>
        </div>
      )}
      
      {!loading && (
        <svg viewBox="30 40 132 184" preserveAspectRatio="xMidYMid meet" className="w-full h-full max-h-[350px]">
          <g transform="scale(1.45)">
            {Object.entries(svgPaths).map(([district, paths]) => {
              const count = stats[district] || 0;
              const fillColor = getColorByCount(count);
              const isHovered = hoveredDistrict === district;

              return paths.map((d, i) => (
                <path
                  key={`${district}-${i}`}
                  d={d}
                  fill={fillColor}
                  stroke={isHovered ? '#000' : '#475569'}
                  strokeWidth={isHovered ? 0.3 : 0.15}
                  className="transition-colors duration-300 outline-none"
                  onMouseEnter={() => setHoveredDistrict(district)}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{`${getDistrictName(district)}: ${count} diseases reported (last 6m)`}</title>
                </path>
              ));
            })}
          </g>
        </svg>
      )}

      {/* Floating tooltip for extra clarity */}
      {!loading && hoveredDistrict && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur text-gray-800 text-xs px-3 py-2 rounded shadow-md pointer-events-none transition-opacity font-medium border border-gray-100">
          <span className="font-bold text-gray-900">{getDistrictName(hoveredDistrict)}</span>
          <br />
          {stats[hoveredDistrict] || 0} diseases reported
        </div>
      )}
    </div>
  );
};
