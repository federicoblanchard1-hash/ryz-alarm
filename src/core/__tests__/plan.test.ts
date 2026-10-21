import { emptyData, newAlarm } from '../defaults';
import { FOLLOW_UP_SECONDS, NOTIFICATION_LIMIT, buildPlan, phaseAt, soundAt } from '../plan';
import type { Alarm, AppData } from '../types';

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).getTime();
const MONDAY_6AM = at(19, 6);

function data(alarms: Alarm[], extra: Partial<AppData> = {}): AppData {
  return { ...emptyData(true), alarms, ...extra };
}

describe('buildPlan', () => {
  it('schedules a weekly trigger per chosen day (1 = Sunday)', () => {
    const plan = buildPlan(data([{ ...newAlarm('a'), days: [1, 3] }]), MONDAY_6AM);
    const mains = plan.filter((p) => p.kind === 'alarm');
    expect(mains.map((p) => p.trigger)).toEqual([
      { type: 'weekly', weekday: 2, hour: 7, minute: 0 },
      { type: 'weekly', weekday: 4, hour: 7, minute: 0 },
    ]);
  });

  it('uses one daily trigger for an every-day alarm', () => {
    const plan = buildPlan(data([{ ...newAlarm('a'), days: [0, 1, 2, 3, 4, 5, 6] }]), MONDAY_6AM);
    expect(plan.filter((p) => p.kind === 'alarm')).toHaveLength(1);
    expect(plan[0].trigger).toEqual({ type: 'daily', hour: 7, minute: 0 });
  });

  it('keeps ringing for ringMinutes, switching to the deep tone when it escalates', () => {
    const alarm = { ...newAlarm('a'), ringMinutes: 5, escalate: true, escalateAfterMinutes: 2 };
    const followups = buildPlan(data([alarm]), MONDAY_6AM).filter((p) => p.kind === 'followup');
    expect(followups).toHaveLength((5 * 60) / FOLLOW_UP_SECONDS - 1);
    expect(followups[0].trigger).toEqual({ type: 'date', date: at(19, 7) + 30_000 });
    expect(followups[2].sound).toBe('gentle'); // 90 s
    expect(followups[3].sound).toBe('deep'); // 120 s
  });

  it('never escalates a gentle alarm with escalation off', () => {
    const alarm = { ...newAlarm('a'), escalate: false };
    const sounds = new Set(buildPlan(data([alarm]), MONDAY_6AM).map((p) => p.sound));
    expect(sounds).toEqual(new Set(['gentle']));
  });

  it('stays within the iOS limit and gives follow-ups to the soonest ring first', () => {
    const alarms = Array.from({ length: 5 }, (_, i) => ({ ...newAlarm(`a${i}`), hour: 7 + i, ringMinutes: 15 }));
    const plan = buildPlan(data(alarms), MONDAY_6AM);
    expect(plan.length).toBeLessThanOrEqual(NOTIFICATION_LIMIT);
    expect(plan.filter((p) => p.kind === 'alarm')).toHaveLength(25);
    const followups = plan.filter((p) => p.kind === 'followup');
    expect(followups.filter((p) => p.alarmId === 'a0')).toHaveLength(29);
    expect(followups.filter((p) => p.alarmId === 'a4')).toHaveLength(0);
  });

  it('skips a one-time alarm whose time has passed', () => {
    const alarm = { ...newAlarm('a'), days: [], date: at(19, 5) };
    expect(buildPlan(data([alarm]), MONDAY_6AM)).toEqual([]);
  });

  it('reminds you before bedtime, on the evening before', () => {
    const alarm = { ...newAlarm('a'), days: [1 as const], hour: 7, minute: 0 };
    const settings = { ...emptyData(true).settings, bedtimeReminder: true, sleepGoalMinutes: 480, reminderLeadMinutes: 30 };
    const reminders = buildPlan(data([alarm], { settings }), MONDAY_6AM).filter((p) => p.kind === 'bedtime');
    expect(reminders).toHaveLength(1);
    // 07:00 Monday − 8 h − 30 min = 22:30 Sunday.
    expect(reminders[0].trigger).toEqual({ type: 'weekly', weekday: 1, hour: 22, minute: 30 });
    expect(reminders[0].body).toBe('Be in bed by 23:00 for 8 h of sleep before your 07:00 alarm.');
  });

  it('gives a last call for coffee hours before bedtime', () => {
    const alarm = { ...newAlarm('a'), days: [1 as const], hour: 7, minute: 0 };
    const settings = { ...emptyData(true).settings, caffeineReminder: true, caffeineHours: 8, sleepGoalMinutes: 480 };
    const coffee = buildPlan(data([alarm], { settings }), MONDAY_6AM).filter((p) => p.id.startsWith('caffeine:'));
    expect(coffee).toHaveLength(1);
    // 07:00 Monday − 8 h sleep − 8 h = 15:00 Sunday.
    expect(coffee[0].trigger).toEqual({ type: 'weekly', weekday: 1, hour: 15, minute: 0 });
    expect(coffee[0].title).toBe('Last call for coffee');
  });

  it('uses the earliest alarm of the morning for the reminder', () => {
    const early = { ...newAlarm('early'), days: [2 as const], hour: 6, minute: 0 };
    const late = { ...newAlarm('late'), days: [2 as const], hour: 9, minute: 0 };
    const settings = { ...emptyData(true).settings, bedtimeReminder: true };
    const reminders = buildPlan(data([late, early], { settings }), MONDAY_6AM).filter((p) => p.kind === 'bedtime');
    expect(reminders).toHaveLength(1);
    expect(reminders[0].alarmId).toBe('early');
  });

  it('schedules snoozes and awake checks from pending events', () => {
    const alarm = newAlarm('a');
    const pending = [
      { id: 's', kind: 'snooze' as const, alarmId: 'a', at: MONDAY_6AM + 60_000, snoozesUsed: 1 },
      { id: 'c', kind: 'awakeCheck' as const, alarmId: 'a', at: MONDAY_6AM + 120_000, snoozesUsed: 0 },
    ];
    const plan = buildPlan(data([alarm], { pending }), MONDAY_6AM);
    expect(plan.find((p) => p.id === 'event:s')?.kind).toBe('snooze');
    expect(plan.find((p) => p.id === 'event:c')?.sound).toBe('chime');
    expect(plan.some((p) => p.id.startsWith('followup:event:s:'))).toBe(true);
  });
});

