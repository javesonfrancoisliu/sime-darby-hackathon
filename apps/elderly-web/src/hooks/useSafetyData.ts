import { FACILITY_REPORTS, HAZE_DATA, TEMPERATURE_DATA, WATER_LEVELS } from "../mock/safetyData";

// Safety readings are demo data until a township feed exists; pages read them only here.
export function useSafetyData() {
  return {
    hazeReadings: HAZE_DATA,
    waterReadings: WATER_LEVELS,
    temperatureAlert: TEMPERATURE_DATA,
    facilityReports: FACILITY_REPORTS,
  };
}
