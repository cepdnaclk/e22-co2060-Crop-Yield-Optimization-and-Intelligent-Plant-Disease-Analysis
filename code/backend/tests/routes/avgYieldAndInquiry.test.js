import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const avgSaveMock = jest.fn();
const recalculateMock = jest.fn();
const inquirySaveMock = jest.fn();
const isAdminMock = jest.fn(() => true);

await jest.unstable_mockModule("../../models/avgYield.js", () => ({
  default: jest.fn().mockImplementation(() => ({
    save: avgSaveMock,
  })),
}));

await jest.unstable_mockModule("../../models/inquiryModel.js", () => ({
  default: jest.fn().mockImplementation(() => ({
    save: inquirySaveMock,
  })),
}));

await jest.unstable_mockModule("../../controllers/farmController.js", () => ({
  recalculatePendingPointsForAverage: recalculateMock,
}));

await jest.unstable_mockModule("../../controllers/userController.js", () => ({
  isAdmin: isAdminMock,
}));

const { createAvgYield } = await import("../../controllers/avgYieldController.js");
const { createInquiry } = await import("../../controllers/inquiryController.js");

describe("Average Yield and Inquiry Routes", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("POST /api/avgYields should create average yield", async () => {
    avgSaveMock.mockResolvedValue({ district: "Galle", crop: "Rice", season: "Maha", year: 2026 });
    recalculateMock.mockResolvedValue({ farmsUpdated: 0, harvestsUpdated: 0, pointsApplied: 0 });

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

        if (req.method === "POST" && req.url === "/api/avgYields") {
          req.user = { role: "admin" };
          return createAvgYield(req, res);
        }

        res.statusCode = 404;
        res.end();
      });
    });

    const response = await request(app)
      .post("/api/avgYields")
      .send({ district: "Galle", crop: "Rice", season: "Maha", year: 2026, averageYield: 100 });

    expect(response.statusCode).toBe(201);
    expect(response.body.message).toBe("Average yield created successfully");
  });

  test("POST /api/inquiries should create inquiry", async () => {
    inquirySaveMock.mockResolvedValue({
      _id: "inq-1",
      subject: "Need help",
      message: "Please review",
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

        if (req.method === "POST" && req.url === "/api/inquiries") {
          req.user = { _id: "user-1", role: "farmer" };
          return createInquiry(req, res);
        }

        res.statusCode = 404;
        res.end();
      });
    });

    const response = await request(app)
      .post("/api/inquiries")
      .send({ subject: "Need help", message: "Please review" });

    expect(response.statusCode).toBe(201);
    expect(response.body.subject).toBe("Need help");
  });
});
