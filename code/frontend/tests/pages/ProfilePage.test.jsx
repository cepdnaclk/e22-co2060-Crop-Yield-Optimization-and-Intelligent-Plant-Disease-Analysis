import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../src/services/api", () => ({
  userAPI: {
    fetchProfile: vi.fn().mockResolvedValue({
      user: {
        firstName: "Nimal",
        lastName: "Perera",
        nic: "200012345678",
        phone: "0771234567",
        email: "nimal@example.com",
        address: "Galle",
        division: "Hikkaduwa",
        district: "Galle",
        createdAt: "2024-01-10T00:00:00.000Z",
      },
    }),
  },
}));

const { ProfilePage } = await import("../../src/components/ProfilePage");

test("shows farmer profile details", async () => {
  render(<ProfilePage />);

  expect(await screen.findByRole("heading", { name: "Nimal Perera" })).toBeInTheDocument();
  expect(screen.getByText("NIC: 200012345678")).toBeInTheDocument();
  expect(screen.getByText("Hikkaduwa")).toBeInTheDocument();
});