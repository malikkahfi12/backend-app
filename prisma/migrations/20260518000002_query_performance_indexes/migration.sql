CREATE INDEX idx_stop_times_stop_departure ON stop_times(stop_id, departure_seconds);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_stops_name_trgm ON stops USING GIN(name gin_trgm_ops);
CREATE INDEX idx_stops_code_trgm ON stops USING GIN(code gin_trgm_ops);

CREATE INDEX idx_trips_route_active_created ON trips(route_id, is_active, created_at);

CREATE INDEX idx_stop_times_stop_trip ON stop_times(stop_id, trip_id);

DROP INDEX IF EXISTS stops_location_idx;

DROP INDEX IF EXISTS stop_times_trip_id_idx;
