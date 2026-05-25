import { PrismaService } from '../prisma.service';
import { BaseRepository } from './base.repository.interface';

type FindUniqueDelegate<TEntity, TId> = {
  findUnique(args: { where: { id: TId } }): Promise<TEntity | null>;
};

export abstract class PrismaRepositoryBase<
  TEntity,
  TId = string,
> implements BaseRepository<TEntity, TId> {
  protected constructor(
    protected readonly prismaService: PrismaService,
    private readonly delegate: FindUniqueDelegate<TEntity, TId>,
  ) {}

  findById(id: TId): Promise<TEntity | null> {
    return this.delegate.findUnique({
      where: { id },
    });
  }
}
