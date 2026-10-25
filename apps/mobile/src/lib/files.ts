import { File } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Build a multipart form holding a local file. On phones, expo-file-system's File is a Blob
 * that expo/fetch can stream; on the web the picker returns a blob: URL we fetch first.
 */
export async function formWithFile(field: string, uri: string, fileName: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append(field, blob, fileName);
  } else {
    form.append(field, new File(uri) as unknown as Blob);
  }
  return form;
}
