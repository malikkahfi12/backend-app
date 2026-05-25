import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidHexColor', async: false })
export class IsValidHexColorConstraint implements ValidatorConstraintInterface {
  validate(value: string | null | undefined): boolean {
    if (value === null || value === undefined) return true;
    return /^[0-9A-Fa-f]{6}$/.test(value);
  }

  defaultMessage(): string {
    return 'Color must be a valid 6-character hex code without # prefix';
  }
}

export function IsValidHexColor(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidHexColor',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidHexColorConstraint,
    });
  };
}
