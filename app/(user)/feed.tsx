import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={<Text style={styles.empty}>היו הראשונים לשתף רגע מהמסע ✨</Text>}
          contentContainerStyle={{ padding: spacing.md }}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={share} disabled={uploading}>
        <Text style={styles.fabTxt}>{uploading ? '...' : '📷 שתף רגע'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PostCard({ post }: { post: FeedPost }) {
  return (
    <View style={styles.card}>
      {!!post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.cardImg} contentFit="cover" />}
      <View style={styles.cardBody}>
        <Text style={styles.author}>{post.authorName ?? 'מטייל/ת'}</Text>
        {!!post.text && <Text style={styles.text}>{post.text}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', paddingVertical: spacing.sm },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 60, fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: radius.md, marginBottom: spacing.md, overflow: 'hidden', elevation: 2 },
  cardImg: { width: '100%', aspectRatio: 1.2 },
  cardBody: { padding: spacing.md },
  author: { fontWeight: '700', color: colors.forest, textAlign: 'right' },
  text: { color: colors.ink, marginTop: 4, textAlign: 'right' },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: colors.terracotta, paddingHorizontal: 22, paddingVertical: 14, borderRadius: radius.pill, elevation: 5 },
  fabTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
