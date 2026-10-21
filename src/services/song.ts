import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

// Your own song as an alarm sound: picked from Files (any song you have as a
// file: MP3, M4A, WAV…), then copied into Ryz so it's still there tomorrow
// even if the original moves. Songs from Spotify or Apple Music are locked to
// their apps and can't be picked here.

/** Opens the Files picker for audio. Null if you cancel. */
export async function pickSong(): Promise<{ uri: string; name: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const name = asset.name.replace(/\.[a-z0-9]+$/i, '');
  // The web preview can play the picked file for this session only.
  if (Platform.OS === 'web') return { uri: asset.uri, name };
  const dir = new Directory(Paths.document, 'songs');
  if (!dir.exists) dir.create();
  const ext = asset.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '.m4a';
  const dest = new File(dir, `song-${Date.now()}${ext}`);
  new File(asset.uri).copy(dest);
  return { uri: dest.uri, name };
}
