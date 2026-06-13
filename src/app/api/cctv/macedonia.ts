import type { CctvCamera } from './types';

const MACEDONIA_CAMERAS: CctvCamera[] = [
  {
    id: 'mk-deve-bair',
    lat: 42.149, lng: 22.537,
    name: 'Deve Bair – Gyueshevo Border', city: 'Deve Bair', country: 'North Macedonia',
    stream_url: 'https://streaming1.neotel.net.mk/stream/deve_bair.m3u8',
    stream_type: 'hls',
    source: 'Neotel / GKPP',
  },
  {
    id: 'mk-tabanovce',
    lat: 42.232, lng: 21.718,
    name: 'Tabanovce – Preševo Border', city: 'Tabanovce', country: 'North Macedonia',
    stream_url: 'https://streaming1.neotel.net.mk/stream/tabanovce.m3u8',
    stream_type: 'hls',
    source: 'Neotel / GKPP',
  },
];

export async function fetchMacedoniaCameras(): Promise<CctvCamera[]> {
  return MACEDONIA_CAMERAS.filter((cam) => cam.feed_url || cam.stream_url || cam.external_url);
}
