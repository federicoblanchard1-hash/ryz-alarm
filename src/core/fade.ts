/** The deep tone starts here so it isn't a jump scare, then reaches full volume in a few seconds. */
export const DEEP_START_DB = -9;
export const DEEP_RAMP_SECONDS = 8;
/** The gentle melody starts barely audible. */
export const GENTLE_START_DB = -30;

/**
 * Volume (0–1) `seconds` into a fade. The fade is linear in decibels, which
 * the ear hears as an even rise; a linear volume ramp sounds like it jumps at
 * the start and then barely changes.
 */
export function fadeVolume(seconds: number, rampSeconds: number, startDb: number): number {
  if (rampSeconds <= 0) return 1;
  const progress = Math.min(1, Math.max(0, seconds / rampSeconds));
  return Math.pow(10, (startDb * (1 - progress)) / 20);
}
