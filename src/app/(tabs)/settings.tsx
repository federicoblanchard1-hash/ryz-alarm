import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountPicker } from '@/components/AmountPicker';
import { useTabBarSpace } from '@/components/tabBarSpace';
import { Button, Chips, Divider, Section, ToggleRow, Txt, haptic } from '@/components/ui';
import { AGE_GROUPS } from '@/core/defaults';
import { GOALS } from '@/core/goals';
import { topicById } from '@/core/news';
import { scheduleTest } from '@/core/ring';
import { formatHours } from '@/core/time';
import { getLocationPermission, requestLocationPermission, type LocationPermission } from '@/services/weather';
import { logOut } from '@/services/account';
import { useAuth } from '@/state/auth';
import { useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import type { AgeGroup } from '@/core/types';
import { FONT, colors, radius, space } from '@/theme';

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


function confirm(title: string, message: string, action: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onYes },
  ]);
}

/** Name and age, kept on this phone. Age sets the recommended sleep goal. */
function Profile() {
  const { data, updateSettings } = useStore();
  const { profile, sleepGoalMinutes } = data.settings;
  const [name, setName] = useState(profile.name);
  const age = profile.ageGroup ? AGE_GROUPS[profile.ageGroup] : null;
  const initials = profile.name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed !== profile.name) updateSettings({ profile: { ...profile, name: trimmed } });
  };

  return (
    <View style={styles.profile}>
      <View style={styles.profileTop}>
        <View style={styles.avatar}>{initials ? <Text style={styles.initials}>{initials}</Text> : <Ionicons name="person" size={30} color={colors.textMuted} />}</View>
        <View style={styles.flex}>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            placeholder="Your name"
            placeholderTextColor={colors.textFaint}
            style={styles.nameInput}
            maxLength={30}
            returnKeyType="done"
            autoCapitalize="words"
            accessibilityLabel="Your name"
          />
          <Txt variant="caption">Saved on this phone only. No sign-up, nothing leaves your phone.</Txt>
        </View>
      </View>
      <Chips<AgeGroup | 'none'>
        title="Your age"
        value={profile.ageGroup ?? 'none'}
        onChange={(v) => updateSettings({ profile: { ...profile, ageGroup: v === 'none' ? null : v } })}
        options={(Object.keys(AGE_GROUPS) as AgeGroup[]).map((id) => ({ value: id, label: AGE_GROUPS[id].title }))}
      />
      {age ? (
        <View style={styles.recommend}>
          <Txt variant="caption" style={styles.flex}>{`Recommended for your age: ${age.range[0]}–${age.range[1]} hours a night.`}</Txt>
          {sleepGoalMinutes !== age.goal ? (
            <Pressable onPress={() => updateSettings({ sleepGoalMinutes: age.goal })} hitSlop={8} accessibilityRole="button">
              <Txt variant="heading">{`Use ${formatHours(age.goal)}`}</Txt>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const RELIABILITY_NOTE: Partial<Record<typeof Platform.OS, string>> = {
  ios: 'While Ryz is open, alarms ring even in silent mode. When Ryz is closed they ring as notifications, which follow the silent switch, so keep Ryz open overnight or silent mode off.',
  android: 'Alarms ring at alarm volume and through Do Not Disturb, even when Ryz is closed.',
};

function StatusRow({ ok, title, detail, action, onAction }: { ok: boolean; title: string; detail: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.status}>
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={22} color={ok ? colors.text : colors.danger} />
      <View style={styles.flex}>
        <Txt variant="body">{title}</Txt>
        <Txt variant="caption">{detail}</Txt>
      </View>
      {!ok && action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" style={styles.statusAction}>
          <Txt variant="heading">{action}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

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

export default function SettingsScreen() {
  const { data, updateSettings, update, reset } = useStore();
  const auth = useAuth();
  const permissions = usePermissions();
  const location = useLocationPermission();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { settings } = data;
  const notificationsOk = permissions.state?.notifications === 'granted';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Txt variant="largeTitle" style={styles.title} accessibilityRole="header">Settings</Txt>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabSpace + space.xl }]} keyboardShouldPersistTaps="handled">
        <Section label="Account" footer={auth.session ? 'Your name, age, news topics and goals are saved to your account and come back when you log in on another phone.' : 'Create an account to keep your profile, news topics and goals when you change phone.'}>
          {auth.session ? (
            <>
              <View style={styles.status}>
                <Ionicons name="person-circle-outline" size={26} color={colors.text} />
                <View style={styles.flex}>
                  <Txt variant="body">Signed in</Txt>
                  <Txt variant="caption">{auth.email ?? ''}</Txt>
                </View>
              </View>
              <Divider />
              <Pressable onPress={() => confirm('Log out?', 'Your alarms stay on this phone. Log in again any time.', 'Log out', () => logOut())} accessibilityRole="button" style={styles.status}>
                <Ionicons name="log-out-outline" size={22} color={colors.text} />
                <Txt variant="row" style={styles.flex}>Log out</Txt>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => router.push({ pathname: '/account', params: { mode: 'login' } })} accessibilityRole="button" style={styles.status}>
              <Ionicons name="person-circle-outline" size={26} color={colors.text} />
              <View style={styles.flex}>
                <Txt variant="body">Log in or create an account</Txt>
                <Txt variant="caption">{auth.enabled ? 'Not signed in' : 'Accounts are off in this build'}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </Pressable>
          )}
        </Section>

        <Section label="Profile">
          <Profile />
        </Section>

        <Section label="Your goals">
          <Pressable onPress={() => router.push('/goals')} accessibilityRole="button" style={styles.status}>
            <Ionicons name="flag-outline" size={22} color={colors.text} />
            <View style={styles.flex}>
              <Txt variant="body">What you want to improve</Txt>
              <Txt variant="caption">
                {settings.goals.length ? settings.goals.map((id) => (id === 'other' && settings.goalOther ? settings.goalOther : GOALS.find((g) => g.id === id)?.title ?? id)).join(', ') : 'Not picked yet'}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
          </Pressable>
        </Section>

        <Section label="Missions" footer="When time runs out, the mission starts over with a new puzzle and the alarm comes back at full volume.">
          <View style={styles.picker}>
            <AmountPicker
              title="Time for each mission (0 = no limit)"
              value={settings.missionTimeLimitSeconds}
              min={0}
              max={300}
              step={5}
              unit={(n) => (n === 0 ? '0 no limit' : `${n} seconds`)}
              hint={(n) => (n >= 60 ? `${Math.floor(n / 60)} min${n % 60 ? ` ${n % 60} s` : ''}` : null)}
              onChange={(missionTimeLimitSeconds) => updateSettings({ missionTimeLimitSeconds })}
            />
          </View>
          <Divider />
          <ToggleRow title="Quieter during missions" description="Turns the alarm down while you work, so you can think" value={settings.quietDuringMissions} onChange={(quietDuringMissions) => updateSettings({ quietDuringMissions })} />
          {settings.quietDuringMissions ? (
            <View style={styles.picker}>
              <AmountPicker title="Full volume again if you stop for" value={settings.missionIdleSeconds} min={5} max={120} unit={(n) => `${n} seconds`} onChange={(missionIdleSeconds) => updateSettings({ missionIdleSeconds })} />
            </View>
          ) : null}
        </Section>

        <Section label="Waking up" footer="Bright light right after waking helps clear grogginess faster (Hilditch & McHill, 2019).">
          <ToggleRow title="Bright screen when ringing" description="Turns the screen up to full brightness" value={settings.brightScreen} onChange={(brightScreen) => updateSettings({ brightScreen })} />
          <Divider />
          <ToggleRow title="Daylight reminder" description="After you stop the alarm, a nudge to get light in the first hour" value={settings.morningLight} onChange={(morningLight) => updateSettings({ morningLight })} />
        </Section>

        <Section label="Sleep" footer="Adults need at least 7 hours a night. Ryz uses your goal to suggest a bedtime.">
          <View style={styles.picker}>
            <AmountPicker
              title="Sleep goal"
              value={settings.sleepGoalMinutes}
              min={240}
              max={720}
              step={15}
              unit={(n) => `${n} minutes`}
              hint={formatHours}
              onChange={(sleepGoalMinutes) => updateSettings({ sleepGoalMinutes })}
            />
          </View>
          <Divider />
          <ToggleRow title="Bedtime reminder" description="Before the earliest alarm of each morning" value={settings.bedtimeReminder} onChange={(bedtimeReminder) => updateSettings({ bedtimeReminder })} />
          {settings.bedtimeReminder ? (
            <View style={styles.picker}>
              <AmountPicker
                title="Remind me before bedtime"
                value={settings.reminderLeadMinutes}
                min={5}
                max={180}
                step={5}
                unit={(n) => `${n} minutes`}
                hint={(n) => (n >= 60 ? formatHours(n) : null)}
                onChange={(reminderLeadMinutes) => updateSettings({ reminderLeadMinutes })}
              />
            </View>
          ) : null}
        </Section>

        <Section label="Display">
          <ToggleRow title="24-hour clock" value={settings.use24h} onChange={(use24h) => updateSettings({ use24h })} />
          <Divider />
          <Chips
            title="Temperature"
            value={settings.tempUnit}
            onChange={(tempUnit) => updateSettings({ tempUnit })}
            options={[
              { value: 'C', label: '°C' },
              { value: 'F', label: '°F' },
            ]}
          />
        </Section>

        <Section label="Will my alarm ring?" footer={RELIABILITY_NOTE[Platform.OS]}>
          {permissions.supported ? (
            <>
              <StatusRow
                ok={notificationsOk}
                title="Notifications"
                detail={notificationsOk ? 'On — alarms ring when Ryz is closed' : 'Off — alarms only ring while Ryz is open'}
                action={permissions.state?.notifications === 'denied' ? 'Settings' : 'Allow'}
                onAction={permissions.fix}
              />
              <Divider />
            </>
          ) : (
            <Txt variant="caption" style={styles.webNote}>
              This is the web preview: alarms only ring while this tab is open. Install the app on a phone for real alarms.
            </Txt>
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
            <Txt variant="caption">{permissions.supported ? 'Lock your phone after tapping to hear how it wakes you.' : 'Keep this tab open to hear it.'}</Txt>
          </View>
        </Section>

        <Section label="News">
          <Pressable onPress={() => router.push('/interests')} accessibilityRole="button" style={styles.status}>
            <Ionicons name="newspaper-outline" size={22} color={colors.text} />
            <View style={styles.flex}>
              <Txt variant="body">Topics</Txt>
              <Txt variant="caption">
                {settings.newsTopics && settings.newsTopics.length > 0 ? `${settings.newsTopics.length} picked: ${settings.newsTopics.map((id) => topicById(id)?.title ?? id).slice(0, 4).join(', ')}${settings.newsTopics.length > 4 ? '…' : ''}` : 'Off — tap to pick what you like to read'}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
          </Pressable>
        </Section>

        <Section label="Weather">
          <StatusRow
            ok={location.state === 'granted'}
            title="Location"
            detail={location.state === 'granted' ? 'On — Home shows the weather where you are' : 'Off — Home can’t show your weather'}
            action={location.state === 'denied' ? 'Settings' : 'Allow'}
            onAction={location.fix}
          />
        </Section>

        <Section label="Your data" footer="Ryz keeps alarms, sleep history and your profile on this phone only. Nothing is uploaded.">
          <Pressable
            onPress={() =>
              confirm('Erase everything?', 'This deletes all alarms, your sleep history and settings. It cannot be undone.', 'Erase', () => {
                haptic('success');
                logOut().catch(() => {});
                reset();
              })
            }
            accessibilityRole="button"
            style={styles.status}
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
            <Txt variant="row" style={[styles.flex, styles.danger]}>Erase all data</Txt>
          </Pressable>
        </Section>

        <Section label="The research behind Ryz">
          {SOURCES.map((s, i) => (
            <View key={s.url}>
              {i > 0 ? <Divider /> : null}
              <Pressable onPress={() => Linking.openURL(s.url)} accessibilityRole="link" style={styles.source}>
                <View style={styles.flex}>
                  <Txt variant="body">{s.title}</Txt>
                  <Txt variant="caption">{s.who}</Txt>
                </View>
                <Ionicons name="open-outline" size={18} color={colors.textFaint} />
              </Pressable>
            </View>
          ))}
        </Section>

        <Txt variant="caption" style={styles.about}>{`Ryz ${Constants.expoConfig?.version ?? ''} · Made for mornings`}</Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md },
  content: { paddingHorizontal: space.lg, gap: space.xl },
  flex: { flex: 1, gap: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 56 },
  statusAction: { minHeight: 44, justifyContent: 'center' },
  webNote: { paddingVertical: space.md },
  test: { gap: space.sm, paddingVertical: space.md },
  danger: { color: colors.danger },
  picker: { paddingVertical: space.md },
  about: { textAlign: 'center' },
  profile: { gap: space.md, paddingVertical: space.md },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 26, fontFamily: FONT.display, color: colors.text },
  nameInput: { fontSize: 22, fontFamily: FONT.regular, color: colors.text, paddingVertical: space.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  recommend: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, padding: space.md },
  source: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 56 },
});
