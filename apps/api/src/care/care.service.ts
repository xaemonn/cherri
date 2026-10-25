import { Inject, Injectable, Logger } from '@nestjs/common';
import { INDIA_CARE_RESOURCES, INDIA_HELPLINES, type CarePlace, type HelpResources, type NearbyCare } from '@cherri/shared';
import { ENV, type Env } from '../config/env';

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const WOMENS_HEALTH = /gyn|obstet|women|woman|matern|mother|nursing home|stree|mahila|ivf|fertility/i;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 200;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Nearby gynaecologists, hospitals and clinics from OpenStreetMap (free, no API key). */
@Injectable()
export class CareService {
  private readonly logger = new Logger(CareService.name);
  private readonly cache = new Map<string, { at: number; places: CarePlace[] }>();

  constructor(@Inject(ENV) private readonly env: Env) {}

  resources(): HelpResources {
    return { helplines: INDIA_HELPLINES, resources: INDIA_CARE_RESOURCES };
  }

  async nearby(lat: number, lng: number, radiusKm: number): Promise<NearbyCare> {
    // ~1 km cache granularity: also avoids keeping exact locations around.
    const key = `${lat.toFixed(2)},${lng.toFixed(2)},${radiusKm}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return { places: cached.places, source: 'OpenStreetMap', degraded: false, ...this.resources() };

    try {
      const places = await this.query(lat, lng, radiusKm);
      if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, { at: Date.now(), places });
      return { places, source: 'OpenStreetMap', degraded: false, ...this.resources() };
    } catch (error) {
      this.logger.warn(`Overpass lookup failed: ${error instanceof Error ? error.message : error}`);
      return { places: [], source: 'OpenStreetMap', degraded: true, ...this.resources() };
    }
  }

  private async query(lat: number, lng: number, radiusKm: number): Promise<CarePlace[]> {
    const around = `around:${Math.round(radiusKm * 1000)},${lat},${lng}`;
    const query = `[out:json][timeout:12];
(
  nwr(${around})["healthcare:speciality"~"gynaecology|obstetrics",i];
  nwr(${around})["amenity"~"^(hospital|clinic|doctors)$"];
);
out center tags 80;`;

    const response = await fetch(this.env.OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Cherri/0.1 (women-health hackathon app)' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Overpass responded ${response.status}`);
    const { elements = [] } = (await response.json()) as { elements?: OverpassElement[] };

    const seen = new Set<string>();
    const places: CarePlace[] = [];
    for (const el of elements) {
      const tags = el.tags ?? {};
      const pLat = el.lat ?? el.center?.lat;
      const pLng = el.lon ?? el.center?.lon;
      if (!tags.name || pLat === undefined || pLng === undefined || seen.has(tags.name)) continue;
      seen.add(tags.name);

      const speciality = tags['healthcare:speciality'] ?? '';
      const kind: CarePlace['kind'] =
        /gynaecology|obstetrics/i.test(speciality) || WOMENS_HEALTH.test(tags.name) ? 'GYNAECOLOGY' : tags.amenity === 'hospital' ? 'HOSPITAL' : 'CLINIC';
      const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ');
      places.push({
        name: tags.name,
        kind,
        lat: pLat,
        lng: pLng,
        distanceKm: Math.round(haversineKm(lat, lng, pLat, pLng) * 10) / 10,
        address: address || null,
        phone: tags.phone ?? tags['contact:phone'] ?? null,
        website: tags.website ?? tags['contact:website'] ?? null,
        mapUrl: `https://www.openstreetmap.org/?mlat=${pLat}&mlon=${pLng}#map=17/${pLat}/${pLng}`,
      });
    }

    const rank = { GYNAECOLOGY: 0, HOSPITAL: 1, CLINIC: 2 } as const;
    return places.sort((a, b) => rank[a.kind] - rank[b.kind] || a.distanceKm - b.distanceKm).slice(0, 25);
  }
}
