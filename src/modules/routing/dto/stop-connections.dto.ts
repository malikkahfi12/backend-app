import { ApiProperty } from '@nestjs/swagger';
import { RoutingEdgeDto } from './routing-edge.dto';

export class StopConnectionsDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  stopId!: string;

  @ApiProperty({ example: 'Bundaran HI' })
  name!: string;

  @ApiProperty({ type: [RoutingEdgeDto] })
  connections!: RoutingEdgeDto[];
}
