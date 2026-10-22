import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { APP_ICON, iconToSuggest, seasonKey } from '@/core/appIcons';
import { canChangeIcon, currentIcon, setIcon } from '@/services/appIcon';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';
import { AppIconTile } from './AppIconTile';
import { Txt, haptic } from './ui';

function notice(title: string, text: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n\n${text}`);
  else Alert.alert(title, text);
}

/** When a season starts, a small card offers its icon. Once a year; Settings can turn it off. */
export function SeasonCard() {
  const { data, updateSettings } = useStore();
  const now = useNow(60 * 60_000);
  const { seasonalIcons, iconPromptsSeen } = data.settings;
  const season = iconToSuggest(now, currentIcon(), iconPromptsSeen, seasonalIcons);
  if (!season) return null;
  const done = () => updateSettings({ iconPromptsSeen: [...iconPromptsSeen, seasonKey(season, now)].slice(-20) });
  const title = APP_ICON[season].title;
  return (
    <View style={styles.card}>
      <AppIconTile id={season} size={44} />
      <View style={styles.flex}>
        <Text style={styles.title}>{`${title} icon`}</Text>
        <Txt variant="caption">Same Ryz, dressed for the season</Txt>
      </View>
      <Pressable
        onPress={async () => {
          haptic('success');
          done();
          if (!canChangeIcon()) {
            notice('Needs the full app', `Switching to the ${title} icon needs the full Ryz app, not Expo Go. You'll find every icon in Settings → General → App icon.`);
            return;
          }
          await setIcon(season).catch(() => notice('Couldn’t change the icon', 'Try again from Settings → General → App icon.'));
        }}
        accessibilityRole="button"
        style={styles.switch}
      >
        <Text style={styles.switchText}>Switch</Text>
      </Pressable>
      <Pressable onPress={done} hitSlop={10} accessibilityRole="button" accessibilityLabel="Not now">
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface },
  flex: { flex: 1, gap: 1 },
  title: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  switch: { paddingHorizontal: space.md, height: 32, borderRadius: radius.pill, backgroundColor: colors.accent, justifyContent: 'center' },
  switchText: { fontSize: 14, fontFamily: FONT.medium, color: colors.onAccent },
});
