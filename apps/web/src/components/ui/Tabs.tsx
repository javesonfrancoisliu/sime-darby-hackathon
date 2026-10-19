import { useRef, type KeyboardEvent, type ReactNode } from "react";

export type TabItem<T extends string> = { id: T; label: string };

export type TabsProps<T extends string> = {
  // Names the tab list for screen readers; also the prefix of the tab and panel ids.
  idBase: string;
  label: string;
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
};

const tabId = (idBase: string, id: string) => `${idBase}-tab-${id}`;
const panelId = (idBase: string, id: string) => `${idBase}-panel-${id}`;

// Tabs with the WAI-ARIA keyboard pattern: one tab stop, arrow keys, Home and End
// move and select, and the selected tab controls its panel.
export function Tabs<T extends string>({ idBase, label, tabs, value, onChange }: TabsProps<T>) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.id === value);
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    onChange(target.id);
    buttons.current.get(target.id)?.focus();
  }

  return (
    <div className="ui-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (node) buttons.current.set(tab.id, node);
              else buttons.current.delete(tab.id);
            }}
            id={tabId(idBase, tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(idBase, tab.id)}
            tabIndex={selected ? 0 : -1}
            className="ui-tab"
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  idBase,
  id,
  children,
}: {
  idBase: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={panelId(idBase, id)} aria-labelledby={tabId(idBase, id)}>
      {children}
    </div>
  );
}
