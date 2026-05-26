import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
}));

const { NotFoundPage } = await import("../../src/components/NotFoundPage");

test("shows not found message", () => {
  render(<NotFoundPage />);

  expect(screen.getByText("404")).toBeInTheDocument();
  expect(screen.getByText(/page not found/i)).toBeInTheDocument();
});