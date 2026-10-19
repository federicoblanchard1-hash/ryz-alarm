import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { type MissionProps } from './common';
import { QrScanner } from './QrScanner';

/** Scan the code you chose when setting the alarm (any code, if none was saved). */
export function QrMission({ mission, onActivity, onDone }: MissionProps) {
  const [wrong, setWrong] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <View style={styles.wrap}>
      <Txt variant="muted">{mission.code ? 'Go to where you put your code and scan it.' : 'Scan any QR code or barcode, like one on a cereal box in the kitchen.'}</Txt>
      <QrScanner
        height={420}
        onScan={(data) => {
          if (done) return;
          onActivity();
          if (!mission.code || data === mission.code) {
            setDone(true);
            onDone();
          } else {
            haptic('error');
            setWrong(true);
          }
        }}
      />
      <Txt variant="caption" style={{ opacity: wrong ? 1 : 0 }}>{"That's a different code. Find the one you saved."}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 16 },
});
