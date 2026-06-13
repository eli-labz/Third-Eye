import type { CctvCamera } from './types';

const CZECHIA_CAMERAS: CctvCamera[] = [
  {
    id: 'cz-prague-1',
    lat: 50.0878, lng: 14.4205,
    name: 'Prague - Old Town Square', city: 'Prague', country: 'Czechia',
    stream_url: 'https://www.youtube.com/embed/IFnbDmgP69Q?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'cz-prague-2',
    lat: 50.0865, lng: 14.4114,
    name: 'Prague - Charles Bridge', city: 'Prague', country: 'Czechia',
    stream_url: 'https://www.youtube.com/embed/tmlE1ct0cYk?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'cz-prague-3',
    lat: 50.0900, lng: 14.4000,
    name: 'Prague - City View', city: 'Prague', country: 'Czechia',
    stream_url: 'https://www.youtube.com/embed/sspBOJIrNzU?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  }
];

export async function fetchCzechiaCameras(): Promise<CctvCamera[]> {
  return CZECHIA_CAMERAS;
}
