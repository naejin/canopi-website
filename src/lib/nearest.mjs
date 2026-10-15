// Distances for the design finder: which featured designs are nearest a point.

// Great-circle distance in kilometres between two { lon, lat } points.
export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Designs nearest a point first; without a point, in the order given.
export function nearestFirst(designs, point) {
  if (!point) return [...designs];
  return designs.map((d) => [distanceKm(point, d.pin), d]).sort((a, b) => a[0] - b[0]).map(([, d]) => d);
}
