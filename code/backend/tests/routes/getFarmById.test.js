import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const findOneMock = jest.fn();

await jest.unstable_mockModule("../../models/farm.js", () => ({
  default: {
    findOne: findOneMock,
  },
}));

await jest.unstable_mockModule("../../models/user.js", () => ({
  default: {},
}));

await jest.unstable_mockModule("../../models/avgYield.js", () => ({
  default: {},
}));

await jest.unstable_mockModule("../../controllers/userController.js", () => ({
  isAdmin: jest.fn(() => true),
}));

const { getFarmById } = await import("../../controllers/farmController.js");

describe("Farm By ID Route", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("GET /api/farms/:farmId should return a farm", async () => {
    findOneMock.mockReturnValue({
      populate: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({
          farmId: "FAM00202",
          farmName: "Sample Farm",
          location: "Sample Location",
          farmer: {
            firstName: "Nimal",
            lastName: "Perera",
            nic: "200012345678",
            phone: "0712345678",
            division: "Galle",
            points: 120,
            image: "https://example.com/farmer.png",
          },
          district: "Galle",
          sizeInAcres: 2.5,
          crop: "Rice",
          status: "Active",
          createdDate: "2026-05-26T00:00:00.000Z",
          harvests: [],
        }),
      })),
    });

    const app = http.createServer((req, res) => {
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };

      res.json = (body) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(body));
      };

      if (req.method === "GET" && req.url === "/api/farms/FAM00202") {
        req.params = { farmId: "FAM00202" };
        return getFarmById(req, res);
      }

      res.statusCode = 404;
      res.end();
    });

    const response = await request(app).get("/api/farms/FAM00202");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Farm retrieved successfully");
    expect(response.body.farm.farmId).toBe("FAM00202");
  });
});
