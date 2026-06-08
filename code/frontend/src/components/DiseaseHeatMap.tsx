import React, { useEffect, useState, useRef, useCallback } from 'react';
import { svgPaths } from 'srilanka-districts-map/dist/districtData';
import { farmAPI } from '../services/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Tier definitions: color hex and label
const TIERS = [
  { max: 0,    color: '#ffffff', label: 'None' },
  { max: 124,  color: '#fff7ec', label: 'Very Low' },
  { max: 249,  color: '#fee8c8', label: 'Low' },
  { max: 374,  color: '#fdd49e', label: 'Warning' },
  { max: 499,  color: '#fdbb84', label: 'Alert' },
  { max: 624,  color: '#fc8d59', label: 'Moderate' },
  { max: 749,  color: '#ef6548', label: 'Elevated' },
  { max: 874,  color: '#d7301f', label: 'High' },
  { max: 999,  color: '#b30000', label: 'Very High' },
  { max: Infinity, color: '#7f0000', label: 'Critical' },
];

const getTier = (count: number) => {
  for (const tier of TIERS) {
    if (count <= tier.max) return tier;
  }
  return TIERS[TIERS.length - 1];
};

const getColorByCount = (count: number): string => getTier(count).color;

const getDistrictName = (key: string) =>
  key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

interface DistrictStats {
  total: number;
  breakdown: Record<string, number>;
}

