import { GtfsMapperService } from './gtfs-mapper.service';
import { GtfsStopTime } from '../types/gtfs.types';

describe('GtfsMapperService', () => {
  const service = new GtfsMapperService();

  describe('mapStopTime', () => {
    it('computes arrivalSeconds and departureSeconds from valid times', () => {
      const gtfsSt: GtfsStopTime = {
        trip_id: 'trip-1',
        stop_id: 'stop-a',
        stop_sequence: 1,
        arrival_time: '08:00:00',
        departure_time: '08:02:00',
        pickup_type: '0',
        drop_off_type: '0',
      };

      const result = service.mapStopTime(gtfsSt, 'trip-uuid', 'stop-uuid');

      expect(result).toMatchObject({
        tripId: 'trip-uuid',
        stopId: 'stop-uuid',
        stopSequence: 1,
        arrivalTime: '08:00:00',
        departureTime: '08:02:00',
        arrivalSeconds: 8 * 3600,
        departureSeconds: 8 * 3600 + 2 * 60,
      });
    });

    it('returns null seconds when arrival_time is empty', () => {
      const gtfsSt: GtfsStopTime = {
        trip_id: 'trip-1',
        stop_id: 'stop-a',
        stop_sequence: 1,
        arrival_time: '',
        departure_time: '08:02:00',
        pickup_type: '',
        drop_off_type: '',
      };

      const result = service.mapStopTime(gtfsSt, 'trip-uuid', 'stop-uuid');

      expect(result.arrivalSeconds).toBeNull();
      expect(result.departureSeconds).toBe(8 * 3600 + 2 * 60);
    });

    it('returns null seconds when departure_time is empty', () => {
      const gtfsSt: GtfsStopTime = {
        trip_id: 'trip-1',
        stop_id: 'stop-a',
        stop_sequence: 5,
        arrival_time: '18:30:00',
        departure_time: '',
        pickup_type: '',
        drop_off_type: '',
      };

      const result = service.mapStopTime(gtfsSt, 'trip-uuid', 'stop-uuid');

      expect(result.arrivalSeconds).toBe(18 * 3600 + 30 * 60);
      expect(result.departureSeconds).toBeNull();
    });

    it('handles overnight times past 24:00:00', () => {
      const gtfsSt: GtfsStopTime = {
        trip_id: 'trip-1',
        stop_id: 'stop-a',
        stop_sequence: 3,
        arrival_time: '25:30:00',
        departure_time: '25:35:00',
        pickup_type: '',
        drop_off_type: '',
      };

      const result = service.mapStopTime(gtfsSt, 'trip-uuid', 'stop-uuid');

      expect(result.arrivalSeconds).toBe(25 * 3600 + 30 * 60);
      expect(result.departureSeconds).toBe(25 * 3600 + 35 * 60);
    });

    it('parses pickup_type and drop_off_type as integers', () => {
      const gtfsSt: GtfsStopTime = {
        trip_id: 'trip-1',
        stop_id: 'stop-a',
        stop_sequence: 2,
        arrival_time: '12:00:00',
        departure_time: '12:01:00',
        pickup_type: '1',
        drop_off_type: '2',
      };

      const result = service.mapStopTime(gtfsSt, 'trip-uuid', 'stop-uuid');

      expect(result.pickupType).toBe(1);
      expect(result.dropOffType).toBe(2);
    });
  });

  describe('mapAgency', () => {
    it('maps GTFS agency to CreateAgencyInput', () => {
      const result = service.mapAgency(
        {
          agency_id: 'mrt-jakarta',
          agency_name: 'MRT Jakarta',
          agency_url: 'https://jakartamrt.co.id',
          agency_timezone: 'Asia/Jakarta',
          agency_lang: 'id',
          agency_phone: '+6221-3901234',
        },
        'feed-1',
        'region-1',
        'operator-1',
      );

      expect(result).toMatchObject({
        feedSourceId: 'feed-1',
        externalAgencyId: 'mrt-jakarta',
        regionId: 'region-1',
        operatorId: 'operator-1',
        name: 'MRT Jakarta',
        slug: 'mrt-jakarta',
        timezone: 'Asia/Jakarta',
        language: 'id',
        phone: '+6221-3901234',
        website: 'https://jakartamrt.co.id',
        isActive: true,
      });
    });
  });

  describe('mapStop', () => {
    it('maps GTFS stop with latitude/longitude', () => {
      const result = service.mapStop(
        {
          stop_id: 'bundaran-hi',
          stop_name: 'Bundaran HI',
          stop_lat: -6.1938,
          stop_lon: 106.823,
          location_type: 1,
        },
        'feed-1',
        'region-1',
      );

      expect(result).toMatchObject({
        feedSourceId: 'feed-1',
        externalStopId: 'bundaran-hi',
        regionId: 'region-1',
        name: 'Bundaran HI',
        slug: 'bundaran-hi',
        latitude: -6.1938,
        longitude: 106.823,
        isStation: true,
      });
    });
  });

  describe('mapCalendar', () => {
    it('converts GTFS date string to Date', () => {
      const result = service.mapCalendar(
        {
          service_id: 'weekday',
          monday: '1',
          tuesday: '1',
          wednesday: '1',
          thursday: '1',
          friday: '1',
          saturday: '0',
          sunday: '0',
          start_date: '20260101',
          end_date: '20261231',
        },
        'feed-1',
      );

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.serviceId).toBe('weekday');
      expect(result.monday).toBe(true);
      expect(result.sunday).toBe(false);
    });
  });

  describe('resolveTransitModeCode', () => {
    it('maps route_type 1 to SUBWAY', () => {
      expect(service.resolveTransitModeCode(1)).toBe('SUBWAY');
    });

    it('maps route_type 3 to BUS', () => {
      expect(service.resolveTransitModeCode(3)).toBe('BUS');
    });

    it('returns undefined for unknown route_type', () => {
      expect(service.resolveTransitModeCode(999)).toBeUndefined();
    });
  });
});
