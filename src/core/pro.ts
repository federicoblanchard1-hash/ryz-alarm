import type { MissionType } from './missions';
import type { AlarmSoundId, AppData } from './types';
import type { VibrationId } from './vibration';

// What's free and what's Pro, and the trial.
//
// The plan follows what converts in subscription apps:
// - A reverse trial: everyone gets full Pro for 14 days, no card needed, then
//   drops back to free. Owning Pro first and then losing it weighs about twice
//   as much as never having it (loss aversion, the endowment effect), and
//   longer trials convert best (RevenueCat, State of Subscription Apps 2025).
// - A generous free plan, so the app is great without paying, and Pro adds
//   variety and depth: more missions and sounds, longer history, smartwatch.
// - Alarms that are already set never lose anything: a Pro sound or mission
//   chosen during the trial keeps working. Waking people up comes first.

const DAY = 24 * 60 * 60_000;
export const TRIAL_DAYS = 14;

export const FREE_MISSIONS: MissionType[] = ['math', 'memory', 'typing', 'shake', 'squats', 'steps'];
export const FREE_MISSION_SLOTS = 3;
export const FREE_SOUNDS: AlarmSoundId[] = ['gentle', 'deep', 'air_raid', 'buzzer', 'bell', 'birds', 'ocean', 'wind_chimes'];
export const FREE_VIBRATIONS: VibrationId[] = ['basic', 'heartbeat'];
export const FREE_NEWS_TOPICS = 5;

export type ProFeature = 'missions' | 'mission_slots' | 'sounds' | 'vibrations' | 'sleep_history' | 'smartwatch' | 'news_topics' | 'trial_ended';

/** The headline on the paywall when it opens from a locked feature. */
export const FEATURE_COPY: Record<ProFeature, { title: string; text: string }> = {
  missions: { title: 'Unlock every mission', text: 'QR code, reaction test, arrow test, cardio burst, number hunt and more, for mornings you can’t sleep through.' },
  mission_slots: { title: 'Up to 5 missions per alarm', text: 'Free alarms take 3 missions. Pro stacks up to 5.' },
  sounds: { title: 'All 39 alarm sounds', text: 'Every siren, bell, nature sound and melody, including the research-backed ones.' },
  vibrations: { title: 'Every vibration pattern', text: 'Rapid, strong, waves and SOS, for when sound isn’t enough.' },
  sleep_history: { title: 'Your whole sleep history', text: 'A year at a glance, any dates you pick, and every stat across them.' },
  smartwatch: { title: 'Automatic sleep from your watch', text: 'Apple Watch, Galaxy, Pixel, Fitbit, Garmin: your nights appear by themselves.' },
  news_topics: { title: 'Follow every topic', text: `Free news follows ${FREE_NEWS_TOPICS} topics. Pro follows as many as you like.` },
  trial_ended: { title: 'Your Pro trial has ended', text: 'You’re back on the free plan. Your alarms keep working exactly as you set them.' },
};

/** Followed topics and entities: the free plan follows up to FREE_NEWS_TOPICS. */
export function newsFollowCount(settings: AppData['settings']): number {
  return (settings.newsTopics?.length ?? 0) + settings.news.entities.length;
}

export function trialEndsAt(data: AppData): number | null {
  return data.trialStartedAt === null ? null : data.trialStartedAt + TRIAL_DAYS * DAY;
}

export type ProStatus = { kind: 'pro'; until: number } | { kind: 'trial'; until: number; daysLeft: number } | { kind: 'free'; trialUsed: boolean };

export function proStatus(data: AppData, now: number): ProStatus {
  if (data.proUntil !== null && data.proUntil > now) return { kind: 'pro', until: data.proUntil };
  const trialEnd = trialEndsAt(data);
  if (trialEnd !== null && trialEnd > now) return { kind: 'trial', until: trialEnd, daysLeft: Math.ceil((trialEnd - now) / DAY) };
  return { kind: 'free', trialUsed: trialEnd !== null };
}

export function isPro(data: AppData, now: number): boolean {
  return proStatus(data, now).kind !== 'free';
}

/** The trial starts once onboarding is done (and right away for people who finished it before trials existed). */
export function reconcilePro(data: AppData, now: number): AppData {
  if (data.trialStartedAt === null && data.settings.onboarded) return { ...data, trialStartedAt: now };
  return data;
}

/** True once, right after the trial ends, so the app can say so (and what Pro was doing for you). */
export function trialJustEnded(data: AppData, now: number): boolean {
  const end = trialEndsAt(data);
  return end !== null && end <= now && !data.trialEndSeen && !isPro(data, now);
}

/** What you were using that's Pro: shown when the trial ends, so the loss is concrete. */
export function proThingsInUse(data: AppData): string[] {
  const out: string[] = [];
  const missions = new Set(data.alarms.flatMap((a) => a.missions.map((m) => m.type)).filter((t) => !FREE_MISSIONS.includes(t)));
  if (missions.size) out.push(`${missions.size} Pro ${missions.size === 1 ? 'mission' : 'missions'} in your alarms`);
  const sounds = new Set(data.alarms.map((a) => a.sound).filter((s) => !FREE_SOUNDS.includes(s)));
  if (sounds.size) out.push(`${sounds.size} Pro ${sounds.size === 1 ? 'sound' : 'sounds'}`);
  if (data.settings.smartwatch) out.push('Automatic sleep from your watch');
  const topics = newsFollowCount(data.settings);
  if (topics > FREE_NEWS_TOPICS) out.push(`${topics} news topics (free follows ${FREE_NEWS_TOPICS})`);
  return out;
}
