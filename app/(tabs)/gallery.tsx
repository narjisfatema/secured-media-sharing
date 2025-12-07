// app/(tabs)/gallery.tsx - ✅ APP PRIVATE GALLERY VERSION
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Text,
  Dimensions,
  Alert,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { getAppGalleryImages } from '@/services/gallery';  // ✅ CHANGE 1: getAppGalleryImages

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GalleryImage {
  id: string;
  uri: string;
  thumbnailUri: string;
  filename: string;
  timestamp: string;
  uhrpTxId?: string;
  verifiedPosition?: { x: number; y: number };
  isVerified: boolean;
  imageKey?: string;  // ✅ CHANGE 2: ADDED imageKey
}

export default function GalleryScreen() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadGallery = useCallback(async () => {
    try {
      setLoading(true);
      const galleryImages = await getAppGalleryImages();  // ✅ CHANGE 3: getAppGalleryImages()
      console.log('✅ App gallery loaded:', galleryImages.length, 'images');
      setImages(galleryImages);
    } catch (error) {
      console.error('App gallery failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGallery();
    setRefreshing(false);
  };

  const handleImagePress = (image: GalleryImage) => {
    Alert.alert(
      image.isVerified ? '✅ Blockchain Verified' : '🔒 Verify on BSV',  // ✅ CHANGE 4: Better text
      `📱 ${image.filename}\n${image.isVerified ? 
        `🔗 TXID: ${image.uhrpTxId?.slice(0,16)}...\n📍 Pos: X${image.verifiedPosition?.x?.toFixed(0)} Y${image.verifiedPosition?.y?.toFixed(0)}` : 
        'Tap Verify to lock watermark position'}`,
      [
        { text: 'OK' },
        image.isVerified && image.uhrpTxId && { 
          text: '🖥️ Whatsonchain', 
          onPress: () => Linking.openURL(`https://whatsonchain.com/tx/${image.uhrpTxId}`) 
        },
      ]
    );
  };

  const renderImage = ({ item }: { item: GalleryImage }) => (
    <TouchableOpacity style={styles.imageContainer} onPress={() => handleImagePress(item)}>
      <Image source={{ uri: item.thumbnailUri }} style={styles.image} />
      <View style={styles.overlay}>
        <View style={[
          styles.badge,
          item.isVerified ? styles.verifiedBadge : styles.unverifiedBadge
        ]}>
          <MaterialIcons 
            name={item.isVerified ? "verified" : "shield"} 
            size={16} 
            color={item.isVerified ? "#10b981" : "#3b82f6"} 
          />
          <Text style={styles.badgeText}>
            {item.isVerified ? 'Verified' : 'Verify'}
          </Text>
        </View>
        <Text style={styles.filename} numberOfLines={1}>{item.filename}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading app gallery...</Text>  // ✅ CHANGE 5: Better text
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔒 BSV Private Gallery</Text>  // ✅ CHANGE 6: Better title
        <Text style={styles.subtitle}>
          {images.filter(i => i.isVerified).length}/{images.length} verified
        </Text>
      </View>

      {images.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="photo-library" size={64} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No verified images</Text>  // ✅ CHANGE 7: Better text
          <Text style={styles.emptySubtitle}>
            Capture → Watermark → LOCK to see here instantly  // ✅ CHANGE 8: Clear flow
          </Text>
          <TouchableOpacity 
            style={styles.captureButton}
            onPress={() => router.push('/(tabs)/capture')}
          >
            <MaterialIcons name="camera-alt" size={20} color="#fff" />
            <Text style={styles.captureButtonText}>Capture & Verify</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImage}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

// YOUR STYLES - NO CHANGES NEEDED
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,130,246,0.2)',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 4 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: { marginTop: 16, color: '#94a3b8', fontSize: 16 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginTop: 16 },
  emptySubtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
  captureButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  captureButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  row: { justifyContent: 'space-between' },
  imageContainer: {
    width: (SCREEN_WIDTH - 48) / 2,
    aspectRatio: 1,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  image: { width: '100%', height: '70%' },
  overlay: { padding: 12, flex: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  unverifiedBadge: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: 'white' },
  filename: { fontSize: 12, fontWeight: '600', color: 'white', marginBottom: 4 },
  timestamp: { fontSize: 10, color: 'white', opacity: 0.7 },
});
