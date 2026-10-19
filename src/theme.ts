import { cubicBezier } from 'react-native-reanimated';

// Black and white. The only colours in the app are the weather emojis and red for errors.
export const colors = {
  bg: '#000000',
  surface: '#0E0E0E',
  surfaceRaised: '#1A1A1A',
  border: '#242424',
  borderStrong: '#3A3A3A',
  text: '#FFFFFF',
  textMuted: '#9A9A9A',
  textFaint: '#5C5C5C',
  accent: '#FFFFFF',
  onAccent: '#000000',
  danger: '#FF453A',
  dangerSoft: 'rgba(255, 69, 58, 0.12)',
  /** Panels laid over the weather scene. */
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 22, pill: 999 };

/** Strong ease-out for UI (animate-expo skill). Reanimated's CSS easing takes this object, not a 'cubic-bezier()' string. */
export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
