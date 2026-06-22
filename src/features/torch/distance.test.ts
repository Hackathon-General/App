import { distanceMeters, canPickUp, TORCH_PICKUP_RADIUS_M } from './distance';

describe('distanceMeters', () => {
  it('is ~0 for the same point', () => {
    expect(distanceMeters({ lat: 32.75, lng: 35.07 }, { lat: 32.75, lng: 35.07 })).toBeLessThan(1);
  });
  it('computes ~111m for 0.001deg latitude', () => {
    const d = distanceMeters({ lat: 32.75, lng: 35.07 }, { lat: 32.751, lng: 35.07 });
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
});

describe('canPickUp', () => {
  const waiting = { status: 'waiting', lat: 32.75, lng: 35.07 };
  it('false when no torch', () => expect(canPickUp(null, { lat: 32.75, lng: 35.07 })).toBe(false));
  it('false when torch held', () => expect(canPickUp({ ...waiting, status: 'held' }, { lat: 32.75, lng: 35.07 })).toBe(false));
  it('true when within radius', () => expect(canPickUp(waiting, { lat: 32.7503, lng: 35.07 })).toBe(true));
  it('false when too far', () => expect(canPickUp(waiting, { lat: 32.9, lng: 35.07 })).toBe(false));
  it('radius is 60m', () => expect(TORCH_PICKUP_RADIUS_M).toBe(60));
});
