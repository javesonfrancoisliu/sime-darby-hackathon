import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";

import { useRole } from "./RoleContext";

// Restricts a route to the young role; others are redirected to Community.
export function YoungOnly({ children }: { children: ReactElement }) {
  const { role } = useRole();
  return role === "young" ? children : <Navigate to="/community" replace />;
}
