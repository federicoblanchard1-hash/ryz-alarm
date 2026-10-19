import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { seeded } from '@/core/missions';
import type { Scene } from '@/core/weather';

// The scene behind the forecast, drawn in greys so it stays black and white.
// Everything moves with transform/opacity CSS animations on the UI thread.

type Sky = readonly [string, string, string];

const DAY_SKY: Record<Scene, Sky> = {
  clear: ['#767676', '#2E2E2E', '#000000'],
  partly: ['#666666', '#2A2A2A', '#000000'],
  cloudy: ['#4E4E4E', '#222222', '#000000'],
  fog: ['#5E5E5E', '#2E2E2E', '#000000'],
  drizzle: ['#424242', '#1C1C1C', '#000000'],
  rain: ['#383838', '#181818', '#000000'],
  snow: ['#6E6E6E', '#303030', '#000000'],
  storm: ['#262626', '#101010', '#000000'],
};
const NIGHT_SKY: Sky = ['#1C1C1C', '#0B0B0B', '#000000'];
const NIGHT_CLOUDY_SKY: Sky = ['#222222', '#0E0E0E', '#000000'];

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
  const sky = isDay ? DAY_SKY[scene] : scene === 'clear' || scene === 'partly' ? NIGHT_SKY : NIGHT_CLOUDY_SKY;
  const showSun = isDay && (scene === 'clear' || scene === 'partly');
  const showMoon = !isDay && (scene === 'clear' || scene === 'partly');
  const showStars = !isDay && (scene === 'clear' || scene === 'partly');
  const cloudCount = { clear: 0, partly: 2, cloudy: 4, fog: 0, drizzle: 3, rain: 3, snow: 3, storm: 4 }[scene];
  const rainCount = { drizzle: 26, rain: 56, storm: 70 }[scene as 'rain'] ?? 0;

  const layers = useMemo(() => {
    const random = seeded(7);
    const stars = Array.from({ length: 44 }, () => ({
      left: random() * width,
      top: random() * height * 0.75,
      size: 1 + random() * 1.8,
      opacity: 0.35 + random() * 0.6,
      duration: 2200 + random() * 3000,
      delay: random() * 3000,
    }));
    const clouds = Array.from({ length: cloudCount }, (_, i) => ({
      left: (i / Math.max(1, cloudCount)) * width * 0.9 - width * 0.15 + random() * 40,
      top: 40 + random() * height * 0.3,
      scale: 0.7 + random() * 0.5,
      opacity: (scene === 'storm' || scene === 'rain' ? 0.06 : 0.08) + random() * 0.05,
      drift: 30 + random() * 40,
      duration: 18000 + random() * 16000,
    }));
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
    const bands = Array.from({ length: scene === 'fog' ? 4 : 0 }, (_, i) => ({
      top: height * (0.18 + i * 0.16),
      height: 60 + random() * 40,
      opacity: 0.07 + random() * 0.06,
      drift: 30 + random() * 30,
      duration: 14000 + random() * 10000,
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
    return { stars, clouds, drops, flakes, bands, beads };
  }, [width, height, scene, cloudCount, rainCount]);

  return (
    <View style={[StyleSheet.absoluteFill, { height }]} pointerEvents="none" accessible={false}>
      <LinearGradient colors={sky} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />

      {showStars
        ? layers.stars.map((s, i) => (
            <Animated.View
              key={`star${i}`}
              style={[
                styles.dot,
                { left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity },
                moving && anim({ '0%': { opacity: s.opacity }, '50%': { opacity: s.opacity * 0.25 }, '100%': { opacity: s.opacity } }, s.duration, { animationDelay: `${s.delay}ms`, animationTimingFunction: 'ease-in-out' }),
              ]}
            />
          ))
        : null}

      {showSun ? (
        <View style={[styles.orb, { left: width - 96, top: -6 }]}>
          {[220, 160].map((size, i) => (
            <Animated.View
              key={size}
              style={[
                styles.glow,
                { width: size, height: size, borderRadius: size / 2, opacity: i === 0 ? 0.06 : 0.1 },
                moving && anim({ from: { transform: [{ scale: 1 }] }, to: { transform: [{ scale: 1.08 }] } }, 5000 + i * 1500, { animationDirection: 'alternate', animationTimingFunction: 'ease-in-out' }),
              ]}
            />
          ))}
          <View style={[styles.glow, styles.sun]} />
        </View>
      ) : null}

      {showMoon ? (
        <View style={[styles.orb, { left: width - 100, top: 4 }]}>
          <View style={[styles.glow, { width: 140, height: 140, borderRadius: 70, opacity: 0.05 }]} />
          <View style={[styles.glow, styles.moon]} />
          <View style={[styles.moonShade, { backgroundColor: sky[0] }]} />
        </View>
      ) : null}

      {layers.bands.map((b, i) => (
        <Animated.View
          key={`band${i}`}
          style={[
            styles.band,
            { top: b.top, height: b.height, width: width * 1.4, left: -width * 0.2 },
            moving && anim({ from: { transform: [{ translateX: -b.drift }] }, to: { transform: [{ translateX: b.drift }] } }, b.duration, { animationDirection: 'alternate', animationTimingFunction: 'ease-in-out' }),
          ]}
        >
          {/* Soft top and bottom edges, so the fog has no hard lines. */}
          <LinearGradient colors={['rgba(255,255,255,0)', `rgba(255,255,255,${b.opacity * 1.6})`, 'rgba(255,255,255,0)']} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ))}

      {layers.clouds.map((c, i) => (
        <Animated.View
          key={`cloud${i}`}
          // The puffs overlap; fade them as one shape, not each on its own.
          needsOffscreenAlphaCompositing
          style={[
            styles.cloud,
            { left: c.left, top: c.top, opacity: c.opacity, transform: [{ scale: c.scale }] },
            moving &&
              anim({ from: { transform: [{ translateX: -c.drift }, { scale: c.scale }] }, to: { transform: [{ translateX: c.drift }, { scale: c.scale }] } }, c.duration, {
                animationDirection: 'alternate',
                animationTimingFunction: 'ease-in-out',
              }),
          ]}
        >
          <View style={[styles.puff, { width: 70, height: 70, left: 10, top: 18 }]} />
          <View style={[styles.puff, { width: 96, height: 96, left: 50, top: 0 }]} />
          <View style={[styles.puff, { width: 64, height: 64, left: 118, top: 26 }]} />
          <View style={[styles.puff, { width: 170, height: 46, left: 8, top: 44, borderRadius: 23 }]} />
        </Animated.View>
      ))}

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
  orb: { position: 'absolute', width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', backgroundColor: '#FFFFFF' },
  sun: { width: 86, height: 86, borderRadius: 43, opacity: 0.92 },
  moon: { width: 62, height: 62, borderRadius: 31, opacity: 0.9 },
  moonShade: { position: 'absolute', width: 56, height: 56, borderRadius: 28, marginLeft: 26, marginTop: -16 },
  cloud: { position: 'absolute', width: 190, height: 96 },
  puff: { position: 'absolute', borderRadius: 999, backgroundColor: '#FFFFFF' },
  band: { position: 'absolute' },
  drop: { position: 'absolute', top: 0, width: 1.5, borderRadius: 1, backgroundColor: '#FFFFFF' },
  bead: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderBottomColor: 'rgba(255,255,255,0.55)' },
  beadShine: { position: 'absolute', top: '18%', left: '22%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.8)' },
  flash: { backgroundColor: '#FFFFFF', opacity: 0 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
