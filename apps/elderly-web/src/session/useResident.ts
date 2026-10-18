import type { User } from "@sdh/contracts";
import { useSession } from "@sdh/api-client";
import { isMockMode } from "../config";
import { MOCK_RESIDENT } from "../mock/residentData";

// The resident using this phone: the signed-in user, or the fictional one in demo mode.
export function useResident(): User | null {
  const { user } = useSession();
  return isMockMode() ? MOCK_RESIDENT : user;
}
