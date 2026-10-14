import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const farmFindMock = jest.fn();
const farmDistinctMock = jest.fn();
const userFindOneMock = jest.fn();
const diseaseFindMock = jest.fn().mockResolvedValue([]);

await jest.unstable_mockModule("../../models/diseaseReport.js", () => ({
  default: { find: diseaseFindMock },
}));

const FarmMock = {
  find: farmFindMock,
  distinct: farmDistinctMock,
};

await jest.unstable_mockModule("../../models/farm.js", () => ({
  default: FarmMock,
}));

await jest.unstable_mockModule("../../models/user.js", () => ({
  default: {
    findOne: userFindOneMock,
  },
}));

await jest.unstable_mockModule("../../models/avgYield.js", () => ({
  default: {},
}));

await jest.unstable_mockModule("../../controllers/userController.js", () => ({
  isAdmin: jest.fn(() => true),
}));

const { getHarvestHistory, getAllCrops, getFarmerReport } = await import("../../controllers/farmController.js");

describe("Farm Report Routes", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("GET /api/farms/harvests should return harvest history", async () => {
    farmFindMock.mockReturnValue({
      populate: jest.fn().mockResolvedValue([
        {
          farmId: "FAM00202",
          farmName: "Sample Farm",
          crop: "Rice",
          location: "Galle",
          district: "Galle",
          sizeInAcres: 2,
          farmer: { firstName: "Nimal", lastName: "Perera", nic: "200012345678" },
          harvests: [
            {
              _id: "har-1",
              season: "Maha",
              year: 2026,
              harvestQty: 200,
              pointsEarned: 150,
              createdDate: new Date().toISOString(),
            },
          ],
        },
      ]),
    });

    const app = http.createServer((req, res) => {
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (payload) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(payload));
      };

      if (req.method === "GET" && req.url === "/api/farms/harvests") {
        req.user = { id: "admin-1", role: "admin" };
        return getHarvestHistory(req, res);
      }

      res.statusCode = 404;
      res.end();
    });

    const response = await request(app).get("/api/farms/harvests");

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.harvests)).toBe(true);
    expect(response.body.total).toBe(1);
  });

  test("GET /api/farms/crops/list should return crops", async () => {
    farmDistinctMock.mockResolvedValue(["Tea", "Rice", "Coconut"]);

    const app = http.createServer((req, res) => {
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (payload) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(payload));
      };

      if (req.method === "GET" && req.url === "/api/farms/crops/list") {
        req.user = { id: "admin-1", role: "admin" };
        return getAllCrops(req, res);
      }

      res.statusCode = 404;
      res.end();
    });

    const response = await request(app).get("/api/farms/crops/list");

    expect(response.statusCode).toBe(200);
    expect(response.body.crops).toEqual(["Coconut", "Rice", "Tea"]);
    expect(response.body.total).toBe(3);
  });

  test("GET /api/farms/my-report should return farmer report", async () => {
    userFindOneMock.mockResolvedValue({ _id: "user-1", points: 120, firstName: "Nimal", password: "private", emailOtp: { code: "private" } });
    diseaseFindMock.mockResolvedValue([
      { farm: "farm-1", diseases: [{ _id: "observation-1", disease: "Leaf Blast", confidence: 92, notes: "Follow up", createdDate: "2026-01-10" }] },
      { farm: "deleted-farm", diseases: [{ _id: "observation-2", disease: "Brown Spot", confidence: 81 }] },
    ]);
    farmFindMock.mockResolvedValue([
      {
        _id: "farm-1", farmId: "FAM001", farmName: "Sample Farm",
        crop: "Rice",
        sizeInAcres: 2,
        harvests: [
          {
            createdDate: new Date().toISOString(),
            harvestQty: 50,
          },
        ],
      },
    ]);

    const app = http.createServer((req, res) => {
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (payload) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(payload));
      };

      if (req.method === "GET" && req.url === "/api/farms/my-report") {
        req.user = { email: "farmer@example.com" };
        return getFarmerReport(req, res);
      }

      res.statusCode = 404;
      res.end();
    });

    const response = await request(app).get("/api/farms/my-report");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Report retrieved successfully");
    expect(Array.isArray(response.body.harvestTrend)).toBe(true);
    expect(farmFindMock).toHaveBeenLastCalledWith({ farmer: "user-1" });
    expect(diseaseFindMock).toHaveBeenLastCalledWith({ farmer: "user-1" });
    expect(response.body.farmer.firstName).toBe("Nimal");
    expect(response.body.farmer.password).toBeUndefined();
    expect(response.body.farmer.emailOtp).toBeUndefined();
    expect(response.body.farms[0].farmId).toBe("FAM001");
    expect(response.body.diseaseRecords[0]).toMatchObject({ farmId: "FAM001", crop: "Rice", disease: "Leaf Blast", confidence: 92 });
    expect(response.body.diseaseRecords[1]).toMatchObject({ farmId: null, crop: null });
  });

  test("farmer report requires authentication before querying records", async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const calls = diseaseFindMock.mock.calls.length;
    await getFarmerReport({}, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(diseaseFindMock.mock.calls.length).toBe(calls);
  });
});
