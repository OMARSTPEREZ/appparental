/**
 * Geofencing & Schedule Calculation Utilities for Kibbo
 */

export interface GeofenceZoneData {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isAlertEnabled: boolean;
  type: 'home' | 'school' | 'family' | 'other';
}

/**
 * Calculates the great-circle distance between two points on the Earth
 * using the Haversine formula (returns distance in meters).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Checks if current time (HH:MM) falls within a schedule range [start, end].
 * Handles overnight / midnight-crossing ranges (e.g. 22:00 to 06:00).
 */
export function isTimeInSchedule(
  currentHourMinute: string,
  startHourMinute: string,
  endHourMinute: string
): boolean {
  try {
    const [cHour, cMin] = currentHourMinute.split(':').map(Number);
    const [sHour, sMin] = startHourMinute.split(':').map(Number);
    const [eHour, eMin] = endHourMinute.split(':').map(Number);

    const currentTotal = cHour * 60 + cMin;
    const startTotal = sHour * 60 + sMin;
    const endTotal = eHour * 60 + eMin;

    if (startTotal <= endTotal) {
      // Normal daytime range (e.g. 08:00 to 14:00)
      return currentTotal >= startTotal && currentTotal < endTotal;
    } else {
      // Overnight range crossing midnight (e.g. 22:00 to 06:00)
      return currentTotal >= startTotal || currentTotal < endTotal;
    }
  } catch {
    return false;
  }
}

/**
 * Formats distance into a user-friendly string (e.g. "45 m" or "1.2 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
