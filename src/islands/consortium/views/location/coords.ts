// Coordinates typed into the place field (board LocStates "Coordinates typed", owner Q6): read on this
// device, never sent. Pure, so scripts/consortium-pf-c.test.mjs reads it in node.
//
// readCoords(text):
// - { lat, lon }: decimal degrees with a comma or semicolon between them ("-1.17, 36.83", "−1.17; 36.83"),
//   degrees with hemisphere letters, before or after ("1.17° S 36.83° E", "S 1.17 E 36.83"), degrees
//   minutes seconds ("1°10′S 36°50′E", "1°10'12\"S, 36°49'48\"E"), or a pasted map link
//   (openstreetmap.org #map=z/lat/lon or mlat=…&mlon=…, Google Maps @lat,lon or q=lat,lon, geo:lat,lon);
// - 'bad': it looks like coordinates (only digits, signs, degree marks and N S E W, or a link) but is
//   not understood, or lies out of range (board: "We could not read “1.17 36” as coordinates");
//   two bare numbers with only a space between them are not read: which one is the latitude is a guess;
// - null: words, a place name to look up.
interface Coords { lat: number; lon: number }
export type CoordsRead = Coords | 'bad' | null;

const inRange = (c: Coords): CoordsRead => (Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180 ? c : 'bad');
const NUM = String.raw`[+-]?\d+(?:[.,]\d+)?`;

function fromLink(text: string): CoordsRead {
  let url: URL;
  try { url = new URL(text); } catch { return 'bad'; }
  if (url.protocol === 'geo:') {
    const m = /^([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/.exec(url.pathname);
    return m ? inRange({ lat: Number(m[1]), lon: Number(m[2]) }) : 'bad';
  }
  const pair = (a: string | null | undefined, b: string | null | undefined): CoordsRead => (a && b && Number.isFinite(Number(a)) && Number.isFinite(Number(b)) ? inRange({ lat: Number(a), lon: Number(b) }) : null);
  const osm = /map=\d+(?:\.\d+)?\/([+-]?\d+(?:\.\d+)?)\/([+-]?\d+(?:\.\d+)?)/.exec(url.hash + url.search);
  const found = pair(url.searchParams.get('mlat'), url.searchParams.get('mlon'))
    ?? (osm ? pair(osm[1], osm[2]) : null)
    ?? (() => { const m = /@([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/.exec(url.pathname); return m ? pair(m[1], m[2]) : null; })()
    ?? (() => { const q = url.searchParams.get('q') ?? url.searchParams.get('ll') ?? url.searchParams.get('query'); const m = q ? /^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*$/.exec(q) : null; return m ? pair(m[1], m[2]) : null; })();
  return found ?? 'bad';
}

// One axis with its hemisphere letter: "36°50′E", "S 1.17", "1 10 12 S".
function axis(part: string): { value: number; dir: string } | null {
  const m = new RegExp(String.raw`^([NSEW])?\s*(\d+(?:\.\d+)?)\s*°?\s*(?:(\d+(?:\.\d+)?)\s*['′’]?\s*(?:(\d+(?:\.\d+)?)\s*(?:["″”]|'')?)?)?\s*([NSEW])?$`, 'i').exec(part.trim());
  if (!m) return null;
  const dir = (m[1] ?? m[5] ?? '').toUpperCase();
  if (!dir || (m[1] && m[5])) return null;
  const min = m[3] ? Number(m[3]) : 0, sec = m[4] ? Number(m[4]) : 0;
  if (min >= 60 || sec >= 60) return null;
  return { value: Number(m[2]) + min / 60 + sec / 3600, dir };
}

export function readCoords(input: string): CoordsRead {
  const text = input.trim().replace(/[−–]/g, '-');
  if (!text) return null;
  if (/^(?:https?:\/\/|geo:)/i.test(text)) return fromLink(text);
  if (!/^[\d\s.,;:°'′’"″”+\-NSEWnsew]+$/.test(text) || !/\d/.test(text)) return null;
  // Words that are only N S E W letters are not coordinates (a digit is required above).
  // Decimal pair with a comma or semicolon (a decimal comma only with a semicolon between the two).
  const plain = new RegExp(String.raw`^(${NUM})\s*;\s*(${NUM})$`).exec(text) ?? /^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/.exec(text);
  if (plain) return inRange({ lat: Number(plain[1].replace(',', '.')), lon: Number(plain[2].replace(',', '.')) });
  if (/[NSEW]/i.test(text)) {
    // Split into two axes: at a comma or semicolon, else after the first hemisphere letter that ends one.
    const split = text.split(/\s*[,;]\s*/);
    let parts: string[] = split.length === 2 ? split : [];
    if (!parts.length) {
      const m = /^(.*?[NSns])\s*([EWew].*|\d.*[EWew])$/.exec(text) ?? /^([NSns].*?)\s+([EWew].*)$/.exec(text);
      if (m) parts = [m[1], m[2]];
    }
    const [a, b] = parts.map(axis);
    if (!a || !b) return 'bad';
    const lat = /[NS]/.test(a.dir) ? a : /[NS]/.test(b.dir) ? b : null, lon = lat === a ? b : a;
    if (!lat || !/[EW]/.test(lon.dir)) return 'bad';
    return inRange({ lat: lat.dir === 'S' ? -lat.value : lat.value, lon: lon.dir === 'W' ? -lon.value : lon.value });
  }
  return 'bad';
}
