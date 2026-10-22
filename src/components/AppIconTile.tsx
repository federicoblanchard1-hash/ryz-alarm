import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { AppIconId } from '@/core/appIcons';
import { colors } from '@/theme';

const IMAGES: Record<AppIconId, number> = {
  default: require('../../assets/icon.png'),
  halloween: require('../../assets/icons/halloween.png'),
  christmas: require('../../assets/icons/christmas.png'),
  'new-year': require('../../assets/icons/new-year.png'),
  valentines: require('../../assets/icons/valentines.png'),
  spring: require('../../assets/icons/spring.png'),
  summer: require('../../assets/icons/summer.png'),
  winter: require('../../assets/icons/winter.png'),
  autumn: require('../../assets/icons/autumn.png'),
  'lunar-new-year': require('../../assets/icons/lunar-new-year.png'),
  'st-patricks': require('../../assets/icons/st-patricks.png'),
  easter: require('../../assets/icons/easter.png'),
  pride: require('../../assets/icons/pride.png'),
  light: require('../../assets/icons/light.png'),
  gold: require('../../assets/icons/gold.png'),
  sunrise: require('../../assets/icons/sunrise.png'),
};

/** An app icon as the home screen shows it: rounded, with a hairline so the black one shows on black. */
export function AppIconTile({ id, size }: { id: AppIconId; size: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.225 }]}>
      <Image source={IMAGES[id]} style={StyleSheet.absoluteFill} contentFit="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
});
