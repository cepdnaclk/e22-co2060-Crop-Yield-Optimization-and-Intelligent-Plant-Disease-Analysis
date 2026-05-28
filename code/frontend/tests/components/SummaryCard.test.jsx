import { render, screen } from "@testing-library/react";
import { SummaryCard } from "../../src/components/SummaryCard";

test("renders summary card content", () => {
  render(<SummaryCard title="Total Farms" value="12" subtext="This season" />);

  expect(screen.getByText("Total Farms")).toBeInTheDocument();
  expect(screen.getByText("12")).toBeInTheDocument();
  expect(screen.getByText("This season")).toBeInTheDocument();
});