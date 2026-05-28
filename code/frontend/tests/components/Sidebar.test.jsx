import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../src/services/api", () => ({
  userAPI: {
    fetchProfile: vi.fn().mockResolvedValue({
      user: {
        firstName: "Kamal",
        lastName: "Silva",
        email: "kamal@example.com",
      },
    }),
  },
}));

const { Sidebar } = await import("../../src/components/Sidebar");

test("shows farmer sidebar navigation", async () => {
  render(
    <Sidebar
      currentPage="home"
      onNavigate={vi.fn()}
      onLogout={vi.fn()}
    />
  );

  expect(screen.getByText("AgriConnect")).toBeInTheDocument();
  expect(screen.getByText("Farmer Portal")).toBeInTheDocument();
  expect(await screen.findByText("Kamal Silva")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
});