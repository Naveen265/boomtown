import type { Tile } from './types.js';

// ── Original 40-tile board (city "boomtown" growth theme) ──────────────────
// Mechanics follow the classic escalating curve; every name + number is ours.

interface PropSeed {
  id: number;
  name: string;
  groupId: string;
  price: number;
  rent: [number, number, number, number, number, number];
  houseCost: number;
}

const props: PropSeed[] = [
  // Tannery Row (2)
  { id: 1, name: 'Mudflat Lane', groupId: 'tannery', price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50 },
  { id: 3, name: 'Tannery Row', groupId: 'tannery', price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50 },
  // Old Kiln Quarter (3)
  { id: 6, name: 'Cinder Alley', groupId: 'kiln', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
  { id: 8, name: "Brickmaker's Walk", groupId: 'kiln', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
  { id: 9, name: 'Old Kiln Court', groupId: 'kiln', price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50 },
  // Founders Crossing (3)
  { id: 11, name: 'Granary Square', groupId: 'founders', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
  { id: 13, name: 'Millwright Way', groupId: 'founders', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
  { id: 14, name: 'Founders Crossing', groupId: 'founders', price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100 },
  // Lakeside Mile (3)
  { id: 16, name: 'Harbor Steps', groupId: 'lakeside', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
  { id: 18, name: "Ferryman's Reach", groupId: 'lakeside', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
  { id: 19, name: 'Lakeside Mile', groupId: 'lakeside', price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100 },
  // Lantern District (3)
  { id: 21, name: 'Coppersmith Bend', groupId: 'lantern', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
  { id: 23, name: 'Lantern Walk', groupId: 'lantern', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
  { id: 24, name: 'Gaslight Promenade', groupId: 'lantern', price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150 },
  // Meridian Heights (3)
  { id: 26, name: 'Sunset Terrace', groupId: 'meridian', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
  { id: 27, name: 'Goldleaf Avenue', groupId: 'meridian', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
  { id: 29, name: 'Meridian Heights', groupId: 'meridian', price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150 },
  // Glass Tower District (3)
  { id: 31, name: 'Atrium Court', groupId: 'glass', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
  { id: 32, name: 'Emerald Spire', groupId: 'glass', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
  { id: 34, name: 'Glass Tower Plaza', groupId: 'glass', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200 },
  // Skyline Crown (2)
  { id: 37, name: 'Observatory Row', groupId: 'skyline', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200 },
  { id: 39, name: 'Skyline Crown', groupId: 'skyline', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200 },
];

const transportNames: Record<number, string> = {
  5: 'North Depot',
  15: 'River Ferry',
  25: 'Sky Tram',
  35: 'Freight Yard',
};

const utilityNames: Record<number, string> = {
  12: 'Reservoir Authority',
  28: 'Spark Co.',
};

// Curated short labels for the board, for names that can't sit comfortably on a
// small tile. The full `name` is always used in the tile detail modal.
const SHORT_NAMES: Record<string, string> = {
  "Brickmaker's Walk": 'Brickmkr Walk',
  'Glass Tower Plaza': 'Glass Tower',
  'Reservoir Authority': 'Reservoir',
  'Off to the Cell': 'To the Cell',
  'Coppersmith Bend': 'Copper Bend',
  'Observatory Row': 'Observ. Row',
  "Ferryman's Reach": 'Ferryman Reach',
  'Millwright Way': 'Mill Way',
};

export function createBoard(): Tile[] {
  const propById = new Map(props.map((p) => [p.id, p]));
  const tiles: Tile[] = [];

  for (let id = 0; id < 40; id++) {
    if (id === 0) {
      tiles.push({ id, type: 'GO', name: 'GO' });
    } else if (id === 10) {
      tiles.push({ id, type: 'JAIL', name: 'Holding Cell' });
    } else if (id === 20) {
      tiles.push({ id, type: 'FREE_PARKING', name: 'Free Parking' });
    } else if (id === 30) {
      tiles.push({ id, type: 'GOTO_JAIL', name: 'Off to the Cell' });
    } else if (id === 4) {
      tiles.push({ id, type: 'TAX', name: 'Levy Office', amount: 200 });
    } else if (id === 38) {
      tiles.push({ id, type: 'TAX', name: 'Luxury Duty', amount: 100 });
    } else if (id === 7 || id === 22 || id === 36) {
      tiles.push({ id, type: 'FORTUNE', name: 'Fortune' });
    } else if (id === 2 || id === 17 || id === 33) {
      tiles.push({ id, type: 'CIVIC', name: 'Civic' });
    } else if (transportNames[id]) {
      tiles.push({
        id,
        type: 'TRANSPORT',
        name: transportNames[id],
        groupId: 'transport',
        price: 200,
        baseRent: 25,
        mortgageValue: 100,
        ownerId: null,
        mortgaged: false,
      });
    } else if (utilityNames[id]) {
      tiles.push({
        id,
        type: 'UTILITY',
        name: utilityNames[id],
        groupId: 'utility',
        price: 150,
        mortgageValue: 75,
        ownerId: null,
        mortgaged: false,
      });
    } else {
      const p = propById.get(id);
      if (!p) throw new Error(`No property seed for tile ${id}`);
      tiles.push({
        id,
        type: 'PROPERTY',
        name: p.name,
        groupId: p.groupId,
        price: p.price,
        rent: p.rent.slice(),
        houseCost: p.houseCost,
        mortgageValue: Math.floor(p.price / 2),
        ownerId: null,
        houses: 0,
        hotel: false,
        mortgaged: false,
      });
    }
  }
  for (const t of tiles) {
    if (SHORT_NAMES[t.name]) t.shortName = SHORT_NAMES[t.name];
  }
  return tiles;
}

// How many tiles belong to each color group (for monopoly detection).
export const GROUP_SIZES: Record<string, number> = (() => {
  const counts: Record<string, number> = {};
  for (const p of props) counts[p.groupId] = (counts[p.groupId] ?? 0) + 1;
  return counts;
})();
