import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONT, colors, radius, space } from '@/theme';
import { ThemedSwitch, type IconName } from './ui';

// Small building blocks for Settings: quiet grouped lists, like iOS Settings.

/** A group of rows on one card, with thin dividers between them. */
export function Group({ title, note, children }: { title?: string; note?: string; children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

/** A row that opens something: icon, title, a short value, chevron. */
export function Row({ icon, title, detail, value, onPress, danger, dot, end = 'chevron-forward' }: { icon: IconName; title: string; detail?: string; value?: string; onPress: () => void; danger?: boolean; dot?: 'ok' | 'warn'; end?: IconName }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={value ? `${title}: ${value}` : title} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={17} color={danger ? colors.danger : colors.text} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, danger && styles.danger]} numberOfLines={1}>
          {title}
        </Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {dot ? <View style={[styles.dot, dot === 'warn' && styles.dotWarn]} /> : null}
      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {danger ? null : <Ionicons name={end} size={16} color={colors.textFaint} />}
    </Pressable>
  );
}

/** An on/off setting, with an optional line under the title. */
export function Toggle({ title, note, value, onChange }: { title: string; note?: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {note ? <Text style={styles.detail}>{note}</Text> : null}
      </View>
      <ThemedSwitch value={value} onChange={onChange} label={title} />
    </View>
  );
}

/** A title with a control on its right, like a segmented picker. */
export function Line({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.title, styles.text]}>{title}</Text>
      {children}
    </View>
  );
}

/** Room for a bigger control (a slider) inside a group. */
export function Block({ children }: { children: ReactNode }) {
  return <View style={styles.block}>{children}</View>;
}

/** A Settings sub-page: a back arrow, a title, then groups. */
export function Page({ title, children }: { title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.barTitle} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: space.sm },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: FONT.medium, color: colors.text },
  content: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.xl },
  group: { gap: 6 },
  groupTitle: { fontSize: 12, lineHeight: 16, fontFamily: FONT.medium, color: colors.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: space.md },
  card: { borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: space.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 40 },
  note: { fontSize: 12, lineHeight: 17, fontFamily: FONT.light, color: colors.textMuted, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  pressed: { opacity: 0.6 },
  icon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1, paddingVertical: 10 },
  title: { fontSize: 16, fontFamily: FONT.regular, color: colors.text },
  detail: { fontSize: 12, lineHeight: 16, fontFamily: FONT.light, color: colors.textMuted },
  block: { paddingVertical: space.md },
  danger: { color: colors.danger },
  value: { maxWidth: '45%', fontSize: 14, fontFamily: FONT.light, color: colors.textMuted },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text },
  dotWarn: { backgroundColor: colors.danger },
});
