import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Txt, type IconName } from '@/components/ui';
import { formatClockText } from '@/core/time';
import { useStore } from '@/state/store';
import { colors, space } from '@/theme';

// What helps after waking, from the research behind Ryz. No tip promises to
// erase grogginess: a 2019 review found nothing that reliably does.
const TIPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'sunny-outline',
    title: 'Get bright light',
    text: 'Open the curtains or step outside. Morning light makes you feel more alert and keeps your body clock on time.',
  },
  {
    icon: 'musical-notes-outline',
    title: 'Play music you like',
    text: 'In one study, music people liked cut grogginess for up to 20 minutes after waking.',
  },
  {
    icon: 'repeat-outline',
    title: 'Same time tomorrow',
    text: 'Waking at a regular time every day, weekends too, is one of the strongest signs of healthy sleep.',
  },
];

export default function Morning() {
  const { data } = useStore();
  const insets = useSafeAreaInsets();
  const check = data.pending.find((e) => e.kind === 'awakeCheck');
  const checkAt = check ? new Date(check.at) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.xl }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Txt variant="title">{data.settings.profile.name ? `Good morning, ${data.settings.profile.name.split(' ')[0]}` : 'Good morning'}</Txt>
        {checkAt ? (
          <Txt variant="muted">
            {`Ryz will ask if you're awake at ${formatClockText(checkAt.getHours(), checkAt.getMinutes(), data.settings.use24h)}. Keep your phone nearby.`}
          </Txt>
        ) : (
          <Txt variant="muted">What helps in the first few minutes:</Txt>
        )}
        {TIPS.filter((tip) => data.settings.morningLight || tip.icon !== 'sunny-outline').map((tip) => (
          <Card key={tip.title} style={styles.tip}>
            <Ionicons name={tip.icon} size={24} color={colors.text} />
            <View style={styles.tipText}>
              <Txt variant="heading">{tip.title}</Txt>
              <Txt variant="caption">{tip.text}</Txt>
            </View>
          </Card>
        ))}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button title="I'm up" onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.xl },
  tip: { flexDirection: 'row', gap: space.md, paddingVertical: space.lg, alignItems: 'flex-start' },
  tipText: { flex: 1, gap: space.xs },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm },
});
