import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { FeedSourceEntity } from '../../domain/entities/feed-source.entity';
import {
  CreateFeedSourceInput,
  FeedSourceRepository,
} from '../../domain/repositories/feed-source.repository.interface';

@Injectable()
export class PrismaFeedSourceRepository implements FeedSourceRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(input: CreateFeedSourceInput): Promise<FeedSourceEntity> {
    const feedSource = await this.prismaService.feedSource.create({
      data: {
        ...input,
        url: input.url ?? null,
      },
    });

    return feedSource as FeedSourceEntity;
  }

  async findAll(): Promise<FeedSourceEntity[]> {
    const feedSources = await this.prismaService.feedSource.findMany({
      orderBy: [{ operatorId: 'asc' }, { type: 'asc' }, { name: 'asc' }],
    });

    return feedSources as FeedSourceEntity[];
  }

  async findById(id: string): Promise<FeedSourceEntity | null> {
    const feedSource = await this.prismaService.feedSource.findUnique({
      where: { id },
    });

    return feedSource as FeedSourceEntity | null;
  }
}
