import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, expect, test, beforeEach } from "vitest";

const navigateMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const loginApiMock = vi.fn();
const forgotPasswordApiMock = vi.fn();
const resetPasswordApiMock = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args) => toastSuccessMock(...args),
    error: (...args) => toastErrorMock(...args),
  },
}));

vi.mock("../../src/services/api", () => ({
  userAPI: {
    login: (...args) => loginApiMock(...args),
    forgotPassword: (...args) => forgotPasswordApiMock(...args),
    resetPassword: (...args) => resetPasswordApiMock(...args),
  },
}));

const { LoginPage } = await import("../../src/components/LoginPage");

describe("LoginPage - Forgot and Reset Password Integration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("1. Renders default Login view with Forgot Password link", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /forgot password\?/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
  });

  test("2. Clicking 'Forgot Password?' transitions to Forgot Password screen", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /forgot password\?/i }));
    
    expect(screen.getByRole("heading", { name: "Forgot Password" })).toBeInTheDocument();
    expect(screen.getByText("Enter your registered email address to receive a verification code")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter your password")).not.toBeInTheDocument();
  });

  test("3. Prefills forgot email with email typed in the login form", () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText("Enter your email");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    
    fireEvent.click(screen.getByRole("button", { name: /forgot password\?/i }));
    
    const forgotEmailInput = screen.getByPlaceholderText("Enter your email");
    expect(forgotEmailInput.value).toBe("test@example.com");
  });

  test("4. Clicking '← Back to Sign In' from forgot view returns to login screen", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /forgot password\?/i }));
    fireEvent.click(screen.getByRole("button", { name: /back to sign in/i }));
    
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
  });

  test("5. Submitting forgot password calls API and transitions to reset view on success", async () => {
    forgotPasswordApiMock.mockResolvedValue({ message: "Code sent", cooldownSeconds: 60 });
    render(<LoginPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /forgot password\?/i }));
    const emailInput = screen.getByPlaceholderText("Enter your email");
    fireEvent.change(emailInput, { target: { value: "farmer@example.com" } });
    
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    
    await waitFor(() => {
      expect(forgotPasswordApiMock).toHaveBeenCalledWith("farmer@example.com");
      expect(toastSuccessMock).toHaveBeenCalledWith("Code sent");
      expect(screen.getByRole("heading", { name: "Reset Password" })).toBeInTheDocument();
    });
  });

  test("6. Reset screen displays target email address in instructions", async () => {
    forgotPasswordApiMock.mockResolvedValue({ message: "Code sent", cooldownSeconds: 60 });
    render(<LoginPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /forgot password\?/i }));
    fireEvent.change(screen.getByPlaceholderText("Enter your email"), { target: { value: "farmer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/farmer@example.com/i)).toBeInTheDocument();
    });
  });

  test("7. Clicking '← Back to Sign In' from reset view returns to login screen", async () => {
    forgotPasswordApiMock.mockResolvedValue({ message: "Code sent" });
    render(<LoginPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /forgot password\?/i }));
    fireEvent.change(screen.getByPlaceholderText("Enter your email"), { target: { value: "farmer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    
    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /back to sign in/i }));
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
    });
  });

  test("8. Submitting mismatched passwords in reset view displays error toast", async () => {
    forgotPasswordApiMock.mockResolvedValue({ message: "Code sent" });
    render(<LoginPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /forgot password\?/i }));
    fireEvent.change(screen.getByPlaceholderText("Enter your email"), { target: { value: "farmer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    
    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText("Enter 6-digit code"), { target: { value: "123456" } });
      fireEvent.change(screen.getByPlaceholderText("Enter new password"), { target: { value: "newpass1" } });
      fireEvent.change(screen.getByPlaceholderText("Confirm new password"), { target: { value: "newpass2" } }); // mismatch
      fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));
    });

    expect(toastErrorMock).toHaveBeenCalledWith("Passwords do not match.");
    expect(resetPasswordApiMock).not.toHaveBeenCalled();
  });

  test("9. Submitting matching reset password credentials calls API and routes back to login with updated values", async () => {
    forgotPasswordApiMock.mockResolvedValue({ message: "Code sent" });
    resetPasswordApiMock.mockResolvedValue({ message: "Password updated successfully" });
    render(<LoginPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /forgot password\?/i }));
    fireEvent.change(screen.getByPlaceholderText("Enter your email"), { target: { value: "farmer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    
    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText("Enter 6-digit code"), { target: { value: "123456" } });
      fireEvent.change(screen.getByPlaceholderText("Enter new password"), { target: { value: "newpass123" } });
      fireEvent.change(screen.getByPlaceholderText("Confirm new password"), { target: { value: "newpass123" } });
      fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));
    });

    await waitFor(() => {
      expect(resetPasswordApiMock).toHaveBeenCalledWith({
        email: "farmer@example.com",
        code: "123456",
        newPassword: "newpass123",
      });
      expect(toastSuccessMock).toHaveBeenCalledWith("Password updated successfully");
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter your email").value).toBe("farmer@example.com");
    });
  });

  test("10. Clicking 'Resend Code' button calls forgot password API again", async () => {
    forgotPasswordApiMock.mockResolvedValue({ message: "Code sent", cooldownSeconds: 0 }); // 0 cooldown to allow immediate click
    render(<LoginPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /forgot password\?/i }));
    fireEvent.change(screen.getByPlaceholderText("Enter your email"), { target: { value: "farmer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    
    await waitFor(() => {
      const resendBtn = screen.getByRole("button", { name: "Resend Code" });
      fireEvent.click(resendBtn);
    });

    await waitFor(() => {
      expect(forgotPasswordApiMock).toHaveBeenCalledTimes(2); // Initial send + Resend
      expect(toastSuccessMock).toHaveBeenCalledWith("Code sent");
    });
  });
});
