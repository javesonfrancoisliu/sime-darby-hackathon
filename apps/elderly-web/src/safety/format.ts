// Readings arrive with a free-form unit. Temperatures always read "34°C"; other units keep a space.
const CELSIUS_UNITS = new Set(["°c", "c", "℃", "°", "º", "º c", "° c", "deg c", "celsius"]);

export function withUnit(value: number, unit: string): string {
  return unit.startsWith("°") || unit === "%" ? `${value}${unit}` : `${value} ${unit}`;
}

export function formatTemperature(value: number, unit: string): string {
  return CELSIUS_UNITS.has(unit.trim().toLowerCase()) ? `${value}°C` : withUnit(value, unit);
}
