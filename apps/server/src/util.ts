import { randomBytes } from 'node:crypto';

// Unambiguous alphabet (no I, O, 0, 1).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRoomCode(taken: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    const bytes = randomBytes(5);
    for (let i = 0; i < 5; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    if (!taken.has(code)) return code;
  }
  throw new Error('Could not allocate a room code.');
}

export function makeId(prefix = 'p'): string {
  return prefix + randomBytes(8).toString('hex');
}

export function makeSessionToken(): string {
  return randomBytes(24).toString('hex');
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
