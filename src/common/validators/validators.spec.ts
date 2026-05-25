import { IsValidHexColorConstraint } from './hex-color.validator';
import { IsGtfsTimeConstraint } from './gtfs-time.validator';
import {
  IsLatitudeConstraint,
  IsLongitudeConstraint,
} from './coordinate.validator';

describe('IsValidHexColorConstraint', () => {
  const validator = new IsValidHexColorConstraint();

  it('accepts valid 6-char hex', () => {
    expect(validator.validate('FF0000')).toBe(true);
    expect(validator.validate('00ff00')).toBe(true);
    expect(validator.validate('abcdef')).toBe(true);
  });

  it('rejects hex with # prefix', () => {
    expect(validator.validate('#FF0000')).toBe(false);
  });

  it('rejects short hex', () => {
    expect(validator.validate('FFF')).toBe(false);
  });

  it('accepts null and undefined', () => {
    expect(validator.validate(null)).toBe(true);
    expect(validator.validate(undefined)).toBe(true);
  });
});

describe('IsLatitudeConstraint', () => {
  const validator = new IsLatitudeConstraint();

  it('accepts valid latitudes', () => {
    expect(validator.validate(0)).toBe(true);
    expect(validator.validate(-6.2)).toBe(true);
    expect(validator.validate(90)).toBe(true);
    expect(validator.validate(-90)).toBe(true);
  });

  it('rejects out-of-range latitudes', () => {
    expect(validator.validate(91)).toBe(false);
    expect(validator.validate(-91)).toBe(false);
  });

  it('rejects non-number', () => {
    expect(validator.validate('10' as unknown as number)).toBe(false);
  });
});

describe('IsLongitudeConstraint', () => {
  const validator = new IsLongitudeConstraint();

  it('accepts valid longitudes', () => {
    expect(validator.validate(0)).toBe(true);
    expect(validator.validate(106.8)).toBe(true);
    expect(validator.validate(180)).toBe(true);
    expect(validator.validate(-180)).toBe(true);
  });

  it('rejects out-of-range longitudes', () => {
    expect(validator.validate(181)).toBe(false);
    expect(validator.validate(-181)).toBe(false);
  });
});

describe('IsGtfsTimeConstraint', () => {
  const validator = new IsGtfsTimeConstraint();

  it('accepts valid GTFS times', () => {
    expect(validator.validate('08:00:00')).toBe(true);
    expect(validator.validate('25:10:00')).toBe(true);
    expect(validator.validate('0:00:00')).toBe(true);
    expect(validator.validate('23:59:59')).toBe(true);
  });

  it('rejects invalid format', () => {
    expect(validator.validate('8:00')).toBe(false);
    expect(validator.validate('abc')).toBe(false);
    expect(validator.validate('')).toBe(false);
  });

  it('rejects non-string', () => {
    expect(validator.validate(123 as unknown as string)).toBe(false);
  });
});
