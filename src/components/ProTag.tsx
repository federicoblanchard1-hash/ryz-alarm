import { StyleSheet, Text } from 'react-native';

import { FONT, colors, radius } from '@/theme';

/** A small "PRO" label on things the free plan doesn't include. */
export function ProTag() {
  return (
    <Text style={styles.tag} accessibilityLabel="Pro">
      PRO
    </Text>
  );
}

const styles = StyleSheet.create({
  tag: { fontSize: 10, lineHeight: 14, fontFamily: FONT.semibold, letterSpacing: 1, color: colors.onAccent, backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm, overflow: 'hidden' },
});
