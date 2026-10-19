import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONT, colors, space } from '@/theme';
import { Txt } from './ui';

// The iOS sheet curve (animate-expo skill). Module scope: layout-animation builders shouldn't be rebuilt per render.
const SHEET_IN = SlideInDown.duration(320).easing(Easing.bezier(0.32, 0.72, 0, 1));
const BACKDROP_IN = FadeIn.duration(200);

/** A bottom sheet for picking one setting, over whatever screen is open. */
export function Sheet({ visible, onClose, title, children, footer }: { visible: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* A Modal is its own native window on Android, so gestures need their own root. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View entering={reduced ? undefined : BACKDROP_IN} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View entering={reduced ? undefined : SHEET_IN} style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]} accessibilityViewIsModal>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Txt style={styles.title} accessibilityRole="header">{title}</Txt>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
              <Ionicons name="close" size={30} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginTop: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: space.md, paddingHorizontal: space.xl },
  title: { fontSize: 20, lineHeight: 26, fontFamily: FONT.semibold, color: colors.text },
  close: { position: 'absolute', right: space.lg, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.md },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm },
});
