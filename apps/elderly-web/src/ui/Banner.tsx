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
    <div className="ui-card app-banner" role="alert">
      <p className="app-banner__message">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
