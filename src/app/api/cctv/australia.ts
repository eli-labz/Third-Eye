import { CctvCamera } from "./types";

export async function fetchAustraliaCameras(): Promise<CctvCamera[]> {
    try {
        const res = await fetch('https://www.livetraffic.com/datajson/all-feeds-web.json', { signal: AbortSignal.timeout(12000) });
        if (!res.ok) return [];
        const data = await res.json();
        return (data || []).filter((event: { eventType: string; }) => event.eventType === 'liveCams').map((cam: { path: string; geometry: { coordinates: number[] }; properties: { title: string; region: string; href: string }; }) => {
            return {
                id: cam.path,
                lat: cam.geometry.coordinates[1],
                lng: cam.geometry.coordinates[0],
                name: cam.properties.title || 'Australia Camera',
                city: cam.properties.region || 'Australia',
                country: 'Australia',
                feed_url: cam.properties.href || '',
                source: 'Live Traffic',

            };
        }).filter((c: { lat: number; lng: number; }) => c.lat && c.lng);
    } catch { return []; }
}