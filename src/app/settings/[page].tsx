import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AmountPicker } from '@/components/AmountPicker';
import { Block, Group, Line, Page, Row, Toggle } from '@/components/SettingsKit';
import { Button, Segmented, Txt, confirm, haptic } from '@/components/ui';
import { AppIconTile } from '@/components/AppIconTile';
import { APP_ICON, APP_ICONS, type AppIconId } from '@/core/appIcons';
import { MUSIC_SERVICE_NAME, parseMusicLink } from '@/core/music';
import { scheduleTest } from '@/core/ring';
import { formatHours } from '@/core/time';
import { logOut, resetPassword } from '@/services/account';
import { canChangeIcon, currentIcon, setIcon } from '@/services/appIcon';
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

function notice(title: string, text: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n\n${text}`);
  else Alert.alert(title, text);
}

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
  // Once it's been answered, only the phone's Settings can change it (that's how iOS and Android work).
  const fix = async () => {
    if (state === 'granted' || state === 'denied') await openPhoneSettings();
    else setState(await requestLocationPermission().catch(() => 'denied' as const));
  };
  return { state, fix };
}

/** The phone's Settings page for Ryz, where permissions are changed. The web preview has none. */
async function openPhoneSettings() {
  if (Platform.OS === 'web') return;
  await Linking.openSettings().catch(() => {});
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
      <Group note="Your alarms, nights, moods, goals and XP are backed up to your account, so a new phone or a reinstall gets them back.">
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
          <Txt variant="caption" numberOfLines={1} style={styles.value}>{auth.email ?? 'No account'}</Txt>
        </Line>
      </Group>
      {auth.session && auth.email ? (
        <Group note="Your email is how you log in, so it can’t be changed here. To use another one, create a new account.">
          <Row
            icon="key-outline"
            title="Change password"
            detail="We email you a link to set a new one"
            onPress={() =>
              confirm('Change password?', `We’ll send a link to ${auth.email}.`, 'Send link', () => {
                resetPassword(auth.email!)
                  .then(() => notice('Check your email', `Open the link we sent to ${auth.email} to set a new password.`))
                  .catch((e) => notice('Couldn’t send the email', e instanceof Error ? e.message : 'Try again in a minute.'));
              })
            }
          />
          <Row icon="log-out-outline" title="Log out" detail="Everything stays on this phone" onPress={() => confirm('Log out?', 'Everything stays on this phone and keeps working. Log in again any time to back it up.', 'Log out', () => logOut())} />
        </Group>
      ) : auth.enabled ? (
        <Group note="Optional. Without an account everything still works, but only on this phone.">
          <Row icon="person-add-outline" title="Create an account" detail="Back up your alarms, nights, moods and XP" onPress={() => router.push({ pathname: '/account', params: { mode: 'signup' } })} />
          <Row icon="log-in-outline" title="Log in" detail="Bring back what you had on another phone" onPress={() => router.push({ pathname: '/account', params: { mode: 'login' } })} />
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

/** Paste a link from a music app's Share button; it opens once you're up. */
function MorningMusic() {
  const { data, updateSettings } = useStore();
  const { morningMusic, morningMusicAuto } = data.settings;
  const [text, setText] = useState(morningMusic?.url ?? '');
  const parsed = parseMusicLink(text);
  const save = () => {
    if (!text.trim()) return updateSettings({ morningMusic: null });
    if (parsed && parsed.url !== morningMusic?.url) updateSettings({ morningMusic: parsed });
  };
  return (
    <Group
      title="Morning music"
      note="Music you like right after waking cuts grogginess (McFarlane et al., 2020). In Spotify or Apple Music, tap Share → Copy link on a song or playlist and paste it here. It plays in that app, so keep it installed."
    >
      <Line title="Link">
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={save}
          onSubmitEditing={save}
          placeholder="Paste a Spotify or Apple Music link"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel="Morning music link"
        />
      </Line>
      {text.trim() && !parsed ? <Txt variant="caption" style={styles.warn}>That doesn’t look like a Spotify, Apple Music, YouTube Music, Deezer or SoundCloud link.</Txt> : null}
      {morningMusic ? <Row icon="play-circle-outline" title={`Play on ${MUSIC_SERVICE_NAME[morningMusic.service]}`} detail="Try it now" onPress={() => Linking.openURL(morningMusic.url).catch(() => {})} /> : null}
      {morningMusic ? <Toggle title="Start it when I’m up" note="Opens it when you tap “I’m up” after your alarm" value={morningMusicAuto} onChange={(morningMusicAuto) => updateSettings({ morningMusicAuto })} /> : null}
    </Group>
  );
}

function AlarmsPage() {
  const { data, updateSettings } = useStore();
  const { settings } = data;
  return (
    <Page title="Alarms">
      <Group title="Missions" note="The alarm stays silent while you work on a mission. If you stop, or the time runs out, it rings again until you finish. Set 0 for no time limit.">
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
        <Toggle title="Silent during missions" note="So you can think" value={settings.quietDuringMissions} onChange={(quietDuringMissions) => updateSettings({ quietDuringMissions })} />
        {settings.quietDuringMissions ? (
          <Block>
            <AmountPicker title="Rings again if you stop for" value={settings.missionIdleSeconds} min={5} max={120} unit={(n) => `${n} s`} onChange={(missionIdleSeconds) => updateSettings({ missionIdleSeconds })} />
          </Block>
        ) : null}
      </Group>
      <Group title="Waking up" note="Bright light right after waking clears grogginess faster (Hilditch & McHill, 2019).">
        <Toggle title="Bright screen when ringing" note="Full brightness while it rings" value={settings.brightScreen} onChange={(brightScreen) => updateSettings({ brightScreen })} />
        <Toggle title="Daylight reminder" note="A nudge after you stop the alarm to get light in the first hour" value={settings.morningLight} onChange={(morningLight) => updateSettings({ morningLight })} />
      </Group>
      <MorningMusic />
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
      <Group title="Reminders" note="Reminders are notifications, so they need notifications on. Even 6 hours before bed, caffeine can cost an hour of sleep.">
        <Toggle title="Bedtime" note="Before your earliest alarm" value={settings.bedtimeReminder} onChange={(bedtimeReminder) => updateSettings({ bedtimeReminder })} />
        {settings.bedtimeReminder ? (
          <Block>
            <AmountPicker title="How long before" value={settings.reminderLeadMinutes} min={5} max={180} step={5} unit={(n) => `${n} min`} hint={(n) => (n >= 60 ? formatHours(n) : null)} onChange={(reminderLeadMinutes) => updateSettings({ reminderLeadMinutes })} />
          </Block>
        ) : null}
        <Toggle title="Last call for coffee" note="Also sets “Last coffee” on Today" value={settings.caffeineReminder} onChange={(caffeineReminder) => updateSettings({ caffeineReminder })} />
        {settings.caffeineReminder ? (
          <Block>
            <AmountPicker title="Hours before bedtime" value={settings.caffeineHours} min={3} max={12} unit={(n) => `${n} h`} onChange={(caffeineHours) => updateSettings({ caffeineHours })} />
          </Block>
        ) : null}
      </Group>
      <Group title="Tracking" note={settings.smartwatch ? 'Turn the watch on or off from the Sleep tab.' : 'Sample nights show until you’ve tracked 3 of your own.'}>
        <Row icon="watch-outline" title="Smartwatch" detail={settings.smartwatch ? (settings.watchName ? `Connected · ${settings.watchName}` : `On · waiting for the first night`) : 'Off · nights come from the Start sleep button'} onPress={() => router.navigate('/sleep')} />
        <Toggle title="Sample nights" note="Preview Sleep and Today before you have data" value={settings.sampleSleep} onChange={(sampleSleep) => updateSettings({ sampleSleep })} />
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
        <Row icon="apps-outline" title="App icon" detail="Everyday, or one for each season" value={APP_ICON[currentIcon()].title} onPress={() => router.push({ pathname: '/settings/[page]', params: { page: 'icon' } })} />
      </Group>
      <Group>
        <Toggle title="24-hour clock" note="On every screen, alarms and notifications" value={settings.use24h} onChange={(use24h) => updateSettings({ use24h })} />
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
      <Group note={Platform.OS === 'web' ? 'In the web preview, change location in your browser’s site settings.' : 'Only used for the weather on Morning, and never saved or shared. Once you’ve answered, your phone keeps the choice, so turning it on or off happens in its Settings.'}>
        <Row
          icon="location-outline"
          title="Location"
          detail={located ? 'On · tap to change it in Settings' : location.state === 'denied' ? 'Off · tap to turn it on in Settings' : 'Not asked yet · tap to allow'}
          value={located ? 'On' : location.state === 'denied' ? 'Off' : 'Allow'}
          dot={located ? 'ok' : 'warn'}
          onPress={location.fix}
        />
      </Group>
    </Page>
  );
}

/** Pick the app icon: the everyday one or a seasonal one. The rz never changes, only the colour and one small detail. */
function IconPage() {
  const { data, updateSettings } = useStore();
  const [current, setCurrent] = useState<AppIconId>(() => currentIcon());
  const supported = canChangeIcon();
  const pick = async (id: AppIconId) => {
    haptic('select');
    if (!supported) {
      notice('Needs the full app', 'Changing the icon needs the full Ryz app (a store or development build). In Expo Go you can see them here, but not switch.');
      return;
    }
    try {
      if (await setIcon(id)) setCurrent(id);
    } catch {
      notice('Couldn’t change the icon', 'Try again in a moment.');
    }
  };
  return (
    <Page title="App icon">
      <View style={styles.icons}>
        {APP_ICONS.map((icon) => (
          <Pressable key={icon.id} onPress={() => pick(icon.id)} accessibilityRole="radio" accessibilityState={{ selected: current === icon.id }} accessibilityLabel={icon.title} style={styles.iconCell}>
            <View style={[styles.iconRing, current === icon.id && styles.iconRingOn]}>
              <AppIconTile id={icon.id} size={64} />
            </View>
            <Txt variant="caption" style={[styles.center, current === icon.id && styles.iconOn]}>{icon.title}</Txt>
          </Pressable>
        ))}
      </View>
      <Group note={supported ? 'On iPhone, a short message confirms the change. That message comes from iOS, not Ryz.' : 'Switching needs the full Ryz app, not Expo Go.'}>
        <Toggle
          title="Suggest seasonal icons"
          note="A small card on Morning when Halloween, Christmas or a new season starts"
          value={data.settings.seasonalIcons}
          onChange={(seasonalIcons) => updateSettings({ seasonalIcons })}
        />
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
          <Row
            icon="notifications-outline"
            title="Notifications"
            detail={ok ? 'Alarms ring when Ryz is closed · tap to change in Settings' : 'Off: alarms only ring while Ryz is open · tap to fix'}
            value={ok ? 'On' : 'Allow'}
            dot={ok ? 'ok' : 'warn'}
            onPress={ok ? openPhoneSettings : permissions.fix}
          />
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
  icon: IconPage,
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
  icons: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  iconCell: { width: '25%', alignItems: 'center', gap: space.xs },
  iconRing: { padding: 3, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  iconRingOn: { borderColor: colors.text },
  iconOn: { color: colors.text },
  warn: { color: colors.danger, paddingBottom: space.sm },
  center: { textAlign: 'center' },
});
