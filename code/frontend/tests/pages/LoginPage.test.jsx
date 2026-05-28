import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../src/services/api", () => ({
  userAPI: {
    login: vi.fn(),
  },
}));

const { LoginPage } = await import("../../src/components/LoginPage");

test("shows login form controls", () => {
  render(<LoginPage />);

  expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
});