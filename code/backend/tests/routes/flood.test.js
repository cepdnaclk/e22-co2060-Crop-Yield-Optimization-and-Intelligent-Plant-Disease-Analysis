import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const findOneMock = jest.fn();

await jest.unstable_mockModule("../../models/user.js", () => ({
  default: {
    findOne: findOneMock,
  },
}));

await jest.unstable_mockModule("axios", () => ({
  default: {
    post: jest.fn().mockImplementation(() => {
      // Simulate Google Flood API response
      return Promise.resolve({
        data: {
          floodStatuses: [
            {
              gaugeId: "live_gauge_colombo",
              gaugeName: "Live Kelani Ganga (Test)",
              severity: "SEVERE",
              forecastTrend: "RISING",
              gaugeLocation: { latitude: 6.9300, longitude: 79.8650 } // Near Colombo (6.9271, 79.8612)
            },
            {
              gaugeId: "live_gauge_galle",
              gaugeName: "Live Gin Ganga (Test)",
              severity: "NO_FLOODING",
              forecastTrend: "STEADY",
              gaugeLocation: { latitude: 6.0500, longitude: 80.2200 } // Near Galle (6.0535, 80.2210)
            }
          ]
        }
      });
    }),
  },
}));

const { getNearbyFloodForecast } = await import("../../controllers/floodController.js");

describe("Flood Forecasting Controller & Proximity Filter", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Should report location unconfigured when user coords are null", async () => {
    findOneMock.mockResolvedValue({
      email: "farmer@test.com",
      floodLatitude: null,
      floodLongitude: null,
    });

    const req = {
      user: { email: "farmer@test.com" }
    };

    const res = {
      statusCode: 200,
      json(body) {
        this.body = body;
        return this;
      }
    };

    await getNearbyFloodForecast(req, res);

    expect(res.body.locationConfigured).toBe(false);
    expect(res.body.message).toContain("No tracking coordinates saved");
  });

  test("Should detect active severe flood threat within 10 km", async () => {
    // Farmer is located in Colombo (6.9271, 79.8612)
    findOneMock.mockResolvedValue({
      email: "farmer@test.com",
      floodLatitude: 6.9271,
      floodLongitude: 79.8612,
    });

    const req = {
      user: { email: "farmer@test.com" }
    };

    const res = {
      statusCode: 200,
      json(body) {
        this.body = body;
        return this;
      }
    };

    // Override FLOODS_API_KEY env for testing live route logic
    process.env.FLOODS_API_KEY = "test_google_key";

    await getNearbyFloodForecast(req, res);

    expect(res.body.locationConfigured).toBe(true);
    expect(res.body.latitude).toBe(6.9271);
    expect(res.body.longitude).toBe(79.8612);
    expect(res.body.nearbyAlertsCount).toBeGreaterThan(0);
    expect(res.body.highestAlert).not.toBeNull();
    expect(res.body.highestAlert.severity).toBe("SEVERE");
    expect(res.body.highestAlert.gaugeId).toBe("live_gauge_colombo");
  });

  test("Should report safe when all nearby gauges are NO_FLOODING", async () => {
    // Farmer is located near Galle (6.0530, 80.2215) where live_gauge_galle is NO_FLOODING
    findOneMock.mockResolvedValue({
      email: "farmer@test.com",
      floodLatitude: 6.0530,
      floodLongitude: 80.2215,
    });

    const req = {
      user: { email: "farmer@test.com" }
    };

    const res = {
      statusCode: 200,
      json(body) {
        this.body = body;
        return this;
      }
    };

    process.env.FLOODS_API_KEY = "test_google_key";

    await getNearbyFloodForecast(req, res);

    expect(res.body.locationConfigured).toBe(true);
    expect(res.body.highestAlert).toBeNull(); // Safe since nearby alerts are only NO_FLOODING
    expect(res.body.nearbyAlertsCount).toBe(1);
    expect(res.body.allNearbyAlerts[0].severity).toBe("NO_FLOODING");
  });
});
