import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chips, Divider, Section, ToggleRow, Txt, haptic } from '@/components/ui';
import { scheduleTest } from '@/core/ring';
import { formatHours } from '@/core/time';
import { useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import { colors, space } from '@/theme';

const SOURCES = [
  { title: 'Low 520 Hz tone wakes deep sleepers', who: 'Bruck & Thomas, Victoria University', url: 'https://vuir.vu.edu.au/3994' },
  { title: 'Melodic alarms and morning grogginess', who: 'McFarlane et al., RMIT, 2020', url: 'https://neurosciencenews.com/alarm-music-grogginess-15625/' },
  { title: 'Snoozing up to 30 minutes', who: 'Sundelin et al., J. Sleep Research, 2023', url: 'https://livescience.com/health/sleep/hitting-snooze-can-boost-morning-cognition-study-hints' },
  { title: 'Sleep inertia: what helps after waking', who: 'Hilditch & McHill, 2019', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6710480/' },
  { title: 'Regular sleep and long-term health', who: 'Windred et al., SLEEP, 2024', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10782489/' },
  { title: 'Adults need 7 hours or more', who: 'AASM & Sleep Research Society, 2015', url: 'https://aasm.org/aasm-and-srs-publish-new-sleep-duration-consensus-statement/' },
];

const RELIABILITY_NOTE: Partial<Record<typeof Platform.OS, string>> = {
  ios: 'While Ryz is open, alarms ring even in silent mode. When Ryz is closed they ring as notifications, which follow the silent switch, so keep Ryz open overnight or silent mode off.',
  android: 'Alarms ring at alarm volume and through Do Not Disturb, even when Ryz is closed.',
};

function StatusRow({ ok, title, detail, action, onAction }: { ok: boolean; title: string; detail: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.status}>
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={22} color={ok ? colors.gentle : colors.danger} />
      <View style={styles.flex}>
        <Txt variant="body">{title}</Txt>
        <Txt variant="caption">{detail}</Txt>
      </View>
      {!ok && action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" style={styles.statusAction}>
          <Txt variant="heading" style={{ color: colors.gentle }}>{action}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function SettingsScreen() {
  const { data, updateSettings, update } = useStore();
  const permissions = usePermissions();
  const insets = useSafeAreaInsets();
  const { settings } = data;
  const notificationsOk = permissions.state?.notifications === 'granted';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
      <Section label="Sleep" footer="Adults need at least 7 hours a night. Ryz uses your goal to suggest a bedtime.">
        <Chips
          title="Sleep goal"
          value={settings.sleepGoalMinutes}
          onChange={(sleepGoalMinutes) => updateSettings({ sleepGoalMinutes })}
          options={[420, 450, 480, 510, 540].map((m) => ({ value: m, label: formatHours(m) }))}
        />
        <Divider />
        <ToggleRow
          title="Bedtime reminder"
          description="Before the earliest alarm of each morning"
          value={settings.bedtimeReminder}
          onChange={(bedtimeReminder) => updateSettings({ bedtimeReminder })}
        />
        {settings.bedtimeReminder ? (
          <Chips
            title="Remind me before bedtime"
            value={settings.reminderLeadMinutes}
            onChange={(reminderLeadMinutes) => updateSettings({ reminderLeadMinutes })}
            options={[15, 30, 60].map((m) => ({ value: m, label: `${m} min` }))}
          />
        ) : null}
      </Section>

      <Section label="Display">
        <ToggleRow title="24-hour clock" value={settings.use24h} onChange={(use24h) => updateSettings({ use24h })} />
      </Section>

      <Section
        label="Will my alarm ring?"
        footer={RELIABILITY_NOTE[Platform.OS]}
      >
        {permissions.supported ? (
          <>
            <StatusRow
              ok={notificationsOk}
              title="Notifications"
              detail={notificationsOk ? 'On — alarms ring when Ryz is closed' : 'Off — alarms only ring while Ryz is open'}
              action={permissions.state?.notifications === 'denied' ? 'Settings' : 'Allow'}
              onAction={permissions.fix}
            />
            {Platform.OS === 'android' ? (
              <>
                <Divider />
                <StatusRow
                  ok={permissions.state?.exactAlarms ?? false}
                  title="Exact alarms"
                  detail={permissions.state?.exactAlarms ? 'On — rings to the minute' : 'Off — alarms may ring a few minutes late'}
                  action="Settings"
                  onAction={() => Linking.openSettings()}
                />
              </>
            ) : null}
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
          <Txt variant="caption">
            {permissions.supported ? 'Lock your phone after tapping to hear how it wakes you.' : 'Keep this tab open to hear it.'}
          </Txt>
        </View>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.xl },
  flex: { flex: 1, gap: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 56 },
  statusAction: { minHeight: 44, justifyContent: 'center' },
  webNote: { paddingVertical: space.md },
  test: { gap: space.sm, paddingVertical: space.md },
  source: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 56 },
});
