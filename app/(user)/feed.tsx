import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView, Switch } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeed, uploadFeedImage, createPost, type FeedPost } from '@/features/feed/feed';
import { capturePhoto, pickPhoto, prepareForUpload } from '@/features/feed/media';
import { useAuth } from '@/auth/AuthProvider';
import { colors, spacing, radius } from '@/theme';
import { content } from '@/content';

/** קהילה — turn the phone from a disconnector into a connector: capture/pick a moment,
 *  add a caption, optionally pin it on the live map, and share it with everyone instantly. */
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { posts, loading } = useFeed();
  const { user } = useAuth();
  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [showOnMap, setShowOnMap] = useState(true);
  const [uploading, setUploading] = useState(false);

  const startWith = async (getUri: () => Promise<string | null>) => {
    const uri = await getUri();
    if (!uri) return; // permission denied / cancelled (handled in media helpers)
    Haptics.selectionAsync().catch(() => {});
    setDraftUri(uri); setCaption(''); setShowOnMap(true);
  };

  const cancel = () => { setDraftUri(null); setCaption(''); };

  const publish = async () => {
    if (!draftUri || !user) return;
    setUploading(true);
    try {
      let lat: number | undefined, lng: number | undefined;
      if (showOnMap) {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.granted) {
          const loc = await Location.getLastKnownPositionAsync() ?? await Location.getCurrentPositionAsync({});
          if (loc) { lat = loc.coords.latitude; lng = loc.coords.longitude; }
        }
      }
      const prepared = await prepareForUpload(draftUri);
      const url = await uploadFeedImage(user.uid, prepared);
      await createPost({
        authorId: user.uid, authorName: user.displayName ?? 'מטייל/ת', authorPhoto: user.photoURL ?? undefined,
        imageUrl: url, text: caption.trim(), showOnMap, lat, lng,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      cancel();
    } catch (e: any) {
      Alert.alert('שגיאה בהעלאה', e?.message ?? '');
    } finally { setUploading(false); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>{content.nav.gallery} · קהילה</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.forest} />
      ) : (
        <FlashList
          data={posts}
          keyExtractor={(p) => p.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => <PostCard post={item} index={index} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="image-multiple-outline" size={48} color={colors.line} />
              <Text style={styles.empty}>היו הראשונים לשתף רגע מהמסע</Text>
            </View>
          }
          contentContainerStyle={{ padding: spacing.md }}
        />
      )}

      {/* Two-way share FAB: camera (primary) + gallery */}
      <View style={styles.fabCol}>
        <TouchableOpacity style={styles.fabSmall} onPress={() => startWith(pickPhoto)}>
          <MaterialCommunityIcons name="image" size={20} color={colors.forest} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={() => startWith(capturePhoto)}>
          <MaterialCommunityIcons name="camera-plus" size={18} color="#fff" />
          <Text style={styles.fabTxt}>שתף רגע</Text>
        </TouchableOpacity>
      </View>

      {/* Compose modal — preview + caption + show-on-map opt-in */}
      <Modal visible={!!draftUri} animationType="slide" transparent onRequestClose={cancel}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <TouchableOpacity onPress={cancel} hitSlop={8}><MaterialCommunityIcons name="close" size={24} color={colors.muted} /></TouchableOpacity>
              <Text style={styles.sheetTitle}>שיתוף עם הקהילה</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.lg }}>
              {!!draftUri && <Image source={{ uri: draftUri }} style={styles.preview} contentFit="cover" />}
              <TextInput
                style={styles.caption}
                placeholder="מה חוויתם כאן? (לדוגמה: מתי לאחרונה עזרנו אחד לשני?)"
                placeholderTextColor={colors.muted}
                value={caption} onChangeText={setCaption} multiline textAlign="right"
              />
              <View style={styles.optRow}>
                <Switch value={showOnMap} onValueChange={(v) => { Haptics.selectionAsync().catch(() => {}); setShowOnMap(v); }} trackColor={{ true: colors.forest }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>הצגה על המפה החיה</Text>
                  <Text style={styles.optSub}>הרגע שלכם יופיע על המפה לכל המטיילים (אופציונלי)</Text>
                </View>
                <MaterialCommunityIcons name="map-marker-radius" size={20} color={colors.forest} />
              </View>
              <TouchableOpacity style={[styles.publish, uploading && { opacity: 0.6 }]} onPress={publish} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" /> : <><MaterialCommunityIcons name="send" size={18} color="#fff" /><Text style={styles.publishTxt}>שתף עם הקהילה</Text></>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PostCard({ post, index = 0 }: { post: FeedPost; index?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(350)} style={styles.card}>
      <View style={styles.cardHead}>
        {post.authorPhoto ? (
          <Image source={{ uri: post.authorPhoto }} style={styles.authorAvatar} />
        ) : (
          <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
            <Text style={styles.authorAvatarTxt}>{(post.authorName ?? 'מ')[0]}</Text>
          </View>
        )}
        <Text style={styles.author}>{post.authorName ?? 'מטייל/ת'}</Text>
        {post.showOnMap && <MaterialCommunityIcons name="map-marker" size={16} color={colors.terracotta} />}
      </View>
      {!!post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.cardImg} contentFit="cover" />}
      {!!post.text && <Text style={styles.text}>{post.text}</Text>}
      <View style={styles.cardFooter}>
        <View style={styles.footAction}><MaterialCommunityIcons name="heart-outline" size={20} color={colors.muted} /></View>
        <View style={styles.footAction}><MaterialCommunityIcons name="comment-outline" size={19} color={colors.muted} /></View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  header: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', paddingVertical: spacing.sm, writingDirection: 'rtl' },
  emptyWrap: { alignItems: 'center', marginTop: 80, gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.muted, fontSize: 16, writingDirection: 'rtl' },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, marginBottom: spacing.md, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.line },
  authorAvatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest },
  authorAvatarTxt: { color: '#fff', fontWeight: '800' },
  cardImg: { width: '100%', aspectRatio: 1.2 },
  author: { fontWeight: '700', color: colors.ink, textAlign: 'right', writingDirection: 'rtl', flex: 1 },
  text: { color: colors.ink, padding: spacing.md, textAlign: 'right', writingDirection: 'rtl' },
  cardFooter: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  footAction: { padding: 2 },
  fabCol: { position: 'absolute', bottom: 100, right: 20, flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.terracotta, paddingHorizontal: 22, paddingVertical: 14, borderRadius: radius.pill, elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 5 },
  fabTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  fabSmall: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4 },
  // compose modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.md, maxHeight: '90%', direction: 'rtl' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, writingDirection: 'rtl' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.line },
  caption: { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginTop: spacing.md, minHeight: 70, borderWidth: 1, borderColor: colors.line, writingDirection: 'rtl', textAlign: 'right' },
  optRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  optTitle: { fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  optSub: { fontSize: 12, color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginTop: 1 },
  publish: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.forest, paddingVertical: 15, borderRadius: radius.pill, marginTop: spacing.lg },
  publishTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
