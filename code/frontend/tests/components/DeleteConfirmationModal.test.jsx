import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const deleteFarmMock = vi.fn().mockResolvedValue({});
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock("../../src/services/api", () => ({
  farmAPI: {
    deleteFarm: deleteFarmMock,
  },
}));

const { DeleteConfirmationModal } = await import("../../src/components/admin/DeleteConfirmationModal");

test("shows delete farm confirmation", () => {
  render(
    <DeleteConfirmationModal
      farmId="F-101"
      farmName="Kamal Farm"
      onClose={vi.fn()}
      onSuccess={vi.fn()}
    />
  );

  expect(screen.getByText("Delete Farm")).toBeInTheDocument();
  expect(screen.getByText("Kamal Farm")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
});

test("deletes farm on confirm", async () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  render(
    <DeleteConfirmationModal
      farmId="F-101"
      farmName="Kamal Farm"
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /delete/i }));

  await waitFor(() => {
    expect(deleteFarmMock).toHaveBeenCalledWith("F-101");
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});