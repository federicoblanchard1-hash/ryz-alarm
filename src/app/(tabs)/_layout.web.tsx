import Ionicons from '@expo/vector-icons/Ionicons';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic, type IconName } from '@/components/ui';
import { FONT, TAB_BAR_HEIGHT, colors, space } from '@/theme';

function TabButton({ icon, label, isFocused, onPress, onLongPress }: TabTriggerSlotProps & { icon: IconName; label: string }) {
  return (
    <Pressable
      onPress={(e) => {
        if (!isFocused) haptic('select');
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      style={[styles.tab, isFocused && styles.tabOn]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Ionicons name={isFocused ? icon : (`${icon}-outline` as IconName)} size={26} color={colors.text} />
      <Text style={[styles.label, !isFocused && styles.labelOff]}>{label}</Text>
    </Pressable>
  );
}

/** The web preview's tab bar: a floating pill like the iOS 26 one. Phones use the native bar (_layout.tsx). */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      {/* Tabs finds its routes by looking for TabList among its direct children. */}
      <TabList style={[styles.bar, { bottom: Math.max(insets.bottom, space.md) }]}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton icon="sunny" label="Morning" />
        </TabTrigger>
        <TabTrigger name="alarms" href="/alarms" asChild>
          <TabButton icon="alarm" label="Alarms" />
        </TabTrigger>
        <TabTrigger name="sleep" href="/sleep" asChild>
          <TabButton icon="bed" label="Sleep" />
        </TabTrigger>
        <TabTrigger name="settings" href="/settings" asChild>
          <TabButton icon="settings" label="Settings" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    padding: 5,
    borderRadius: TAB_BAR_HEIGHT / 2,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: (TAB_BAR_HEIGHT - 10) / 2 },
  tabOn: { backgroundColor: colors.bg },
  label: { fontSize: 13, lineHeight: 16, fontFamily: FONT.medium, color: colors.text },
  labelOff: { color: colors.textMuted },
});
