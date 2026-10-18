import type { ReactNode } from "react";
import { useAccessibility } from "../context/AccessibilityContext";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  // Shared with the page's TabPanel elements so tab and panel ids point at each other.
  groupId: string;
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  // Accessible name for the tablist.
  ariaLabel: string;
}

// SegmentedTabs - iOS-style segmented control.
//
// One category visible at a time so the user never has to scroll past every
// section. The active pill is a sliding indicator with a short, damped curve.
// Press feedback is instant on pointer-down; motion is dropped under reduced
// motion. Full ARIA tablist semantics with roving focus.
export function SegmentedTabs<T extends string>({
  groupId,
  tabs,
  active,
  onChange,
  ariaLabel,
}: SegmentedTabsProps<T>) {
  const { triggerHaptic } = useAccessibility();
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === active),
  );

  function select(id: T) {
    if (id !== active) {
      triggerHaptic(12);
      onChange(id);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (activeIndex + dir + tabs.length) % tabs.length;
    const nextTab = tabs[next];
    if (nextTab) {
      select(nextTab.id);
      document.getElementById(`${groupId}-tab-${nextTab.id}`)?.focus();
    }
  }

  return (
    <div
      className="seg-tabs"
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{ ["--seg-count" as string]: tabs.length, ["--seg-active" as string]: activeIndex }}
    >
      <span className="seg-tabs__indicator" aria-hidden="true" />
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={`${groupId}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${groupId}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`seg-tabs__tab${selected ? " seg-tabs__tab--active" : ""}`}
            onClick={() => select(tab.id)}
          >
            {tab.icon ? (
              <span className="seg-tabs__icon" aria-hidden="true">
                {tab.icon}
              </span>
            ) : null}
            <span className="seg-tabs__label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Panel wrapper that ties content to its tab for ARIA + focus.
export function TabPanel({
  id,
  groupId,
  children,
}: {
  id: string;
  groupId: string;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={`${groupId}-panel-${id}`} aria-labelledby={`${groupId}-tab-${id}`}>
      {children}
    </div>
  );
}
