import { Injectable } from '@nestjs/common';
import { ParsedAgency } from '../types/gtfs-agency.type';

@Injectable()
export class AgencyNormalizer {
  normalize(agencies: ParsedAgency[]): ParsedAgency[] {
    return agencies;
  }
}
