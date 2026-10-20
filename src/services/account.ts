import { migrateTopicIds } from '@/core/news';
import type { AgeGroup, Settings } from '@/core/types';
import { supabase } from './supabase';

/** The account's copy of what you chose, kept in the `profiles` table. */
export interface Profile {
  name: string;
  age_group: AgeGroup | null;
  news_topics: string[];
  goals: string[];
  goal_other: string;
  sleep_goal_minutes: number;
}

export function profileFromSettings(s: Settings): Profile {
  return {
    name: s.profile.name.slice(0, 60),
    age_group: s.profile.ageGroup,
    news_topics: s.newsTopics ?? [],
    goals: s.goals,
    goal_other: s.goalOther.slice(0, 300),
    sleep_goal_minutes: s.sleepGoalMinutes,
  };
}

export function settingsFromProfile(p: Profile, current: Settings): Partial<Settings> {
  return {
    profile: { name: p.name || current.profile.name, ageGroup: p.age_group ?? current.profile.ageGroup },
    newsTopics: p.news_topics.length ? migrateTopicIds(p.news_topics) : current.newsTopics,
    goals: p.goals.length ? p.goals : current.goals,
    goalOther: p.goal_other || current.goalOther,
    sleepGoalMinutes: p.sleep_goal_minutes || current.sleepGoalMinutes,
  };
}

/** Plain-language versions of Supabase's auth errors. */
export function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'That email and password don’t match an account.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'There’s already an account with this email. Log in instead.';
  if (m.includes('email not confirmed')) return 'Confirm your email first: open the link we sent you, then log in.';
  if (m.includes('password') && m.includes('characters')) return 'Use a password of at least 6 characters.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many tries. Wait a minute and try again.';
  if (m.includes('network') || m.includes('fetch')) return 'No connection. Check your internet and try again.';
  if (m.includes('not authorized')) return 'Sign-up emails aren’t switched on for Ryz yet, so only team addresses work. Ask the app owner to turn off “Confirm email” in Supabase.';
  if ((m.includes('invalid') || m.includes('not valid')) && m.includes('email')) return 'That email address doesn’t look right.';
  return message;
}

export async function signUp(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
  if (error) throw new Error(friendlyError(error.message));
  // With email confirmation on, there's a user but no session until the link is opened.
  return { needsConfirmation: !data.session };
}

export async function logIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendlyError(error.message));
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw new Error(friendlyError(error.message));
}

export async function logOut() {
  await supabase.auth.signOut();
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('name, age_group, news_topics, goals, goal_other, sleep_goal_minutes').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function saveProfile(userId: string, profile: Profile) {
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...profile });
  if (error) throw error;
}
