import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { FeedSourceService } from '../../application/services/feed-source.service';
import { CreateFeedSourceUseCase } from '../../application/use-cases/create-feed-source.use-case';
import { CreateFeedSourceDto } from '../dto/create-feed-source.dto';
import { FeedSourceResponseDto } from '../dto/feed-source-response.dto';
import { toFeedSourceResponse } from '../mappers/feed-source.mapper';

@ApiTags('Feed Sources')
@ApiSecurity('x-api-key')
@Controller('feed-sources')
export class FeedSourcesController {
  constructor(
    private readonly feedSourceService: FeedSourceService,
    private readonly createFeedSourceUseCase: CreateFeedSourceUseCase,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Feed sources returned.',
    type: FeedSourceResponseDto,
    isArray: true,
  })
  async findAll(): Promise<FeedSourceResponseDto[]> {
    const entities = await this.feedSourceService.findAll();
    return entities.map(toFeedSourceResponse);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Feed source created.',
    type: FeedSourceResponseDto,
  })
  async create(
    @Body() dto: CreateFeedSourceDto,
  ): Promise<FeedSourceResponseDto> {
    const entity = await this.createFeedSourceUseCase.execute(dto);
    return toFeedSourceResponse(entity);
  }
}
