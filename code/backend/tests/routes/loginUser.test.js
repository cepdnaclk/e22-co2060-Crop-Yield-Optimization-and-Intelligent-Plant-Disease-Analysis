import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const findOneMock = jest.fn();
const compareMock = jest.fn();
const signMock = jest.fn();

await jest.unstable_mockModule("../../models/user.js", () => ({
  default: {
    findOne: findOneMock,
  },
}));

await jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: jest.fn(),
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

const { loginUser } = await import("../../controllers/userController.js");

describe("Login Route", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("POST /api/users/login should return a token", async () => {
    findOneMock.mockResolvedValue({
      _id: "user-1",
      email: "farmer@example.com",
      firstName: "Nimal",
      lastName: "Perera",
      password: "hashed-password",
      role: "farmer",
      isBlocked: false,
      isEmailVerified: true,
      image: "https://example.com/farmer.png",
      points: 120,
      district: "Galle",
      division: "Southern",
    });
    compareMock.mockResolvedValue(true);
    signMock.mockReturnValue("fake-token");

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

        if (req.method === "POST" && req.url === "/api/users/login") {
          return loginUser(req, res);
        }

        res.statusCode = 404;
        res.end();
      });
    });

    const response = await request(app)
      .post("/api/users/login")
      .send({
        email: "farmer@example.com",
        password: "secret",
        intendedRole: "farmer",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Login Successful");
    expect(response.body.token).toBe("fake-token");
    expect(response.body.user.email).toBe("farmer@example.com");
  });
});
