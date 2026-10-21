import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from "react";

// Without a boundary, one render error removes the whole app and leaves a blank page.

export type AppErrorBoundaryProps = {
  children: ReactNode;
  // Where "Back to start" goes; omit to hide the link.
  homeHref?: string;
  // Test hooks; the defaults reload the page and log to the console.
  onReload?: () => void;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = { error: Error | null };

// A failed lazy import after a deploy means this tab still runs an old build.
const STALE_BUILD = /dynamically imported module|Loading chunk|Importing a module script failed/i;
export const isStaleBuildError = (error: Error): boolean => STALE_BUILD.test(error.message);

const page: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px 16px",
  background: "var(--page-bg, #f8f9fa)",
  color: "var(--text-primary, #1f2937)",
  fontFamily: "var(--font-sans, system-ui, sans-serif)",
  fontSize: "var(--font-body, 16px)",
};

const card: CSSProperties = {
  maxWidth: 420,
  width: "100%",
  padding: 24,
  background: "var(--surface, #fff)",
  border: "1px solid var(--border, #e5e7eb)",
  borderRadius: "var(--radius-card, 16px)",
  textAlign: "center",
};

const primary: CSSProperties = {
  minHeight: 48,
  padding: "0 24px",
  border: 0,
  borderRadius: "var(--radius-control, 12px)",
  background: "var(--brand-primary, #d71920)",
  color: "#fff",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};

const link: CSSProperties = {
  display: "inline-block",
  marginTop: 16,
  color: "var(--text-secondary, #4b5563)",
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Name, message and component stack only; no user or request data.
    (this.props.onError ?? defaultLog)(error, info);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const stale = isStaleBuildError(error);
    const reload = this.props.onReload ?? (() => window.location.reload());
    return (
      <main style={page} role="alert">
        <div style={card}>
          <h1 style={{ margin: "0 0 8px", fontSize: "1.375em" }}>
            {stale ? "A new version is ready" : "Something went wrong"}
          </h1>
          <p style={{ margin: "0 0 20px", color: "var(--text-secondary, #4b5563)" }}>
            {stale
              ? "Reload to get the latest version."
              : "The page stopped working. Reload to try again. Your information is safe."}
          </p>
          <button type="button" style={primary} onClick={reload}>
            Reload
          </button>
          {this.props.homeHref ? (
            <div>
              <a style={link} href={this.props.homeHref}>
                Back to start
              </a>
            </div>
          ) : null}
        </div>
      </main>
    );
  }
}

function defaultLog(error: Error, info: ErrorInfo): void {
  console.error("App crashed", error.name, error.message, info.componentStack);
}
