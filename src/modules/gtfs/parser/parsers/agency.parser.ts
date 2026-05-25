import { Injectable } from '@nestjs/common';
import { ParsedAgency } from '../../types/gtfs-agency.type';

@Injectable()
export class AgencyParser {
  parse(rawRows: Record<string, string>[]): {
    agencies: ParsedAgency[];
    errors: string[];
  } {
    const agencies: ParsedAgency[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const lineNumber = i + 2;

      if (!row.agency_name) {
        errors.push(
          `agency.txt row ${lineNumber}: missing required field 'agency_name'`,
        );
        continue;
      }
      if (!row.agency_timezone) {
        errors.push(
          `agency.txt row ${lineNumber}: missing required field 'agency_timezone'`,
        );
        continue;
      }

      agencies.push({
        gtfsAgencyId: row.agency_id || null,
        name: row.agency_name,
        timezone: row.agency_timezone,
        url: row.agency_url || undefined,
        lang: row.agency_lang || undefined,
        phone: row.agency_phone || undefined,
      });
    }

    return { agencies, errors };
  }
}
