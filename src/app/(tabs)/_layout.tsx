import { NativeTabs } from 'expo-router/native-tabs';

import { colors } from '@/theme';

/** The platform's own tab bar: Liquid Glass on iOS 26, Material on Android. */
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
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="alarms">
        <NativeTabs.Trigger.Icon sf={{ default: 'alarm', selected: 'alarm.fill' }} md="alarm" />
        <NativeTabs.Trigger.Label>Alarms</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
