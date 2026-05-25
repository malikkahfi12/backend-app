CREATE INDEX idx_stops_is_active ON stops(is_active) WHERE is_active = true;

CREATE INDEX idx_stops_location_gist ON stops USING GIST(location);

CREATE INDEX idx_trips_is_active ON trips(is_active) WHERE is_active = true;

CREATE INDEX idx_stop_times_trip_seq_dep ON stop_times(trip_id, stop_sequence, departure_seconds);

CREATE INDEX idx_stop_times_trip_seq_arr ON stop_times(trip_id, stop_sequence, arrival_seconds);
