# Search API Guide

## Endpoint

```
GET /api/v1/search
```

Unified search that combines transit stops (from the database) with geocoded places (via StadiaMaps Geocoding v2).

---

## Parameters

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `q` | string | **Yes** | — | Search query text (e.g. station name, address, landmark) |
| `lat` | number | No | — | Latitude for proximity bias. Must be paired with `lng`. Range: `-90` to `90`. |
| `lng` | number | No | — | Longitude for proximity bias. Must be paired with `lat`. Range: `-180` to `180`. |
| `limit` | integer | No | `5` | Maximum results per source (stops + places). Range: `1`–`10`. |
| `lang` | string | No | — | BCP47 language tag for localized place names (e.g. `id`, `en`, `ko`, `ja`). |
| `bbox` | string | No | — | Bounding box to restrict the search area. Format: `minLng,minLat,maxLng,maxLat`. |
| `layers` | string | No | `poi,address,locality` | Comma-separated StadiaMaps v2 layers to filter geocoding results. |

---

## Proximity and Bounding Box Behavior

| Scenario | Result |
|---|---|
| Only `lat`/`lng` provided | Sets `focus.point` for proximity ranking + auto-generates a ±1° bounding box around the point as a regional scope. |
| `lat`/`lng` + explicit `bbox` | Sets `focus.point` from `lat`/`lng`, but uses the explicit `bbox` for the boundary rect (overrides auto-generation). |
| Only explicit `bbox` provided | Uses the `bbox` as the boundary rect. No proximity bias or focus point is set. |
| None provided | No spatial filtering or proximity bias. Results are global. |

---

## Layers Reference

Valid values for the `layers` parameter (StadiaMaps v2):

| Layer | Description |
|---|---|
| `poi` | Points of interest, businesses, venues, landmarks |
| `address` | Street addresses |
| `street` | Streets, roads, highways |
| `locality` | Cities, towns, hamlets |
| `neighbourhood` | Social communities and neighborhoods |
| `borough` | Boroughs (NYC, Mexico City, etc.) |
| `postalcode` | Postal / ZIP codes |
| `country` | Nations, nation-states |
| `region` | States and provinces |
| `county` | Official governmental subdivisions |
| `localadmin` | Local administrative boundaries |
| `macroregion` | Related group of regions (mostly Europe) |
| `macrocounty` | Related group of counties |
| `coarse` | Alias for all administrative layers (everything except `poi` and `address`) |

**Recommended for mobile transit apps:** `poi,address,locality`

---

## Response

### Success (200)

```json
{
  "success": true,
  "data": {
    "query": "bandung",
    "stops": [
      {
        "id": "uuid-...",
        "name": "Bandung Station",
        "latitude": -6.914,
        "longitude": 107.609,
        "type": "stop"
      }
    ],
    "places": [
      {
        "id": "place:openstreetmap:venue:12345",
        "name": "Gedung Sate",
        "address": "Bandung, Jawa Barat, Indonesia",
        "latitude": -6.902,
        "longitude": 107.618,
        "type": "poi",
        "provider": "stadiamaps"
      }
    ]
  },
  "meta": {
    "stopCount": 1,
    "placeCount": 1,
    "partial": false
  }
}
```

- `meta.partial: true` means one data source failed (stops or places), but results from the other are still returned.
- If both sources fail, a `500` error is returned.

### Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "All search sources are currently unavailable"
  }
}
```

---

## Examples

### Basic search

```bash
curl "https://api.example.com/api/v1/search?q=bandung"
```

### Search with proximity bias

```bash
curl "https://api.example.com/api/v1/search?q=stasiun&lat=-6.914&lng=107.609"
```

### Search with explicit bounding box (map viewport)

```bash
curl "https://api.example.com/api/v1/search?q=cafe&bbox=107.60,-6.93,107.63,-6.90"
```

### Search with proximity + custom bounding box

```bash
curl "https://api.example.com/api/v1/search?q=museum&lat=-6.20&lng=106.81&bbox=106.80,-6.28,106.85,-6.20"
```

### Search with custom layers (only addresses and localities)

```bash
curl "https://api.example.com/api/v1/search?q=merdeka&layers=address,locality"
```

### Search with language preference

```bash
curl "https://api.example.com/api/v1/search?q=jakarta&lang=id&layers=poi,address,locality"
```

### Search with bbox only (no proximity bias)

```bash
curl "https://api.example.com/api/v1/search?q=hotel&bbox=106.80,-6.28,106.85,-6.20&layers=poi,address"
```

---

## Plan Route API

### Endpoint

```
GET /api/v1/routing
```

Computes transit routes between two stops using a custom Dijkstra engine on a graph built from GTFS data. Returns up to 3 route options with transfer preference controls and alternative service information.

---

### Parameters

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `fromStopId` | string | No* | — | UUID of the origin stop. |
| `toStopId` | string | No* | — | UUID of the destination stop. |
| `fromStopName` | string | No* | — | Fuzzy-matched name of the origin stop (e.g. `Harmoni`). |
| `toStopName` | string | No* | — | Fuzzy-matched name of the destination stop (e.g. `Kota`). |
| `departureTimeSeconds` | integer | No | — | Departure time as seconds since midnight (triggers scheduled routing). If omitted, timeless (frequency-based) routing is used. Range: `0`–`86400`. |
| `transferPreference` | enum | No | `any` | Transfer walking preference: `any` (no preference) or `direct` (prefer same-station transfers, penalize walking between transfers). |

*Either `fromStopId`/`toStopId` **or** `fromStopName`/`toStopName` must be provided.

---

### Response

#### Success (200)

```json
{
  "data": {
    "fromStopId": "uuid-...",
    "toStopId": "uuid-...",
    "fromStopName": "Harmoni",
    "toStopName": "Kota",
    "warnings": [
      "No routes with same-station transfers found. Showing best available routes with walking transfers."
    ],
    "options": [
      {
        "strategy": "FASTEST",
        "totalDurationSeconds": 2400,
        "walkingDurationSeconds": 300,
        "waitingDurationSeconds": 180,
        "transferCount": 1,
        "legs": [
          {
            "type": "WALK",
            "fromStopId": "uuid-...",
            "toStopId": "uuid-...",
            "fromStopName": "Harmoni",
            "toStopName": "Harmoni BRT",
            "durationSeconds": 120,
            "distanceMeters": 85,
            "geometry": "v{lwJwkxvjE..."
          },
          {
            "type": "TRANSIT",
            "fromStopId": "uuid-...",
            "toStopId": "uuid-...",
            "fromStopName": "Harmoni BRT",
            "toStopName": "Kota Platform 1",
            "routeId": "uuid-...",
            "routeName": "5",
            "tripId": "uuid-...",
            "durationSeconds": 1800,
            "alternativeRoutes": [
              { "routeId": "uuid-...", "routeName": "5C" },
              { "routeId": "uuid-...", "routeName": "Jak 17" }
            ],
            "geometry": "q{xkArfuhjF..."
          },
          {
            "type": "TRANSFER",
            "fromStopId": "uuid-...",
            "toStopId": "uuid-...",
            "fromStopName": "Kota Platform 1",
            "toStopName": "Kota Platform 3",
            "durationSeconds": 0,
            "distanceMeters": 0
          },
          {
            "type": "TRANSIT",
            "fromStopId": "uuid-...",
            "toStopId": "uuid-...",
            "routeName": "2",
            "durationSeconds": 600
          },
          {
            "type": "WALK",
            "fromStopName": "Kota Platform 3",
            "toStopName": "Kota",
            "durationSeconds": 180,
            "distanceMeters": 130,
            "geometry": "s|loH{c|cjF..."
          }
        ]
      }
    ]
  },
  "meta": {
    "graphVersion": 18,
    "schemaVersion": 3,
    "builtAt": "2026-06-14T09:00:00.000Z",
    "source": "redis"
  }
}
```

#### Leg Types

| Type | Description |
|---|---|
| `WALK` | Walking segment between stops (access, egress, or walking transfer). Includes `distanceMeters` and polyline6 `geometry`. |
| `TRANSIT` | Transit vehicle segment. Includes `routeId`, `routeName`, `tripId`, and optionally `alternativeRoutes` (other routes serving the same stop-to-stop segment). |
| `TRANSFER` | Same-station platform change. Zero duration and distance. Only present when stops share a `parent_station_id` in the GTFS data. |

#### Route Strategies

| Strategy | Description |
|---|---|
| `FASTEST` | Optimizes for shortest total travel time. |
| `FEWER_TRANSITS` | Minimizes the number of transfers, tolerating longer walks. |
| `LESS_WALKING` | Avoids walking between transfers. Selected automatically when `transferPreference=direct`. Heavily penalizes WALK legs that occur between transit rides. |

#### Warnings

The `warnings` array provides advisories about the routing result:

| Warning | Trigger |
|---|---|
| `"No routes with same-station transfers found. Showing best available routes with walking transfers."` | `transferPreference=direct` was requested but all returned route options require at least one walking transfer between different stops. |

#### Alternative Routes

Each `TRANSIT` leg includes `alternativeRoutes` when other routes serve the same stop-to-stop segment. This enables the frontend to display labels like **"Bus 5 / 5C"** or **"Jak 16 / Jak 17"** without making additional API calls.

---

### Examples

#### Basic route search by stop name

```bash
curl "https://api.example.com/api/v1/routing?fromStopName=Harmoni&toStopName=Kota"
```

#### Route search with departure time (scheduled routing)

```bash
curl "https://api.example.com/api/v1/routing?fromStopId=uuid-a&toStopId=uuid-b&departureTimeSeconds=28800"
```

#### Prefer same-station transfers (no walking between transfers)

```bash
curl "https://api.example.com/api/v1/routing?fromStopName=Harmoni&toStopName=Kota&transferPreference=direct"
```
