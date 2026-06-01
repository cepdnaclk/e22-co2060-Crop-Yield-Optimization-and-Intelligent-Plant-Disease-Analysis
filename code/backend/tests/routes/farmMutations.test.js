import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const farmFindMock = jest.fn();
const farmFindOneMock = jest.fn();
const farmDeleteOneMock = jest.fn();
const userFindOneMock = jest.fn();
const userFindMock = jest.fn();
const userFindByIdAndUpdateMock = jest.fn();
const avgFindOneMock = jest.fn();
const avgFindMock = jest.fn();
const isAdminMock = jest.fn(() => true);
const sendPointsAwardedEmailMock = jest.fn().mockResolvedValue(undefined);

const FarmMock = jest.fn().mockImplementation((data) => ({
  ...data,
  save: jest.fn().mockResolvedValue({ ...data, _id: "farm-1" }),
}));
FarmMock.find = farmFindMock;
FarmMock.findOne = farmFindOneMock;
FarmMock.deleteOne = farmDeleteOneMock;

await jest.unstable_mockModule("../../models/farm.js", () => ({
  default: FarmMock,
}));

await jest.unstable_mockModule("../../models/user.js", () => ({
  default: {
    find: userFindMock,
    findOne: userFindOneMock,
    findByIdAndUpdate: userFindByIdAndUpdateMock,
  },
}));

await jest.unstable_mockModule("../../models/avgYield.js", () => ({
  default: {
    findOne: avgFindOneMock,
    find: avgFindMock,
  },
}));

await jest.unstable_mockModule("../../controllers/userController.js", () => ({
  isAdmin: isAdminMock,
}));

await jest.unstable_mockModule("../../services/emailService.js", () => ({
  sendPointsAwardedEmail: sendPointsAwardedEmailMock,
}));

const {
  createFarm,
  addHarvestAndPoints,
  updateFarm,
  deleteFarm,
  recalculateAllPoints,
} = await import("../../controllers/farmController.js");

describe("Farm Mutation Routes", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("POST /api/farms should create a farm", async () => {
    userFindOneMock.mockResolvedValue({ _id: "user-1" });
    farmFindMock.mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) });

    const app = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        req.body = body ? JSON.parse(body) : {};
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (payload) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };

        if (req.method === "POST" && req.url === "/api/farms") {
          req.user = { role: "admin" };
          return createFarm(req, res);
        }

        res.statusCode = 404;
        res.end();
      });
    });

    const response = await request(app)
      .post("/api/farms")
      .send({ farmerNIC: "200012345678", farmName: "New Farm", crop: "Rice" });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Farm created successfully");
  });

  test("POST /api/farms/addharvestandpoints should add harvest", async () => {
    avgFindOneMock.mockResolvedValue(null);
    farmFindOneMock.mockResolvedValue({
      farmId: "FAM00202",
      sizeInAcres: 2,
      district: "Galle",
      crop: "Rice",
      farmer: "user-1",
      harvests: [],
      save: jest.fn().mockResolvedValue({}),
    });

    const app = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        req.body = body ? JSON.parse(body) : {};
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (payload) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };

        if (req.method === "POST" && req.url === "/api/farms/addharvestandpoints") {
          req.user = { role: "admin" };
          return addHarvestAndPoints(req, res);
        }

        res.statusCode = 404;
        res.end();
      });
    });

    const response = await request(app)
      .post("/api/farms/addharvestandpoints")
      .send({ farmId: "FAM00202", season: "Maha", year: 2026, harvestQty: 100 });

    expect(response.statusCode).toBe(200);
    expect(response.body.pointsPending).toBe(true);
    expect(response.body.message).toMatch(/Points pending/i);
  });

  test("PUT /api/farms/:farmId should update farm", async () => {
    farmFindOneMock.mockResolvedValue({
      farmId: "FAM00202",
      farmName: "Old Farm",
      location: "Old Location",
      crop: "Rice",
      sizeInAcres: 1,
      district: "Galle",
      status: "Active",
      save: jest.fn().mockResolvedValue({ farmId: "FAM00202", farmName: "Updated Farm" }),
    });

    const app = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        req.body = body ? JSON.parse(body) : {};
        req.params = { farmId: "FAM00202" };
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (payload) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };

        if (req.method === "PUT" && req.url === "/api/farms/FAM00202") {
          req.user = { role: "admin" };
          return updateFarm(req, res);
        }

        res.statusCode = 404;
        res.end();
      });
    });

    const response = await request(app)
      .put("/api/farms/FAM00202")
      .send({ farmName: "Updated Farm" });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Farm updated successfully");
  });

  test("DELETE /api/farms/:farmId should delete farm", async () => {
    farmFindOneMock.mockResolvedValue({ farmId: "FAM00202" });
    farmDeleteOneMock.mockResolvedValue({ deletedCount: 1 });

    const app = http.createServer((req, res) => {
      req.params = { farmId: "FAM00202" };
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (payload) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(payload));
      };

      if (req.method === "DELETE" && req.url === "/api/farms/FAM00202") {
        req.user = { role: "admin" };
        return deleteFarm(req, res);
      }

      res.statusCode = 404;
      res.end();
    });

    const response = await request(app).delete("/api/farms/FAM00202");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Farm deleted successfully");
    expect(response.body.deletedFarmId).toBe("FAM00202");
  });

  test("POST /api/farms/recalculate-points should recalculate points", async () => {
    const userSaveMock = jest.fn().mockResolvedValue({});
    const farmSaveMock = jest.fn().mockResolvedValue({});

    userFindMock.mockResolvedValue([
      { _id: "user-1", role: "farmer", email: "farmer@example.com", firstName: "A", lastName: "Farmer", points: 0, save: userSaveMock },
    ]);
    farmFindMock.mockResolvedValue([
      {
        _id: "farm-1",
        farmId: "FAM00202",
        farmName: "North Field",
        farmer: "user-1",
        crop: "Rice",
        district: "Galle",
        sizeInAcres: 2,
        harvests: [
          { season: "Maha", year: 2026, harvestQty: 100, pointsEarned: null },
        ],
        save: farmSaveMock,
      },
    ]);
    avgFindOneMock.mockResolvedValue({ averageYield: 20 });
    avgFindMock.mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([{ averageYield: 40 }]) });

    const app = http.createServer((req, res) => {
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (payload) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(payload));
      };

      if (req.method === "POST" && req.url === "/api/farms/recalculate-points") {
        req.user = { role: "admin" };
        return recalculateAllPoints(req, res);
      }

      res.statusCode = 404;
      res.end();
    });

    const response = await request(app).post("/api/farms/recalculate-points");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toMatch(/recalculated successfully/i);
    expect(sendPointsAwardedEmailMock).toHaveBeenCalledTimes(1);
  });
});