describe('soundAt', () => {
  it('plays a calm sound, then switches to the 520 Hz tone when it escalates', () => {
    const alarm = { ...newAlarm('a'), sound: 'ocean' as const, mode: 'gentle' as const, escalate: true, escalateAfterMinutes: 2 };
    expect(soundAt(alarm, 'alarm', 30)).toBe('ocean');
    expect(soundAt(alarm, 'alarm', 121)).toBe('deep');
  });

  it('plays a loud sound from the start', () => {
    const alarm = { ...newAlarm('a'), sound: 'air_raid' as const, mode: 'deep' as const };
    expect(soundAt(alarm, 'alarm', 0)).toBe('air_raid');
    expect(phaseAt(alarm, 'alarm', 0)).toBe('deep');
  });

  it('keeps alarms saved before sounds existed on their old tone', () => {
    expect(soundAt({ ...newAlarm('a'), mode: 'deep' }, 'alarm', 0)).toBe('deep');
    expect(soundAt(newAlarm('a'), 'alarm', 0)).toBe('gentle');
  });

  it('rings the 520 Hz tone when you miss the awake check', () => {
    expect(soundAt({ ...newAlarm('a'), sound: 'birds' as const }, 'recheck', 0)).toBe('deep');
  });
});

describe('skip the next one', () => {
  it('schedules the next two weeks one by one, without the skipped ring', () => {
    const alarm: Alarm = { ...newAlarm('w'), hour: 7, minute: 0, days: [1, 2, 3, 4, 5], enabled: true, skip: at(20, 7) };
    const rings = buildPlan(data([alarm]), MONDAY_6AM).filter((p) => p.kind === 'alarm');
    const dates = rings.map((p) => (p.trigger.type === 'date' ? p.trigger.date : null));
    expect(dates).not.toContain(at(20, 7));
    expect(dates).toContain(at(19, 7));
    expect(dates).toContain(at(21, 7));
    expect(rings.every((p) => p.trigger.type === 'date')).toBe(true);
  });
});
