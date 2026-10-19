import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { haptic, Txt } from '@/components/ui';
import { pickSentences, sameWords } from '@/core/missions';
import { FONT, colors, radius, space } from '@/theme';
import { Progress, type MissionProps } from './common';

/** Type a sentence word for word. Case, spacing and punctuation don't count. */
export function TypingMission({ mission, onActivity, onDone }: MissionProps) {
  const [sentences] = useState(() => pickSentences(mission.amount));
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const target = sentences[index] ?? '';

  const change = (value: string) => {
    onActivity();
    setText(value);
    if (!sameWords(value, target)) return;
    haptic('light');
    if (index + 1 >= sentences.length) onDone();
    else {
      setIndex(index + 1);
      setText('');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Progress value={index / sentences.length} />
        <Txt variant="caption">{`${index + 1} of ${sentences.length}`}</Txt>
      </View>
      <Text style={styles.sentence} accessibilityRole="header">{`“${target}”`}</Text>
      <TextInput
        value={text}
        onChangeText={change}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        placeholder="Type it here"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        accessibilityLabel={`Type: ${target}`}
      />
      <View style={styles.flex} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.xl },
  top: { gap: space.sm },
  flex: { flex: 1 },
  sentence: { fontSize: 28, lineHeight: 36, fontFamily: FONT.medium, color: colors.text, letterSpacing: -0.3 },
  input: {
    fontSize: 18,
    fontFamily: FONT.light,
    color: colors.text,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
});
