import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View, type GestureResponderEvent, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion, type CSSTransitionProperties } from 'react-native-reanimated';

import { EASE_OUT, colors, radius, space } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const variants = StyleSheet.create({
  largeTitle: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: colors.text, letterSpacing: -0.8 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, lineHeight: 22, color: colors.text },
  /** Settings rows, at Alarmy's size. */
  row: { fontSize: 18, lineHeight: 24, color: colors.text },
  /** The grey title above a card ("Alarm sound"). */
  section: { fontSize: 17, lineHeight: 22, fontWeight: '500', color: colors.textMuted },
  muted: { fontSize: 15, lineHeight: 21, color: colors.textMuted },
  caption: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.textFaint, letterSpacing: 1, textTransform: 'uppercase' },
});

export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: keyof typeof variants }) {
  return <Text {...props} style={[variants[variant], style]} />;
}

export function haptic(kind: 'select' | 'light' | 'success' | 'error') {
  if (Platform.OS === 'web') return;
  if (kind === 'select') Haptics.selectionAsync().catch(() => {});
  else if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
}

const PRESS_TRANSITION: CSSTransitionProperties = { transitionProperty: 'transform', transitionDuration: '120ms', transitionTimingFunction: EASE_OUT };

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
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={8}
      pressRetentionOffset={16}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[styles.unpressed, PRESS_TRANSITION, style, pressed && !reduced && styles.pressed, disabled && styles.disabled]}>{children}</Animated.View>
    </Pressable>
  );
}

const BUTTON_LOOKS = {
  primary: { box: { backgroundColor: colors.accent }, fg: colors.onAccent },
  secondary: { box: { backgroundColor: colors.surfaceRaised }, fg: colors.text },
  outline: { box: { borderWidth: 1.5, borderColor: colors.text }, fg: colors.text },
  danger: { box: { backgroundColor: colors.dangerSoft }, fg: colors.danger },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: keyof typeof BUTTON_LOOKS;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const look = BUTTON_LOOKS[variant];
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={[styles.button, look.box, style]} accessibilityLabel={title}>
      {icon ? <Ionicons name={icon} size={20} color={look.fg} /> : null}
      <Text style={[styles.buttonText, { color: look.fg }]}>{title}</Text>
    </PressableScale>
  );
}

export function IconButton({ icon, onPress, label, filled }: { icon: IconName; onPress: () => void; label: string; filled?: boolean }) {
  return (
    <PressableScale onPress={onPress} style={[styles.iconButton, filled && styles.iconButtonFilled]} accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={filled ? colors.onAccent : colors.text} />
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

/** The platform switch in black and white (web needs its own thumb prop). */
export function ThemedSwitch({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  const webThumb = Platform.OS === 'web' ? ({ activeThumbColor: colors.onAccent } as object) : {};
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        haptic('light');
        onChange(v);
      }}
      trackColor={{ true: colors.accent, false: colors.borderStrong }}
      thumbColor={Platform.OS === 'ios' ? undefined : value ? colors.onAccent : colors.text}
      ios_backgroundColor={colors.borderStrong}
      accessibilityLabel={label}
      {...webThumb}
    />
  );
}

export function ToggleRow({ title, description, value, onChange }: { title: string; description?: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Txt variant="row">{title}</Txt>
        {description ? <Txt variant="caption">{description}</Txt> : null}
      </View>
      <ThemedSwitch value={value} onChange={onChange} label={title} />
    </View>
  );
}

/** A tappable settings row: title on the left, value and chevron on the right. */
export function LinkRow({ title, value, onPress, icon }: { title: string; value?: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={value ? `${title}: ${value}` : title} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {icon ? <Ionicons name={icon} size={20} color={colors.text} /> : null}
      <Txt variant="row" style={styles.rowText} numberOfLines={1}>{title}</Txt>
      {value ? <Txt variant="row" style={styles.rowValue} numberOfLines={1}>{value}</Txt> : null}
      <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
    </Pressable>
  );
}

/** Two or three options in one pill, like iOS's segmented control (12h / 24h). */
export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: Option<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              if (!on) haptic('select');
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            hitSlop={6}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A square checkbox, white when ticked. */
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => {
        haptic('light');
        onChange(!checked);
      }}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={[styles.checkbox, checked && styles.checkboxOn]}
    >
      {checked ? <Ionicons name="checkmark" size={18} color={colors.onAccent} /> : null}
    </Pressable>
  );
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A horizontal slider from 0 to 1. Built on the responder system, so it needs no gesture library. */
export function Slider({ value, onChange, label, min = 0 }: { value: number; onChange: (value: number) => void; label: string; min?: number }) {
  const [width, setWidth] = useState(0);
  const start = useRef({ x: 0, pageX: 0 });
  const set = (x: number) => width > 0 && onChange(Math.max(min, clamp01(x / width)));
  const step = (delta: number) => onChange(Math.max(min, clamp01(Math.round((value + delta) * 10) / 10)));
  return (
    <View
      style={styles.slider}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e: GestureResponderEvent) => {
        // locationX is only reliable at the first touch; after that, follow the finger by pageX.
        start.current = { x: e.nativeEvent.locationX, pageX: e.nativeEvent.pageX };
        set(e.nativeEvent.locationX);
      }}
      onResponderMove={(e: GestureResponderEvent) => set(start.current.x + e.nativeEvent.pageX - start.current.pageX)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100), text: `${Math.round(value * 100)}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1)}
    >
      <View style={styles.sliderTrack} pointerEvents="none">
        <View style={[styles.sliderFill, { width: `${value * 100}%` }]} />
      </View>
      <View style={[styles.sliderThumb, { left: Math.min(Math.max(0, value * width - 12), width - 24) }]} pointerEvents="none" />
    </View>
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
}: {
  title?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chipBlock}>
      {title ? <Txt variant="caption">{title}</Txt> : null}
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
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  unpressed: { transform: [{ scale: 1 }] },
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.35 },
  button: {
    minHeight: 54,
    borderRadius: radius.pill,
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
    backgroundColor: colors.surfaceRaised,
  },
  iconButtonFilled: { backgroundColor: colors.accent },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
  },
  section: { gap: space.sm },
  sectionLabel: { marginLeft: space.xs },
  sectionFooter: { marginHorizontal: space.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 56 },
  rowText: { flex: 1, gap: 2 },
  rowPressed: { opacity: 0.6 },
  rowValue: { color: colors.textMuted, flexShrink: 1 },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  slider: { flex: 1, height: 36, justifyContent: 'center', marginRight: space.xs },
  sliderTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: colors.text },
  sliderThumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.text },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  segment: { minWidth: 48, height: 32, paddingHorizontal: space.md, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.accent },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.textFaint },
  segmentTextOn: { color: colors.onAccent },
  chipBlock: { paddingVertical: space.md, gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    minWidth: 48,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 15, fontWeight: '500', color: colors.text },
  chipTextOn: { color: colors.onAccent },
});
