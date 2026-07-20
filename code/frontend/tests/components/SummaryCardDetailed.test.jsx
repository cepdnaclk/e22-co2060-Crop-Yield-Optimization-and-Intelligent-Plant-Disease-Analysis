import { render, screen } from "@testing-library/react";
import { SummaryCard } from "../../src/components/SummaryCard";

test("1. SummaryCard: renders children instead of props when passed", () => {
  render(
    <SummaryCard title="Title" value="Value">
      <div data-testid="custom-child">Custom Content</div>
    </SummaryCard>
  );

  expect(screen.getByTestId("custom-child")).toBeInTheDocument();
  expect(screen.queryByText("Title")).not.toBeInTheDocument();
  expect(screen.queryByText("Value")).not.toBeInTheDocument();
});

test("2. SummaryCard: renders unit text next to value", () => {
  render(<SummaryCard value="100" unit="kg" />);

  expect(screen.getByText("100")).toBeInTheDocument();
  expect(screen.getByText("kg")).toBeInTheDocument();
});

test("3. SummaryCard: renders icon with custom background class", () => {
  const mockIcon = <span data-testid="mock-icon">🔥</span>;
  render(<SummaryCard icon={mockIcon} iconBgClass="bg-red-500" />);

  expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  const iconContainer = screen.getByTestId("mock-icon").parentElement;
  expect(iconContainer).toHaveClass("bg-red-500");
});

test("4. SummaryCard: applies hover classes when hoverable is true", () => {
  const { container } = render(<SummaryCard title="Test" hoverable={true} />);
  const card = container.firstChild;
  expect(card).toHaveClass("hover:shadow-lg");
  expect(card).toHaveClass("hover:cursor-pointer");
});

test("5. SummaryCard: merges custom className and inline styles", () => {
  const { container } = render(
    <SummaryCard title="Test" className="custom-class" style={{ marginTop: "20px" }} />
  );
  const card = container.firstChild;
  expect(card).toHaveClass("custom-class");
  expect(card).toHaveStyle({ marginTop: "20px" });
});
