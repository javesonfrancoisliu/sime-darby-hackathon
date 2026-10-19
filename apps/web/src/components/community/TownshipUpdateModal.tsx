import type { TownshipUpdateItem } from "../../types/community";
import { formatDate } from "../../lib/format";
import { AppButton, Modal, Pill } from "../ui";

export type TownshipUpdateModalProps = {
  item: TownshipUpdateItem | null;
  onClose: () => void;
};

// Read-more dialog for a township update.
export function TownshipUpdateModal({ item, onClose }: TownshipUpdateModalProps) {
  return (
    <Modal
      open={item !== null}
      title={item?.title ?? "Township update"}
      onClose={onClose}
      footer={
        <AppButton variant="primary" onClick={onClose}>
          Done
        </AppButton>
      }
    >
      {item && (
        <>
          <div className="inline-icon ui-gap-2">
            <Pill>{item.topic}</Pill>
            <span className="ui-meta-row">Published {formatDate(item.publishedAt)}</span>
          </div>
          <p className="ui-flush">{item.summary}</p>
          <div className="ui-meta-row">
            <span>Source: {item.source}</span>
          </div>
        </>
      )}
    </Modal>
  );
}
