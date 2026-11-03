// Exact decimal input -> integer minor units; never compute monetary totals with floats.
function scaled(value: string | number, places: number): bigint {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(value));
  if (!match) throw new Error('Invalid monetary value in finance data.');
  const fraction = (match[3] || '').padEnd(places + 1, '0');
  const magnitude =
    BigInt(match[2]) * 10n ** BigInt(places) +
    BigInt(fraction.slice(0, places) || '0') +
    (fraction[places] >= '5' ? 1n : 0n);
  return match[1] ? -magnitude : magnitude;
}
export const cents = (value: string | number) => scaled(value, 2);
export const rateUnits = (value: string | number) => scaled(value, 4);
export function convertCents(value: bigint, rate: bigint): bigint {
  const product = value * rate;
  return (
    ((product < 0n ? -1n : 1n) *
      ((product < 0n ? -product : product) + 5000n)) /
    10000n
  );
}
export function decimal(value: bigint): string {
  const magnitude = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${magnitude / 100n}.${String(magnitude % 100n).padStart(2, '0')}`;
}
export function money(value: bigint, currency: 'USD' | 'SLL'): string {
  const magnitude = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${currency === 'USD' ? '$' : 'Le '}${(magnitude / 100n).toLocaleString('en-US')}.${String(magnitude % 100n).padStart(2, '0')}`;
}
