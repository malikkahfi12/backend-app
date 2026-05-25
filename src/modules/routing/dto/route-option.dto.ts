import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteLegDto } from './route-leg.dto';
import type { TimelessRouteStrategy } from '../algorithms/dijkstra-routing.algorithm';

export class RouteOptionDto {
  @ApiPropertyOptional({
    enum: ['FASTEST', 'LESS_WALKING', 'FEWER_TRANSITS'],
    example: 'FASTEST',
  })
  strategy?: TimelessRouteStrategy;

  @ApiProperty({ example: 2400 })
  totalDurationSeconds!: number;

  @ApiProperty({ example: 420 })
  walkingDurationSeconds!: number;

  @ApiProperty({ example: 180 })
  waitingDurationSeconds!: number;

  @ApiProperty({ example: 1 })
  transferCount!: number;

  @ApiProperty({ type: [RouteLegDto] })
  legs!: RouteLegDto[];
}
