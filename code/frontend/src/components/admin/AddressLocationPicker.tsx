import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Navigation, CheckCircle2, Loader2, MousePointer } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GEOAPIFY_KEY = 'f8348ae376fc4ddd9b4357a90a86a8b1';

// Fix Leaflet default marker icon issue in bundled apps
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
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface AddressLocationPickerProps {
  address: string;
  onAddressChange: (address: string) => void;
  onLocationConfirm: (data: { address: string; latitude: number; longitude: number }) => void;
  latitude?: number | null;
  longitude?: number | null;
}

export function AddressLocationPicker({
  address,
  onAddressChange,
  onLocationConfirm,
  latitude,
  longitude,
}: AddressLocationPickerProps) {
  const [query, setQuery] = useState(address || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number; lng: number; address: string;
  } | null>(latitude && longitude ? { lat: latitude, lng: longitude, address } : null);
  const [confirmed, setConfirmed] = useState(!!(latitude && longitude));
  const [mapReady, setMapReady] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click outside to close suggestions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reverse geocode from lat/lng using Geoapify Geocoding API
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_KEY}`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].properties.formatted || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    } finally {
      setReverseGeocoding(false);
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }, []);

  // Place or move marker on the map
  const placeMarker = useCallback((lat: number, lng: number, popupText: string) => {
    if (!mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setPopupContent(popupText);
      markerRef.current.openPopup();
    } else {
      const marker = L.marker([lat, lng], { icon: defaultIcon }).addTo(mapRef.current);
      marker.bindPopup(popupText).openPopup();
      markerRef.current = marker;
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [7.8731, 80.7718], // Sri Lanka center
      zoom: 8,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: false, // Disable double-click zoom so we can use it for placing markers
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Click on map to place marker
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Place marker immediately
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setPopupContent('Loading address...').openPopup();
      } else {
        const marker = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
        marker.bindPopup('Loading address...').openPopup();
        markerRef.current = marker;
      }

      // Reverse geocode to get address
      setReverseGeocoding(true);
      try {
        const res = await fetch(
          `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_KEY}`
        );
        const data = await res.json();
        let addr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        if (data.features && data.features.length > 0) {
          addr = data.features[0].properties.formatted || addr;
        }

        // Update marker popup
        if (markerRef.current) {
          markerRef.current.setPopupContent(addr).openPopup();
        }

        // Update state
        setQuery(addr);
        onAddressChange(addr);
        setSelectedLocation({ lat, lng, address: addr });
        setConfirmed(false);
      } catch (err) {
        console.error('Reverse geocode error:', err);
        const fallbackAddr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setQuery(fallbackAddr);
        onAddressChange(fallbackAddr);
        setSelectedLocation({ lat, lng, address: fallbackAddr });
        setConfirmed(false);
      } finally {
        setReverseGeocoding(false);
      }
    });

    mapRef.current = map;
    setMapReady(true);

    // If we have existing coordinates, show them
    if (latitude && longitude) {
      const marker = L.marker([latitude, longitude], { icon: defaultIcon }).addTo(map);
      marker.bindPopup(address || 'Selected Location').openPopup();
      markerRef.current = marker;
      map.setView([latitude, longitude], 15);
    }

    // Fix map size after render (important for containers that start hidden)
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Geoapify Autocomplete API
  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&filter=countrycode:lk&limit=6&apiKey=${GEOAPIFY_KEY}`
      );
      const data = await res.json();
      console.log('Geoapify autocomplete response:', data);
      const results: Suggestion[] = (data.features || []).map((f: any) => ({
        formatted: f.properties.formatted,
        lat: f.properties.lat,
        lon: f.properties.lon,
        address_line1: f.properties.address_line1,
        address_line2: f.properties.address_line2,
        city: f.properties.city,
        state: f.properties.state,
        country: f.properties.country,
      }));
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (err) {
      console.error('Geoapify autocomplete error:', err);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onAddressChange(val);
    setConfirmed(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const handleSelectSuggestion = (s: Suggestion) => {
    setQuery(s.formatted);
    onAddressChange(s.formatted);
    setSuggestions([]);
    setShowSuggestions(false);
    setConfirmed(false);

    const loc = { lat: s.lat, lng: s.lon, address: s.formatted };
    setSelectedLocation(loc);

    // Update map
    placeMarker(s.lat, s.lon, s.formatted);
    if (mapRef.current) {
      mapRef.current.flyTo([s.lat, s.lon], 16, { duration: 1.2 });
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      setConfirmed(true);
      onLocationConfirm({
        address: selectedLocation.address,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
      });
    }
  };

  const handleClear = () => {
    setQuery('');
    onAddressChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedLocation(null);
    setConfirmed(false);

    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
      mapRef.current.setView([7.8731, 80.7718], 8);
    }
  };

  return (
    <div className="md:col-span-2" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Address *
      </label>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <MapPin style={{
          position: 'absolute', left: '12px', top: '12px',
          width: '20px', height: '20px', color: '#9CA3AF', zIndex: 2,
        }} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder="Start typing an address in Sri Lanka..."
          style={{
            width: '100%', padding: '12px 80px 12px 44px',
            border: '1.5px solid #D1D5DB', borderRadius: '10px',
            fontSize: '14px', outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxSizing: 'border-box',
          }}
          onFocusCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = '#10B981';
            (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)';
          }}
          onBlurCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = '#D1D5DB';
            (e.target as HTMLInputElement).style.boxShadow = 'none';
          }}
        />
        <div style={{
          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          {(searching || reverseGeocoding) && (
            <Loader2 style={{ width: '16px', height: '16px', color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />
          )}
          {query && (
            <button type="button" onClick={handleClear}
              style={{
                padding: '4px', borderRadius: '50%', border: 'none',
                background: 'transparent', cursor: 'pointer', display: 'flex',
              }}
            >
              <X style={{ width: '16px', height: '16px', color: '#9CA3AF' }} />
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', zIndex: 9999, width: '100%', marginTop: '4px',
            background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '280px', overflowY: 'auto',
          }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectSuggestion(s)}
                style={{
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  border: 'none', borderBottom: i < suggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                  background: 'white', cursor: 'pointer', display: 'flex',
                  alignItems: 'flex-start', gap: '10px', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F0FDF4'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
              >
                <Navigation style={{ width: '16px', height: '16px', color: '#10B981', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.address_line1 || s.formatted.split(',')[0]}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.formatted}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hint text */}
      <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <MousePointer style={{ width: '12px', height: '12px' }} />
        Search for an address above, or click directly on the map to pick a location
      </p>

      {/* Map Container - with CSS overrides for Leaflet compatibility with Tailwind */}
      <div style={{ position: 'relative' }}>
        <style>{`
          .leaflet-address-map img {
            max-width: none !important;
            height: auto !important;
          }
          .leaflet-address-map .leaflet-tile {
            width: 256px !important;
            height: 256px !important;
          }
          .leaflet-address-map .leaflet-control-zoom a {
            width: 30px !important;
            height: 30px !important;
            line-height: 30px !important;
            font-size: 16px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #333 !important;
            background: white !important;
          }
          .leaflet-address-map .leaflet-popup-content-wrapper {
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          }
          .leaflet-address-map .leaflet-popup-content {
            margin: 10px 14px !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
          }
          .leaflet-address-map .leaflet-container {
            font-family: inherit !important;
          }
        `}</style>
        <div
          className="leaflet-address-map"
          style={{
            borderRadius: '14px', overflow: 'hidden',
            border: '1.5px solid #E5E7EB',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            height: '320px', position: 'relative',
          }}
        >
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      {/* Location Info + Confirm */}
      {selectedLocation && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            borderRadius: '12px', padding: '14px 16px',
            border: `1.5px solid ${confirmed ? '#86EFAC' : '#93C5FD'}`,
            background: confirmed ? '#F0FDF4' : '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', transition: 'all 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
              {confirmed ? (
                <CheckCircle2 style={{ width: '20px', height: '20px', color: '#16A34A', flexShrink: 0, marginTop: '1px' }} />
              ) : (
                <MapPin style={{ width: '20px', height: '20px', color: '#2563EB', flexShrink: 0, marginTop: '1px' }} />
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: '14px', fontWeight: '600', margin: 0,
                  color: confirmed ? '#166534' : '#1E40AF',
                }}>
                  {confirmed ? '✅ Location Confirmed' : '📍 Location Selected'}
                </p>
                <p style={{
                  fontSize: '12px', color: '#4B5563', margin: '2px 0 0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {selectedLocation.address}
                </p>
                <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0', fontFamily: 'monospace' }}>
                  Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
            {!confirmed && (
              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  padding: '8px 20px', background: '#16A34A',
                  color: 'white', fontSize: '13px', fontWeight: '600',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  flexShrink: 0, transition: 'background 0.2s',
                  boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#15803D'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#16A34A'; }}
              >
                <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                Confirm Location
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
