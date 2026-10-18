import type { ReactNode } from "react";

import { SessionProvider } from "@sdh/api-client";

export function sessionWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
