import { emptyData, newAlarm } from '../defaults';
import { isPro, proStatus, proThingsInUse, reconcilePro, trialJustEnded } from '../pro';
import type { AppData } from '../types';

const DAY = 864e5;
const now = new Date(2026, 9, 20, 9).getTime();

describe('Pro trial', () => {
  it('starts 14 days of Pro once onboarding is done', () => {
    const fresh = emptyData(true);
    expect(reconcilePro(fresh, now)).toBe(fresh);
    const started = reconcilePro({ ...fresh, settings: { ...fresh.settings, onboarded: true } }, now);
    expect(started.trialStartedAt).toBe(now);
    expect(proStatus(started, now + 3 * DAY)).toEqual({ kind: 'trial', until: now + 14 * DAY, daysLeft: 11 });
    expect(isPro(started, now + 15 * DAY)).toBe(false);
  });

  it('says so once when it ends, listing the Pro things in use', () => {
    const d: AppData = {
      ...emptyData(true),
      trialStartedAt: now - 15 * DAY,
      alarms: [{ ...newAlarm('a'), sound: 'klaxon', missions: [{ type: 'qr', amount: 1, level: 1 }] }],
    };
    expect(trialJustEnded(d, now)).toBe(true);
    expect(trialJustEnded({ ...d, trialEndSeen: true }, now)).toBe(false);
    expect(proThingsInUse(d)).toEqual(['1 Pro mission in your alarms', '1 Pro sound']);
  });

  it('a paid or XP pass counts as Pro', () => {
    expect(proStatus({ ...emptyData(true), proUntil: now + DAY }, now).kind).toBe('pro');
  });
});
