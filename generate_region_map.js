const fs = require('fs');

async function run() {
    const res = await fetch('https://restcountries.com/v3.1/all');
    const data = await res.json();
    
    const map = {};
    for (const country of data) {
        if (country.cca2 && country.latlng && country.latlng.length === 2) {
            map[country.cca2] = {
                name: country.name.common,
                lat: country.latlng[0],
                lng: country.latlng[1]
            };
        }
    }

    fs.writeFileSync('region_map.json', JSON.stringify(map, null, 2));
    console.log('Done mapping ' + Object.keys(map).length + ' regions.');
}
run();
