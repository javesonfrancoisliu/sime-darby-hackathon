import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional right-aligned content, e.g. a CTA or a toggle. */
  actions?: ReactNode;
};

/** Shared page header: heading + one-sentence subtitle + optional right-aligned action. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <div>
        <h1 className="ui-page-title">{title}</h1>
        {subtitle && <p className="ui-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ui-page-header-actions">{actions}</div>}
    </header>
  );
}
