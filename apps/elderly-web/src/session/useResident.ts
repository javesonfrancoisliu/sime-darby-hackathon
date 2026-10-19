import type { User } from "@sdh/contracts";
import { useSession } from "@sdh/api-client";

// The resident using this phone: the signed-in user.
export function useResident(): User | null {
  return useSession().user;
}
