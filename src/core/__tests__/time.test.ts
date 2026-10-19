import { newAlarm } from '../defaults';
import { formatClockText, formatDays, formatSpan, nextOccurrence, previousOccurrence } from '../time';

// Monday 19 October 2026, local time.
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).getTime();

describe('nextOccurrence', () => {
  it('finds later today on a matching weekday', () => {
    const alarm = { ...newAlarm('a'), hour: 7, minute: 30 };
    expect(nextOccurrence(alarm, at(19, 6))).toBe(at(19, 7, 30));
  });

  it('skips to the next matching weekday once today has passed', () => {
    const alarm = { ...newAlarm('a'), hour: 7, minute: 0, days: [1 as const] };
    expect(nextOccurrence(alarm, at(19, 7))).toBe(at(26, 7));
  });

  it('jumps the weekend for a weekday alarm', () => {
    const alarm = { ...newAlarm('a'), hour: 7, minute: 0 };
    expect(nextOccurrence(alarm, at(23, 8))).toBe(at(26, 7));
  });

  it('uses the stored date for a one-time alarm', () => {
    const alarm = { ...newAlarm('a'), days: [], date: at(20, 6) };
    expect(nextOccurrence(alarm, at(19, 23))).toBe(at(20, 6));
    expect(nextOccurrence(alarm, at(20, 7))).toBeNull();
  });

  it('is null when the alarm is off', () => {
    expect(nextOccurrence({ ...newAlarm('a'), enabled: false }, at(19, 6))).toBeNull();
  });
});

describe('previousOccurrence', () => {
  it('includes an alarm ringing exactly now', () => {
    const alarm = { ...newAlarm('a'), hour: 7, minute: 0 };
    expect(previousOccurrence(alarm, at(19, 7))).toBe(at(19, 7));
  });

  it('looks back past the weekend', () => {
    const alarm = { ...newAlarm('a'), hour: 7, minute: 0 };
    expect(previousOccurrence(alarm, at(18, 12))).toBe(at(16, 7));
  });
});

describe('formatting', () => {
  it('formats 12 and 24 hour clocks', () => {
    expect(formatClockText(0, 5, false)).toBe('12:05 AM');
    expect(formatClockText(13, 0, false)).toBe('1:00 PM');
    expect(formatClockText(7, 30, true)).toBe('07:30');
  });

  it('names common day sets', () => {
    expect(formatDays([])).toBe('Once');
    expect(formatDays([1, 2, 3, 4, 5])).toBe('Weekdays');
    expect(formatDays([0, 6])).toBe('Weekends');
    expect(formatDays([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(formatDays([5, 1, 3])).toBe('Mon, Wed, Fri');
  });

  it('describes time spans', () => {
    expect(formatSpan(30_000)).toBe('less than a minute');
    expect(formatSpan(45 * 60_000)).toBe('45 min');
    expect(formatSpan(8 * 3_600_000 + 12 * 60_000)).toBe('8 h 12 min');
  });
});
