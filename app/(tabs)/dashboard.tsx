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
      
      const hasWallet = await checkWalletAvailability();
      setIsMobileUser(!hasWallet);

      if (hasWallet) {
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
      }
    } catch (err) {
      console.error('❌ Load data error:', err);
      setIsMobileUser(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkWalletAvailability = async () => {
    try {
      const { WalletClient } = await import('@bsv/sdk');
      const walletClient = new WalletClient();
      await walletClient.isConnected();
      return true;
    } catch (error) {
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f7931a" />
        <Text style={styles.loadingText}>Loading your vault...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with gradient */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Media Vault</Text>
            <Text style={styles.headerSubtitle}>Blockchain-secured storage</Text>
          </View>
          {profile && !isMobileUser && (
            <View style={styles.mediaCount}>
              <IconSymbol size={20} name="photo.stack" color="#f7931a" />
              <Text style={styles.mediaCountText}>{profile.mediaCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Identity card */}
      <View style={styles.identitySection}>
        <View style={styles.identityCard}>
          <View style={styles.identityIcon}>
            <IconSymbol size={24} name="person.badge.key.fill" color="#fff" />
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.identityLabel}>Your Identity</Text>
            <Text style={styles.identityKey}>
              {identityKey.slice(0, 16)}...{identityKey.slice(-10)}
            </Text>
          </View>
        </View>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={handleGetStarted}
        activeOpacity={0.8}
      >
        <View style={styles.ctaContent}>
          <View style={styles.ctaIcon}>
            <IconSymbol size={28} name="camera.fill" color="#fff" />
          </View>
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>Capture New Media</Text>
            <Text style={styles.ctaSubtitle}>Take photos with blockchain verification</Text>
          </View>
          <IconSymbol size={24} name="chevron.right" color="rgba(255,255,255,0.6)" />
        </View>
      </TouchableOpacity>

      {/* Media list */}
      {media.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <IconSymbol size={64} name="photo.on.rectangle.angled" color="#444" />
          </View>
          <Text style={styles.emptyTitle}>No Media Yet</Text>
          <Text style={styles.emptyText}>
            Start capturing secure, blockchain-verified photos
          </Text>
        </View>
      ) : (
        <View style={styles.mediaSection}>
          <View style={styles.mediaSectionHeader}>
            <Text style={styles.mediaSectionTitle}>Recent Media</Text>
            <Text style={styles.mediaSectionCount}>{media.length} items</Text>
          </View>
          
          <FlatList
            data={media}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                tintColor="#f7931a"
              />
            }
            contentContainerStyle={styles.mediaList}
            renderItem={({ item }) => (
              <View style={styles.mediaCard}>
                <View style={styles.mediaCardHeader}>
                  <View style={styles.mediaIconContainer}>
                    <IconSymbol size={20} name="doc.fill" color="#f7931a" />
                  </View>
                  <View style={styles.mediaCardInfo}>
                    <Text style={styles.mediaFileName}>{item.fileName}</Text>
                    <Text style={styles.mediaDate}>
                      {new Date(item.uploadedAt).toLocaleDateString()} · {new Date(item.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item._id, item.fileName)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <IconSymbol size={20} name="trash.fill" color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.mediaDetails}>
                  <View style={styles.detailRow}>
                    <IconSymbol size={14} name="number" color="#666" />
                    <Text style={styles.detailLabel}>Hash:</Text>
                    <Text style={styles.detailValue}>
                      {item.fileHash.slice(0, 16)}...
                    </Text>
                  </View>

                  {item.uhrpUrl && (
                    <View style={styles.detailRow}>
                      <IconSymbol size={14} name="link" color="#666" />
                      <Text style={styles.detailLabel}>UHRP:</Text>
                      <Text style={styles.detailValue}>
                        {item.uhrpUrl.slice(0, 24)}...
                      </Text>
                    </View>
                  )}

                  {item.timestamp && (
                    <View style={styles.detailRow}>
                      <IconSymbol size={14} name="clock.fill" color="#666" />
                      <Text style={styles.detailLabel}>Mark:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(item.timestamp).toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#1a1a1a',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  mediaCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(247, 147, 26, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.2)',
  },
  mediaCountText: {
    color: '#f7931a',
    fontSize: 18,
    fontWeight: '700',
  },
  identitySection: {
    padding: 20,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  identityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f7931a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  identityInfo: {
    flex: 1,
  },
  identityLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  identityKey: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  ctaButton: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#f7931a',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
  android: {
    elevation: 8,
  },
  web: {
    boxShadow: '0 8px 12px rgba(247, 147, 26, 0.3)',
  },
}),
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  ctaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  mediaSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mediaSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mediaSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  mediaSectionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  mediaList: {
    paddingBottom: 20,
  },
  mediaCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  mediaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(247, 147, 26, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mediaCardInfo: {
    flex: 1,
  },
  mediaFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  mediaDate: {
    fontSize: 13,
    color: '#666',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#aaa',
    fontFamily: 'monospace',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 24,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});