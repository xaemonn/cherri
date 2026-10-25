/**
 * Rounds SVG coordinates to 2 decimals. Math.cos/sin can differ in the last digit between
 * Node and the browser, which would otherwise break hydration.
 */
export const r2 = (n: number) => Math.round(n * 100) / 100;

/** A point on a circle, rounded: `angle` in degrees, 0° pointing right. */
export function polar(cx: number, cy: number, radius: number, angle: number) {
  const a = (angle * Math.PI) / 180;
  return { x: r2(cx + radius * Math.cos(a)), y: r2(cy + radius * Math.sin(a)) };
}

/**
 * Path of the lit part of a moon of radius `r` centred on 0,0.
 * `phase`: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. Built from two arcs.
 */
export function moonLitPath(phase: number, r: number) {
  const p = ((phase % 1) + 1) % 1;
  const waxing = p <= 0.5;
  const k = Math.cos(2 * Math.PI * p);
  const inner = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;
  return `M0 ${-r} A${r} ${r} 0 0 ${waxing ? 1 : 0} 0 ${r} A${r2(Math.abs(k) * r)} ${r} 0 0 ${inner} 0 ${-r}Z`;
}
