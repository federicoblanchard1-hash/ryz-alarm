import { NativeModules, Platform } from 'react-native';

// On-device image labelling (Google ML Kit) for the Object hunt mission. It's
// native code, so it works in a development or store build, not in Expo Go or
// on the web; there the mission is swapped for sums. Photos never leave the
// phone.

type Labeller = typeof import('@react-native-ml-kit/image-labeling').default;

function load(): Labeller | null {
  // The package throws on first use when its native side is missing, so check for it first.
  if (Platform.OS === 'web' || !NativeModules.ImageLabeling) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only where the native module exists
    return (require('@react-native-ml-kit/image-labeling') as { default: Labeller }).default;
  } catch {
    return null;
  }
}

const labeller = load();

/** Whether this build can recognise what's in a photo. */
export function canLabelImages(): boolean {
  return labeller !== null;
}

/** What's in the photo at `uri`, with how sure the model is (0–1). */
export async function labelImage(uri: string): Promise<{ text: string; confidence: number }[]> {
  if (!labeller) return [];
  const labels = await labeller.label(uri);
  return labels.map((l) => ({ text: l.text, confidence: l.confidence }));
}
