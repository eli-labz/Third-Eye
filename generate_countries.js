const fs = require('fs');

async function run() {
    const res = await fetch('https://restcountries.com/v3.1/all');
    const data = await res.json();
    
    const COUNTRY_DATA = {};
    for (const country of data) {
        if (!country.idd || !country.idd.root) continue;
        const root = country.idd.root.replace('+', '');
        const suffixes = country.idd.suffixes || [''];
        
        for (const suffix of suffixes) {
            const code = root + suffix;
            if (!COUNTRY_DATA[code] && country.latlng && country.latlng.length === 2) {
                COUNTRY_DATA[code] = {
                    name: country.name.common,
                    lat: country.latlng[0],
                    lng: country.latlng[1]
                };
            }
        }
    }
    
    COUNTRY_DATA['1'] = { name: 'United States / Canada', lat: 39.8283, lng: -98.5795 };
    
    const out = `const COUNTRY_DATA: Record<string, { name: string, lat: number, lng: number }> = ${JSON.stringify(COUNTRY_DATA, null, 2)};`;
    fs.writeFileSync('country_data.ts', out);
    console.log("Generated " + Object.keys(COUNTRY_DATA).length + " countries.");
}
run();
