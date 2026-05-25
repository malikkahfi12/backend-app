import { Injectable } from '@nestjs/common';

@Injectable()
export class GtfsRowValidatorHelper {
  validateRows<T>(
    rows: Record<string, string>[],
    validator: (
      row: Record<string, string>,
      index: number,
    ) => {
      valid: boolean;
      error?: string;
    },
    fileName: string,
  ): { validRows: T[]; errors: string[] } {
    const validRows: T[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const result = validator(rows[i], i);
      if (result.valid) {
        validRows.push(rows[i] as unknown as T);
      } else if (result.error) {
        errors.push(`${fileName} row ${i + 2}: ${result.error}`);
      }
    }

    return { validRows, errors };
  }
}
