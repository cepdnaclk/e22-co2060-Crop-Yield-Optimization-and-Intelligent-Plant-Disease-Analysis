import { render, screen } from "@testing-library/react";
import { MessagesModal } from "../../src/components/MessagesModal";

test("shows messages modal content when open", () => {
  render(<MessagesModal isOpen={true} onClose={vi.fn()} />);

  expect(screen.getByText("Messages")).toBeInTheDocument();
  expect(screen.getByText("Send notes to your district officer")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Type your message to the officer...")).toBeInTheDocument();
});