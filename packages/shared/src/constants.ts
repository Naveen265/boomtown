export const BOARD_SIZE = 40;
export const GO_BONUS = 200;
export const JAIL_TILE_ID = 10;
export const GOTO_JAIL_TILE_ID = 30;
export const JAIL_FINE = 50;
export const MAX_JAIL_TURNS = 3;
export const MAX_DOUBLES = 3; // 3rd consecutive double → jail

export const CURRENCY_NAME = 'Bricks';
export const CURRENCY_SYMBOL = '◈';

// Auction
export const AUCTION_DURATION_MS = 12_000;
export const AUCTION_EXTEND_MS = 5_000; // a late bid resets timer to at least this
export const AUCTION_MIN_INCREMENT = 5;

// Building supply (when buildingShortage house rule is on)
export const HOUSE_SUPPLY = 32;
export const HOTEL_SUPPLY = 12;

// Utility rent multipliers: [one owned, both owned] × dice total
export const UTILITY_MULTIPLIERS: [number, number] = [4, 10];

// Color group display order (poorest → richest)
export const GROUP_ORDER = [
  'tannery',
  'kiln',
  'founders',
  'lakeside',
  'lantern',
  'meridian',
  'glass',
  'skyline',
] as const;

export const GROUP_COLORS: Record<string, string> = {
  tannery: '#9A6A3C',
  kiln: '#7FB8D6',
  founders: '#D96FA0',
  lakeside: '#EF8A3C',
  lantern: '#D5283C',
  meridian: '#F2C84B',
  glass: '#2FA58E',
  skyline: '#2D4FA2',
  transport: '#3B3F46',
  utility: '#6B7280',
};

export const GROUP_LABELS: Record<string, string> = {
  tannery: 'Tannery Row',
  kiln: 'Old Kiln Quarter',
  founders: 'Founders Crossing',
  lakeside: 'Lakeside Mile',
  lantern: 'Lantern District',
  meridian: 'Meridian Heights',
  glass: 'Glass Tower District',
  skyline: 'Skyline Crown',
  transport: 'Transit Lines',
  utility: 'Civic Works',
};
