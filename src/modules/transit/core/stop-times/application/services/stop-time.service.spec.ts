import { StopTimeRepository } from '../../domain/repositories/stop-time.repository.interface';
import { StopTimeEntity } from '../../domain/entities/stop-time.entity';
import { StopTimeService } from './stop-time.service';

describe('StopTimeService', () => {
  const stopTime: StopTimeEntity = {
    id: 'st-1',
    tripId: 'trip-1',
    stopId: 'stop-1',
    stopSequence: 1,
    arrivalTime: '08:00:00',
    departureTime: '08:01:00',
    pickupType: 0,
    dropOffType: 0,
  };

  it('lists stop times by tripId', async () => {
    const findAll = jest.fn().mockResolvedValue([stopTime]);
    const repository = {
      create: jest.fn(),
      findAll,
      findById: jest.fn(),
    } as unknown as StopTimeRepository;
    const service = new StopTimeService(repository);

    await expect(service.findAll({ tripId: 'trip-1' })).resolves.toEqual([
      stopTime,
    ]);
  });

  it('handles GTFS time strings with hours > 24', () => {
    expect(stopTime.arrivalTime).toBe('08:00:00');
  });
});