export const DiseaseHeatMap: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, DistrictStats>>({});
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [diseaseFilter, setDiseaseFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('6');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const activeRequestSeq = useRef(0);

  const [tooltipSize, setTooltipSize] = useState({ width: 220, height: 80 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const tooltipCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setTooltipSize({
        width: node.offsetWidth,
        height: node.offsetHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (hoveredDistrict && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, [hoveredDistrict]);

  const handleStartChange = (value: string) => {
    if (customEnd && value && new Date(value) > new Date(customEnd)) {
      toast.error('Start date cannot be later than end date');
      return;
    }
    setCustomStart(value);
  };

  const handleEndChange = (value: string) => {
    if (customStart && value && new Date(value) < new Date(customStart)) {
      toast.error('End date cannot be earlier than start date');
      return;
    }
    setCustomEnd(value);
  };

  const loadData = useCallback(async () => {
    if (timeFilter === 'custom' && (!customStart || !customEnd)) {
      return;
    }
    const currentSeq = ++activeRequestSeq.current;
    setLoading(true);
    try {
      const data = await farmAPI.getDiseaseStats(diseaseFilter, timeFilter, customStart, customEnd);
      if (currentSeq !== activeRequestSeq.current) {
        return;
      }
      const normalizedStats: Record<string, DistrictStats> = {};
      const districtKeyMapping: Record<string, string> = {
        'monaragala': 'moneragala',
        'ratnapura': 'rathnapura',
        'nuwara-eliya': 'nuwara eliya',
      };
      for (const [key, value] of Object.entries(data)) {
        const mappedKey = districtKeyMapping[key] || key;
        const valObj = value as DistrictStats;
        normalizedStats[mappedKey] = {
          total: Number(valObj.total || 0),
          breakdown: valObj.breakdown || {},
        };
      }
      setStats(normalizedStats);
    } catch (error) {
      if (currentSeq === activeRequestSeq.current) {
        console.error('Failed to load disease heatmap stats', error);
      }
    } finally {
      if (currentSeq === activeRequestSeq.current) {
        setLoading(false);
      }
    }
  }, [diseaseFilter, timeFilter, customStart, customEnd]);

  useEffect(() => {
    if (timeFilter !== 'custom') {
      loadData();
    } else if (customStart && customEnd) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, diseaseFilter]);

  const handleApplyCustomDate = () => {
    loadData();
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    setMousePos({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    setMousePos({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full relative rounded-lg"
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Main layout: filters left, map right */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Filters panel */}
        <div className="sm:w-52 flex-shrink-0 space-y-3">
          {/* Disease filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Disease Type</label>
            <select
              value={diseaseFilter}
              onChange={(e) => setDiseaseFilter(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 shadow-sm cursor-pointer"
            >
              <option value="all">All Diseases</option>
              <option value="Bacterial leaf blight">Bacterial leaf blight</option>
              <option value="Brown spot">Brown spot</option>
              <option value="Leaf smut">Leaf smut</option>
            </select>
          </div>

          {/* Time filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Time Range</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 shadow-sm cursor-pointer"
            >
              <option value="1">Last 1 Month</option>
              <option value="3">Last 3 Months</option>
              <option value="6">Last 6 Months</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom date range picker */}
          {timeFilter === 'custom' && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(e) => handleEndChange(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <button
                onClick={handleApplyCustomDate}
                disabled={!customStart || !customEnd}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full flex items-center justify-center relative" style={{ height: '460px' }}>
            {loading && (
              <div className="absolute inset-0 bg-white/75 backdrop-blur-[1.5px] flex flex-col items-center justify-center z-20 rounded-lg transition-opacity duration-200">
                <Loader2 className="w-7 h-7 text-green-600 animate-spin mb-1.5" />
                <p className="text-xs text-gray-500 font-medium">Loading map…</p>
              </div>
            )}

            <svg
              viewBox="18 28 150 210"
              preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', height: '100%', display: 'block' }}
            >
              <g transform="scale(1.45)">
                {Object.entries(svgPaths).map(([district, paths]) => {
                  const count = stats[district]?.total || 0;
                  const fillColor = getColorByCount(count);
                  const isHovered = hoveredDistrict === district;

                  return paths.map((d, i) => (
                    <path
                      key={`${district}-${i}`}
                      d={d}
                      fill={fillColor}
                      stroke={'#000000'}
                      strokeWidth={isHovered ? 0.4 : 0.15}
                      style={{
                        cursor: 'pointer',
                        transition: 'fill 0.2s ease, stroke-width 0.15s ease',
                        filter: isHovered ? 'brightness(0.88)' : 'none',
                      }}
                      onMouseEnter={() => setHoveredDistrict(district)}
                      onMouseLeave={() => setHoveredDistrict(null)}
                    />
                  ));
                })}
              </g>
            </svg>
          </div>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '6px 16px',
              padding: '10px 8px 4px',
            }}
          >
            {[...TIERS].reverse().map((tier) => (
              <div
                key={tier.label}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: tier.color,
                    border: '1px solid #94a3b8',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1 }}>
                  {tier.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cursor-following tooltip */}
      {hoveredDistrict && (() => {
        let tooltipLeft = mousePos.x + 16;
        let tooltipTop = mousePos.y - 14;

        if (containerSize.width > 0) {
          // Adjust left position if it would overflow the right edge
          if (tooltipLeft + tooltipSize.width > containerSize.width) {
            tooltipLeft = mousePos.x - tooltipSize.width - 16;
          }
          // Clamp to left boundary
          if (tooltipLeft < 4) {
            tooltipLeft = 4;
          }
          // Adjust top position if it would overflow the bottom edge
          if (tooltipTop + tooltipSize.height > containerSize.height) {
            tooltipTop = mousePos.y - tooltipSize.height - 10;
          }
          // Clamp to top boundary
          if (tooltipTop < 4) {
            tooltipTop = 4;
          }
        }

        return (
          <div
            className="pointer-events-none"
            style={{
              position: 'absolute',
              left: tooltipLeft,
              top: tooltipTop,
              whiteSpace: 'nowrap',
              zIndex: 30,
            }}
          >
            <div
              ref={tooltipCallbackRef}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#f1f5f9',
                fontSize: '12px',
                lineHeight: '1.5',
                padding: '6px 10px',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {/* Header: District | Reports | Severity */}
              <div>
                <span style={{ fontWeight: 700, color: '#fff' }}>
                  {getDistrictName(hoveredDistrict)}
                </span>
                <span style={{ margin: '0 6px', color: '#64748b' }}>|</span>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                  {stats[hoveredDistrict]?.total || 0}
                </span>
                <span style={{ color: '#94a3b8', marginLeft: '3px' }}>reports</span>
                <span style={{ margin: '0 6px', color: '#64748b' }}>|</span>
                <span style={{ fontWeight: 700, color: '#fff' }}>
                  {getTier(stats[hoveredDistrict]?.total || 0).label}
                </span>
              </div>

              {/* Disease Breakdown */}
              {diseaseFilter === 'all' && stats[hoveredDistrict]?.breakdown && (
                <div className="border-t border-slate-700 pt-1 mt-1 space-y-0.5">
                  {Object.entries(stats[hoveredDistrict].breakdown)
                    .filter(([_, count]) => count > 0)
                    .map(([diseaseName, count]) => (
                      <div key={diseaseName} className="flex justify-between gap-4 text-[11px] text-slate-300">
                        <span>{diseaseName}:</span>
                        <span className="font-semibold text-white">{count}</span>
                      </div>
                    ))}
                  {Object.values(stats[hoveredDistrict].breakdown).every(count => count === 0) && (
                    <div className="text-slate-500 italic text-[11px]">No active disease cases</div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
