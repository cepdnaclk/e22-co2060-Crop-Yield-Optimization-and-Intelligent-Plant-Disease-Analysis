import http from "node:http";
import request from "supertest";
import { afterEach, describe, expect, jest, test, beforeEach } from "@jest/globals";

const saveMock = jest.fn();
const findOneMock = jest.fn();
const findByIdMock = jest.fn();
const hashMock = jest.fn();
const compareMock = jest.fn();
const verifyMock = jest.fn();
const sendOtpEmailMock = jest.fn();

const UserMock = jest.fn().mockImplementation(() => ({
  save: saveMock,
}));
UserMock.findOne = findOneMock;
UserMock.findById = findByIdMock;

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
    verify: verifyMock,
    sign: jest.fn(),
  },
}));

await jest.unstable_mockModule("../../services/emailService.js", () => ({
  sendOtpEmail: sendOtpEmailMock,
  sendPasswordResetSuccessEmail: jest.fn(),
}));

import express from "express";

const { default: userRouter } = await import("../../routers/userRouter.js");

describe("OTP Routing & Middleware Integration Tests", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware behavior (since userRouter uses requireAuth and req.user)
    app.use((req, res, next) => {
      // If request has Authorization header, set mock req.user
      const auth = req.header("Authorization");
      if (auth && auth.startsWith("Bearer mock-token")) {
        req.user = { id: "user-123", email: "farmer@example.com", role: "farmer" };
      }
      next();
    });

    app.use("/api/users", userRouter);

    jest.restoreAllMocks();
    saveMock.mockClear();
    findOneMock.mockClear();
    findByIdMock.mockClear();
    hashMock.mockClear();
    compareMock.mockClear();
    verifyMock.mockClear();
    sendOtpEmailMock.mockClear();
  });

  // Test 1: Send OTP validation missing email
  test("1. POST /api/users/send-otp: returns 400 if email is missing", async () => {
    const res = await request(app).post("/api/users/send-otp").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Email is required.");
  });

  // Test 2: Send OTP cooldown check
  test("2. POST /api/users/send-otp: returns 429 if resend cooldown is active", async () => {
    const cooldownTime = new Date(Date.now() + 60000);
    findOneMock.mockResolvedValue({
      email: "user@example.com",
      emailOtp: { cooldownUntil: cooldownTime }
    });

    const res = await request(app).post("/api/users/send-otp").send({ email: "user@example.com" });
    expect(res.statusCode).toBe(429);
    expect(res.body.message).toContain("Please wait");
  });

  // Test 3: Send OTP pre-registration
  test("3. POST /api/users/send-otp: returns 200 on sending to new email", async () => {
    findOneMock.mockResolvedValue(null); // not an existing user
    hashMock.mockResolvedValue("hashed-otp-code");
    sendOtpEmailMock.mockResolvedValue({});

    const res = await request(app).post("/api/users/send-otp").send({ email: "new@example.com" });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("Verification code sent");
    expect(sendOtpEmailMock).toHaveBeenCalled();
  });

  // Test 4: Send OTP existing user
  test("4. POST /api/users/send-otp: returns 200 on sending to existing user", async () => {
    const mockUser = {
      email: "user@example.com",
      emailOtp: {},
      save: saveMock
    };
    findOneMock.mockResolvedValue(mockUser);
    hashMock.mockResolvedValue("hashed-otp-code");
    sendOtpEmailMock.mockResolvedValue({});

    const res = await request(app).post("/api/users/send-otp").send({ email: "user@example.com" });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("Verification code sent");
    expect(saveMock).toHaveBeenCalled();
    expect(sendOtpEmailMock).toHaveBeenCalled();
  });

  // Test 5: Verify OTP validation missing credentials
  test("5. POST /api/users/verify-otp: returns 400 if credentials missing", async () => {
    const res = await request(app).post("/api/users/verify-otp").send({ email: "user@example.com" });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Email and verification code are required.");
  });

  // Test 6: Verify OTP wrong code
  test("6. POST /api/users/verify-otp: returns 400 if code incorrect", async () => {
    const mockUser = {
      email: "user@example.com",
      emailOtp: { code: "hashed", expiresAt: new Date(Date.now() + 60000) }
    };
    findOneMock.mockResolvedValue(mockUser);
    compareMock.mockResolvedValue(false); // mock wrong code comparison

    const res = await request(app).post("/api/users/verify-otp").send({ email: "user@example.com", code: "wrong" });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid verification code. Please try again.");
  });

  // Test 7: Verify OTP success for pre-registration
  test("7. POST /api/users/verify-otp: verifies new email successfully", async () => {
    findOneMock.mockResolvedValue(null); // not existing user, checks pendingOtps
    hashMock.mockResolvedValue("hashed-otp-code");
    sendOtpEmailMock.mockResolvedValue({});

    // Send code to set pendingOtps
    await request(app).post("/api/users/send-otp").send({ email: "pending@example.com" });

    // Verify code
    compareMock.mockResolvedValue(true);
    const res = await request(app).post("/api/users/verify-otp").send({ email: "pending@example.com", code: "123456" });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Email verified successfully.");
  });

  // Test 8: Verify OTP success for existing user
  test("8. POST /api/users/verify-otp: verifies existing user successfully", async () => {
    const mockUser = {
      email: "user@example.com",
      emailVerified: false,
      emailOtp: { code: "hashed", expiresAt: new Date(Date.now() + 60000) },
      save: saveMock
    };
    findOneMock.mockResolvedValue(mockUser);
    compareMock.mockResolvedValue(true);
    saveMock.mockResolvedValue({});

    const res = await request(app).post("/api/users/verify-otp").send({ email: "user@example.com", code: "123456" });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Email verified successfully.");
    expect(mockUser.emailVerified).toBe(true);
    expect(mockUser.emailOtp.code).toBeNull();
    expect(saveMock).toHaveBeenCalled();
  });

  // Test 9: Change email unauthorized
  test("9. POST /api/users/change-email: returns 401 if unauthorized", async () => {
    const res = await request(app).post("/api/users/change-email").send({ newEmail: "new@example.com" });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Authentication required. Please log in.");
  });

  // Test 10: Change email conflict
  test("10. POST /api/users/change-email: returns 409 if new email already exists", async () => {
    findOneMock.mockResolvedValue({ _id: "other-user-id" }); // conflicting user

    const res = await request(app)
      .post("/api/users/change-email")
      .set("Authorization", "Bearer mock-token")
      .send({ newEmail: "conflict@example.com" });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("This email address is already in use by another account.");
  });

  // Test 11: Change email success
  test("11. POST /api/users/change-email: updates email and triggers verification on success", async () => {
    findOneMock.mockResolvedValue(null); // no conflict
    const mockUser = {
      id: "user-123",
      email: "old@example.com",
      emailVerified: true,
      emailOtp: {},
      save: saveMock
    };
    findByIdMock.mockResolvedValue(mockUser);
    hashMock.mockResolvedValue("hashed-new-otp");
    saveMock.mockResolvedValue({});
    sendOtpEmailMock.mockResolvedValue({});

    const res = await request(app)
      .post("/api/users/change-email")
      .set("Authorization", "Bearer mock-token")
      .send({ newEmail: "new@example.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("Email updated");
    expect(mockUser.email).toBe("new@example.com");
    expect(mockUser.emailVerified).toBe(false);
    expect(saveMock).toHaveBeenCalled();
  });
});
