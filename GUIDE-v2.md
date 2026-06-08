  # GUIDE v2 — Places API

  ## Overview

  All endpoints use Stadia Maps v2 with `layers=poi`. Responses are wrapped as
  `{ success, data, meta }` by the global interceptor. No database persistence.

  ---

  ## Endpoints

### `GET /places/search`

Search places/POIs globally or within a bounding box.

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | *(required)* | Search query text |
| `bbox` | string | — | Limit to area: `"minLng,minLat,maxLng,maxLat"` |
| `lat` | number | — | Focus point latitude for proximity bias |
| `lng` | number | — | Focus point longitude for proximity bias |
| `limit` | number | 20 | Max results (1–50) |
| `lang` | string | — | BCP47 language tag (e.g. `id`, `en`) |

```
GET /places/search?q=kopi&bbox=106.80,-6.28,106.85,-6.20&limit=10
```

  **Response 200:**

  ```json
  {
    "success": true,
    "data": [ ...ExplorePlaceItem ],
    "meta": { "query": "monas", "count": 5 }
  }
  ```

  ---

  ### `GET /places/explore`

  Explore POIs within a bounding box (current map area).

  | Param | Type | Default | Description |
  |---|---|---|---|
  | `bbox` | string | *(required)* | `"minLng,minLat,maxLng,maxLat"` |
  | `category` | string | `"place"` | food, coffee, shopping, parks, attractions, hotels, etc. |
  | `limit` | number | 20 | Max results (1–50) |

  ```
  GET /places/explore?bbox=106.80,-6.28,106.85,-6.20&category=coffee&limit=10
  ```

  **Response 200:**

  ```json
  {
    "success": true,
    "data": [ ...ExplorePlaceItem ],
    "meta": { "bbox": "106.80,-6.28,106.85,-6.20", "count": 3 }
  }
  ```

  ---

### `GET /places/detail`

Get a single place by Stadia Maps GID with nearest transit stop enrichment.

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Stadia Maps GID (e.g. `openstreetmap:venue:way/123`) |

```
GET /places/detail?id=openstreetmap:venue:way/123
```

  **Response 200 (with nearest stop):**

  ```json
  {
    "success": true,
  "data": {
    "id": "openstreetmap:venue:way/123",
    "source": "openstreetmap",
    "name": "Kota Tua Jakarta",
    "address": "Jl. Taman Fatahillah No.1, Jakarta Barat",
    "lat": -6.1352,
    "lng": 106.8133,
      "nearestStop": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Halte Kota Tua",
        "distanceMeters": 87.5
      },
      "actions": {
        "canRoute": true
      }
    }
  }
  ```

  **When no transit stop is found within 1000m:**

  ```json
  {
    "...": "...",
    "nearestStop": null,
    "actions": { "canRoute": false }
  }
  ```

  ---

  ### `GET /places/reverse`

  Reverse geocode coordinates to an address.

  | Param | Type | Required | Description |
  |---|---|---|---|
  | `lat` | number | yes | Latitude (-90 to 90) |
  | `lng` | number | yes | Longitude (-180 to 180) |

  ```
  GET /places/reverse?lat=-6.2&lng=106.8
  ```

  ---

  ## Response Shapes

  ### ExplorePlaceItem

  Used by `search`, `explore`, and as the base of `detail`.

| Field | Type | Description |
|---|---|---|
| `id` | string | Stadia Maps GID |
| `source` | string | Data source (`openstreetmap`, `foursquare`, etc.) |
| `name` | string | Place name |
| `address` | string | Locally formatted address |
| `lat` | number | Latitude |
| `lng` | number | Longitude |

  ### PlaceDetailResponse

  Extends ExplorePlaceItem with nearest stop enrichment.

  | Field | Type | Description |
  |---|---|---|
  | `nearestStop` | object\|null | Nearest transit stop within 1000m |
  | `nearestStop.id` | string | Stop UUID |
  | `nearestStop.name` | string | Stop name |
  | `nearestStop.distanceMeters` |  number | Distance in meters |
  | `actions.canRoute` | boolean | `true` when nearestStop found, `false` otherwise |
