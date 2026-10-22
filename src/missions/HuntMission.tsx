import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, haptic, Txt } from '@/components/ui';
import { huntItems, huntMatches, huntPool, swapHuntItem } from '@/core/puzzles';
import { labelImage } from '@/services/vision';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

/** Object hunt: Ryz names something, you find it and take a photo; the phone checks what's in it. */
export function HuntMission({ mission, onActivity, onDone }: MissionProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [items, setItems] = useState(() => huntItems(mission.amount, Math.random, mission.objects));
  const canSwap = huntPool(mission.objects).length > 1;
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  const camera = useRef<CameraView>(null);
  const item = items[index];

  const snap = async () => {
    if (!camera.current || busy) return;
    onActivity();
    setBusy(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.5, shutterSound: false });
      const labels = await labelImage(photo.uri);
      onActivity();
      if (!huntMatches(item, labels)) {
        haptic('error');
        const top = labels.filter((l) => l.confidence >= 0.5).slice(0, 3).map((l) => l.text.toLowerCase());
        setSeen(top.length ? `That looks like ${top.join(', ')}. Try again, a little closer.` : "Couldn't make that out. Try again with more light.");
        return;
      }
      haptic('success');
      setSeen(null);
      if (index + 1 >= items.length) onDone();
      else setIndex(index + 1);
    } catch {
      setSeen('The camera didn’t take that one. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={index / items.length} />
        <Txt variant="caption">{items.length > 1 ? `Object ${index + 1} of ${items.length}` : 'Get up and go find it'}</Txt>
      </View>
      <Text style={styles.find} accessibilityRole="header">{`Find ${item.name}`}</Text>
      {!permission ? (
        <View style={styles.box} />
      ) : !permission.granted ? (
        <View style={[styles.box, styles.ask]}>
          <Txt variant="muted" style={styles.center}>Ryz needs the camera to see what you found. Photos stay on your phone.</Txt>
          <Button title={permission.canAskAgain ? 'Allow camera' : 'Open Settings'} icon="camera-outline" variant="secondary" onPress={requestPermission} />
        </View>
      ) : (
        <View style={styles.box}>
          <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" animateShutter onCameraReady={() => setReady(true)} />
        </View>
      )}
      <Txt variant="caption" style={[styles.center, { opacity: seen ? 1 : 0 }]}>{seen ?? ' '}</Txt>
      <Button title={busy ? 'Looking…' : 'Take photo'} icon="camera" onPress={snap} disabled={!ready || busy || !permission?.granted} />
      {canSwap ? (
        <Button
          title="Something else"
          icon="shuffle"
          variant="secondary"
          disabled={busy}
          onPress={() => {
            onActivity();
            haptic('select');
            setSeen(null);
            setItems((list) => list.map((it, i) => (i === index ? swapHuntItem(it, Math.random, mission.objects) : it)));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.md },
  top: { gap: space.sm },
  find: { fontSize: 30, lineHeight: 38, fontFamily: FONT.display, color: colors.text, textAlign: 'center' },
  box: { flex: 1, minHeight: 260, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  ask: { gap: space.md, padding: space.xl },
  center: { textAlign: 'center' },
});
