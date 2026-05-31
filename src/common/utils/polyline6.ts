export function decodePolyline6(encoded: string): number[][] {
  const coordinates: number[][] = [];
  let lat = 0;
  let lon = 0;
  let i = 0;

  while (i < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLon = result & 1 ? ~(result >> 1) : result >> 1;

    lat += deltaLat;
    lon += deltaLon;
    coordinates.push([lon / 1e6, lat / 1e6]);
  }

  return coordinates;
}

export function encodePolyline6(coordinates: number[][]): string {
  if (!coordinates.length) return '';

  let lastLat = 0;
  let lastLon = 0;
  let result = '';

  for (const [lon, lat] of coordinates) {
    const latInt = Math.round(lat * 1e6);
    const lonInt = Math.round(lon * 1e6);
    result += encodeValue(latInt - lastLat);
    result += encodeValue(lonInt - lastLon);
    lastLat = latInt;
    lastLon = lonInt;
  }

  return result;
}

function encodeValue(val: number): string {
  let v = val;
  v = v < 0 ? ~(v << 1) : v << 1;
  let s = '';
  while (v >= 0x20) {
    s += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  s += String.fromCharCode(v + 63);
  return s;
}
