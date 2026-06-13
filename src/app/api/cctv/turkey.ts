import type { CctvCamera } from './types';

const TURKEY_CAMERAS: CctvCamera[] = [];

export async function fetchTurkeyCameras(): Promise<CctvCamera[]> {
  return TURKEY_CAMERAS;
}

export default TURKEY_CAMERAS;
