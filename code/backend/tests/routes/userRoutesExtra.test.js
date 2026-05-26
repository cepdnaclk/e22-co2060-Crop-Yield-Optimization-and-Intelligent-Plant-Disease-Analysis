import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const saveMock = jest.fn();
const findOneMock = jest.fn();
const findOneAndUpdateMock = jest.fn();
const hashMock = jest.fn();
const compareMock = jest.fn();
const signMock = jest.fn();

const UserMock = jest.fn().mockImplementation(() => ({
  save: saveMock,
}));
UserMock.findOne = findOneMock;
UserMock.findOneAndUpdate = findOneAndUpdateMock;

await jest.unstable_mockModule("../../models/user.js", () => ({
  default: UserMock,
}));

await jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: hashMock,
    compare: compareMock,
  },
}));

await jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: signMock,
    verify: jest.fn(),
  },
}));

await jest.unstable_mockModule("dotenv", () => ({
  default: {
    config: jest.fn(),
  },
}));

const { createUser, fetchUser, updateProfile } = await import("../../controllers/userController.js");

describe("User Routes", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("POST /api/users should create a user", async () => {
    hashMock.mockResolvedValue("hashed-password");
    saveMock.mockResolvedValue({});

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

        if (req.method === "POST" && req.url === "/api/users") {
          return createUser(req, res);
        }

        res.statusCode = 404;
        res.end();
      });
    });

    const response = await request(app)
      .post("/api/users")
      .send({
        firstName: "Nimal",
        lastName: "Perera",
        email: "farmer@example.com",
        password: "secret",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("User Created Successfully");
  });

  test("GET /api/users/profile should return profile", async () => {
    findOneMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        toObject: () => ({
          _id: "user-1",
          firstName: "Nimal",
          lastName: "Perera",
          email: "farmer@example.com",
          points: 123,
        }),
        points: 123,
      }),
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

      if (req.method === "GET" && req.url === "/api/users/profile") {
        req.user = { email: "farmer@example.com" };
        return fetchUser(req, res);
      }

      res.statusCode = 404;
      res.end();
    });

    const response = await request(app).get("/api/users/profile");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("User retrieved successfully");
    expect(response.body.user.points).toBe(123);
  });

  test("PUT /api/users/profile should update profile", async () => {
    findOneAndUpdateMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "user-1",
        firstName: "Updated",
        lastName: "Farmer",
        email: "farmer@example.com",
      }),
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

        if (req.method === "PUT" && req.url === "/api/users/profile") {
          req.user = { email: "farmer@example.com" };
          return updateProfile(req, res);
        }

        res.statusCode = 404;
        res.end();
      });
    });

    const response = await request(app)
      .put("/api/users/profile")
      .send({ firstName: "Updated" });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Profile updated successfully");
    expect(response.body.user.firstName).toBe("Updated");
  });
});
