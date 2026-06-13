import type { CctvCamera } from './types';

const SPAIN_CAMERAS: CctvCamera[] = [
  {
    id: 'es-barcelona-2',
    lat: 41.3800, lng: 2.1800,
    name: 'Barcelona - Beach Area', city: 'Barcelona', country: 'Spain',
    stream_url: 'https://www.youtube.com/embed/4DjwrvoTKwk?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'es-madrid-1',
    lat: 40.4168, lng: -3.7038,
    name: 'Madrid - Puerta del Sol', city: 'Madrid', country: 'Spain',
    stream_url: 'https://www.youtube.com/embed/4CaHlfpGlAI?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'es-madrid-2',
    lat: 40.4200, lng: -3.7000,
    name: 'Madrid - Gran Via', city: 'Madrid', country: 'Spain',
    stream_url: 'https://www.youtube.com/embed/LSPN10FbR3U?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  }
];

export async function fetchSpainCameras(): Promise<CctvCamera[]> {
  return SPAIN_CAMERAS;
}
