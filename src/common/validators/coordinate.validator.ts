import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isLatitude', async: false })
export class IsLatitudeConstraint implements ValidatorConstraintInterface {
  validate(value: number): boolean {
    return typeof value === 'number' && value >= -90 && value <= 90;
  }

  defaultMessage(): string {
    return 'Latitude must be between -90 and 90';
  }
}

export function IsLatitude(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isLatitude',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsLatitudeConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isLongitude', async: false })
export class IsLongitudeConstraint implements ValidatorConstraintInterface {
  validate(value: number): boolean {
    return typeof value === 'number' && value >= -180 && value <= 180;
  }

  defaultMessage(): string {
    return 'Longitude must be between -180 and 180';
  }
}

export function IsLongitude(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isLongitude',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsLongitudeConstraint,
    });
  };
}
