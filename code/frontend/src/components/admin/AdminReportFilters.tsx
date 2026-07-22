import { useTranslation } from 'react-i18next';

interface AdminReportFiltersProps {
  selectedYear: string;
  selectedSeason: string;
  selectedCrop: string | null;
  years: string[];
  seasons: string[];
  availableCrops: string[];
  defaultCropOptions: string[];
  onYearChange: (value: string) => void;
  onSeasonChange: (value: string) => void;
  onCropChange: (value: string | null) => void;
}

export function AdminReportFilters({
  selectedYear,
  selectedSeason,
  selectedCrop,
  years,
  seasons,
  availableCrops,
  defaultCropOptions,
  onYearChange,
  onSeasonChange,
  onCropChange,
}: AdminReportFiltersProps) {
  const { t } = useTranslation();
  const allCrops = Array.from(new Set([...defaultCropOptions, ...availableCrops]));

  const handleResetFilters = () => {
    onYearChange('');
    onSeasonChange('');
    onCropChange(null);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFEF7 100%)',
        border: '1px solid #FDE68A',
        borderRadius: '14px',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Dropdowns Row */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        {/* Filters Container */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          {/* Year Select */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
              {t('reportFilters.year')}
            </label>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(e.target.value)}
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
              <option value="">{t('reportFilters.allYears')}</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Season Select */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
              {t('reportFilters.season')}
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => onSeasonChange(e.target.value)}
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
              <option value="">{t('reportFilters.allSeasons')}</option>
              {seasons.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Crop Select */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>
              {t('reportFilters.crop')}
            </label>
            <select
              value={selectedCrop || ''}
              onChange={(e) => onCropChange(e.target.value || null)}
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
              <option value="">{t('reportFilters.allCrops')}</option>
              {allCrops.map((crop) => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Reset Filters Button */}
        <button
          onClick={handleResetFilters}
          style={{
            background: 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(249, 115, 22, 0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          {t('reportFilters.resetFilters')}
        </button>
      </div>
    </div>
  );
}
