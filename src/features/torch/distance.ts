/** Haversine distance in metres — pure + unit-testable (mirrors the server helper). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const TORCH_PICKUP_RADIUS_M = 60;

/** Can the user pick up the waiting torch from here? */
export function canPickUp(
  torch: { status: string; lat: number; lng: number } | null,
  user: { lat: number; lng: number }
): boolean {
  if (!torch || torch.status !== 'waiting') return false;
  return distanceMeters({ lat: torch.lat, lng: torch.lng }, user) <= TORCH_PICKUP_RADIUS_M;
}
