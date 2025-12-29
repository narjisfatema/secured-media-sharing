import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform
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
  const [isMobileUser, setIsMobileUser] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const key = await AsyncStorage.getItem("identityKey");
      setIdentityKey(key || '');
      
      // Check if user is on mobile (no BSV Desktop Wallet)
      const hasWallet = await checkWalletAvailability();
      setIsMobileUser(!hasWallet);

      if (hasWallet) {
        // Desktop user - load authenticated data
        try {
          const profileData = await getProfile();
          setProfile(profileData.user);
         
          const result = await getMyMedia();
          setMedia(result.media);
         
          console.log('✅ Loaded dashboard data');
        } catch (authError) {
          console.log('⚠️ Auth failed, showing mobile view');
          setIsMobileUser(true);
        }
      } else {
        // Mobile user - show limited view
        console.log('📱 Mobile user detected - showing camera-only mode');
      }
     
    } catch (err) {
      console.error('❌ Load data error:', err);
      // Don't show error alert, just set mobile mode
      setIsMobileUser(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkWalletAvailability = async () => {
    try {
      // Try to import WalletClient
      const { WalletClient } = await import('@bsv/sdk');
      const walletClient = new WalletClient();
      
      // Try to check if wallet is available (this will fail on mobile)
      await walletClient.isConnected();
      return true;
    } catch (error) {
      // Wallet not available (mobile device)
      return false;
    }
  };

  const handleRefresh = () => {
    if (!isMobileUser) {
      setRefreshing(true);
      loadData();
    }
  };

  const handleGetStarted = () => {
    router.push('/camera');
  };

  const handleDelete = async (mediaId: string, fileName: string) => {
    if (isMobileUser) {
      Alert.alert('Not Available', 'Data management requires BSV Desktop Wallet on desktop');
      return;
    }

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
        <Text style={styles.headerTitle}>Securely capture and share media</Text>
        {profile && !isMobileUser && (
          <Text style={styles.headerSubtitle}>{profile.mediaCount} items</Text>
        )}
        {isMobileUser && (
          <Text style={styles.mobileNotice}>📱 Mobile Mode - Camera Only</Text>
        )}
      </View>

      <View style={styles.identityCard}>
        <Text style={styles.identityKey}>
          <IconSymbol size={32} name="abs.circle.fill" color="#333" />
          {identityKey.slice(0, 20)}...{identityKey.slice(-12)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.getStartedButton}
        onPress={handleGetStarted}
      >
        <Text style={styles.getStartedButtonText}>📸 Go to Camera</Text>
      </TouchableOpacity>

      {isMobileUser ? (
        <View style={styles.mobileInfoContainer}>
          <Text style={styles.mobileInfoTitle}>📱 Mobile User</Text>
          <Text style={styles.mobileInfoText}>
            You're using mobile mode!{'\n\n'}
            ✅ Available features:{'\n'}
            • Take photos with camera{'\n'}
            • Add fixed watermarks{'\n'}
            • Upload to UHRP{'\n'}
            • Add UHRP hash watermarks{'\n'}
            • Save photos locally{'\n'}
            {'\n'}
            💡 To manage server data:{'\n'}
            Use desktop with BSV Desktop Wallet
          </Text>
        </View>
      ) : media.length === 0 ? (
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
    textAlign: 'center',
  },

  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },

  mobileNotice: {
    fontSize: 14,
    color: '#f7931a',
    marginTop: 4,
    fontWeight: '600',
  },

  identityCard: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: '#eb6060ff',
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },

  identityKey: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'monospace',
    textAlign: 'center',
  },

  getStartedButton: {
    backgroundColor: '#f7931a',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },

  getStartedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  mobileInfoContainer: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginTop: 20,
  },

  mobileInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 12,
  },

  mobileInfoText: {
    fontSize: 15,
    color: '#1e3a8a',
    lineHeight: 24,
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