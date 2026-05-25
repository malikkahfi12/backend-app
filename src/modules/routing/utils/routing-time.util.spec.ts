import { walkingTimeSeconds, isValidTravelTime } from './routing-time.util';

describe('routing-time.util', () => {
  describe('walkingTimeSeconds', () => {
    it('calculates walking time at 1.2 m/s', () => {
      expect(walkingTimeSeconds(120)).toBe(100);
    });

    it('rounds up', () => {
      expect(walkingTimeSeconds(121)).toBe(101);
    });

    it('returns 1 for very short distance', () => {
      expect(walkingTimeSeconds(1)).toBe(1);
    });

    it('returns 0 for 0 distance', () => {
      expect(walkingTimeSeconds(0)).toBe(0);
    });
  });

  describe('isValidTravelTime', () => {
    it('returns true for positive seconds', () => {
      expect(isValidTravelTime(300)).toBe(true);
    });

    it('returns true for 0 (midnight)', () => {
      expect(isValidTravelTime(0)).toBe(true);
    });

    it('returns false for negative', () => {
      expect(isValidTravelTime(-1)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isValidTravelTime(null)).toBe(false);
    });
  });
});
