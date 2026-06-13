const fs = require('fs');

const features = [];
let cableCount = 0;

function addCable(path, noiseLevel, widthScale = 1.0) {
  const points = [];
  for (let i = 0; i < path.length; i++) {
    const [lng, lat] = path[i];
    const nLng = lng + (Math.random() * noiseLevel * 2 - noiseLevel);
    const nLat = lat + (Math.random() * noiseLevel * 2 - noiseLevel);
    points.push([nLng, nLat]);
  }
  
  features.push({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: points },
    properties: {
      domain: 'CABLE',
      color: '#4FC3F7',
      widthScale
    }
  });
  cableCount++;
}

// 1. Trans-Atlantic (Huge bundle)
const transAtlantic = [ [-74.0, 40.7], [-40.0, 45.0], [-10.0, 50.0], [-5.0, 50.5] ];
for(let i=0; i<400; i++) addCable(transAtlantic, 4.0, Math.random() + 0.5);

// 2. Trans-Atlantic South
const transAtlanticSouth = [ [-43.2, -22.9], [-20.0, -10.0], [-10.0, 10.0], [-9.0, 38.7] ];
for(let i=0; i<150; i++) addCable(transAtlanticSouth, 3.5, Math.random() + 0.5);

// 3. Europe to Asia via Med/Red Sea (Massive trunk)
const eurAsia = [
  [-5.0, 50.5], [-9.0, 38.7], [-5.3, 36.1], [3.0, 37.0], 
  [15.0, 35.0], [25.0, 33.0], [32.3, 31.2], [33.0, 27.0], 
  [38.0, 21.0], [43.0, 12.0], [53.0, 12.0], [60.0, 15.0], 
  [72.8, 18.9]
];
for(let i=0; i<500; i++) addCable(eurAsia, 2.5, Math.random() * 1.5 + 0.5);

// 4. Africa West Coast
const africaWest = [
  [-9.0, 38.7], [-15.0, 20.0], [-16.0, 10.0], [-5.0, 0.0], 
  [5.0, -5.0], [10.0, -15.0], [15.0, -30.0], [18.4, -33.9]
];
for(let i=0; i<250; i++) addCable(africaWest, 2.0, Math.random() + 0.2);

// 5. Africa East Coast
const africaEast = [
  [43.0, 12.0], [50.0, 5.0], [40.0, -5.0], [40.0, -15.0], 
  [35.0, -25.0], [18.4, -33.9]
];
for(let i=0; i<200; i++) addCable(africaEast, 2.5, Math.random() + 0.5);

// 6. Asia to Australia
const asiaAus = [
  [72.8, 18.9], [80.0, 5.0], [95.0, 0.0], [103.8, 1.2], 
  [115.0, -5.0], [130.0, -10.0], [151.2, -33.8]
];
for(let i=0; i<300; i++) addCable(asiaAus, 3.5, Math.random() + 0.5);

// 7. Trans-Pacific (Massive)
const transPacific = [
  [151.2, -33.8], [170.0, -20.0], [-150.0, 0.0], [-122.4, 37.7]
];
for(let i=0; i<350; i++) addCable(transPacific, 6.0, Math.random() * 1.5 + 0.5);

// 8. US West Coast to Asia
const usAsia = [
  [-122.4, 37.7], [-160.0, 45.0], [160.0, 40.0], [139.6, 35.6] // Tokyo
];
for(let i=0; i<250; i++) addCable(usAsia, 5.0, Math.random() + 0.5);

fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/submarine-cables.json', JSON.stringify({
  type: 'FeatureCollection',
  features
}));

console.log(`Generated ${cableCount} submarine cables`);
