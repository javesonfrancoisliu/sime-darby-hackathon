import { useEffect } from "react";

import { useSession } from "@sdh/api-client";
import { APP_PATHS, homePathForRole, signInUrl } from "@sdh/auth";

// Where this person belongs right now, or null when they can stay on this page.
export function useSessionRedirect(): string | null {
  const { status, user } = useSession();
  let target: string | null = null;
  if (status === "signed_out") {
    target = signInUrl(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  } else if (status === "profile_required") {
    target = APP_PATHS.finish;
  } else if (status === "signed_in" && user && homePathForRole(user.role) !== APP_PATHS.volunteer) {
    target = homePathForRole(user.role);
  }

  useEffect(() => {
    if (target) window.location.assign(target);
  }, [target]);

  return target;
}
