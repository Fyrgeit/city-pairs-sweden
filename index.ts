import type { FeatureCollection, MultiPolygon, Position } from 'geojson';

function avgCoords(cs: Position[]): [number, number] {
    let lat = cs.reduce((sum, val) => sum + val[0], 0) / cs.length;
    let lon = cs.reduce((sum, val) => sum + val[1], 0) / cs.length;
    return [lon, lat];
}

function haversine(a: [number, number], b: [number, number]): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // Earth's radius in km
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const d = 2 * R * Math.asin(Math.sqrt(h));
    return d;
}

async function getPairs(event: SubmitEvent) {
    let settingsRaw = (event.target! as HTMLFormElement).elements;

    let settings = {
        count: (settingsRaw.namedItem('count') as HTMLInputElement)
            .valueAsNumber,
        exponent: (settingsRaw.namedItem('exponent') as HTMLInputElement)
            .valueAsNumber,
    };

    let output = document.getElementById('output');
    if (output) {
        output.innerText = '';
    } else {
        console.error('No output element');
        return;
    }

    // The whole Tatorter_2023.json is too large for GitHub, so use the cleaned version instead
    /* 
    const oldResponse = await fetch('Tatorter_2023.json');
    const townsRaw = (await oldResponse.json())
        .features as FeatureCollection['features'];

    let towns = townsRaw.map((i) => ({
        name: i.properties!.tatort,
        pop: i.properties!.bef,
        coords: avgCoords((i.geometry as MultiPolygon).coordinates[0][0]),
    }));

    let bigNsorted = towns.sort((a, b) => b.pop - a.pop); */

    const response = await fetch('Tätorter 2023 clean.json');
    const newTowns = (await response.json()) as {
        name: string;
        pop: number;
        coords: [number, number];
    }[];

    output.innerText += newTowns.length + ' tätorter\n';

    let combos = [];

    for (let i = 0; i < newTowns.length; i++) {
        for (let j = i + 1; j < newTowns.length; j++) {
            combos.push({ a: newTowns[i], b: newTowns[j] });
        }
    }

    output.innerText += combos.length + ' parkombinationer\n';

    combos = combos.map((c) => {
        let dist = haversine(c.a.coords, c.b.coords);
        let gravity = (c.a.pop * c.b.pop) / (dist * 1000) ** settings.exponent;
        return {
            ...c,
            dist: dist,
            score: gravity,
        };
    });

    function format(n: number): string {
        return n.toLocaleString('en-US').replace(/,/g, ' ');
    }

    let simple = combos
        .sort((a, b) => b.score - a.score)
        .map((c, i) => ({
            rank: i + 1,
            a: c.a.name,
            b: c.b.name,
            score: c.score,
            dist: c.dist,
        }))
        .splice(0, settings.count);

    let table = document.createElement('table');

    let header = document.createElement('tr');

    let rankHeader = document.createElement('th');
    rankHeader.innerText = '#';
    header.appendChild(rankHeader);

    let aHeader = document.createElement('th');
    aHeader.innerText = 'Större tätort';
    header.appendChild(aHeader);

    let bHeader = document.createElement('th');
    bHeader.innerText = 'Mindre tätort';
    header.appendChild(bHeader);

    let scoreHeader = document.createElement('th');
    scoreHeader.innerText = 'Poäng';
    header.appendChild(scoreHeader);

    let distHeader = document.createElement('th');
    distHeader.innerText = 'Avstånd';
    header.appendChild(distHeader);

    table.appendChild(header);

    simple.forEach((s) => {
        let row = document.createElement('tr');

        let rankEl = document.createElement('th');
        rankEl.innerText = s.rank.toString();
        row.appendChild(rankEl);

        let aEl = document.createElement('td');
        aEl.innerText = s.a.toString();
        row.appendChild(aEl);

        let bEl = document.createElement('td');
        bEl.innerText = s.b.toString();
        row.appendChild(bEl);

        let scoreEl = document.createElement('td');
        scoreEl.innerText = format(Number(s.score.toPrecision(3)));
        row.appendChild(scoreEl);

        let distEl = document.createElement('td');
        distEl.innerText = format(Number(s.dist.toFixed(0))) + ' km';
        row.appendChild(distEl);

        table.appendChild(row);
    });

    output.appendChild(table);
}

(window as any).getPairs = getPairs;
