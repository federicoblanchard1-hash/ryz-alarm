import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { EASE_OUT_CSS, colors, radius, space } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const variants = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  heading: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  caption: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textFaint, letterSpacing: 0.6, textTransform: 'uppercase' },
});

export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: keyof typeof variants }) {
  return <Text {...props} style={[variants[variant], style]} />;
}

export function haptic(kind: 'select' | 'light' | 'success') {
  if (Platform.OS === 'web') return;
  if (kind === 'select') Haptics.selectionAsync().catch(() => {});
  else if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Feedback on press-in: a 3% scale in 120 ms, so every tap feels physical. */
export function PressableScale({
  onPress,
  onLongPress,
  delayLongPress,
  disabled,
  style,
  children,
  accessibilityLabel,
  accessibilityHint,
  onPressIn,
  onPressOut,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onPressIn?: () => void;
  onPressOut?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
      onPressIn={() => {
        setPressed(true);
        onPressIn?.();
      }}
      onPressOut={() => {
        setPressed(false);
        onPressOut?.();
      }}
      hitSlop={8}
      pressRetentionOffset={16}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[PRESS_TRANSITION, style, pressed && !reduced && styles.pressed, disabled && styles.disabled]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  accent = colors.gentle,
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  accent?: string;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'primary' ? accent : variant === 'secondary' ? colors.surfaceRaised : variant === 'danger' ? colors.dangerSoft : 'transparent';
  const fg = variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.danger : colors.text;
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={[styles.button, { backgroundColor: bg }, style]} accessibilityLabel={title}>
      {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </PressableScale>
  );
}

export function IconButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <PressableScale onPress={onPress} style={styles.iconButton} accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={colors.text} />
    </PressableScale>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({ label, footer, children }: { label?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {label ? <Txt variant="label" style={styles.sectionLabel}>{label}</Txt> : null}
      <Card>{children}</Card>
      {footer ? <Txt variant="caption" style={styles.sectionFooter}>{footer}</Txt> : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function ToggleRow({
  title,
  description,
  value,
  onChange,
  accent = colors.gentle,
}: {
  title: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  accent?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Txt variant="body">{title}</Txt>
        {description ? <Txt variant="caption">{description}</Txt> : null}
      </View>
      <ThemedSwitch value={value} onChange={onChange} accent={accent} label={title} />
    </View>
  );
}

/** The platform switch in Ryz colours: accent track, light thumb (web needs its own thumb prop). */
export function ThemedSwitch({ value, onChange, accent, label }: { value: boolean; onChange: (value: boolean) => void; accent: string; label: string }) {
  const webThumb = Platform.OS === 'web' ? ({ activeThumbColor: colors.text } as object) : {};
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        haptic('light');
        onChange(v);
      }}
      trackColor={{ true: accent, false: colors.border }}
      thumbColor={Platform.OS === 'ios' ? undefined : colors.text}
      ios_backgroundColor={colors.border}
      accessibilityLabel={label}
      {...webThumb}
    />
  );
}

export interface Option<T> {
  value: T;
  label: string;
}

/** A row of choices. Used instead of sliders: every value is one tap away and readable. */
export function Chips<T extends string | number>({
  title,
  options,
  value,
  onChange,
  accent = colors.gentle,
}: {
  title?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accent?: string;
}) {
  return (
    <View style={styles.chipBlock}>
      {title ? <Txt variant="caption" style={styles.chipTitle}>{title}</Txt> : null}
      <View style={styles.chips} accessibilityRole="radiogroup">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => {
                if (!selected) haptic('select');
                onChange(o.value);
              }}
              hitSlop={4}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={title ? `${title}: ${o.label}` : o.label}
              style={[styles.chip, selected && { backgroundColor: accent, borderColor: accent }]}
            >
              <Text style={[styles.chipText, selected && { color: colors.onAccent }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Reanimated CSS transition props, which StyleSheet.create doesn't type.
const PRESS_TRANSITION = {
  transform: [{ scale: 1 }],
  transitionProperty: 'transform',
  transitionDuration: '120ms',
  transitionTimingFunction: EASE_OUT_CSS,
} as const;

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.4 },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
  },
  section: { gap: space.sm },
  sectionLabel: { marginLeft: space.xs },
  sectionFooter: { marginHorizontal: space.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 56 },
  rowText: { flex: 1, gap: 2 },
  chipBlock: { paddingVertical: space.md, gap: space.sm },
  chipTitle: {},
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    minWidth: 48,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 15, fontWeight: '500', color: colors.text },
});
