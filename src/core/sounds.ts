import type { AlarmSoundId, WakeMode } from './types';

export type SoundCategory = 'science' | 'loud' | 'calm';

export const SOUND_CATEGORIES: { id: SoundCategory; title: string; description: string }[] = [
  { id: 'science', title: 'Scientific', description: 'Chosen from sleep research.' },
  { id: 'loud', title: 'Loud', description: 'Sirens and alarm bells at full volume. Hold to stop.' },
  { id: 'calm', title: 'Calm', description: 'Soft sounds that fade in.' },
];

export interface SoundInfo {
  title: string;
  category: SoundCategory;
  /** gentle fades in (and can switch to the 520 Hz tone); deep starts loud and needs a hold to stop. */
  mode: WakeMode;
  /** The file name in assets/sounds, also used for notification sounds. */
  file: string;
  description?: string;
}

export const SOUNDS: Record<AlarmSoundId, SoundInfo> = {
  gentle: { title: 'Gentle melody', category: 'science', mode: 'gentle', file: 'gentle_melody.wav', description: 'Melodic alarms were linked with less grogginess (RMIT, 2020). Fades in.' },
  deep: { title: 'Deep sleeper · 520 Hz', category: 'science', mode: 'deep', file: 'deep_520hz.wav', description: 'The low tone that woke far more deep sleepers than high beeps (Bruck & Thomas).' },
  air_raid: { title: 'Air-raid siren', category: 'loud', mode: 'deep', file: 'loud_air_raid.wav' },
  yelp: { title: 'Emergency yelp', category: 'loud', mode: 'deep', file: 'loud_yelp.wav' },
  two_tone: { title: 'Two-tone siren', category: 'loud', mode: 'deep', file: 'loud_two_tone.wav' },
  buzzer: { title: 'Digital buzzer', category: 'loud', mode: 'deep', file: 'loud_buzzer.wav' },
  bell: { title: 'Alarm bell', category: 'loud', mode: 'deep', file: 'loud_bell.wav' },
  wind_chimes: { title: 'Wind chimes', category: 'calm', mode: 'gentle', file: 'calm_wind_chimes.wav' },
  ocean: { title: 'Ocean waves', category: 'calm', mode: 'gentle', file: 'calm_ocean.wav' },
  birds: { title: 'Birdsong', category: 'calm', mode: 'gentle', file: 'calm_birds.wav' },
  sunrise: { title: 'Sunrise', category: 'calm', mode: 'gentle', file: 'calm_sunrise.wav' },
  music_box: { title: 'Music box', category: 'calm', mode: 'gentle', file: 'calm_music_box.wav' },
};

export const ALARM_SOUNDS = Object.keys(SOUNDS) as AlarmSoundId[];

export function soundsIn(category: SoundCategory): AlarmSoundId[] {
  return ALARM_SOUNDS.filter((id) => SOUNDS[id].category === category);
}
