import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { capturePhoto, pickPhoto, prepareForUpload } from '@/features/feed/media';
import { uploadFeedImage, createPost } from '@/features/feed/feed';
import { useAuth } from '@/auth/AuthProvider';
import { valueTheme } from '@/theme';
import { colors, spacing, radius } from '@/theme';
import type { Station } from '@/content/ContentProvider';

/**
 * Blocking geofence-mission modal (active NFR). Shown when the user physically reaches a
 * values station: read the prompt, capture/pick a photo, write a sentence, share with the
 * community (also pinned on the live map). Distinct from passive Admin Alerts (read/audio only).
 */
export function NfrMissionModal({ station, onClose }: { station: Station | null; onClose: () => void }) {
  const { user } = useAuth();
  const [uri, setUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const v = station ? valueTheme[station.value] : null;

  const reset = () => { setUri(null); setCaption(''); };
  const close = () => { reset(); onClose(); };

  const grab = async (fn: () => Promise<string | null>) => {
    const u = await fn();
    if (u) { Haptics.selectionAsync().catch(() => {}); setUri(u); }
  };

  const share = async () => {
    if (!station || !user) return;
    setBusy(true);
    try {
      let imageUrl: string | undefined;
      if (uri) {
        const prepared = await prepareForUpload(uri);
        imageUrl = await uploadFeedImage(user.uid, prepared);
      }
      await createPost({
        authorId: user.uid, authorName: user.displayName ?? 'מטייל/ת', authorPhoto: user.photoURL ?? undefined,
        imageUrl, text: caption.trim(), stationId: station.id, value: station.value,
        showOnMap: true, lat: station.lat, lng: station.lng,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      close();
    } catch (e: any) { Alert.alert('שגיאה', e?.message ?? ''); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible={!!station} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.bg}>
        <View style={styles.sheet}>
          {station && v && (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <LinearGradient colors={[v.color, colors.deepGreen]} style={styles.header}>
                <View style={styles.badge}><MaterialCommunityIcons name={v.icon as any} size={26} color="#fff" /></View>
                <Text style={styles.arrived}>הגעתם לתחנת {v.label}!</Text>
                <Text style={styles.stationName}>{station.number}. {station.name}</Text>
              </LinearGradient>

              <View style={styles.body}>
                <View style={styles.missionCard}>
                  <MaterialCommunityIcons name="target" size={18} color={v.color} />
                  <Text style={styles.mission}>{station.whatYouDo}</Text>
                </View>

                {uri ? (
                  <View style={styles.previewWrap}>
                    <Image source={{ uri }} style={styles.preview} contentFit="cover" />
                    <TouchableOpacity style={styles.retake} onPress={() => setUri(null)}><MaterialCommunityIcons name="camera-retake" size={16} color="#fff" /><Text style={styles.retakeTxt}>החלפה</Text></TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.captureRow}>
                    <TouchableOpacity style={[styles.captureBtn, { backgroundColor: v.color }]} onPress={() => grab(capturePhoto)}>
                      <MaterialCommunityIcons name="camera" size={22} color="#fff" /><Text style={styles.captureTxt}>צילום סלפי</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.galleryBtn} onPress={() => grab(pickPhoto)}>
                      <MaterialCommunityIcons name="image" size={22} color={v.color} />
                    </TouchableOpacity>
                  </View>
                )}

                <TextInput
                  style={styles.caption}
                  placeholder="כתבו משפט על הרגע הזה…"
                  placeholderTextColor={colors.muted}
                  value={caption} onChangeText={setCaption} multiline textAlign="right"
                />

                <TouchableOpacity style={[styles.share, { backgroundColor: v.color }, busy && { opacity: 0.6 }]} onPress={share} disabled={busy || (!uri && !caption.trim())}>
                  {busy ? <ActivityIndicator color="#fff" /> : <><MaterialCommunityIcons name="send" size={18} color="#fff" /><Text style={styles.shareTxt}>שיתוף עם הקהילה</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.later} onPress={close}><Text style={styles.laterTxt}>אולי מאוחר יותר</Text></TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '92%', overflow: 'hidden', direction: 'rtl' },
  header: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  badge: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  arrived: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: spacing.sm, writingDirection: 'rtl', textAlign: 'center' },
  stationName: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 2, writingDirection: 'rtl' },
  body: { padding: spacing.md },
  missionCard: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md },
  mission: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  captureRow: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.md },
  captureBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: radius.pill },
  captureTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  galleryBtn: { width: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: radius.pill },
  previewWrap: { marginTop: spacing.md },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.line },
  retake: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  retakeTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  caption: { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginTop: spacing.md, minHeight: 64, borderWidth: 1, borderColor: colors.line, writingDirection: 'rtl', textAlign: 'right' },
  share: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 15, borderRadius: radius.pill, marginTop: spacing.md },
  shareTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  later: { alignItems: 'center', paddingVertical: spacing.md },
  laterTxt: { color: colors.muted, fontWeight: '600' },
});
