import type { CctvCamera } from './types';

const JAPAN_CAMERAS: CctvCamera[] = [
  {
    id: 'jp-shibuya-crossing',
    lat: 35.6595, lng: 139.7005,
    name: 'Shibuya Scramble Crossing',
    city: 'Tokyo', country: 'Japan',
    stream_url: 'https://www.youtube.com/embed/HpdO5Kq3o7Y?autoplay=1&mute=1',
    stream_type: 'iframe',
    source: 'ANN News / YouTube',
  },
  {
    id: 'jp-tokyo-tower',
    lat: 35.6586, lng: 139.7454,
    name: 'Tokyo Tower Live Cam',
    city: 'Tokyo', country: 'Japan',
    stream_url: 'https://www.youtube.com/embed/cbJ03Xk_eLQ?autoplay=1&mute=1',
    stream_type: 'iframe',
    source: 'YouTube',
  },
  {
    id: 'jp-mt-fuji',
    lat: 35.3606, lng: 138.7274,
    name: 'Mt. Fuji Live',
    city: 'Shizuoka/Yamanashi', country: 'Japan',
    stream_url: 'https://www.youtube.com/embed/5aLh8R2HqOQ?autoplay=1&mute=1',
    stream_type: 'iframe',
    source: 'YouTube',
  },
  {
    id: 'jp-osaka-dotonbori',
    lat: 34.6687, lng: 135.5013,
    name: 'Dotonbori Live Cam',
    city: 'Osaka', country: 'Japan',
    stream_url: 'https://www.youtube.com/embed/m6J9w94oBXY?autoplay=1&mute=1',
    stream_type: 'iframe',
    source: 'YouTube',
  }
];

export async function fetchJapanCameras(): Promise<CctvCamera[]> {
  // Static cameras don't need a fetch, we just return them wrapped in a Promise
  return JAPAN_CAMERAS;
}
