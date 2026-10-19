export type VibrationId = 'basic' | 'heartbeat' | 'rapid' | 'strong' | 'waves' | 'sos';

/**
 * Patterns are [wait, buzz, pause, buzz, …] in ms and repeat while ringing.
 * Android follows them exactly; iPhones buzz with a fixed length, so there
 * only the rhythm (the gaps) comes through.
 */
export const VIBRATIONS: Record<VibrationId, { title: string; pattern: number[] }> = {
  basic: { title: 'Basic', pattern: [0, 800, 600] },
  heartbeat: { title: 'Heartbeat', pattern: [0, 150, 120, 220, 800] },
  rapid: { title: 'Rapid', pattern: [0, 180, 140] },
  strong: { title: 'Strong', pattern: [0, 1600, 300] },
  waves: { title: 'Waves', pattern: [0, 250, 200, 500, 200, 900, 900] },
  sos: { title: 'SOS', pattern: [0, 150, 120, 150, 120, 150, 350, 450, 120, 450, 120, 450, 350, 150, 120, 150, 120, 150, 1000] },
};

export const VIBRATION_IDS = Object.keys(VIBRATIONS) as VibrationId[];

export function vibrationPattern(id: VibrationId | undefined): number[] {
  return (VIBRATIONS[id ?? 'basic'] ?? VIBRATIONS.basic).pattern;
}

/** One pass of a pattern, for previewing it. */
export function patternLength(pattern: number[]): number {
  return pattern.reduce((sum, ms) => sum + ms, 0);
}
