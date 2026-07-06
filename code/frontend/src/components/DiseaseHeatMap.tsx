import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { svgPaths } from 'srilanka-districts-map/dist/districtData';
import { farmAPI } from '../services/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { translateDistrict } from '../utils/locationTranslations';

// Tier definitions: color hex and key for i18n
const TIERS = [
  { max: 0, color: '#ffffff', key: 'none' },
  { max: 124, color: '#fff7ec', key: 'veryLow' },
  { max: 249, color: '#fee8c8', key: 'low' },
  { max: 374, color: '#fdd49e', key: 'warning' },
  { max: 499, color: '#fdbb84', key: 'alert' },
  { max: 624, color: '#fc8d59', key: 'moderate' },
  { max: 749, color: '#ef6548', key: 'elevated' },
  { max: 874, color: '#d7301f', key: 'high' },
  { max: 999, color: '#b30000', key: 'veryHigh' },
  { max: Infinity, color: '#7f0000', key: 'critical' },
];

const getTier = (count: number) => {
  for (const tier of TIERS) {
    if (count <= tier.max) return tier;
  }
  return TIERS[TIERS.length - 1];
};

const getColorByCount = (count: number): string => getTier(count).color;

const translateDiseaseName = (
  disease: string,
  t: any
) => {
  switch (disease) {
    case "Bacterial leaf blight":
      return t("heatmap.bacterialLeafBlight");
    case "Brown spot":
      return t("heatmap.brownSpot");
    case "Leaf smut":
      return t("heatmap.leafSmut");
    default:
      return disease;
  }
};

interface DistrictStats {
  total: number;
  breakdown: Record<string, number>;
}

