export interface GtfsAgency {
  agency_id?: string;
  agency_name: string;
  agency_url: string;
  agency_timezone: string;
  agency_lang?: string;
  agency_phone?: string;
}

export interface GtfsRoute {
  route_id: string;
  agency_id?: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color?: string;
  route_text_color?: string;
  route_desc?: string;
}

export interface GtfsStop {
  stop_id: string;
  stop_code?: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  location_type?: number;
  parent_station?: string;
  stop_desc?: string;
}

export interface GtfsTrip {
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign?: string;
  direction_id?: string;
  block_id?: string;
  shape_id?: string;
}

export interface GtfsStopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
  pickup_type?: string;
  drop_off_type?: string;
}

export interface GtfsCalendar {
  service_id: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  start_date: string;
  end_date: string;
}

export interface GtfsFeed {
  agencies: GtfsAgency[];
  routes: GtfsRoute[];
  stops: GtfsStop[];
  trips: GtfsTrip[];
  stopTimes: GtfsStopTime[];
  calendars: GtfsCalendar[];
}

export const REQUIRED_GTFS_FILES = [
  'agency.txt',
  'routes.txt',
  'stops.txt',
  'trips.txt',
  'stop_times.txt',
  'calendar.txt',
] as const;

export const GTFS_FILE_COLUMNS: Record<string, string[]> = {
  'agency.txt': ['agency_name', 'agency_url', 'agency_timezone'],
  'routes.txt': [
    'route_id',
    'route_short_name',
    'route_long_name',
    'route_type',
  ],
  'stops.txt': ['stop_id', 'stop_name', 'stop_lat', 'stop_lon'],
  'trips.txt': ['route_id', 'service_id', 'trip_id'],
  'stop_times.txt': [
    'trip_id',
    'arrival_time',
    'departure_time',
    'stop_id',
    'stop_sequence',
  ],
  'calendar.txt': [
    'service_id',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'start_date',
    'end_date',
  ],
};
