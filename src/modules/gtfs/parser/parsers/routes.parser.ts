import { Injectable } from '@nestjs/common';
import { ParsedRoute } from '../../types/gtfs-route.type';

@Injectable()
export class RoutesParser {
  parse(rawRows: Record<string, string>[]): {
    routes: ParsedRoute[];
    errors: string[];
  } {
    const routes: ParsedRoute[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const lineNumber = i + 2;

      if (!row.route_id) {
        errors.push(
          `routes.txt row ${lineNumber}: missing required field 'route_id'`,
        );
        continue;
      }

      const routeType = parseInt(row.route_type, 10);
      if (isNaN(routeType)) {
        errors.push(
          `routes.txt row ${lineNumber}: invalid route_type '${row.route_type}'`,
        );
        continue;
      }

      routes.push({
        gtfsRouteId: row.route_id,
        shortName: row.route_short_name || '',
        longName: row.route_long_name || row.route_short_name || '',
        routeType,
        agencyId: row.agency_id || undefined,
        color: row.route_color || undefined,
        textColor: row.route_text_color || undefined,
        description: row.route_desc || undefined,
      });
    }

    return { routes, errors };
  }
}
