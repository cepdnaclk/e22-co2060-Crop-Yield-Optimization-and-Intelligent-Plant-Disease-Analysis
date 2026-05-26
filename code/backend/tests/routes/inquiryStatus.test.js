import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const inquiryFindByIdMock = jest.fn();

await jest.unstable_mockModule("../../models/inquiryModel.js", () => ({
  default: {
    findById: inquiryFindByIdMock,
  },
}));

await jest.unstable_mockModule("../../controllers/userController.js", () => ({
  isAdmin: jest.fn(() => true),
}));

const { updateInquiryStatus } = await import("../../controllers/inquiryController.js");

describe("Inquiry Status Route", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("PUT /api/inquiries/:id/status should update inquiry status", async () => {
    const saveMock = jest.fn().mockResolvedValue({ _id: "inq-1" });
    inquiryFindByIdMock
      .mockReturnValueOnce({ save: saveMock })
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue({ _id: "inq-1", status: "Reviewed" }) });

    const app = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        req.body = body ? JSON.parse(body) : {};
        req.params = { id: "inq-1" };
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (payload) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };

        if (req.method === "PUT" && req.url === "/api/inquiries/inq-1/status") {
          req.user = { role: "admin" };
          return updateInquiryStatus(req, res);
        }

        res.statusCode = 404;
        res.end();
      });
    });

    const response = await request(app)
      .put("/api/inquiries/inq-1/status")
      .send({ status: "Reviewed" });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("Reviewed");
  });
});