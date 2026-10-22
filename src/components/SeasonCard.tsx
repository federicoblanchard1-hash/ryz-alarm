import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { APP_ICON, iconToSuggest } from '@/core/appIcons';
import { canChangeIcon, currentIcon, setIcon } from '@/services/appIcon';
import { useNow } from '@/state/useNow';
import { useStore } from '@/state/store';
import { usePro } from '@/state/usePro';
import { FONT, colors, radius, space } from '@/theme';
import { AppIconTile } from './AppIconTile';
import { haptic } from './ui';

function notice(title: string, text: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n\n${text}`);
  else Alert.alert(title, text);
}

/** A one-line card offering the icon for the season or holiday that's on, or starts within a week. Closing it keeps it away until a week before the next one. */
export function SeasonCard() {
  const { data, updateSettings } = useStore();
  const { pro, unlock } = usePro();
  const now = useNow(60 * 60_000);
  const { seasonalIcons, iconPromptsSeen } = data.settings;
  const suggestion = iconToSuggest(now, currentIcon(), iconPromptsSeen, seasonalIcons);
  if (!suggestion) return null;
  const { id, inDays, key } = suggestion;
  const done = () => updateSettings({ iconPromptsSeen: [...iconPromptsSeen, key].slice(-20) });
  const title = APP_ICON[id].title;
  const when = inDays === 0 ? 'now' : inDays === 1 ? 'tomorrow' : `in ${inDays} days`;
  return (
    <View style={styles.card}>
      <AppIconTile id={id} size={28} />
      <Text style={styles.text} numberOfLines={1}>
        {`${title} icon`}
        <Text style={styles.when}>{` · ${when}`}</Text>
      </Text>
      <Pressable
        onPress={async () => {
          haptic('success');
          done();
          if (!pro) return unlock('app_icons');
          if (!canChangeIcon()) {
            notice('Needs the full app', `Switching to the ${title} icon needs the full Ryz app, not Expo Go. You'll find every icon in Settings → General → App icon.`);
            return;
          }
          await setIcon(id).catch(() => notice('Couldn’t change the icon', 'Try again from Settings → General → App icon.'));
        }}
        accessibilityRole="button"
        accessibilityLabel={pro ? `Switch to the ${title} icon` : `Unlock the ${title} icon with Pro`}
        style={styles.switch}
      >
        <Text style={styles.switchText}>{pro ? 'Switch' : 'Unlock'}</Text>
      </Pressable>
      <Pressable onPress={done} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs + 2, paddingLeft: space.sm, paddingRight: space.md, borderRadius: radius.md, backgroundColor: colors.surface },
  text: { flex: 1, fontSize: 14, fontFamily: FONT.medium, color: colors.text },
  when: { fontFamily: FONT.regular, color: colors.textMuted },
  switch: { paddingHorizontal: space.sm + 2, height: 26, borderRadius: radius.pill, backgroundColor: colors.accent, justifyContent: 'center' },
  switchText: { fontSize: 13, fontFamily: FONT.medium, color: colors.onAccent },
});
