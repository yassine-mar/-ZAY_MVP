/**
 * RFC4122 v4-shaped UUID using Math.random().
 *
 * Used as the idempotency key on POST /orders — uniqueness within one
 * customer's checkout retries is all we need. Not crypto-secure.
 */
export function uuidV4(): string {
  const bytes = new Array<number>(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  // Version + variant bits per RFC4122.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
