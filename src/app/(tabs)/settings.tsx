import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Group, Row } from '@/components/SettingsKit';
import { useTabBarSpace } from '@/components/tabBarSpace';
import { Txt } from '@/components/ui';
import { proStatus } from '@/core/pro';
import { formatHours } from '@/core/time';
import { balance } from '@/core/xp';
import { useAuth } from '@/state/auth';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { usePermissions } from '@/state/usePermissions';
import { FONT, colors, radius, space } from '@/theme';

const open = (page: string) => router.push({ pathname: '/settings/[page]', params: { page } });

/** Settings: a short list. Each row opens its own page. */
export default function SettingsScreen() {
  const { data } = useStore();
  const auth = useAuth();
  const now = useNow(60_000);
  const pro = proStatus(data, now);
  const permissions = usePermissions();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { settings } = data;
  const name = settings.profile.name.trim();
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const ringOk = !permissions.supported || permissions.state?.notifications === 'granted';
  const following = (settings.newsTopics?.length ?? 0) + settings.news.entities.length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Txt variant="largeTitle" style={styles.title} accessibilityRole="header">Settings</Txt>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabSpace + space.xl }]}>
        <Pressable
          onPress={() => (auth.session || !auth.enabled ? open('account') : router.push({ pathname: '/account', params: { mode: 'login' } }))}
          accessibilityRole="button"
          accessibilityLabel="Account"
          style={({ pressed }) => [styles.account, pressed && styles.pressed]}
        >
          <View style={styles.avatar}>{initials ? <Text style={styles.initials}>{initials}</Text> : <Ionicons name="person" size={22} color={colors.textMuted} />}</View>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>{name || 'You'}</Text>
            <Text style={styles.email} numberOfLines={1}>{auth.email ?? (auth.enabled ? 'Not signed in' : 'Accounts are off in this build')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>

        <Group>
          <Row icon={pro.kind !== 'free' ? 'diamond' : 'diamond-outline'} title="Ryz Pro" value={pro.kind === 'pro' ? 'On' : pro.kind === 'trial' ? `Trial · ${pro.daysLeft} d` : 'Free'} onPress={() => router.push('/pro')} />
          <Row icon="star-outline" title="XP" value={balance(data.xp).toLocaleString()} onPress={() => router.push('/xp')} />
        </Group>

        <Group>
          <Row icon="alarm-outline" title="Alarms" onPress={() => open('alarms')} />
          <Row icon="moon-outline" title="Sleep" value={formatHours(settings.sleepGoalMinutes)} onPress={() => open('sleep')} />
          <Row icon="newspaper-outline" title="News" value={following ? `${following} followed` : 'Off'} onPress={() => router.push('/news-settings')} />
          <Row icon="flag-outline" title="Goals" value={settings.goals.length ? `${settings.goals.length}` : 'None'} onPress={() => router.push('/goals')} />
          <Row icon="options-outline" title="General" onPress={() => open('general')} />
        </Group>

        <Group>
          <Row icon="shield-checkmark-outline" title="Will my alarm ring?" dot={ringOk ? 'ok' : 'warn'} onPress={() => open('check')} />
          <Row icon="book-outline" title="The research" onPress={() => open('research')} />
        </Group>

        <Txt variant="caption" style={styles.about}>{`Ryz ${Constants.expoConfig?.version ?? ''}`}</Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.6 },
  account: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 18, fontFamily: FONT.display, color: colors.text },
  name: { fontSize: 17, fontFamily: FONT.medium, color: colors.text },
  email: { fontSize: 13, fontFamily: FONT.light, color: colors.textMuted },
  about: { textAlign: 'center', color: colors.textFaint },
});
