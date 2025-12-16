<<<<<<< HEAD
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Dashboard() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      {/* Go to Camera */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/camera")}
      >
        <Text style={styles.buttonText}>Open Camera</Text>
      </TouchableOpacity>

      {/* Go to Profile */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/gallery")}
      >
        <Text style={styles.buttonText}>Go to Profile</Text>
      </TouchableOpacity>

      {/* Go to Settings */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/gallery")}
      >
        <Text style={styles.buttonText}>Go to Settings</Text>
      </TouchableOpacity>
=======
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadMedia, getMyMedia, deleteMedia, getProfile } from '../../hooks/authRequest';

export default function DashboardScreen() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [identityKey, setIdentityKey] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const key = await AsyncStorage.getItem("identityKey");
      setIdentityKey(key || '');
      
      // Load profile
      const profileData = await getProfile();
      setProfile(profileData.user);
      
      // Load media
      const result = await getMyMedia();
      setMedia(result.media);
      
      console.log('✅ Loaded dashboard data:', {
        mediaCount: result.media.length,
        profile: profileData.user
      });
    } catch (err) {
      console.error('❌ Load data error:', err);
      Alert.alert('Error', 'Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpload = async () => {
    setUploading(true);

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant photo library access to upload images.');
        setUploading(false);
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = uri.split('/').pop() || `image_${Date.now()}.jpg`;
      
      // Create hash (in production, use actual file hashing)
      const fileHash = `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('📤 Uploading:', fileName);

      // Upload to server with BRC-103 auth
      await uploadMedia(
        fileHash, 
        fileName, 
        uri,
        asset.mimeType || 'image/jpeg',
        asset.fileSize || 0
      );

      Alert.alert('✅ Success', 'Media uploaded successfully!');
      
      // Reload media list
      await loadData();
    } catch (err) {
      console.error('❌ Upload error:', err);
      Alert.alert('Error', 'Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: string, fileName: string) => {
    Alert.alert(
      'Delete Media',
      `Are you sure you want to delete "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMedia(mediaId);
              Alert.alert('Success', 'Media deleted');
              await loadData();
            } catch (err) {
              Alert.alert('Error', 'Delete failed: ' + err.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f7931a" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Media</Text>
        {profile && (
          <Text style={styles.headerSubtitle}>
            {profile.mediaCount} items
          </Text>
        )}
      </View>

      {/* Identity Key Display */}
      <View style={styles.identityCard}>
        <Text style={styles.identityLabel}>🔑 Your Identity</Text>
        <Text style={styles.identityKey}>
          {identityKey.slice(0, 20)}...{identityKey.slice(-12)}
        </Text>
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
        onPress={handleUpload}
        disabled={uploading}
      >
        {uploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator color="white" />
            <Text style={styles.uploadButtonText}>Uploading...</Text>
          </View>
        ) : (
          <Text style={styles.uploadButtonText}>📸 Upload New Photo</Text>
        )}
      </TouchableOpacity>

      {/* Media List */}
      {media.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📭 No media yet</Text>
          <Text style={styles.emptySubtext}>
            Upload your first photo to get started!
          </Text>
        </View>
      ) : (
        <FlatList
          data={media}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => (
            <View style={styles.mediaItem}>
              <View style={styles.mediaInfo}>
                <Text style={styles.mediaFileName}>📄 {item.fileName}</Text>
                <Text style={styles.mediaDate}>
                  {new Date(item.uploadedAt).toLocaleDateString()} at{' '}
                  {new Date(item.uploadedAt).toLocaleTimeString()}
                </Text>
                <Text style={styles.mediaHash}>
                  Hash: {item.fileHash.slice(0, 20)}...
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item._id, item.fileName)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
>>>>>>> a26891f (bsv authentication)
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#333",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
=======
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#f7931a',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 25,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  identityCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  identityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  identityKey: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
  },
  uploadButton: {
    backgroundColor: '#f7931a',
    margin: 15,
    marginTop: 0,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 24,
    color: '#999',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#bbb',
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
    paddingTop: 0,
  },
  mediaItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  mediaInfo: {
    flex: 1,
  },
  mediaFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  mediaDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  mediaHash: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#999',
  },
  deleteButton: {
    padding: 10,
    marginLeft: 10,
  },
  deleteButtonText: {
    fontSize: 24,
  },
});
>>>>>>> a26891f (bsv authentication)
