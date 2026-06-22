import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeed, uploadFeedImage, createPost, type FeedPost } from '@/features/feed/feed';
import { useAuth } from '@/auth/AuthProvider';
import { colors, spacing, radius } from '@/theme';
import { content } from '@/content';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { posts, loading } = useFeed();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const share = async () => {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    if (!user) return;
    setUploading(true);
    try {
      const manip = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 1080 } }], {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      const url = await uploadFeedImage(user.uid, manip.uri);
      await createPost({ authorId: user.uid, authorName: user.displayName ?? 'מטייל/ת', authorPhoto: user.photoURL ?? undefined, imageUrl: url, text: '' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert('שגיאה בהעלאה', e?.message ?? '');
    } finally {
      setUploading(false);
    }
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
      <TouchableOpacity style={styles.fab} onPress={share} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="camera-plus" size={18} color="#fff" />
            <Text style={styles.fabTxt}>שתף רגע</Text>
          </>
        )}
      </TouchableOpacity>
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
  header: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', paddingVertical: spacing.sm },
  emptyWrap: { alignItems: 'center', marginTop: 80, gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.muted, fontSize: 16, writingDirection: 'rtl' },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, marginBottom: spacing.md, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.line },
  authorAvatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest },
  authorAvatarTxt: { color: '#fff', fontWeight: '800' },
  cardImg: { width: '100%', aspectRatio: 1.2 },
  author: { fontWeight: '700', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  text: { color: colors.ink, padding: spacing.md, textAlign: 'right', writingDirection: 'rtl' },
  cardFooter: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  footAction: { padding: 2 },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 8, position: 'absolute', bottom: 100, right: 20, backgroundColor: colors.terracotta, paddingHorizontal: 22, paddingVertical: 14, borderRadius: radius.pill, elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 5 },
  fabTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
