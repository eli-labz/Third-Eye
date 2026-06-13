import type { CctvCamera } from './types';

const SERBIA_CAMERAS: CctvCamera[] = [
  {
    id: 'rs-belgrade-live',
    lat: 44.817, lng: 20.456,
    name: 'Belgrade Live Cam', city: 'Belgrade', country: 'Serbia',
    feed_url: 'https://stream.uzivobeograd.rs/live/cam_7.jpg',
    source: 'Uzivo Beograd',
  },
  {
    id: 'rs-kalotina-gradina-1',
    lat: 42.997, lng: 22.882,
    name: 'Kalotina – Gradina Border (lane 1)', city: 'Gradina', country: 'Serbia',
    stream_url: 'https://kamere.amss.org.rs/gradina1/gradina1.m3u8',
    stream_type: 'hls',
    source: 'AMSS / GKPP',
  },
];

export async function fetchSerbiaCameras(): Promise<CctvCamera[]> {
  return SERBIA_CAMERAS.filter((cam) => cam.feed_url || cam.stream_url || cam.external_url);
}
