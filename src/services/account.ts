import type { AgeGroup, AppData, Settings } from '@/core/types';
import { supabase } from './supabase';

/** The account's copy of what you chose, kept in the `profiles` table. */
export interface Profile {
  name: string;
  age_group: AgeGroup | null;
  goals: string[];
  goal_other: string;
  sleep_goal_minutes: number;
  xp_earned: number;
  xp_spent: number;
  pro_until: string | null;
  trial_started_at: string | null;
}

export function profileFromData(d: AppData): Profile {
  const s = d.settings;
  return {
    xp_earned: d.xp.earned,
    xp_spent: d.xp.spent,
    pro_until: d.proUntil ? new Date(d.proUntil).toISOString() : null,
    trial_started_at: d.trialStartedAt ? new Date(d.trialStartedAt).toISOString() : null,
    name: s.profile.name.slice(0, 60),
    age_group: s.profile.ageGroup,
    goals: s.goals,
    goal_other: s.goalOther.slice(0, 300),
    sleep_goal_minutes: s.sleepGoalMinutes,
  };
}

/** XP and Pro from the account, keeping whichever side has more (so nothing earned on either phone is lost). */
export function withProfileXp(d: AppData, p: Profile): AppData {
  const remotePro = p.pro_until ? Date.parse(p.pro_until) : null;
  const earned = Math.max(d.xp.earned, p.xp_earned ?? 0);
  const spent = Math.max(d.xp.spent, p.xp_spent ?? 0);
  const proUntil = Math.max(d.proUntil ?? 0, remotePro ?? 0) || null;
  // The trial is once per account: the earliest start wins, so reinstalling doesn't restart it.
  const remoteTrial = p.trial_started_at ? Date.parse(p.trial_started_at) : null;
  const trialStartedAt = d.trialStartedAt === null ? remoteTrial : remoteTrial === null ? d.trialStartedAt : Math.min(d.trialStartedAt, remoteTrial);
  if (earned === d.xp.earned && spent === d.xp.spent && proUntil === d.proUntil && trialStartedAt === d.trialStartedAt) return d;
  return { ...d, xp: { ...d.xp, earned, spent }, proUntil, trialStartedAt };
}

export function settingsFromProfile(p: Profile, current: Settings): Partial<Settings> {
  return {
    profile: { name: p.name || current.profile.name, ageGroup: p.age_group ?? current.profile.ageGroup },
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
  const { data, error } = await supabase.from('profiles').select('name, age_group, goals, goal_other, sleep_goal_minutes, xp_earned, xp_spent, pro_until, trial_started_at').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function saveProfile(userId: string, profile: Profile) {
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...profile });
  if (error) throw error;
}
