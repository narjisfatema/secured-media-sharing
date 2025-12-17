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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { getMyMedia, deleteMedia, getProfile } from '../../hooks/authRequest';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function DashboardScreen() {
  const router = useRouter();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
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
      
      const profileData = await getProfile();
      setProfile(profileData.user);
      
      const result = await getMyMedia();
      setMedia(result.media);
      
      console.log('✅ Loaded dashboard data');
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

  const handleGetStarted = () => {
    router.push('/camera');
  };

  const handleDelete = async (mediaId: string, fileName: string) => {
    Alert.alert(
      'Delete Media',
      `Delete "${fileName}"?`,
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
              Alert.alert('Error', err.message);
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Media</Text>
        {profile && (
          <Text style={styles.headerSubtitle}>{profile.mediaCount} items</Text>
        )}
      </View>

      <View style={styles.identityCard}>
        <Text style={styles.identityLabel}></Text>
        <IconSymbol size={32} name="abs.circle.fill" color="#333" />
        <Text style={styles.identityKey}>
          {identityKey.slice(0, 20)}...{identityKey.slice(-12)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.getStartedButton}
        onPress={handleGetStarted}
      >
        <Text style={styles.getStartedButtonText}>📸 Get Started</Text>
      </TouchableOpacity>

      {media.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📭 No media yet</Text>
          <Text style={styles.emptySubtext}>Take your first photo!</Text>
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
                {item.uhrpUrl && (
                  <Text style={styles.uhrpUrl}>
                    UHRP: {item.uhrpUrl.slice(0, 30)}...
                  </Text>
                )}
                {item.timestamp && (
                  <Text style={styles.timestamp}>
                    Watermark: {new Date(item.timestamp).toLocaleString()}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item._id, item.fileName)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  identityCard: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  identityLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  identityKey: {
    fontSize: 20,
    color: '#555',
    fontFamily: 'monospace',
  },
  getStartedButton: {
    backgroundColor: '#f7931a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 20,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#bbb',
  },
  mediaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  mediaInfo: {
    flex: 1,
    marginRight: 12,
  },
  mediaFileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  mediaDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  mediaHash: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  uhrpUrl: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#ff4d4d',
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});