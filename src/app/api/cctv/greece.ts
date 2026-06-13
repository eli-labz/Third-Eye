import type { CctvCamera } from './types';

const ATTiki_ODOS_CAMERAS = [
  { alias: 'cam128', name: 'I/C D. Plakentias', city: 'Athens', lat: 38.0208, lng: 23.8578 },
  { alias: 'cam231', name: 'I/C Papagou', city: 'Athens', lat: 37.9906, lng: 23.7947 },
];

export async function fetchGreeceCameras(): Promise<CctvCamera[]> {
  // Using IPCamLive's web player as an iframe stream bypasses the need for API secrets
  // that were failing for raw HLS/snapshot extraction.
  return ATTiki_ODOS_CAMERAS.map(cam => ({
    id: `gr-aodos-${cam.alias}`,
    lat: cam.lat, 
    lng: cam.lng,
    name: cam.name, 
    city: cam.city, 
    country: 'Greece',
    stream_url: `https://ipcamlive.com/player/player.php?alias=${cam.alias}&autoplay=1`,
    stream_type: 'iframe',
    feed_url: `https://ipcamlive.com/player/player.php?alias=${cam.alias}&autoplay=1`,
    source: 'Attiki Odos',
  }));
}
