import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export type MediaPickerResult =
  | { type: 'image'; uri: string; mimeType: string; filename: string }
  | { type: 'document'; uri: string; mimeType: string; filename: string }
  | { type: 'cancelled' };

const MAX_BYTES = 10 * 1024 * 1024;

const getFileSizeBytes = async (uri: string): Promise<number | null> => {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    const size = (info as any)?.size;
    return typeof size === 'number' ? size : null;
  } catch {
    return null;
  }
};

export async function pickChatMedia(): Promise<MediaPickerResult> {
  return { type: 'cancelled' };
}

export async function pickChatImage(): Promise<MediaPickerResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    return { type: 'cancelled' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    quality: 0.7,
    exif: false,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) {
    return { type: 'cancelled' };
  }

  const asset = result.assets[0];
  const uri = asset.uri;
  const filename = uri.split('/').pop() ?? 'image.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const size = await getFileSizeBytes(uri);
  if (typeof size === 'number' && size > MAX_BYTES) {
    return { type: 'cancelled' };
  }

  return { type: 'image', uri, mimeType, filename };
}

export async function pickChatDocument(): Promise<MediaPickerResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets[0]) {
    return { type: 'cancelled' };
  }

  const asset = result.assets[0];
  const uri = asset.uri;
  const size = await getFileSizeBytes(uri);
  if (typeof size === 'number' && size > MAX_BYTES) {
    return { type: 'cancelled' };
  }

  return {
    type: 'document',
    uri,
    mimeType: asset.mimeType ?? 'application/pdf',
    filename: asset.name ?? 'document.pdf',
  };
}

