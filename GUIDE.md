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
