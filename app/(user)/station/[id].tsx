import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { stations } from '@/content';
import { StationSheet } from '@/components/StationSheet';
import { colors } from '@/theme';

/** Deep-link target: carmelkinneret://station/<id> — opens the station mission sheet. */
export default function StationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const station = stations.find((s) => s.id === id);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(user)'));

  return (
    <View style={styles.backdrop}>
      {station && <StationSheet station={station} onClose={close} onStartMission={close} />}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
});

void colors;
