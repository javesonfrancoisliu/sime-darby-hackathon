import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useSession } from "@sdh/api-client";

import { PATHS } from "./constants";
import { destinationFor, isPortalPath } from "./destination";
import { navigateToApp } from "./navigate";

// Once the session has loaded, send a signed-in person to their app and a person without a profile to /finish.
export function useSessionRedirect(options: {
  enabled: boolean;
  next: string | null;
  onFinish?: boolean;
}) {
  const { enabled, next, onFinish = false } = options;
  const { status, user } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;
    if (status === "profile_required" && !onFinish) {
      navigate(PATHS.finish, { replace: true });
    } else if (status === "signed_in" && user) {
      const target = destinationFor(user.role, next);
      if (isPortalPath(target)) navigate(target, { replace: true });
      else navigateToApp(target);
    }
  }, [enabled, status, user, next, onFinish, navigate]);
}
