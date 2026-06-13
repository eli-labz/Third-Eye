import type { CctvCamera } from './types';

const FRANCE_CAMERAS: CctvCamera[] = [
  {
    id: 'fr-paris-1',
    lat: 48.8584, lng: 2.2945,
    name: 'Paris - Eiffel Tower Area', city: 'Paris', country: 'France',
    stream_url: 'https://www.youtube.com/embed/UMuEooW0iAQ?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'fr-paris-2',
    lat: 48.8600, lng: 2.3300,
    name: 'Paris - Louvre Area', city: 'Paris', country: 'France',
    stream_url: 'https://www.youtube.com/embed/OzYp4NRZlwQ?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'fr-nice-1',
    lat: 43.6961, lng: 7.2717,
    name: 'Nice - Promenade des Anglais', city: 'Nice', country: 'France',
    stream_url: 'https://www.youtube.com/embed/YAdNYoRY0Cw?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'fr-nice-2',
    lat: 43.7000, lng: 7.2600,
    name: 'Nice - City View', city: 'Nice', country: 'France',
    stream_url: 'https://www.youtube.com/embed/asO_10T0k2k?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  }
];

export async function fetchFranceCameras(): Promise<CctvCamera[]> {
  return FRANCE_CAMERAS;
}
