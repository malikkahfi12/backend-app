import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isGtfsTime', async: false })
export class IsGtfsTimeConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (typeof value !== 'string') return false;
    const match = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(value);
    if (!match) return false;
    const hours = parseInt(match[1], 10);
    return hours >= 0;
  }

  defaultMessage(): string {
    return 'Time must be in GTFS format HH:MM:SS (hours can exceed 24)';
  }
}

export function IsGtfsTime(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isGtfsTime',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsGtfsTimeConstraint,
    });
  };
}
