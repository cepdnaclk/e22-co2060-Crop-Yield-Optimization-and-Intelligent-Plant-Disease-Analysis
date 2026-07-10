import { render, screen } from "@testing-library/react";
import { Badge } from "../../src/components/ui/badge";

test("6. Badge: renders children content", () => {
  render(<Badge>Active Status</Badge>);
  expect(screen.getByText("Active Status")).toBeInTheDocument();
});

test("7. Badge: applies correct variant classes", () => {
  const { container: defaultBadge } = render(<Badge variant="default" />);
  expect(defaultBadge.firstChild).toHaveClass("bg-primary");

  const { container: destructiveBadge } = render(<Badge variant="destructive" />);
  expect(destructiveBadge.firstChild).toHaveClass("bg-destructive");

  const { container: secondaryBadge } = render(<Badge variant="secondary" />);
  expect(secondaryBadge.firstChild).toHaveClass("bg-secondary");

  const { container: outlineBadge } = render(<Badge variant="outline" />);
  expect(outlineBadge.firstChild).toHaveClass("text-foreground");
});

test("8. Badge: merges custom className", () => {
  const { container } = render(<Badge className="custom-badge-style" />);
  expect(container.firstChild).toHaveClass("custom-badge-style");
});
