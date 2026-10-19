import { townshipApi } from "../api/township";
import { useLiveQuery } from "./useLiveQuery";

// The township name, security line and emergency number. A failed load simply hides the security line.
export function useTownship() {
  return useLiveQuery("township", townshipApi.get);
}
