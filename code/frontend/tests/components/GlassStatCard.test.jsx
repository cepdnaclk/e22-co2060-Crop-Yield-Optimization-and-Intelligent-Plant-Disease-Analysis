import { render, screen } from "@testing-library/react";
import { Star } from "lucide-react";
import { GlassStatCard } from "../../src/components/admin/GlassStatCard";

test("shows glass stat card loading state", () => {
  render(
    <GlassStatCard
      title="Total Points"
      value={1200}
      icon={Star}
      subtitle="This season"
      loading={true}
    />
  );

  expect(screen.getByText("Total Points")).toBeInTheDocument();
  expect(screen.getByText("...")).toBeInTheDocument();
  expect(screen.getByText("This season")).toBeInTheDocument();
});