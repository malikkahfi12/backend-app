import { toStopTimeResponse } from '../mappers/stop-time.mapper';
import { StopTimeEntity } from '../../domain/entities/stop-time.entity';

describe('toStopTimeResponse', () => {
  it('maps entity with GTFS time strings', () => {
    const entity: StopTimeEntity = {
      id: 'st-1',
      tripId: 'trip-1',
      stopId: 'stop-1',
      stopSequence: 1,
      arrivalTime: '25:10:00',
      departureTime: '25:11:00',
      pickupType: 0,
      dropOffType: 0,
    };

    const dto = toStopTimeResponse(entity);
    expect(dto.arrivalTime).toBe('25:10:00');
    expect(dto.departureTime).toBe('25:11:00');
    expect(dto.stopSequence).toBe(1);
  });
});
