import type { CctvCamera } from './types';

const ROMANIA_CAMERAS: CctvCamera[] = [
  {
    id: 'ro-bucharest',
    lat: 44.426, lng: 26.102,
    name: 'Bucharest Panorama', city: 'Bucharest', country: 'Romania',
    feed_url: 'https://home-solutions.bg/cams/bukor.jpg',
    source: 'home-solutions.bg',
  },
];

export async function fetchRomaniaCameras(): Promise<CctvCamera[]> {
  return ROMANIA_CAMERAS.filter((cam) => cam.feed_url || cam.stream_url || cam.external_url);
}
