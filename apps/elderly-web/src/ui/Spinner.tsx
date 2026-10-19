// LoadingState - accessible loading indicator with a live region.
export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <p role="status" aria-live="polite" className="app-spinner-text">
      {label}…
    </p>
  );
}
