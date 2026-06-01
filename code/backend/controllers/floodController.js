import axios from 'axios';
import User from '../models/user.js';

// Haversine formula to compute distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Mock gauges catalog for Sri Lanka fallbacks when live API is unavailable or unconfigured
const SRI_LANKA_MOCK_GAUGES = [
    {
        gaugeId: "hybas_colombo_01",
        gaugeName: "Kelani Ganga Gauge (Colombo)",
        severity: "EXTREME",
        forecastTrend: "RISING",
        gaugeLocation: { latitude: 6.9271, longitude: 79.8612 }
    },
    {
        gaugeId: "hybas_polonnaruwa_02",
        gaugeName: "Mahaweli Ganga Gauge (Polonnaruwa)",
        severity: "SEVERE",
        forecastTrend: "STEADY",
        gaugeLocation: { latitude: 7.9403, longitude: 81.0188 }
    },
    {
        gaugeId: "hybas_jaffna_03",
        gaugeName: "Valukai Aru Gauge (Jaffna)",
        severity: "ABOVE_NORMAL",
        forecastTrend: "FALLING",
        gaugeLocation: { latitude: 9.6615, longitude: 80.0088 }
    },
    {
        gaugeId: "hybas_anuradhapura_04",
        gaugeName: "Malwathu Oya Gauge (Anuradhapura)",
        severity: "NO_FLOODING",
        forecastTrend: "STEADY",
        gaugeLocation: { latitude: 8.3114, longitude: 80.4037 }
    },
    {
        gaugeId: "hybas_galle_05",
        gaugeName: "Gin Ganga Gauge (Galle)",
        severity: "NO_FLOODING",
        forecastTrend: "FALLING",
        gaugeLocation: { latitude: 6.0535, longitude: 80.2210 }
    },
    {
        gaugeId: "hybas_kandy_06",
        gaugeName: "Mahaweli River Gauge (Kandy)",
        severity: "ABOVE_NORMAL",
        forecastTrend: "RISING",
        gaugeLocation: { latitude: 7.2906, longitude: 80.6337 }
    }
];

/**
 * Endpoint: GET /api/flood/nearby
 * Fetches the user's saved tracking coordinates, queries the Google Flood API (or fallback),
 * maps out any threats within a 10 km radius, and returns the result.
 */
export async function getNearbyFloodForecast(req, res) {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        // Fetch coordinates from active user profile
        const user = await User.findOne({ email: req.user.email });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const { floodLatitude, floodLongitude, floodLocationName } = user;

        if (floodLatitude === null || floodLongitude === null || floodLatitude === undefined || floodLongitude === undefined) {
            return res.json({
                locationConfigured: false,
                message: "No tracking coordinates saved. Use the map to select your alert area."
            });
        }

        const floodsApiKey = process.env.FLOODS_API_KEY?.trim();
        let floodStatuses = [];
        let usedMockFallback = false;

        if (floodsApiKey) {
            try {
                // Call actual Google Flood Forecasting API
                const apiResponse = await axios.post(
                    `https://floodforecasting.googleapis.com/v1/floodStatus:searchLatestFloodStatusByArea?key=${floodsApiKey}`,
                    {
                        regionCode: 'LK',
                        pageSize: 10000,
                        includeNonQualityVerified: true
                    },
                    { timeout: 10000 }
                );

                if (apiResponse.data && apiResponse.data.floodStatuses) {
                    floodStatuses = apiResponse.data.floodStatuses;
                } else {
                    usedMockFallback = true;
                    floodStatuses = SRI_LANKA_MOCK_GAUGES;
                }
            } catch (apiError) {
                console.warn("[FloodController] Google Flood API call failed or timed out. Falling back to internal catalog.", apiError.message);
                usedMockFallback = true;
                floodStatuses = SRI_LANKA_MOCK_GAUGES;
            }
        } else {
            // No API key configured - use our high-fidelity mock gauges list
            usedMockFallback = true;
            floodStatuses = SRI_LANKA_MOCK_GAUGES;
        }

        // Search gauges within 10 km radius
        const RADIUS_LIMIT = 10.0; // 10 km
        const nearbyAlerts = [];

        floodStatuses.forEach(gauge => {
            if (!gauge.gaugeLocation || gauge.gaugeLocation.latitude === undefined || gauge.gaugeLocation.longitude === undefined) {
                return;
            }

            const dist = calculateDistance(
                floodLatitude,
                floodLongitude,
                gauge.gaugeLocation.latitude,
                gauge.gaugeLocation.longitude
            );

            if (dist <= RADIUS_LIMIT) {
                nearbyAlerts.push({
                    gaugeId: gauge.gaugeId,
                    gaugeName: gauge.gaugeName || `River Gauge (${gauge.gaugeId})`,
                    severity: gauge.severity || "UNKNOWN",
                    forecastTrend: gauge.forecastTrend || "UNKNOWN",
                    distance: parseFloat(dist.toFixed(2)),
                    coordinates: gauge.gaugeLocation
                });
            }
        });

        // Determine critical alert (highest severity within range)
        // Severity weight ranking: EXTREME > SEVERE > ABOVE_NORMAL > NO_FLOODING = UNKNOWN
        const severityWeights = {
            "EXTREME": 4,
            "SEVERE": 3,
            "ABOVE_NORMAL": 2,
            "NO_FLOODING": 1,
            "UNKNOWN": 0
        };

        let highestAlert = null;

        if (nearbyAlerts.length > 0) {
            nearbyAlerts.sort((a, b) => {
                const weightA = severityWeights[a.severity] || 0;
                const weightB = severityWeights[b.severity] || 0;
                if (weightA !== weightB) {
                    return weightB - weightA; // Sort highest severity first
                }
                return a.distance - b.distance; // Then sort closest distance first
            });

            // The first element has the highest severity
            const dominantAlert = nearbyAlerts[0];
            
            // Only report warning if severity > NO_FLOODING
            if (severityWeights[dominantAlert.severity] >= 2) {
                highestAlert = dominantAlert;
            }
        }

        return res.json({
            locationConfigured: true,
            latitude: floodLatitude,
            longitude: floodLongitude,
            locationName: floodLocationName,
            nearbyAlertsCount: nearbyAlerts.length,
            allNearbyAlerts: nearbyAlerts,
            highestAlert, // Null if all nearby gauges are NO_FLOODING or UNKNOWN
            usedMockFallback
        });

    } catch (error) {
        console.error("[FloodController] Error computing nearby floods:", error);
        return res.status(500).json({
            message: "Failed to load flood forecasting metrics.",
            error: error.message
        });
    }
}
