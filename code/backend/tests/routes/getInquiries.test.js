import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const findMock = jest.fn();

await jest.unstable_mockModule("../../models/inquiryModel.js", () => ({
  default: {
    find: findMock,
  },
}));

await jest.unstable_mockModule("../../models/user.js", () => ({
  default: {},
}));

await jest.unstable_mockModule("../../controllers/userController.js", () => ({
  isAdmin: jest.fn(() => true),
}));

const { getInquiries } = await import("../../controllers/inquiryController.js");

describe("Inquiry Routes", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("GET /api/inquiries should return inquiries", async () => {
    findMock.mockReturnValue({
      populate: jest.fn(() => ({
        sort: jest.fn().mockResolvedValue([
          {
            _id: "inq-1",
            subject: "Need help",
            message: "Please review my harvest report.",
            status: "Pending",
          },
        ]),
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

      if (req.method === "GET" && req.url === "/api/inquiries") {
        req.user = { id: "user-1", role: "admin" };
        return getInquiries(req, res);
      }

      res.statusCode = 404;
      res.end();
    });

    const response = await request(app).get("/api/inquiries");

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.inquiries)).toBe(true);
    expect(response.body.inquiries).toHaveLength(1);
  });
});
