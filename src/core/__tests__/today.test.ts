import { emptyData } from '../defaults';
import { energyAt, nightsToShow, nowAndNext, planDay, planSteps, sampleNights, usualWake, wakeRhythm } from '../today';
import type { SleepRecord } from '../types';

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).getTime();
const night = (day: number, wakeH: number, wakeM = 0, hours = 8): SleepRecord => ({ id: `n${day}`, start: at(day, wakeH, wakeM) - hours * 3600_000, end: at(day, wakeH, wakeM) });
const clock = (ms: number) => {
  const d = new Date(ms);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

describe('energy', () => {
  it('starts groggy, peaks in the late morning, dips after lunch and falls toward night', () => {
    const wake = energyAt(0, 0, 0);
    const morning = energyAt(3, 0, 0);
    const dip = energyAt(7.5, 0, 0);
    const evening = energyAt(11, 0, 0);
    const late = energyAt(16, 0, 0);
    expect(wake).toBeLessThan(morning);
    expect(dip).toBeLessThan(morning);
    expect(dip).toBeLessThan(evening);
    expect(late).toBeLessThan(evening);
  });

  it('is lower all day with sleep debt', () => {
    for (const h of [1, 3, 8, 12]) expect(energyAt(h, 300, 60)).toBeLessThan(energyAt(h, 0, 0));
  });
});

describe('planDay', () => {
  const data = { ...emptyData(true), sleep: [night(18, 7), night(19, 7, 10), night(20, 6, 50), night(21, 7, 0, 6)] };

  it('plans from this morning’s wake-up and tonight’s bedtime', () => {
    const plan = planDay(data, at(21, 9));
    expect(plan.wakeFrom).toBe('night');
    expect(clock(plan.wake)).toBe('7:00');
    expect(plan.lastNightMinutes).toBe(360);
    // No alarm: 24 h after waking, minus an 8 h goal.
    expect(clock(plan.bed)).toBe('23:00');
    expect(clock(plan.focus.from)).toBe('9:00');
    expect(clock(plan.windDown)).toBe('22:00');
    // A short night makes the grogginess last longer than half an hour.
    expect(plan.groggyUntil - plan.wake).toBeGreaterThan(30 * 60_000);
  });

  it('puts the last coffee at least 6 hours before bed', () => {
    const plan = planDay({ ...data, settings: { ...data.settings, caffeineHours: 3 } }, at(21, 9));
    expect(plan.bed - plan.lastCoffee).toBe(6 * 3600_000);
  });

  it('uses the usual wake-up before you’ve woken today', () => {
    const plan = planDay(data, at(22, 5));
    expect(plan.wakeFrom).toBe('usual');
    expect(clock(plan.wake)).toBe('7:00');
  });

  it('falls back to 7:00 with nothing to go on', () => {
    expect(clock(planDay(emptyData(true), at(22, 10)).wake)).toBe('7:00');
  });

  it('marks steps as past, now or next', () => {
    const plan = planDay(data, at(21, 10));
    const steps = planSteps(plan, at(21, 10));
    expect(steps.find((s) => s.id === 'groggy')?.state).toBe('past');
    expect(steps.find((s) => s.id === 'focus')?.state).toBe('now');
    expect(steps.find((s) => s.id === 'bed')?.state).toBe('next');
  });
});

describe('wake-up rhythm', () => {
  it('counts mornings in a row within 30 minutes of the usual time', () => {
    const list = [night(15, 7), night(16, 9, 30), night(17, 7, 10), night(18, 6, 50), night(19, 7), night(20, 7, 20)];
    expect(usualWake(list, at(20, 12))).toBe(7 * 60 + 10);
    const r = wakeRhythm(list, at(20, 12));
    expect(r.streak).toBe(4);
    expect(r.week.slice(-6)).toEqual(['on', 'off', 'on', 'on', 'on', 'on']);
  });

  it('needs three nights first', () => {
    expect(wakeRhythm([night(19, 7)], at(20, 12)).usual).toBeNull();
  });
});

describe('sample nights', () => {
  it('fills three weeks, ending last night, near the goal', () => {
    const nights = sampleNights(at(21, 12), 480);
    expect(nights).toHaveLength(21);
    expect(new Date(nights.at(-1)!.end).getDate()).toBe(21);
    expect(nights.every((n) => n.end - n.start > 6 * 3600_000)).toBe(true);
  });

  it('shows only until you have three nights of your own', () => {
    const d = emptyData(true);
    expect(nightsToShow(d, at(21, 12)).sample).toBe(true);
    expect(nightsToShow({ ...d, sleep: [night(18, 7), night(19, 7), night(20, 7)] }, at(21, 12)).sample).toBe(false);
    expect(nightsToShow({ ...d, settings: { ...d.settings, sampleSleep: false } }, at(21, 12)).sample).toBe(false);
  });
});

describe('right now', () => {
  const data = { ...emptyData(true), sleep: [night(18, 7), night(19, 7), night(20, 7), night(21, 7)] };

  it('names what’s happening and what comes next', () => {
    const plan = planDay(data, at(21, 10));
    const nn = nowAndNext(plan, at(21, 10));
    expect(nn.now).toBe('focus');
    expect(nn.next?.id).toBe('dip');
  });

  it('calls the gaps between steps steady', () => {
    const plan = planDay(data, at(21, 12));
    expect(nowAndNext(plan, at(21, 12)).now).toBe('steady');
  });

  it('says it’s time to sleep after bedtime', () => {
    const plan = planDay(data, at(21, 23, 30));
    expect(nowAndNext(plan, at(21, 23, 30)).now).toBe('night');
  });
});
