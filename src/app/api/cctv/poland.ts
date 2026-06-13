import type { CctvCamera } from './types';

const POLAND_CAMERAS: CctvCamera[] = [
  {
    id: 'pl-gdansk-1',
    lat: 54.3520, lng: 18.6466,
    name: 'Gdansk - City View', city: 'Gdansk', country: 'Poland',
    stream_url: 'https://www.youtube.com/embed/NZ_ZiHAx8Ic?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  }
];

export async function fetchPolandCameras(): Promise<CctvCamera[]> {
  return POLAND_CAMERAS;
}
