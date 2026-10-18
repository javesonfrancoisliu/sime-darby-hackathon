/** LoadingState — accessible loading indicator with a live region (Req 6.6). */
export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <p role="status" aria-live="polite" style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
      {label}…
    </p>
  );
}
