import { useCallback, useState } from "react";

import type { Coords } from "./geo";

export type GeoStatus = "idle" | "locating" | "granted" | "denied" | "unavailable";

export type GeolocationState = {
  status: GeoStatus;
  coords: Coords | null;
  // Ask the browser for the current position (triggers the permission prompt).
  request: () => void;
};

// Thin wrapper over the Geolocation API. Does NOT auto-prompt - call request()
// from a user gesture. When geolocation is unavailable or denied, the status
// lets the UI show a clear "using demo locations" fallback.
function geolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function useGeolocation(): GeolocationState {
  // Derive the initial status lazily so an unsupported environment reports
  // "unavailable" immediately, without a setState-in-effect cascade.
  const [status, setStatus] = useState<GeoStatus>(() =>
    geolocationSupported() ? "idle" : "unavailable",
  );
  const [coords, setCoords] = useState<Coords | null>(null);

  const request = useCallback(() => {
    if (!geolocationSupported()) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  return { status, coords, request };
}
