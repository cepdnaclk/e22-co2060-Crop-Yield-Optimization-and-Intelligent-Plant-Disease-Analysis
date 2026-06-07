import React, { useEffect, useState, useRef, useCallback } from 'react';
import { svgPaths } from 'srilanka-districts-map/dist/districtData';
import { farmAPI } from '../services/api';
import { Loader2 } from 'lucide-react';

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

export const DiseaseHeatMap: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await farmAPI.getDiseaseStats();
        const normalizedStats: Record<string, number> = {};
        const districtKeyMapping: Record<string, string> = {
          'monaragala': 'moneragala',
          'ratnapura': 'rathnapura',
          'nuwara-eliya': 'nuwara eliya',
        };
        for (const [key, value] of Object.entries(data)) {
          const mappedKey = districtKeyMapping[key] || key;
          normalizedStats[mappedKey] = Number(value);
        }
        setStats(normalizedStats);
      } catch (error) {
        console.error('Failed to load disease heatmap stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full relative flex flex-col items-center rounded-lg"
      onMouseMove={handleMouseMove}
    >
      {/* Map area */}
      <div className="w-full flex items-center justify-center" style={{ height: '460px' }}>
        {loading && (
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-7 h-7 text-green-600 animate-spin mb-1.5" />
            <p className="text-xs text-gray-500 font-medium">Loading map…</p>
          </div>
        )}

        {!loading && (
          <svg
            viewBox="18 28 150 210"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
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
        )}
      </div>

      {/* Legend */}
      {!loading && (
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
      )}

      {/* Cursor-following tooltip */}
      {!loading && hoveredDistrict && (
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute',
            left: mousePos.x + 16,
            top: mousePos.y - 14,
            whiteSpace: 'nowrap',
            zIndex: 30,
          }}
        >
          <div
            style={{
              background: '#1e293b',
              color: '#f1f5f9',
              fontSize: '12px',
              lineHeight: '1.5',
              padding: '6px 10px',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ fontWeight: 700, color: '#fff' }}>
              {getDistrictName(hoveredDistrict)}
            </span>
            <span style={{ margin: '0 6px', color: '#64748b' }}>|</span>
            <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
              {stats[hoveredDistrict] || 0}
            </span>
            <span style={{ color: '#94a3b8', marginLeft: '3px' }}>reports</span>
            <span style={{ margin: '0 6px', color: '#64748b' }}>|</span>
            <span
              style={{
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {getTier(stats[hoveredDistrict] || 0).label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
