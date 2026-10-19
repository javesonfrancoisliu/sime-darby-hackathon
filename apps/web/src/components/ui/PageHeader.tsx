import { useEffect, type ReactNode } from "react";

const APP_NAME = "Township Connect";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  // Optional right-aligned content, e.g. a CTA or a toggle.
  actions?: ReactNode;
};

// Shared page header: heading + one-sentence subtitle + optional right-aligned action.
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  // Every page renders one PageHeader, so this names the tab per route.
  useEffect(() => {
    document.title = `${title} - ${APP_NAME}`;
  }, [title]);

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
