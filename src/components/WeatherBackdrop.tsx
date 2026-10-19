import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { Image, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { seeded } from '@/core/missions';
import type { Scene } from '@/core/weather';

// The scene behind the forecast: a rendered sky (scripts/generate-skies.py),
// drifting slowly, with rain, drops on the glass, snow and lightning on top.
// Everything moves with transform/opacity CSS animations on the UI thread.

const SKIES = {
  clear_day: require('../../assets/weather/clear_day.jpg'),
  clear_night: require('../../assets/weather/clear_night.jpg'),
  partly_day: require('../../assets/weather/partly_day.jpg'),
  partly_night: require('../../assets/weather/partly_night.jpg'),
  cloudy_day: require('../../assets/weather/cloudy_day.jpg'),
  cloudy_night: require('../../assets/weather/cloudy_night.jpg'),
  rain_day: require('../../assets/weather/rain_day.jpg'),
  rain_night: require('../../assets/weather/rain_night.jpg'),
  storm: require('../../assets/weather/storm.jpg'),
  snow_day: require('../../assets/weather/snow_day.jpg'),
  snow_night: require('../../assets/weather/snow_night.jpg'),
  fog_day: require('../../assets/weather/fog_day.jpg'),
  fog_night: require('../../assets/weather/fog_night.jpg'),
} satisfies Record<string, ImageSourcePropType>;

function skyFor(scene: Scene, isDay: boolean): ImageSourcePropType {
  const time = isDay ? 'day' : 'night';
  switch (scene) {
    case 'clear':
      return SKIES[`clear_${time}`];
    case 'partly':
      return SKIES[`partly_${time}`];
    case 'cloudy':
      return SKIES[`cloudy_${time}`];
    case 'fog':
      return SKIES[`fog_${time}`];
    case 'drizzle':
    case 'rain':
      return SKIES[`rain_${time}`];
    case 'snow':
      return SKIES[`snow_${time}`];
    case 'storm':
      return SKIES.storm;
  }
}

/** The sky is drawn a little larger than the screen so it can drift without showing an edge. */
const DRIFT = 24;
const SKY_DRIFT = {
  animationName: { from: { transform: [{ translateX: -DRIFT }, { scale: 1.12 }] }, to: { transform: [{ translateX: DRIFT }, { scale: 1.12 }] } },
  animationDuration: '60s',
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: 'ease-in-out',
} as const;

type Anim = Record<string, unknown>;

function anim(keyframes: Record<string, object>, duration: number, extra: Anim = {}): Anim {
  return { animationName: keyframes, animationDuration: `${duration}ms`, animationIterationCount: 'infinite', animationTimingFunction: 'linear', ...extra };
}

interface Props {
  scene: Scene;
  isDay: boolean;
  height: number;
}

function Backdrop({ scene, isDay, height }: Props) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const moving = !reduced;
  const rainCount = { drizzle: 26, rain: 56, storm: 70 }[scene as 'rain'] ?? 0;

  const layers = useMemo(() => {
    const random = seeded(7);
    const drops = Array.from({ length: rainCount }, () => ({
      left: random() * (width + 80) - 40,
      length: 14 + random() * 14,
      opacity: 0.18 + random() * 0.32,
      duration: 650 + random() * 450,
      delay: random() * 1200,
    }));
    const flakes = Array.from({ length: scene === 'snow' ? 46 : 0 }, () => ({
      left: random() * width,
      size: 3 + random() * 3.5,
      opacity: 0.45 + random() * 0.5,
      sway: 10 + random() * 20,
      duration: 6000 + random() * 6000,
      delay: random() * 7000,
    }));
    // Rain on glass, like a window in the morning: still beads, and a few that run down.
    const beads = Array.from({ length: rainCount ? Math.round(rainCount * 0.6) : 0 }, () => ({
      left: random() * width,
      top: random() * height * 0.85,
      size: 4 + random() * random() * 15,
      runs: random() < 0.22,
      run: 60 + random() * 140,
      duration: 7000 + random() * 9000,
      delay: random() * 6000,
    }));
    return { drops, flakes, beads };
  }, [width, height, scene, rainCount]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip, { height }]} pointerEvents="none" accessible={false}>
      <Animated.View style={[styles.sky, moving ? SKY_DRIFT : styles.still]}>
        <Image source={skyFor(scene, isDay)} style={styles.skyImage} resizeMode="cover" accessible={false} />
      </Animated.View>
      {/* Keeps white text readable on bright skies. */}
      <LinearGradient colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']} style={[styles.shade, { height: height * 0.45 }]} />

      {layers.drops.map((d, i) => (
        <Animated.View
          key={`drop${i}`}
          style={[
            styles.drop,
            { left: d.left, height: d.length, opacity: d.opacity, transform: [{ translateY: -40 }, { rotate: '12deg' }] },
            moving &&
              anim({ from: { transform: [{ translateY: -40 }, { translateX: 0 }, { rotate: '12deg' }] }, to: { transform: [{ translateY: height + 40 }, { translateX: -height * 0.2 }, { rotate: '12deg' }] } }, d.duration, {
                animationDelay: `${d.delay}ms`,
              }),
            !moving && { top: Math.abs(d.left * 7) % height },
          ]}
        />
      ))}

      {layers.flakes.map((f, i) => (
        <Animated.View
          key={`flake${i}`}
          style={[
            styles.dot,
            { left: f.left, width: f.size, height: f.size, opacity: f.opacity, transform: [{ translateY: -10 }] },
            moving &&
              anim(
                {
                  '0%': { transform: [{ translateY: -10 }, { translateX: 0 }] },
                  '50%': { transform: [{ translateY: height / 2 }, { translateX: f.sway }] },
                  '100%': { transform: [{ translateY: height + 10 }, { translateX: -f.sway / 2 }] },
                },
                f.duration,
                { animationDelay: `${f.delay}ms` },
              ),
            !moving && { top: Math.abs(f.left * 5) % height },
          ]}
        />
      ))}

      {layers.beads.map((b, i) => (
        <Animated.View
          key={`bead${i}`}
          style={[
            styles.bead,
            { left: b.left, top: b.top, width: b.size, height: b.size * 1.12, borderRadius: b.size },
            moving &&
              b.runs &&
              anim(
                {
                  '0%': { opacity: 1, transform: [{ translateY: 0 }] },
                  '70%': { opacity: 1, transform: [{ translateY: 0 }] },
                  '92%': { opacity: 0.8, transform: [{ translateY: b.run }] },
                  '100%': { opacity: 0, transform: [{ translateY: b.run + 10 }] },
                },
                b.duration,
                { animationDelay: `${b.delay}ms`, animationTimingFunction: 'ease-in' },
              ),
          ]}
        >
          <View style={[styles.beadShine, { width: Math.max(1.5, b.size * 0.28), height: Math.max(1.5, b.size * 0.28) }]} />
        </Animated.View>
      ))}

      {scene === 'storm' && moving ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.flash,
            anim({ '0%': { opacity: 0 }, '86%': { opacity: 0 }, '87%': { opacity: 0.45 }, '89%': { opacity: 0.05 }, '91%': { opacity: 0.3 }, '94%': { opacity: 0 }, '100%': { opacity: 0 } }, 7000),
          ]}
        />
      ) : null}

      {/* Fades the scene into the black page below. */}
      <LinearGradient colors={['rgba(0,0,0,0)', '#000000']} style={[styles.fade, { height: height * 0.3 }]} />
    </View>
  );
}

export const WeatherBackdrop = memo(Backdrop);

const styles = StyleSheet.create({
  dot: { position: 'absolute', top: 0, borderRadius: 4, backgroundColor: '#FFFFFF' },
  sky: { position: 'absolute', top: 0, bottom: 0, left: -DRIFT, right: -DRIFT },
  still: { transform: [{ scale: 1.12 }] },
  skyImage: { width: '100%', height: '100%' },
  shade: { position: 'absolute', left: 0, right: 0, top: 0 },
  drop: { position: 'absolute', top: 0, width: 1.5, borderRadius: 1, backgroundColor: '#FFFFFF' },
  bead: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderBottomColor: 'rgba(255,255,255,0.55)' },
  beadShine: { position: 'absolute', top: '18%', left: '22%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.8)' },
  flash: { backgroundColor: '#FFFFFF', opacity: 0 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  clip: { overflow: 'hidden' },
});
