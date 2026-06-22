import type { Card } from './types.js';
import { JAIL_TILE_ID } from './constants.js';

// All card text is original to BOOMTOWN.

export const FORTUNE_CARDS: Card[] = [
  { id: 'F01', deck: 'FORTUNE', text: 'A surveyor friend tips you off. Advance to GO.', effect: { kind: 'MOVE_TO', tileId: 0, collectGo: true } },
  { id: 'F02', deck: 'FORTUNE', text: 'Your patent on a faster brick kiln pays out. Collect 150.', effect: { kind: 'MONEY', amount: 150 } },
  { id: 'F03', deck: 'FORTUNE', text: 'Caught dumping in the river. Off to the Holding Cell.', effect: { kind: 'GOTO_JAIL' } },
  { id: 'F04', deck: 'FORTUNE', text: 'The transit board owes you a refund. Advance to the nearest transit line; pay double rent if owned.', effect: { kind: 'GO_TO_NEAREST', group: 'transport' } },
  { id: 'F05', deck: 'FORTUNE', text: 'Storm damages every building you own. Pay 25 per house and 100 per hotel.', effect: { kind: 'REPAIRS', perHouse: 25, perHotel: 100 } },
  { id: 'F06', deck: 'FORTUNE', text: 'You won the boomtown lottery. Collect 100.', effect: { kind: 'MONEY', amount: 100 } },
  { id: 'F07', deck: 'FORTUNE', text: 'A clerical error in your favor. The city pardons one stay — keep this Release Writ.', effect: { kind: 'GET_OUT_OF_JAIL' } },
  { id: 'F08', deck: 'FORTUNE', text: 'Your wagon takes a wrong turn. Go back 3 tiles.', effect: { kind: 'MOVE_REL', steps: -3 } },
  { id: 'F09', deck: 'FORTUNE', text: 'Reservoir levy assessed on landowners. Pay each other player 25.', effect: { kind: 'PAY_EACH', amount: 25 } },
  { id: 'F10', deck: 'FORTUNE', text: 'Investors flock to your district. Collect 50 from every other player.', effect: { kind: 'COLLECT_EACH', amount: 50 } },
  { id: 'F11', deck: 'FORTUNE', text: 'Ferry strike resolved. Advance to River Ferry.', effect: { kind: 'MOVE_TO', tileId: 15, collectGo: true } },
  { id: 'F12', deck: 'FORTUNE', text: 'Speculation pays. Advance to Skyline Crown.', effect: { kind: 'MOVE_TO', tileId: 39, collectGo: true } },
  { id: 'F13', deck: 'FORTUNE', text: 'Permit fees come due. Pay 75.', effect: { kind: 'MONEY', amount: -75 } },
  { id: 'F14', deck: 'FORTUNE', text: 'The water utility needs a meter reader — go to the nearest Civic Works. Pay 10× your dice if owned.', effect: { kind: 'GO_TO_NEAREST', group: 'utility' } },
];

export const CIVIC_CARDS: Card[] = [
  { id: 'C01', deck: 'CIVIC', text: 'The founders fund matures. Collect 200.', effect: { kind: 'MONEY', amount: 200 } },
  { id: 'C02', deck: 'CIVIC', text: 'Annual hearth tax. Pay 50.', effect: { kind: 'MONEY', amount: -50 } },
  { id: 'C03', deck: 'CIVIC', text: 'Town council grant for civic art. Collect 100.', effect: { kind: 'MONEY', amount: 100 } },
  { id: 'C04', deck: 'CIVIC', text: 'You are elected district warden. Each other player tips you 10.', effect: { kind: 'COLLECT_EACH', amount: 10 } },
  { id: 'C05', deck: 'CIVIC', text: 'Mistaken arrest, swiftly cleared. Keep this Release Writ.', effect: { kind: 'GET_OUT_OF_JAIL' } },
  { id: 'C06', deck: 'CIVIC', text: 'Riot at the levy office implicates you. Off to the Holding Cell.', effect: { kind: 'GOTO_JAIL' } },
  { id: 'C07', deck: 'CIVIC', text: 'Refund on overpaid duty. Collect 25.', effect: { kind: 'MONEY', amount: 25 } },
  { id: 'C08', deck: 'CIVIC', text: 'The almshouse calls on landowners. Pay each other player 15.', effect: { kind: 'PAY_EACH', amount: 15 } },
  { id: 'C09', deck: 'CIVIC', text: 'Inheritance from a distant aunt. Collect 100.', effect: { kind: 'MONEY', amount: 100 } },
  { id: 'C10', deck: 'CIVIC', text: 'Sewer assessment on your holdings. Pay 40 per house and 115 per hotel.', effect: { kind: 'REPAIRS', perHouse: 40, perHotel: 115 } },
  { id: 'C11', deck: 'CIVIC', text: 'Public groundbreaking ceremony. Advance to GO.', effect: { kind: 'MOVE_TO', tileId: 0, collectGo: true } },
  { id: 'C12', deck: 'CIVIC', text: 'School fees. Pay 50.', effect: { kind: 'MONEY', amount: -50 } },
  { id: 'C13', deck: 'CIVIC', text: 'Compensation for a misdrawn boundary. Collect 75.', effect: { kind: 'MONEY', amount: 75 } },
  { id: 'C14', deck: 'CIVIC', text: 'Report to the Holding Cell for jury duty — just visiting.', effect: { kind: 'MOVE_TO', tileId: JAIL_TILE_ID, collectGo: false } },
];

export function buildDecks(): { FORTUNE: Card[]; CIVIC: Card[] } {
  return { FORTUNE: [...FORTUNE_CARDS], CIVIC: [...CIVIC_CARDS] };
}
