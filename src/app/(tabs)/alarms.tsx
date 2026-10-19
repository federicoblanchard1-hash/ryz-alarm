import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlarmRow } from '@/components/AlarmRow';
import { Button, IconButton, Txt } from '@/components/ui';
import { sortedAlarms, useStore } from '@/state/store';
import { colors, space } from '@/theme';

const openEditor = (id: string) => router.push({ pathname: '/alarm/[id]', params: { id } });

export default function Alarms() {
  const { data, ready, setEnabled } = useStore();
  const insets = useSafeAreaInsets();
  const alarms = sortedAlarms(data.alarms);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Txt variant="largeTitle" accessibilityRole="header">Alarms</Txt>
        <IconButton icon="add" label="Add alarm" filled onPress={() => openEditor('new')} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {ready && alarms.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="alarm-outline" size={44} color={colors.textFaint} />
            <Txt variant="heading">No alarms yet</Txt>
            <Txt variant="muted" style={styles.center}>
              {"Gentle fades in a melody. Deep sleeper uses the low tone that wakes heavy sleepers. Add missions so you can't just turn it off."}
            </Txt>
            <Button title="Add alarm" icon="add" onPress={() => openEditor('new')} style={styles.emptyButton} />
          </View>
        ) : (
          alarms.map((alarm) => (
            <AlarmRow key={alarm.id} alarm={alarm} use24h={data.settings.use24h} onPress={() => openEditor(alarm.id)} onToggle={(enabled) => setEnabled(alarm.id, enabled)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl * 2, paddingHorizontal: space.lg },
  center: { textAlign: 'center' },
  emptyButton: { marginTop: space.md, alignSelf: 'stretch' },
});
