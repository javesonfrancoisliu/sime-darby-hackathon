import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { RewardWithStatus } from "@sdh/contracts";

import { makeReward } from "../../test/fixtures";
import { ConfirmActionDialog, Modal, Sheet } from "../ui";
import { EditPersonalSheet } from "./EditPersonalSheet";
import { MyRewardsSheet } from "./MyRewardsSheet";

vi.mock("../../data/ProfileContext", () => ({
  useProfile: () => ({
    prefs: { displayName: "Aina", area: "" },
    updatePrefs: async () => {},
  }),
}));

const opener = { current: null };

// A dialog opened from inside a sheet must be reachable: the sheet goes inert and the dialog is
// outside the sheet and outside every inert subtree. Stacking by z-index is checked in layers.test.
function expectDialogAboveSheet(dialogName: string) {
  const dialog = screen.getByRole("dialog", { name: dialogName });
  const sheetRoot = document.querySelector<HTMLElement>(".ui-sheet-root");
  const backdrop = dialog.closest<HTMLElement>(".ui-modal-backdrop");
  expect(sheetRoot).not.toBeNull();
  expect(backdrop).not.toBeNull();
  expect(sheetRoot?.contains(dialog)).toBe(false);
  expect(sheetRoot).toHaveAttribute("inert");
  expect(backdrop).not.toHaveAttribute("inert");
  expect(dialog.closest("[inert]")).toBeNull();
  for (const button of within(dialog).getAllByRole("button")) {
    expect(button.closest("[inert]")).toBeNull();
  }
}

function Harness({ kind }: { kind: "modal" | "confirm" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Sheet open onClose={() => {}} title="Drawer">
        <button type="button" onClick={() => setOpen(true)}>
          Ask
        </button>
      </Sheet>
      {kind === "modal" ? (
        <Modal open={open} title="Modal from drawer" onClose={() => setOpen(false)}>
          Body
        </Modal>
      ) : (
        <ConfirmActionDialog
          open={open}
          title="Confirm from drawer"
          message="Sure?"
          confirmLabel="Go"
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

describe("dialogs opened from a sheet", () => {
  it("puts a Modal above the inert sheet and wakes the sheet when it closes", async () => {
    render(<Harness kind="modal" />);
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    expectDialogAboveSheet("Modal from drawer");
    await userEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(document.querySelector(".ui-sheet-root")).not.toHaveAttribute("inert");
  });

  it("puts a ConfirmActionDialog above the inert sheet with a reachable confirm button", async () => {
    render(<Harness kind="confirm" />);
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    expectDialogAboveSheet("Confirm from drawer");
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(screen.queryByRole("dialog", { name: "Confirm from drawer" })).toBeNull();
    expect(document.querySelector(".ui-sheet-root")).not.toHaveAttribute("inert");
  });

  it("keeps the Use now voucher confirm above My rewards", async () => {
    const reward = RewardWithStatus.parse(
      makeReward({ status: "redeemed", redeemedAt: new Date().toISOString() }),
    );
    render(
      <MemoryRouter>
        <MyRewardsSheet
          onClose={() => {}}
          openerRef={opener}
          points={10}
          claimed={[reward]}
          onUsed={async () => {}}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Use Coffee voucher" }));
    expectDialogAboveSheet("Use this voucher now?");
    expect(screen.getByRole("button", { name: "Yes, use now" })).toBeEnabled();
  });

  it("keeps the Discard changes confirm above Edit personal information", async () => {
    render(<EditPersonalSheet onClose={() => {}} openerRef={opener} />);
    await userEvent.type(screen.getByLabelText("Display name"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expectDialogAboveSheet("Discard changes?");
    expect(screen.getByRole("button", { name: "Discard" })).toBeEnabled();
  });
});
