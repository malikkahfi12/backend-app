export function walkingTimeSeconds(distanceMeters: number): number {
  return Math.ceil(distanceMeters / 1.2);
}

export function isValidTravelTime(seconds: number | null): boolean {
  if (seconds === null || seconds === undefined) return false;
  return seconds >= 0;
}
