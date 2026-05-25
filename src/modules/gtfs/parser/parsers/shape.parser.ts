import { Injectable } from '@nestjs/common';
import { ParsedShape } from '../../types/gtfs-shape.type';

@Injectable()
export class ShapeParser {
  parse(rawRows: Record<string, string>[]): {
    shapes: ParsedShape[];
    errors: string[];
  } {
    const shapes: ParsedShape[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const lineNumber = i + 2;

      if (!row.shape_id) {
        errors.push(
          `shapes.txt row ${lineNumber}: missing required field 'shape_id'`,
        );
        continue;
      }
      if (!row.shape_pt_lat) {
        errors.push(
          `shapes.txt row ${lineNumber}: missing required field 'shape_pt_lat'`,
        );
        continue;
      }
      if (!row.shape_pt_lon) {
        errors.push(
          `shapes.txt row ${lineNumber}: missing required field 'shape_pt_lon'`,
        );
        continue;
      }
      if (!row.shape_pt_sequence) {
        errors.push(
          `shapes.txt row ${lineNumber}: missing required field 'shape_pt_sequence'`,
        );
        continue;
      }

      const lat = parseFloat(row.shape_pt_lat);
      const lon = parseFloat(row.shape_pt_lon);
      const seq = parseInt(row.shape_pt_sequence, 10);

      if (isNaN(lat) || isNaN(lon) || isNaN(seq)) {
        errors.push(`shapes.txt row ${lineNumber}: invalid numeric value`);
        continue;
      }

      shapes.push({
        shapeId: row.shape_id,
        shapePtLat: lat,
        shapePtLon: lon,
        shapePtSequence: seq,
        shapeDistTraveled: row.shape_dist_traveled
          ? parseFloat(row.shape_dist_traveled)
          : undefined,
      });
    }

    return { shapes, errors };
  }
}
