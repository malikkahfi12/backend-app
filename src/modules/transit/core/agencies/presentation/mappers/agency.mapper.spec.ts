import { toAgencyResponse } from '../mappers/agency.mapper';
import { AgencyEntity } from '../../domain/entities/agency.entity';

describe('toAgencyResponse', () => {
  it('maps entity to response DTO excluding timestamps', () => {
    const entity: AgencyEntity = {
      id: 'agency-1',
      regionId: 'region-1',
      operatorId: 'operator-1',
      name: 'TransJakarta',
      slug: 'transjakarta',
      timezone: 'Asia/Jakarta',
      language: 'id',
      phone: '+62211500',
      website: 'https://transjakarta.co.id',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const dto = toAgencyResponse(entity);
    expect(dto).toMatchObject({
      id: 'agency-1',
      regionId: 'region-1',
      operatorId: 'operator-1',
      name: 'TransJakarta',
      slug: 'transjakarta',
      timezone: 'Asia/Jakarta',
      language: 'id',
      phone: '+62211500',
      website: 'https://transjakarta.co.id',
      isActive: true,
    });
    expect((dto as Record<string, unknown>).createdAt).toBeUndefined();
    expect((dto as Record<string, unknown>).updatedAt).toBeUndefined();
  });
});
