import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Navigation, Loader2, MousePointer, CheckCircle2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createPortal } from 'react-dom';

const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '')
  : '';

// Default Leaflet marker icon configurations
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Suggestion {
  formatted: string;
  lat: number;
  lon: number;
  address_line1?: string;
}

interface FloodMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lon: number, address: string) => Promise<void>;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}

export function FloodMapModal({
  isOpen,
  onClose,
  onLocationSelect,
  initialLatitude,
  initialLongitude
}: FloodMapModalProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialLatitude && initialLongitude ? { lat: initialLatitude, lng: initialLongitude } : null
  );
  const [isSaving, setIsSaving] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close modal on escape keypress
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Click outside suggestions list to close it
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', clickHandler);
    return () => document.removeEventListener('mousedown', clickHandler);
  }, []);

  const placeMarker = useCallback((lat: number, lng: number, label: string) => {
    if (!mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]).setPopupContent(label).openPopup();
    } else {
      const m = L.marker([lat, lng], { icon: defaultIcon }).addTo(mapRef.current);
      m.bindPopup(label).openPopup();
      markerRef.current = m;
    }
  }, []);

  // Initialize leaflet map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    const initialLat = initialLatitude || 7.8731; // Centered in Sri Lanka
    const initialLng = initialLongitude || 80.7718;
    const initialZoom = initialLatitude && initialLongitude ? 13 : 8;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      doubleClickZoom: false,
      maxBounds: [
        [5.8, 79.5], // South-West
        [9.9, 82.0], // North-East
      ],
      maxBoundsViscosity: 1.0, // Solid bounds, no bouncing outside
      minZoom: 7, // Prevent zooming out to see the whole world
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Click handler to drop pin
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      
      // Prevent selecting locations outside Sri Lanka
      if (lat < 5.8 || lat > 9.9 || lng < 79.5 || lng > 82.0) {
        alert("Please select a location within Sri Lanka.");
        return;
      }

      setSelectedCoords({ lat, lng });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]).setPopupContent('Resolving address...').openPopup();
      } else {
        const m = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
        m.bindPopup('Resolving address...').openPopup();
        markerRef.current = m;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/geocode/reverse?lat=${lat}&lon=${lng}`);
        const data = await res.json();
        let addr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (data.features?.[0]) {
          addr = data.features[0].properties.formatted || addr;
        }
        markerRef.current?.setPopupContent(addr).openPopup();
        setQuery(addr);
      } catch {
        const f = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setQuery(f);
      }
    });

    mapRef.current = map;

    // Load initial marker
    if (initialLatitude && initialLongitude) {
      placeMarker(initialLatitude, initialLongitude, 'Current tracking area');
    }

    // Solve map canvas sizing bugs inside hidden div containers
    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 300);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [isOpen, initialLatitude, initialLongitude, placeMarker]);

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/geocode/autocomplete?text=${encodeURIComponent(text)}&limit=5`);
      const data = await res.json();
      const mapped: Suggestion[] = (data.features || []).map((f: any) => ({
        formatted: f.properties.formatted,
        lat: f.properties.lat,
        lon: f.properties.lon,
        address_line1: f.properties.address_line1
      }));
      setSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const handleSelectSuggestion = (s: Suggestion) => {
    setQuery(s.formatted);
    setSelectedCoords({ lat: s.lat, lng: s.lon });
    setSuggestions([]);
    setShowSuggestions(false);
    placeMarker(s.lat, s.lon, s.formatted);
    mapRef.current?.flyTo([s.lat, s.lon], 14, { duration: 1.2 });
  };

  const handleSave = async () => {
    if (!selectedCoords) return;
    setIsSaving(true);
    try {
      let finalAddress = query;
      if (!finalAddress) {
        finalAddress = `Location (${selectedCoords.lat.toFixed(4)}, ${selectedCoords.lng.toFixed(4)})`;
      }
      await onLocationSelect(selectedCoords.lat, selectedCoords.lng, finalAddress);
      onClose();
    } catch (err) {
      console.error("Failed to update coordinates:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100000 }}
      className="flex items-center justify-center p-2 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      {/* Modal card — takes up to 95vh on mobile, 85vh on desktop */}
      <div
        className="relative bg-white w-full rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
        style={{ maxWidth: '640px', maxHeight: '95vh' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between border-b border-gray-100 flex-shrink-0"
          style={{ padding: '12px 16px' }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-800" style={{ fontSize: '15px' }}>
              Set Tracking Location
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          className="flex-1 flex flex-col"
          style={{ padding: '12px 16px', gap: '10px', overflowY: 'auto' }}
          ref={wrapperRef}
        >
          {/* Search bar */}
          <div className="relative flex-shrink-0" style={{ zIndex: 10001 }}>
            <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400" style={{ transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              placeholder="Search cities, districts, or landmarks..."
              className="w-full border border-gray-200 rounded-xl text-sm focus:border-green-500 transition-all outline-none"
              style={{ paddingLeft: '36px', paddingRight: '36px', paddingTop: '10px', paddingBottom: '10px', fontSize: '13px' }}
            />
            {searching && (
              <div className="absolute right-3 top-1/2" style={{ transform: 'translateY(-50%)' }}>
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl overflow-y-auto"
                style={{ marginTop: '6px', maxHeight: '160px', zIndex: 10002 }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full flex items-start gap-2.5 text-left hover:bg-green-50 border-b border-gray-50 transition-colors cursor-pointer"
                    style={{ padding: '8px 14px', fontSize: '13px' }}
                  >
                    <Navigation className="w-3.5 h-3.5 text-green-600 flex-shrink-0" style={{ marginTop: '2px' }} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{s.address_line1 || s.formatted.split(',')[0]}</p>
                      <p className="text-gray-500 truncate" style={{ fontSize: '11px' }}>{s.formatted}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hint text */}
          <p className="text-gray-500 flex items-center gap-1 flex-shrink-0" style={{ fontSize: '11px' }}>
            <MousePointer className="w-3 h-3 text-gray-400 flex-shrink-0" />
            Tap or click anywhere on the map to drop a pin.
          </p>

          {/* ── Map container — explicit height so Leaflet can render ── */}
          <div
            className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm"
            style={{ height: 'clamp(300px, 55vh, 500px)', flexShrink: 0, zIndex: 1000 }}
          >
            <style>{`
              .flood-modal-map img { max-width: none !important; height: auto !important; }
              .flood-modal-map .leaflet-control-zoom a {
                width: 28px !important; height: 28px !important;
                line-height: 28px !important; font-size: 14px !important;
                display: flex !important; align-items: center !important;
                justify-content: center !important; background: white !important;
                color: #333 !important; border-radius: 4px !important;
              }
            `}</style>
            <div className="flood-modal-map" style={{ width: '100%', height: '100%' }} ref={mapContainerRef} />
          </div>

          {/* Selected coords badge */}
          {selectedCoords && (
            <div
              className="bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 flex-shrink-0 overflow-hidden"
              style={{ padding: '8px 12px' }}
            >
              <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-green-800 truncate flex-1" style={{ fontSize: '12px' }}>
                <strong>Selected:</strong> {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
              </span>
              <span
                className="bg-green-100 text-green-700 font-semibold rounded-full flex-shrink-0"
                style={{ fontSize: '10px', padding: '2px 8px' }}
              >
                Active
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-end gap-3 border-t border-gray-100 flex-shrink-0"
          style={{ padding: '12px 16px' }}
        >
          <button
            onClick={onClose}
            className="text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors cursor-pointer"
            style={{ padding: '8px 16px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedCoords || isSaving}
            className="flex items-center gap-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md transition-all cursor-pointer"
            style={{ padding: '8px 20px', opacity: !selectedCoords || isSaving ? 0.5 : 1 }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
