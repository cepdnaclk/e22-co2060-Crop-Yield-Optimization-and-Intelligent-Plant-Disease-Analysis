import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Navigation, Loader2, MousePointer } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '')
  : '';


const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface Suggestion { formatted: string; lat: number; lon: number; address_line1?: string; }

interface Props {
  location: string;
  onLocationChange: (val: string) => void;
  onLocationSelect: (data: { address: string; latitude: number; longitude: number }) => void;
  latitude?: number | null;
  longitude?: number | null;
}

export function DiseaseLocationPicker({ location, onLocationChange, onLocationSelect, latitude, longitude }: Props) {
  const [query, setQuery] = useState(location || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasSelection, setHasSelection] = useState(!!(latitude && longitude));

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const placeMarker = useCallback((lat: number, lng: number, text: string) => {
    if (!mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]).setPopupContent(text).openPopup();
    } else {
      const m = L.marker([lat, lng], { icon: defaultIcon }).addTo(mapRef.current);
      m.bindPopup(text).openPopup();
      markerRef.current = m;
    }
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [7.8731, 80.7718], zoom: 8, doubleClickZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    }).addTo(map);

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]).setPopupContent('Loading...').openPopup();
      else { const m = L.marker([lat, lng], { icon: defaultIcon }).addTo(map); m.bindPopup('Loading...').openPopup(); markerRef.current = m; }
      try {
        const res = await fetch(`${API_BASE_URL}/api/geocode/reverse?lat=${lat}&lon=${lng}`);
        const data = await res.json();
        let addr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        if (data.features?.[0]) addr = data.features[0].properties.formatted || addr;
        markerRef.current?.setPopupContent(addr).openPopup();
        setQuery(addr); onLocationChange(addr); onLocationSelect({ address: addr, latitude: lat, longitude: lng }); setHasSelection(true);
      } catch { const f = `${lat.toFixed(6)}, ${lng.toFixed(6)}`; setQuery(f); onLocationChange(f); onLocationSelect({ address: f, latitude: lat, longitude: lng }); setHasSelection(true); }
    });

    mapRef.current = map;
    if (latitude && longitude) { placeMarker(latitude, longitude, location || 'Selected'); map.setView([latitude, longitude], 15); }
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/geocode/autocomplete?text=${encodeURIComponent(text)}&limit=5`);
      const data = await res.json();
      const r: Suggestion[] = (data.features || []).map((f: any) => ({ formatted: f.properties.formatted, lat: f.properties.lat, lon: f.properties.lon, address_line1: f.properties.address_line1 }));
      setSuggestions(r); setShowSuggestions(r.length > 0);
    } catch { setSuggestions([]); } finally { setSearching(false); }
  }, []);

  const handleInput = (val: string) => { setQuery(val); onLocationChange(val); setHasSelection(false); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => fetchSuggestions(val), 400); };

  const handleSelect = (s: Suggestion) => {
    setQuery(s.formatted); onLocationChange(s.formatted); setSuggestions([]); setShowSuggestions(false); setHasSelection(true);
    onLocationSelect({ address: s.formatted, latitude: s.lat, longitude: s.lon });
    placeMarker(s.lat, s.lon, s.formatted);
    mapRef.current?.flyTo([s.lat, s.lon], 16, { duration: 1.2 });
  };

  const handleClear = () => {
    setQuery(''); onLocationChange(''); setSuggestions([]); setShowSuggestions(false); setHasSelection(false);
    if (markerRef.current && mapRef.current) { mapRef.current.removeLayer(markerRef.current); markerRef.current = null; mapRef.current.setView([7.8731, 80.7718], 8); }
  };

  return (
    <div ref={wrapperRef}>
      <span className="text-gray-700 font-medium mb-2 block text-sm md:text-base flex items-center gap-2">
        <MapPin className="w-4 h-4 text-green-600" />Location / Plot Details
      </span>

      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <MapPin style={{ position: 'absolute', left: '12px', top: '11px', width: '18px', height: '18px', color: '#9CA3AF', zIndex: 2 }} />
        <input type="text" value={query} onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder="Search address or click on map..."
          style={{ width: '100%', padding: '10px 70px 10px 38px', border: '1.5px solid #D1D5DB', borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          onFocusCapture={(e) => { (e.target as HTMLInputElement).style.borderColor = '#10B981'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
          onBlurCapture={(e) => { (e.target as HTMLInputElement).style.borderColor = '#D1D5DB'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }}
        />
        <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {searching && <Loader2 style={{ width: '14px', height: '14px', color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />}
          {query && <button type="button" onClick={handleClear} style={{ padding: '3px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}><X style={{ width: '14px', height: '14px', color: '#9CA3AF' }} /></button>}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div style={{ position: 'absolute', zIndex: 9999, width: '100%', marginTop: '4px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', maxHeight: '220px', overflowY: 'auto' }}>
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => handleSelect(s)}
                style={{ width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none', borderBottom: i < suggestions.length - 1 ? '1px solid #F3F4F6' : 'none', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '8px' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F0FDF4'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}>
                <Navigation style={{ width: '14px', height: '14px', color: '#10B981', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.address_line1 || s.formatted.split(',')[0]}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.formatted}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <MousePointer style={{ width: '11px', height: '11px' }} />Search above or click on the map to pick location
      </p>

      <div style={{ position: 'relative' }}>
        <style>{`.disease-map img { max-width: none !important; height: auto !important; } .disease-map .leaflet-control-zoom a { width: 28px !important; height: 28px !important; line-height: 28px !important; font-size: 15px !important; display: flex !important; align-items: center !important; justify-content: center !important; color: #333 !important; background: white !important; }`}</style>
        <div className="disease-map" style={{ borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '240px' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      {hasSelection && (
        <div style={{ marginTop: '8px', padding: '8px 12px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin style={{ width: '14px', height: '14px', color: '#16A34A', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {query}</span>
        </div>
      )}
    </div>
  );
}