export const DiseaseHeatMap: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, DistrictStats>>({});
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [tappedDistrict, setTappedDistrict] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tapPos, setTapPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [diseaseFilter, setDiseaseFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('6');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const activeRequestSeq = useRef(0);

  const [tooltipSize, setTooltipSize] = useState({ width: 220, height: 80 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Which district to show tooltip for: hover takes priority, then tap
  const activeDistrict = hoveredDistrict || tappedDistrict;
  // Which position to use: mousePos if hovering, tapPos if tapped
  const activePos = hoveredDistrict ? mousePos : tapPos;

  const tooltipCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setTooltipSize({
        width: node.offsetWidth,
        height: node.offsetHeight,
      });
    }
  }, []);

  // Update container size whenever a district becomes active
  useEffect(() => {
    if (activeDistrict && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, [activeDistrict]);

  const handleStartChange = (value: string) => {
    if (customEnd && value && new Date(value) > new Date(customEnd)) {
      toast.error(t('heatmap.invalidStartDate'));
      return;
    }
    setCustomStart(value);
  };

  const handleEndChange = (value: string) => {
    if (customStart && value && new Date(value) < new Date(customStart)) {
      toast.error(t('heatmap.invalidEndDate'));
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

  // Dismiss tapped tooltip when clicking outside the map paths
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;
    if (target.tagName !== 'path') {
      setTappedDistrict(null);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full relative rounded-lg"
      onMouseMove={handleMouseMove}
      onClick={handleContainerClick}
    >
      {/* Main layout: filters left, map right */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Filters panel */}
        <div className="sm:w-52 flex-shrink-0 space-y-3">

          {/* Disease filter */}
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 700, color: '#374151',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
            }}>
              <span style={{
                width: '16px', height: '16px', borderRadius: '4px',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              {t('heatmap.diseaseType')}
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={diseaseFilter}
                onChange={(e) => setDiseaseFilter(e.target.value)}
                style={{
                  width: '100%', padding: '9px 36px 9px 12px',
                  background: 'linear-gradient(to bottom, #ffffff, #f9fafb)',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '10px',
                  fontSize: '13px', fontWeight: 500, color: '#111827',
                  cursor: 'pointer', outline: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  appearance: 'none' as const,
                  WebkitAppearance: 'none' as const,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#10b981';
                  e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                }}
              >
                <option value="all">{t('heatmap.allDiseases')}</option>
                <option value="Bacterial leaf blight">{t('heatmap.bacterialLeafBlight')}</option>
                <option value="Brown spot">{t('heatmap.brownSpot')}</option>
                <option value="Leaf smut">{t('heatmap.leafSmut')}</option>
              </select>
              {/* Custom chevron */}
              <div style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: '#6b7280',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Time filter */}
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 700, color: '#374151',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
            }}>
              <span style={{
                width: '16px', height: '16px', borderRadius: '4px',
                background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
              {t('heatmap.timeRange')}
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                style={{
                  width: '100%', padding: '9px 36px 9px 12px',
                  background: 'linear-gradient(to bottom, #ffffff, #f9fafb)',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '10px',
                  fontSize: '13px', fontWeight: 500, color: '#111827',
                  cursor: 'pointer', outline: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  appearance: 'none' as const,
                  WebkitAppearance: 'none' as const,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                }}
              >
                <option value="1">{t('heatmap.last1Month')}</option>
                <option value="3">{t('heatmap.last3Months')}</option>
                <option value="6">{t('heatmap.last6Months')}</option>
                <option value="custom">{t('heatmap.customRange')}</option>
              </select>
              {/* Custom chevron */}
              <div style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: '#6b7280',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Custom date range picker */}
          {timeFilter === 'custom' && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #f8fafc)',
              border: '1.5px solid #bbf7d0',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              <div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '5px',
                }}>
                  <span style={{
                    fontSize: '10px', background: '#dcfce7', color: '#15803d',
                    borderRadius: '4px', padding: '1px 5px', fontWeight: 700,
                  }}>{t('heatmap.from')}</span>
                </label>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(e) => handleStartChange(e.target.value)}
                  style={{
                    width: '100%', fontSize: '12px', fontWeight: 500,
                    border: '1.5px solid #d1d5db', borderRadius: '8px',
                    padding: '7px 10px', outline: 'none', background: '#fff',
                    color: '#111827', boxSizing: 'border-box' as const,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '5px',
                }}>
                  <span style={{
                    fontSize: '10px', background: '#dbeafe', color: '#1d4ed8',
                    borderRadius: '4px', padding: '1px 5px', fontWeight: 700,
                  }}>{t('heatmap.to')}</span>
                </label>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(e) => handleEndChange(e.target.value)}
                  style={{
                    width: '100%', fontSize: '12px', fontWeight: 500,
                    border: '1.5px solid #d1d5db', borderRadius: '8px',
                    padding: '7px 10px', outline: 'none', background: '#fff',
                    color: '#111827', boxSizing: 'border-box' as const,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button
                onClick={handleApplyCustomDate}
                disabled={!customStart || !customEnd}
                style={{
                  width: '100%', padding: '9px',
                  background: customStart && customEnd
                    ? 'linear-gradient(135deg, #059669, #10b981)'
                    : '#e5e7eb',
                  color: customStart && customEnd ? 'white' : '#9ca3af',
                  border: 'none', borderRadius: '9px',
                  fontSize: '13px', fontWeight: 700,
                  cursor: customStart && customEnd ? 'pointer' : 'not-allowed',
                  boxShadow: customStart && customEnd ? '0 2px 8px rgba(16,185,129,0.3)' : 'none',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.03em',
                }}
                onMouseEnter={(e) => {
                  if (customStart && customEnd) {
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.4)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = customStart && customEnd ? '0 2px 8px rgba(16,185,129,0.3)' : 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                {t('heatmap.applyFilter')}
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
                <p className="text-xs text-gray-500 font-medium">{t('heatmap.loadingMap')}</p>
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
                  const isHovered = hoveredDistrict === district || tappedDistrict === district;

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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!containerRef.current) return;
                        const rect = containerRef.current.getBoundingClientRect();
                        setTapPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        setTappedDistrict(prev => prev === district ? null : district);
                      }}
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
                key={tier.key}
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
                  {t(`heatmap.legend.${tier.key}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unified floating tooltip — works for both hover (desktop) and tap (mobile) */}
      {activeDistrict && (() => {
        let tooltipLeft = activePos.x + 16;
        let tooltipTop = activePos.y - 14;

        if (containerSize.width > 0) {
          if (tooltipLeft + tooltipSize.width > containerSize.width) {
            tooltipLeft = activePos.x - tooltipSize.width - 16;
          }
          if (tooltipLeft < 4) tooltipLeft = 4;
          if (tooltipTop + tooltipSize.height > containerSize.height) {
            tooltipTop = activePos.y - tooltipSize.height - 10;
          }
          if (tooltipTop < 4) tooltipTop = 4;
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
              <div>
                <span style={{ fontWeight: 700, color: '#fff' }}>
                  {translateDistrict(activeDistrict, i18n.language as 'en' | 'si')}
                </span>
                <span style={{ margin: '0 6px', color: '#64748b' }}>|</span>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                  {stats[activeDistrict]?.total || 0}
                </span>
                <span style={{ color: '#94a3b8', marginLeft: '3px' }}>{t('heatmap.reports')}</span>
                <span style={{ margin: '0 6px', color: '#64748b' }}>|</span>
                <span style={{ fontWeight: 700, color: '#fff' }}>
                  {t(`heatmap.legend.${getTier(stats[activeDistrict]?.total || 0).key}`)}
                </span>
              </div>
              {diseaseFilter === 'all' && stats[activeDistrict]?.breakdown && (
                <div className="border-t border-slate-700 pt-2 mt-1 space-y-0.5">
                  {Object.entries(stats[activeDistrict].breakdown)
                    .filter(([_, count]) => count > 0)
                    .map(([diseaseName, count]) => (
                      <div key={diseaseName} className="flex justify-between gap-4 text-[11px] text-slate-300">
                        <span>{translateDiseaseName(diseaseName, t)}:</span>
                        <span className="font-semibold text-white">{count}</span>
                      </div>
                    ))}
                  {Object.values(stats[activeDistrict].breakdown).every(count => count === 0) && (
                    <div className="text-slate-500 italic text-[11px]">{t('heatmap.noCases')}</div>
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
