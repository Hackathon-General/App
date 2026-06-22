import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { ref as storageRef, putFile, getDownloadURL } from '@react-native-firebase/storage';
import { db, storage } from '@/firebase';

export interface FeedPost {
  id: string;
  authorId: string;
  authorName?: string;
  authorPhoto?: string;
  stationId?: string;
  value?: string;
  text?: string;
  imageUrl?: string;
  showOnMap?: boolean;   // user opted in to show this moment on the live map
  lat?: number;
  lng?: number;
  createdAt?: number;
}

/** Live community feed (bounded query). */
export function useFeed(max = 50) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'feed'), orderBy('createdAt', 'desc'), limit(max));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as object) }) as FeedPost));
      setLoading(false);
    });
    return () => unsub();
  }, [max]);

  return { posts, loading };
}

/** Recent feed posts that the author opted to show on the live map (last `max`, with coords). */
export function useFeedPins(max = 60) {
  const [pins, setPins] = useState<FeedPost[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'feed'), orderBy('createdAt', 'desc'), limit(max));
    const unsub = onSnapshot(q, (snap) => {
      setPins(
        snap.docs
          .map((d: any) => ({ id: d.id, ...(d.data() as object) }) as FeedPost)
          .filter((p: FeedPost) => p.showOnMap && typeof p.lat === 'number' && typeof p.lng === 'number')
      );
    });
    return () => unsub();
  }, [max]);
  return pins;
}

/** Upload an image to Storage feed/{uid}/{id}.jpg and return its download URL. */
export async function uploadFeedImage(uid: string, localUri: string): Promise<string> {
  const id = `${Date.now()}`;
  const path = `feed/${uid}/${id}.jpg`;
  const r = storageRef(storage, path);
  await putFile(r, localUri.replace('file://', ''));
  return getDownloadURL(r);
}

/** Create a feed post. */
export async function createPost(post: Omit<FeedPost, 'id' | 'createdAt'>) {
  await addDoc(collection(db, 'feed'), { ...post, createdAt: Date.now(), serverTs: serverTimestamp() });
}
