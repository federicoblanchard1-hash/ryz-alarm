import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '@/theme';

/** The platform's own tab bar: Liquid Glass on iOS 26, Material on Android. The web preview has its own in _layout.web.tsx. */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={colors.text}
      iconColor={{ default: colors.textFaint, selected: colors.text }}
      labelStyle={{ default: { color: colors.textFaint }, selected: { color: colors.text } }}
      backgroundColor={colors.bg}
      indicatorColor={colors.surfaceRaised}
    >
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} md="wb_sunny" />
        <NativeTabs.Trigger.Label>Morning</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="alarms">
        <NativeTabs.Trigger.Icon sf={{ default: 'alarm', selected: 'alarm.fill' }} md="alarm" />
        <NativeTabs.Trigger.Label>Alarms</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sleep">
        <NativeTabs.Trigger.Icon sf={{ default: 'bed.double', selected: 'bed.double.fill' }} md="bedtime" />
        <NativeTabs.Trigger.Label>Sleep</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
