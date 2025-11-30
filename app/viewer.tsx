import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getStoredImages } from '@/services//gallery';
import { verifyOnBlockchain } from '@/services/blockchain';

interface StoredImage {
  id: string;
  uri: string;
  watermarkData: any;
  createdAt: string;
}

export default function ViewerScreen() {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<StoredImage | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const storedImages = await getStoredImages();
      setImages(storedImages);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (image: StoredImage) => {
    try {
      const isValid = await verifyOnBlockchain(image.watermarkData.hash);
      alert(isValid ? 'Verified on blockchain ✓' : 'Verification failed ✗');
    } catch (error) {
      console.error('Verification error:', error);
    }
  };

  const renderImage = ({ item }: { item: StoredImage }) => (
    <TouchableOpacity
      style={styles.imageCard}
      onPress={() => setSelectedImage(item)}
    >
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      <View style={styles.imageInfo}>
        <Text style={styles.hashText}>{item.watermarkData.hash}</Text>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.verifyButton}
        onPress={() => handleVerify(item)}
      >
        <MaterialIcons name="verified" size={24} color="#3b82f6" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="photo-library" size={64} color="#64748b" />
        <Text style={styles.emptyText}>No images yet</Text>
        <Text style={styles.emptySubtext}>
          Capture photos with blockchain verification
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={images}
        renderItem={renderImage}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 8,
  },
  imageCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
  },
  imageInfo: {
    padding: 12,
  },
  hashText: {
    color: '#3b82f6',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  dateText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  verifyButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
