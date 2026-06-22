import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const settingsAlert = (title: string, body: string) =>
  Alert.alert(title, body, [
    { text: 'ביטול', style: 'cancel' },
    { text: 'פתח הגדרות', onPress: () => Linking.openSettings() },
  ]);

/** Request camera permission (with a graceful denial → settings prompt). Returns granted. */
export async function ensureCameraPermission(): Promise<boolean> {
  const cur = await ImagePicker.getCameraPermissionsAsync();
  if (cur.granted) return true;
  if (cur.canAskAgain) {
    const req = await ImagePicker.requestCameraPermissionsAsync();
    if (req.granted) return true;
  }
  settingsAlert('אין גישה למצלמה', 'כדי לצלם רגע מהמסע, אפשרו גישה למצלמה בהגדרות.');
  return false;
}

/** Request media-library (gallery) permission. Returns granted. */
export async function ensureLibraryPermission(): Promise<boolean> {
  const cur = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (cur.granted) return true;
  if (cur.canAskAgain) {
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (req.granted) return true;
  }
  settingsAlert('אין גישה לתמונות', 'כדי לבחור תמונה לשיתוף, אפשרו גישה לגלריה בהגדרות.');
  return false;
}

const PICKER_OPTS: ImagePicker.ImagePickerOptions = { quality: 0.7, allowsEditing: true, aspect: [4, 3] };

/** Open the camera (after ensuring permission). Returns a local uri or null. */
export async function capturePhoto(): Promise<string | null> {
  if (!(await ensureCameraPermission())) return null;
  const res = await ImagePicker.launchCameraAsync(PICKER_OPTS);
  return res.canceled || !res.assets?.[0] ? null : res.assets[0].uri;
}

/** Open the gallery (after ensuring permission). Returns a local uri or null. */
export async function pickPhoto(): Promise<string | null> {
  if (!(await ensureLibraryPermission())) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ ...PICKER_OPTS, mediaTypes: ['images'] });
  return res.canceled || !res.assets?.[0] ? null : res.assets[0].uri;
}

/** Downscale + compress to a feed-friendly JPEG. Returns a local uri. */
export async function prepareForUpload(uri: string): Promise<string> {
  const manip = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1080 } }], {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return manip.uri;
}
