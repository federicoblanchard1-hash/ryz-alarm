import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, TextInput, View } from 'react-native';

import { AmountPicker } from '@/components/AmountPicker';
import { Block, Group, Line, Page, Row, Toggle } from '@/components/SettingsKit';
import { Button, Segmented, Txt, confirm, haptic } from '@/components/ui';
import { scheduleTest } from '@/core/ring';
import { formatHours } from '@/core/time';
import { logOut } from '@/services/account';
import { getLocationPermission, requestLocationPermission, type LocationPermission } from '@/services/weather';
import { useAuth } from '@/state/auth';
import { useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import { FONT, colors, space } from '@/theme';

const SOURCES = [
  { title: 'Low 520 Hz tone wakes deep sleepers', who: 'Bruck & Thomas, Victoria University', url: 'https://vuir.vu.edu.au/3994' },
  { title: 'Melodic alarms and morning grogginess', who: 'McFarlane et al., RMIT, 2020', url: 'https://neurosciencenews.com/alarm-music-grogginess-15625/' },
  { title: 'Snoozing up to 30 minutes', who: 'Sundelin et al., J. Sleep Research, 2023', url: 'https://livescience.com/health/sleep/hitting-snooze-can-boost-morning-cognition-study-hints' },
  { title: 'Sleep inertia: what helps after waking', who: 'Hilditch & McHill, 2019', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6710480/' },
  { title: 'Regular sleep and long-term health', who: 'Windred et al., SLEEP, 2024', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10782489/' },
  { title: 'Adults need 7 hours or more', who: 'AASM & Sleep Research Society, 2015', url: 'https://aasm.org/aasm-and-srs-publish-new-sleep-duration-consensus-statement/' },
  { title: 'How much sleep each age needs', who: 'Hirshkowitz et al., Sleep Health, 2015', url: 'https://pubmed.ncbi.nlm.nih.gov/29073412/' },
  { title: 'The reaction test (PVT)', who: 'Basner & Dinges, SLEEP, 2011', url: 'https://pubmed.ncbi.nlm.nih.gov/21532953/' },
  { title: 'Activity, sleep and how alert you wake', who: 'Vallat et al., Nature Communications, 2022', url: 'https://www.nature.com/articles/s41467-022-34503-2' },
  { title: 'Weather data', who: 'Open-Meteo.com (CC BY 4.0)', url: 'https://open-meteo.com/' },
  { title: 'Place names on web', who: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' },
];

const RELIABILITY_NOTE: Partial<Record<typeof Platform.OS, string>> = {
  ios: 'While Ryz is open, alarms ring even in silent mode. When Ryz is closed they ring as notifications, which follow the silent switch, so keep Ryz open overnight or silent mode off.',
  android: 'Alarms ring at alarm volume and through Do Not Disturb, even when Ryz is closed.',
};

function useLocationPermission() {
  const [state, setState] = useState<LocationPermission | null>(null);
  useEffect(() => {
    const refresh = () => getLocationPermission().then(setState);
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, []);
  const fix = async () => {
    if (state === 'denied') await Linking.openSettings();
    else setState(await requestLocationPermission().catch(() => 'denied' as const));
  };
  return { state, fix };
}

function AccountPage() {
  const { data, updateSettings, reset } = useStore();
  const auth = useAuth();
  const { profile } = data.settings;
  const [name, setName] = useState(profile.name);
  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== profile.name) updateSettings({ profile: { ...profile, name: trimmed } });
  };
  return (
    <Page title="Account">
      <Group note="Your name, news, goals and XP are saved to your account.">
        <Line title="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            placeholder="Your name"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            maxLength={60}
            returnKeyType="done"
            autoCapitalize="words"
            accessibilityLabel="Your name"
          />
        </Line>
        <Line title="Email">
          <Txt variant="caption" numberOfLines={1} style={styles.value}>{auth.email ?? '—'}</Txt>
        </Line>
      </Group>
      {auth.session ? (
        <Group>
          <Row icon="log-out-outline" title="Log out" onPress={() => confirm('Log out?', 'Your alarms stay on this phone. Log in again to keep using Ryz.', 'Log out', () => logOut())} />
        </Group>
      ) : null}
      <Group note="Deletes all alarms, sleep history and settings on this phone. It can’t be undone.">
        <Row
          icon="trash-outline"
          title="Erase all data"
          danger
          onPress={() =>
            confirm('Erase everything?', 'This deletes all alarms, your sleep history and settings. It cannot be undone.', 'Erase', () => {
              haptic('success');
              logOut().catch(() => {});
              reset();
            })
          }
        />
      </Group>
    </Page>
  );
}

function AlarmsPage() {
  const { data, updateSettings } = useStore();
  const { settings } = data;
  return (
    <Page title="Alarms">
      <Group title="Missions" note="When time runs out, the mission starts over and the alarm comes back at full volume.">
        <Block>
          <AmountPicker
            title="Time for each mission"
            value={settings.missionTimeLimitSeconds}
            min={0}
            max={300}
            step={5}
            unit={(n) => (n === 0 ? 'no limit' : `${n} s`)}
            hint={(n) => (n >= 60 ? `${Math.floor(n / 60)} min${n % 60 ? ` ${n % 60} s` : ''}` : null)}
            onChange={(missionTimeLimitSeconds) => updateSettings({ missionTimeLimitSeconds })}
          />
        </Block>
        <Toggle title="Quieter during missions" note="So you can think" value={settings.quietDuringMissions} onChange={(quietDuringMissions) => updateSettings({ quietDuringMissions })} />
        {settings.quietDuringMissions ? (
          <Block>
            <AmountPicker title="Full volume again after" value={settings.missionIdleSeconds} min={5} max={120} unit={(n) => `${n} s idle`} onChange={(missionIdleSeconds) => updateSettings({ missionIdleSeconds })} />
          </Block>
        ) : null}
      </Group>
      <Group title="Waking up" note="Bright light right after waking clears grogginess faster (Hilditch & McHill, 2019).">
        <Toggle title="Bright screen when ringing" value={settings.brightScreen} onChange={(brightScreen) => updateSettings({ brightScreen })} />
        <Toggle title="Daylight reminder" note="A nudge to get light in the first hour" value={settings.morningLight} onChange={(morningLight) => updateSettings({ morningLight })} />
      </Group>
    </Page>
  );
}

function SleepPage() {
  const { data, updateSettings } = useStore();
  const { settings } = data;
  return (
    <Page title="Sleep">
      <Group note="Adults need at least 7 hours. Ryz uses your goal to suggest a bedtime.">
        <Block>
          <AmountPicker title="Sleep goal" value={settings.sleepGoalMinutes} min={240} max={720} step={15} unit={(n) => `${n} min`} hint={formatHours} onChange={(sleepGoalMinutes) => updateSettings({ sleepGoalMinutes })} />
        </Block>
      </Group>
      <Group title="Reminders" note="Even 6 hours before bed, caffeine can cost an hour of sleep.">
        <Toggle title="Bedtime" note="Before your earliest alarm" value={settings.bedtimeReminder} onChange={(bedtimeReminder) => updateSettings({ bedtimeReminder })} />
        {settings.bedtimeReminder ? (
          <Block>
            <AmountPicker title="How long before" value={settings.reminderLeadMinutes} min={5} max={180} step={5} unit={(n) => `${n} min`} hint={(n) => (n >= 60 ? formatHours(n) : null)} onChange={(reminderLeadMinutes) => updateSettings({ reminderLeadMinutes })} />
          </Block>
        ) : null}
        <Toggle title="Last call for coffee" value={settings.caffeineReminder} onChange={(caffeineReminder) => updateSettings({ caffeineReminder })} />
        {settings.caffeineReminder ? (
          <Block>
            <AmountPicker title="Hours before bedtime" value={settings.caffeineHours} min={3} max={12} unit={(n) => `${n} h`} onChange={(caffeineHours) => updateSettings({ caffeineHours })} />
          </Block>
        ) : null}
      </Group>
    </Page>
  );
}

function GeneralPage() {
  const { data, updateSettings } = useStore();
  const location = useLocationPermission();
  const { settings } = data;
  const located = location.state === 'granted';
  return (
    <Page title="General">
      <Group>
        <Toggle title="24-hour clock" value={settings.use24h} onChange={(use24h) => updateSettings({ use24h })} />
        <Line title="Temperature">
          <Segmented
            label="Temperature"
            value={settings.tempUnit}
            onChange={(tempUnit) => updateSettings({ tempUnit })}
            options={[
              { value: 'C', label: '°C' },
              { value: 'F', label: '°F' },
            ]}
          />
        </Line>
      </Group>
      <Group note="For the weather on Home.">
        <Row icon="location-outline" title="Location" value={located ? 'On' : location.state === 'denied' ? 'Off · Settings' : 'Allow'} dot={located ? 'ok' : 'warn'} onPress={located ? () => {} : location.fix} />
      </Group>
    </Page>
  );
}

function CheckPage() {
  const { update } = useStore();
  const permissions = usePermissions();
  const ok = permissions.state?.notifications === 'granted';
  return (
    <Page title="Will my alarm ring?">
      {permissions.supported ? (
        <Group note={RELIABILITY_NOTE[Platform.OS]}>
          <Row icon="notifications-outline" title="Notifications" detail={ok ? 'Alarms ring when Ryz is closed' : 'Alarms only ring while Ryz is open'} value={ok ? 'On' : 'Allow'} dot={ok ? 'ok' : 'warn'} onPress={ok ? () => {} : permissions.fix} />
        </Group>
      ) : (
        <Txt variant="caption">This is the web preview: alarms only ring while this tab is open.</Txt>
      )}
      <View style={styles.test}>
        <Button
          title={permissions.supported ? 'Test alarm in 1 minute' : 'Test alarm in 5 seconds'}
          variant="secondary"
          icon="alarm-outline"
          onPress={() => {
            haptic('light');
            update((d, now) => scheduleTest(d, now, permissions.supported ? 60 : 5));
          }}
        />
        <Txt variant="caption" style={styles.center}>{permissions.supported ? 'Lock your phone after tapping to hear it.' : 'Keep this tab open to hear it.'}</Txt>
      </View>
    </Page>
  );
}

function ResearchPage() {
  return (
    <Page title="The research">
      <Group>
        {SOURCES.map((s) => (
          <Row key={s.url} icon="document-text-outline" title={s.title} detail={s.who} end="open-outline" onPress={() => Linking.openURL(s.url)} />
        ))}
      </Group>
    </Page>
  );
}

const PAGES: Record<string, () => React.JSX.Element> = {
  account: AccountPage,
  alarms: AlarmsPage,
  sleep: SleepPage,
  general: GeneralPage,
  check: CheckPage,
  research: ResearchPage,
};

/** One Settings page: /settings/alarms, /settings/sleep… */
export default function SettingsPage() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const Screen = PAGES[page ?? ''];
  if (!Screen) return <Redirect href="/settings" />;
  return <Screen />;
}

const styles = StyleSheet.create({
  input: { flex: 1, textAlign: 'right', fontSize: 15, fontFamily: FONT.light, color: colors.text, paddingVertical: space.sm },
  value: { flex: 1, textAlign: 'right' },
  test: { gap: space.sm },
  center: { textAlign: 'center' },
});
