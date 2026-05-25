import { ApiProperty } from '@nestjs/swagger';

export class GraphSummaryDto {
  @ApiProperty({ example: 1200 })
  nodeCount!: number;

  @ApiProperty({ example: 3000 })
  walkingEdgeCount!: number;

  @ApiProperty({ example: 0 })
  transferEdgeCount!: number;

  @ApiProperty({ example: 8000 })
  transitEdgeCount!: number;

  @ApiProperty({ example: 11000 })
  totalEdgeCount!: number;
}
