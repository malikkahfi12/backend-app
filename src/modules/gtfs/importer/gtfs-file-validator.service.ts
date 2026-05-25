import { Injectable } from '@nestjs/common';
import { SPRINT_8_REQUIRED_FILES } from '../constants/required-gtfs-files.constant';

@Injectable()
export class GtfsFileValidatorService {
  validate(files: Map<string, Buffer>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const requiredFile of SPRINT_8_REQUIRED_FILES) {
      if (!files.has(requiredFile)) {
        errors.push(`Missing required GTFS file: ${requiredFile}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
