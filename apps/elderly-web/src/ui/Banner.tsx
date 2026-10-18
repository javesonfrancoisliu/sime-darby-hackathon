import { Button } from "./Button";

interface BannerProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

// ErrorNotice - composes the shared ui-card with a danger message and an
// optional retry action.
export function Banner({ message, onRetry, retryLabel = "Try again" }: BannerProps) {
  return (
    <div
      className="ui-card"
      role="alert"
      style={{
        borderColor: "var(--danger)",
        color: "var(--danger)",
        marginBottom: "var(--space-6)",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>{message}</p>
      {onRetry ? (
        <div style={{ marginTop: "var(--space-4)" }}>
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
