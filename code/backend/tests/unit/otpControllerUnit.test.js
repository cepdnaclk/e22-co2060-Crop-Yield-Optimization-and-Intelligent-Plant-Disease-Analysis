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

describe("OTP Controller Unit Tests", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    saveMock.mockClear();
    findOneMock.mockClear();
    hashMock.mockClear();
    compareMock.mockClear();
    sendOtpEmailMock.mockClear();
    sendPasswordResetSuccessEmailMock.mockClear();
  });

  const createTestApp = (handler) => {
    return http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        req.body = body ? JSON.parse(body) : {};
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (payload) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };
        return handler(req, res);
      });
    });
  };

  // ── FORGOT PASSWORD UNIT TESTS ─────────────────────────────────────────────

  test("1. forgotPassword: should return 400 if email is missing", async () => {
    const app = createTestApp(forgotPassword);
    const response = await request(app).post("/").send({});
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Email is required.");
  });

  test("2. forgotPassword: should return 400 if email is not a string", async () => {
    const app = createTestApp(forgotPassword);
    const response = await request(app).post("/").send({ email: 12345 });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Email is required.");
  });

  test("3. forgotPassword: should return 404 if user is not found", async () => {
    findOneMock.mockResolvedValue(null);
    const app = createTestApp(forgotPassword);
    const response = await request(app).post("/").send({ email: "notfound@example.com" });
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("No account exists with this email address.");
  });

  test("4. forgotPassword: should return 429 if resend cooldown is active", async () => {
    const cooldownTime = new Date(Date.now() + 30000); // 30 seconds in future
    const mockUser = {
      email: "cooldown@example.com",
      emailOtp: { cooldownUntil: cooldownTime }
    };
    findOneMock.mockResolvedValue(mockUser);

    const app = createTestApp(forgotPassword);
    const response = await request(app).post("/").send({ email: "cooldown@example.com" });
    expect(response.statusCode).toBe(429);
    expect(response.body.message).toContain("Please wait");
  });

  test("5. forgotPassword: should generate OTP, save, send email, and return 200", async () => {
    const mockUser = {
      email: "success@example.com",
      firstName: "Nimal",
      emailOtp: {},
      save: saveMock,
    };
    findOneMock.mockResolvedValue(mockUser);
    hashMock.mockResolvedValue("hashedcode123");
    saveMock.mockResolvedValue({});
    sendOtpEmailMock.mockResolvedValue({});

    const app = createTestApp(forgotPassword);
    const response = await request(app).post("/").send({ email: "success@example.com" });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toContain("Verification code sent to your email.");
    expect(mockUser.emailOtp.code).toBe("hashedcode123");
    expect(sendOtpEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      email: "success@example.com",
      firstName: "Nimal"
    }));
  });

  test("6. forgotPassword: should return 500 if database save fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mockUser = {
      email: "dbfail@example.com",
      save: jest.fn().mockRejectedValue(new Error("DB Connection Error")),
    };
    findOneMock.mockResolvedValue(mockUser);
    const app = createTestApp(forgotPassword);
    const response = await request(app).post("/").send({ email: "dbfail@example.com" });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Failed to send reset code. Please try again.");
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // ── RESET PASSWORD UNIT TESTS ──────────────────────────────────────────────

  test("7. resetPassword: should return 400 if fields are missing", async () => {
    const app = createTestApp(resetPassword);
    const response = await request(app).post("/").send({ email: "test@example.com" }); // code/newPassword missing
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Email, code, and new password are required.");
  });

  test("8. resetPassword: should return 404 if user not found", async () => {
    findOneMock.mockResolvedValue(null);
    const app = createTestApp(resetPassword);
    const response = await request(app).post("/").send({ email: "absent@example.com", code: "123456", newPassword: "pass" });
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("User not found.");
  });

  test("9. resetPassword: should return 400 if no active OTP code records are found", async () => {
    const mockUser = {
      email: "no-otp@example.com",
      emailOtp: { code: null }
    };
    findOneMock.mockResolvedValue(mockUser);
    const app = createTestApp(resetPassword);
    const response = await request(app).post("/").send({ email: "no-otp@example.com", code: "123456", newPassword: "pass" });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("No verification code found. Please request a new one.");
  });

  test("10. resetPassword: should return 400 if OTP is expired", async () => {
    const expiredTime = new Date(Date.now() - 10000); // 10s in past
    const mockUser = {
      email: "expired@example.com",
      emailOtp: { code: "hashed", expiresAt: expiredTime },
      save: saveMock
    };
    findOneMock.mockResolvedValue(mockUser);
    saveMock.mockResolvedValue({});

    const app = createTestApp(resetPassword);
    const response = await request(app).post("/").send({ email: "expired@example.com", code: "123456", newPassword: "pass" });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Verification code expired. Please request a new one.");
    expect(mockUser.emailOtp.code).toBeNull();
  });

  test("11. resetPassword: should return 400 if verification code does not match", async () => {
    const mockUser = {
      email: "mismatch@example.com",
      emailOtp: { code: "hashedotp", expiresAt: new Date(Date.now() + 60000) }
    };
    findOneMock.mockResolvedValue(mockUser);
    compareMock.mockResolvedValue(false); // wrong code

    const app = createTestApp(resetPassword);
    const response = await request(app).post("/").send({ email: "mismatch@example.com", code: "111111", newPassword: "pass" });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Invalid verification code. Please try again.");
  });
});
