import { render, screen } from "@testing-library/react";
import { Button } from "../../src/components/ui/button";

test("9. Button: renders children content", () => {
  render(<Button>Click Me</Button>);
  expect(screen.getByText("Click Me")).toBeInTheDocument();
});

test("10. Button: applies correct variant and size classes", () => {
  const { container: defaultBtn } = render(<Button variant="default" size="default" />);
  expect(defaultBtn.firstChild).toHaveClass("bg-primary");
  expect(defaultBtn.firstChild).toHaveClass("h-9");

  const { container: destructiveBtn } = render(<Button variant="destructive" size="sm" />);
  expect(destructiveBtn.firstChild).toHaveClass("bg-destructive");
  expect(destructiveBtn.firstChild).toHaveClass("h-8");

  const { container: ghostBtn } = render(<Button variant="ghost" size="lg" />);
  expect(ghostBtn.firstChild).toHaveClass("hover:bg-accent");
  expect(ghostBtn.firstChild).toHaveClass("h-10");
});

test("11. Button: renders as a slot when asChild is true", () => {
  render(
    <Button asChild>
      <a href="https://example.com" data-testid="link-button">
        Link Button
      </a>
    </Button>
  );

  const element = screen.getByTestId("link-button");
  expect(element.tagName).toBe("A");
  expect(element).toHaveAttribute("href", "https://example.com");
  expect(element).toHaveClass("inline-flex"); // contains styles from button
});
