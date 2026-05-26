import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const findMock = jest.fn();

await jest.unstable_mockModule("../../models/user.js", () => ({
  default: {
    find: findMock,
  },
}));

await jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

await jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));

await jest.unstable_mockModule("dotenv", () => ({
  default: {
    config: jest.fn(),
  },
}));

const { getRecentFarmers } = await import("../../controllers/userController.js");

describe("Recent Farmers Route", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("GET /api/users/recent-farmers should return farmers", async () => {
    findMock.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([
        {
          _id: "1",
          firstName: "Nimal",
          lastName: "Perera",
          division: "Galle",
          district: "Galle",
          image: "https://example.com/farmer.png",
          nic: "200012345678",
          createdAt: new Date("2026-05-26T00:00:00.000Z"),
        },
      ]),
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

      if (req.method === "GET" && req.url === "/api/users/recent-farmers") {
        req.query = {};
        return getRecentFarmers(req, res);
      }

      res.statusCode = 404;
      res.end();
    });

    const response = await request(app).get("/api/users/recent-farmers");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Recent farmers retrieved successfully");
    expect(Array.isArray(response.body.farmers)).toBe(true);
    expect(response.body.farmers).toHaveLength(1);
  });
});
