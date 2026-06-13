import type { CctvCamera } from './types';

const ITALY_CAMERAS: CctvCamera[] = [
  {
    id: 'it-rome-1',
    lat: 41.8902, lng: 12.4922,
    name: 'Rome - Colosseum Area', city: 'Rome', country: 'Italy',
    stream_url: 'https://www.youtube.com/embed/89d3tEaqImM?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'it-milan-1',
    lat: 45.4642, lng: 9.1900,
    name: 'Milan - Duomo Area', city: 'Milan', country: 'Italy',
    stream_url: 'https://www.youtube.com/embed/dsoM6TYIkOI?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },

  {
    id: 'it-venice-1',
    lat: 45.4343, lng: 12.3388,
    name: 'Venice - Grand Canal', city: 'Venice', country: 'Italy',
    stream_url: 'https://www.youtube.com/embed/mt7uE-n0YPI?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0',
    stream_type: 'iframe',
    source: 'YouTube Live',
  },
  {
    id: 'it-naples-1',
    lat: 40.8518, lng: 14.2681,
    name: 'Naples - City View', city: 'Naples', country: 'Italy',
    stream_url: 'https://www.youtube.com/embed/LO2Fvujwc8M?autoplay=1&mute=1',
    stream_type: 'iframe',
    source: 'YouTube Live',
  }
];

export async function fetchItalyCameras(): Promise<CctvCamera[]> {
  return ITALY_CAMERAS;
}
