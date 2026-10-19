import Ionicons from '@expo/vector-icons/Ionicons';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { IconName } from '@/components/ui';
import { colors, space } from '@/theme';

// The web build is a phone preview, so it gets a bottom bar like the native one.

function TabButton({ icon, label, isFocused, onPress }: TabTriggerSlotProps & { icon: IconName; label: string }) {
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: isFocused }} accessibilityLabel={label}>
      <Ionicons name={isFocused ? icon : (`${icon}-outline` as IconName)} size={24} color={isFocused ? colors.text : colors.textFaint} />
      <Text style={[styles.label, { color: isFocused ? colors.text : colors.textFaint }]}>{label}</Text>
    </Pressable>
  );
}

export default function WebTabsLayout() {
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList style={styles.bar}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton icon="home" label="Home" />
        </TabTrigger>
        <TabTrigger name="alarms" href="/alarms" asChild>
          <TabButton icon="alarm" label="Alarms" />
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: space.sm,
    paddingBottom: space.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tab: { alignItems: 'center', gap: 2, minWidth: 72, minHeight: 48, justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600' },
});
