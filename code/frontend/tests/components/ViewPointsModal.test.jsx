import { render, screen } from "@testing-library/react";
import { ViewPointsModal } from "../../src/components/ViewPointsModal";

test("shows points summary modal content when open", () => {
  render(<ViewPointsModal isOpen={true} onClose={vi.fn()} />);

  expect(screen.getByText("Points Summary")).toBeInTheDocument();
  expect(screen.getByText("How Points Work")).toBeInTheDocument();
  expect(screen.getByText("Available Rewards")).toBeInTheDocument();
});