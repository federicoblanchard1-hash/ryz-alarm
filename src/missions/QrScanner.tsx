import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Txt } from '@/components/ui';
import { colors, radius, space } from '@/theme';

/** A camera that reports the first QR code or barcode it sees, once per `onScan`. */
export function QrScanner({ onScan, height = 340 }: { onScan: (data: string) => void; height?: number }) {
  const [permission, requestPermission] = useCameraPermissions();
  const last = useRef({ data: '', at: 0 });

  if (!permission) return <View style={[styles.box, { height }]} />;
  if (!permission.granted) {
    return (
      <View style={[styles.box, styles.ask, { height }]}>
        <Txt variant="muted" style={styles.center}>Ryz needs the camera to scan your code.</Txt>
        <Button title={permission.canAskAgain ? 'Allow camera' : 'Open Settings'} icon="camera-outline" variant="secondary" onPress={requestPermission} />
      </View>
    );
  }
  return (
    <View style={[styles.box, { height }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'datamatrix', 'pdf417', 'aztec'] }}
        onBarcodeScanned={(result: BarcodeScanningResult) => {
          // The camera reports the same code many times a second.
          const now = Date.now();
          if (result.data === last.current.data && now - last.current.at < 1500) return;
          last.current = { data: result.data, at: now };
          onScan(result.data);
        }}
      />
      <View style={styles.frame} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  ask: { gap: space.md, padding: space.xl },
  center: { textAlign: 'center' },
  frame: { width: 200, height: 200, borderRadius: radius.lg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
});
