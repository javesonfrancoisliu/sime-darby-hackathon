import { medicalApi } from "../api/medical";
import { useLiveQuery } from "./useLiveQuery";
import { useMutation } from "./useMutation";

// A resident with no Medical ID gets NOT_FOUND, which screens show as an empty state.
export const useMedicalId = () => useLiveQuery("medical-id", medicalApi.get);
export const useSaveMedicalId = () => useMutation(medicalApi.save);
export const useRemoveMedicalId = () => useMutation(medicalApi.remove);
