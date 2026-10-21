import type { RefObject } from "react";

import { Sheet } from "../ui";
import { PreferencesCard } from "./PreferencesCard";

// My details: the volunteering preferences used for matching. Edit preferences hands over to the
// existing editor, which opens once this drawer is gone.
export function MyDetailsSheet({
  onClose,
  openerRef,
  onEditPreferences,
}: {
  onClose: () => void;
  openerRef: RefObject<HTMLElement | null>;
  onEditPreferences: () => void;
}) {
  return (
    <Sheet
      open
      onClose={onClose}
      openerRef={openerRef}
      title="My details"
      subtitle="What you can help with, and when."
    >
      <PreferencesCard onEdit={onEditPreferences} />
    </Sheet>
  );
}
