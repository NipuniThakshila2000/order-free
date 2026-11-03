import tzlookup from 'tz-lookup';

const cache = new Map();
let nextRequestAt = 0;

export async function searchBirthplaces(query) {
  const place = String(query || '').trim();
  if (place.length < 3 || place.length > 120) throw new Error('Enter at least three characters for a birthplace.');
  const key = place.toLocaleLowerCase('en');
  if (cache.has(key)) return cache.get(key);
  const delay = Math.max(0, nextRequestAt - Date.now());
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  nextRequestAt = Date.now() + 1100;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', place);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');
  const response = await fetch(url, {
    headers: {'User-Agent':'AppointedSeasons/1.0 (+https://order-free.vercel.app/)', 'Referer':'https://order-free.vercel.app/', 'Accept-Language':'en'}
  });
  if (!response.ok) throw new Error('Birthplace lookup is unavailable. Please try again later.');
  const raw = await response.json();
  const results = raw.map((item) => {
    const latitude = Number(item.lat), longitude = Number(item.lon);
    return {id:String(item.place_id), label:String(item.display_name), latitude, longitude, timezone:tzlookup(latitude,longitude)};
  });
  cache.set(key, results);
  return results;
}
