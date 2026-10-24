export function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Sample standard deviation (n - 1). Returns 0 for fewer than two values. */
export function sampleSd(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

const lnFactorialCache: number[] = [0];

function lnFactorial(n: number): number {
  for (let i = lnFactorialCache.length; i <= n; i++) {
    lnFactorialCache[i] = lnFactorialCache[i - 1]! + Math.log(i);
  }
  return lnFactorialCache[n]!;
}

function lnChoose(n: number, k: number): number {
  return lnFactorial(n) - lnFactorial(k) - lnFactorial(n - k);
}

/**
 * One-sided Fisher's exact test for a 2x2 table, testing whether `a` is larger than chance.
 *
 *              feature   no feature
 *   in window     a          b
 *   outside       c          d
 */
export function fisherExactGreater(a: number, b: number, c: number, d: number): number {
  const rowIn = a + b;
  const colFeature = a + c;
  const n = a + b + c + d;
  const denominator = lnChoose(n, colFeature);
  let p = 0;
  for (let k = a; k <= Math.min(rowIn, colFeature); k++) {
    p += Math.exp(lnChoose(rowIn, k) + lnChoose(n - rowIn, colFeature - k) - denominator);
  }
  return Math.min(1, p);
}
