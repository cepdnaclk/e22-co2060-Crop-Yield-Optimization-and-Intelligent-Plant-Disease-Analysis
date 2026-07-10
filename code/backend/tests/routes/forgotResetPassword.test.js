import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

const saveMock = jest.fn();
const findOneMock = jest.fn();
const hashMock = jest.fn();
const compareMock = jest.fn();
const sendOtpEmailMock = jest.fn();
const sendPasswordResetSuccessEmailMock = jest.fn();

await jest.unstable_mockModule("../../models/user.js", () => ({
  default: {
    findOne: findOneMock,
  },
}));

await jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: hashMock,
    compare: compareMock,
  },
}));

await jest.unstable_mockModule("../../services/emailService.js", () => ({
  sendOtpEmail: sendOtpEmailMock,
  sendPasswordResetSuccessEmail: sendPasswordResetSuccessEmailMock,
}));

const { forgotPassword, resetPassword } = await import("../../controllers/otpController.js");

describe("Forgot & Reset Password Routes", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("POST /api/users/forgot-password should check user and send OTP email", async () => {
    const mockUser = {
      email: "farmer@example.com",
      firstName: "Nimal",
      emailOtp: {},
      save: saveMock,
    };
    findOneMock.mockResolvedValue(mockUser);
    hashMock.mockResolvedValue("hashed-otp");
    saveMock.mockResolvedValue({});
    sendOtpEmailMock.mockResolvedValue({});

    const app = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        req.body = body ? JSON.parse(body) : {};
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (payload) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };
        if (req.method === "POST" && req.url === "/api/users/forgot-password") {
          return forgotPassword(req, res);
        }
        res.statusCode = 404; res.end();
      });
    });

    const response = await request(app)
      .post("/api/users/forgot-password")
      .send({ email: "farmer@example.com" });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toContain("Verification code sent");
    expect(findOneMock).toHaveBeenCalledWith({ email: "farmer@example.com" });
    expect(saveMock).toHaveBeenCalled();
    expect(sendOtpEmailMock).toHaveBeenCalled();
  });

  test("POST /api/users/forgot-password should return 404 if user doesn't exist", async () => {
    findOneMock.mockResolvedValue(null);

    const app = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        req.body = body ? JSON.parse(body) : {};
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (payload) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };
        if (req.method === "POST" && req.url === "/api/users/forgot-password") {
          return forgotPassword(req, res);
        }
        res.statusCode = 404; res.end();
      });
    });

    const response = await request(app)
      .post("/api/users/forgot-password")
      .send({ email: "missing@example.com" });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("No account exists with this email address.");
  });

  test("POST /api/users/reset-password should verify code and reset password", async () => {
    const mockUser = {
      email: "farmer@example.com",
      firstName: "Nimal",
      password: "old-password",
      emailOtp: {
        code: "hashed-code",
        expiresAt: new Date(Date.now() + 600000), // valid
      },
      save: saveMock,
    };
    findOneMock.mockResolvedValue(mockUser);
    compareMock.mockResolvedValue(true);
    hashMock.mockResolvedValue("new-hashed-password");
    saveMock.mockResolvedValue({});
    sendPasswordResetSuccessEmailMock.mockResolvedValue({});

    const app = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        req.body = body ? JSON.parse(body) : {};
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (payload) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };
        if (req.method === "POST" && req.url === "/api/users/reset-password") {
          return resetPassword(req, res);
        }
        res.statusCode = 404; res.end();
      });
    });

    const response = await request(app)
      .post("/api/users/reset-password")
      .send({
        email: "farmer@example.com",
        code: "123456",
        newPassword: "newsecretpassword"
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Password reset successfully. You can now login.");
    expect(mockUser.password).toBe("new-hashed-password");
    expect(mockUser.emailVerified).toBe(true);
    expect(mockUser.emailOtp.code).toBeNull();
    expect(sendPasswordResetSuccessEmailMock).toHaveBeenCalledWith({
      email: "farmer@example.com",
      firstName: "Nimal",
    });
  });
});
});
