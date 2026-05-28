import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../src/services/api", () => ({
  userAPI: {
    fetchProfile: vi.fn().mockResolvedValue({
      user: {
        firstName: "Ruwan",
        lastName: "Fernando",
        email: "ruwan@example.com",
      },
    }),
  },
}));

const { AdminSidebar } = await import("../../src/components/admin/AdminSidebar");

test("shows admin sidebar navigation", async () => {
  render(
    <AdminSidebar
      currentPage="dashboard"
      onNavigate={vi.fn()}
      onLogout={vi.fn()}
    />
  );

  expect(screen.getByText("AgriConnect")).toBeInTheDocument();
  expect(screen.getByText("Admin Portal")).toBeInTheDocument();
  expect(screen.getByText("All Farms")).toBeInTheDocument();
  expect(await screen.findByText("Ruwan Fernando")).toBeInTheDocument();
});