import { Injectable } from '@nestjs/common';
import { ParsedShape } from '../types/gtfs-shape.type';

@Injectable()
export class ShapeNormalizer {
  normalize(shapes: ParsedShape[]): ParsedShape[] {
    return shapes.filter(
      (s) =>
        !isNaN(s.shapePtLat) &&
        !isNaN(s.shapePtLon) &&
        !isNaN(s.shapePtSequence) &&
        s.shapePtLat >= -90 &&
        s.shapePtLat <= 90 &&
        s.shapePtLon >= -180 &&
        s.shapePtLon <= 180,
    );
  }
}
