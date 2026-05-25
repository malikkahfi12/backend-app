export interface BaseRepository<TEntity, TId = string> {
  findById(id: TId): Promise<TEntity | null>;
}
