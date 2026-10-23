import type { AlarmSoundId, WakeMode } from './types';

export type SoundCategory = 'science' | 'loud' | 'calm';

export const SOUND_CATEGORIES: { id: SoundCategory; title: string; description: string; groups: string[] }[] = [
  { id: 'science', title: 'Scientific', description: 'Chosen from sleep research.', groups: ['Low tones', 'Melodic'] },
  { id: 'loud', title: 'Loud', description: 'Sirens, beeps and bells at full volume, nonstop. Hold to stop.', groups: ['Sirens', 'Beeps', 'Bells and rings'] },
  { id: 'calm', title: 'Calm', description: 'Soft sounds that fade in.', groups: ['Nature', 'Music', 'Noise'] },
];

export interface SoundInfo {
  title: string;
  category: SoundCategory;
  /** The sub-heading inside its category; one of its `groups`. */
  group: string;
  /** gentle fades in (and can switch to the 520 Hz tone); deep starts loud and needs a hold to stop. */
  mode: WakeMode;
  /** The file name in assets/sounds, also used for notification sounds. */
  file: string;
  description?: string;
}

const science = (group: string, mode: WakeMode, title: string, file: string, description: string): SoundInfo => ({ title, category: 'science', group, mode, file, description });
const loud = (group: string, title: string, file: string, description?: string): SoundInfo => ({ title, category: 'loud', group, mode: 'deep', file, description });
const calm = (group: string, title: string, file: string, description?: string): SoundInfo => ({ title, category: 'calm', group, mode: 'gentle', file, description });

export const SOUNDS: Record<AlarmSoundId, SoundInfo> = {
  deep: science('Low tones', 'deep', 'Deep sleeper · 520 Hz', 'deep_520hz.wav', 'The low square-wave tone that woke far more deep sleepers than high beeps (Bruck & Thomas, 2009).'),
  deep_400: science('Low tones', 'deep', 'Deep sleeper · 400 Hz', 'science_deep_400.wav', 'An even lower square wave; tones around 400–520 Hz beat the 3 kHz smoke alarm in waking tests (Ball & Bruck, 2004).'),
  gentle: science('Melodic', 'gentle', 'Gentle melody', 'gentle_melody.wav', 'A real music box. Melodic alarms were linked with less grogginess (McFarlane et al., RMIT, 2020). Fades in.'),
  rising: science('Melodic', 'gentle', 'Rising melody', 'science_rising.wav', 'A tune that climbs in pitch and volume, so it starts soft and still gets you up.'),
  rhythmic: science('Melodic', 'gentle', 'Rhythmic melody', 'science_rhythmic.wav', 'Melody plus a clear beat: what the same study found people woke up least groggy to.'),

  air_raid: loud('Sirens', 'Air-raid siren', 'loud_air_raid.wav'),
  wail: loud('Sirens', 'Wail', 'loud_wail.wav'),
  yelp: loud('Sirens', 'Emergency yelp', 'loud_yelp.wav'),
  two_tone: loud('Sirens', 'Two-tone siren', 'loud_two_tone.wav'),
  hi_lo: loud('Sirens', 'Hi-lo', 'loud_hi_lo.wav'),
  red_alert: loud('Sirens', 'Red alert', 'loud_red_alert.wav'),
  klaxon: loud('Sirens', 'Klaxon', 'loud_klaxon.wav'),
  foghorn: loud('Sirens', 'Foghorn', 'loud_foghorn.wav'),
  car: loud('Sirens', 'Car alarm', 'loud_car.wav'),
  continuous: loud('Beeps', 'Continuous tone', 'loud_continuous.wav', 'A real piezo alarm: one steady tone that never pauses.'),
  pulse: loud('Beeps', 'Rapid pulse', 'loud_pulse.wav'),
  buzzer: loud('Beeps', 'Digital buzzer', 'loud_buzzer.wav', 'A real digital alarm clock: beep-beep-beep-beep.'),
  escalating: loud('Beeps', 'Escalating beeps', 'loud_escalating.wav', 'Gets faster and higher every few seconds.'),
  smoke: loud('Beeps', 'Smoke detector', 'loud_smoke.wav'),
  bell: loud('Bells and rings', 'Alarm clock bell', 'loud_bell.wav', 'A real mechanical alarm clock with twin bells.'),
  fire_bell: loud('Bells and rings', 'Fire bell', 'loud_fire_bell.wav'),
  phone: loud('Bells and rings', 'Old phone', 'loud_phone.wav'),
  reveille: loud('Bells and rings', 'Reveille bugle', 'loud_reveille.wav'),

  birds: calm('Nature', 'Birdsong', 'calm_birds.wav', 'Birds waking up at dawn, recorded outdoors.'),
  forest: calm('Nature', 'Morning forest', 'calm_forest.wav'),
  rain: calm('Nature', 'Rain', 'calm_rain.wav'),
  stream: calm('Nature', 'Mountain stream', 'calm_stream.wav'),
  ocean: calm('Nature', 'Ocean waves', 'calm_ocean.wav'),
  wind_chimes: calm('Nature', 'Wind chimes', 'calm_wind_chimes.wav'),
  sunrise: calm('Music', 'Sunrise', 'calm_sunrise.wav'),
  piano: calm('Music', 'Soft piano', 'calm_piano.wav'),
  harp: calm('Music', 'Harp', 'calm_harp.wav'),
  guitar: calm('Music', 'Acoustic guitar', 'calm_guitar.wav'),
  kalimba: calm('Music', 'Kalimba', 'calm_kalimba.wav', 'A real thumb piano, played by hand.'),
  music_box: calm('Music', 'Music box', 'calm_music_box.wav'),
  lofi: calm('Music', 'Lo-fi morning', 'calm_lofi.wav'),
  singing_bowl: calm('Music', 'Singing bowl', 'calm_singing_bowl.wav'),
  pink_noise: calm('Noise', 'Pink noise', 'calm_pink_noise.wav', 'Softer than white noise; less hiss.'),
  brown_noise: calm('Noise', 'Brown noise', 'calm_brown_noise.wav', 'A deep, steady rumble.'),
};

export const ALARM_SOUNDS = Object.keys(SOUNDS) as AlarmSoundId[];

export function soundsIn(category: SoundCategory, group?: string): AlarmSoundId[] {
  return ALARM_SOUNDS.filter((id) => SOUNDS[id].category === category && (group === undefined || SOUNDS[id].group === group));
}
